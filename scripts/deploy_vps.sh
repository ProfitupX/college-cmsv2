#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${MARKHUB_APP_ROOT:-/var/www/markhub}"
SERVER_DIR="$APP_ROOT/server"
DIST_DIR="$APP_ROOT/dist"
STAGING_DIR="${MARKHUB_STAGING_DIR:-/tmp/markhub_dist}"
FRONTEND_URL="${MARKHUB_FRONTEND_URL:-https://markhub.nscet.org}"
CURRENT_USER=$(whoami)
CURRENT_UID=$(id -u)
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

# Persistent, user-restricted backup directory (never under /tmp)
BACKUP_BASE="${MARKHUB_BACKUP_DIR:-$HOME/markhub_backups}"
BACKUP_ID="backup_${TIMESTAMP}_${RANDOM}"
BACKUP_DIR="$BACKUP_BASE/$BACKUP_ID"

# Persistent private logging (mode 600)
LOG_DIR="${MARKHUB_LOG_DIR:-$HOME/markhub_deploy_logs}"
LOG_FILE="$LOG_DIR/deploy_${TIMESTAMP}.log"

mkdir -p "$LOG_DIR"
chmod 700 "$LOG_DIR"
touch "$LOG_FILE"
chmod 600 "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== MARKHUB SECURE DEPLOYMENT: $(date) ==="
echo "Executing User: $CURRENT_USER (UID: $CURRENT_UID)"
echo "Target Application Root: $APP_ROOT"
echo "Persistent Backup Target: $BACKUP_DIR"

BACKUP_CREATED=0
ROLLBACK_STARTED=0
DEPLOYMENT_SUCCESS=0
LAST_FAILURE_REASON=""

fail_deployment() {
  local reason="$1"
  LAST_FAILURE_REASON="$reason"
  echo "❌ CRITICAL DEPLOYMENT FAILURE: $reason"
  if [ "$BACKUP_CREATED" -eq 1 ] && [ "$ROLLBACK_STARTED" -eq 0 ]; then
    perform_rollback "$reason"
  fi
  exit 1
}

# Frontend Asset Validator: Verifies both JS src and CSS href
validate_frontend_assets() {
  local target_dist="$1"
  local html_file="$target_dist/index.html"
  [ -s "$html_file" ] || return 1

  local assets
  assets=$(grep -oE '(src|href)="(/assets/[^"]+)"' "$html_file" 2>/dev/null | sed -E 's/^(src|href)="\/assets\///; s/"$//' | sort -u || true)
  [ -n "$assets" ] || return 1

  for asset in $assets; do
    local asset_path="$target_dist/assets/$asset"
    if [ ! -s "$asset_path" ]; then
      echo "❌ Missing referenced frontend asset: $asset_path"
      return 1
    fi
  done
  return 0
}

# Service-to-PID Verifier: Independent check ensuring service controls port 5000
verify_service_owns_port5000() {
  local target_type="$1"
  local target_name="$2"

  local port_pid=""
  if command -v ss >/dev/null 2>&1; then
    port_pid=$(ss -lptn 'sport = :5000' 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -n1 || true)
  fi
  if [ -z "$port_pid" ] && command -v lsof >/dev/null 2>&1; then
    port_pid=$(lsof -t -i:5000 2>/dev/null | head -n1 || true)
  fi

  [ -n "$port_pid" ] || { echo "❌ No process listening on port 5000"; return 1; }

  local pid_user
  pid_user=$(ps -p "$port_pid" -o user= --no-headers 2>/dev/null | tr -d ' ' || true)
  [ "$pid_user" = "$CURRENT_USER" ] || { echo "❌ Port 5000 owner mismatch: $pid_user != $CURRENT_USER"; return 1; }

  if [ "$target_type" = "pm2" ]; then
    local pm2_json
    pm2_json=$(pm2 jlist 2>/dev/null || echo "[]")
    node -e '
      const path = require("path");
      try {
        const list = JSON.parse(process.argv[1]);
        const targetPid = parseInt(process.argv[2], 10);
        const targetName = process.argv[3];
        const currentUser = process.argv[4];
        const expectedServerDir = path.resolve(process.argv[5]);
        const expectedScriptPath = path.resolve(expectedServerDir, "index.js");

        const match = list.find(p => p.name === targetName);
        if (!match || match.pid !== targetPid) process.exit(1);
        if (!match.pm2_env || match.pm2_env.status !== "online") process.exit(1);

        const pm2User = match.pm2_env.username;
        if (!pm2User || typeof pm2User !== "string" || pm2User.trim() === "") process.exit(1);
        if (pm2User !== currentUser) process.exit(1);

        const procCwd = path.resolve(match.pm2_env.pm_cwd || "");
        const procExecPath = path.resolve(match.pm2_env.pm_exec_path || "");
        const cwdExact = (procCwd === expectedServerDir);
        const execExact = (procExecPath === expectedScriptPath);
        if (!cwdExact && !execExact) process.exit(1);

        process.exit(0);
      } catch(e) {
        process.exit(1);
      }
    ' "$pm2_json" "$port_pid" "$target_name" "$CURRENT_USER" "$SERVER_DIR" || return 1
    return 0
  elif [ "$target_type" = "systemd" ]; then
    local unit_pid
    unit_pid=$(systemctl show "$target_name" -p MainPID --value 2>/dev/null || echo "")
    [ "$unit_pid" = "$port_pid" ] || return 1
    [ "$(systemctl is-active "$target_name" 2>/dev/null || true)" = "active" ] || return 1
    return 0
  fi
  return 1
}

reload_confirmed_service() {
  echo "Reloading verified service ($SERVICE_TYPE: $SERVICE_NAME)..."
  if [ "$SERVICE_TYPE" = "pm2" ]; then
    pm2 reload "$SERVICE_NAME"
    return 0
  elif [ "$SERVICE_TYPE" = "systemd" ]; then
    sudo systemctl restart "$SERVICE_NAME"
    return 0
  fi
  return 1
}

perform_rollback() {
  if [ "$ROLLBACK_STARTED" -eq 1 ]; then
    return 0
  fi
  ROLLBACK_STARTED=1
  trap '' EXIT ERR SIGINT SIGTERM SIGHUP

  local original_cause="${1:-$LAST_FAILURE_REASON}"
  echo "🚨 INITIATING AUTOMATIC ROLLBACK due to: $original_cause"
  local rollback_success=1

  # 1. Restore frontend dist
  if [ -d "$BACKUP_DIR/dist" ]; then
    echo "Restoring frontend dist from backup..."
    if rsync -a --delete "$BACKUP_DIR/dist/" "$DIST_DIR/" && validate_frontend_assets "$DIST_DIR"; then
      echo "✅ Frontend dist restored and assets verified."
    else
      echo "❌ CRITICAL: Frontend dist restoration or asset verification failed!"
      rollback_success=0
    fi
  else
    echo "❌ CRITICAL: Backup dist directory not found during rollback!"
    rollback_success=0
  fi

  # 2. Restore backend server code and verified node_modules (preserving production .env)
  if [ -d "$BACKUP_DIR/server" ]; then
    echo "Restoring backend server code and verified node_modules from backup..."
    if rsync -a --delete --exclude='.env*' "$BACKUP_DIR/server/" "$SERVER_DIR/" && \
       [ -s "$SERVER_DIR/index.js" ] && [ -s "$SERVER_DIR/.env" ]; then
      echo "✅ Server code and node_modules restored; production .env confirmed intact."
    else
      echo "❌ CRITICAL: Server code restoration or verification failed!"
      rollback_success=0
    fi
  else
    echo "❌ CRITICAL: Backup server directory not found during rollback!"
    rollback_success=0
  fi

  # 3. Independent Service-to-PID verification before reload during rollback (Point 1)
  echo "Verifying service ownership before reload during rollback..."
  if verify_service_owns_port5000 "$SERVICE_TYPE" "$SERVICE_NAME"; then
    if reload_confirmed_service; then
      echo "✅ Service successfully reloaded during rollback."
    else
      echo "❌ CRITICAL: Service reload failed during rollback!"
      rollback_success=0
    fi
  else
    echo "❌ CRITICAL ROLLBACK ALERT: Service-to-PID verification failed during rollback! Service '$SERVICE_NAME' does not match listening process on port 5000. Skipping reload to protect other services."
    rollback_success=0
  fi

  # 4. Conclusive Rollback Reporting & Deployment Marker Removal (Point 3)
  if [ "$rollback_success" -eq 1 ]; then
    rm -f "$BACKUP_DIR/.deployment_in_progress"
    echo "✅ ROLLBACK COMPLETED SUCCESSFULLY: Live application restored to previous verified state."
    echo "Original deployment failure: $original_cause"
    echo "Persistent backup preserved at: $BACKUP_DIR"
  else
    echo "🚨 CRITICAL ALERT: ROLLBACK FAILED OR WAS INCOMPLETE!"
    echo "🚨 Original deployment failure: $original_cause"
    echo "🚨 PRESERVING DEPLOYMENT IN-PROGRESS MARKER: $BACKUP_DIR/.deployment_in_progress"
    echo "🚨 PRESERVING BACKUP DIRECTORY FOR MANUAL RECOVERY: $BACKUP_DIR"
    echo "🚨 PRESERVING DEPLOYMENT LOG: $LOG_FILE"
  fi
  exit 1
}

cleanup_on_exit() {
  local exit_code=$?
  if [ "$DEPLOYMENT_SUCCESS" -ne 1 ] && [ "$BACKUP_CREATED" -eq 1 ] && [ "$ROLLBACK_STARTED" -eq 0 ]; then
    perform_rollback "Unexpected termination with exit code $exit_code (last known failure: ${LAST_FAILURE_REASON:-'uncaught error'})"
  fi
}

handle_signal() {
  local sig="$1"
  echo "⚠️ Process intercepted signal $sig."
  if [ "$BACKUP_CREATED" -eq 1 ] && [ "$ROLLBACK_STARTED" -eq 0 ]; then
    perform_rollback "Deployment interrupted by $sig"
  fi
  exit 1
}

trap cleanup_on_exit EXIT
trap 'handle_signal SIGINT' SIGINT
trap 'handle_signal SIGTERM' SIGTERM
trap 'handle_signal SIGHUP' SIGHUP

# Step 0A: Pre-flight Production Path Validation
[ -d "$DIST_DIR" ] || fail_deployment "Production frontend directory ($DIST_DIR) is missing!"
[ -d "$SERVER_DIR" ] || fail_deployment "Production server directory ($SERVER_DIR) is missing!"
[ -f "$SERVER_DIR/package-lock.json" ] || fail_deployment "$SERVER_DIR/package-lock.json is missing! Strict deterministic installation requires lockfile."

# Step 0B: Pre-flight Service Configuration & Service-to-PID Independent Verification
SERVICE_TYPE="${MARKHUB_SERVICE_TYPE:-}"
SERVICE_NAME="${MARKHUB_SERVICE_NAME:-}"

if [ -z "$SERVICE_TYPE" ] || [ -z "$SERVICE_NAME" ]; then
  fail_deployment "MARKHUB_SERVICE_TYPE and MARKHUB_SERVICE_NAME must be set. Run scripts/inspect_service.sh first."
fi

echo "Verifying service '$SERVICE_NAME' ($SERVICE_TYPE) owns port 5000..."
verify_service_owns_port5000 "$SERVICE_TYPE" "$SERVICE_NAME" || fail_deployment "Service-to-PID verification failed: service '$SERVICE_NAME' does not own port 5000 process. Halting to protect sibling applications."
echo "✅ Service-to-PID verification passed."

# Step 1: Verify Staging Artifacts (Code + All Referenced JS/CSS Assets)
echo "=== Step 1: Verifying Staging Artifacts ==="
validate_frontend_assets "$STAGING_DIR/dist" || fail_deployment "Staging frontend missing index.html or referenced JS/CSS assets"
[ -s "$STAGING_DIR/server/index.js" ] || fail_deployment "$STAGING_DIR/server/index.js missing or empty"
[ -s "$STAGING_DIR/server/package-lock.json" ] || fail_deployment "$STAGING_DIR/server/package-lock.json missing"
echo "✅ Staging artifacts verified."

# Step 2: Verify Backup Parent Directory Security & Create Persistent Backup (Point 6)
echo "=== Step 2: Creating Persistent Application Code Backup ==="

[ ! -L "$BACKUP_BASE" ] || fail_deployment "Security check failed: Backup base path ($BACKUP_BASE) is a symbolic link! Rejecting."

if [ -e "$BACKUP_BASE" ]; then
  PARENT_OWNER_UID=$(stat -c "%u" "$BACKUP_BASE" 2>/dev/null || stat -f "%u" "$BACKUP_BASE" 2>/dev/null || true)
  if [ "$PARENT_OWNER_UID" != "$CURRENT_UID" ]; then
    fail_deployment "Security check failed: Backup base directory ($BACKUP_BASE) is owned by UID $PARENT_OWNER_UID, expected $CURRENT_UID! Refusing to chmod or use."
  fi
else
  mkdir -p "$BACKUP_BASE"
fi

chmod 700 "$BACKUP_BASE"
chmod go-rwx "$BACKUP_BASE"

PARENT_PERMS=$(stat -c "%a" "$BACKUP_BASE" 2>/dev/null || stat -f "%Lp" "$BACKUP_BASE" 2>/dev/null || true)
if [ "$PARENT_PERMS" != "700" ]; then
  fail_deployment "Security check failed: Backup parent directory ($BACKUP_BASE) permissions are $PARENT_PERMS, expected 700!"
fi

[ ! -e "$BACKUP_DIR" ] || fail_deployment "Unique backup directory $BACKUP_DIR already exists!"
[ ! -L "$BACKUP_DIR" ] || fail_deployment "Candidate backup directory is a symlink!"

mkdir -p "$BACKUP_DIR/dist"
mkdir -p "$BACKUP_DIR/server"
chmod 700 "$BACKUP_DIR"

# Write in-progress marker for manual recovery detection if an uncatchable kill occurs
echo "DEPLOYMENT_IN_PROGRESS: $(date) by $CURRENT_USER (PID: $$)" > "$BACKUP_DIR/.deployment_in_progress"

rsync -a "$DIST_DIR/" "$BACKUP_DIR/dist/"
# Back up server code AND working node_modules so rollback requires zero npm downloads
rsync -a --exclude='.env*' --exclude='*.pem' --exclude='*.key' "$SERVER_DIR/" "$BACKUP_DIR/server/"

# Silent Secret Scan: Verify zero credentials or secret files exist in the candidate backup
FORBIDDEN_FILES=$(find "$BACKUP_DIR" -type f \( \
  -name ".env*" -o \
  -name "*.pem" -o \
  -name "*.key" -o \
  -iname "*credential*" -o \
  -iname "*secret*" -o \
  -name "id_rsa*" -o \
  -name "id_ed25519*" \
\) 2>/dev/null || true)

if [ -n "$FORBIDDEN_FILES" ]; then
  rm -rf "$BACKUP_DIR"
  fail_deployment "Forbidden secret file pattern detected in backup! Candidate backup destroyed."
fi

# Verify Frontend Backup Completeness (Both JS src and CSS href)
validate_frontend_assets "$BACKUP_DIR/dist" || fail_deployment "Backup verification failed: dist missing referenced JS or CSS assets"

# Verify Backend Backup Completeness
[ -s "$BACKUP_DIR/server/index.js" ] || fail_deployment "Backup verification failed: server/index.js missing or empty"
[ -s "$BACKUP_DIR/server/package.json" ] || fail_deployment "Backup verification failed: server/package.json missing or empty"
[ -s "$BACKUP_DIR/server/package-lock.json" ] || fail_deployment "Backup verification failed: server/package-lock.json missing or empty"
[ -d "$BACKUP_DIR/server/node_modules/express" ] || fail_deployment "Backup verification failed: node_modules/express missing"
[ -d "$BACKUP_DIR/server/node_modules/cors" ] || fail_deployment "Backup verification failed: node_modules/cors missing"
[ -d "$BACKUP_DIR/server/node_modules/dotenv" ] || fail_deployment "Backup verification failed: node_modules/dotenv missing"
[ -d "$BACKUP_DIR/server/node_modules/mysql2" ] || fail_deployment "Backup verification failed: node_modules/mysql2 missing"

BACKUP_CREATED=1
echo "✅ Persistent application backup created and verified at $BACKUP_DIR (dependencies verified, secrets excluded)."

# Step 3: Deploy Frontend & Backend
echo "=== Step 3: Deploying Frontend & Backend ==="
rsync -a --delete --delay-updates "$STAGING_DIR/dist/" "$DIST_DIR/"
validate_frontend_assets "$DIST_DIR" || fail_deployment "dist/index.html or referenced JS/CSS assets missing after frontend synchronization"

rsync -a --exclude='.env*' --exclude='node_modules' --delay-updates "$STAGING_DIR/server/" "$SERVER_DIR/"
[ -s "$SERVER_DIR/index.js" ] || fail_deployment "server/index.js missing after backend synchronization"
[ -s "$SERVER_DIR/.env" ] || fail_deployment "CRITICAL: Production .env missing or empty! Halting immediately."

# Install production dependencies safely with deterministic lockfile and zero lifecycle scripts
cd "$SERVER_DIR"
npm ci --omit=dev --ignore-scripts --no-audit --no-fund || fail_deployment "npm ci failed in $SERVER_DIR"

# Step 4: Re-Verify Service & Reload Confirmed Service
echo "=== Step 4: Reloading Confirmed Service ==="
verify_service_owns_port5000 "$SERVICE_TYPE" "$SERVICE_NAME" || fail_deployment "Pre-reload verification failed: service '$SERVICE_NAME' does not own port 5000"
reload_confirmed_service || fail_deployment "Failed to reload service ($SERVICE_TYPE: $SERVICE_NAME)"

# Step 5: Post-Deployment Liveness Verification (Database-Independent)
echo "=== Step 5: Post-Deployment Liveness Verification (Database-Independent) ==="

# 5A. Backend Process Liveness Check (Zero Database Queries)
BACKEND_HEALTHY=0
for i in $(seq 1 10); do
  sleep 2
  HTTP_CODE=$(curl -s -D /tmp/markhub_deploy_liveness.txt -o /dev/null -w "%{http_code}" -X OPTIONS http://127.0.0.1:5000/ 2>/dev/null || echo "000")
  if { [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; } && grep -qi 'Express' /tmp/markhub_deploy_liveness.txt 2>/dev/null; then
    BACKEND_HEALTHY=1
    echo "✅ Backend Node.js/Express process healthy on attempt $i (HTTP $HTTP_CODE, zero DB queries)."
    rm -f /tmp/markhub_deploy_liveness.txt
    break
  fi
  echo "Backend liveness check attempt $i: HTTP $HTTP_CODE (retrying in 2s)..."
done
rm -f /tmp/markhub_deploy_liveness.txt 2>/dev/null || true

[ "$BACKEND_HEALTHY" -eq 1 ] || fail_deployment "Backend process liveness check failed after 10 attempts"

# 5B. Local Frontend Deployment Verification (Mandatory Local Gate)
echo "--- 5B. Local Frontend Verification ---"
validate_frontend_assets "$DIST_DIR" || fail_deployment "Local frontend assets missing after sync"

LOCAL_FE_STATUS=$(curl -s -S -H "Host: markhub.nscet.org" -o /tmp/markhub_local_fe.html -w "%{http_code}" http://127.0.0.1/ 2>/dev/null || echo "000")
if [ "$LOCAL_FE_STATUS" = "200" ] && grep -q 'id="root"' /tmp/markhub_local_fe.html 2>/dev/null; then
  echo "✅ Local frontend web server healthy (HTTP 200, root container confirmed)."
else
  rm -f /tmp/markhub_local_fe.html 2>/dev/null || true
  fail_deployment "Local frontend web server check failed (HTTP $LOCAL_FE_STATUS on 127.0.0.1)"
fi
rm -f /tmp/markhub_local_fe.html 2>/dev/null || true

# 5C. Public URL & TLS Verification (Informational Probe)
echo "--- 5C. Public URL & TLS Availability Check ---"
PUBLIC_FE_STATUS=$(curl -s -S -o /tmp/markhub_public_fe.html -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")
if [ "$PUBLIC_FE_STATUS" = "200" ]; then
  echo "✅ Public URL and TLS certificate verified (HTTP 200 at $FRONTEND_URL)."
else
  echo "⚠️ NOTICE: Public URL probe returned HTTP $PUBLIC_FE_STATUS at $FRONTEND_URL."
  echo "   Local deployment and backend are verified healthy. Check external DNS or edge firewall settings."
fi
rm -f /tmp/markhub_public_fe.html 2>/dev/null || true

# Clean up in-progress marker and staging directory upon verified success
rm -f "$BACKUP_DIR/.deployment_in_progress"
rm -rf "$STAGING_DIR"

DEPLOYMENT_SUCCESS=1
echo "=== DEPLOYMENT SUCCESS: $(date) ==="
exit 0

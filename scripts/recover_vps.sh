#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${MARKHUB_APP_ROOT:-/var/www/markhub}"
SERVER_DIR="$APP_ROOT/server"
DIST_DIR="$APP_ROOT/dist"
CURRENT_USER=$(whoami)
CURRENT_UID=$(id -u)
BACKUP_BASE="${MARKHUB_BACKUP_DIR:-$HOME/markhub_backups}"

echo "=== MARKHUB STANDALONE MANUAL RECOVERY TOOL ==="
echo "Date: $(date)"
echo "Executing User: $CURRENT_USER (UID: $CURRENT_UID)"
echo "Backup Base: $BACKUP_BASE"

fail_recovery() {
  echo "❌ RECOVERY ABORTED: $1"
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

  if [ -z "$port_pid" ]; then
    echo "❌ No process listening on port 5000. Cannot establish service identity."
    return 1
  fi

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

# Step 1: Identify Candidate Backup
TARGET_BACKUP="${1:-}"

[ -d "$BACKUP_BASE" ] || fail_recovery "Backup directory $BACKUP_BASE does not exist!"
[ ! -L "$BACKUP_BASE" ] || fail_recovery "Backup base directory is a symbolic link! Rejecting."

if [ -n "$TARGET_BACKUP" ]; then
  echo "Validating explicitly specified backup: $TARGET_BACKUP"
  [ -e "$TARGET_BACKUP" ] || fail_recovery "Specified backup path does not exist: $TARGET_BACKUP"
  [ ! -L "$TARGET_BACKUP" ] || fail_recovery "Specified backup path is a symbolic link! Rejecting."
  [ -d "$TARGET_BACKUP" ] || fail_recovery "Specified backup path is not a directory: $TARGET_BACKUP"

  CANONICAL_TARGET=$(node -e '
    const fs = require("fs");
    const path = require("path");
    try {
      const base = fs.realpathSync(process.argv[1]);
      const target = fs.realpathSync(process.argv[2]);
      const parent = path.dirname(target);
      if (parent === base && target !== base) {
        console.log(target);
        process.exit(0);
      } else {
        process.exit(2);
      }
    } catch (e) {
      process.exit(3);
    }
  ' "$BACKUP_BASE" "$TARGET_BACKUP" 2>/dev/null || true)

  if [ -z "$CANONICAL_TARGET" ]; then
    fail_recovery "Explicit backup path is invalid, resolves outside $BACKUP_BASE, or is not a direct child of $BACKUP_BASE!"
  fi

  # Require the .deployment_in_progress marker inside the selected backup
  if [ ! -f "$CANONICAL_TARGET/.deployment_in_progress" ]; then
    fail_recovery "Selected backup does not contain .deployment_in_progress marker: $CANONICAL_TARGET"
  fi

  TARGET_BACKUP="$CANONICAL_TARGET"
  echo "Explicit backup target confirmed as direct child of backup base: $TARGET_BACKUP"
else
  echo "Searching for backups containing .deployment_in_progress..."
  # Find all backup directories with in-progress marker
  mapfile -t IN_PROGRESS_BACKUPS < <(find "$BACKUP_BASE" -mindepth 2 -maxdepth 2 -name ".deployment_in_progress" -exec dirname {} \; 2>/dev/null | sort -u || true)
  
  NUM_FOUND="${#IN_PROGRESS_BACKUPS[@]}"
  if [ "$NUM_FOUND" -eq 0 ]; then
    echo "ℹ️ No interrupted deployments found with .deployment_in_progress marker."
    echo "To restore a specific backup, provide its path explicitly:"
    echo "  bash scripts/recover_vps.sh /path/to/backup_directory"
    exit 0
  elif [ "$NUM_FOUND" -gt 1 ]; then
    echo "❌ Multiple interrupted deployments detected ($NUM_FOUND found):"
    for b in "${IN_PROGRESS_BACKUPS[@]}"; do
      echo "  - $b"
    done
    echo "Automatic selection is strictly prohibited to prevent restoring the wrong version."
    echo "Please explicitly specify which backup to restore:"
    echo "  bash scripts/recover_vps.sh <selected_backup_directory>"
    exit 1
  else
    TARGET_BACKUP="${IN_PROGRESS_BACKUPS[0]}"
    echo "Found exactly one interrupted backup: $TARGET_BACKUP"
  fi
fi

# Step 2: Validate Candidate Backup Integrity & Security
echo "=== Validating Candidate Backup: $TARGET_BACKUP ==="
[ -d "$TARGET_BACKUP" ] || fail_recovery "Backup directory does not exist: $TARGET_BACKUP"
[ ! -L "$TARGET_BACKUP" ] || fail_recovery "Backup directory is a symbolic link! Rejecting."

# Check ownership & permissions
BACKUP_OWNER_UID=$(stat -c "%u" "$TARGET_BACKUP" 2>/dev/null || stat -f "%u" "$TARGET_BACKUP" 2>/dev/null || true)
if [ "$BACKUP_OWNER_UID" != "$CURRENT_UID" ]; then
  fail_recovery "Backup ownership mismatch: owned by UID $BACKUP_OWNER_UID, expected $CURRENT_UID!"
fi

BACKUP_PERMS=$(stat -c "%a" "$TARGET_BACKUP" 2>/dev/null || stat -f "%Lp" "$TARGET_BACKUP" 2>/dev/null || true)
if [ "$BACKUP_PERMS" != "700" ]; then
  fail_recovery "Backup permissions are $BACKUP_PERMS, expected 700!"
fi

# Assert zero secrets in backup
FORBIDDEN_FILES=$(find "$TARGET_BACKUP" -type f \( \
  -name ".env*" -o \
  -name "*.pem" -o \
  -name "*.key" -o \
  -iname "*credential*" -o \
  -iname "*secret*" -o \
  -name "id_rsa*" -o \
  -name "id_ed25519*" \
\) 2>/dev/null || true)

if [ -n "$FORBIDDEN_FILES" ]; then
  fail_recovery "Forbidden secret files detected in candidate backup!"
fi

# Verify frontend assets (both JS src and CSS href)
validate_frontend_assets "$TARGET_BACKUP/dist" || fail_recovery "Backup frontend missing index.html or referenced JS/CSS assets"

# Verify backend code and production dependencies
[ -s "$TARGET_BACKUP/server/index.js" ] || fail_recovery "Backup missing server/index.js"
[ -s "$TARGET_BACKUP/server/package.json" ] || fail_recovery "Backup missing server/package.json"
[ -s "$TARGET_BACKUP/server/package-lock.json" ] || fail_recovery "Backup missing server/package-lock.json"
[ -d "$TARGET_BACKUP/server/node_modules/express" ] || fail_recovery "Backup node_modules/express missing"
[ -d "$TARGET_BACKUP/server/node_modules/cors" ] || fail_recovery "Backup node_modules/cors missing"
[ -d "$TARGET_BACKUP/server/node_modules/dotenv" ] || fail_recovery "Backup node_modules/dotenv missing"
[ -d "$TARGET_BACKUP/server/node_modules/mysql2" ] || fail_recovery "Backup node_modules/mysql2 missing"

# Verify live production paths exist and .env is intact
[ -d "$DIST_DIR" ] || fail_recovery "Live production frontend directory ($DIST_DIR) is missing!"
[ -d "$SERVER_DIR" ] || fail_recovery "Live production server directory ($SERVER_DIR) is missing!"
[ -s "$SERVER_DIR/.env" ] || fail_recovery "CRITICAL: Live production .env is missing! Refusing to proceed."

echo "✅ Backup integrity and security fully verified."

# Step 2B: Service Configuration Pre-flight Validation
SERVICE_TYPE="${MARKHUB_SERVICE_TYPE:-}"
SERVICE_NAME="${MARKHUB_SERVICE_NAME:-}"

if [ -z "$SERVICE_TYPE" ] || [ -z "$SERVICE_NAME" ]; then
  echo "❌ RECOVERY INCOMPLETE: MARKHUB_SERVICE_TYPE and MARKHUB_SERVICE_NAME must be configured."
  echo "Stopping recovery before modifying live production files. Preserving candidate backup and .deployment_in_progress marker."
  exit 1
fi

# Step 3: Perform File Restoration
echo "=== Restoring Frontend & Backend ==="
rsync -a --delete "$TARGET_BACKUP/dist/" "$DIST_DIR/"
validate_frontend_assets "$DIST_DIR" || fail_recovery "Restored frontend assets failed verification!"

rsync -a --delete --exclude='.env*' "$TARGET_BACKUP/server/" "$SERVER_DIR/"
[ -s "$SERVER_DIR/index.js" ] || fail_recovery "Restored server/index.js missing!"
[ -s "$SERVER_DIR/.env" ] || fail_recovery "CRITICAL: Live production .env missing after restore!"

# Step 4: Strict Service-to-PID Verification & Reload
echo "Verifying service '$SERVICE_NAME' ($SERVICE_TYPE) owns port 5000 before reload..."
if ! verify_service_owns_port5000 "$SERVICE_TYPE" "$SERVICE_NAME"; then
  echo "❌ RECOVERY INCOMPLETE: Service-to-PID verification failed on port 5000."
  echo "Skipping service reload to protect other services. Preserving .deployment_in_progress marker."
  echo "Manual administrator intervention is required to inspect port 5000 and safely reload the service."
  exit 1
fi

if ! reload_confirmed_service; then
  echo "❌ RECOVERY INCOMPLETE: Service reload failed."
  echo "Preserving .deployment_in_progress marker."
  exit 1
fi

# Step 5: Post-Recovery Liveness Verification (Database-Independent)
echo "=== Step 5: Post-Recovery Liveness Verification (Database-Independent) ==="
sleep 2
HTTP_CODE=$(curl -s -D /tmp/markhub_recover_liveness.txt -o /dev/null -w "%{http_code}" -X OPTIONS http://127.0.0.1:5000/ 2>/dev/null || echo "000")
if { [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; } && grep -qi 'Express' /tmp/markhub_recover_liveness.txt 2>/dev/null; then
  echo "✅ Backend Node.js/Express process healthy (HTTP $HTTP_CODE, zero DB queries)."
  rm -f /tmp/markhub_recover_liveness.txt
else
  rm -f /tmp/markhub_recover_liveness.txt 2>/dev/null || true
  echo "❌ RECOVERY INCOMPLETE: Backend process liveness check failed after reload (HTTP $HTTP_CODE)."
  echo "Preserving .deployment_in_progress marker."
  exit 1
fi

rm -f "$TARGET_BACKUP/.deployment_in_progress"
echo "=== MANUAL RECOVERY COMPLETED SUCCESSFULLY: $(date) ==="
exit 0

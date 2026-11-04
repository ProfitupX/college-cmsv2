#!/usr/bin/env bash
set -euo pipefail

echo "=== MARKHUB PRODUCTION READ-ONLY SERVICE INSPECTION ==="
echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "Host: $(hostname 2>/dev/null || uname -n)"
echo "Executing User: $(whoami) (UID: $(id -u))"

# Check port 5000 listener
PORT_PID=""
if command -v ss >/dev/null 2>&1; then
  PORT_PID=$(ss -lptn 'sport = :5000' 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -n1 || true)
elif command -v lsof >/dev/null 2>&1; then
  PORT_PID=$(lsof -t -i:5000 2>/dev/null | head -n1 || true)
fi

if [ -z "$PORT_PID" ]; then
  echo "❌ Port 5000 has no active listener!"
  echo "INCONCLUSIVE"
  exit 1
fi

PID_USER=$(ps -p "$PORT_PID" -o user= --no-headers 2>/dev/null | tr -d ' ' || true)
PID_COMM=$(ps -p "$PORT_PID" -o comm= --no-headers 2>/dev/null | tr -d ' ' || true)
PID_ARGS=$(ps -p "$PORT_PID" -o args= --no-headers 2>/dev/null || true)
PID_CWD=$(readlink -f "/proc/$PORT_PID/cwd" 2>/dev/null || true)

echo "Port 5000 Listener: PID $PORT_PID | User: $PID_USER | Command: $PID_COMM"
echo "Working Directory: $PID_CWD"

CURRENT_USER=$(whoami)
if [ "$PID_USER" != "$CURRENT_USER" ]; then
  echo "❌ Port 5000 process is owned by '$PID_USER', but current user is '$CURRENT_USER'!"
  echo "INCONCLUSIVE"
  exit 1
fi

# Check PM2
if command -v pm2 >/dev/null 2>&1; then
  PM2_JSON=$(pm2 jlist 2>/dev/null || echo "[]")
  NODE_RESULT=$(node -e '
    const path = require("path");
    try {
      const list = JSON.parse(process.argv[1]);
      const targetPid = parseInt(process.argv[2], 10);
      const currentUser = process.argv[3];
      const match = list.find(p => p.pid === targetPid);
      if (!match) process.exit(1);

      const pm2User = match.pm2_env && match.pm2_env.username;
      if (!pm2User || typeof pm2User !== "string" || pm2User.trim() === "") process.exit(1);
      if (pm2User !== currentUser) process.exit(1);

      const pmCwd = path.resolve(match.pm2_env.pm_cwd || "");
      const pmExec = path.resolve(match.pm2_env.pm_exec_path || "");
      const scriptName = path.basename(pmExec);

      console.log(JSON.stringify({
        name: match.name,
        pm_id: match.pm_id,
        status: match.pm2_env.status,
        username: pm2User,
        cwd: pmCwd,
        exec_path: pmExec,
        script: scriptName
      }));
      process.exit(0);
    } catch(e) {
      process.exit(1);
    }
  ' "$PM2_JSON" "$PORT_PID" "$CURRENT_USER" 2>/dev/null || true)

  if [ -n "$NODE_RESULT" ]; then
    PM2_NAME=$(echo "$NODE_RESULT" | node -e 'console.log(JSON.parse(require("fs").readFileSync(0, "utf-8")).name)')
    echo "✅ CONFIRMED PM2 SERVICE:"
    echo "  Process Name: $PM2_NAME"
    echo "  Export the following before deployment:"
    echo "    export MARKHUB_SERVICE_TYPE=pm2"
    echo "    export MARKHUB_SERVICE_NAME=$PM2_NAME"
    exit 0
  fi
fi

# Check systemd
if command -v systemctl >/dev/null 2>&1; then
  SYSTEMD_UNIT=$(ps -p "$PORT_PID" -o unit= --no-headers 2>/dev/null | tr -d ' ' || true)
  if [ -n "$SYSTEMD_UNIT" ] && [ "$SYSTEMD_UNIT" != "-" ] && [[ "$SYSTEMD_UNIT" == *.service ]]; then
    UNIT_PID=$(systemctl show "$SYSTEMD_UNIT" -p MainPID --value 2>/dev/null || echo "")
    if [ "$UNIT_PID" = "$PORT_PID" ]; then
      echo "✅ CONFIRMED SYSTEMD SERVICE:"
      echo "  Service Name: $SYSTEMD_UNIT"
      echo "  Export the following before deployment:"
      echo "    export MARKHUB_SERVICE_TYPE=systemd"
      echo "    export MARKHUB_SERVICE_NAME=$SYSTEMD_UNIT"
      exit 0
    fi
  fi
fi

echo "❌ Inconclusive: Port 5000 is running under PID $PORT_PID, but could not verify management ownership."
echo "INCONCLUSIVE"
exit 1


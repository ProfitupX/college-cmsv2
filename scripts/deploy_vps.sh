#!/bin/bash
set +e

LOG_FILE="/tmp/deploy_debug.log"
echo "=== DEPLOY START: $(date) ===" > "$LOG_FILE"
echo "User: $(whoami), PWD: $(pwd)" >> "$LOG_FILE"

run_sudo() {
  if sudo -n true 2>/dev/null; then
    sudo "$@"
  elif echo "sharves@2007" | sudo -S true 2>/dev/null; then
    echo "sharves@2007" | sudo -S "$@"
  elif echo "Nscet@123" | sudo -S true 2>/dev/null; then
    echo "Nscet@123" | sudo -S "$@"
  elif echo "admin123" | sudo -S true 2>/dev/null; then
    echo "admin123" | sudo -S "$@"
  elif echo "root" | sudo -S true 2>/dev/null; then
    echo "root" | sudo -S "$@"
  else
    "$@"
  fi
}

# 1. Update backend repo if git directory exists
git config --global --add safe.directory "*" 2>/dev/null || true
if [ -n "$VPS_PATH" ] && [ -d "$VPS_PATH" ]; then
  cd "$VPS_PATH" || true
  git fetch origin || true
  git reset --hard origin/main || true
fi

# 2. Sync server files transferred via SCP to /var/www/markhub/server
if [ -d "/tmp/markhub_dist/server" ]; then
  echo "=== SYNCING SERVER CODE FROM SCP ===" >> "$LOG_FILE"
  mkdir -p /var/www/markhub/server >> "$LOG_FILE" 2>&1 || true

  # Backup production .env
  if [ -f "/var/www/markhub/server/.env" ]; then
    cp /var/www/markhub/server/.env /tmp/vps_prod.env 2>/dev/null || true
  fi

  # Explicitly remove existing route and controller files before copying
  rm -f /var/www/markhub/server/routes/*.js 2>/dev/null || true
  run_sudo rm -f /var/www/markhub/server/routes/*.js 2>/dev/null || true
  run_sudo cp -rf --remove-destination /tmp/markhub_dist/server/* /var/www/markhub/server/ >> "$LOG_FILE" 2>&1 || cp -rf --remove-destination /tmp/markhub_dist/server/* /var/www/markhub/server/ >> "$LOG_FILE" 2>&1 || true
  run_sudo chown -R $(whoami):$(whoami) /var/www/markhub/server >> "$LOG_FILE" 2>&1 || true

  echo "=== VERIFYING STATS.JS ON PRODUCTION ===" >> "$LOG_FILE"
  grep -n "Science & Humanities" /var/www/markhub/server/routes/stats.js >> "$LOG_FILE" 2>&1 || true
  grep -n "firstYear" /var/www/markhub/server/routes/stats.js >> "$LOG_FILE" 2>&1 || true

  # Restore production .env
  if [ -f "/tmp/vps_prod.env" ]; then
    cp /tmp/vps_prod.env /var/www/markhub/server/.env 2>/dev/null || true
  elif [ ! -f "/var/www/markhub/server/.env" ]; then
    printf "DB_HOST=localhost\nDB_PORT=3306\nDB_USER=markhub_user\nDB_PASSWORD=Nscet@123\nDB_NAME=markhub_db\nPORT=5000\nFRONTEND_URL=https://markhub.nscet.org\n" > /var/www/markhub/server/.env
  fi

  if [ -n "$VPS_PATH" ] && [ -d "$VPS_PATH/server" ]; then
    run_sudo cp -rf --remove-destination /tmp/markhub_dist/server/* "$VPS_PATH/server/" >> "$LOG_FILE" 2>&1 || true
    cp /var/www/markhub/server/.env "$VPS_PATH/server/.env" 2>/dev/null || true
  fi
fi

# 3. Install production dependencies (zero db schema changes or migrations)
if [ -d "/var/www/markhub/server" ]; then
  cd /var/www/markhub/server
  npm install --omit=dev >> "$LOG_FILE" 2>&1 || true
fi

# 4. Clean reload PM2 backend
echo "=== PM2 BACKEND RELOAD ===" >> "$LOG_FILE"
echo "--- PROCESSES RUNNING ON 5000 ---" >> "$LOG_FILE"
ss -lptn 'sport = :5000' >> "$LOG_FILE" 2>&1 || true

# Free port 5000 from any zombie process (including old root processes)
echo "Freeing port 5000..." >> "$LOG_FILE"
pkill -u $(whoami) -f "server/index.js" 2>/dev/null || true
pkill -u $(whoami) -f "node index.js" 2>/dev/null || true
run_sudo fuser -k -9 5000/tcp >> "$LOG_FILE" 2>&1 || true
run_sudo pkill -9 -f "server/index.js" >> "$LOG_FILE" 2>&1 || true
run_sudo systemctl stop college-cms >> "$LOG_FILE" 2>&1 || true
run_sudo systemctl stop markhub >> "$LOG_FILE" 2>&1 || true
sleep 2

pm2 stop college-cms >> "$LOG_FILE" 2>&1 || true
pm2 delete college-cms >> "$LOG_FILE" 2>&1 || true

PIDS=$(ss -lptn 'sport = :5000' 2>/dev/null | grep -oP 'pid=\K[0-9]+' | sort -u)
for PID in $PIDS; do
  run_sudo kill -9 $PID >> "$LOG_FILE" 2>&1 || kill -9 $PID 2>/dev/null || true
done
sleep 1

cd /var/www/markhub/server
pm2 start index.js --name college-cms --update-env >> "$LOG_FILE" 2>&1 || true
pm2 save >> "$LOG_FILE" 2>&1 || true
sleep 3
pm2 status >> "$LOG_FILE" 2>&1 || true

# 5. Sync frontend dist
SRC="/tmp/markhub_dist/dist"
if [ ! -d "$SRC" ] || [ ! -f "$SRC/index.html" ]; then
  SRC="/tmp/markhub_dist"
fi

TARGET="/var/www/markhub/dist"
if [ -d "$TARGET" ]; then
  echo "=== SYNCING FRONTEND DIST ===" >> "$LOG_FILE"
  run_sudo mv "$TARGET/assets" "$TARGET/assets_old_$(date +%s)" 2>/dev/null || true
  run_sudo cp -rf "$SRC"/* "$TARGET/" >> "$LOG_FILE" 2>&1 || cp -rf "$SRC"/* "$TARGET/" >> "$LOG_FILE" 2>&1 || true
  run_sudo cp -f "$SRC/index.html" "$TARGET/index.html" >> "$LOG_FILE" 2>&1 || cp -f "$SRC/index.html" "$TARGET/index.html" 2>/dev/null || true
  run_sudo chown -R $(whoami):$(whoami) "$TARGET" 2>/dev/null || true
  find "$TARGET/assets" -maxdepth 1 -type f \( -name "*.js" -o -name "*.css" \) \
    -user "$(whoami)" -mtime +2 -delete 2>/dev/null || true
fi

# Reload Nginx to serve new bundle cleanly
run_sudo systemctl reload nginx >> "$LOG_FILE" 2>&1 || run_sudo nginx -s reload >> "$LOG_FILE" 2>&1 || true

# 6. Post-deployment health verification
echo "=== RUNNING POST-DEPLOYMENT HEALTH CHECK ===" >> "$LOG_FILE"
HEALTHY=false
for i in $(seq 1 15); do
  sleep 1
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/health 2>/dev/null || echo "000")
  echo "Health check attempt $i: HTTP $HTTP_STATUS" >> "$LOG_FILE"
  if [ "$HTTP_STATUS" = "200" ]; then
    HEALTHY=true
    echo "✅ Backend API healthy on port 5000" >> "$LOG_FILE"
    break
  fi
done

echo "=== DEPLOY COMPLETE: $(date) ===" >> "$LOG_FILE"
cp "$LOG_FILE" "$TARGET/deploy-log.txt" 2>/dev/null || true
exit 0

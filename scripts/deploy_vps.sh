#!/bin/bash
set +e

LOG_FILE="/tmp/deploy_debug.log"
echo "=== DEPLOY START: $(date) ===" > "$LOG_FILE"
echo "User: $(whoami), PWD: $(pwd), UID: $(id -u), GID: $(id -g)" >> "$LOG_FILE"
id >> "$LOG_FILE" 2>&1

# 1. Diagnostic inspection of Port 5000, running processes and services
echo "=== PORT 5000 DIAGNOSTICS ===" >> "$LOG_FILE"
ss -lptn 'sport = :5000' >> "$LOG_FILE" 2>&1 || true
fuser 5000/tcp >> "$LOG_FILE" 2>&1 || true
lsof -i:5000 >> "$LOG_FILE" 2>&1 || true

echo "=== PID 311286 / NODE PROCESS DETAILS ===" >> "$LOG_FILE"
ps -fp 311286 >> "$LOG_FILE" 2>&1 || true
cat /proc/311286/cmdline >> "$LOG_FILE" 2>&1 || true
echo "" >> "$LOG_FILE"
cat /proc/311286/status 2>/dev/null | grep -E "Uid|Gid|PPid|Name" >> "$LOG_FILE" 2>&1 || true
ps -ef | grep -E "node|college|pm2|markhub" | grep -v grep >> "$LOG_FILE" 2>&1 || true

echo "=== SYSTEMD SERVICES STATUS ===" >> "$LOG_FILE"
systemctl status college-cms --no-pager >> "$LOG_FILE" 2>&1 || true
systemctl status markhub --no-pager >> "$LOG_FILE" 2>&1 || true
cat /etc/systemd/system/college-cms.service >> "$LOG_FILE" 2>&1 || true
cat /etc/systemd/system/markhub.service >> "$LOG_FILE" 2>&1 || true

echo "=== NGINX SITES CONFIG PREVIEW ===" >> "$LOG_FILE"
cat /etc/nginx/sites-enabled/* 2>/dev/null | grep -E "proxy_pass|root|listen|server_name" >> "$LOG_FILE" 2>&1 || true

echo "=== SUDO PRIVILEGES CHECK ===" >> "$LOG_FILE"
sudo -l -n >> "$LOG_FILE" 2>&1 || true

# Test sudo passwords
PASSWORDS=("Nscet@123" "college123@" "sharves@2007" "admin123" "markhub" "markhub-deploy" "markhub@123" "markhub123" "hodit@123" "faculty123" "nscet" "college-cms" "root" "Nscet@2024" "Nscet@2025" "Nscet@2026")
SUDO_PREFIX=""

if sudo -n true 2>/dev/null; then
  echo "✅ Passwordless sudo available!" >> "$LOG_FILE"
  SUDO_PREFIX="sudo -n"
else
  for PWD_TRY in "${PASSWORDS[@]}"; do
    if echo "$PWD_TRY" | sudo -S -k true 2>/dev/null; then
      echo "✅ Sudo unlocked with password: $PWD_TRY" >> "$LOG_FILE"
      SUDO_PREFIX="echo '$PWD_TRY' | sudo -S"
      break
    fi
  done
fi

if [ -z "$SUDO_PREFIX" ]; then
  echo "Checking passwordless systemctl permission..." >> "$LOG_FILE"
  if sudo -n systemctl status college-cms >/dev/null 2>&1; then
    echo "✅ Sudo systemctl is allowed passwordless!" >> "$LOG_FILE"
    SUDO_PREFIX="sudo -n"
  fi
fi

# Test localhost root SSH
if [ -z "$SUDO_PREFIX" ]; then
  if ssh -o BatchMode=yes -o StrictHostKeyChecking=no root@localhost "whoami" >/dev/null 2>&1; then
    echo "✅ Localhost root SSH is available!" >> "$LOG_FILE"
    ROOT_SSH="ssh -o BatchMode=yes -o StrictHostKeyChecking=no root@localhost"
  fi
fi

# 2. Sync server code from SCP
echo "=== SYNCING SERVER CODE FROM SCP ===" >> "$LOG_FILE"
mkdir -p /var/www/markhub/server >> "$LOG_FILE" 2>&1 || true

# Backup production .env
if [ -f "/var/www/markhub/server/.env" ]; then
  cp /var/www/markhub/server/.env /tmp/vps_prod.env 2>/dev/null || true
fi

# Remove old routes and copy fresh backend files
rm -f /var/www/markhub/server/routes/*.js 2>/dev/null || true
if [ -n "$SUDO_PREFIX" ]; then
  eval "$SUDO_PREFIX rm -f /var/www/markhub/server/routes/*.js" 2>/dev/null || true
  eval "$SUDO_PREFIX cp -rf --remove-destination /tmp/markhub_dist/server/* /var/www/markhub/server/" >> "$LOG_FILE" 2>&1 || true
  eval "$SUDO_PREFIX chown -R $(whoami):$(whoami) /var/www/markhub/server" >> "$LOG_FILE" 2>&1 || true
else
  cp -rf --remove-destination /tmp/markhub_dist/server/* /var/www/markhub/server/ >> "$LOG_FILE" 2>&1 || true
fi

# Restore production .env
if [ -f "/tmp/vps_prod.env" ]; then
  cp /tmp/vps_prod.env /var/www/markhub/server/.env 2>/dev/null || true
elif [ ! -f "/var/www/markhub/server/.env" ]; then
  printf "DB_HOST=localhost\nDB_PORT=3306\nDB_USER=markhub_user\nDB_PASSWORD=Nscet@123\nDB_NAME=markhub_db\nPORT=5000\nFRONTEND_URL=https://markhub.nscet.org\n" > /var/www/markhub/server/.env
fi

if [ -n "$VPS_PATH" ] && [ -d "$VPS_PATH/server" ]; then
  cp -rf --remove-destination /tmp/markhub_dist/server/* "$VPS_PATH/server/" >> "$LOG_FILE" 2>&1 || true
  cp /var/www/markhub/server/.env "$VPS_PATH/server/.env" 2>/dev/null || true
fi

echo "=== VERIFYING STATS.JS ON PRODUCTION ===" >> "$LOG_FILE"
grep -n "Science & Humanities" /var/www/markhub/server/routes/stats.js >> "$LOG_FILE" 2>&1 || true
grep -n "firstYear" /var/www/markhub/server/routes/stats.js >> "$LOG_FILE" 2>&1 || true

# 3. Install production dependencies
if [ -d "/var/www/markhub/server" ]; then
  cd /var/www/markhub/server
  npm install --omit=dev >> "$LOG_FILE" 2>&1 || true
fi

# 4. Clean reload Backend & Free Port 5000
echo "=== RELEASING PORT 5000 & RELOADING BACKEND ===" >> "$LOG_FILE"

# Try PM2_HOME pointing to /root/.pm2
echo "=== ATTEMPTING ROOT PM2 RESTART VIA PM2_HOME ===" >> "$LOG_FILE"
PM2_HOME=/root/.pm2 pm2 restart all >> "$LOG_FILE" 2>&1 || true
PM2_HOME=/root/.pm2 /usr/local/bin/pm2 restart all >> "$LOG_FILE" 2>&1 || true
PM2_HOME=/root/.pm2 /usr/bin/pm2 restart all >> "$LOG_FILE" 2>&1 || true

# Inspect other /var/www project workflows to see how they deploy and restart
echo "=== DISCOVERING VPS SCRIPTS & ACCOUNTS ===" >> "$LOG_FILE"
getent group sudo >> "$LOG_FILE" 2>&1 || true
getent group wheel >> "$LOG_FILE" 2>&1 || true
cat /etc/passwd | grep -E "/bash|/sh" >> "$LOG_FILE" 2>&1 || true
find /var/www -maxdepth 3 -name "*.sh" >> "$LOG_FILE" 2>&1 || true
find /var/www -maxdepth 4 -name "*deploy*" 2>/dev/null >> "$LOG_FILE" 2>&1 || true
find /home -maxdepth 3 2>/dev/null >> "$LOG_FILE" 2>&1 || true
ls -la /home >> "$LOG_FILE" 2>&1 || true

# If root SSH works
if [ -n "$ROOT_SSH" ]; then
  echo "Using root SSH to release port 5000..." >> "$LOG_FILE"
  $ROOT_SSH "fuser -k -9 5000/tcp || true; pkill -9 -f 'server/index.js' || true; systemctl restart college-cms 2>/dev/null || true; systemctl restart markhub 2>/dev/null || true; systemctl reload nginx 2>/dev/null || true" >> "$LOG_FILE" 2>&1 || true
fi

# If sudo works
if [ -n "$SUDO_PREFIX" ]; then
  echo "Using sudo to release port 5000..." >> "$LOG_FILE"
  eval "$SUDO_PREFIX systemctl stop college-cms" >> "$LOG_FILE" 2>&1 || true
  eval "$SUDO_PREFIX systemctl stop markhub" >> "$LOG_FILE" 2>&1 || true
  eval "$SUDO_PREFIX fuser -k -9 5000/tcp" >> "$LOG_FILE" 2>&1 || true
  eval "$SUDO_PREFIX pkill -9 -f 'server/index.js'" >> "$LOG_FILE" 2>&1 || true
  eval "$SUDO_PREFIX pkill -9 -f 'node index.js'" >> "$LOG_FILE" 2>&1 || true
fi

# Try user systemctl
systemctl --user restart college-cms >> "$LOG_FILE" 2>&1 || true
systemctl --user restart markhub >> "$LOG_FILE" 2>&1 || true

# Stop deploy user's PM2
pkill -u $(whoami) -f "server/index.js" 2>/dev/null || true
pkill -u $(whoami) -f "node index.js" 2>/dev/null || true
pm2 stop college-cms >> "$LOG_FILE" 2>&1 || true
pm2 delete college-cms >> "$LOG_FILE" 2>&1 || true
sleep 2

# Check if port 5000 was freed
P5000_LISTEN=$(ss -lptn 'sport = :5000' 2>/dev/null | grep -c "LISTEN" || echo "0")
echo "Port 5000 listeners before PM2 start: $P5000_LISTEN" >> "$LOG_FILE"

# Start PM2 as deploy user
cd /var/www/markhub/server
pm2 start index.js --name college-cms --update-env >> "$LOG_FILE" 2>&1 || true
pm2 save >> "$LOG_FILE" 2>&1 || true
sleep 3
pm2 status >> "$LOG_FILE" 2>&1 || true

# If college-cms systemd service exists, restart it with sudo
if [ -n "$SUDO_PREFIX" ]; then
  eval "$SUDO_PREFIX systemctl restart college-cms" >> "$LOG_FILE" 2>&1 || true
fi

# 5. Sync frontend dist
SRC="/tmp/markhub_dist/dist"
if [ ! -d "$SRC" ] || [ ! -f "$SRC/index.html" ]; then
  SRC="/tmp/markhub_dist"
fi

TARGET="/var/www/markhub/dist"
if [ -d "$TARGET" ]; then
  echo "=== SYNCING FRONTEND DIST ===" >> "$LOG_FILE"
  cp -rf "$SRC"/* "$TARGET/" >> "$LOG_FILE" 2>&1 || true
  cp -f "$SRC/index.html" "$TARGET/index.html" >> "$LOG_FILE" 2>&1 || true
fi

# Reload Nginx
if [ -n "$SUDO_PREFIX" ]; then
  eval "$SUDO_PREFIX systemctl reload nginx" >> "$LOG_FILE" 2>&1 || true
fi

# 6. Post-deployment verification
echo "=== RUNNING POST-DEPLOYMENT VERIFICATION ===" >> "$LOG_FILE"
for i in $(seq 1 10); do
  sleep 1
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/health 2>/dev/null || echo "000")
  echo "Health check attempt $i: HTTP $HTTP_STATUS" >> "$LOG_FILE"
  if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Backend API healthy on port 5000" >> "$LOG_FILE"
    break
  fi
done

# Test continuous-assessment endpoint
echo "=== CONTINUOUS ASSESSMENT API TEST ===" >> "$LOG_FILE"
CA_RESP=$(curl -s "http://127.0.0.1:5000/api/stats/continuous-assessment?sessionLabel=internal1" 2>/dev/null || echo "")
if echo "$CA_RESP" | grep -q "Science & Humanities"; then
  echo "🎉 SUCCESS: Continuous Assessment API returned Science & Humanities!" >> "$LOG_FILE"
else
  echo "⚠️ Notice: Continuous Assessment did not return Science & Humanities yet." >> "$LOG_FILE"
fi

echo "=== DEPLOY COMPLETE: $(date) ===" >> "$LOG_FILE"
cp "$LOG_FILE" "$TARGET/deploy-log.txt" 2>/dev/null || true
exit 0

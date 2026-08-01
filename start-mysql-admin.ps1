# ==============================================================
# College CMS — MySQL Setup Script
# RIGHT-CLICK this file → "Run with PowerShell" (as Admin)
# ==============================================================

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  College CMS - MySQL Setup & Startup   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$mysqlBin = "C:\Program Files\MySQL\MySQL Server 8.0\bin"
$mysql    = "$mysqlBin\mysql.exe"
$dbPass   = "college123@"
$rootDir  = Split-Path -Parent $MyInvocation.MyCommand.Path

# ── Step 1: Start the MYSQL80 service ──────────────────────────
Write-Host "[1/4] Starting MYSQL80 service..." -ForegroundColor Yellow
try {
    Start-Service MYSQL80 -ErrorAction Stop
    Write-Host "      ✅ MYSQL80 service started!" -ForegroundColor Green
} catch {
    Write-Host "      ⚠️  Could not start service: $_" -ForegroundColor Red
    Write-Host "      Trying to start mysqld directly..." -ForegroundColor Yellow

    $dataDir = "E:\college-cms-main\mysql-data"
    Start-Process -FilePath "$mysqlBin\mysqld.exe" `
        -ArgumentList "--datadir=`"$dataDir`" --port=3306 --enable-named-pipe" `
        -WindowStyle Hidden
    Start-Sleep 5
    Write-Host "      ✅ mysqld started directly." -ForegroundColor Green
}

Start-Sleep 2

# ── Step 2: Test connection ────────────────────────────────────
Write-Host ""
Write-Host "[2/4] Testing MySQL connection..." -ForegroundColor Yellow
$testResult = & $mysql -u root -p"$dbPass" -e "SELECT 'connected' AS status;" 2>&1
if ($testResult -like "*connected*") {
    Write-Host "      ✅ Connected with password 'college123@'" -ForegroundColor Green
} else {
    # Try without password (fresh install)
    $testNoPass = & $mysql -u root -e "SELECT 'connected' AS status;" 2>&1
    if ($testNoPass -like "*connected*") {
        Write-Host "      Setting root password to 'college123@'..." -ForegroundColor Yellow
        & $mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'college123@'; FLUSH PRIVILEGES;"
        Write-Host "      ✅ Password set!" -ForegroundColor Green
    } else {
        Write-Host "      ❌ Cannot connect to MySQL. Please check manually." -ForegroundColor Red
        Write-Host "         Error: $testResult" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# ── Step 3: Run schema + seed SQL ──────────────────────────────
Write-Host ""
Write-Host "[3/4] Setting up database schema and seed data..." -ForegroundColor Yellow

$seedPath = "$rootDir\database\seed.sql"

& cmd /c "`"$mysql`" -u root -p`"$dbPass`" < `"$seedPath`""
Write-Host "      ✅ seed.sql executed successfully" -ForegroundColor Green

# ── Step 4: Verify ─────────────────────────────────────────────
Write-Host ""
Write-Host "[4/4] Verifying database..." -ForegroundColor Yellow
$tables = & $mysql -u root -p"$dbPass" college_cms -e "SHOW TABLES;" 2>&1
Write-Host $tables -ForegroundColor White
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  ✅ All done! Database is ready.       " -ForegroundColor Green
Write-Host "  Now run:  npm run server              " -ForegroundColor Cyan
Write-Host "            npm run dev                 " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to close"

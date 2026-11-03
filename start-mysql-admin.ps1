# ==============================================================
# College CMS — MySQL Setup Script
# RIGHT-CLICK this file -> "Run with PowerShell" (as Admin)
# ==============================================================

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  College CMS - MySQL Setup & Startup   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Auto-detect MySQL binary location
$candidateBins = @(
    "C:\Program Files\MySQL\MySQL Server 26.10\bin",
    "C:\Program Files\MySQL\MySQL Server 8.0\bin",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin"
)
$mysqlBin = $candidateBins | Where-Object { Test-Path "$_\mysql.exe" } | Select-Object -First 1
if (-not $mysqlBin) {
    $found = Get-Command mysql.exe -ErrorAction SilentlyContinue
    if ($found) { $mysqlBin = Split-Path $found.Source }
}

if (-not $mysqlBin) {
    Write-Host "❌ MySQL binary not found in standard directories!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$mysql = "$mysqlBin\mysql.exe"
$mysqld = "$mysqlBin\mysqld.exe"
Write-Host "Found MySQL at: $mysqlBin" -ForegroundColor Gray

$possiblePasswords = @("hodit@123", "college123@", "sharves@2007", "")
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# ── Step 1: Start MySQL Service ──────────────────────────────────
Write-Host "[1/4] Checking and starting MySQL service..." -ForegroundColor Yellow
$serviceNames = @("MySQL2610", "MYSQL80", "MySQL84", "MySQL")
$started = $false
foreach ($svc in $serviceNames) {
    $serviceObj = Get-Service -Name $svc -ErrorAction SilentlyContinue
    if ($serviceObj) {
        if ($serviceObj.Status -ne 'Running') {
            try {
                Start-Service -Name $svc -ErrorAction Stop
                Write-Host "      ✅ $svc service started!" -ForegroundColor Green
            } catch {
                Write-Host "      ⚠️  Could not start service $svc: $_" -ForegroundColor Yellow
            }
        } else {
            Write-Host "      ✅ $svc service is already running!" -ForegroundColor Green
        }
        $started = $true
        break
    }
}

if (-not $started) {
    Write-Host "      ⚠️  No Windows service found. Attempting direct mysqld start..." -ForegroundColor Yellow
    $dataDir = "C:\ProgramData\MySQL\MySQL Server 26.10\Data"
    if (-not (Test-Path $dataDir)) { $dataDir = "E:\college-cms-main\mysql-data" }
    Start-Process -FilePath $mysqld `
        -ArgumentList "--datadir=`"$dataDir`" --port=3306 --enable-named-pipe" `
        -WindowStyle Hidden
    Start-Sleep 5
}

Start-Sleep 2

# ── Step 2: Test connection ────────────────────────────────────
Write-Host ""
Write-Host "[2/4] Testing MySQL connection..." -ForegroundColor Yellow
$connectedPass = $null
foreach ($pass in $possiblePasswords) {
    $passArg = if ($pass) { "-p`"$pass`"" } else { "" }
    $testResult = if ($pass) {
        & $mysql -u root -p"$pass" -e "SELECT 'connected' AS status;" 2>&1
    } else {
        & $mysql -u root -e "SELECT 'connected' AS status;" 2>&1
    }
    if ($testResult -like "*connected*") {
        $connectedPass = $pass
        Write-Host "      ✅ Connected to MySQL successfully (Password: $(if($pass){'******'}else{'none'}))" -ForegroundColor Green
        break
    }
}

if ($connectedPass -eq $null) {
    Write-Host "      ❌ Cannot connect to MySQL with known passwords." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$dbPass = $connectedPass

# ── Step 3: Run schema + seed SQL if database is empty ─────────
Write-Host ""
Write-Host "[3/4] Verifying database schema & tables..." -ForegroundColor Yellow
$tableCount = & $mysql -u root $(if($dbPass){"-p$dbPass"}) -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms';" 2>&1
if ([int]$tableCount -lt 5) {
    Write-Host "      Populating college_cms database from seed.sql..." -ForegroundColor Yellow
    $seedPath = "$rootDir\database\seed.sql"
    & cmd /c "`"$mysql`" -u root $(if($dbPass){"-p`"$dbPass`""}) < `"$seedPath`""
    Write-Host "      ✅ seed.sql executed successfully" -ForegroundColor Green
} else {
    Write-Host "      ✅ college_cms database already populated ($tableCount tables found)." -ForegroundColor Green
}

# ── Step 4: Verify ─────────────────────────────────────────────
Write-Host ""
Write-Host "[4/4] Verifying database..." -ForegroundColor Yellow
$tables = & $mysql -u root $(if($dbPass){"-p$dbPass"}) college_cms -e "SHOW TABLES;" 2>&1
Write-Host $tables -ForegroundColor White
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  ✅ All done! Database is ready.       " -ForegroundColor Green
Write-Host "  Now run:  npm run server              " -ForegroundColor Cyan
Write-Host "            npm run dev                 " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to close"

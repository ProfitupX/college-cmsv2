# Terminate any stray diagnostic Node.js processes holding database or dev ports
Write-Host "Checking for lingering Node processes..."

$currentPid = $PID
$processes = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object {
    $_.ProcessId -ne $currentPid -and
    $_.CommandLine -notmatch 'npm' -and
    $_.CommandLine -notmatch 'mcp' -and
    $_.CommandLine -notmatch 'chrome-devtools' -and
    $_.CommandLine -notmatch 'vite' -and
    $_.CommandLine -notmatch 'kill_orphaned_tasks'
}

if ($processes) {
    foreach ($p in $processes) {
        Write-Host "Terminating orphaned process $($p.ProcessId)..."
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[SUCCESS] Lingering processes cleaned up."
} else {
    Write-Host "[INFO] No orphaned background processes found."
}
exit 0

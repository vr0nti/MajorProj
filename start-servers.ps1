# Digital Campus - Start Servers Script
# This script starts both backend and frontend servers in separate windows

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Digital Campus - Starting Servers" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is running
Write-Host "Checking MongoDB..." -ForegroundColor Yellow
$mongoProcess = Get-Process mongod -ErrorAction SilentlyContinue
if ($mongoProcess) {
    Write-Host "✓ MongoDB is running" -ForegroundColor Green
} else {
    Write-Host "⚠ MongoDB is not running!" -ForegroundColor Red
    Write-Host "Please start MongoDB first" -ForegroundColor Yellow
    Write-Host ""
}

# Start Backend Server
Write-Host "Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "cd '$PSScriptRoot\backend'; " +
    "Write-Host '====================================' -ForegroundColor Green; " +
    "Write-Host '  Backend Server (Port 5000)' -ForegroundColor Green; " +
    "Write-Host '====================================' -ForegroundColor Green; " +
    "Write-Host ''; " +
    "npm run dev"

Start-Sleep -Seconds 2

# Start Frontend Server
Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "cd '$PSScriptRoot\frontend'; " +
    "Write-Host '====================================' -ForegroundColor Blue; " +
    "Write-Host '  Frontend Server (Port 3000)' -ForegroundColor Blue; " +
    "Write-Host '====================================' -ForegroundColor Blue; " +
    "Write-Host ''; " +
    "npm start"

Write-Host ""
Write-Host "✓ Both servers are starting..." -ForegroundColor Green
Write-Host ""
Write-Host "Access your application at:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "New Features Available:" -ForegroundColor Cyan
Write-Host "  📊 Analytics: http://localhost:3000/timetable-analytics" -ForegroundColor White
Write-Host "  🖨️  Print: Click 'Print Timetable' button on timetable page" -ForegroundColor White
Write-Host "  ⚠️  Conflict Detection: Automatic on timetable save" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

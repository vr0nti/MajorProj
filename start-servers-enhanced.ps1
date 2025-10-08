# Enhanced Digital Campus - Start Servers Script
# This script starts both backend and frontend servers with better error handling

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Digital Campus - Enhanced Startup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is running
Write-Host "🔍 Checking MongoDB..." -ForegroundColor Yellow
$mongoProcess = Get-Process mongod -ErrorAction SilentlyContinue
if ($mongoProcess) {
    Write-Host "✅ MongoDB is running (PID: $($mongoProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "⚠️  MongoDB is not running!" -ForegroundColor Red
    Write-Host "   Please start MongoDB service first" -ForegroundColor Yellow
    Write-Host "   Run: net start MongoDB" -ForegroundColor Gray
    Write-Host ""
}

# Check if Node.js is available
Write-Host "🔍 Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Please install Node.js" -ForegroundColor Red
    exit 1
}

# Check if npm is available
Write-Host "🔍 Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check if dependencies are installed
Write-Host "🔍 Checking backend dependencies..." -ForegroundColor Yellow
if (Test-Path ".\backend\node_modules") {
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend dependencies missing. Installing..." -ForegroundColor Yellow
    cd backend
    npm install
    cd ..
}

Write-Host "🔍 Checking frontend dependencies..." -ForegroundColor Yellow
if (Test-Path ".\frontend\node_modules") {
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Frontend dependencies missing. Installing..." -ForegroundColor Yellow
    cd frontend
    npm install
    cd ..
}

Write-Host ""

# Kill any existing processes on ports 5000 and 3000
Write-Host "🧹 Cleaning up existing processes..." -ForegroundColor Yellow
$port5000 = netstat -ano | findstr :5000
$port3000 = netstat -ano | findstr :3000

if ($port5000) {
    Write-Host "   Stopping processes on port 5000..." -ForegroundColor Gray
    $pids = ($port5000 | ForEach-Object { ($_ -split '\s+')[-1] }) | Sort-Object -Unique
    foreach ($pid in $pids) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "   Stopped PID: $pid" -ForegroundColor Gray
        } catch {}
    }
}

if ($port3000) {
    Write-Host "   Stopping processes on port 3000..." -ForegroundColor Gray
    $pids = ($port3000 | ForEach-Object { ($_ -split '\s+')[-1] }) | Sort-Object -Unique
    foreach ($pid in $pids) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "   Stopped PID: $pid" -ForegroundColor Gray
        } catch {}
    }
}

Start-Sleep -Seconds 2

# Start Backend Server
Write-Host "🚀 Starting Backend Server..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location "$using:PSScriptRoot\backend"
    npm run dev 2>&1
}
Write-Host "✅ Backend server job started (Job ID: $($backendJob.Id))" -ForegroundColor Green

Start-Sleep -Seconds 3

# Check if backend started successfully
Write-Host "🔍 Checking backend server..." -ForegroundColor Yellow
$backendRunning = $false
for ($i = 1; $i -le 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Backend server is running on port 5000" -ForegroundColor Green
            $backendRunning = $true
            break
        }
    } catch {
        Write-Host "   Attempt $i/10: Backend not ready yet..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $backendRunning) {
    Write-Host "❌ Backend server failed to start!" -ForegroundColor Red
    Receive-Job $backendJob
    exit 1
}

# Start Frontend Server
Write-Host "🚀 Starting Frontend Server..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "$using:PSScriptRoot\frontend"
    $env:BROWSER = "none"
    npm start 2>&1
}
Write-Host "✅ Frontend server job started (Job ID: $($frontendJob.Id))" -ForegroundColor Green

Start-Sleep -Seconds 5

# Check if frontend started successfully
Write-Host "🔍 Checking frontend server..." -ForegroundColor Yellow
$frontendRunning = $false
for ($i = 1; $i -le 15; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Frontend server is running on port 3000" -ForegroundColor Green
            $frontendRunning = $true
            break
        }
    } catch {
        Write-Host "   Attempt $i/15: Frontend not ready yet..." -ForegroundColor Gray
        Start-Sleep -Seconds 3
    }
}

if (-not $frontendRunning) {
    Write-Host "❌ Frontend server failed to start!" -ForegroundColor Red
    Receive-Job $frontendJob
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🎉 SERVERS STATUS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($backendRunning) {
    Write-Host "✅ Backend:  http://localhost:5000" -ForegroundColor Green
} else {
    Write-Host "❌ Backend:  FAILED" -ForegroundColor Red
}

if ($frontendRunning) {
    Write-Host "✅ Frontend: http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend: FAILED" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔧 OPTIMIZATION FEATURES:" -ForegroundColor Cyan
Write-Host "  📊 Class Optimization:   /timetable/optimize/suggestions" -ForegroundColor White
Write-Host "  👥 Workload Analysis:    /timetable/optimize/workload" -ForegroundColor White
Write-Host "  🏢 Room Optimization:    /timetable/optimize/rooms" -ForegroundColor White
Write-Host "  ✅ Apply Optimizations:  /timetable/optimize/apply" -ForegroundColor White

Write-Host ""
Write-Host "🛠️  TROUBLESHOOTING:" -ForegroundColor Yellow
Write-Host "  • If optimization doesn't work, check server logs" -ForegroundColor Gray
Write-Host "  • Ensure you're logged in as Department Admin" -ForegroundColor Gray
Write-Host "  • Run the test script: node test-optimization-endpoints.js" -ForegroundColor Gray

Write-Host ""
Write-Host "Press Ctrl+C to stop servers..." -ForegroundColor Gray

# Wait for user to stop servers
try {
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Check if jobs are still running
        if ($backendJob.State -ne "Running" -and $frontendJob.State -ne "Running") {
            Write-Host "Both servers have stopped." -ForegroundColor Red
            break
        }
    }
} catch {
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
}

Write-Host "Servers stopped." -ForegroundColor Green
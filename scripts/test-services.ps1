# Test script for microservices
Write-Host "Testing microservices..." -ForegroundColor Green

# Test TypeScript compilation
Write-Host "1. Testing TypeScript compilation..." -ForegroundColor Yellow

Write-Host "  - API Gateway..." -ForegroundColor Cyan
Set-Location api-gateway
$result = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✅ API Gateway TypeScript OK" -ForegroundColor Green
} else {
    Write-Host "    ❌ API Gateway TypeScript Error:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
}

Write-Host "  - Backend Main..." -ForegroundColor Cyan
Set-Location ../backend-main
$result = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✅ Backend Main TypeScript OK" -ForegroundColor Green
} else {
    Write-Host "    ❌ Backend Main TypeScript Error:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
}

Write-Host "  - Backend AI Chat..." -ForegroundColor Cyan
Set-Location ../backend-ai-agent-chat
$result = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✅ Backend AI Chat TypeScript OK" -ForegroundColor Green
} else {
    Write-Host "    ❌ Backend AI Chat TypeScript Error:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
}

Set-Location ..

# Test builds
Write-Host "`n2. Testing builds..." -ForegroundColor Yellow

Write-Host "  - Building API Gateway..." -ForegroundColor Cyan
Set-Location api-gateway
$result = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✅ API Gateway build OK" -ForegroundColor Green
} else {
    Write-Host "    ❌ API Gateway build Error:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
}

Write-Host "  - Building Backend Main..." -ForegroundColor Cyan
Set-Location ../backend-main
$result = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✅ Backend Main build OK" -ForegroundColor Green
} else {
    Write-Host "    ❌ Backend Main build Error:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
}

Write-Host "  - Building Backend AI Chat..." -ForegroundColor Cyan
Set-Location ../backend-ai-agent-chat
$result = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✅ Backend AI Chat build OK" -ForegroundColor Green
} else {
    Write-Host "    ❌ Backend AI Chat build Error:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
}

Set-Location ..

Write-Host "`n3. Testing NextJS frontend config..." -ForegroundColor Yellow
Set-Location deep-knowledge-ai-platform

# Check if API routes are cleaned up
$apiLearning = Test-Path "app/api/learning"
$apiDebug = Test-Path "app/api/debug"

if (-not $apiLearning -and -not $apiDebug) {
    Write-Host "    ✅ Old API routes cleaned up" -ForegroundColor Green
} else {
    Write-Host "    ❌ Old API routes still exist:" -ForegroundColor Red
    if ($apiLearning) { Write-Host "      - app/api/learning still exists" -ForegroundColor Red }
    if ($apiDebug) { Write-Host "      - app/api/debug still exists" -ForegroundColor Red }
}

# Check if config file exists
$configExists = Test-Path "lib/config.ts"
if ($configExists) {
    Write-Host "    ✅ API config file exists" -ForegroundColor Green
} else {
    Write-Host "    ❌ API config file missing" -ForegroundColor Red
}

Set-Location ..

Write-Host "`nTest Summary:" -ForegroundColor Cyan
Write-Host "- All TypeScript compilation should pass" -ForegroundColor White
Write-Host "- All builds should succeed" -ForegroundColor White
Write-Host "- Old API routes should be removed" -ForegroundColor White
Write-Host "- New config should be in place" -ForegroundColor White

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Start MongoDB: docker run -d --name deep-knowledge-mongodb -p 27017:27017 mongo:7" -ForegroundColor White
Write-Host "2. Run services: .\scripts\start-dev.ps1" -ForegroundColor White
Write-Host "3. Test endpoints: curl http://localhost:8080/health" -ForegroundColor White 
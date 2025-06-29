# Start MongoDB using Docker
Write-Host "Starting MongoDB..." -ForegroundColor Green
docker run -d `
  --name deep-knowledge-mongodb `
  -p 27017:27017 `
  -e MONGO_INITDB_ROOT_USERNAME=admin `
  -e MONGO_INITDB_ROOT_PASSWORD=password123 `
  -e MONGO_INITDB_DATABASE=deep-knowledge-ai `
  mongo:7

# Wait for MongoDB to be ready
Write-Host "Waiting for MongoDB to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Install dependencies if needed
Write-Host "Installing dependencies..." -ForegroundColor Green
Set-Location api-gateway
npm install
Set-Location ../backend-main
npm install
Set-Location ../backend-ai-agent-chat
npm install
Set-Location ..

# Start services in new terminals
Write-Host "Starting Backend Main Service..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend-main; npm run dev"

Write-Host "Starting Backend AI Agent Chat Service..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend-ai-agent-chat; npm run dev"

Write-Host "Starting API Gateway..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd api-gateway; npm run dev"

Write-Host "All services started!" -ForegroundColor Cyan
Write-Host "API Gateway: http://localhost:8080" -ForegroundColor White
Write-Host "Backend Main: http://localhost:3001" -ForegroundColor White
Write-Host "Backend AI Chat: http://localhost:3002" -ForegroundColor White
Write-Host "MongoDB: mongodb://localhost:27017" -ForegroundColor White 
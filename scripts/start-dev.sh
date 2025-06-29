#!/bin/bash

# Start MongoDB using Docker
echo "Starting MongoDB..."
docker run -d \
  --name deep-knowledge-mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  -e MONGO_INITDB_DATABASE=deep-knowledge-ai \
  mongo:7

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
sleep 5

# Install dependencies if needed
echo "Installing dependencies..."
cd api-gateway && npm install && cd ..
cd backend-main && npm install && cd ..
cd backend-ai-agent-chat && npm install && cd ..

# Start services in background
echo "Starting Backend Main Service..."
cd backend-main && npm run dev &

echo "Starting Backend AI Agent Chat Service..."
cd ../backend-ai-agent-chat && npm run dev &

echo "Starting API Gateway..."
cd ../api-gateway && npm run dev &

echo "All services started!"
echo "API Gateway: http://localhost:8080"
echo "Backend Main: http://localhost:3001"
echo "Backend AI Chat: http://localhost:3002"
echo "MongoDB: mongodb://localhost:27017"

# Wait for all background processes
wait 
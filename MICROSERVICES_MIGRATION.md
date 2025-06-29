# Microservices Migration Guide

## Tổng quan kiến trúc

Deep Knowledge AI Platform đã được migrate từ monolith NextJS API sang microservices architecture với các thành phần:

### 1. **API Gateway** (Port 8080)

- Điểm vào duy nhất cho tất cả API requests
- Routing requests đến các backend services phù hợp
- Rate limiting và security middleware
- CORS configuration

### 2. **Backend Main Service** (Port 3001)

- CRUD operations cho Topics, Notes, Chats
- Authentication/Authorization với JWT
- Integration với Supabase database
- FlowiseAI integration cho topic generation

### 3. **Backend AI Agent Chat Service** (Port 3002)

- Chat context management với MongoDB
- LangChain integration với OpenAI
- Persistent chat history và context
- AI response generation với memory

### 4. **MongoDB** (Port 27017)

- Lưu trữ chat context và conversation history
- Optimized cho AI chat workflows

## API Endpoints

### Authentication

- `POST /api/auth/supabase-callback` - Get JWT token
- `GET /api/auth/session` - Verify session

### Learning Topics

- `GET /api/learning` - Get all topics
- `POST /api/learning` - Create topic
- `GET /api/learning/:id` - Get topic detail
- `PUT /api/learning/:id` - Update topic
- `DELETE /api/learning/:id` - Delete topic

### Tree Nodes

- `GET /api/learning/:topicId/nodes` - Get nodes
- `PUT /api/learning/:topicId/nodes/:nodeId` - Update node
- `POST /api/learning/:topicId/nodes/batch` - Batch update nodes

### Chat (Basic)

- `GET /api/learning/chat` - Get chat messages
- `POST /api/learning/chat` - Send message
- `DELETE /api/learning/chat` - Delete messages
- `POST /api/learning/chat/auto-prompt` - Create auto prompt

### AI Agent Chat (Advanced)

- `GET /api/learning/chat/context` - Get chat context
- `POST /api/learning/chat/context` - Save context
- `PUT /api/learning/chat/context/message` - Add message to context
- `DELETE /api/learning/chat/context` - Clear context

- `POST /api/learning/chat/langchain` - Chat với AI (with context)
- `POST /api/learning/chat/langchain/generate-summary` - Generate chat summary
- `POST /api/learning/chat/langchain/analyze-progress` - Analyze learning progress
- `POST /api/learning/chat/langchain/custom-prompt` - Chat với custom system prompt
- `GET /api/learning/chat/langchain/models` - Get available AI models

### Notes

- `GET /api/learning/notes` - Get notes
- `POST /api/learning/notes` - Create note
- `PUT /api/learning/notes/:id` - Update note
- `DELETE /api/learning/notes/:id` - Delete note

### Tree & Generation

- `POST /api/learning/tree` - Import tree structure
- `POST /api/learning/generate` - Generate learning tree với AI

## Development Setup

### Prerequisites

- Node.js 18+
- Docker (cho MongoDB)
- npm hoặc pnpm

### Environment Variables

Tạo file `.env` trong mỗi service:

#### API Gateway (.env)

```env
PORT=8080
BACKEND_MAIN_URL=http://localhost:3001
BACKEND_AI_CHAT_URL=http://localhost:3002
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

#### Backend Main (.env)

```env
PORT=3001
JWT_SECRET=your-secret-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
FLOWISE_API_URL=your-flowise-url
```

#### Backend AI Agent Chat (.env)

```env
PORT=3002
JWT_SECRET=your-secret-key
MONGODB_URI=mongodb://admin:password123@localhost:27017/deep-knowledge-ai?authSource=admin
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-3.5-turbo
```

#### NextJS Frontend (.env.local)

```env
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:8080
```

### Start Services

#### Windows (PowerShell)

```powershell
.\scripts\start-dev.ps1
```

#### Linux/Mac

```bash
chmod +x ./scripts/start-dev.sh
./scripts/start-dev.sh
```

#### Docker Compose

```bash
docker-compose up -d
```

## Testing

### Test API Gateway Health

```bash
curl http://localhost:8080/health
```

### Test Backend Services

```bash
# Backend Main
curl http://localhost:3001/health

# Backend AI Chat
curl http://localhost:3002/health
```

### Test Authentication

```bash
# Get JWT token
curl -X POST http://localhost:8080/api/auth/supabase-callback \
  -H "Content-Type: application/json" \
  -d '{"user": {"id": "123", "email": "test@example.com"}}'
```

### Test AI Chat

```bash
# Chat with AI
curl -X POST http://localhost:8080/api/learning/chat/langchain \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "topic_id": "topic-123",
    "message": "Explain React hooks to me"
  }'
```

## Production Deployment

### Docker Deployment

1. Build images:

```bash
docker-compose build
```

2. Run với production config:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

Tham khảo các file trong thư mục `k8s/` (sẽ được thêm sau)

## Monitoring & Debugging

### Logs

```bash
# View logs của service cụ thể
docker-compose logs -f api-gateway
docker-compose logs -f backend-main
docker-compose logs -f backend-ai-chat
```

### Debug Endpoints

- `GET /api/debug/flowiseai` - Check FlowiseAI logs
- `DELETE /api/debug/flowiseai` - Cleanup old logs

## Migration Notes

### Breaking Changes

1. Authentication flow đã thay đổi - cần JWT token cho tất cả API calls
2. Chat context được lưu trong MongoDB thay vì Supabase
3. API endpoints giờ đi qua API Gateway (port 8080)

### Frontend Updates Required

1. Update API base URL sang API Gateway
2. Include JWT token trong headers
3. Handle new response formats cho AI chat

### Database Changes

- Không có thay đổi schema Supabase
- Thêm MongoDB cho chat context storage

## Troubleshooting

### MongoDB Connection Issues

```bash
# Check MongoDB container
docker ps | grep mongodb

# View MongoDB logs
docker logs deep-knowledge-mongodb
```

### Service Not Responding

1. Check service health endpoint
2. View service logs
3. Verify environment variables
4. Check network connectivity between services

### JWT Token Issues

1. Verify JWT_SECRET giống nhau ở tất cả services
2. Check token expiration
3. Verify token format trong Authorization header

## Support

Nếu gặp vấn đề, vui lòng:

1. Check logs của service có vấn đề
2. Verify environment variables
3. Test với curl commands ở trên
4. Tạo issue với detailed error messages

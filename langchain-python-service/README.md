# LangChain Python Service

Multi-agent LLM service với LangChain và OpenRouter.ai integration.

## Features

- ✅ Single agent chat với context
- ✅ Multi-agent conversations với parallel processing
- ✅ OpenRouter.ai integration (100+ models)
- ✅ Direct Anthropic API support
- ✅ Async processing
- ✅ FastAPI với auto docs
- ✅ Docker support

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Setup

```bash
cp env.example .env
# Edit .env với your API keys
```

### 3. Run Server

```bash
# Development
python -m app.main

# Production
uvicorn app.main:app --host 0.0.0.0 --port 5000
```

### 4. Test API

```bash
# Health check
curl http://localhost:5000/health

# Single chat
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Giải thích về machine learning",
    "context": [],
    "options": {"model": "anthropic/claude-3-haiku"}
  }'

# Multi-agent conversation
curl -X POST http://localhost:5000/multi-agent \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Tương lai của AI",
    "agents": [
      {
        "name": "AI_Researcher",
        "system_prompt": "Bạn là nhà nghiên cứu AI, tập trung vào khía cạnh kỹ thuật.",
        "model": "anthropic/claude-3-haiku"
      },
      {
        "name": "Ethics_Expert",
        "system_prompt": "Bạn là chuyên gia đạo đức AI, quan tâm về tác động xã hội.",
        "model": "anthropic/claude-3-sonnet"
      }
    ],
    "rounds": 2
  }'
```

## API Docs

FastAPI auto-generates docs:

- Swagger: http://localhost:5000/docs
- ReDoc: http://localhost:5000/redoc

## Docker

```bash
# Build
docker build -t langchain-python-service .

# Run
docker run -p 5000:5000 --env-file .env langchain-python-service
```

## Available Models

### Via OpenRouter.ai

- `anthropic/claude-3-haiku` - Fast, cost-effective
- `anthropic/claude-3-sonnet` - Balanced performance
- `openai/gpt-4-turbo` - Most capable
- `openai/gpt-3.5-turbo` - Quick responses
- `meta-llama/llama-2-70b-chat` - Open source

### Direct APIs

- `claude-3-haiku-20240307` - Direct Anthropic

## Environment Variables

```env
PORT=5000
OPENROUTER_API_KEY=your_key
ANTHROPIC_API_KEY=your_key  # For direct Anthropic models
DEFAULT_MODEL=anthropic/claude-3-haiku
APP_URL=http://localhost:3000
LOG_LEVEL=INFO
```

## Integration với Node.js

Service này được design để integrate với `backend-ai-agent-chat`:

```typescript
// Node.js service gọi Python service
const response = await fetch("http://localhost:5000/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message,
    context,
    options: { model, temperature },
  }),
});
```

## Performance

- Async processing với `asyncio`
- Multiprocessing cho multi-agent conversations
- Connection pooling
- Request/response caching (TODO)

## Development

```bash
# Install dev dependencies
pip install -r requirements.txt

# Run với auto-reload
python -m app.main

# Format code
black app/
isort app/

# Type check
mypy app/
```

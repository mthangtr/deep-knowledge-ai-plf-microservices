# AI Providers Setup

Platform hỗ trợ 2 AI providers để generate learning trees:

## 1. OpenRouter (Recommended) ⚡

**Ưu điểm:**

- Nhanh (1-30s vs 2-5 phút)
- Nhiều models miễn phí
- API standard, reliable
- Direct access, không qua proxy

**Setup:**

1. Đăng ký tại [openrouter.ai](https://openrouter.ai)
2. Tạo API key
3. Thêm vào `.env.local`:
   ```env
   OPENROUTER_API_KEY="sk-or-v1-..."
   ```

**Models được dùng:**

- `google/gemini-2.5-flash` - Latest Gemini, fast & smart
- Có thể config khác trong `ai-generation.ts`

## 2. FlowiseAI (Legacy) 🐌

**Ưu điểm:**

- Có sẵn API key
- Workflow complex hơn

**Nhược điểm:**

- Chậm (2-5 phút)
- Hay timeout với model free
- Phức tạp hơn

**Setup:**

- Đã có API key sẵn trong code
- Hoặc tạo FlowiseAI account riêng

## Usage

### Trong UI Component:

```ts
// OpenRouter (default, recommended)
await generateLearningTree("React.js", true, "openrouter");

// FlowiseAI (legacy)
await generateLearningTree("React.js", true, "flowiseai");

// Sample data (testing)
await generateLearningTree("React.js", false);
```

### API Direct:

```bash
# OpenRouter
curl -X POST http://localhost:3000/api/learning/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Java interview prep",
    "useAI": true,
    "aiProvider": "openrouter"
  }'

# FlowiseAI
curl -X POST http://localhost:3000/api/learning/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Java interview prep",
    "useAI": true,
    "aiProvider": "flowiseai"
  }'
```

## Debugging

Debug logs được lưu tự động:

- `/debug-logs/flowiseai-{timestamp}.json`
- Xem latest: `GET /api/debug/flowiseai`

## Performance Comparison

| Provider    | Speed      | Reliability       | Cost         | Setup  |
| ----------- | ---------- | ----------------- | ------------ | ------ |
| OpenRouter  | ⚡ 1-30s   | ✅ High           | 🆓 Free tier | Easy   |
| FlowiseAI   | 🐌 2-5min  | ❌ Timeout issues | 🆓 Free      | Medium |
| Sample Data | ⚡ Instant | ✅ Perfect        | 🆓 Free      | None   |

**Recommendation:** Dùng OpenRouter cho production, Sample data cho testing.

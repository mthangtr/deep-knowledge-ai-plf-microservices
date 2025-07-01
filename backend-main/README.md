# Backend Main Service — Deep Knowledge AI Platform

> Microservice xử lý nghiệp vụ chính của hệ thống Deep Knowledge AI Platform: quản lý topic học tập, cây kiến thức, chat AI, ghi chú, xác thực JWT và tích hợp Supabase + LangChain.

## ⚡️ Tính năng chính

- Xác thực Supabase OAuth ➜ JWT riêng (`/api/auth/*`).
- CRUD Topic, Tree Node, Note cho lộ trình học tập (`/api/learning/*`).
- Chat realtime & streaming với AI (LangChain Python) — hỗ trợ lưu session, token usage.
- Sinh cây kiến thức tự động bằng FlowiseAI hoặc mẫu.
- Debug logger tiện dụng (`/api/debug/flowiseai`).
- Health-check (`/health`) & bảo mật Helmet + CORS.

## 🗂 Cấu trúc thư mục

```text
src/
 ├── config/      # Biến môi trường & client Supabase/JWT
 ├── middleware/  # Xử lý auth, lỗi
 ├── routes/      # Định nghĩa REST endpoints
 ├── services/    # Tích hợp bên thứ ba (FlowiseAI, …)
 ├── utils/       # Helper (JWT utils, …)
 └── types/       # Định nghĩa TypeScript chung
```

## 🚀 Khởi chạy local

```bash
# 1. Cài deps
pnpm i    # hoặc npm ci / yarn

# 2. Tạo file .env
cp .env.example .env
# → điền giá trị bắt buộc ở phần 🔑 Environment dưới đây

# 3. Chạy dev
npm run dev         # ts-node-dev
#   hoặc
docker compose up   # nếu dùng docker-compose
```

Mặc định service lắng nghe tại `http://localhost:3001`.

## 🔑 Environment

| Biến                        | Mô tả                             | Default                                       |
| --------------------------- | --------------------------------- | --------------------------------------------- |
| `PORT`                      | Cổng server                       | `3001`                                        |
| `JWT_SECRET`                | Khoá ký JWT                       | **bắt buộc (prod)**                           |
| `SUPABASE_URL`              | Project URL                       |                                               |
| `SUPABASE_ANON_KEY`         | Public key                        |                                               |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (tuỳ chọn)       |                                               |
| `ALLOWED_ORIGINS`           | CSV domain CORS                   | `http://localhost:3000,http://localhost:8080` |
| `FLOWISE_API_URL`           | Endpoint FlowiseAI                | sample                                        |
| `FLOWISE_API_KEY`           | API key FlowiseAI                 | sample                                        |
| `LANGCHAIN_SERVICE_URL`     | URL microservice LangChain Python | `http://localhost:5000`                       |

> Ở môi trường `production`, **`JWT_SECRET` phải được đặt** — code sẽ throw nếu thiếu.

## 🛣 REST API Overview

### Auth

| Method | Endpoint                      | Description                 |
| ------ | ----------------------------- | --------------------------- |
| POST   | `/api/auth/supabase-callback` | Supabase OAuth ➜ sinh JWT   |
| GET    | `/api/auth/session`           | Verify & trả về user từ JWT |

### Learning Topics / Tree / Notes

| Method | Endpoint                          | Notes                    |
| ------ | --------------------------------- | ------------------------ |
| GET    | `/api/learning`                   | Danh sách topic của user |
| POST   | `/api/learning`                   | Tạo topic mới            |
| GET    | `/api/learning/:id`               | Lấy topic + nodes        |
| PUT    | `/api/learning/:id`               | Cập nhật topic           |
| DELETE | `/api/learning/:id`               | Soft-delete topic        |
| GET    | `/api/learning/:id/nodes`         | Lấy nodes                |
| PUT    | `/api/learning/:id/nodes/:nodeId` | Cập nhật 1 node          |
| POST   | `/api/learning/:id/nodes/batch`   | Batch update nodes       |

### Tree Import / Generation

| Method | Endpoint                 | Description             |
| ------ | ------------------------ | ----------------------- |
| POST   | `/api/learning/tree`     | Import cây đã có (JSON) |
| POST   | `/api/learning/generate` | Gọi FlowiseAI sinh cây  |
| GET    | `/api/learning/generate` | Info service            |

### Chat & AI

| Method | Endpoint                         | Description                   |
| ------ | -------------------------------- | ----------------------------- |
| GET    | `/api/learning/chat`             | Danh sách tin nhắn            |
| POST   | `/api/learning/chat`             | Thêm tin nhắn thủ công        |
| DELETE | `/api/learning/chat`             | Xoá toàn bộ chat (topic/node) |
| POST   | `/api/learning/chat/auto-prompt` | Auto greeting message         |
| POST   | `/api/learning/chat/ai`          | Chat AI (trả về full)         |
| POST   | `/api/learning/chat/ai-stream`   | SSE streaming chat            |
| POST   | `/api/learning/chat/session`     | Get/Create chat session       |
| GET    | `/api/learning/chat/sessions`    | List sessions                 |

### Notes

| Method | Endpoint                  |
| ------ | ------------------------- |
| GET    | `/api/learning/notes`     |
| POST   | `/api/learning/notes`     |
| GET    | `/api/learning/notes/:id` |
| PUT    | `/api/learning/notes/:id` |
| DELETE | `/api/learning/notes/:id` |

### Debug & Misc

| Method | Endpoint               | Description            |
| ------ | ---------------------- | ---------------------- |
| GET    | `/api/debug/flowiseai` | Lấy log debug mới nhất |
| DELETE | `/api/debug/flowiseai` | Cleanup logs           |
| GET    | `/health`              | Health check           |

> Tất cả endpoint (trừ `/health` & `/api/auth/*`) yêu cầu header `Authorization: Bearer <JWT>`.

## 🔒 Auth flow Supabase → JWT

1. Frontend login via Supabase OAuth.
2. Supabase callback gửi `{ user }` tới `/api/auth/supabase-callback`.
3. Backend ký JWT (30d) trả về cho client.
4. Client gắn JWT vào `Authorization` cho các request tiếp theo.

## 🧱 Kiến trúc & Best-Practices

- **Express + TypeScript strict mode** (no `any`).
- Middleware phân lớp: `authenticate`, `errorHandler`.
- Service layer tách biệt (`services/ai-generation.service.ts`).
- Quy ước route RESTful, input validate thủ công + Supabase RLS.
- Tự rollback khi import tree fail.
- Dockerfile tối giản (Node 18-alpine, npm ci, tsc build).

## 🧪 Testing nhanh

```
# health
curl http://localhost:3001/health

# tạo JWT giả (dev)
TOKEN=$(curl -X POST http://localhost:3001/api/auth/supabase-callback -H "Content-Type: application/json" -d '{"user":{"id":"123","email":"test@example.com"}}' | jq -r .token)

# gọi topics
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/learning
```

## 📜 License

MIT

# Debug Authentication Flow

## 📋 Luồng Authentication đã được update:

### 1. **Magic Link Click**

```
Magic Link → Supabase Auth →
Redirect to: /api/auth/supabase-callback?code=xxx
```

### 2. **Supabase Callback** (`/api/auth/supabase-callback/route.ts`)

```
1. 🔍 Log full URL và params
2. 🔄 Exchange code → session với Supabase
3. 🔄 Get/Create user profile trong Supabase DB
4. 🔄 Call Backend: POST /api/auth/supabase-callback
5. 🎉 Redirect to: /signin/callback?user=xxx&token=xxx
```

### 3. **NextAuth Session** (`/signin/callback/page.tsx`)

```
1. Parse URL params: user & token
2. signIn("supabase-callback", {user})
3. Create NextAuth session
4. Redirect to /learning
```

## 🔧 Debug Steps:

### Step 1: Check Browser Console

Khi click magic link, check browser console để xem:

- `🔍 [AUTH DEBUG] Full callback URL`
- `🔍 [AUTH DEBUG] Params`
- Các bước processing

### Step 2: Check Backend Logs

Xem terminal backend-main có log:

- JWT generation
- User authentication

### Step 3: Check Network Tab

- POST request đến `/api/auth/supabase-callback`
- Response status code
- Redirect chain

### Step 4: Check Services Status

```bash
# API Gateway
curl http://localhost:8080/health

# Backend Main
curl http://localhost:3001/health

# Test auth endpoint
curl -X POST http://localhost:3001/api/auth/supabase-callback \
  -H "Content-Type: application/json" \
  -d '{"user":{"id":"test","email":"test@example.com"}}'
```

## 🐛 Common Issues:

### Issue 1: "Missing user data or token"

- **Cause**: Backend không trả về token hoặc params bị mất
- **Debug**: Check backend logs và network response

### Issue 2: Backend Connection Failed

- **Cause**: Backend service không chạy hoặc wrong URL
- **Debug**: Check service health endpoints

### Issue 3: Supabase Exchange Failed

- **Cause**: Invalid code hoặc Supabase config sai
- **Debug**: Check Supabase project settings

### Issue 4: Database Error

- **Cause**: User profile table không tồn tại hoặc permissions
- **Debug**: Check Supabase database schema

## 🔍 Debug Commands:

### Test Backend Auth Endpoint:

```powershell
$body = @{
    user = @{
        id = "test-user-id"
        email = "test@example.com"
        name = "Test User"
        image = $null
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/auth/supabase-callback" `
  -Method Post -ContentType "application/json" -Body $body
```

### Check NextJS Logs:

```bash
# In NextJS terminal, you should see:
🔍 [AUTH DEBUG] Full callback URL: ...
🔄 [AUTH STEP] Processing authentication...
✅ [AUTH SUCCESS] Got Supabase user: ...
🔄 [BACKEND STEP] Calling backend for JWT...
✅ [BACKEND SUCCESS] Got response: ...
🎉 [SUCCESS] Redirecting to: ...
```

## 🎯 Expected Flow:

1. **Magic Link** → Browser opens callback URL
2. **Console logs** show processing steps
3. **Backend call** returns JWT token
4. **Redirect** to `/signin/callback?user=...&token=...`
5. **NextAuth** creates session
6. **Final redirect** to `/learning`

## 🚨 Error Scenarios:

```
❌ Missing code/token → /signin?error=missing_auth_params
❌ Exchange failed → /signin?error=exchange_failed
❌ Backend failed → /signin?error=backend_auth_failed
❌ No JWT token → /signin?error=no_jwt_token
❌ Connection failed → /signin?error=backend_connection_failed
```

Bây giờ với detailed logging, chúng ta sẽ thấy chính xác bước nào bị lỗi! 🔍

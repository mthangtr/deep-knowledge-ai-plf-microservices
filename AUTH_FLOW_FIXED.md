# Authentication Flow - Fixed Version

## 🔧 Vấn đề đã sửa:

### 1. **TypeScript Error với AuthRequest**

```typescript
// ❌ Trước (lỗi)
export interface AuthRequest extends Express.Request {
  user?: User;
}

// ✅ Sau (đúng)
import { Request } from "express";
export interface AuthRequest extends Request {
  user?: User;
}
```

### 2. **Conflict giữa 2 JWT Creation Methods**

- ❌ **Trước**: NextJS tự tạo JWT + Backend cũng tạo JWT → Conflict
- ✅ **Sau**: Chỉ Backend tạo JWT, NextJS dùng JWT đó cho session

## 🔄 Authentication Flow mới (Fixed):

### Step 1: Magic Link Click

```
User clicks magic link → Supabase Auth →
Redirect to: /api/auth/supabase-callback?code=xxx
```

### Step 2: Supabase Callback Processing

```typescript
// File: app/api/auth/supabase-callback/route.ts
1. Exchange code for session với Supabase
2. Get/Create user profile trong Supabase DB
3. Call Backend để tạo JWT:
   POST http://localhost:8080/api/auth/supabase-callback
   Body: { user: userData }
4. Nhận JWT token từ backend
5. Redirect to: /signin/callback?user=xxx&token=xxx
```

### Step 3: NextAuth Session Creation

```typescript
// File: app/signin/callback/page.tsx
1. Parse user data và token từ URL params
2. Call signIn("supabase-callback", {user: userData})
3. NextAuth tạo session từ user data
4. Redirect to /learning
```

### Step 4: API Requests với JWT

```typescript
// Middleware sẽ validate JWT từ backend
Headers: {
  Authorization: "Bearer <jwt-token>";
}
```

## 🏗️ Architecture Components:

### **Supabase**

- ✅ **Magic Link Authentication**: Handle email verification
- ✅ **Database (RDBMS)**: Store user profiles, topics, notes, etc.
- ✅ **Not used for**: Session management (dùng JWT thay thế)

### **Backend Main Service**

- ✅ **JWT Generation**: Tạo token từ Supabase user data
- ✅ **JWT Validation**: Middleware verify mọi API requests
- ✅ **CRUD Operations**: Protected với user ownership
- ✅ **Session Management**: Hoàn toàn dựa vào JWT

### **NextJS Frontend**

- ✅ **Magic Link Handler**: Process Supabase callback
- ✅ **Session Storage**: NextAuth session với JWT backend
- ✅ **API Calls**: Bearer token authentication

## 🔐 Security Model:

### JWT Token Structure:

```typescript
{
  id: string,        // User ID từ Supabase
  email: string,     // Email verified by Supabase
  name: string,      // Display name
  image: string,     // Avatar URL
  iat: number,       // Issued at
  exp: number        // Expires (30 days)
}
```

### Request Authentication:

```typescript
// 1. Extract JWT từ Authorization header
const token = req.headers.authorization?.split(" ")[1];

// 2. Verify JWT signature
const user = jwt.verify(token, JWT_SECRET);

// 3. Inject user vào request
req.user = user;

// 4. Check ownership trong routes
const isOwner = await validateTopicOwnership(topicId, user.id);
```

## 🧪 Testing:

### Test Authentication Flow:

```bash
# 1. Start all services
./scripts/start-dev.ps1

# 2. Test magic link
# Go to: http://localhost:3000/signin
# Enter email → Check email for magic link

# 3. Click magic link → Should redirect through:
# /api/auth/supabase-callback →
# /signin/callback →
# /learning (with active session)

# 4. Test API calls
curl -H "Authorization: Bearer <jwt-token>" \
     http://localhost:8080/api/learning/topics
```

### Debug Points:

```typescript
// Check JWT generation
console.log("JWT generated:", token);

// Check NextAuth session
console.log("Session:", await getSession());

// Check middleware
console.log("Authenticated user:", req.user);
```

## ✅ Fixed Issues:

1. **TypeScript compilation**: ✅ No errors
2. **Authentication flow**: ✅ Consistent, single JWT source
3. **Session management**: ✅ Backend JWT + NextAuth session
4. **API protection**: ✅ Middleware validates all requests
5. **User ownership**: ✅ Supabase CRUD với user context

## 🚀 Ready for Testing:

Bây giờ magic link authentication sẽ hoạt động đúng với flow:
**Magic Link → Supabase Auth → Backend JWT → NextAuth Session → Protected API Calls**

Không còn conflict giữa multiple JWT creation methods! 🎉

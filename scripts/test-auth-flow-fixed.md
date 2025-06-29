# Test Authentication Flow - Fixed Version

## 🔄 **New Flow (No Duplicated Backend Calls):**

### 1. **Magic Link Click**

```
Magic Link → Supabase Auth →
/api/auth/supabase-callback?code=xxx
```

### 2. **Supabase Callback** (`route.ts`)

```
🔍 Log URL và params
🔄 Exchange code với Supabase
🔄 Get/Create user profile
🔄 Call Backend ONCE để get JWT token
🎉 Redirect to /signin/callback?user=xxx&token=xxx
```

### 3. **NextAuth Session** (`callback/page.tsx`)

```
📦 Parse user + token từ URL
🔐 Include token trong signIn() call
🎯 NextAuth stores JWT trong session
➡️  Redirect to /learning
```

### 4. **API Calls**

```
✅ NextAuth session với JWT token
✅ Learning service calls API Gateway với Bearer token
✅ No more internal /api calls
```

## 🧪 **Test Steps:**

### Step 1: Clear Browser Data

```
- Clear cookies/session storage
- Open DevTools Console
- Go to http://localhost:3000/signin
```

### Step 2: Magic Link Flow

```
1. Enter email → Send magic link
2. Click magic link từ email
3. Watch browser console logs:

   🔍 [AUTH DEBUG] Full callback URL: ...
   🔄 [AUTH STEP] Processing authentication...
   ✅ [AUTH SUCCESS] Got Supabase user: ...
   🔄 [BACKEND STEP] Calling backend for JWT...
   ✅ [BACKEND SUCCESS] Got response: ...
   🎉 [SUCCESS] Redirecting to: /signin/callback?user=...&token=...

4. NextAuth logs:
   🔍 [NextAuth JWT] User signed in: {hasToken: true}
   🔍 [NextAuth Session] Session created: {hasToken: true}
```

### Step 3: Check Final State

```
✅ URL should be: /learning
✅ No more internal /api/auth/session calls in Network tab
✅ Learning service should work (topics, chat, notes)
```

## 🔍 **Debug Commands:**

### Test Backend Auth Directly:

```powershell
$body = @{
    user = @{
        id = "test-user"
        email = "test@example.com"
        name = "Test User"
    }
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/supabase-callback" `
  -Method Post -ContentType "application/json" -Body $body

Write-Host "Response: $($response | ConvertTo-Json)"
```

### Check NextAuth Session:

```javascript
// In browser console after login
fetch("/api/auth/session")
  .then((r) => r.json())
  .then((data) => console.log("NextAuth Session:", data));
```

### Test API Gateway Call:

```javascript
// Get session token and test API call
const session = await fetch("/api/auth/session").then((r) => r.json());
const token = session.accessToken;

fetch("http://localhost:8080/api/learning/topics", {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
})
  .then((r) => r.json())
  .then((data) => console.log("API Response:", data));
```

## 🎯 **Expected Results:**

### ✅ Success Indicators:

- Console logs show complete flow without errors
- URL ends at `/learning`
- NextAuth session contains `accessToken`
- API calls work with Bearer token
- No internal `/api/auth/*` calls in Network tab

### ❌ Error Scenarios:

```
Missing user data → Backend auth failed
No JWT token → NextAuth token missing
API calls fail → Bearer token not working
Still internal calls → Frontend not using API Gateway
```

## 🔧 **Troubleshooting:**

### If still seeing `/api/auth/session` calls:

1. Check if other components are calling NextAuth directly
2. Verify `getSession()` calls use proper token
3. Clear browser cache completely

### If API calls fail:

1. Check `lib/config.ts` API_ENDPOINTS
2. Verify API Gateway routing
3. Test backend health endpoints

### If JWT missing in session:

1. Check NextAuth JWT callback logs
2. Verify token passing in signin callback
3. Test backend auth endpoint directly

**Flow này sẽ eliminate duplicate backend calls và ensure consistent JWT usage!** 🚀

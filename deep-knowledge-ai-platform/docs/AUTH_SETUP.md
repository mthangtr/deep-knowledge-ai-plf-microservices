# Authentication Setup Guide

## 📋 Tổng quan

Hệ thống authentication sử dụng kết hợp **Supabase** (provider xác thực) và **NextAuth** (quản lý phiên làm việc).

### 🏗️ Luồng hoạt động:

1. User nhập email → Supabase gửi Magic Link
2. User click Magic Link → Supabase callback handler
3. Xử lý tạo/cập nhật user trong DB → Tạo NextAuth session
4. Redirect đến `/learning` với session đã được bảo vệ

---

## 🗄️ Database Setup

### 1. Tạo bảng `users`

```sql
-- Bảng users để lưu thông tin người dùng
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('magic_link', 'google', 'github')),
  supabase_user_id UUID UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Trigger tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE
    ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes để tối ưu performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_supabase_user_id ON users(supabase_user_id);
CREATE INDEX idx_users_provider ON users(provider);
CREATE INDEX idx_users_last_login_at ON users(last_login_at);
```

### 2. Tạo bảng `plans`

```sql
-- Bảng plans để lưu các gói dịch vụ
CREATE TABLE plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0, -- Giá tính theo USD cents
  currency TEXT NOT NULL DEFAULT 'USD',
  features JSONB NOT NULL DEFAULT '[]', -- Mảng các tính năng
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger tự động cập nhật updated_at cho plans
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE
    ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes cho plans
CREATE INDEX idx_plans_name ON plans(name);
CREATE INDEX idx_plans_is_active ON plans(is_active);
CREATE INDEX idx_plans_price ON plans(price);
```

### 3. Tạo bảng `user_plans` (Many-to-Many relationship)

```sql
-- Bảng user_plans để quản lý subscription của users
CREATE TABLE user_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL cho plan lifetime
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, plan_id, status) -- Mỗi user chỉ có 1 subscription active cho 1 plan
);

-- Trigger tự động cập nhật updated_at cho user_plans
CREATE TRIGGER update_user_plans_updated_at BEFORE UPDATE
    ON user_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes cho user_plans
CREATE INDEX idx_user_plans_user_id ON user_plans(user_id);
CREATE INDEX idx_user_plans_plan_id ON user_plans(plan_id);
CREATE INDEX idx_user_plans_status ON user_plans(status);
CREATE INDEX idx_user_plans_expires_at ON user_plans(expires_at);
CREATE INDEX idx_user_plans_user_status ON user_plans(user_id, status);
```

### 4. Insert default plans

```sql
-- Thêm plan Free
INSERT INTO plans (name, description, price, currency, features, is_active) VALUES
(
  'free',
  'Gói miễn phí với các tính năng cơ bản',
  0,
  'USD',
  '["Truy cập cơ bản", "5 chat sessions/ngày", "Ghi chú cơ bản", "1 mind map/ngày"]',
  true
),
(
  'premium',
  'Gói cao cấp với đầy đủ tính năng',
  1000, -- $10.00
  'USD',
  '["Truy cập không giới hạn", "Chat sessions không giới hạn", "Ghi chú nâng cao", "Mind map không giới hạn", "AI mentor chuyên sâu", "Phân tích học tập", "Xuất báo cáo", "Hỗ trợ ưu tiên"]',
  true
);
```

### 5. Cập nhật RLS (Row Level Security)

```sql
-- Bật RLS cho bảng users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

-- Policies cho users table
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid()::text = supabase_user_id::text);

CREATE POLICY "Service role has full access to users" ON users
    FOR ALL USING (auth.role() = 'service_role');

-- Policies cho plans table
CREATE POLICY "Anyone can read active plans" ON plans
    FOR SELECT USING (is_active = true);

CREATE POLICY "Service role has full access to plans" ON plans
    FOR ALL USING (auth.role() = 'service_role');

-- Policies cho user_plans table
CREATE POLICY "Users can read own plans" ON user_plans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = user_plans.user_id
            AND users.supabase_user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Service role has full access to user_plans" ON user_plans
    FOR ALL USING (auth.role() = 'service_role');
```

### 6. Function để auto-assign premium plan cho user mới

```sql
-- Function để tự động assign premium plan cho user mới
CREATE OR REPLACE FUNCTION assign_premium_plan_to_new_user()
RETURNS TRIGGER AS $$
DECLARE
    premium_plan_id UUID;
BEGIN
    -- Lấy ID của plan premium
    SELECT id INTO premium_plan_id
    FROM plans
    WHERE name = 'premium' AND is_active = true
    LIMIT 1;

    -- Nếu có plan premium, assign cho user mới
    IF premium_plan_id IS NOT NULL THEN
        INSERT INTO user_plans (user_id, plan_id, status, started_at, auto_renew)
        VALUES (NEW.id, premium_plan_id, 'active', NOW(), true);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger để tự động assign plan khi tạo user mới
CREATE TRIGGER assign_premium_plan_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION assign_premium_plan_to_new_user();
```

---

## ⚙️ Environment Variables

Thêm vào file `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key

# Optional: Callback URLs (mặc định sẽ dùng NEXTAUTH_URL)
SUPABASE_MAGIC_LINK_REDIRECT_URL=http://localhost:3000/api/auth/supabase-callback
SUPABASE_OAUTH_REDIRECT_URL=http://localhost:3000/api/auth/supabase-callback
```

---

## 🔧 Supabase Configuration

### 1. Authentication Settings

Trong Supabase Dashboard → Authentication → Settings:

- **Site URL**: `http://localhost:3000` (hoặc domain production)
- **Redirect URLs**:
  - `http://localhost:3000/api/auth/supabase-callback`
  - `https://yourdomain.com/api/auth/supabase-callback`

### 2. Email Templates

Cập nhật email template cho Magic Link trong Authentication → Email Templates:

```html
<h2>Đăng nhập vào Deep Knowledge AI Platform</h2>
<p>Click vào link bên dưới để đăng nhập:</p>
<p><a href="{{ .ConfirmationURL }}">Đăng nhập ngay</a></p>
<p>Link này sẽ hết hạn sau 1 giờ.</p>
```

### 3. OAuth Providers (Tùy chọn)

Để bật Google OAuth:

1. Tạo OAuth credentials tại [Google Cloud Console](https://console.cloud.google.com/)
2. Thêm redirect URI: `https://your-project.supabase.co/auth/v1/callback`
3. Cập nhật trong Supabase Dashboard → Authentication → Providers

---

## 🛡️ Security Notes

### 1. CORS Configuration

Đảm bảo domain của bạn được thêm vào Supabase CORS allowlist.

### 2. JWT Secret

Sử dụng secret key đủ mạnh cho NEXTAUTH_SECRET:

```bash
openssl rand -base64 32
```

### 3. Database Security

- Service Role Key chỉ sử dụng server-side
- Anon Key có thể sử dụng client-side
- RLS policies đã được thiết lập để bảo vệ dữ liệu

---

## 🚀 Testing

### 1. Test Magic Link Flow:

1. Vào `/signin`
2. Nhập email và click "Gửi Magic Link"
3. Check email và click link
4. Kiểm tra redirect về `/learning`
5. **Kiểm tra user được auto-assign premium plan**

### 2. Test OAuth Flow:

1. Click "Google" button
2. Hoàn thành OAuth flow
3. Kiểm tra user được tạo trong DB
4. **Kiểm tra user có premium plan**
5. Kiểm tra session trong browser

### 3. Test Protected Routes:

1. Logout và thử truy cập `/learning`
2. Kiểm tra redirect về `/signin`
3. Login và kiểm tra có thể truy cập `/learning`

### 4. Test Plan System:

```sql
-- Kiểm tra plans được tạo
SELECT * FROM plans;

-- Kiểm tra user có premium plan
SELECT u.email, p.name, up.status, up.started_at
FROM users u
JOIN user_plans up ON u.id = up.user_id
JOIN plans p ON up.plan_id = p.id
WHERE up.status = 'active';
```

---

## 🐛 Troubleshooting

### Magic Link không hoạt động:

- Kiểm tra email templates trong Supabase
- Kiểm tra redirect URLs
- Kiểm tra CORS settings

### OAuth không hoạt động:

- Kiểm tra OAuth credentials
- Kiểm tra redirect URIs trong provider console
- Kiểm tra provider settings trong Supabase

### Session không persist:

- Kiểm tra NEXTAUTH_SECRET
- Kiểm tra cookies trong browser
- Kiểm tra middleware configuration

### Database errors:

- Kiểm tra RLS policies
- Kiểm tra service role key
- Kiểm tra table permissions

### Plan assignment không hoạt động:

- Kiểm tra trigger function
- Kiểm tra plans data có tồn tại
- Kiểm tra logs trong Supabase Dashboard

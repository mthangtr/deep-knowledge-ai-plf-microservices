# Deep Knowledge AI Platform (Frontend)

## 🚀 Tổng quan

Đây là frontend cho **Deep Knowledge AI Platform**, một ứng dụng web được xây dựng với Next.js, được thiết kế để tạo ra một môi trường học tập tương tác và năng động. Nền tảng này cho phép người dùng khám phá các chủ đề phức tạp thông qua các cây kiến thức do AI tạo ra, tham gia vào các cuộc trò chuyện theo ngữ cảnh với AI và sắp xếp kiến thức của họ bằng các ghi chú tích hợp.

Dự án này sử dụng một ngăn xếp công nghệ hiện đại để mang lại trải nghiệm người dùng liền mạch, hiệu suất cao và an toàn.

---

## ✨ Tính năng cốt lõi

- **Tạo cây kiến thức (Learning Tree Generation)**: AI tự động tạo ra các bản đồ tư duy (mind map) có cấu trúc cho bất kỳ chủ đề nào, chia các khái niệm phức tạp thành các nút (node) dễ hiểu.
- **Trò chuyện ngữ cảnh kép (Dual-Context Chat)**:
  - **Trò chuyện cấp độ chủ đề (Topic-Level Chat)**: Thảo luận chung về toàn bộ chủ đề.
  - **Trò chuyện cấp độ nút (Node-Level Chat)**: Các cuộc hội thoại tập trung, chuyên sâu về các nút kiến thức cụ thể trong cây.
- **Tích hợp bản đồ tư duy tương tác (Interactive Mind Map)**: Trực quan hóa và điều hướng cây kiến thức, cho phép chuyển đổi liền mạch giữa các ngữ cảnh trò chuyện.
- **Bảng ghi chú (Notes Panel)**: Ghi lại thông tin chi tiết từ các cuộc trò chuyện AI trực tiếp vào một bảng ghi chú được liên kết với ngữ cảnh.
- **Xác thực an toàn (Secure Authentication)**: Sử dụng Supabase (Magic Links, OAuth) và NextAuth.js để quản lý phiên làm việc an toàn.
- **Quản lý gói thuê bao (Plan Management)**: Hệ thống quản lý các gói dịch vụ (ví dụ: miễn phí, trả phí) cho người dùng.
- **Thiết kế đáp ứng (Responsive Design)**: Giao diện người dùng được tối ưu hóa cho cả máy tính để bàn và thiết bị di động.

---

## 🛠️ Ngăn xếp công nghệ

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Ngôn ngữ**: [TypeScript](https://www.typescriptlang.org/)
- **UI Framework**: [Shadcn/UI](https://ui.shadcn.com/) trên nền [Tailwind CSS](https://tailwindcss.com/) & [Radix UI](https://www.radix-ui.com/)
- **Xác thực (Authentication)**: [Supabase Auth](https://supabase.com/docs/guides/auth) & [NextAuth.js](https://next-auth.js.org/)
- **Cơ sở dữ liệu (Database)**: [Supabase (PostgreSQL)](https://supabase.com/)
- **Quản lý trạng thái (State Management)**: React Hooks, Context API
- **Fetching dữ liệu (Data Fetching)**: `useSWR` / React Query (thông qua các custom hooks)

---

## 📂 Cấu trúc dự án

Dự án tuân thủ cấu trúc của Next.js App Router để tối ưu hóa việc tổ chức code và hiệu suất.

```
deep-knowledge-ai-platform/
├── app/                  # Định tuyến, trang và layout (App Router)
│   ├── api/              # API routes xử lý logic backend
│   ├── (auth)/           # Các trang liên quan đến xác thực
│   ├── learning/         # Trang học tập chính
│   └── ...
├── components/           # Các component React có thể tái sử dụng
│   ├── ui/               # Các component UI cơ bản từ Shadcn
│   ├── layout/           # Component cấu trúc layout
│   └── learning/         # Component chuyên cho tính năng học tập
├── hooks/                # Các custom React hooks cho business logic
├── lib/                  # Các hàm tiện ích, cấu hình, và services
│   ├── services/         # Logic gọi API backend
│   └── supabase.ts       # Khởi tạo Supabase client
├── docs/                 # (Sẽ bị loại bỏ) Tài liệu dự án
└── ...
```

---

## 🏁 Bắt đầu

Làm theo các bước sau để thiết lập và chạy dự án trên máy cục bộ của bạn.

### 1. Điều kiện tiên quyết

- [Node.js](https://nodejs.org/en/) (v18 trở lên)
- [pnpm](https://pnpm.io/) (hoặc npm/yarn)
- [Docker](https://www.docker.com/) (nếu chạy cơ sở dữ liệu cục bộ)

### 2. Thiết lập biến môi trường

Tạo một file `.env.local` ở thư mục gốc của dự án và điền các biến sau.

```env
# Supabase - Lấy từ dashboard dự án Supabase của bạn
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth - Dùng cho việc mã hóa session
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET= # Chạy `openssl rand -base64 32` để tạo một key mới
```

### 3. Cài đặt Dependencies

```bash
pnpm install
```

### 4. Thiết lập cơ sở dữ liệu

Kết nối đến cơ sở dữ liệu Supabase (hoặc PostgreSQL cục bộ) của bạn và chạy các truy vấn SQL trong file `docs/create-database.sql`. File này sẽ:

- Tạo các bảng `users`, `plans`, `user_plans` và các bảng khác.
- Thiết lập các chính sách Row Level Security (RLS) để bảo vệ dữ liệu.
- Chèn các gói dịch vụ mặc định (`free`, `premium`).
- Tạo triggers và functions cần thiết.

### 5. Chạy máy chủ phát triển

```bash
pnpm dev
```

Bây giờ, ứng dụng sẽ chạy tại [http://localhost:3000](http://localhost:3000).

---

## 🔑 Kiến trúc cốt lõi

### Luồng xác thực

Hệ thống kết hợp sức mạnh của Supabase và NextAuth:

1.  **Provider**: Supabase xử lý việc gửi Magic Link hoặc các luồng OAuth (Google, GitHub).
2.  **Callback**: Sau khi xác thực thành công, Supabase gọi lại một API route (`/api/auth/supabase-callback`) trong ứng dụng Next.js.
3.  **Session Management**: API route này tạo hoặc cập nhật người dùng trong cơ sở dữ liệu, sau đó sử dụng NextAuth.js để tạo một phiên làm việc (session) an toàn được lưu trong một cookie.
4.  **Protected Routes**: Middleware của Next.js sẽ kiểm tra session này để bảo vệ các trang yêu cầu đăng nhập.

### Khái niệm trò chuyện ngữ cảnh kép

Đây là tính năng trung tâm của nền tảng, cho phép các cuộc trò chuyện AI có chiều sâu và phù hợp với ngữ cảnh.

- **Topic (Chủ đề)**: Là một khái niệm cấp cao mà người dùng muốn học (ví dụ: "Lập trình React.js"). Mỗi chủ đề có một không gian trò chuyện chung.
- **Node (Nút kiến thức)**: Là một phần nhỏ, cụ thể trong một chủ đề, được biểu diễn như một nút trong bản đồ tư duy (ví dụ: "JSX là gì?", "State và Props").

**Luồng hoạt động:**

1.  Người dùng tạo một chủ đề. Hệ thống sẽ hiển thị **Topic-Level Chat**, nơi người dùng có thể hỏi các câu hỏi chung.
2.  Người dùng mở bản đồ tư duy (Mind Map) để xem các nút kiến thức do AI tạo ra.
3.  Khi người dùng nhấp vào một nút cụ thể, giao diện sẽ chuyển sang **Node-Level Chat**.
4.  Mọi cuộc trò chuyện từ đây sẽ tập trung vào ngữ cảnh của nút đó, cho phép AI cung cấp các câu trả lời chính xác và chuyên sâu hơn.
5.  Người dùng có thể dễ dàng quay lại Topic-Level Chat bằng cách chọn lại chủ đề từ thanh bên.

## 🚀 Tính năng mới: Smart Notes với Auto-Save

### ✨ Cập nhật Notes Panel

- **Edit in-place**: Click vào note để chỉnh sửa trực tiếp
- **Auto-save debounced**: Tự động lưu sau 2 giây không có thay đổi
- **Ctrl+S**: Lưu ngay lập tức
- **Save on exit**: Tự động lưu khi nhấn "Quay lại"
- **Visual feedback**: Hiển thị trạng thái "Chưa lưu", "Đang lưu..."
- **Hover effects**: UI cải thiện với edit icons

### 🔄 Workflow

1. **Tạo note mới**: Nhấn "Thêm ghi chú mới"
2. **Edit note**: Click vào note có sẵn để chỉnh sửa
3. **Auto-save**: Hệ thống tự động lưu sau 2 giây
4. **Manual save**: Nhấn Ctrl+S hoặc nút "Lưu"
5. **Exit safe**: Nhấn "Quay lại" sẽ tự động lưu và thoát

### 🎯 Technical Features

- **Debounce mechanism**: Tránh spam requests
- **Smart create/update**: Tự động phân biệt create vs update
- **Error handling**: Xử lý lỗi graceful
- **Type safety**: Full TypeScript support
- **Backend integration**: Tích hợp hoàn chỉnh với API

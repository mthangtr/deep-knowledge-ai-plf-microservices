import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // Lấy token từ cookie
  const token = req.cookies.get("jwt_token")?.value;

  // Lấy URL trang đăng nhập
  const signinUrl = new URL("/signin", req.url);

  // Thêm callbackUrl để người dùng được chuyển hướng lại đúng trang sau khi đăng nhập
  signinUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);

  // Nếu không có token, chuyển hướng đến trang đăng nhập tùy chỉnh
  if (!token) {
    return NextResponse.redirect(signinUrl);
  }

  // Nếu có token, cho phép truy cập.
  // Backend sẽ xác thực token này khi nhận được request.
  return NextResponse.next();
}

// Cấu hình các route cần được bảo vệ bởi middleware
export const config = {
  matcher: [
    "/learning/:path*",
    "/mindmap/:path*",
    "/profile/:path*",
    "/plans/:path*",
  ],
};

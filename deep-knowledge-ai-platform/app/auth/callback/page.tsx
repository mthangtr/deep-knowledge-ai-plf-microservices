'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { API_ENDPOINTS } from '@/lib/config';

function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const handleAuthCallback = async () => {
            // Supabase client library tự động xử lý URL fragment (#access_token=...)
            // và lưu session khi getSession() được gọi.
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                console.error('Lỗi khi lấy session:', sessionError);
                router.push('/signin?error=session_failed');
                return;
            }

            if (session) {
                try {
                    // Gửi thông tin user đã xác thực đến backend để lấy JWT tùy chỉnh
                    const response = await fetch(API_ENDPOINTS.auth.callback, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user: session.user }),
                    });

                    if (!response.ok) {
                        const errorBody = await response.text();
                        throw new Error(`Lỗi khi lấy JWT từ backend: ${errorBody}`);
                    }

                    const { token } = await response.json();

                    // Lưu token vào sessionStorage để client-side hooks sử dụng
                    sessionStorage.setItem('jwt_token', token);

                    // LƯU Ý QUAN TRỌNG: Tạo cookie để middleware có thể đọc được
                    // Middleware chạy ở server-side và không thể truy cập sessionStorage
                    document.cookie = `jwt_token=${token}; path=/; max-age=2592000; samesite=lax`; // 30 ngày

                    // Chuyển hướng đến trang chính sau khi đăng nhập thành công
                    router.push('/learning');

                } catch (error) {
                    console.error('Lỗi trong quá trình callback với backend:', error);
                    await supabase.auth.signOut(); // Đăng xuất nếu không lấy được JWT
                    router.push('/signin?error=backend_auth_failed');
                }
            } else {
                // Trường hợp này xảy ra nếu người dùng truy cập trực tiếp URL này
                // mà không có session hợp lệ trong URL fragment.
                router.push('/signin?error=no_session');
            }
        };

        handleAuthCallback();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-6"></div>
                <h1 className="text-xl font-semibold text-foreground">Đang xác thực</h1>
                <p className="mt-2 text-muted-foreground">Vui lòng đợi trong giây lát...</p>
            </div>
        </div>
    );
}

export default AuthCallbackPage; 
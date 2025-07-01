'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Mail, Chrome, Github, CheckCircle, AlertCircle } from 'lucide-react';

const ERROR_MESSAGES = {
    callback_error: 'Có lỗi xảy ra trong quá trình xác thực. Vui lòng thử lại.',
    missing_code: 'Thiếu thông tin xác thực. Vui lòng thử lại.',
    missing_auth_params: 'Thiếu thông tin xác thực. Vui lòng thử lại.',
    exchange_failed: 'Không thể xác thực. Magic link có thể đã hết hạn.',
    session_failed: 'Không thể tạo phiên làm việc. Vui lòng thử lại.',
    no_auth_method: 'Không có phương thức xác thực hợp lệ.',
    no_auth_data: 'Không tìm thấy dữ liệu xác thực.',
    database_error: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    update_failed: 'Không thể cập nhật thông tin người dùng.',
    create_failed: 'Không thể tạo tài khoản. Vui lòng thử lại.',
    processing_failed: 'Lỗi xử lý. Vui lòng thử lại.',
    missing_user_data: 'Thiếu thông tin người dùng. Vui lòng thử lại.',
    unexpected_error: 'Có lỗi không mong muốn xảy ra. Vui lòng thử lại.',
};

function SignInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { signInWithGoogle, signInWithMagicLink, signInWithGitHub, isAuthenticated, isLoading } = useAuth();
    const { toast } = useToast();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [emailSent, setEmailSent] = useState(false);

    // Redirect nếu đã đăng nhập
    useEffect(() => {
        if (isAuthenticated) {
            router.push('/learning');
        }
    }, [isAuthenticated, router]);

    // Kiểm tra lỗi từ URL parameters
    useEffect(() => {
        const errorParam = searchParams.get('error') as keyof typeof ERROR_MESSAGES;
        const message = searchParams.get('message');

        if (errorParam) {
            const errorMessage = ERROR_MESSAGES[errorParam] || 'Có lỗi xảy ra. Vui lòng thử lại.';
            setError(message || errorMessage);
            toast({
                title: 'Xác thực thất bại',
                description: message || errorMessage,
                variant: 'destructive',
            });
        }
    }, [searchParams, toast]);

    // Gửi Magic Link
    const handleSendMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const result = await signInWithMagicLink(email);
            if (result.success) {
                setEmailSent(true);
                toast({
                    title: 'Email đã được gửi!',
                    description: result.message,
                });
            } else {
                setError(result.error || 'Gửi magic link thất bại');
            }
        } catch (err: any) {
            setError(err.message || 'Gửi magic link thất bại');
        } finally {
            setLoading(false);
        }
    };

    // Đăng nhập Google
    const handleGoogleAuth = async () => {
        try {
            setLoading(true);
            const result = await signInWithGoogle();
            if (!result.success) {
                setError(result.error || 'Đăng nhập Google thất bại');
            }
        } catch (error) {
            setError('Có lỗi xảy ra, vui lòng thử lại');
        } finally {
            setLoading(false);
        }
    };

    // Đăng nhập GitHub
    const handleGitHubAuth = async () => {
        try {
            setLoading(true);
            const result = await signInWithGitHub();
            if (!result.success) {
                setError(result.error || 'Đăng nhập GitHub thất bại');
            }
        } catch (error) {
            setError('Có lỗi xảy ra, vui lòng thử lại');
        } finally {
            setLoading(false);
        }
    };

    // Hiển thị loading khi đang check auth
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center pt-16">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-status-loading border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-ui-secondary">Đang kiểm tra trạng thái đăng nhập...</p>
                </div>
            </div>
        );
    }

    // Hiển thị thông báo email đã gửi
    if (emailSent) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 py-8 pt-24">
                <div className="w-full max-w-md">
                    <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
                        <CardHeader className="text-center">
                            <div className="mx-auto w-12 h-12 bg-status-success/10 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="w-6 h-6 text-status-success" />
                            </div>
                            <CardTitle className="text-2xl text-status-success">Kiểm tra email của bạn!</CardTitle>
                            <CardDescription>
                                Chúng tôi đã gửi link đăng nhập đến <strong>{email}</strong>
                                <br />
                                Click vào link trong email để vào tài khoản.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setEmailSent(false);
                                    setEmail('');
                                    setError('');
                                }}
                                className="w-full"
                            >
                                Gửi lại hoặc sử dụng email khác
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8 pt-24">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Chào mừng!</h1>
                    <p className="text-ui-secondary">Đăng nhập hoặc tạo tài khoản để bắt đầu học tập</p>
                </div>
                <Card className="bg-glass border-glass">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl text-center">Đăng nhập / Đăng ký</CardTitle>
                        <CardDescription className="text-center">
                            Chọn phương thức xác thực
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* OAuth Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                onClick={handleGoogleAuth}
                                disabled={loading}
                                className="w-full"
                            >
                                <Chrome className="mr-2 h-4 w-4" />
                                Google
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleGitHubAuth}
                                disabled={loading}
                                className="w-full"
                            >
                                <Github className="mr-2 h-4 w-4" />
                                GitHub
                            </Button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <Separator className="w-full" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">Hoặc với email</span>
                            </div>
                        </div>

                        {/* Magic Link Form */}
                        <form onSubmit={handleSendMagicLink} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="example@gmail.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        disabled={loading}
                                        className="pl-10 bg-transparent"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-sm text-status-error bg-status-error/10 p-3 rounded-lg">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading || !email}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-border border-t-transparent rounded-full animate-spin mr-2" />
                                        Đang gửi...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Gửi Magic Link
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function AuthPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center pt-16">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Đang tải trang đăng nhập...</p>
                </div>
            </div>
        }>
            <SignInForm />
        </Suspense>
    );
} 
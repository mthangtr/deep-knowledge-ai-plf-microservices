'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const { user, isLoading, signOut } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut();
        router.push('/signin');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        // This part should ideally not be reached if your middleware is set up correctly,
        // but it's a good fallback.
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle>Truy cập bị từ chối</CardTitle>
                        <CardDescription>Bạn cần đăng nhập để xem trang này.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/signin')}>Đi đến trang Đăng nhập</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-12 px-4">
            <Card className="max-w-2xl mx-auto">
                <CardHeader className="text-center">
                    <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-primary/20">
                        <AvatarImage src={user.user_metadata?.avatar_url || ''} alt={user.user_metadata?.name || 'User'} />
                        <AvatarFallback>{user.user_metadata?.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-3xl">{user.user_metadata?.name}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                </CardHeader>
                <CardContent className="mt-4 flex flex-col items-center">
                    <p className="text-muted-foreground mb-6">Đây là trang thông tin cá nhân của bạn.</p>
                    <Button onClick={handleSignOut} variant="destructive">
                        Đăng xuất
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
} 
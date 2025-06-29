import { AnimatedBackground } from '@/components/layout/AnimatedBackground';
import { LearningPlatformLayout } from '@/components/layout/LearningPlatformLayout';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Nền tảng học tập AI - Phản biện và Tư duy',
    description: 'Học tập thông qua cuộc đối thoại phản biện với AI Mentor thông minh',
};

export default function LearningPage() {
    return (
        <div className="min-h-screen relative bg-background">
            <div className="relative z-10">
                <LearningPlatformLayout />
            </div>
        </div>
    );
} 
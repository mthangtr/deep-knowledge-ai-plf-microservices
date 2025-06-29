import { Navigation } from "@/components/layout/Navigation";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";

export default function SignInLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen relative bg-background">
            {/* Navigation */}
            <div className="relative z-10">
                <Navigation />
            </div>


            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
} 
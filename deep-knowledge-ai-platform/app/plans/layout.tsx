import { Navigation } from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";

export default function PlansLayout({
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

            {/* Footer */}
            <Footer />
        </div>
    );
} 
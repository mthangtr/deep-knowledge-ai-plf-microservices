import { BaseComponentProps } from "@/types";
import { APP_CONFIG } from "@/constants";
import Link from "next/link";
import Image from "next/image";
import { AuthenticatedDropdown } from "./AuthenticatedDropdown";

interface NavigationProps extends BaseComponentProps { }

export const Navigation: React.FC<NavigationProps> = ({ className = "" }) => {
    return (
        <nav className={`flex items-center justify-between px-6 py-4 max-w-7xl mx-auto ${className} z-10`}>
            <Link href="/" className="cursor-pointer flex items-center justify-center gap-2 select-none">
                <Image src="/logo.png" alt="logo" width={32} height={32} />
                <span className="text-xl font-bold">{APP_CONFIG.name}</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
                <Link
                    href="#features"
                    scroll={false}
                    className="text-nav hover:text-nav-hover transition-colors"
                >
                    Features
                </Link>
                <Link
                    href="#examples"
                    scroll={false}
                    className="text-nav hover:text-nav-hover transition-colors"
                >
                    Examples
                </Link>
                <Link
                    href="/plans"
                    className="text-nav hover:text-nav-hover transition-colors"
                >
                    Pricing
                </Link>
                <Link
                    href="/learning"
                    className="text-nav hover:text-nav-hover transition-colors"
                >
                    Learning Hub
                </Link>
                <AuthenticatedDropdown />
            </div>
        </nav>
    );
}; 
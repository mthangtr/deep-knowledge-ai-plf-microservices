import { BaseComponentProps } from "@/types";
import { FOOTER_LINKS, APP_CONFIG } from "@/constants";
import Image from "next/image";

interface FooterProps extends BaseComponentProps { }

export const Footer: React.FC<FooterProps> = ({ className = "" }) => {
    return (
        <footer className={`py-20 px-6 border-t border-border ${className}`}>
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between">
                    <div className="flex items-center space-x-2 mb-4 md:mb-0">
                        <Image src="/logo.png" alt="logo" width={32} height={32} />
                        <span className="text-xl font-bold">{APP_CONFIG.name}</span>
                    </div>
                    <div className="flex items-center space-x-8">
                        {FOOTER_LINKS.map((link) => (
                            <a
                                key={link.id}
                                href={link.href}
                                className="text-ui-secondary hover:text-ui-primary transition-colors"
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t border-muted text-center text-ui-muted">
                    <p>&copy; {APP_CONFIG.currentYear} {APP_CONFIG.name}. {APP_CONFIG.description}</p>
                </div>
            </div>
        </footer>
    );
}; 
'use client';

import { PromptInterface } from "@/components/forms/PromptInterface";
import { BaseComponentProps } from "@/types";

interface HeroSectionProps extends BaseComponentProps { }

export const HeroSection: React.FC<HeroSectionProps> = ({ className = "" }) => {
    return (
        <section className={`py-20 px-6 text-center max-w-4xl mx-auto ${className}`}>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                Learning with other AI sucks.{" "}
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Deep
                </span>
                {" "} fucking {" "}
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Learning
                </span>
                {" "}
                with us!
            </h1>
            <p className="text-xl md:text-2xl text-ui-secondary mb-12 leading-relaxed max-w-2xl mx-auto">
                We are also knowdledge seekers.
                We are here to help you learn things deeply, from the root, with the flow.
            </p>

            <PromptInterface />
        </section>
    );
}; 
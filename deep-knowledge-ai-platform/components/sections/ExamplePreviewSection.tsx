'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Code } from "lucide-react";
import { ClickHandler, BaseComponentProps } from "@/types";

interface ExamplePreviewSectionProps extends BaseComponentProps { }

const FormPreviewPlaceholder: React.FC = () => {
    return (
        <div className="space-y-4 filter blur-[1px] opacity-60">
            <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-10 bg-card rounded-lg"></div>
            </div>
            <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-32"></div>
                <div className="h-10 bg-card rounded-lg"></div>
            </div>
            <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-28"></div>
                <div className="h-24 bg-card rounded-lg"></div>
            </div>
            <div className="h-10 bg-feature-primary rounded-lg w-32"></div>
        </div>
    );
};

export const ExamplePreviewSection: React.FC<ExamplePreviewSectionProps> = ({ className = "" }) => {
    const handleGenerateClick: ClickHandler = () => {
        // Logic để xử lý khi click generate
    };

    return (
        <section id="examples" className={`py-20 px-6 max-w-4xl mx-auto ${className}`}>
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">See it in action</h2>
                <p className="text-ui-secondary text-lg">
                    From simple learning to complex deep learning, create any learning in seconds
                </p>
            </div>

            <Card className="bg-glass border-glass p-8 rounded-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
                <div className="relative">
                    <div className="flex items-center space-x-2 mb-6">
                        <Code className="h-5 w-5 text-ui-muted" />
                        <span className="text-sm text-ui-muted font-mono">Generated Learning MindMap Preview</span>
                    </div>

                    <FormPreviewPlaceholder />

                    <div className="absolute inset-0 flex items-center justify-center">
                        <Button
                            size="lg"
                            onClick={handleGenerateClick}
                            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold px-6 py-3 rounded-xl"
                        >
                            Generate Your MindMap
                        </Button>
                    </div>
                </div>
            </Card>
        </section>
    );
}; 
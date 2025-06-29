'use client';

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, ArrowUp } from "lucide-react";
import { QuickSuggestions } from "./QuickSuggestions";
import { ClickHandler, BaseComponentProps } from "@/types";

interface PromptInterfaceProps extends BaseComponentProps { }

export const PromptInterface: React.FC<PromptInterfaceProps> = ({ className = "" }) => {
    const handleAttachClick: ClickHandler = () => {
        // Logic để attach file
        console.log('Attach file clicked');
    };

    const handleSendClick: ClickHandler = () => {
        // Logic để gửi prompt
        console.log('Send prompt clicked');
    };

    return (
        <div className={`z-10 flex items-center justify-center px-6 ${className}`}>
            <div className="w-full">
                <div className="bg-glass backdrop-blur-md rounded-xl p-4 pb-2 shadow-2xl border border-border">
                    {/* Textarea container */}
                    <div className="w-full mb-4">
                        <Textarea
                            placeholder="Tell us what you want to learn..."
                            className="w-full min-h-[120px] bg-transparent border-none text-ui-primary placeholder:text-ui-muted resize-none focus:ring-0 focus:outline-none focus:border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-lg leading-relaxed"
                            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                        />
                    </div>

                    {/* Action buttons - positioned below textarea */}
                    <div className="flex justify-between gap-3">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleAttachClick}
                            className="h-8 w-8 bg-transparent border border-border text-muted-foreground hover:bg-glass-hover transition-all duration-200"
                        >
                            <Paperclip className="h-4 w-4" />
                        </Button>

                        <Button
                            size="icon"
                            onClick={handleSendClick}
                            className="h-8 w-8 bg-transparent border border-border text-muted-foreground rounded-xl hover:bg-glass-hover transition-all duration-200"
                        >
                            <ArrowUp className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <QuickSuggestions className="mt-6" />
            </div>
        </div>
    );
}; 
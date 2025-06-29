'use client';

import { Button } from "@/components/ui/button";
import { SuggestionClickHandler, BaseComponentProps } from "@/types";
import { SUGGESTION_OPTIONS } from "@/constants";
import { Sparkles } from "lucide-react";

interface QuickSuggestionsProps extends BaseComponentProps { }

export const QuickSuggestions: React.FC<QuickSuggestionsProps> = ({ className = "" }) => {
    const handleSuggestionClick: SuggestionClickHandler = (suggestion) => {
        console.log('Suggestion clicked:', suggestion);
        // Logic để xử lý khi click vào suggestion
    };

    return (
        <div className={`flex flex-wrap gap-3 justify-center ${className}`}>
            {SUGGESTION_OPTIONS.map((suggestion) => (
                <Button
                    key={suggestion.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="bg-glass hover:bg-feature-primary/20 text-feature-primary hover:text-ui-primary border border-feature-primary/20 rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2 shadow-sm transition-all duration-200"
                >
                    <Sparkles className="w-4 h-4 text-feature-primary" />
                    {suggestion.label}
                </Button>
            ))}
        </div>
    );
}; 
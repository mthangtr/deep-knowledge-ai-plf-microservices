'use client';

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface MermaidDiagramProps {
    chart: string;
    className?: string;
}

// Generate a random ID for each diagram to avoid conflicts
const generateId = () => `mermaid-diagram-${Math.random().toString(36).substring(2, 9)}`;

export const MermaidDiagram = ({ chart, className }: MermaidDiagramProps) => {
    const { theme } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const diagramId = useRef(generateId());

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: theme === 'dark' ? 'dark' : 'default',
            securityLevel: 'loose',
            fontFamily: 'inherit',
        });

        const renderDiagram = async () => {
            if (containerRef.current && chart) {
                try {
                    const { svg } = await mermaid.render(diagramId.current, chart);
                    if (containerRef.current) {
                        containerRef.current.innerHTML = svg;
                    }
                } catch (error) {
                    console.error('Mermaid rendering error:', error);
                    if (containerRef.current) {
                        containerRef.current.innerHTML = `<pre class="text-red-500 text-xs">Lỗi render sơ đồ: ${error instanceof Error ? error.message : String(error)}</pre>`;
                    }
                }
            }
        };

        renderDiagram();
    }, [chart, theme]);

    return (
        <div
            ref={containerRef}
            className={cn("w-full flex justify-center my-6 p-4 bg-muted/30 rounded-lg shadow-inner overflow-x-auto", className)}
            key={theme} // Re-render on theme change to apply new styles
        >
            {/* Mermaid SVG will be injected here */}
        </div>
    );
}; 
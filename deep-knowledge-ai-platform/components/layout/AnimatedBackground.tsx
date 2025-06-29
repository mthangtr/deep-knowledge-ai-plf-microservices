'use client';

import { BaseComponentProps } from "@/types";

interface AnimatedBackgroundProps extends BaseComponentProps { }

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ className = "" }) => {
    return (
        <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orb-blue rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orb-purple rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orb-pink rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>
    );
}; 
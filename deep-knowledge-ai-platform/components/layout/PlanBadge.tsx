'use client';

import { Badge } from '@/components/ui/badge';
import { useUserPlan } from '@/hooks/use-user-plan';
import { Crown, Zap } from 'lucide-react';

export function PlanBadge() {
    const { currentPlan, isPremium, isFree, loading } = useUserPlan();

    if (loading || !currentPlan) return null;

    if (isPremium()) {
        return (
            <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 select-none">
                <Crown className="w-3 h-3 mr-1 text-yellow-500" />
                Premium
            </Badge>
        );
    }

    if (isFree()) {
        return (
            <Badge variant="outline" className="border-border text-ui-secondary select-none">
                <Zap className="w-3 h-3 mr-1 text-blue-500" />
                Free
            </Badge>
        );
    }

    return null;
} 
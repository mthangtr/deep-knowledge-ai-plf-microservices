'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { LearningTopic } from '@/types';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    MessageCircle,
    Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserDropdown } from '@/components/layout/UserDropdown';

interface TopicSidebarProps {
    topics: LearningTopic[];
    selectedTopic: LearningTopic | null;
    collapsed: boolean;
    onToggleCollapse: () => void;
    onTopicSelect: (topic: LearningTopic) => void;
    onNewTopic: () => void;
}

export function TopicSidebar({
    topics,
    selectedTopic,
    collapsed,
    onToggleCollapse,
    onTopicSelect,
    onNewTopic
}: TopicSidebarProps) {
    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Hôm nay';
        if (days === 1) return 'Hôm qua';
        if (days < 7) return `${days} ngày trước`;
        return date.toLocaleDateString('vi-VN');
    };

    return (
        <div className="flex flex-col h-full bg-card">
            {/* Header with User Dropdown */}
            <div className="flex flex-wrap items-center justify-between p-4 border-b border-border ">
                {!collapsed ? (
                    <div className="flex-1 mr-2">
                        <UserDropdown collapsed={false} />
                    </div>
                ) : (
                    <UserDropdown collapsed={true} />
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleCollapse}
                    className="h-8 w-8 flex-shrink-0"
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
            </div>

            {/* New Topic Button */}
            <div className="p-4 select-none">
                <Button
                    onClick={onNewTopic}
                    className="w-full gap-2"
                    variant="default"
                >
                    <Plus className="h-4 w-4" />
                    {!collapsed && 'Chủ đề mới'}
                </Button>
            </div>

            {/* Topics List */}
            <ScrollArea className="flex-1 px-2">
                <div className="space-y-2 pb-4">
                    {topics.map((topic) => (
                        <div
                            key={topic.id}
                            className={cn(
                                "group relative rounded-lg border cursor-pointer transition-all duration-200",
                                "hover:bg-accent hover:border-accent-foreground/20",
                                selectedTopic?.id === topic.id
                                    ? "bg-accent border-accent-foreground/20 shadow-sm"
                                    : "bg-background border-border"
                            )}
                            onClick={() => onTopicSelect(topic)}
                        >
                            <div className="p-3">
                                {collapsed ? (
                                    <div className="flex items-center justify-center">
                                        <span className="text-lg" title={topic.title}>
                                            {topic.icon}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {/* Topic Header */}
                                        <div className="flex items-start gap-3">
                                            <span className="text-lg flex-shrink-0 mt-0.5">
                                                {topic.icon}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-sm leading-5 line-clamp-2">
                                                    {topic.title}
                                                </h3>
                                            </div>
                                        </div>

                                        {/* Topic Stats */}
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <MessageCircle className="h-3 w-3" />
                                                <span>{topic.messageCount}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                <span>{formatTime(topic.updatedAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Active Indicator */}
                            {selectedTopic?.id === topic.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                            )}
                        </div>
                    ))}

                    {topics.length === 0 && !collapsed && (
                        <div className="text-center py-8 text-muted-foreground select-none">
                            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Chưa có chủ đề nào</p>
                            <p className="text-xs mt-1">Tạo chủ đề mới để bắt đầu học</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
} 
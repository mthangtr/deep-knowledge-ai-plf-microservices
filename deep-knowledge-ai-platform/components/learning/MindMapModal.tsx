'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TreeNode } from '@/types/database';
import { TreeView } from '@/components/learning/TreeView';
import {
    Brain,
    Download,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Maximize,
    ChevronRight,
    ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MindMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: TreeNode[];
    topicTitle: string;
    onNodeSelect?: (node: TreeNode) => void;
}

export function MindMapModal({ isOpen, onClose, data, topicTitle, onNodeSelect }: MindMapModalProps) {

    const displayTreeData = data.length > 0 ? data : [];

    const handleNodeClick = (node: TreeNode) => {
        if (onNodeSelect) {
            onNodeSelect(node);
            onClose(); // Đóng modal sau khi chọn node
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                            <Brain className="h-5 w-5 text-feature-secondary" />
                            Cây kiến thức: {topicTitle}
                        </DialogTitle>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                                {displayTreeData.length} nodes
                            </Badge>
                        </div>
                    </div>
                </DialogHeader>

                {/* Tree View Content */}
                <div className="flex-1 overflow-hidden">
                    {displayTreeData.length > 0 ? (
                        <TreeView
                            nodes={displayTreeData}
                            className="h-full"
                            onNodeClick={handleNodeClick}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h3 className="text-lg font-semibold mb-2">Chưa có dữ liệu cây kiến thức</h3>
                            <p className="text-muted-foreground mb-4 max-w-md">
                                Tiếp tục cuộc đối thoại để AI tự động tạo cây kiến thức từ nội dung học tập
                            </p>
                            <div className="space-y-3">
                                <Badge variant="secondary">
                                    Tính năng đang phát triển
                                </Badge>
                                <div>
                                    <Button variant="outline" size="sm" asChild>
                                        <a href="/mindmap" target="_blank" rel="noopener noreferrer">
                                            Xem Demo Interactive Tree
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </DialogContent>
        </Dialog>
    );
} 
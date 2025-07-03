'use client';

import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MindMapNodeData } from '@/types';
import {
    ChevronRight,
    ChevronDown,
    BookOpen,
    ArrowRight,
    Clock,
    Target,
    CheckCircle,
    X,
    Copy,
    Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TreeNodeProps {
    node: MindMapNodeData;
    level: number;
    allNodes: MindMapNodeData[];
    expandedNodes: Set<string>;
    onToggle: (nodeId: string) => void;
    onNodeClick: (node: MindMapNodeData) => void;
    parentPath?: string[];
}

function TreeNode({
    node,
    level,
    allNodes,
    expandedNodes,
    onToggle,
    onNodeClick,
    parentPath = []
}: TreeNodeProps) {
    // Correctly find child nodes based on parent_id relationship
    const childNodes = allNodes.filter(childNode => childNode.parent_id === node.id);

    const hasChildren = childNodes.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const currentPath = [...parentPath, node.id];
    const isCircular = parentPath.includes(node.id);

    const handleToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasChildren && !isCircular) {
            onToggle(node.id);
        }
    }, [hasChildren, isCircular, node.id, onToggle]);

    const handleNodeClick = useCallback(() => {
        onNodeClick(node);
    }, [node, onNodeClick]);

    if (isCircular) return null;

    const getLevelStyle = (nodeLevel: number): string => {
        switch (nodeLevel) {
            case 0: return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
            case 1: return 'border-l-green-500 bg-green-50 dark:bg-green-950/20';
            case 2: return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
            case 3: return 'border-l-purple-500 bg-purple-50 dark:bg-purple-950/20';
            default: return 'border-l-gray-500 bg-gray-50 dark:bg-gray-950/20';
        }
    };

    const getIndentationClass = (nodeLevel: number): string => {
        return `pl-${Math.min(nodeLevel * 8, 32)}`;
    };

    return (
        <div className="w-full">
            <div
                className={cn(
                    "group relative flex items-center gap-3 py-3 px-4 border-l-4 cursor-pointer transition-all duration-200",
                    "hover:bg-accent hover:shadow-sm rounded-r-md",
                    getLevelStyle(level),
                    getIndentationClass(level)
                )}
                onClick={handleNodeClick}
                style={{
                    marginLeft: `${level * 24}px`,
                    borderLeftWidth: '4px'
                }}
            >
                {/* Tree Toggle Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={handleToggle}
                    disabled={!hasChildren || isCircular}
                >
                    {hasChildren && !isCircular ? (
                        isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                        </div>
                    )}
                </Button>

                {/* Level Icon */}
                <div className="flex-shrink-0">
                    {level === 0 && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    {level === 1 && <div className="w-2 h-2 rounded-full bg-green-500" />}
                    {level === 2 && <div className="w-2 h-2 rounded-full bg-yellow-500" />}
                    {level === 3 && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                    {level > 3 && <div className="w-2 h-2 rounded-full bg-gray-500" />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="h-4 w-4 flex-shrink-0" />
                        <h3 className={cn(
                            "font-medium truncate",
                            level === 0 && "text-base font-bold",
                            level === 1 && "text-sm font-semibold",
                            level === 2 && "text-sm",
                            level >= 3 && "text-xs"
                        )}>
                            {node.title}
                        </h3>
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-xs flex-shrink-0",
                                level === 0 && "bg-blue-100 text-blue-800 border-blue-300",
                                level === 1 && "bg-green-100 text-green-800 border-green-300",
                                level === 2 && "bg-yellow-100 text-yellow-800 border-yellow-300",
                                level >= 3 && "bg-purple-100 text-purple-800 border-purple-300"
                            )}
                        >
                            L{level}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {node.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {node.requires.length > 0 && (
                            <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{node.requires.length} phụ thuộc</span>
                            </div>
                        )}
                        {node.next.length > 0 && (
                            <div className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                <span>{node.next.length} gợi ý</span>
                            </div>
                        )}
                        {hasChildren && (
                            <div className="flex items-center gap-1">
                                <ArrowRight className="h-3 w-3" />
                                <span>{childNodes.length} con</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(`${node.title}: ${node.description}`);
                        }}
                    >
                        <Copy className="h-3 w-3" />
                    </Button>
                </div>
            </div>
            {isExpanded && hasChildren && !isCircular && (
                <div className="relative">
                    {/* Connecting line for children */}
                    <div
                        className="absolute left-6 top-0 bottom-0 w-px bg-border opacity-50"
                        style={{ marginLeft: `${level * 24}px` }}
                    />
                    <div className="space-y-1">
                        {childNodes
                            .sort((a, b) => a.title.localeCompare(b.title))
                            .map((childNode, index, array) => (
                                <div key={childNode.id} className="relative">
                                    {/* Branch connector */}
                                    <div
                                        className="absolute left-6 top-6 w-4 h-px bg-border opacity-50"
                                        style={{ marginLeft: `${level * 24}px` }}
                                    />
                                    <TreeNode
                                        node={childNode}
                                        level={level + 1}
                                        allNodes={allNodes}
                                        expandedNodes={expandedNodes}
                                        onToggle={onToggle}
                                        onNodeClick={onNodeClick}
                                        parentPath={currentPath}
                                    />
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export interface TreeViewProps {
    nodes: MindMapNodeData[];
    className?: string;
    onNodeClick?: (node: MindMapNodeData) => void;
}

export function TreeView({ nodes, className, onNodeClick }: TreeViewProps) {
    console.log("--- TreeView Data Received ---", nodes);
    // Auto-expand top level nodes (level 0 and 1) by default
    const getDefaultExpandedNodes = () => {
        const topLevelNodes = nodes.filter(node => node.level <= 1);
        return new Set(topLevelNodes.map(node => node.id));
    };

    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => getDefaultExpandedNodes());
    const [selectedNode, setSelectedNode] = useState<MindMapNodeData | null>(null);
    const [showModal, setShowModal] = useState(false);

    // Update expanded nodes when nodes change
    useEffect(() => {
        setExpandedNodes(getDefaultExpandedNodes());
    }, [nodes]);

    // Correctly get root nodes: those with no parent_id
    const rootNodes = nodes.filter(node => !node.parent_id)
        .sort((a, b) => {
            // Sort by level first, then by title
            if (a.level !== b.level) return a.level - b.level;
            return a.title.localeCompare(b.title);
        });

    const handleToggle = useCallback((nodeId: string) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    }, []);

    const handleNodeClick = useCallback((node: MindMapNodeData) => {
        if (onNodeClick) {
            onNodeClick(node);
        } else {
            setSelectedNode(node);
            setShowModal(true);
        }
    }, [onNodeClick]);

    const handleExpandAll = () => {
        const allNodeIds = new Set(nodes.map(n => n.id));
        setExpandedNodes(allNodeIds);
    };

    const handleCollapseAll = () => {
        setExpandedNodes(new Set());
    };

    const handleExportTree = () => {
        const generateTreeText = (nodeId: string, level: number = 0, visited: Set<string> = new Set()): string => {
            if (visited.has(nodeId)) return '';
            visited.add(nodeId);

            const node = nodes.find(n => n.id === nodeId);
            if (!node) return '';

            const indent = '  '.repeat(level);
            let text = `${indent}- ${node.title}\\n`;

            const children = nodes.filter(n => n.parent_id === nodeId);
            children.forEach(child => {
                text += generateTreeText(child.id, level + 1, new Set(visited));
            });

            return text;
        };

        const treeText = rootNodes.map(root => generateTreeText(root.id)).join('\\n');
        const blob = new Blob([treeText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'learning_tree.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className={cn('w-full', className)}>
            <div className="flex gap-2 mb-2">
                <Button size="sm" variant="outline" onClick={handleExpandAll}>
                    <ChevronDown className="h-4 w-4 mr-1" /> Mở rộng tất cả
                </Button>
                <Button size="sm" variant="outline" onClick={handleCollapseAll}>
                    <ChevronRight className="h-4 w-4 mr-1" /> Thu gọn tất cả
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportTree}>
                    <Download className="h-4 w-4 mr-1" /> Xuất cây
                </Button>
            </div>
            <ScrollArea className="h-[500px] border rounded-md bg-background">
                <div className="p-2">
                    {rootNodes.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            Không có node nào để hiển thị
                        </div>
                    )}
                    {rootNodes.map(root => (
                        <TreeNode
                            key={root.id}
                            node={root}
                            level={0}
                            allNodes={nodes}
                            expandedNodes={expandedNodes}
                            onToggle={handleToggle}
                            onNodeClick={handleNodeClick}
                        />
                    ))}
                </div>
            </ScrollArea>

            {/* Node detail modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {selectedNode?.title}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedNode && (
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                                {selectedNode.description}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <Badge variant="outline">Level {selectedNode.level}</Badge>
                                {selectedNode.requires.length > 0 && (
                                    <Badge variant="secondary">Phụ thuộc: {selectedNode.requires.length}</Badge>
                                )}
                                {selectedNode.next.length > 0 && (
                                    <Badge variant="secondary">Gợi ý: {selectedNode.next.length}</Badge>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default TreeView; 
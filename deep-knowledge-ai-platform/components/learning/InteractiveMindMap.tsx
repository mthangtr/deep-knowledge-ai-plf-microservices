'use client';

import { useState, useCallback, useMemo } from 'react';
import {
    ReactFlow,
    Node,
    Edge,
    addEdge,
    Connection,
    useNodesState,
    useEdgesState,
    Controls,
    MiniMap,
    Background,
    BackgroundVariant,
    NodeProps,
    Handle,
    Position,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MindMapNodeData, NodeModalData } from '@/types';
import {
    BookOpen,
    ArrowRight,
    ArrowLeft,
    Target,
    CheckCircle,
    Clock,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Extended node data with onClick function
interface ExtendedMindMapNodeData extends MindMapNodeData {
    onClick?: (data: MindMapNodeData) => void;
}

// Custom Node Component
function CustomMindMapNode({ data, selected }: NodeProps<ExtendedMindMapNodeData>) {
    const handleClick = useCallback(() => {
        if (data.onClick) {
            data.onClick(data);
        }
    }, [data]);

    return (
        <div
            className={cn(
                "px-4 py-3 shadow-lg rounded-lg border-2 bg-card cursor-pointer transition-all duration-200",
                "hover:shadow-xl hover:scale-105",
                selected ? "border-primary shadow-primary/20" : "border-border hover:border-primary/50",
                data.level === 0 && "bg-primary text-primary-foreground border-primary",
                data.level === 1 && "bg-level-1-soft border-level-1",
                data.level === 2 && "bg-level-2-soft border-level-2",
                data.level >= 3 && "bg-level-3-soft border-level-3"
            )}
            onClick={handleClick}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="w-3 h-3 !bg-primary border-2 border-background"
            />

            <div className="text-center min-w-[150px] max-w-[200px]">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <BookOpen className="h-4 w-4" />
                    <Badge
                        variant={data.level === 0 ? "secondary" : "outline"}
                        className="text-xs"
                    >
                        L{data.level}
                    </Badge>
                </div>

                <h3 className="font-semibold text-sm leading-tight">
                    {data.title}
                </h3>

                {data.description && (
                    <p className="text-xs opacity-80 mt-1 line-clamp-2">
                        {data.description.substring(0, 60)}...
                    </p>
                )}

                {/* Connection indicators */}
                <div className="flex justify-between items-center mt-2 text-xs">
                    {data.requires.length > 0 && (
                        <div className="flex items-center gap-1 text-status-warning">
                            <ArrowLeft className="h-3 w-3" />
                            <span>{data.requires.length}</span>
                        </div>
                    )}
                    <div className="flex-1" />
                    {data.next.length > 0 && (
                        <div className="flex items-center gap-1 text-status-success">
                            <ArrowRight className="h-3 w-3" />
                            <span>{data.next.length}</span>
                        </div>
                    )}
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="w-3 h-3 !bg-primary border-2 border-background"
            />
        </div>
    );
}

// Node types configuration
const nodeTypes = {
    mindMapNode: CustomMindMapNode,
};

interface InteractiveMindMapProps {
    nodes: MindMapNodeData[];
    className?: string;
}

export function InteractiveMindMap({ nodes, className }: InteractiveMindMapProps) {
    const [selectedNode, setSelectedNode] = useState<NodeModalData | null>(null);
    const [showModal, setShowModal] = useState(false);

    // Transform data to react-flow format with auto-layout
    const { flowNodes, flowEdges } = useMemo(() => {
        // Group nodes by level for positioning
        const nodesByLevel: { [key: number]: MindMapNodeData[] } = {};
        nodes.forEach(node => {
            if (!nodesByLevel[node.level]) {
                nodesByLevel[node.level] = [];
            }
            nodesByLevel[node.level].push(node);
        });

        // Calculate positions
        const levelHeight = 200;
        const nodeWidth = 250;
        const nodeSpacing = 50;

        const flowNodes: Node[] = nodes.map((nodeData, index) => {
            const levelNodes = nodesByLevel[nodeData.level];
            const nodeIndex = levelNodes.findIndex(n => n.id === nodeData.id);
            const totalNodesInLevel = levelNodes.length;

            // Center nodes horizontally within each level
            const startX = -(totalNodesInLevel - 1) * (nodeWidth + nodeSpacing) / 2;
            const x = startX + nodeIndex * (nodeWidth + nodeSpacing);
            const y = nodeData.level * levelHeight;

            return {
                id: nodeData.id,
                type: 'mindMapNode',
                position: { x, y },
                data: {
                    ...nodeData,
                    onClick: (data: MindMapNodeData) => {
                        setSelectedNode(data);
                        setShowModal(true);
                    }
                },
            };
        });

        // Create edges based on 'next' relationships
        const flowEdges: Edge[] = [];
        nodes.forEach(node => {
            node.next.forEach(nextId => {
                flowEdges.push({
                    id: `${node.id}-${nextId}`,
                    source: node.id,
                    target: nextId,
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: 'hsl(var(--primary))',
                    },
                });
            });

            // Optional: Add dashed edges for 'requires' relationships
            node.requires.forEach(requiredId => {
                flowEdges.push({
                    id: `req-${requiredId}-${node.id}`,
                    source: requiredId,
                    target: node.id,
                    type: 'smoothstep',
                    style: {
                        stroke: 'hsl(var(--muted-foreground))',
                        strokeWidth: 1,
                        strokeDasharray: '5,5'
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: 'hsl(var(--muted-foreground))',
                    },
                });
            });
        });

        return { flowNodes, flowEdges };
    }, [nodes]);

    const [flowNodesState, setNodes, onNodesChange] = useNodesState(flowNodes);
    const [flowEdgesState, setEdges, onEdgesChange] = useEdgesState(flowEdges);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedNode(null);
    };

    return (
        <div className={cn("w-full h-full", className)}>
            <ReactFlow
                nodes={flowNodesState}
                edges={flowEdgesState}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-left"
                className="bg-background"
            >
                <Controls className="bg-card border border-border" />
                <MiniMap
                    className="bg-card border border-border"
                    nodeColor={(node) => {
                        const level = (node.data as MindMapNodeData).level;
                        if (level === 0) return 'hsl(var(--primary))';
                        if (level === 1) return 'hsl(var(--level-1))';
                        if (level === 2) return 'hsl(var(--level-2))';
                        return 'hsl(var(--level-3))';
                    }}
                />
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    className="opacity-30"
                />
            </ReactFlow>

            {/* Node Detail Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center gap-3">
                                <div className={cn(
                                    "w-3 h-3 rounded-full",
                                    selectedNode?.level === 0 && "bg-primary",
                                    selectedNode?.level === 1 && "bg-level-1",
                                    selectedNode?.level === 2 && "bg-level-2",
                                    (selectedNode?.level ?? 0) >= 3 && "bg-level-3"
                                )} />
                                {selectedNode?.title}
                            </DialogTitle>
                            <Badge variant="outline">
                                Level {selectedNode?.level}
                            </Badge>
                        </div>
                    </DialogHeader>

                    {selectedNode && (
                        <div className="space-y-6">
                            {/* Description */}
                            <div>
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" />
                                    Mô tả
                                </h4>
                                <p className="text-muted-foreground leading-relaxed">
                                    {selectedNode.description}
                                </p>
                            </div>

                            {/* Prerequisites */}
                            {selectedNode.requires.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-orange-600" />
                                        Yêu cầu trước ({selectedNode.requires.length})
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedNode.requires.map((reqId) => {
                                            const reqNode = nodes.find(n => n.id === reqId);
                                            return (
                                                <Badge
                                                    key={reqId}
                                                    variant="outline"
                                                    className="text-orange-600 border-orange-600"
                                                >
                                                    {reqNode?.title || reqId}
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Next Steps */}
                            {selectedNode.next.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <Target className="h-4 w-4 text-status-success" />
                                        Học tiếp theo ({selectedNode.next.length})
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedNode.next.map((nextId) => {
                                            const nextNode = nodes.find(n => n.id === nextId);
                                            return (
                                                <Badge
                                                    key={nextId}
                                                    variant="outline"
                                                    className="text-status-success border-status-success"
                                                >
                                                    {nextNode?.title || nextId}
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t">
                                <Button
                                    variant="outline"
                                    onClick={handleCloseModal}
                                    className="flex-1"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Đóng
                                </Button>
                                <Button className="flex-1">
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Đánh dấu đã học
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
} 
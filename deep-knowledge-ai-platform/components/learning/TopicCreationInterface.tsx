'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TreeView } from './TreeView';
import { Loader2, Sparkles, Brain, AlertCircle, CheckCircle } from 'lucide-react';
import { useLearningGeneration } from '@/hooks/use-learning-generation';
import { useLearningTopics } from '@/hooks/use-learning-topics';
import { useLearningNodes } from '@/hooks/use-learning-nodes';
import { MindMapNodeData } from '@/types';
import { cn } from '@/lib/utils';

interface TopicCreationInterfaceProps {
    onNodeSelect: (node: MindMapNodeData) => void;
    onTopicCreated?: (topicId: string) => void; // Callback khi tạo topic thành công
    className?: string;
}

export function TopicCreationInterface({ onNodeSelect, onTopicCreated, className }: TopicCreationInterfaceProps) {
    const [prompt, setPrompt] = useState('');
    const [treeData, setTreeData] = useState<MindMapNodeData[]>([]);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [generatedTopicId, setGeneratedTopicId] = useState<string | null>(null);

    const { topics, fetchTopics } = useLearningTopics();
    const { nodes, fetchNodes } = useLearningNodes(generatedTopicId || undefined);

    const {
        isLoading,
        isGenerating,
        isImporting,
        error,
        success,
        result,
        generateLearningTree,
        reset,
    } = useLearningGeneration();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!prompt.trim() || isLoading) return;

        try {

            const generationResult = await generateLearningTree(prompt.trim(), true);

            if (generationResult && generationResult.data?.topic?.id) {
                const topicId = generationResult.data.topic.id;
                setGeneratedTopicId(topicId);

                // Load real tree từ database
                await fetchNodes(topicId);

                // Refresh topics list
                await fetchTopics();

                // Notify parent về topic ID mới tạo
                if (onTopicCreated) {
                    onTopicCreated(topicId);
                }

                setHasGenerated(true);
            }
        } catch (error) {
            console.error('Lỗi khi tạo lộ trình học:', error);
        }
    };

    // Convert database nodes to MindMapNodeData khi nodes update
    useEffect(() => {
        if (nodes && nodes.length > 0) {
            const convertedTreeData: MindMapNodeData[] = nodes.map(node => ({
                id: node.id, // Dùng real UUID từ database
                title: node.title,
                description: node.description,
                prompt_sample: node.prompt_sample,
                is_chat_enabled: node.is_chat_enabled,
                requires: node.requires || [],
                next: node.next || [],
                level: node.level || 0
            }));

            setTreeData(convertedTreeData);
        }
    }, [nodes]);

    const handleNodeClick = (node: MindMapNodeData) => {
        onNodeSelect(node);
    };

    const handleReset = () => {
        setPrompt('');
        setTreeData([]);
        setHasGenerated(false);
        setGeneratedTopicId(null);
        reset();
    };

    const canSubmit = prompt.trim().length >= 3 && !isLoading;

    return (
        <div className={cn('h-full flex flex-col', className)}>
            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <Card className="w-96 p-6">
                        <div className="flex flex-col items-center space-y-4 text-center">
                            <Loader2 className="h-12 w-12 animate-spin text-status-loading" />
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Đang tạo lộ trình học...</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    AI đang phân tích và tạo cây kiến thức cho bạn
                                </p>
                                <div className="flex justify-center gap-4">
                                    <div className={cn(
                                        "flex items-center gap-2 text-sm",
                                        isGenerating ? 'text-status-loading' : success ? 'text-status-success' : 'text-ui-muted'
                                    )}>
                                        {isGenerating ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : success ? (
                                            <CheckCircle className="h-4 w-4" />
                                        ) : (
                                            <div className="h-4 w-4 rounded-full border-2 border-muted" />
                                        )}
                                        Phân tích AI
                                    </div>
                                    <div className={cn(
                                        "flex items-center gap-2 text-sm",
                                        isImporting ? 'text-status-loading' : success ? 'text-status-success' : 'text-ui-muted'
                                    )}>
                                        {isImporting ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : success ? (
                                            <CheckCircle className="h-4 w-4" />
                                        ) : (
                                            <div className="h-4 w-4 rounded-full border-2 border-muted" />
                                        )}
                                        Lưu dữ liệu
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {!hasGenerated ? (
                /* Giao diện nhập prompt */
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="w-full max-w-2xl mx-auto space-y-6">
                        <div className="text-center space-y-4">
                            <div className="flex justify-center">
                                <div className="p-4 bg-status-info/10 rounded-full">
                                    <Brain className="h-12 w-12 text-status-info" />
                                </div>
                            </div>
                            <h1 className="text-3xl font-bold">Tạo lộ trình học mới</h1>
                            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                                Nhập chủ đề bạn muốn học và AI sẽ tạo một cây kiến thức chi tiết cho bạn
                            </p>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-status-info" />
                                    Chủ đề muốn học
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <Textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="Ví dụ: Tôi muốn học đầu tư chứng khoán Việt Nam, React.js, Machine Learning, Docker..."
                                        className="min-h-[120px] text-base resize-none"
                                        disabled={isLoading}
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Hãy mô tả rõ ràng chủ đề để AI tạo lộ trình phù hợp nhất nhất (tối thiểu 3 ký tự)
                                    </p>

                                    {/* Error Display */}
                                    {error && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>
                                                <strong>Lỗi:</strong> {error}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={!canSubmit}
                                            className="min-w-[160px]"
                                            size="lg"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Đang tạo...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="mr-2 h-4 w-4" />
                                                    Tạo lộ trình
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                /* Giao diện hiển thị tree */
                <div className="flex-1 flex flex-col p-6">
                    <div className="mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Cây kiến thức của bạn</h2>
                                <p className="text-muted-foreground">
                                    Nhấp vào bất kỳ chủ đề nào để bắt đầu học và thảo luận
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleReset}>
                                    Tạo lộ trình mới
                                </Button>
                            </div>
                        </div>

                        {/* Success Alert */}
                        {success && result && (
                            <Alert className="mt-4">
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Thành công!</strong> Đã tạo {result.importResult?.totalNodes || treeData.length} chủ đề học tập.
                                    Nhấp vào bất kỳ chủ đề nào để bắt đầu thảo luận.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <div className="flex-1">
                        <TreeView
                            nodes={treeData}
                            onNodeClick={handleNodeClick}
                            className="h-full"
                        />
                    </div>
                </div>
            )}
        </div>
    );
} 
'use client';

import { useState } from 'react';
import { useLearningGeneration } from '@/hooks/use-learning-generation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Brain, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface LearningTreeGeneratorProps {
    onSuccess?: (result: any) => void;
    onError?: (error: string) => void;
}

export function LearningTreeGenerator({ onSuccess, onError }: LearningTreeGeneratorProps) {
    const [prompt, setPrompt] = useState('');
    const [useAI, setUseAI] = useState(true);

    const {
        isLoading,
        isGenerating,
        isImporting,
        error,
        success,
        result,
        generatedTree,
        generateLearningTree,
        generateSampleTree,
        canGenerate,
        statusText,
        reset,
    } = useLearningGeneration();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!prompt.trim()) {
            return;
        }

        try {
            const result = await generateLearningTree(prompt.trim(), useAI);
            onSuccess?.(result);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
            onError?.(errorMessage);
        }
    };

    const handleReset = () => {
        reset();
        setPrompt('');
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            {/* Form nhập prompt */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-status-info" />
                        Tạo Learning Path với AI
                    </CardTitle>
                    <CardDescription>
                        Nhập chủ đề bạn muốn học và AI sẽ tạo một learning path chi tiết cho bạn
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="prompt">Chủ đề muốn học</Label>
                            <Input
                                id="prompt"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Ví dụ: Tôi muốn học React.js, Apache Kafka, Machine Learning..."
                                disabled={isLoading}
                                className="text-base"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="use-ai"
                                    checked={useAI}
                                    onCheckedChange={setUseAI}
                                    disabled={isLoading}
                                />
                                <Label htmlFor="use-ai" className="text-sm">
                                    Sử dụng FlowiseAI {useAI ? '(Thật)' : '(Demo - Sample Data)'}
                                </Label>
                            </div>


                        </div>

                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                disabled={!canGenerate || !prompt.trim()}
                                className="flex-1"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {statusText}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Tạo Learning Path
                                    </>
                                )}
                            </Button>

                            {(success || error) && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleReset}
                                >
                                    Tạo mới
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Loading states */}
            {isLoading && (
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-3">
                            <Loader2 className="h-5 w-5 animate-spin text-status-loading" />
                            <div>
                                <p className="font-medium">{statusText}</p>
                                <div className="flex gap-2 mt-2">
                                    <Badge variant={isGenerating ? "default" : "secondary"}>
                                        {isGenerating ? <Sparkles className="h-3 w-3 mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                                        AI Generation
                                    </Badge>
                                    <Badge variant={isImporting ? "default" : "secondary"}>
                                        {isImporting ? <Database className="h-3 w-3 mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                                        Database Import
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Error state */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Lỗi:</strong> {error}
                    </AlertDescription>
                </Alert>
            )}

            {/* Success state */}
            {success && result && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-status-success">
                            <CheckCircle className="h-5 w-5" />
                            Tạo Learning Path thành công!
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-medium mb-2">Thông tin</h4>
                                <div className="space-y-1 text-sm">
                                    <p><strong>Prompt:</strong> {result.prompt}</p>
                                    <p><strong>AI Mode:</strong> {result.useAI ? 'FlowiseAI' : 'Sample Data'}</p>
                                    <p><strong>Status:</strong> {result.aiGeneration.message}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-medium mb-2">Kết quả Import</h4>
                                <div className="space-y-1 text-sm">
                                    <p><strong>Tổng topics:</strong> {result.importResult.totalNodes}</p>
                                    <p><strong>Đã thêm:</strong> {result.importResult.inserted}</p>
                                    <p><strong>Đã cập nhật:</strong> {result.importResult.updated}</p>
                                    {result.importResult.skipped > 0 && (
                                        <p><strong>Bỏ qua:</strong> {result.importResult.skipped}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {generatedTree && (
                            <div>
                                <h4 className="font-medium mb-2">Tree Structure</h4>
                                <div className="bg-muted p-3 rounded-md text-sm max-h-40 overflow-y-auto">
                                    <p className="text-ui-secondary mb-2">{generatedTree.tree.length} topics generated:</p>
                                    <ul className="space-y-1">
                                        {generatedTree.tree.slice(0, 5).map((node, index) => (
                                            <li key={node.id} className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">
                                                    L{node.level}
                                                </Badge>
                                                <span className="truncate">{node.title}</span>
                                            </li>
                                        ))}
                                        {generatedTree.tree.length > 5 && (
                                            <li className="text-ui-muted">... và {generatedTree.tree.length - 5} topics khác</li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 
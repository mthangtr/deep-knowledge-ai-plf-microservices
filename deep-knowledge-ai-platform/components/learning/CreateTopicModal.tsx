'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { useLearningGeneration } from '@/hooks/use-learning-generation';

interface CreateTopicModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (result: any) => void;
}

export function CreateTopicModal({ isOpen, onClose, onSuccess }: CreateTopicModalProps) {
    const [prompt, setPrompt] = useState('');

    const {
        isLoading,
        isGenerating,
        isImporting,
        error,
        success,
        result,
        generateLearningTree,
        reset,
        statusText,
    } = useLearningGeneration();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!prompt.trim()) {
            return;
        }

        try {
            const result = await generateLearningTree(prompt.trim(), true);
            onSuccess?.(result);

            // Close modal after successful generation
            setTimeout(() => {
                handleClose();
            }, 2000);
        } catch (error) {
            console.error('Error generating tree:', error);
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            reset();
            setPrompt('');
            onClose();
        }
    };

    const canSubmit = prompt.trim().length >= 3 && !isLoading;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-status-info" />
                        Tạo lộ trình học mới với AI
                    </DialogTitle>
                    <DialogDescription>
                        Nhập chủ đề bạn muốn học và AI sẽ tạo một lộ trình học chi tiết cho bạn
                    </DialogDescription>
                </DialogHeader>

                {/* Loading Overlay */}
                {isLoading && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
                        <div className="flex flex-col items-center space-y-4 text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-status-loading" />
                            <div>
                                <p className="font-medium text-lg">{statusText}</p>
                                <div className="flex justify-center gap-2 mt-2">
                                    <div className={`flex items-center gap-1 text-sm ${isGenerating ? 'text-status-loading' : 'text-status-success'}`}>
                                        {isGenerating ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <CheckCircle className="h-3 w-3" />
                                        )}
                                        AI Generation
                                    </div>
                                    <div className={`flex items-center gap-1 text-sm ${isImporting ? 'text-status-loading' : !isGenerating ? 'text-status-success' : 'text-ui-muted'}`}>
                                        {isImporting ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : !isGenerating ? (
                                            <CheckCircle className="h-3 w-3" />
                                        ) : (
                                            <div className="h-3 w-3 rounded-full border border-muted" />
                                        )}
                                        Database Import
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="prompt">Chủ đề muốn học</Label>
                        <Textarea
                            id="prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ví dụ: Tôi muốn học Apache Kafka, React.js, Machine Learning, Docker..."
                            className="min-h-[120px] text-base"
                            disabled={isLoading}
                        />
                        <p className="text-sm text-muted-foreground">
                            Hãy mô tả rõ ràng chủ đề bạn muốn học để AI có thể tạo lộ trình phù hợp nhất
                        </p>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Lỗi:</strong> {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Success Display */}
                    {success && result && (
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Thành công!</strong> Đã tạo {result.importResult?.totalNodes || 0} chủ đề học tập.
                                Modal sẽ tự động đóng...
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isLoading}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={!canSubmit}
                            className="min-w-[140px]"
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
            </DialogContent>
        </Dialog>
    );
} 
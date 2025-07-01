'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import {
    AlertTriangle,
    Database,
    Search,
    Trash2,
    CheckCircle,
    Info,
    RefreshCw,
    Download
} from 'lucide-react';

interface DuplicateResult {
    topic_id: string;
    node_id?: string;
    user_id: string;
    message: string;
    is_ai_response: boolean;
    duplicate_count: number;
    message_ids: string[];
    first_created: string;
    last_created: string;
    time_diff: string;
}

interface MessagePreview {
    id: string;
    topic_id: string;
    message_preview: string;
    is_ai_response: boolean;
    created_at: string;
    action: string;
}

export default function ChatCleanupPage() {
    const [loading, setLoading] = useState(false);
    const [duplicates, setDuplicates] = useState<DuplicateResult[]>([]);
    const [previewToDelete, setPreviewToDelete] = useState<MessagePreview[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // 1. Detect All Duplicates
    const detectDuplicates = async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.rpc('detect_chat_duplicates');

            if (error) throw error;
            setDuplicates(data || []);

            if (data?.length === 0) {
                setSuccess('🎉 Không tìm thấy duplicate messages nào!');
            }
        } catch (err: any) {
            // Fallback: Use direct query if RPC doesn't exist
            try {
                const { data, error } = await supabase
                    .from('learning_chats')
                    .select('topic_id, node_id, user_id, message, is_ai_response, created_at, id')
                    .order('created_at');

                if (error) throw error;

                // Process duplicates in JavaScript
                const messageGroups: any = {};
                data?.forEach(msg => {
                    const key = `${msg.topic_id}-${msg.node_id || 'null'}-${msg.user_id}-${msg.message}-${msg.is_ai_response}`;
                    if (!messageGroups[key]) {
                        messageGroups[key] = [];
                    }
                    messageGroups[key].push(msg);
                });

                const duplicateResults = Object.entries(messageGroups)
                    .filter(([_, msgs]: [string, any]) => msgs.length > 1)
                    .map(([_, msgs]: [string, any]) => {
                        const sorted = msgs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                        return {
                            topic_id: sorted[0].topic_id,
                            node_id: sorted[0].node_id,
                            user_id: sorted[0].user_id,
                            message: sorted[0].message,
                            is_ai_response: sorted[0].is_ai_response,
                            duplicate_count: sorted.length,
                            message_ids: sorted.map((m: any) => m.id),
                            first_created: sorted[0].created_at,
                            last_created: sorted[sorted.length - 1].created_at,
                            time_diff: `${Math.round((new Date(sorted[sorted.length - 1].created_at).getTime() - new Date(sorted[0].created_at).getTime()) / 1000)}s`
                        };
                    });

                setDuplicates(duplicateResults);

                if (duplicateResults.length === 0) {
                    setSuccess('🎉 Không tìm thấy duplicate messages nào!');
                }
            } catch (fallbackErr: any) {
                setError(`Lỗi detect duplicates: ${fallbackErr.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    // 2. Preview what will be deleted
    const previewCleanup = async () => {
        setLoading(true);
        setError(null);

        try {
            if (duplicates.length === 0) {
                setError('Chạy detect duplicates trước khi preview cleanup');
                return;
            }

            const toDelete: MessagePreview[] = [];

            duplicates.forEach(dup => {
                // Keep first message, mark rest for deletion
                dup.message_ids.slice(1).forEach(id => {
                    toDelete.push({
                        id,
                        topic_id: dup.topic_id,
                        message_preview: dup.message.substring(0, 50) + '...',
                        is_ai_response: dup.is_ai_response,
                        created_at: dup.last_created,
                        action: 'WILL BE DELETED'
                    });
                });
            });

            setPreviewToDelete(toDelete);
        } catch (err: any) {
            setError(`Lỗi preview: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 3. Execute cleanup
    const executeCleanup = async () => {
        if (previewToDelete.length === 0) {
            setError('Chạy preview cleanup trước khi execute');
            return;
        }

        const confirmCleanup = window.confirm(
            `⚠️ BẠN CHẮC CHẮN MUỐN XÓA ${previewToDelete.length} DUPLICATE MESSAGES?\n\nThao tác này KHÔNG THỂ HOÀN TÁC!`
        );

        if (!confirmCleanup) return;

        setLoading(true);
        setError(null);

        try {
            const idsToDelete = previewToDelete.map(p => p.id);

            const { error } = await supabase
                .from('learning_chats')
                .delete()
                .in('id', idsToDelete);

            if (error) throw error;

            setSuccess(`✅ Đã xóa ${idsToDelete.length} duplicate messages thành công!`);

            // Clear state and re-detect
            setDuplicates([]);
            setPreviewToDelete([]);
            await getStats();

        } catch (err: any) {
            setError(`Lỗi cleanup: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 4. Get statistics
    const getStats = async () => {
        try {
            const [totalRes, aiRes, userRes, topicsRes] = await Promise.all([
                supabase.from('learning_chats').select('id', { count: 'exact', head: true }),
                supabase.from('learning_chats').select('id', { count: 'exact', head: true }).eq('is_ai_response', true),
                supabase.from('learning_chats').select('id', { count: 'exact', head: true }).eq('is_ai_response', false),
                supabase.from('learning_chats').select('topic_id', { count: 'exact', head: true })
            ]);

            setStats({
                total_messages: totalRes.count || 0,
                ai_responses: aiRes.count || 0,
                user_messages: userRes.count || 0,
                unique_topics: topicsRes.count || 0
            });
        } catch (err: any) {
            console.error('Error getting stats:', err);
        }
    };

    // Export duplicate data
    const exportDuplicates = () => {
        const csvContent = "data:text/csv;charset=utf-8," +
            "Topic ID,Node ID,User ID,Message,Is AI Response,Duplicate Count,First Created,Last Created,Time Diff\n" +
            duplicates.map(d =>
                `"${d.topic_id}","${d.node_id || ''}","${d.user_id}","${d.message.replace(/"/g, '""')}",${d.is_ai_response},${d.duplicate_count},"${d.first_created}","${d.last_created}","${d.time_diff}"`
            ).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `chat-duplicates-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold">Chat Cleanup Admin</h1>
                <p className="text-muted-foreground mt-2">
                    Detect và clean up duplicate messages trong database
                </p>
            </div>

            {/* Alerts */}
            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
            )}

            {/* Stats Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Database Statistics</CardTitle>
                        <CardDescription>Current chat messages overview</CardDescription>
                    </div>
                    <Button onClick={getStats} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Stats
                    </Button>
                </CardHeader>
                <CardContent>
                    {stats ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold">{stats.total_messages}</div>
                                <div className="text-sm text-muted-foreground">Total Messages</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold">{stats.ai_responses}</div>
                                <div className="text-sm text-muted-foreground">AI Responses</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold">{stats.user_messages}</div>
                                <div className="text-sm text-muted-foreground">User Messages</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold">{stats.unique_topics}</div>
                                <div className="text-sm text-muted-foreground">Unique Topics</div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground">
                            Click "Refresh Stats" để load statistics
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Main Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Cleanup Actions</CardTitle>
                    <CardDescription>
                        Thực hiện các bước theo thứ tự để detect và clean up duplicates
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button
                            onClick={detectDuplicates}
                            disabled={loading}
                            className="w-full"
                        >
                            <Search className="h-4 w-4 mr-2" />
                            1. Detect Duplicates
                        </Button>

                        <Button
                            onClick={previewCleanup}
                            disabled={loading || duplicates.length === 0}
                            variant="outline"
                            className="w-full"
                        >
                            <Info className="h-4 w-4 mr-2" />
                            2. Preview Cleanup
                        </Button>

                        <Button
                            onClick={executeCleanup}
                            disabled={loading || previewToDelete.length === 0}
                            variant="destructive"
                            className="w-full"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            3. Execute Cleanup
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Results Tabs */}
            <Tabs defaultValue="duplicates" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="duplicates">
                        Detected Duplicates ({duplicates.length})
                    </TabsTrigger>
                    <TabsTrigger value="preview">
                        Cleanup Preview ({previewToDelete.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="duplicates">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Duplicate Messages</CardTitle>
                                <CardDescription>
                                    Messages có content hoàn toàn giống nhau
                                </CardDescription>
                            </div>
                            {duplicates.length > 0 && (
                                <Button onClick={exportDuplicates} variant="outline" size="sm">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export CSV
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96 w-full">
                                {duplicates.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8">
                                        Chưa detect duplicates. Click "Detect Duplicates" để bắt đầu.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {duplicates.map((dup, index) => (
                                            <div key={index} className="border rounded-lg p-4">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex gap-2">
                                                        <Badge variant={dup.is_ai_response ? "secondary" : "default"}>
                                                            {dup.is_ai_response ? 'AI' : 'User'}
                                                        </Badge>
                                                        <Badge variant="destructive">
                                                            {dup.duplicate_count} duplicates
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Time diff: {dup.time_diff}
                                                    </div>
                                                </div>
                                                <p className="text-sm mb-2">{dup.message}</p>
                                                <div className="text-xs text-muted-foreground">
                                                    <div>Topic: {dup.topic_id}</div>
                                                    <div>First: {new Date(dup.first_created).toLocaleString()}</div>
                                                    <div>Last: {new Date(dup.last_created).toLocaleString()}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="preview">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cleanup Preview</CardTitle>
                            <CardDescription>
                                Messages sẽ bị XÓA (giữ lại message đầu tiên, xóa các duplicates)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96 w-full">
                                {previewToDelete.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8">
                                        Chưa có preview. Click "Preview Cleanup" sau khi detect duplicates.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {previewToDelete.map((msg, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
                                                <div className="flex-1">
                                                    <div className="flex gap-2 mb-1">
                                                        <Badge variant={msg.is_ai_response ? "secondary" : "default"}>
                                                            {msg.is_ai_response ? 'AI' : 'User'}
                                                        </Badge>
                                                        <Badge variant="destructive">WILL DELETE</Badge>
                                                    </div>
                                                    <p className="text-sm">{msg.message_preview}</p>
                                                    <div className="text-xs text-muted-foreground">
                                                        {new Date(msg.created_at).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Warning */}
            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    <strong>Cảnh báo:</strong> Cleanup operation sẽ XÓA VĨNH VIỄN duplicate messages từ database.
                    Hãy chắc chắn backup database trước khi thực hiện cleanup.
                </AlertDescription>
            </Alert>
        </div>
    );
} 
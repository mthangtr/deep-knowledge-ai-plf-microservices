'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLearningChat } from '@/hooks/use-learning-chat';

export default function DebugChatPage() {
    const [testTopicId] = useState('123a121d-bd12-4154-a104-5bc1c773a260'); // Use existing topic for testing
    const [testNodeId] = useState('77f91909-2bfa-458a-97a5-8cb3808a84dc'); // Use existing node for testing
    const [testMessage, setTestMessage] = useState('Test message for StrictMode fix');
    const [testResults, setTestResults] = useState<string[]>([]);

    const {
        messages,
        loading,
        sending,
        error,
        sendMessage,
        createTopicAutoPrompt,
        createNodeAutoPrompt,
        messagesCount,
        isTopicChat,
        isNodeChat
    } = useLearningChat(testTopicId, testNodeId);

    const addTestResult = (result: string) => {
        setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
    };

    const handleTestSendMessage = async () => {
        const beforeCount = messagesCount;
        addTestResult(`🔥 TESTING sendMessage - Before: ${beforeCount} messages`);

        // Add unique test message to ensure new content
        const uniqueMessage = `${testMessage} - ${Date.now()}`;
        const result = await sendMessage({ message: uniqueMessage });

        // Wait a bit for state to update
        setTimeout(() => {
            const afterCount = messagesCount;
            addTestResult(`🔥 TESTING sendMessage - After: ${afterCount} messages (Δ+${afterCount - beforeCount}), Success: ${result?.success}`);

            // Expected: should be +2 (1 user + 1 AI message)
            if (afterCount - beforeCount === 2) {
                addTestResult(`✅ SUCCESS: Correct message count increase (+2)`);
            } else if (afterCount - beforeCount === 0) {
                addTestResult(`⚠️ WARNING: No message increase - check for duplicates or errors`);
            } else {
                addTestResult(`❌ UNEXPECTED: Message count increase is +${afterCount - beforeCount}`);
            }
        }, 1000);
    };

    const handleTestTopicAutoPrompt = async () => {
        addTestResult(`🔥 TESTING createTopicAutoPrompt - Before: ${messagesCount} messages`);
        const result = await createTopicAutoPrompt({
            topic_id: testTopicId,
            topic_title: 'Test Topic',
            topic_description: 'Test Description'
        }, false);
        addTestResult(`🔥 TESTING createTopicAutoPrompt - After: ${messagesCount} messages, Skipped: ${result?.skipped}`);
    };

    const handleTestNodeAutoPrompt = async () => {
        addTestResult(`🔥 TESTING createNodeAutoPrompt - Before: ${messagesCount} messages`);
        const result = await createNodeAutoPrompt({
            topic_id: testTopicId,
            node_id: testNodeId,
            node_title: 'Test Node',
            node_description: 'Test Node Description',
            prompt_sample: 'Test prompt sample for node'
        });
        addTestResult(`🔥 TESTING createNodeAutoPrompt - After: ${messagesCount} messages, Skipped: ${result?.skipped}`);
    };

    const clearTestResults = () => {
        setTestResults([]);
    };

    return (
        <div className="container mx-auto p-6 space-y-6 z-50">
            <div className="text-center">
                <h1 className="text-3xl font-bold">React StrictMode Chat Fix - Debug Page</h1>
                <p className="text-muted-foreground mt-2">
                    Test page để verify fix cho duplicate messages trong React StrictMode
                </p>
            </div>

            {/* Current Status */}
            <Card>
                <CardHeader>
                    <CardTitle>Current Chat Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm font-medium">Messages Count</label>
                            <div className="text-2xl font-bold">{messagesCount}</div>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Chat Mode</label>
                            <div className="flex gap-2 mt-1">
                                <Badge variant={isTopicChat ? "default" : "secondary"}>Topic</Badge>
                                <Badge variant={isNodeChat ? "default" : "secondary"}>Node</Badge>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Loading</label>
                            <div className="text-lg font-medium">{loading ? '🔄' : '✅'}</div>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Sending</label>
                            <div className="text-lg font-medium">{sending ? '🔄' : '✅'}</div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                            <p className="text-destructive font-medium">Error: {error}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Test Controls */}
            <Card>
                <CardHeader>
                    <CardTitle>Test Functions</CardTitle>
                    <CardDescription>
                        Các button này sẽ test từng function để xem có bị duplicate messages không
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Test Message:</label>
                        <Input
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            placeholder="Enter test message..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button
                            onClick={handleTestSendMessage}
                            disabled={sending || loading}
                            className="w-full"
                        >
                            Test sendMessage
                        </Button>

                        <Button
                            onClick={handleTestTopicAutoPrompt}
                            disabled={sending || loading}
                            variant="outline"
                            className="w-full"
                        >
                            Test Topic Auto Prompt
                        </Button>

                        <Button
                            onClick={handleTestNodeAutoPrompt}
                            disabled={sending || loading}
                            variant="outline"
                            className="w-full"
                        >
                            Test Node Auto Prompt
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Test Results */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Test Results</CardTitle>
                        <CardDescription>
                            Logs từ các test functions - quan sát xem có duplicate messages không
                        </CardDescription>
                    </div>
                    <Button onClick={clearTestResults} variant="outline" size="sm">
                        Clear Results
                    </Button>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-64 w-full border rounded-md p-4">
                        {testResults.length === 0 ? (
                            <p className="text-muted-foreground">Chưa có test results...</p>
                        ) : (
                            <div className="space-y-1">
                                {testResults.map((result, index) => (
                                    <div key={index} className="text-sm font-mono">
                                        {result}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Current Messages */}
            <Card>
                <CardHeader>
                    <CardTitle>Current Messages ({messagesCount})</CardTitle>
                    <CardDescription>
                        Messages hiện tại trong state - kiểm tra duplicates
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96 w-full border rounded-md p-4">
                        {messages.length === 0 ? (
                            <p className="text-muted-foreground">Chưa có messages...</p>
                        ) : (
                            <div className="space-y-4">
                                {messages.map((message, index) => (
                                    <div
                                        key={message.id}
                                        className={`p-3 rounded-lg border ${message.is_ai_response
                                            ? 'bg-muted/50 border-muted'
                                            : 'bg-primary/10 border-primary/20'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant={message.is_ai_response ? "secondary" : "default"}>
                                                {message.is_ai_response ? 'AI' : 'User'}
                                            </Badge>
                                            <div className="text-xs text-muted-foreground space-y-1">
                                                <div>ID: {message.id}</div>
                                                <div>{new Date(message.created_at).toLocaleString()}</div>
                                            </div>
                                        </div>
                                        <p className="text-sm">{message.message}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
                <CardHeader>
                    <CardTitle>Debug Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <h4 className="font-medium">Cách test React StrictMode fix:</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm">
                            <li>Đảm bảo app đang chạy trong development mode (React StrictMode enabled)</li>
                            <li>Click các test buttons và quan sát messages count trước/sau</li>
                            <li>Check browser console logs để xem "SKIPPING - Response already processed"</li>
                            <li>Verify không có duplicate messages với cùng content và timestamp</li>
                            <li>Test Results sẽ show messages count trước và sau mỗi operation</li>
                        </ol>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                            Expected Behavior (Fix hoạt động):
                        </h4>
                        <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                            <li>• Messages count tăng đúng: +2 cho mỗi successful operation (1 user + 1 AI)</li>
                            <li>• Console logs show "SKIPPING - Response already processed" cho lần thứ 2</li>
                            <li>• Không có duplicate messages với cùng content</li>
                            <li>• State updates chỉ happen 1 lần cho mỗi real API response</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 
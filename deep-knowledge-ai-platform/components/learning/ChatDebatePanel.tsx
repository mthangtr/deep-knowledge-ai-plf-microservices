'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { LearningTopic, ChatMessage } from '@/types';
import {
    Send,
    User,
    GraduationCap,
    BookmarkPlus,
    BookmarkCheck,
    Copy,
    MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatDebatePanelProps {
    selectedTopic: LearningTopic | null;
    messages: ChatMessage[];
    onSendMessage: (content: string) => void;
    onAddToNotes: (messageId: string) => void;
    sending?: boolean;
}

// Memoized component để format AI response - CRITICAL cho performance
const FormattedAIResponse = React.memo(({ content }: { content: string }) => {
    const markdownComponents = useMemo(() => ({
        h1: ({ node, ...props }: any) => <h1 className="text-3xl font-semibold mt-10 mb-5 tracking-tight text-foreground" {...props} />,
        h2: ({ node, ...props }: any) => <h2 className="text-2xl font-semibold mt-8 mb-4 tracking-tight text-foreground" {...props} />,
        h3: ({ node, ...props }: any) => <h3 className="text-xl font-semibold mt-6 mb-3 tracking-tight text-foreground" {...props} />,
        h4: ({ node, ...props }: any) => <h4 className="text-lg font-semibold mt-4 mb-2 text-foreground" {...props} />,
        p: ({ node, ...props }: any) => <p className="mb-4" {...props} />,
        ul: ({ node, ...props }: any) => <ul className="list-disc space-y-2 pl-6 mb-4" {...props} />,
        ol: ({ node, ...props }: any) => <ol className="list-decimal space-y-2 pl-6 mb-4" {...props} />,
        li: ({ node, ...props }: any) => <li className="pl-2" {...props} />,
        code({ node, className, children, ...props }: any) {
            const inline = !className?.includes('language-');
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
                <div className="my-4 rounded-lg overflow-hidden bg-[#282c34] shadow-md">
                    <div className="bg-gray-800 text-white text-xs px-3 py-1 rounded-t-md flex justify-between items-center">
                        <span>{match[1]}</span>
                        <button
                            onClick={() => navigator.clipboard.writeText(String(children))}
                            className="text-xs inline-flex items-center gap-1 opacity-60 hover:opacity-100 transition"
                        >
                            <Copy className="h-3 w-3" />
                            Copy
                        </button>
                    </div>
                    <SyntaxHighlighter
                        style={oneDark as any}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ margin: 0, padding: '1.25rem', backgroundColor: 'transparent' }}
                    >
                        {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                </div>
            ) : (
                <code className="bg-muted/60 px-1.5 py-1 rounded-md text-sm font-mono text-foreground" {...props}>
                    {children}
                </code>
            )
        },
        table: ({ node, ...props }: any) => <div className="my-6 overflow-x-auto"><table className="w-full text-sm border-collapse" {...props} /></div>,
        thead: ({ node, ...props }: any) => <thead className="border-b border-border/60" {...props} />,
        th: ({ node, ...props }: any) => <th className="px-4 py-3 text-left font-semibold text-foreground" {...props} />,
        tr: ({ node, ...props }: any) => <tr className="border-t border-border/40" {...props} />,
        td: ({ node, ...props }: any) => <td className="px-4 py-3" {...props} />,
        strong: ({ node, ...props }: any) => <strong className="font-semibold text-foreground" {...props} />,
        em: ({ node, ...props }: any) => <em className="italic" {...props} />,
        hr: ({ node, ...props }: any) => <hr className="my-8 border-border/40" {...props} />,
    }), []);

    return (
        <div className="font-inter text-foreground antialiased prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
});

FormattedAIResponse.displayName = 'FormattedAIResponse';

// Memoized Message Component
const MessageItem = React.memo(({
    message,
    onAddToNotes,
    onCopyMessage
}: {
    message: ChatMessage;
    onAddToNotes: (messageId: string) => void;
    onCopyMessage: (content: string) => void;
}) => {
    const formatTime = useCallback((date: Date) => {
        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }, []);

    return (
        <div
            className={cn(
                "flex gap-4 group",
                message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
        >
            {/* AI Avatar - only for AI messages */}
            {message.role === 'mentor' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 mt-1">
                    <GraduationCap className="h-4 w-4 text-primary-foreground" />
                </div>
            )}

            {/* Message Content */}
            <div className={cn(
                "flex flex-col max-w-[85%] sm:max-w-[70%]",
                message.role === 'user' ? 'items-end' : 'items-start'
            )}>
                {/* Message Bubble */}
                {message.role === 'user' ? (
                    /* User Message - Bubble Style */
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
                        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {message.content}
                        </div>
                    </div>
                ) : (
                    /* Mentor Message - Modern Typography with Inter Font */
                    <div className="w-full space-y-3">
                        <FormattedAIResponse content={message.content} />
                    </div>
                )}

                {/* Message Meta & Actions */}
                <div className={cn(
                    "flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}>
                    <span className="text-xs text-muted-foreground">
                        {formatTime(message.timestamp)}
                    </span>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => onCopyMessage(message.content)}
                        >
                            <Copy className="h-3 w-3" />
                        </Button>

                        {message.canAddToNotes && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => onAddToNotes(message.id)}
                                disabled={message.isMarkedForNotes}
                            >
                                {message.isMarkedForNotes ? (
                                    <BookmarkCheck className="h-3 w-3 text-green-500" />
                                ) : (
                                    <BookmarkPlus className="h-3 w-3" />
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* User Avatar - only for user messages */}
            {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                </div>
            )}
        </div>
    );
});

MessageItem.displayName = 'MessageItem';

export function ChatDebatePanel({
    selectedTopic,
    messages,
    onSendMessage,
    onAddToNotes,
    sending = false
}: ChatDebatePanelProps) {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Memoized scroll function để tránh re-create
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // Optimize scroll effect - chỉ scroll khi messages thực sự thay đổi
    useEffect(() => {
        const timeoutId = setTimeout(scrollToBottom, 100);
        return () => clearTimeout(timeoutId);
    }, [messages.length, scrollToBottom]); // Chỉ theo dõi length, không phải toàn bộ array

    // Memoized handlers
    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || !selectedTopic || sending) return;

        onSendMessage(inputValue.trim());
        setInputValue('');
    }, [inputValue, selectedTopic, sending, onSendMessage]);

    const handleCopyMessage = useCallback((content: string) => {
        navigator.clipboard.writeText(content);
    }, []);

    // Memoized empty state
    const emptyState = useMemo(() => (
        <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-background to-muted/20 text-muted-foreground">
            <div className="text-center space-y-4 max-w-md">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Chọn chủ đề để bắt đầu</h3>
                <p className="text-sm leading-relaxed">
                    Tạo chủ đề mới hoặc chọn từ danh sách bên trái để bắt đầu cuộc đối thoại với AI Mentor
                </p>
            </div>
        </div>
    ), []);

    // Memoized quick suggestions
    const quickSuggestions = useMemo(() => {
        if (!selectedTopic) return null;

        return (
            <div className="flex flex-wrap gap-2 justify-center">
                <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => onSendMessage(`Giải thích cơ bản về ${selectedTopic.title}`)}
                >
                    Giải thích cơ bản
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => onSendMessage(`Ưu nhược điểm của ${selectedTopic.title} là gì?`)}
                >
                    Ưu nhược điểm
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => onSendMessage(`Ứng dụng thực tế của ${selectedTopic.title}`)}
                >
                    Ứng dụng thực tế
                </Button>
            </div>
        );
    }, [selectedTopic, onSendMessage]);

    if (!selectedTopic) {
        return emptyState;
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header - Clean minimal design */}
            <div className="flex items-center gap-3 p-6 bg-background/80 backdrop-blur-sm">
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-medium text-foreground truncate">{selectedTopic.title}</h2>
                    <p className="text-sm text-muted-foreground">
                        AI Mentor • {messages.length} tin nhắn
                    </p>
                </div>
            </div>

            {/* Messages Area - Clean, spacious */}
            <ScrollArea className="flex-1">
                <div className="px-4 py-6 space-y-8 max-w-4xl mx-auto">
                    {messages.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="bg-gradient-to-br from-muted/50 to-background rounded-2xl p-8 mx-auto max-w-md">
                                <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                                    <GraduationCap className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="font-medium mb-3 text-foreground">Bắt đầu cuộc đối thoại</h3>
                                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                                    Đặt câu hỏi về "{selectedTopic.title}" để AI Mentor thách thức suy nghĩ của bạn
                                </p>
                                {quickSuggestions}
                            </div>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <MessageItem
                                key={message.id}
                                message={message}
                                onAddToNotes={onAddToNotes}
                                onCopyMessage={handleCopyMessage}
                            />
                        ))
                    )}

                    {/* Typing Indicator - Modern style */}
                    {sending && (
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                                <GraduationCap className="h-4 w-4 text-primary-foreground" />
                            </div>
                            <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3">
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input Area - Modern, minimal */}
            <div className="p-4 bg-background/80 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto">
                    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
                        <div className="flex-1 relative">
                            <Input
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Gửi tin nhắn..."
                                className="rounded-2xl bg-muted/50 border-0 focus:ring-2 focus:ring-primary/20 focus:bg-background pr-12 py-3 text-sm resize-none min-h-[44px]"
                                disabled={sending}
                            />
                        </div>
                        <Button
                            type="submit"
                            size="icon"
                            className="rounded-full h-11 w-11 shadow-sm"
                            disabled={!inputValue.trim() || sending}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        AI Mentor có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
                    </p>
                </div>
            </div>
        </div>
    );
} 
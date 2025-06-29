'use client';

import { useState, useRef, useEffect } from 'react';
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

interface ChatDebatePanelProps {
    selectedTopic: LearningTopic | null;
    messages: ChatMessage[];
    onSendMessage: (content: string) => void;
    onAddToNotes: (messageId: string) => void;
}

export function ChatDebatePanel({
    selectedTopic,
    messages,
    onSendMessage,
    onAddToNotes
}: ChatDebatePanelProps) {
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || !selectedTopic) return;

        onSendMessage(inputValue.trim());
        setInputValue('');
        setIsTyping(true);

        // Simulate typing indicator
        setTimeout(() => setIsTyping(false), 1500);
    };

    const handleCopyMessage = (content: string) => {
        navigator.clipboard.writeText(content);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!selectedTopic) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-background text-muted-foreground">
                <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">Chọn chủ đề để bắt đầu</h3>
                <p className="text-center max-w-md">
                    Tạo chủ đề mới hoặc chọn từ danh sách bên trái để bắt đầu cuộc đối thoại phản biện với AI Mentor
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
                <span className="text-2xl">{selectedTopic.icon}</span>
                <div className="flex-1">
                    <h2 className="text-lg font-semibold">{selectedTopic.title}</h2>
                    <p className="text-sm text-muted-foreground">
                        AI Mentor - Cuộc đối thoại phản biện
                    </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                    {messages.length} tin nhắn
                </Badge>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4">
                <div className="py-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="bg-card rounded-lg p-6 border border-dashed border-border">
                                <GraduationCap className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                                <h3 className="font-medium mb-2">Bắt đầu cuộc đối thoại</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Đặt câu hỏi về "{selectedTopic.title}" để AI Mentor thách thức suy nghĩ của bạn
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onSendMessage(`Giải thích cơ bản về ${selectedTopic.title}`)}
                                    >
                                        Giải thích cơ bản
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onSendMessage(`Ưu nhược điểm của ${selectedTopic.title} là gì?`)}
                                    >
                                        Ưu nhược điểm
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onSendMessage(`Ứng dụng thực tế của ${selectedTopic.title}`)}
                                    >
                                        Ứng dụng thực tế
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex gap-3",
                                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                )}
                            >
                                {/* Avatar */}
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                    message.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary text-secondary-foreground'
                                )}>
                                    {message.role === 'user' ? (
                                        <User className="h-4 w-4" />
                                    ) : (
                                        <GraduationCap className="h-4 w-4" />
                                    )}
                                </div>

                                {/* Message Content */}
                                <div className={cn(
                                    "flex-1 max-w-[70%] space-y-2",
                                    message.role === 'user' ? 'items-end' : 'items-start'
                                )}>
                                    {/* Role Label & Time */}
                                    <div className={cn(
                                        "flex items-center gap-2 text-xs text-muted-foreground",
                                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                    )}>
                                        <span className="font-medium">
                                            {message.role === 'user' ? '💬 Bạn' : '🎓 AI Mentor'}
                                        </span>
                                        <span>{formatTime(message.timestamp)}</span>
                                    </div>

                                    {/* Message Bubble */}
                                    <div className={cn(
                                        "rounded-lg p-3 prose prose-sm max-w-none",
                                        message.role === 'user'
                                            ? 'bg-primary text-primary-foreground ml-8'
                                            : 'bg-card border border-border mr-8'
                                    )}>
                                        <div className="whitespace-pre-wrap break-words">
                                            {message.content}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className={cn(
                                        "flex items-center gap-2",
                                        message.role === 'user' ? 'justify-end' : 'justify-start'
                                    )}>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={() => handleCopyMessage(message.content)}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>

                                        {message.canAddToNotes && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => onAddToNotes(message.id)}
                                                disabled={message.isMarkedForNotes}
                                            >
                                                {message.isMarkedForNotes ? (
                                                    <BookmarkCheck className="h-3 w-3 text-status-success" />
                                                ) : (
                                                    <BookmarkPlus className="h-3 w-3" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Typing Indicator */}
                    {isTyping && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                                <GraduationCap className="h-4 w-4" />
                            </div>
                            <div className="bg-card border border-border rounded-lg p-3 mr-8">
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border bg-card">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={`Đặt câu hỏi về ${selectedTopic.title}...`}
                        className="flex-1"
                        disabled={isTyping}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!inputValue.trim() || isTyping}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-2">
                    AI Mentor sẽ thách thức quan điểm của bạn để kích thích tư duy phản biện
                </p>
            </div>
        </div>
    );
} 
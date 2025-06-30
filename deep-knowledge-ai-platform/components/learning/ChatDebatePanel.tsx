'use client';

import { useState, useRef, useEffect } from 'react';
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

interface ChatDebatePanelProps {
    selectedTopic: LearningTopic | null;
    messages: ChatMessage[];
    onSendMessage: (content: string) => void;
    onAddToNotes: (messageId: string) => void;
}

// Component để format AI response với markdown-style formatting
function FormattedAIResponse({ content }: { content: string }) {
    // Simple approach: preserve line breaks và detect tables
    const formatContent = (text: string) => {
        const lines = text.split('\n');
        const formatted: React.ReactElement[] = [];
        let currentBlock: string[] = [];
        let isInTable = false;
        let tableRows: string[] = [];
        let listItems: string[] = [];
        let isInList = false;

        const flushBlock = () => {
            if (currentBlock.length > 0) {
                const blockText = currentBlock.join('\n').trim();
                if (blockText) {
                    // Check if it's a header
                    if (blockText.startsWith('###') || (blockText.startsWith('**') && blockText.endsWith('**'))) {
                        const headerText = blockText.replace(/^###\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '');
                        formatted.push(
                            <h3 key={formatted.length} className="text-[17px] font-semibold mb-4 mt-6 text-primary tracking-[-0.022em] leading-[1.4]">
                                {formatInlineText(headerText)}
                            </h3>
                        );
                    } else {
                        // Regular text block - preserve line breaks with modern typography
                        formatted.push(
                            <div key={formatted.length} className="mb-5 text-[15px] leading-[1.7] tracking-[-0.011em] text-foreground/90 whitespace-pre-line">
                                {formatInlineText(blockText)}
                            </div>
                        );
                    }
                }
                currentBlock = [];
            }
        };

        const flushTable = () => {
            if (tableRows.length > 0) {
                // Parse table rows
                const rows = tableRows.map(row =>
                    row.split('|').map(cell => cell.trim()).filter(cell => cell)
                );

                if (rows.length > 0) {
                    formatted.push(
                        <div key={formatted.length} className="mb-6 overflow-x-auto">
                            <table className="min-w-full border border-border rounded-lg text-[14px]">
                                <thead>
                                    <tr className="bg-muted/50">
                                        {rows[0].map((header, index) => (
                                            <th key={index} className="border border-border px-4 py-3 text-left font-semibold text-foreground/95 tracking-[-0.011em]">
                                                {formatInlineText(header)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.slice(1)
                                        .filter(row => !row.every(cell => cell.match(/^[-\s:]*$/))) // Filter separator lines
                                        .map((row, rowIndex) => (
                                            <tr key={rowIndex} className="border-t border-border hover:bg-muted/20 transition-colors">
                                                {row.map((cell, cellIndex) => (
                                                    <td key={cellIndex} className="border border-border px-4 py-3 text-foreground/85 leading-[1.6]">
                                                        {formatInlineText(cell)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    );
                }
                tableRows = [];
                isInTable = false;
            }
        };

        const flushList = () => {
            if (listItems.length > 0) {
                formatted.push(
                    <ul key={formatted.length} className="mb-5 ml-0 space-y-2">
                        {listItems.map((item, index) => (
                            <li key={index} className="flex items-start text-[15px] leading-[1.7] tracking-[-0.011em] text-foreground/90">
                                <span className="text-primary mr-3 font-medium text-[12px] leading-[1.7] mt-[2px]">•</span>
                                <span className="flex-1">{formatInlineText(item)}</span>
                            </li>
                        ))}
                    </ul>
                );
                listItems = [];
                isInList = false;
            }
        };

        lines.forEach((line) => {
            // Table detection (contains |)
            if (line.includes('|') && line.trim().length > 0) {
                if (!isInTable) {
                    flushBlock();
                    isInTable = true;
                }
                tableRows.push(line);
                return;
            }

            // End table if we were in one
            if (isInTable) {
                flushTable();
            }

            const trimmedLine = line.trim();

            // Skip horizontal rules (--- lines)
            if (trimmedLine.match(/^-{3,}$/)) {
                flushBlock();
                flushList();
                return;
            }

            // List item detection (* item or - item)
            if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                flushBlock();
                if (!isInList) {
                    isInList = true;
                }
                const itemText = trimmedLine.replace(/^[*-]\s*/, '');
                listItems.push(itemText);
                return;
            }

            // End list if we were in one
            if (isInList) {
                flushList();
            }

            // Empty line - end current block
            if (trimmedLine === '') {
                flushBlock();
                // Add spacing for empty lines
                if (formatted.length > 0) {
                    formatted.push(<div key={formatted.length} className="mb-2" />);
                }
                return;
            }

            // Add to current block
            currentBlock.push(line);
        });

        // Flush remaining content
        flushTable();
        flushList();
        flushBlock();

        return formatted;
    };

    // Format inline text với bold, italic, etc.
    const formatInlineText = (text: string) => {
        // Replace **text** với bold
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Replace *text* với italic  
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Replace `code` với inline code with better styling
        text = text.replace(/`(.*?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded-md text-[13px] font-mono text-foreground/95 border border-border/50">$1</code>');

        return <span dangerouslySetInnerHTML={{ __html: text }} />;
    };

    return (
        <div className="space-y-1 font-inter">
            {formatContent(content)}
        </div>
    );
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
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header - Clean minimal design */}
            <div className="flex items-center gap-3 p-6 bg-background/80 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground">
                    <span className="text-lg">{selectedTopic.icon}</span>
                </div>
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
                            </div>
                        </div>
                    ) : (
                        messages.map((message, index) => (
                            <div
                                key={message.id}
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
                                            <div className="font-inter text-foreground antialiased">
                                                <FormattedAIResponse content={message.content} />
                                            </div>
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
                                                onClick={() => handleCopyMessage(message.content)}
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
                        ))
                    )}

                    {/* Typing Indicator - Modern style */}
                    {isTyping && (
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
                                placeholder={`Gửi tin nhắn...`}
                                className="rounded-2xl bg-muted/50 border-0 focus:ring-2 focus:ring-primary/20 focus:bg-background pr-12 py-3 text-sm resize-none min-h-[44px]"
                                disabled={isTyping}
                            />
                        </div>
                        <Button
                            type="submit"
                            size="icon"
                            className="rounded-full h-11 w-11 shadow-sm"
                            disabled={!inputValue.trim() || isTyping}
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
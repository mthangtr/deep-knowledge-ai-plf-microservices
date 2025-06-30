'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LearningTopic, Note } from '@/types';
import {
    Brain,
    NotebookPen,
    Copy,
    Download,
    Plus,
    MessageSquareQuote,
    Edit3,
    Trash2,
    ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

interface NotesPanelProps {
    notes: Note[];
    selectedTopic: LearningTopic | null;
    onShowMindMap: () => void;
    onAddNote: (content: string) => void;
}

export function NotesPanel({
    notes,
    selectedTopic,
    onShowMindMap,
    onAddNote
}: NotesPanelProps) {
    const [newNoteContent, setNewNoteContent] = useState('');
    const [isAddingNote, setIsAddingNote] = useState(false);

    const extractedNotes = notes.filter(note => note.type === 'extracted');
    const manualNotes = notes.filter(note => note.type === 'manual');

    const handleAddNote = () => {
        if (!newNoteContent.trim()) return;
        onAddNote(newNoteContent.trim());
        setNewNoteContent('');
        setIsAddingNote(false);
    };

    const handleCancelAddNote = () => {
        setIsAddingNote(false);
        setNewNoteContent('');
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            if (newNoteContent.trim()) {
                handleAddNote();
            }
        }
    };

    const handleCopyAllNotes = () => {
        const allNotesText = notes
            .map(note => `${note.type === 'extracted' ? '[Trích xuất]' : '[Ghi chú]'} ${note.content}`)
            .join('\n\n');
        navigator.clipboard.writeText(allNotesText);
    };

    const handleExportMarkdown = () => {
        if (!selectedTopic) return;

        const markdown = [
            `# ${selectedTopic.title}`,
            '',
            '## Ghi chú trích xuất từ cuộc đối thoại',
            ...extractedNotes.map(note => `- ${note.content}`),
            '',
            '## Ghi chú cá nhân',
            ...manualNotes.map(note => `- ${note.content}`),
            '',
            `_Xuất vào ${new Date().toLocaleDateString('vi-VN')}_`
        ].join('\n');

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTopic.title.replace(/[^a-zA-Z0-9]/g, '_')}_notes.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderNotesList = () => (
        <div className="space-y-6">
            {/* Extracted Notes */}
            {extractedNotes.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <MessageSquareQuote className="h-4 w-4 text-status-info" />
                        <h3 className="font-medium text-sm">Trích xuất từ đối thoại</h3>
                        <Badge variant="secondary" className="text-xs">
                            {extractedNotes.length}
                        </Badge>
                    </div>
                    <div className="space-y-3">
                        {extractedNotes.map((note) => (
                            <div
                                key={note.id}
                                className="p-3 bg-status-info/10 border border-status-info rounded-lg"
                            >
                                <div className="text-sm leading-relaxed mb-2">
                                    {note.content}
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Trích xuất</span>
                                    <span>{formatTime(note.createdAt)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Manual Notes */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Edit3 className="h-4 w-4 text-status-success" />
                    <h3 className="font-medium text-sm">Ghi chú cá nhân</h3>
                    <Badge variant="secondary" className="text-xs">
                        {manualNotes.length}
                    </Badge>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingNote(true)}
                    className="w-full mb-4 gap-2 border-dashed"
                >
                    <Plus className="h-4 w-4" />
                    Thêm ghi chú mới
                </Button>

                {/* Manual Notes List */}
                <div className="space-y-3">
                    {manualNotes.map((note) => (
                        <div
                            key={note.id}
                            className="p-3 bg-status-success/10 border border-status-success rounded-lg"
                        >
                            <div className="text-sm leading-relaxed mb-2">
                                {note.content}
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Ghi chú tay</span>
                                <span>{formatTime(note.createdAt)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Empty State */}
            {notes.length === 0 && (
                <div className="text-center py-8">
                    <NotebookPen className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <h3 className="font-medium mb-2">Chưa có ghi chú</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Bắt đầu cuộc đối thoại và đánh dấu các đoạn chat quan trọng
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddingNote(true)}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Tạo ghi chú đầu tiên
                    </Button>
                </div>
            )}
        </div>
    );

    if (isAddingNote) {
        return (
            <div className="flex flex-col h-full bg-card p-4">
                <div className='flex items-center justify-between mb-3'>
                    <div className="flex items-center gap-2">
                        <Edit3 className="h-4 w-4 text-status-success" />
                        <h3 className="font-medium text-sm">Ghi chú cá nhân</h3>
                    </div>
                    <div>
                        <Button variant="outline" size="sm" onClick={handleCancelAddNote} className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Quay lại
                        </Button>
                    </div>
                </div>
                <div className="flex-1 p-3 border border-dashed border-border rounded-lg">
                    <Textarea
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Viết ghi chú của bạn... (Ctrl+S để lưu)"
                        className="w-full h-full p-0 text-base resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                        autoFocus
                    />
                </div>
            </div>
        )
    }

    if (!selectedTopic) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-muted-foreground">
                <NotebookPen className="h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Ghi chú học tập</h3>
                <p className="text-center text-sm">
                    Chọn chủ đề để xem và quản lý ghi chú
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-card">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">Ghi chú</h2>
                    <Badge variant="outline" className="text-xs">
                        {notes.length}
                    </Badge>
                </div>

                {/* Mind Map Button */}
                <Button
                    onClick={onShowMindMap}
                    className="w-full gap-2 mb-3"
                    variant="secondary"
                >
                    <Brain className="h-4 w-4" />
                    Xem cây kiến thức
                </Button>

                {/* Actions */}
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyAllNotes}
                        disabled={notes.length === 0}
                        className="flex-1"
                    >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportMarkdown}
                        disabled={notes.length === 0}
                        className="flex-1"
                    >
                        <Download className="h-3 w-3 mr-1" />
                        Xuất
                    </Button>
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                <Tabs defaultValue="section_notes" className="p-4 h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="all_topic_notes">Tất cả</TabsTrigger>
                        <TabsTrigger value="section_notes">Notes của phần học</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all_topic_notes" className="flex-1">
                        {/* TODO: Logic to show all topic notes will be implemented here */}
                        {renderNotesList()}
                    </TabsContent>
                    <TabsContent value="section_notes" className="flex-1">
                        {renderNotesList()}
                    </TabsContent>
                </Tabs>
            </ScrollArea>
        </div>
    );
} 
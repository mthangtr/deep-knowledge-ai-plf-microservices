'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LearningTopic } from '@/types';
import { LearningNote } from '@/types/database';
import {
    Brain,
    NotebookPen,
    Copy,
    Download,
    Plus,
    MessageSquareQuote,
    Edit3,
    Trash2,
    ArrowLeft,
    Save,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { useLearningNotes } from '@/hooks/use-learning-notes';

interface NotesPanelProps {
    notes: LearningNote[];
    selectedTopic: LearningTopic | null;
    selectedNodeId?: string;
    onShowMindMap: () => void;
    onNoteCreated?: (newNote: LearningNote) => void;
    onNoteUpdated?: (updatedNote: LearningNote) => void;
}

export function NotesPanel({
    notes,
    selectedTopic,
    selectedNodeId,
    onShowMindMap,
    onNoteCreated,
    onNoteUpdated
}: NotesPanelProps) {
    const [localNotes, setLocalNotes] = useState(notes);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [isAddingOrEditing, setIsAddingOrEditing] = useState(false);
    const [editingNote, setEditingNote] = useState<LearningNote | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedContentRef = useRef<string>('');

    // Internal hook for API calls
    const {
        createNote,
        updateNote,
        saving: hookSaving
    } = useLearningNotes(selectedTopic?.id, selectedNodeId);

    // Sync local state with props
    useEffect(() => {
        setLocalNotes(notes);
    }, [notes]);

    const handleSave = useCallback(async (contentToSave: string) => {
        setIsSaving(true);
        try {
            if (editingNote) {
                const updatedNote = await updateNote(editingNote.id, contentToSave);
                if (updatedNote) {
                    setLocalNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
                    lastSavedContentRef.current = contentToSave;
                    setHasUnsavedChanges(false);
                    onNoteUpdated?.(updatedNote);
                }
            } else {
                const newNote = await createNote({ content: contentToSave, note_type: 'manual' });
                if (newNote) {
                    setLocalNotes(prev => [...prev, newNote]);
                    setEditingNote(newNote); // Switch to editing mode for the new note
                    lastSavedContentRef.current = contentToSave;
                    setHasUnsavedChanges(false);
                    onNoteCreated?.(newNote);
                }
            }
        } catch (error) {
            console.error('Error saving note:', error);
        } finally {
            setIsSaving(false);
        }
    }, [editingNote, createNote, updateNote, onNoteCreated, onNoteUpdated]);

    const debouncedSave = useCallback((content: string) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            if (content.trim() && content.trim() !== lastSavedContentRef.current) {
                handleSave(content.trim());
            }
        }, 2000);
    }, [handleSave]);

    const handleContentChange = (content: string) => {
        setNewNoteContent(content);
        setHasUnsavedChanges(content !== lastSavedContentRef.current);
        debouncedSave(content);
    };

    const handleManualSave = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        if (newNoteContent.trim() && newNoteContent.trim() !== lastSavedContentRef.current) {
            handleSave(newNoteContent.trim());
        }
    }, [newNoteContent, handleSave]);

    const handleGoBack = () => {
        if (hasUnsavedChanges && newNoteContent.trim()) {
            handleManualSave();
        }
        setIsAddingOrEditing(false);
        setEditingNote(null);
        setNewNoteContent('');
        setHasUnsavedChanges(false);
    };

    const handleEditNote = (note: LearningNote) => {
        setEditingNote(note);
        setNewNoteContent(note.content);
        lastSavedContentRef.current = note.content;
        setIsAddingOrEditing(true);
        setHasUnsavedChanges(false);
    };

    const handleAddNewNote = () => {
        setEditingNote(null);
        setNewNoteContent('');
        lastSavedContentRef.current = '';
        setIsAddingOrEditing(true);
        setHasUnsavedChanges(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            handleManualSave();
        }
    };

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, []);

    const extractedNotes = localNotes.filter(note => note.note_type === 'extracted_from_chat');
    const manualNotes = localNotes.filter(note => note.note_type === 'manual');

    const handleCopyAllNotes = () => {
        const allNotesText = localNotes
            .map(note => `${note.note_type === 'extracted_from_chat' ? '[Trích xuất]' : '[Ghi chú]'} ${note.content}`)
            .join('\n\n');
        navigator.clipboard.writeText(allNotesText);
    };

    const handleExportMarkdown = () => {
        if (!selectedTopic) return;
        const markdown = [
            `# ${selectedTopic.title}`, '',
            '## Ghi chú trích xuất từ cuộc đối thoại', ...extractedNotes.map(note => `- ${note.content}`), '',
            '## Ghi chú cá nhân', ...manualNotes.map(note => `- ${note.content}`), '',
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

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const renderNotesList = () => (
        <div className="space-y-6">
            {extractedNotes.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <MessageSquareQuote className="h-4 w-4 text-status-info" />
                        <h3 className="font-medium text-sm">Trích xuất từ đối thoại</h3>
                        <Badge variant="secondary" className="text-xs">{extractedNotes.length}</Badge>
                    </div>
                    <div className="space-y-3">
                        {extractedNotes.map((note) => (
                            <div key={note.id} className="p-3 bg-status-info/10 border border-status-info rounded-lg">
                                <div className="text-sm leading-relaxed mb-2">{note.content}</div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Trích xuất</span>
                                    <span>{formatTime(note.created_at)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Edit3 className="h-4 w-4 text-status-success" />
                    <h3 className="font-medium text-sm">Ghi chú cá nhân</h3>
                    <Badge variant="secondary" className="text-xs">{manualNotes.length}</Badge>
                </div>
                <Button variant="outline" size="sm" onClick={handleAddNewNote} className="w-full mb-4 gap-2 border-dashed">
                    <Plus className="h-4 w-4" />
                    Thêm ghi chú mới
                </Button>
                <div className="space-y-3">
                    {manualNotes.map((note) => (
                        <div key={note.id} className="group p-3 bg-status-success/10 border border-status-success rounded-lg hover:bg-status-success/20 transition-colors cursor-pointer" onClick={() => handleEditNote(note)}>
                            <div className="text-sm leading-relaxed mb-2">{note.content}</div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Ghi chú tay</span>
                                <div className="flex items-center gap-2">
                                    <span>{formatTime(note.created_at)}</span>
                                    <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {localNotes.length === 0 && (
                <div className="text-center py-8">
                    <NotebookPen className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <h3 className="font-medium mb-2">Chưa có ghi chú</h3>
                    <p className="text-sm text-muted-foreground mb-4">Bắt đầu cuộc đối thoại và đánh dấu các đoạn chat quan trọng</p>
                    <Button variant="outline" size="sm" onClick={handleAddNewNote} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Tạo ghi chú đầu tiên
                    </Button>
                </div>
            )}
        </div>
    );

    if (isAddingOrEditing) {
        const actualIsSaving = isSaving || hookSaving;
        return (
            <div className="flex flex-col h-full bg-card p-4">
                <div className='flex items-center justify-between mb-3'>
                    <div className="flex items-center gap-2">
                        <Edit3 className="h-4 w-4 text-status-success" />
                        <h3 className="font-medium text-sm">{editingNote ? 'Chỉnh sửa ghi chú' : 'Ghi chú cá nhân'}</h3>
                        {hasUnsavedChanges && !actualIsSaving && <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">Chưa lưu</Badge>}
                        {actualIsSaving && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Đang lưu...
                            </div>
                        )}
                        {!hasUnsavedChanges && !actualIsSaving && editingNote && <Badge variant="outline" className="text-xs text-green-600 border-green-600">Đã lưu</Badge>}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleGoBack} className="gap-2" disabled={actualIsSaving}>
                            <ArrowLeft className="h-4 w-4" />
                            Quay lại
                        </Button>
                    </div>
                </div>
                <div className="flex-1 p-3 border border-dashed border-border rounded-lg">
                    <Textarea
                        value={newNoteContent}
                        onChange={(e) => handleContentChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={editingNote ? "Chỉnh sửa ghi chú của bạn..." : "Viết ghi chú của bạn..."}
                        className="w-full h-full p-0 text-base resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                        autoFocus
                        disabled={actualIsSaving}
                    />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                    Tự động lưu sau 2 giây • Ctrl+S để lưu ngay
                </div>
            </div>
        )
    }

    if (!selectedTopic) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-muted-foreground">
                <NotebookPen className="h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Ghi chú học tập</h3>
                <p className="text-center text-sm">Chọn chủ đề để xem và quản lý ghi chú</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-card">
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">Ghi chú</h2>
                    <Badge variant="outline" className="text-xs">{localNotes.length}</Badge>
                </div>
                <Button onClick={onShowMindMap} className="w-full gap-2 mb-3" variant="secondary">
                    <Brain className="h-4 w-4" />
                    Xem cây kiến thức
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyAllNotes} disabled={localNotes.length === 0} className="flex-1">
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportMarkdown} disabled={localNotes.length === 0} className="flex-1">
                        <Download className="h-3 w-3 mr-1" />
                        Xuất
                    </Button>
                </div>
            </div>
            <ScrollArea className="flex-1">
                <Tabs defaultValue="section_notes" className="p-4 h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="all_topic_notes">Tất cả</TabsTrigger>
                        <TabsTrigger value="section_notes">Notes của phần học</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all_topic_notes" className="flex-1">
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
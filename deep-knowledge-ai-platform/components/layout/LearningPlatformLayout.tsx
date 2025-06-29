'use client';

import { useState, useEffect } from 'react';
import { TopicSidebar } from '../learning/TopicSidebar';
import { ChatDebatePanel } from '../learning/ChatDebatePanel';
import { NotesPanel } from '../learning/NotesPanel';
import { MindMapModal } from '../learning/MindMapModal';
import { TopicCreationInterface } from '../learning/TopicCreationInterface';
import { TreeView } from '../learning/TreeView';
import { useLearningTopics } from '@/hooks/use-learning-topics';
import { useLearningNodes } from '@/hooks/use-learning-nodes';
import { useLearningChat } from '@/hooks/use-learning-chat';
import { useLearningNotes } from '@/hooks/use-learning-notes';
import { learningService } from '@/lib/services/learning';
import { LearningTopic as DatabaseLearningTopic, TreeNode } from '@/types/database';
import { LearningTopic as UILearningTopic, MindMapNodeData } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TreePine, MessageSquare, BookOpen, Plus, Loader2 } from 'lucide-react';
import { clearAuthState, logAuthState } from '@/lib/debug-auth';

interface LearningPlatformLayoutProps {
    children?: React.ReactNode;
}

export function LearningPlatformLayout({ children }: LearningPlatformLayoutProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showMindMap, setShowMindMap] = useState(false);
    const [showCreationInterface, setShowCreationInterface] = useState(true);
    const [selectedNodeForChat, setSelectedNodeForChat] = useState<TreeNode | null>(null);

    // Use custom hooks for backend integration
    const {
        topics,
        loading: topicsLoading,
        error: topicsError,
        selectedTopic,
        createTopic,
        selectTopic,
        clearError: clearTopicsError
    } = useLearningTopics();

    const {
        nodes,
        loading: nodesLoading,
        error: nodesError,
        selectedNode,
        selectNode,
        clearError: clearNodesError
    } = useLearningNodes(selectedTopic?.id);

    // Use chat hook based on current mode (topic-level or node-level)
    const {
        messages,
        loading: chatLoading,
        sending: chatSending,
        error: chatError,
        sendMessage,
        createTopicAutoPrompt,
        createNodeAutoPrompt,
        clearError: clearChatError,
        isTopicChat,
        isNodeChat
    } = useLearningChat(
        selectedTopic?.id,
        selectedNodeForChat?.id
    );

    // Use notes hook based on current mode  
    const {
        notes,
        loading: notesLoading,
        saving: notesSaving,
        error: notesError,
        createNote,
        updateNote,
        deleteNote,
        clearError: clearNotesError,
        isTopicNotes,
        isNodeNotes
    } = useLearningNotes(
        selectedTopic?.id,
        selectedNodeForChat?.id
    );

    // Debug: Log topics data
    useEffect(() => {
        console.log('🔍 [TOPICS DEBUG] Topics state:', {
            topicsCount: topics.length,
            topics: topics.map(t => ({ id: t.id, title: t.title })),
            loading: topicsLoading,
            error: topicsError
        });
    }, [topics, topicsLoading, topicsError]);

    // Convert database topics to UI format for sidebar
    const formattedTopics = topics.map(topic => ({
        id: topic.id,
        title: topic.title,
        icon: '📚',
        createdAt: new Date(topic.created_at),
        updatedAt: new Date(topic.updated_at),
        messageCount: topic.completed_nodes || 0
    }));

    // Debug: Log formatted topics
    useEffect(() => {
        console.log('🔍 [UI DEBUG] Formatted topics:', {
            formattedTopicsCount: formattedTopics.length,
            formattedTopics: formattedTopics.map(t => ({ id: t.id, title: t.title }))
        });
    }, [formattedTopics]);

    // Expose debug utilities to window for easy access
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).debugAuth = {
                logAuthState,
                clearAuthState,
                logTopics: () => console.log('Topics:', topics),
                logFormattedTopics: () => console.log('Formatted Topics:', formattedTopics)
            };
        }
    }, [topics, formattedTopics]);

    // Convert database messages to UI format for chat
    const formattedMessages = messages.map(msg => ({
        id: msg.id,
        topicId: msg.topic_id,
        nodeId: msg.node_id || selectedTopic?.id || '',
        role: msg.is_ai_response ? 'mentor' as const : 'user' as const,
        content: msg.message,
        timestamp: new Date(msg.created_at),
        canAddToNotes: true
    }));

    // Convert database notes to UI format for notes panel
    const formattedNotes = notes.map(note => ({
        id: note.id,
        topicId: note.topic_id,
        nodeId: note.node_id || selectedTopic?.id || '',
        content: note.content,
        type: note.note_type === 'manual' ? 'manual' as const : 'extracted' as const,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at)
    }));

    // Convert nodes to mindmap data
    const mindMapData: MindMapNodeData[] = nodes.map(node => ({
        id: node.id,
        title: node.title,
        description: node.description,
        prompt_sample: node.prompt_sample || undefined,
        is_chat_enabled: node.is_chat_enabled,
        level: node.level,
        requires: node.requires,
        next: node.next
    }));

    const handleTopicSelect = async (topic: UILearningTopic) => {
        const dbTopic = topics.find(t => t.id === topic.id);
        if (dbTopic) {
            selectTopic(dbTopic);
            setSelectedNodeForChat(null); // Reset to topic-level chat
            setShowCreationInterface(false);

            // Auto tạo topic-level chat chỉ khi chưa có messages
            setTimeout(async () => {
                if (messages.length === 0) {
                    try {
                        const response = await createTopicAutoPrompt({
                            topic_id: dbTopic.id,
                            topic_title: dbTopic.title,
                            topic_description: dbTopic.description,
                        });

                        // Log response để debug
                        if (response?.skipped) {
                            console.log('Topic auto-prompt skipped - already has chat history');
                        } else if (response) {
                            console.log('Topic auto-prompt created successfully');
                        }
                    } catch (error) {
                        console.error('Lỗi tạo topic auto prompt:', error);
                    }
                }
            }, 100);
        }
    };

    const handleNewTopic = () => {
        setShowCreationInterface(true);
        selectTopic(null);
        setSelectedNodeForChat(null);
    };

    const handleTopicCreated = async (newTopic: DatabaseLearningTopic) => {
        // Auto select topic mới và tạo topic-level chat
        selectTopic(newTopic);
        setShowCreationInterface(false);
        setSelectedNodeForChat(null);

        // Auto tạo topic-level chat cho topic mới (guaranteed chưa có chat)
        setTimeout(async () => {
            try {
                const response = await createTopicAutoPrompt({
                    topic_id: newTopic.id,
                    topic_title: newTopic.title,
                    topic_description: newTopic.description,
                });

                if (response?.skipped) {
                    console.log('New topic auto-prompt skipped - unexpected!');
                } else if (response) {
                    console.log('New topic auto-prompt created successfully');
                }
            } catch (error) {
                console.error('Lỗi tạo topic auto prompt:', error);
            }
        }, 100);
    };

    const handleTopicCreatedFromInterface = async (topicId: string) => {
        // Tìm topic từ topics list (đã được refresh)
        const newTopic = topics.find(t => t.id === topicId);
        if (newTopic) {
            await handleTopicCreated(newTopic);
        }
    };

    const handleNodeSelect = async (node: MindMapNodeData) => {
        const dbNode = nodes.find(n => n.id === node.id);
        if (dbNode && selectedTopic) {
            setSelectedNodeForChat(dbNode); // Switch to node-level chat
            setShowMindMap(false); // Close mind map modal

            // Tự động gửi prompt_sample nếu node có chat enabled
            setTimeout(async () => {
                try {
                    if (dbNode.is_chat_enabled) {
                        const response = await createNodeAutoPrompt({
                            topic_id: selectedTopic.id,
                            node_id: node.id,
                            node_title: node.title,
                            node_description: node.description,
                            prompt_sample: dbNode.prompt_sample, // Use prompt_sample from node
                        });

                        // Log response để debug
                        if (response?.skipped) {
                            console.log('Node prompt skipped - already has chat history');
                        } else if (response) {
                            console.log('Node prompt sent successfully:', dbNode.prompt_sample);
                        }
                    } else {
                        console.log('Node chat disabled, showing read-only view');
                    }
                } catch (error) {
                    console.error('Lỗi gửi node prompt:', error);
                }
            }, 100);
        }
    };

    const handleBackToTopicChat = () => {
        setSelectedNodeForChat(null); // Switch back to topic-level chat
    };

    const handleSendMessage = async (content: string) => {
        if (!selectedTopic) return;
        await sendMessage({ message: content });
    };

    const handleAddNote = async (content: string) => {
        if (!selectedTopic) return;
        await createNote({
            content,
            note_type: 'manual'
        });
    };

    const handleAddToNotes = async (messageId: string) => {
        const message = messages.find(m => m.id === messageId);
        if (message && selectedTopic) {
            await createNote({
                content: message.message,
                note_type: 'extracted_from_chat',
                source_chat_id: messageId
            });
        }
    };

    const renderMainContent = () => {
        if (showCreationInterface) {
            return (
                <TopicCreationInterface
                    onNodeSelect={handleNodeSelect}
                    onTopicCreated={handleTopicCreatedFromInterface}
                    className="h-full"
                />
            );
        }

        if (!selectedTopic) {
            return (
                <div className="h-full flex items-center justify-center p-8">
                    <Card className="max-w-md">
                        <CardHeader className="text-center">
                            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <CardTitle>Chọn chủ đề học tập</CardTitle>
                            <CardDescription>
                                Vui lòng chọn một chủ đề từ sidebar để bắt đầu học
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            );
        }

        // Hiển thị Chat Panel cho topic hoặc node
        const currentChatTitle = selectedNodeForChat
            ? `${selectedTopic.title} > ${selectedNodeForChat.title}`
            : selectedTopic.title;

        const currentChatIcon = selectedNodeForChat ? '🧠' : '📚';

        return (
            <ChatDebatePanel
                selectedTopic={{
                    id: selectedNodeForChat?.id || selectedTopic.id,
                    title: currentChatTitle,
                    icon: currentChatIcon,
                    createdAt: new Date(selectedNodeForChat?.created_at || selectedTopic.created_at),
                    updatedAt: new Date(selectedNodeForChat?.updated_at || selectedTopic.updated_at),
                    messageCount: formattedMessages.length
                }}
                messages={formattedMessages}
                onSendMessage={handleSendMessage}
                onAddToNotes={handleAddToNotes}
            />
        );
    };

    return (
        <div className="flex h-screen">
            {/* Error Alerts */}
            {(topicsError || nodesError || chatError || notesError) && (
                <div className="absolute top-4 right-4 z-50 w-96">
                    {topicsError && (
                        <Alert variant="destructive" className="mb-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Topics: {topicsError}
                                <button onClick={clearTopicsError} className="ml-2 underline">
                                    Đóng
                                </button>
                            </AlertDescription>
                        </Alert>
                    )}
                    {nodesError && (
                        <Alert variant="destructive" className="mb-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Nodes: {nodesError}
                                <button onClick={clearNodesError} className="ml-2 underline">
                                    Đóng
                                </button>
                            </AlertDescription>
                        </Alert>
                    )}
                    {chatError && (
                        <Alert variant="destructive" className="mb-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Chat: {chatError}
                                <button onClick={clearChatError} className="ml-2 underline">
                                    Đóng
                                </button>
                            </AlertDescription>
                        </Alert>
                    )}
                    {notesError && (
                        <Alert variant="destructive" className="mb-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Notes: {notesError}
                                <button onClick={clearNotesError} className="ml-2 underline">
                                    Đóng
                                </button>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )}

            {/* Panel trái - Lịch sử chủ đề */}
            <div className={`
                transition-all duration-300 ease-in-out border-r border-border
                ${sidebarCollapsed ? 'w-16' : 'w-80'}
            `}>
                <TopicSidebar
                    topics={formattedTopics}
                    selectedTopic={selectedTopic ? {
                        id: selectedTopic.id,
                        title: selectedTopic.title,
                        icon: '📚',
                        createdAt: new Date(selectedTopic.created_at),
                        updatedAt: new Date(selectedTopic.updated_at),
                        messageCount: selectedTopic.completed_nodes || 0
                    } : null}
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                    onTopicSelect={handleTopicSelect}
                    onNewTopic={handleNewTopic}
                />
            </div>

            {/* Panel giữa - Main Content */}
            <div className="flex-1 min-w-0">
                {renderMainContent()}
            </div>

            {/* Panel phải - Notes (hiển thị khi có selected topic) */}
            {selectedTopic && (
                <div className="w-96 border-l border-border">
                    <NotesPanel
                        notes={formattedNotes}
                        selectedTopic={{
                            id: selectedNodeForChat?.id || selectedTopic.id,
                            title: selectedNodeForChat?.title || selectedTopic.title,
                            icon: selectedNodeForChat ? '🧠' : '📚',
                            createdAt: new Date(selectedNodeForChat?.created_at || selectedTopic.created_at),
                            updatedAt: new Date(selectedNodeForChat?.updated_at || selectedTopic.updated_at),
                            messageCount: formattedMessages.length
                        }}
                        onShowMindMap={() => setShowMindMap(true)}
                        onAddNote={handleAddNote}
                    />
                </div>
            )}

            {/* Mind Map Modal */}
            {showMindMap && selectedTopic && (
                <MindMapModal
                    isOpen={showMindMap}
                    onClose={() => setShowMindMap(false)}
                    data={mindMapData}
                    topicTitle={selectedTopic.title}
                    onNodeSelect={handleNodeSelect}
                />
            )}

            {children}
        </div>
    );
} 
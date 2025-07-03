'use client';

import { useState } from 'react';
import { TopicSidebar } from '../learning/TopicSidebar';
import { ChatDebatePanel } from '../learning/ChatDebatePanel';
import { NotesPanel } from '../learning/NotesPanel';
import { TopicCreationInterface } from '../learning/TopicCreationInterface';
import { useLearningTopics } from '@/hooks/use-learning-topics';
import { useLearningNodes } from '@/hooks/use-learning-nodes';
import { useLearningNotes } from '@/hooks/use-learning-notes';
import { LearningTopic as DatabaseLearningTopic, TreeNode, LearningNote } from '@/types/database';
import { LearningTopic as UILearningTopic, MindMapNodeData } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, BookOpen } from 'lucide-react';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"

interface LearningPlatformLayoutProps {
    children?: React.ReactNode;
}

export function LearningPlatformLayout({ children }: LearningPlatformLayoutProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showMindMap, setShowMindMap] = useState(false);
    const [showCreationInterface, setShowCreationInterface] = useState(true);
    const [selectedNodeForChat, setSelectedNodeForChat] = useState<TreeNode | null>(null);

    // Hooks for data fetching
    const {
        topics,
        loading: topicsLoading,
        error: topicsError,
        selectedTopic,
        selectTopic,
        clearError: clearTopicsError
    } = useLearningTopics();

    const {
        nodes,
        loading: nodesLoading,
        error: nodesError,
        selectNode,
        clearError: clearNodesError
    } = useLearningNodes(selectedTopic?.id);

    const {
        notes,
        error: notesError,
        createNote,
        clearError: clearNotesError
    } = useLearningNotes(selectedNodeForChat?.id || selectedTopic?.id);

    // Format topics for sidebar
    const formattedTopics = topics.map(topic => ({
        id: topic.id,
        title: topic.title,
        icon: '📚',
        createdAt: new Date(topic.created_at),
        updatedAt: new Date(topic.updated_at),
        messageCount: 0 // Placeholder, will be removed or updated later
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

    const handleTopicSelect = (topic: UILearningTopic) => {
        const dbTopic = topics.find(t => t.id === topic.id);
        if (dbTopic) {
            selectTopic(dbTopic);
            setSelectedNodeForChat(null);
            setShowCreationInterface(false);
        }
    };

    const handleNewTopic = () => {
        setShowCreationInterface(true);
        selectTopic(null);
        setSelectedNodeForChat(null);
    };

    const handleTopicCreated = (newTopic: DatabaseLearningTopic) => {
        selectTopic(newTopic);
        setShowCreationInterface(false);
        setSelectedNodeForChat(null);
    };

    const handleTopicCreatedFromInterface = (topicId: string) => {
        const newTopic = topics.find(t => t.id === topicId);
        if (newTopic) {
            handleTopicCreated(newTopic);
        }
    };

    const handleNodeSelect = (node: MindMapNodeData) => {
        const dbNode = nodes.find(n => n.id === node.id);
        if (dbNode && selectedTopic) {
            selectNode(dbNode);
            setSelectedNodeForChat(dbNode);
            setShowMindMap(false);
        }
    };

    const handleAddToNotes = async (content: string) => {
        if (!selectedTopic) return;
        await createNote({ content });
    };

    const renderMainContent = () => {
        if (showCreationInterface) {
            return (
                <TopicCreationInterface
                    onTopicCreated={handleTopicCreatedFromInterface}
                    className="h-full"
                    onNodeSelect={handleNodeSelect}
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

        return (
            <ChatDebatePanel
                selectedTopic={{
                    id: selectedTopic.id,
                    title: selectedTopic.title,
                    icon: '📚',
                    createdAt: new Date(selectedTopic.created_at),
                    updatedAt: new Date(selectedTopic.updated_at),
                    messageCount: 0
                }}
                selectedNode={selectedNodeForChat ? {
                    id: selectedNodeForChat.id,
                    title: selectedNodeForChat.title
                } : null}
                onAddToNotes={handleAddToNotes}
            />
        );
    };

    return (
        <div className="flex h-screen">
            {(topicsError || nodesError || notesError) && (
                <div className="absolute top-4 right-4 z-50 w-96 space-y-2">
                    {topicsError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Topics: {topicsError}
                                <button onClick={clearTopicsError} className="ml-2 underline">Đóng</button>
                            </AlertDescription>
                        </Alert>
                    )}
                    {nodesError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Nodes: {nodesError}
                                <button onClick={clearNodesError} className="ml-2 underline">Đóng</button>
                            </AlertDescription>
                        </Alert>
                    )}
                    {notesError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Notes: {notesError}
                                <button onClick={clearNotesError} className="ml-2 underline">Đóng</button>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )}

            <div className={`transition-all duration-300 ease-in-out border-r border-border ${sidebarCollapsed ? 'w-16' : 'w-80'}`}>
                <TopicSidebar
                    topics={formattedTopics}
                    selectedTopic={selectedTopic ? {
                        id: selectedTopic.id,
                        title: selectedTopic.title,
                        icon: '📚',
                        createdAt: new Date(selectedTopic.created_at),
                        updatedAt: new Date(selectedTopic.updated_at),
                        messageCount: 0
                    } : null}
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                    onTopicSelect={handleTopicSelect}
                    onNewTopic={handleNewTopic}
                />
            </div>

            <div className="flex-1 flex min-w-0">
                <ResizablePanelGroup direction="horizontal" className="w-full" key={selectedTopic ? 'with-notes' : 'without-notes'}>
                    <ResizablePanel defaultSize={selectedTopic ? 65 : 100} minSize={30}>
                        <div className="h-full">
                            {renderMainContent()}
                        </div>
                    </ResizablePanel>

                    {selectedTopic && (
                        <>
                            <ResizableHandle withHandle />
                            <ResizablePanel defaultSize={35} minSize={20}>
                                <NotesPanel
                                    notes={notes as LearningNote[]}
                                    selectedTopic={{
                                        id: selectedNodeForChat?.id || selectedTopic.id,
                                        title: selectedNodeForChat?.title || selectedTopic.title,
                                        icon: selectedNodeForChat ? '🧠' : '📚',
                                        createdAt: new Date(selectedNodeForChat?.created_at || selectedTopic.created_at),
                                        updatedAt: new Date(selectedNodeForChat?.updated_at || selectedTopic.updated_at),
                                        messageCount: 0
                                    }}
                                    selectedNodeId={selectedNodeForChat?.id}
                                    onShowMindMap={() => setShowMindMap(true)}
                                />
                            </ResizablePanel>
                        </>
                    )}
                </ResizablePanelGroup>
            </div>
            {children}
        </div>
    );
} 
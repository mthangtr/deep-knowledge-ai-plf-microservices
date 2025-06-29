# Chat Interaction Flow

## 📋 Tổng quan

Luồng tương tác chat trong learning platform, bao gồm topic-level chat (chat chung với chủ đề) và node-level chat (chat riêng với từng node cụ thể).

## 🔄 Luồng chi tiết

### 1. Topic Creation & Auto-Select

- **Trigger**: Sau khi tạo topic thành công
- **Action**: `onTopicCreated(topicId)` → `selectTopic()` → `setSelectedNodeForChat(null)`
- **Result**: Hiển thị topic-level chat

```typescript
const handleTopicCreatedFromInterface = async (topicId: string) => {
  const newTopic = topics.find((t) => t.id === topicId);
  if (newTopic) {
    await handleTopicCreated(newTopic);
  }
};

const handleTopicCreated = async (newTopic: DatabaseLearningTopic) => {
  selectTopic(newTopic);
  setShowCreationInterface(false);
  setSelectedNodeForChat(null); // → Topic-level chat
};
```

### 2. Topic Selection from Sidebar

- **Trigger**: User click topic trong sidebar
- **Action**: `handleTopicSelect()` → Reset về topic-level chat
- **Result**: Luôn quay về chat chung của topic

```typescript
const handleTopicSelect = async (topic: UILearningTopic) => {
  const dbTopic = topics.find((t) => t.id === topic.id);
  if (dbTopic) {
    selectTopic(dbTopic);
    setSelectedNodeForChat(null); // Reset to topic-level chat
    setShowCreationInterface(false);
  }
};
```

### 3. Topic-Level Chat

- **State**: `selectedTopic` có giá trị, `selectedNodeForChat = null`
- **Chat ID**: `topicId` only, `nodeId = undefined`
- **Title**: Tên topic
- **Icon**: 📚
- **Auto-prompt**: Tự động tạo nếu chưa có chat history

```typescript
// Chat hook parameters
const { messages, sendMessage, createTopicAutoPrompt } = useLearningChat(
  selectedTopic?.id,
  undefined
); // nodeId = undefined

// Auto-prompt logic
if (messages.length === 0) {
  await createTopicAutoPrompt({
    topic_id: dbTopic.id,
    topic_title: dbTopic.title,
    topic_description: dbTopic.description,
  });
}
```

### 4. Open MindMap

- **Trigger**: User click "Xem cây kiến thức" button trong NotesPanel
- **Action**: `setShowMindMap(true)`
- **Display**: MindMapModal hiển thị với nodes từ database

```typescript
// NotesPanel button
<Button
  onClick={onShowMindMap}
  className="w-full gap-2 mb-3"
  variant="secondary"
>
  <Brain className="h-4 w-4" />
  Xem cây kiến thức
</Button>;

// Layout
{
  showMindMap && selectedTopic && (
    <MindMapModal
      isOpen={showMindMap}
      onClose={() => setShowMindMap(false)}
      data={mindMapData}
      topicTitle={selectedTopic.title}
      onNodeSelect={handleNodeSelect}
    />
  );
}
```

### 5. Node Selection

- **Trigger**: User click node trong MindMapModal
- **Action**: `handleNodeSelect(node)` → Switch to node-level chat
- **Result**: Chat riêng với node đó

```typescript
const handleNodeSelect = async (node: MindMapNodeData) => {
  const dbNode = nodes.find((n) => n.id === node.id);
  if (dbNode && selectedTopic) {
    setSelectedNodeForChat(dbNode); // Switch to node-level chat
    setShowMindMap(false); // Close mind map modal
  }
};
```

### 6. Node-Level Chat

- **State**: `selectedTopic` có giá trị, `selectedNodeForChat = dbNode`
- **Chat ID**: `topicId` + `nodeId`
- **Title**: `${topicTitle} > ${nodeTitle}`
- **Icon**: 🧠
- **Auto-prompt**: Tự động tạo nếu chưa có chat history

```typescript
// Chat hook parameters
const { messages, sendMessage, createNodeAutoPrompt } = useLearningChat(
  selectedTopic?.id,
  selectedNodeForChat?.id
);

// Auto-prompt logic
await createNodeAutoPrompt({
  topic_id: selectedTopic.id,
  node_id: node.id,
  node_title: node.title,
  node_description: node.description,
});
```

### 7. Back to Topic Chat

- **Trigger**: User click topic trong sidebar (bất kỳ lúc nào)
- **Action**: `handleTopicSelect()` → `setSelectedNodeForChat(null)`
- **Result**: Quay về topic-level chat

## 🎯 Chat States & UI

### Topic-Level Chat

```typescript
// State
selectedTopic: LearningTopic;
selectedNodeForChat: null;

// UI Display
title: selectedTopic.title;
icon: "📚";
chatId: selectedTopic.id;

// Chat Hook
useLearningChat(topicId, undefined);
```

### Node-Level Chat

```typescript
// State
selectedTopic: LearningTopic;
selectedNodeForChat: TreeNode;

// UI Display
title: `${selectedTopic.title} > ${selectedNodeForChat.title}`;
icon: "🧠";
chatId: selectedNodeForChat.id;

// Chat Hook
useLearningChat(topicId, nodeId);
```

## 🔧 Components liên quan

### Layout & Navigation

- `LearningPlatformLayout.tsx` - Layout chính, quản lý state
- `TopicSidebar.tsx` - Sidebar topics, trigger topic selection
- `NotesPanel.tsx` - Button "Xem cây kiến thức"

### Chat Components

- `ChatDebatePanel.tsx` - Main chat interface
- `MindMapModal.tsx` - Node selection modal
- `TreeView.tsx` - Tree visualization

### Hooks

- `useLearningChat.ts` - Chat logic, auto-prompts
- `useLearningTopics.ts` - Topic management
- `useLearningNodes.ts` - Node management
- `useLearningNotes.ts` - Notes management

## 🔄 Data Flow

### Chat Message Flow

```
User Input → sendMessage() → API → Database →
Hook Update → UI Refresh → Display Message
```

### Auto-Prompt Flow

```
Topic/Node Selection → Check Existing Messages →
If Empty → Create Auto-Prompt → Display in Chat
```

### State Management

```
Topic Selection → selectTopic() + setSelectedNodeForChat(null) → Topic Chat
Node Selection → setSelectedNodeForChat(node) → Node Chat
Sidebar Click → Reset to Topic Chat
```

## 🚀 Usage Examples

### Chuyển đổi chat modes

```typescript
// Topic-level chat
setSelectedNodeForChat(null);

// Node-level chat
setSelectedNodeForChat(dbNode);

// Back to topic chat (via sidebar)
handleTopicSelect(topic); // Auto reset selectedNodeForChat
```

### Auto-prompt creation

```typescript
// Topic auto-prompt
await createTopicAutoPrompt({
  topic_id: "uuid",
  topic_title: "React.js",
  topic_description: "Learn React.js framework",
});

// Node auto-prompt
await createNodeAutoPrompt({
  topic_id: "uuid",
  node_id: "uuid",
  node_title: "JSX Basics",
  node_description: "Understanding JSX syntax",
});
```

### Chat message sending

```typescript
// Works for both topic and node chat
await sendMessage({ message: "Explain this concept" });

// Hook automatically determines topic vs node based on state
const chatMode = nodeId ? "node" : "topic";
```

## 🎨 UX Flow

```
1. Tạo Topic → Topic Chat (general discussion)
2. Click "Xem cây kiến thức" → MindMap Modal
3. Click Node → Node Chat (specific topic)
4. Click Topic in Sidebar → Back to Topic Chat
5. Repeat step 2-4 as needed
```

## 🔍 Key Features

### Seamless Navigation

- Sidebar click luôn quay về topic chat
- Không cần button "back" riêng
- State management tự động

### Auto-Prompts

- Tự động tạo conversation starter
- Chỉ tạo khi chưa có chat history
- Context-aware cho topic vs node

### Context Switching

- Smooth transition giữa topic và node chat
- Preserve chat history riêng biệt
- Clear visual indicators (title, icon)

### Notes Integration

- Có thể add messages vào notes
- Notes panel luôn sync với current chat context
- Export/copy functionality

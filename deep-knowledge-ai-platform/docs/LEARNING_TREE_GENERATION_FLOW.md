# Learning Tree Generation Flow

## 📋 Tổng quan

Luồng tạo learning tree từ prompt của user, bao gồm việc gọi AI để generate cấu trúc cây kiến thức và import vào database với real UUIDs.

## 🔄 Luồng chi tiết

### 1. User Input (Frontend)

- **Component**: `TopicCreationInterface.tsx`
- **Action**: User nhập prompt (tối thiểu 3 ký tự)
- **Validation**: Kiểm tra prompt không rỗng và đủ độ dài

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!prompt.trim() || isLoading) return;

  const generationResult = await generateLearningTree(prompt.trim(), true);
  // ... xử lý kết quả
};
```

### 2. Hook Generation (Frontend)

- **Hook**: `useLearningGeneration.ts`
- **Function**: `generateLearningTree(prompt, useAI)`
- **Chế độ**:
  - `useAI = true`: Gọi FlowiseAI thật (tốn credit, thông minh)
  - `useAI = false`: Dùng sample tree cố định (miễn phí, testing)

```typescript
const generateLearningTree = async (prompt: string, useAI: boolean = true) => {
  // Gọi API generate thật
  const response = await fetch("/api/learning/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, useAI }),
  });

  const apiResult = await response.json();
  // ... xử lý response
};
```

### 3. API Generate (Backend)

- **Endpoint**: `POST /api/learning/generate`
- **Logic**:
  - Validate input prompt
  - Chọn AI hoặc sample generation
  - Import tree vào database
  - Trả về kết quả

```typescript
// AI Generation
if (body.useAI !== false) {
  aiResponse = await aiGenerationService.generateLearningTree(prompt);
} else {
  const sampleTree = aiGenerationService.generateSampleTree(prompt);
  aiResponse = { success: true, data: sampleTree, message: "Sample tree" };
}

// Import vào database
const importResponse = await learningService.importTreeData(aiResponse.data);
```

### 4. AI Service (Backend)

- **Service**: `aiGenerationService`
- **FlowiseAI**: Gọi external API để generate tree thông minh
- **Sample Tree**: Tạo cấu trúc cố định 4 nodes (Tổng quan → Setup → Concepts → Practice)

```typescript
// FlowiseAI Call
const response = await fetch(this.flowiseUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ question: userPrompt }),
});

// Parse response với temp_id
const treeData = this.parseTreeFromResponse(result);
```

### 5. Database Import (Backend)

- **Endpoint**: `POST /api/learning/tree`
- **Process**:
  1. Tạo topic mới trong database
  2. Map `temp_id` → real UUID
  3. Resolve dependencies (requires/next)
  4. Tạo tree nodes với real UUIDs
  5. Return topic + nodes data

```typescript
// Tạo mapping temp_id → real UUID
const tempIdMap = new Map<string, string>();
body.tree.forEach((node) => {
  const tempId = node.temp_id || node.id;
  if (tempId && !tempIdMap.has(tempId)) {
    tempIdMap.set(tempId, crypto.randomUUID());
  }
});

// Resolve requires/next từ temp_id sang real UUID
const resolvedRequires = (node.requires || [])
  .map((reqTempId: string) => tempIdMap.get(reqTempId))
  .filter(Boolean);
```

### 6. Response & UI Update (Frontend)

- **Callback**: `onTopicCreated(topicId)`
- **Auto-select**: Layout tự động select topic mới
- **Fetch nodes**: `useLearningNodes` auto fetch nodes từ database
- **Display**: Hiển thị tree với data thật từ DB

## 🔧 Components liên quan

### Frontend Components

- `TopicCreationInterface.tsx` - UI tạo topic
- `LearningPlatformLayout.tsx` - Layout chính
- `MindMapModal.tsx` - Hiển thị tree
- `TreeView.tsx` - Component tree

### Hooks

- `useLearningGeneration.ts` - Generation logic
- `useLearningTopics.ts` - Topic management
- `useLearningNodes.ts` - Node management

### Backend APIs

- `/api/learning/generate` - Generate endpoint
- `/api/learning/tree` - Import endpoint
- `/api/learning/[id]/nodes` - Fetch nodes

### Services

- `aiGenerationService` - AI integration
- `learningService` - Database operations

## 🎯 Key Features

### AI Generation Modes

1. **FlowiseAI Mode** (`useAI = true`)

   - Gọi external AI service
   - Generate tree thông minh theo prompt
   - Tốn credit/cost
   - Phù hợp production

2. **Sample Mode** (`useAI = false`)
   - Generate cấu trúc cố định
   - Miễn phí, nhanh
   - Phù hợp testing/demo

### Data Flow

```
User Prompt → AI Service → TreeData (temp_id) →
Database Import → Real UUIDs → Frontend Display
```

### Error Handling

- Validation prompt input
- AI service failures
- Database transaction rollback
- User-friendly error messages

## 🚀 Usage Examples

### Tạo topic với AI

```typescript
await generateLearningTree("Tôi muốn học React.js", true);
```

### Tạo topic với sample

```typescript
await generateSampleTree("Bất kỳ chủ đề nào");
```

### Response structure

```typescript
{
  success: true,
  message: "Tạo và import learning tree thành công!",
  data: {
    topic: { id: "uuid", title: "...", ... },
    nodes: [{ id: "uuid", title: "...", ... }],
    treeData: { tree: [...] }
  }
}
```

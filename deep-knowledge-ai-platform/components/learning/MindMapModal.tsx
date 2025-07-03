// 'use client';

// import { useState, useEffect } from 'react';
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { ScrollArea } from '@/components/ui/scroll-area';
// import { MindMapNode, MindMapNodeData } from '@/types';
// import { TreeView } from '@/components/learning/TreeView';
// import {
//     Brain,
//     Download,
//     ZoomIn,
//     ZoomOut,
//     RotateCcw,
//     Maximize,
//     ChevronRight,
//     ChevronDown
// } from 'lucide-react';
// import { cn } from '@/lib/utils';

// interface MindMapModalProps {
//     isOpen: boolean;
//     onClose: () => void;
//     data: MindMapNodeData[];
//     topicTitle: string;
//     onNodeSelect?: (node: MindMapNodeData) => void;
// }

// export function MindMapModal({ isOpen, onClose, data, topicTitle, onNodeSelect }: MindMapModalProps) {

//     // Mock data for demonstration - convert to TreeView format
//     const mockTreeData: MindMapNodeData[] = [
//         {
//             id: '1',
//             title: topicTitle || 'Chủ đề chính',
//             description: 'Điểm xuất phát cho việc học tập chủ đề này. Đây là nền tảng cơ bản mà bạn cần nắm vững trước khi đi sâu vào các khía cạnh chuyên sâu hơn.',
//             level: 0,
//             requires: [],
//             next: ['2', '5', '8']
//         },
//         {
//             id: '2',
//             title: 'Khái niệm cơ bản',
//             description: 'Tìm hiểu những khái niệm cốt lõi và nguyên lý cơ bản. Những kiến thức này sẽ là nền tảng cho việc hiểu sâu hơn về chủ đề.',
//             level: 1,
//             requires: ['1'],
//             next: ['3', '4']
//         },
//         {
//             id: '3',
//             title: 'Định nghĩa',
//             description: 'Các định nghĩa chính xác và đầy đủ về các thuật ngữ quan trọng trong lĩnh vực này.',
//             level: 2,
//             requires: ['2'],
//             next: []
//         },
//         {
//             id: '4',
//             title: 'Đặc điểm',
//             description: 'Những đặc điểm nổi bật và tính chất quan trọng cần ghi nhớ.',
//             level: 2,
//             requires: ['2'],
//             next: []
//         },
//         {
//             id: '5',
//             title: 'Ứng dụng thực tế',
//             description: 'Cách áp dụng kiến thức lý thuyết vào thực tế và các trường hợp sử dụng phổ biến.',
//             level: 1,
//             requires: ['1'],
//             next: ['6', '7']
//         },
//         {
//             id: '6',
//             title: 'Trong công nghiệp',
//             description: 'Ứng dụng của chủ đề này trong các ngành công nghiệp và doanh nghiệp.',
//             level: 2,
//             requires: ['5'],
//             next: []
//         },
//         {
//             id: '7',
//             title: 'Trong giáo dục',
//             description: 'Vai trò và ứng dụng trong lĩnh vực giáo dục và đào tạo.',
//             level: 2,
//             requires: ['5'],
//             next: []
//         },
//         {
//             id: '8',
//             title: 'Ưu nhược điểm',
//             description: 'Phân tích toàn diện về những mặt tích cực và hạn chế của chủ đề.',
//             level: 1,
//             requires: ['1'],
//             next: ['9', '10', '11']
//         },
//         {
//             id: '9',
//             title: 'Ưu điểm',
//             description: 'Những lợi ích và điểm mạnh chính của việc áp dụng chủ đề này.',
//             level: 2,
//             requires: ['8'],
//             next: []
//         },
//         {
//             id: '10',
//             title: 'Nhược điểm',
//             description: 'Những hạn chế và thách thức khi sử dụng.',
//             level: 2,
//             requires: ['8'],
//             next: ['11']
//         },
//         {
//             id: '11',
//             title: 'Cách khắc phục',
//             description: 'Các phương pháp và chiến lược để giải quyết những nhược điểm đã được xác định.',
//             level: 2,
//             requires: ['8', '10'],
//             next: []
//         }
//     ];

//     const displayTreeData = data.length > 0 ? data : mockTreeData;

//     const handleNodeClick = (node: MindMapNodeData) => {
//         if (onNodeSelect) {
//             onNodeSelect(node);
//             onClose(); // Đóng modal sau khi chọn node
//         }
//     };

//     return (
//         <Dialog open={isOpen} onOpenChange={onClose}>
//             <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
//                 <DialogHeader>
//                     <div className="flex items-center justify-between">
//                         <DialogTitle className="flex items-center gap-2">
//                             <Brain className="h-5 w-5 text-feature-secondary" />
//                             Cây kiến thức: {topicTitle}
//                         </DialogTitle>
//                         <div className="flex items-center gap-2">
//                             <Badge variant="outline" className="text-xs">
//                                 {displayTreeData.length} nodes
//                             </Badge>
//                         </div>
//                     </div>
//                 </DialogHeader>

//                 {/* Tree View Content */}
//                 <div className="flex-1 overflow-hidden">
//                     {displayTreeData.length > 0 ? (
//                         <TreeView
//                             nodes={displayTreeData}
//                             className="h-full"
//                             onNodeClick={handleNodeClick}
//                         />
//                     ) : (
//                         <div className="h-full flex flex-col items-center justify-center text-center p-8">
//                             <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
//                             <h3 className="text-lg font-semibold mb-2">Chưa có dữ liệu cây kiến thức</h3>
//                             <p className="text-muted-foreground mb-4 max-w-md">
//                                 Tiếp tục cuộc đối thoại để AI tự động tạo cây kiến thức từ nội dung học tập
//                             </p>
//                             <div className="space-y-3">
//                                 <Badge variant="secondary">
//                                     Tính năng đang phát triển
//                                 </Badge>
//                                 <div>
//                                     <Button variant="outline" size="sm" asChild>
//                                         <a href="/mindmap" target="_blank" rel="noopener noreferrer">
//                                             Xem Demo Interactive Tree
//                                         </a>
//                                     </Button>
//                                 </div>
//                             </div>
//                         </div>
//                     )}
//                 </div>

//             </DialogContent>
//         </Dialog>
//     );
// } 
// 'use client';

// import { InteractiveMindMap } from '@/components/learning/InteractiveMindMap';
// import { MindMapNodeData } from '@/types';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Brain, ArrowLeft } from 'lucide-react';
// import Link from 'next/link';
// import { useAuth } from '@/hooks/use-auth';


// export default function MindMapDemoPage() {
//     return (
//         <div className="min-h-screen bg-background">
//             {/* Header */}
//             <div className="border-b border-border bg-card">
//                 <div className="container mx-auto px-4 py-4">
//                     <div className="flex items-center justify-between">
//                         <div className="flex items-center gap-4">
//                             <Link href="/">
//                                 <Button variant="ghost" size="sm">
//                                     <ArrowLeft className="h-4 w-4 mr-2" />
//                                     Quay lại
//                                 </Button>
//                             </Link>
//                             <div className="flex items-center gap-3">
//                                 <Brain className="h-6 w-6 text-primary" />
//                                 <div>
//                                     <h1 className="text-xl font-bold">Interactive MindMap Demo</h1>
//                                     <p className="text-sm text-muted-foreground">
//                                         Lộ trình học Apache Kafka từ cơ bản đến nâng cao
//                                     </p>
//                                 </div>
//                             </div>
//                         </div>
//                         <div className="flex items-center gap-2">
//                             <Badge variant="outline">
//                                 {kafkaLearningNodes.length} nodes
//                             </Badge>
//                             <Badge variant="secondary">
//                                 {Math.max(...kafkaLearningNodes.map(n => n.level)) + 1} levels
//                             </Badge>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Instructions */}
//             <div className="container mx-auto px-4 py-6">
//                 <Card className="mb-6">
//                     <CardHeader>
//                         <CardTitle className="text-lg">Hướng dẫn sử dụng</CardTitle>
//                     </CardHeader>
//                     <CardContent>
//                         <div className="grid md:grid-cols-3 gap-4 text-sm">
//                             <div className="flex items-start gap-3">
//                                 <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
//                                     <span className="text-primary font-semibold">1</span>
//                                 </div>
//                                 <div>
//                                     <h4 className="font-medium mb-1">Pan & Zoom</h4>
//                                     <p className="text-muted-foreground">
//                                         Kéo để di chuyển, scroll để zoom in/out
//                                     </p>
//                                 </div>
//                             </div>
//                             <div className="flex items-start gap-3">
//                                 <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
//                                     <span className="text-blue-600 font-semibold">2</span>
//                                 </div>
//                                 <div>
//                                     <h4 className="font-medium mb-1">Click Node</h4>
//                                     <p className="text-muted-foreground">
//                                         Click vào node để xem chi tiết và mối quan hệ
//                                     </p>
//                                 </div>
//                             </div>
//                             <div className="flex items-start gap-3">
//                                 <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
//                                     <span className="text-green-600 font-semibold">3</span>
//                                 </div>
//                                 <div>
//                                     <h4 className="font-medium mb-1">Follow Path</h4>
//                                     <p className="text-muted-foreground">
//                                         Theo dõi mũi tên để xem lộ trình học tập
//                                     </p>
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="mt-4 p-3 bg-muted/30 rounded-lg">
//                             <h4 className="font-medium mb-2">Ý nghĩa màu sắc:</h4>
//                             <div className="flex flex-wrap gap-4 text-xs">
//                                 <div className="flex items-center gap-2">
//                                     <div className="w-3 h-3 bg-primary rounded-full"></div>
//                                     <span>Level 0 - Khởi đầu</span>
//                                 </div>
//                                 <div className="flex items-center gap-2">
//                                     <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
//                                     <span>Level 1 - Cơ bản</span>
//                                 </div>
//                                 <div className="flex items-center gap-2">
//                                     <div className="w-3 h-3 bg-green-500 rounded-full"></div>
//                                     <span>Level 2 - Trung cấp</span>
//                                 </div>
//                                 <div className="flex items-center gap-2">
//                                     <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
//                                     <span>Level 3+ - Nâng cao</span>
//                                 </div>
//                             </div>
//                         </div>
//                     </CardContent>
//                 </Card>
//             </div>

//             {/* MindMap */}
//             <div className="h-[calc(100vh-300px)] border-t border-border">
//                 <InteractiveMindMap
//                     nodes={kafkaLearningNodes}
//                     className="w-full h-full"
//                 />
//             </div>
//         </div>
//     );
// } 
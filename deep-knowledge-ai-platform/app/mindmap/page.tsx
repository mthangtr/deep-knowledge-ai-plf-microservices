'use client';

import { InteractiveMindMap } from '@/components/learning/InteractiveMindMap';
import { MindMapNodeData } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Sample data - Kafka learning path
const kafkaLearningNodes: MindMapNodeData[] = [
    {
        id: "intro",
        title: "Tổng quan Apache Kafka",
        description: "Hiểu về Kafka là gì, tại sao sử dụng Kafka và các khái niệm cơ bản về message streaming. Kafka là một nền tảng streaming phân tán được thiết kế để xử lý luồng dữ liệu thời gian thực với throughput cao.",
        level: 0,
        requires: [],
        next: ["concepts", "installation"]
    },
    {
        id: "concepts",
        title: "Khái niệm cốt lõi",
        description: "Tìm hiểu về Producer, Consumer, Topic, Partition, Broker và các thành phần quan trọng khác trong kiến trúc Kafka. Những khái niệm này là nền tảng để hiểu cách Kafka hoạt động.",
        level: 1,
        requires: ["intro"],
        next: ["producer", "consumer", "topics"]
    },
    {
        id: "installation",
        title: "Cài đặt & Cấu hình",
        description: "Hướng dẫn cài đặt Kafka trên các hệ điều hành khác nhau, cấu hình cơ bản và khởi chạy Kafka cluster đầu tiên của bạn.",
        level: 1,
        requires: ["intro"],
        next: ["basic_operations"]
    },
    {
        id: "producer",
        title: "Kafka Producer",
        description: "Tìm hiểu cách tạo và cấu hình Kafka Producer để gửi message vào Kafka. Bao gồm serialization, partitioning strategies và error handling.",
        level: 2,
        requires: ["concepts"],
        next: ["advanced_producer", "monitoring"]
    },
    {
        id: "consumer",
        title: "Kafka Consumer",
        description: "Học cách tạo Consumer để đọc message từ Kafka topics. Tìm hiểu về consumer groups, offset management và message processing patterns.",
        level: 2,
        requires: ["concepts"],
        next: ["advanced_consumer", "monitoring"]
    },
    {
        id: "topics",
        title: "Topics & Partitions",
        description: "Hiểu sâu về cách Kafka tổ chức dữ liệu thông qua topics và partitions. Học cách thiết kế partition strategy hiệu quả cho ứng dụng.",
        level: 2,
        requires: ["concepts"],
        next: ["replication", "performance"]
    },
    {
        id: "basic_operations",
        title: "Thao tác cơ bản",
        description: "Thực hành các thao tác cơ bản như tạo topic, gửi và nhận message qua command line tools. Đây là bước đầu tiên để làm quen với Kafka.",
        level: 2,
        requires: ["installation"],
        next: ["producer", "consumer"]
    },
    {
        id: "advanced_producer",
        title: "Producer nâng cao",
        description: "Tối ưu hóa Kafka Producer với các cấu hình nâng cao như batching, compression, idempotence và transaction. Học cách xử lý error và retry logic.",
        level: 3,
        requires: ["producer"],
        next: ["performance"]
    },
    {
        id: "advanced_consumer",
        title: "Consumer nâng cao",
        description: "Nâng cao kỹ năng với Consumer: rebalancing, custom partition assignment, exactly-once semantics và stream processing patterns.",
        level: 3,
        requires: ["consumer"],
        next: ["streams"]
    },
    {
        id: "replication",
        title: "Replication & Fault Tolerance",
        description: "Tìm hiểu về cơ chế replication trong Kafka, leader election, và cách Kafka đảm bảo fault tolerance trong distributed environment.",
        level: 3,
        requires: ["topics"],
        next: ["monitoring", "security"]
    },
    {
        id: "performance",
        title: "Performance Tuning",
        description: "Các kỹ thuật tối ưu hóa performance cho Kafka cluster: JVM tuning, OS configuration, network optimization và monitoring key metrics.",
        level: 4,
        requires: ["advanced_producer", "topics"],
        next: ["production"]
    },
    {
        id: "monitoring",
        title: "Monitoring & Observability",
        description: "Thiết lập monitoring cho Kafka cluster sử dụng JMX metrics, logging và các tools như Prometheus, Grafana. Học cách phát hiện và troubleshoot issues.",
        level: 4,
        requires: ["producer", "consumer", "replication"],
        next: ["production"]
    },
    {
        id: "streams",
        title: "Kafka Streams",
        description: "Kafka Streams library để xây dựng ứng dụng stream processing. Học về topology, stateful operations và exactly-once processing.",
        level: 4,
        requires: ["advanced_consumer"],
        next: ["production"]
    },
    {
        id: "security",
        title: "Security",
        description: "Bảo mật Kafka cluster với SSL/TLS encryption, SASL authentication, ACLs authorization và best practices cho production environment.",
        level: 4,
        requires: ["replication"],
        next: ["production"]
    },
    {
        id: "production",
        title: "Production Deployment",
        description: "Triển khai và vận hành Kafka cluster trong production: capacity planning, backup strategies, disaster recovery và operational best practices.",
        level: 5,
        requires: ["performance", "monitoring", "streams", "security"],
        next: []
    }
];

export default function MindMapDemoPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/">
                                <Button variant="ghost" size="sm">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Quay lại
                                </Button>
                            </Link>
                            <div className="flex items-center gap-3">
                                <Brain className="h-6 w-6 text-primary" />
                                <div>
                                    <h1 className="text-xl font-bold">Interactive MindMap Demo</h1>
                                    <p className="text-sm text-muted-foreground">
                                        Lộ trình học Apache Kafka từ cơ bản đến nâng cao
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline">
                                {kafkaLearningNodes.length} nodes
                            </Badge>
                            <Badge variant="secondary">
                                {Math.max(...kafkaLearningNodes.map(n => n.level)) + 1} levels
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            {/* Instructions */}
            <div className="container mx-auto px-4 py-6">
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-lg">Hướng dẫn sử dụng</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <span className="text-primary font-semibold">1</span>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-1">Pan & Zoom</h4>
                                    <p className="text-muted-foreground">
                                        Kéo để di chuyển, scroll để zoom in/out
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                    <span className="text-blue-600 font-semibold">2</span>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-1">Click Node</h4>
                                    <p className="text-muted-foreground">
                                        Click vào node để xem chi tiết và mối quan hệ
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                    <span className="text-green-600 font-semibold">3</span>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-1">Follow Path</h4>
                                    <p className="text-muted-foreground">
                                        Theo dõi mũi tên để xem lộ trình học tập
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                            <h4 className="font-medium mb-2">Ý nghĩa màu sắc:</h4>
                            <div className="flex flex-wrap gap-4 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                                    <span>Level 0 - Khởi đầu</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    <span>Level 1 - Cơ bản</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span>Level 2 - Trung cấp</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                    <span>Level 3+ - Nâng cao</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* MindMap */}
            <div className="h-[calc(100vh-300px)] border-t border-border">
                <InteractiveMindMap
                    nodes={kafkaLearningNodes}
                    className="w-full h-full"
                />
            </div>
        </div>
    );
} 
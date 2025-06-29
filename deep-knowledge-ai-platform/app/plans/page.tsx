import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, ArrowRight, Star } from 'lucide-react';
import Link from 'next/link';

// Static data cho 2 plans
const PLANS = [
    {
        id: 'free',
        name: 'free',
        title: 'Miễn phí',
        description: 'Hoàn hảo để bắt đầu khám phá nền tảng học tập AI',
        price: 0,
        currency: 'VND',
        features: [
            '5 chủ đề học tập mỗi ngày',
            'Chat AI cơ bản',
            'Tạo Mind Map đơn giản',
            'Ghi chú cơ bản',
            'Hỗ trợ community'
        ]
    },
    {
        id: 'premium',
        name: 'premium',
        title: 'Premium',
        description: 'Trải nghiệm học tập AI không giới hạn với tính năng cao cấp',
        price: 199000,
        currency: 'VND',
        features: [
            'Chủ đề học tập KHÔNG GIỚI HẠN',
            'Chat AI thông minh với phản biện',
            'Mind Map phức tạp và tương tác',
            'Ghi chú thông minh với AI',
            'Phân tích tiến độ học tập',
            'Xuất dữ liệu PDF/Word',
            'Hỗ trợ ưu tiên 24/7',
            'Tích hợp API cho developer'
        ]
    }
];

const formatPrice = (price: number) => {
    if (price === 0) return 'Miễn phí';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
};

export default function PlansPage() {
    return (
        <div className="pt-16 pb-12">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                        Chọn gói phù hợp với bạn
                    </h1>
                    <p className="text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
                        Khám phá sức mạnh của học tập AI thông minh với các gói dịch vụ được thiết kế đặc biệt cho nhu cầu học tập của bạn
                    </p>
                </div>

                {/* Trust Indicators */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-3xl mx-auto">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">10k+</div>
                        <div className="text-sm text-muted-foreground">Người dùng tin tưởng</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">4.9/5</div>
                        <div className="text-sm text-muted-foreground">Đánh giá trung bình</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">99.9%</div>
                        <div className="text-sm text-muted-foreground">Thời gian hoạt động</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">24/7</div>
                        <div className="text-sm text-muted-foreground">Hỗ trợ khách hàng</div>
                    </div>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {PLANS.map((plan) => {
                        const isPremiumPlan = plan.name === 'premium';
                        const isFreePlan = plan.name === 'free';

                        return (
                            <Card
                                key={plan.id}
                                className={`relative transition-all duration-300 hover:shadow-xl ${isPremiumPlan
                                    ? 'border-yellow-300 shadow-lg scale-105 bg-glass'
                                    : 'bg-glass border-glass hover:shadow-lg'
                                    }`}
                            >
                                {isPremiumPlan && (
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-foreground px-4 py-1">
                                            🔥 Phổ biến nhất
                                        </Badge>
                                    </div>
                                )}

                                <CardHeader className="text-center">
                                    <div className="flex items-center justify-center mb-2">
                                        {isPremiumPlan ? (
                                            <Crown className="w-8 h-8 text-yellow-500" />
                                        ) : (
                                            <Zap className="w-8 h-8 text-blue-500" />
                                        )}
                                    </div>

                                    <CardTitle className="text-2xl">
                                        {plan.title}
                                    </CardTitle>
                                    <CardDescription className="mt-2 min-h-12">
                                        {plan.description}
                                    </CardDescription>

                                    <div className="mt-4">
                                        <span className="text-4xl font-bold">
                                            {formatPrice(plan.price)}
                                        </span>
                                        {plan.price > 0 && (
                                            <span className="text-gray-500 ml-2">/tháng</span>
                                        )}
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    <ul className="space-y-3">
                                        {plan.features.map((feature, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                                <span className="text-sm">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>

                                <CardFooter>
                                    <Link href="/signin" className="w-full">
                                        <Button
                                            className={`w-full ${isPremiumPlan
                                                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600'
                                                : ''
                                                }`}
                                            variant={isPremiumPlan ? 'default' : 'outline'}
                                        >
                                            {isFreePlan ? 'Bắt đầu miễn phí' : 'Nâng cấp Premium'}
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>

                {/* FAQ Section */}
                <div className="mt-20 text-center">
                    <h2 className="text-3xl font-bold text-foreground mb-8">
                        Câu hỏi thường gặp
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
                        <Card className="p-6 bg-glass border-glass">
                            <h3 className="font-semibold mb-2">Tôi có thể thay đổi gói bất kỳ lúc nào?</h3>
                            <p className="text-muted-foreground text-sm">
                                Có, bạn có thể nâng cấp hoặc hạ cấp gói bất kỳ lúc nào. Thay đổi sẽ có hiệu lực ngay lập tức.
                            </p>
                        </Card>
                        <Card className="p-6 bg-glass border-glass">
                            <h3 className="font-semibold mb-2">Có thời gian dùng thử miễn phí không?</h3>
                            <p className="text-muted-foreground text-sm">
                                Gói Free cho phép bạn trải nghiệm đầy đủ tính năng cơ bản mà không cần thanh toán.
                            </p>
                        </Card>
                        <Card className="p-6 bg-glass border-glass">
                            <h3 className="font-semibold mb-2">Dữ liệu của tôi có được bảo mật?</h3>
                            <p className="text-muted-foreground text-sm">
                                Chúng tôi tuân thủ nghiêm ngặt các tiêu chuẩn bảo mật dữ liệu quốc tế và không chia sẻ thông tin cá nhân.
                            </p>
                        </Card>
                        <Card className="p-6 bg-glass border-glass">
                            <h3 className="font-semibold mb-2">Tôi có thể hủy gói Premium không?</h3>
                            <p className="text-muted-foreground text-sm">
                                Có, bạn có thể hủy bất kỳ lúc nào. Gói Premium sẽ hoạt động đến hết chu kỳ thanh toán hiện tại.
                            </p>
                        </Card>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="mt-16 text-center p-8">
                    <h2 className="text-3xl font-bold mb-4">
                        Sẵn sàng bắt đầu hành trình học tập AI?
                    </h2>
                    <p className="text-xl mb-6">
                        Tham gia cùng hàng nghìn người học đã tin tưởng nền tảng của chúng tôi
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/signin">
                            <Button size="lg" className="bg-foreground hover:bg-foreground/90 text-background">
                                Bắt đầu miễn phí
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                        <Button size="lg" variant="outline" className="border-foreground bg-transparent hover:bg-foreground/10">
                            Xem demo
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
} 
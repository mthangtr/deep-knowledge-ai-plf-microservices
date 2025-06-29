'use client';

import { Card } from "@/components/ui/card";
import { Feature, BaseComponentProps } from "@/types";
import { FEATURES } from "@/constants";

interface FeaturesSectionProps extends BaseComponentProps { }

const FeatureCard: React.FC<{ feature: Feature; index: number }> = ({ feature, index }) => {
    const IconComponent = feature.icon;

    // Sử dụng theme variables thay vì màu cố định
    const getFeatureTheme = (index: number) => {
        switch (index % 3) {
            case 0:
                return {
                    bgColor: "bg-feature-primary/10",
                    iconColor: "text-feature-primary"
                };
            case 1:
                return {
                    bgColor: "bg-feature-secondary/10",
                    iconColor: "text-feature-secondary"
                };
            case 2:
                return {
                    bgColor: "bg-feature-tertiary/10",
                    iconColor: "text-feature-tertiary"
                };
            default:
                return {
                    bgColor: "bg-feature-primary/10",
                    iconColor: "text-feature-primary"
                };
        }
    };

    const theme = getFeatureTheme(index);

    return (
        <Card className="bg-glass border-glass p-8 rounded-xl hover:bg-glass-hover transition-all duration-300">
            <div className={`flex items-center justify-center w-12 h-12 ${theme.bgColor} rounded-xl mb-6 shadow-lg`}>
                <IconComponent className={`h-8 w-8 ${theme.iconColor}`} />
            </div>
            <h3 className="text-xl font-semibold mb-4 text-foreground">{feature.title}</h3>
            <p className="text-muted-foreground leading-relaxed">
                {feature.description}
            </p>
        </Card>
    );
};

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ className = "" }) => {
    return (
        <section id="features" className={`py-20 px-6 max-w-7xl mx-auto ${className}`}>
            <div className="grid md:grid-cols-3 gap-8">
                {FEATURES.map((feature, idx) => (
                    <FeatureCard key={feature.id} feature={feature} index={idx} />
                ))}
            </div>
        </section>
    );
}; 
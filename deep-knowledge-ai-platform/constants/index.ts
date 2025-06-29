import { Feature, SuggestionOption, FooterLink, BackgroundOrb } from "@/types";
import { FileText, Eye, Download, Search, Brain, UserCog } from "lucide-react";

// App configuration
export const APP_CONFIG = {
  name: "DeepKnowledge",
  description: "Deep Learning with AI",
  currentYear: new Date().getFullYear(),
} as const;

// Suggestion options for quick form generation
export const SUGGESTION_OPTIONS: SuggestionOption[] = [
  {
    id: "deep-topic",
    label: "Explore a Deep Learning Topic",
    value: "deep-topic",
  },
  { id: "mindmap", label: "Generate a Knowledge Mindmap", value: "mindmap" },
  { id: "ai-tutor", label: "Ask AI to Explain a Concept", value: "ai-tutor" },
  {
    id: "critical-thinking",
    label: "Practice Critical Thinking",
    value: "critical-thinking",
  },
  {
    id: "personalized-path",
    label: "Get a Personalized Learning Path",
    value: "personalized-path",
  },
] as const;

// Features displayed on the landing page
export const FEATURES: Feature[] = [
  {
    id: "deep-learning-topic",
    title: "Start with Your Curiosity",
    description:
      "Tell us what you want to truly understand. Our AI will guide you to explore the roots and connections of any topic, step by step.",
    icon: Search,
    iconColor: "text-white",
    iconBgColor: "bg-blue-500/10",
  },
  {
    id: "ai-feedback",
    title: "Intelligent AI Guidance",
    description:
      "Get instant, in-depth explanations, visual mindmaps, and tailored suggestions. Learn actively with AI that adapts to your learning style.",
    icon: Brain,
    iconColor: "text-white",
    iconBgColor: "bg-purple-500/10",
  },
  {
    id: "personalized-learning",
    title: "Personalized Deep Learning",
    description:
      "Track your progress, save your insights, and integrate with your favorite tools. Experience a truly personalized journey to deep knowledge with AI.",
    icon: UserCog,
    iconColor: "text-white",
    iconBgColor: "bg-green-500/10",
  },
] as const;

// Footer navigation links
export const FOOTER_LINKS: FooterLink[] = [
  { id: "docs", label: "Docs", href: "#" },
  { id: "github", label: "GitHub", href: "#" },
  { id: "contact", label: "Contact", href: "#" },
] as const;

// Background animated orbs configuration
export const BACKGROUND_ORBS: BackgroundOrb[] = [
  {
    id: "orb-1",
    size: "w-96 h-96",
    position: "top-1/4 left-1/4",
    color: "bg-blue-500/20",
    animation: "animate-pulse",
  },
  {
    id: "orb-2",
    size: "w-80 h-80",
    position: "bottom-1/4 right-1/4",
    color: "bg-purple-500/20",
    animation: "animate-pulse delay-1000",
  },
  {
    id: "orb-3",
    size: "w-64 h-64",
    position: "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
    color: "bg-pink-500/10",
    animation: "animate-pulse delay-500",
  },
] as const;

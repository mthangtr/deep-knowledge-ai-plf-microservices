from enum import Enum

class Domain(Enum):
    """Defines the knowledge domains for model selection."""
    PROGRAMMING = "PROGRAMMING"
    SCIENCE = "SCIENCE"
    DEFAULT = "DEFAULT"
    # Future domains like LAW, MEDICINE, FINANCE can be added here.

class ModelTier(Enum):
    """Defines the complexity tiers for model selection."""
    LEVEL_1 = "level_1" # Fast & cheap, for simple queries
    LEVEL_2 = "level_2" # Balanced, for detailed explanations
    LEVEL_3 = "level_3" # Powerful, for complex reasoning

# ==============================================================================
# KEYWORD MAPPING
# ==============================================================================

# Keywords to identify the domain from topic/node titles
DOMAIN_KEYWORDS = {
    Domain.PROGRAMMING: ["code", "lập trình", "python", "javascript", "react", "node", "css", "html", "docker", "sql", "database", "api", "git", "thuật toán", "algorithm"],
    Domain.SCIENCE: ["toán", "vật lý", "hóa học", "sinh học", "y học", "khoa học", "định lý", "nguyên lý", "công thức", "phương trình"],
}

# Keywords to determine the complexity level from the user's message
LEVEL_2_KEYWORDS = [
    "giải thích", "tại sao", "như thế nào", "how does", "what is the difference", "so sánh",
    "viết code", "viết một hàm", "làm thế nào để", "hướng dẫn", "cụ thể"
]

LEVEL_3_KEYWORDS = [
    "phân tích sâu", "phản biện", "đánh giá", "kiến trúc", "thiết kế", "tối ưu",
    "lên kế hoạch", "xây dựng chiến lược", "giải bài toán", "chứng minh", "suy luận"
]


# ==============================================================================
# MODEL STRATEGY MATRIX
# (Domain, Tier) -> Model
# ==============================================================================

MODEL_STRATEGY = {
    Domain.PROGRAMMING: {
        ModelTier.LEVEL_1: "openai/gpt-4o-mini",
        ModelTier.LEVEL_2: "google/gemini-2.5-flash",
        ModelTier.LEVEL_3: "anthropic/claude-3-sonnet-20240229"
    },
    Domain.SCIENCE: {
        ModelTier.LEVEL_1: "openai/gpt-4o-mini",
        ModelTier.LEVEL_2: "google/gemini-2.5-flash",
        ModelTier.LEVEL_3: "google/gemini-2.5-pro"
    },
    Domain.DEFAULT: {
        ModelTier.LEVEL_1: "openai/gpt-4o-mini",
        ModelTier.LEVEL_2: "google/gemini-2.5-flash",
        ModelTier.LEVEL_3: "anthropic/claude-3-sonnet-20240229"
    }
} 
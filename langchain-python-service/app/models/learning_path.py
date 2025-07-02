from pydantic import BaseModel, Field
from typing import List

class GeneratePathRequest(BaseModel):
    """Request model for generating a learning path."""
    message: str = Field(
        ...,
        description="The user's request for a new learning course.",
        examples=["tôi muốn học về docker cho backend dev, tập trung vào phỏng vấn"]
    )

class LearningNode(BaseModel):
    """Represents a single node in the learning path tree."""
    temp_id: str
    title: str
    description: str
    level: int
    requires: List[str]
    next: List[str]
    is_chat_enabled: bool
    prompt_sample: str
    position_x: int = 0
    position_y: int = 0
    is_completed: bool = False
    created_at: str = ""
    updated_at: str = ""

class LearningPathResponse(BaseModel):
    """Response model for a generated learning path."""
    topicName: str
    description: str
    tree: List[LearningNode] 
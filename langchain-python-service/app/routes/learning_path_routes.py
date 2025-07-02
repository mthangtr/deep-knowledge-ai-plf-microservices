from fastapi import APIRouter, HTTPException, Body
from loguru import logger

from app.services.learning_path_service import LearningPathService
from app.models.learning_path import GeneratePathRequest, LearningPathResponse

router = APIRouter(
    prefix="/learning-path",
    tags=["Learning Path Generation"]
)

@router.post("/generate", response_model=LearningPathResponse)
async def generate_learning_path(request: GeneratePathRequest = Body(...)):
    """
    Generates a comprehensive, hierarchical learning path from a single user request.

    This endpoint uses a multi-agent system to:
    1.  Interpret the user's request.
    2.  Generate a course outline and metadata in parallel.
    3.  Parse and structure the outline into a ready-to-use JSON tree.
    """
    try:
        logger.info(f"Received request to generate learning path.")
        service = LearningPathService()
        path = await service.generate_path(request.message)
        return path
    except ValueError as e:
        logger.warning(f"Value error during path generation: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"An unexpected error occurred during path generation: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.") 
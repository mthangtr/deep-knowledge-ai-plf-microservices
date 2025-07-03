from fastapi import APIRouter, HTTPException, Body, Response, status
from loguru import logger

from app.services.learning_path_service import LearningPathService
from app.models.learning_path import GeneratePathRequest, LearningPathResponse

router = APIRouter(
    prefix="/learning-path",
    tags=["Learning Path Generation"]
)

@router.post("/generate")
async def generate_learning_path(request: GeneratePathRequest = Body(...)):
    """
    Generates a comprehensive, hierarchical learning path from a single user request.
    Returns a raw JSON string for the backend-main to process.
    """
    try:
        logger.info(f"Received request to generate learning path.")
        service = LearningPathService()
        # The service now returns a raw JSON string
        path_json_string = await service.generate_path(request.message)
        
        # Return the raw JSON string with the correct media type
        return Response(content=path_json_string, media_type="application/json")

    except ValueError as e:
        logger.warning(f"Value error during path generation: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"An unexpected error occurred during path generation: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An internal server error occurred.") 
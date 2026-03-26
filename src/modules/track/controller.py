from fastapi import APIRouter, Path
from .schemas import TrackResponse
from .service import TrackService


router = APIRouter(
    prefix="/track",
    tags=["Track"]
)


@router.get("/{track_id}", response_model=TrackResponse)
async def get_track(
    track_id: int = Path(..., gt=0, description="Deezer track ID")
) -> TrackResponse:
    """
    Get detailed track information from Deezer
    
    - **track_id**: The Deezer track ID (must be positive)
    
    Returns complete track metadata including artist and album info.
    """
    return await TrackService.get_track_by_id(track_id)
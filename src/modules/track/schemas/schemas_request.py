from pydantic import BaseModel, Field


class TrackRequest(BaseModel):
    """Query parameters for track endpoint"""
    track_id: int = Field(..., gt=0, description="Deezer track ID")

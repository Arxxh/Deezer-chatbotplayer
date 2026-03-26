import httpx
from fastapi import HTTPException
from .schemas import TrackResponse


class TrackService:
    """Service layer for track operations"""
    
    BASE_URL = "https://api.deezer.com"
    
    @staticmethod
    async def get_track_by_id(track_id: int) -> TrackResponse:
        """
        Fetch track information from Deezer API
        
        Args:
            track_id: Deezer track ID
            
        Returns:
            TrackResponse with track data
            
        Raises:
            HTTPException: If track not found or API error
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{TrackService.BASE_URL}/track/{track_id}",
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail="Failed to fetch track from Deezer API"
                    )
                
                data = response.json()
                
                # Deezer returns errors with 200 status
                if "error" in data:
                    error = data["error"]
                    raise HTTPException(
                        status_code=404,
                        detail=f"Track not found: {error.get('message', 'Unknown error')}"
                    )
                
                return TrackResponse(**data)
                
            except httpx.RequestError as e:
                raise HTTPException(
                    status_code=503,
                    detail=f"Error connecting to Deezer API: {str(e)}"
                )

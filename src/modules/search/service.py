import httpx
from fastapi import HTTPException
from .schemas import SearchResponse


class SearchService:
    """Service layer for search operations"""
    
    BASE_URL = "https://api.deezer.com"
    
    @staticmethod
    async def search_tracks(
        query: str,
        limit: int = 25
    ) -> SearchResponse:
        """
        Search tracks on Deezer
        
        Args:
            query: Search query (artist name, track name, etc)
            limit: Maximum number of results (default: 25, max: 100)
            
        Returns:
            SearchResponse with matching tracks
            
        Raises:
            HTTPException: If search fails
        """
        if limit > 100:
            limit = 100
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{SearchService.BASE_URL}/search",
                    params={
                        "q": query,
                        "limit": limit
                    },
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail="Failed to search on Deezer API"
                    )
                
                data = response.json()
                
                # Check for errors
                if "error" in data:
                    error = data["error"]
                    raise HTTPException(
                        status_code=400,
                        detail=f"Search error: {error.get('message', 'Unknown error')}"
                    )
                
                return SearchResponse(**data)
                
            except httpx.RequestError as e:
                raise HTTPException(
                    status_code=503,
                    detail=f"Error connecting to Deezer API: {str(e)}"
                )
from fastapi import APIRouter, Query
from .schemas import SearchResponse
from .service import SearchService


router = APIRouter(
    prefix="/search",
    tags=["Search"]
)


@router.get("", response_model=SearchResponse)
async def search_tracks(
    q: str = Query(
        ...,
        min_length=1,
        description="Search query (artist, track name, album, etc)",
        examples=["kanye west"]
    ),
    limit: int = Query(
        25,
        ge=1,
        le=100,
        description="Maximum number of results"
    )
) -> SearchResponse:
    """
    Search for tracks on Deezer
    
    - **q**: Search query (can be artist name, track name, album, or combination)
    - **limit**: Maximum number of results to return (1-100)
    
    Returns a list of matching tracks with artist and album information.
    
    Examples:
    - `/search?q=kanye west`
    - `/search?q=stronger`
    - `/search?q=graduation album`
    """
    return await SearchService.search_tracks(query=q, limit=limit)

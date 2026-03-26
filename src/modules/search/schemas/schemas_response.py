from typing import Optional
from pydantic import BaseModel, Field


class SearchArtistInfo(BaseModel):
    """Artist info in search results"""
    id: int
    name: str
    link: Optional[str] = None
    picture: Optional[str] = None
    picture_small: Optional[str] = None
    picture_medium: Optional[str] = None
    picture_big: Optional[str] = None
    picture_xl: Optional[str] = None
    tracklist: Optional[str] = None
    type: str = "artist"


class SearchAlbumInfo(BaseModel):
    """Album info in search results"""
    id: int
    title: str
    cover: Optional[str] = None
    cover_small: Optional[str] = None
    cover_medium: Optional[str] = None
    cover_big: Optional[str] = None
    cover_xl: Optional[str] = None
    tracklist: Optional[str] = None
    type: str = "album"


class SearchTrackResult(BaseModel):
    """Individual track in search results"""
    id: int
    readable: bool
    title: str
    title_short: Optional[str] = None
    title_version: Optional[str] = None
    link: str
    duration: int = Field(..., description="Track duration in seconds")
    rank: int
    explicit_lyrics: bool
    explicit_content_lyrics: Optional[int] = None
    explicit_content_cover: Optional[int] = None
    preview: Optional[str] = Field(None, description="30s preview URL")
    md5_image: Optional[str] = None
    artist: SearchArtistInfo
    album: SearchAlbumInfo
    type: str = "track"


class SearchResponse(BaseModel):
    """Search response with results"""
    data: list[SearchTrackResult]
    total: int
    next: Optional[str] = None

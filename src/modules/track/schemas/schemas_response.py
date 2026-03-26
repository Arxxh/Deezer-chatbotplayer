from typing import Optional
from pydantic import BaseModel, Field


class ArtistSchema(BaseModel):
    """Artist information in track response"""
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


class AlbumSchema(BaseModel):
    """Album information in track response"""
    id: int
    title: str
    cover: Optional[str] = None
    cover_small: Optional[str] = None
    cover_medium: Optional[str] = None
    cover_big: Optional[str] = None
    cover_xl: Optional[str] = None
    md5_image: Optional[str] = None
    tracklist: Optional[str] = None
    type: str = "album"


class ContributorSchema(BaseModel):
    """Contributor information"""
    id: int
    name: str
    link: Optional[str] = None
    share: Optional[str] = None
    picture: Optional[str] = None
    picture_small: Optional[str] = None
    picture_medium: Optional[str] = None
    picture_big: Optional[str] = None
    picture_xl: Optional[str] = None
    radio: Optional[bool] = None
    tracklist: Optional[str] = None
    type: str = "artist"
    role: Optional[str] = None


class TrackResponse(BaseModel):
    """Complete track response from Deezer API"""
    id: int
    readable: bool
    title: str
    title_short: Optional[str] = None
    title_version: Optional[str] = None
    isrc: Optional[str] = None
    link: str
    share: Optional[str] = None
    duration: int = Field(..., description="Track duration in seconds")
    track_position: Optional[int] = None
    disk_number: Optional[int] = None
    rank: int = Field(..., description="Track popularity rank")
    release_date: Optional[str] = None
    explicit_lyrics: bool
    explicit_content_lyrics: Optional[int] = None
    explicit_content_cover: Optional[int] = None
    preview: Optional[str] = Field(None, description="30s preview URL")
    bpm: Optional[float] = None
    gain: Optional[float] = None
    available_countries: Optional[list[str]] = None
    contributors: Optional[list[ContributorSchema]] = None
    md5_image: Optional[str] = None
    artist: ArtistSchema
    album: AlbumSchema
    type: str = "track"


class DeezerErrorResponse(BaseModel):
    """Error response from Deezer API"""
    type: str
    message: str
    code: int

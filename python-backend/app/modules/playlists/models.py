from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.modules.playback.models import Track

PLAYLIST_TRACK_LIMIT = 10


class Playlist(BaseModel):
    id: str
    name: str
    tracks: list[Track] = Field(default_factory=list)
    createdAt: str
    updatedAt: str

    model_config = ConfigDict(extra="ignore")


class PlaylistMutationResponse(BaseModel):
    playlist: Playlist
    message: str

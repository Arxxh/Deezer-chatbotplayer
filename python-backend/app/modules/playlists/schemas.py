from __future__ import annotations

from pydantic import BaseModel, Field


class CreatePlaylistRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class AddPlaylistTrackRequest(BaseModel):
    query: str = Field(min_length=1, max_length=300)

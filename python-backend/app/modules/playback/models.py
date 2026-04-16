from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class PlaybackSource(BaseModel):
    provider: Literal["youtube"]
    videoId: str
    videoTitle: str
    channelTitle: str
    confidence: int

    model_config = ConfigDict(extra="ignore")


class Track(BaseModel):
    id: int
    title: str
    artistName: str
    albumTitle: str
    duration: int
    previewUrl: str | None = None
    deezerUrl: str
    coverUrl: str | None = None
    playbackSource: PlaybackSource | None = None

    model_config = ConfigDict(extra="ignore")


class PlaybackState(BaseModel):
    current: Track | None = None
    queue: list[Track] = Field(default_factory=list)
    isPaused: bool = False

    model_config = ConfigDict(extra="ignore")


def create_empty_playback_state() -> PlaybackState:
    return PlaybackState()

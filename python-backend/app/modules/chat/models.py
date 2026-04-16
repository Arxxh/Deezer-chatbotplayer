from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.playback.models import PlaybackState, Track

ChatCommandName = Literal[
    "play",
    "pause",
    "resume",
    "skip",
    "queue",
    "nowplaying",
    "help",
    "playlist",
    "unknown",
]

PlaylistCommandAction = Literal["create", "add", "show", "list", "delete", "play"]

HELP_SUGGESTIONS = [
    "/play stronger kanye west",
    "/queue",
    "/nowplaying",
    "/pause",
    "/resume",
    "/skip",
    "/play playlist favoritas",
    "/playlist favoritas",
    "/playlist create favoritas",
    "/playlist delete favoritas",
]


class ChatCommandIntent(BaseModel):
    command: ChatCommandName
    rawMessage: str
    query: str | None = None
    playlistAction: PlaylistCommandAction | None = None
    playlistName: str | None = None
    playlistQuery: str | None = None

    model_config = ConfigDict(extra="ignore")


class ChatResponse(BaseModel):
    command: ChatCommandName
    reply: str
    state: PlaybackState
    alternatives: list[Track] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)

    model_config = ConfigDict(extra="ignore")

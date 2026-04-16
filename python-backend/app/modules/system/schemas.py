from __future__ import annotations

from pydantic import BaseModel


class RootRoutes(BaseModel):
    health: str
    chatMessage: str
    chatState: str
    playlists: str


class RootInfo(BaseModel):
    name: str
    version: str
    basePath: str
    routes: RootRoutes


class HealthStatus(BaseModel):
    status: str
    service: str

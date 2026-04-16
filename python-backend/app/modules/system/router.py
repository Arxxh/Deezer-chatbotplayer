from __future__ import annotations

from fastapi import APIRouter

from app.modules.system.schemas import HealthStatus, RootInfo, RootRoutes

router = APIRouter(tags=["system"])


@router.get("/", response_model=RootInfo)
async def root() -> RootInfo:
    return RootInfo(
        name="deezer-chat-backend",
        version="0.1.0",
        basePath="/api/v1",
        routes=RootRoutes(
            health="/api/v1/health",
            chatMessage="/api/v1/chat/messages",
            chatState="/api/v1/chat/state",
            playlists="/api/v1/playlists",
        ),
    )


@router.get("/health", response_model=HealthStatus)
async def health() -> HealthStatus:
    return HealthStatus(status="ok", service="deezer-chat-backend")

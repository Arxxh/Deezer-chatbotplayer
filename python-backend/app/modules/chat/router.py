from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.deps import get_chat_service
from app.modules.chat.models import ChatResponse
from app.modules.chat.schemas import ChatMessageRequest
from app.modules.chat.service import ChatService
from app.modules.playback.models import PlaybackState

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/messages", response_model=ChatResponse)
async def send_message(
    payload: ChatMessageRequest,
    service: ChatService = Depends(get_chat_service),
) -> ChatResponse:
    return await service.send_message(payload.message)


@router.get("/state", response_model=PlaybackState)
async def get_state(
    service: ChatService = Depends(get_chat_service),
) -> PlaybackState:
    return await service.get_state()

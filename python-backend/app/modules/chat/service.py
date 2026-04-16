from __future__ import annotations

from app.modules.chat.models import HELP_SUGGESTIONS, ChatResponse
from app.modules.chat.parser import ChatCommandParser
from app.modules.playback.repository import FilePlaybackStateRepository
from app.modules.playback.service import PlaybackService
from app.modules.playlists.service import PlaylistService


class ChatService:
    def __init__(
        self,
        parser: ChatCommandParser,
        playback_service: PlaybackService,
        playlist_service: PlaylistService,
        playback_repository: FilePlaybackStateRepository,
    ) -> None:
        self.parser = parser
        self.playback_service = playback_service
        self.playlist_service = playlist_service
        self.playback_repository = playback_repository

    async def send_message(self, message: str) -> ChatResponse:
        intent = await self.parser.parse(message)

        if intent.command == "play":
            return await self.playback_service.play(intent.query)
        if intent.command == "pause":
            return await self.playback_service.pause()
        if intent.command == "resume":
            return await self.playback_service.resume()
        if intent.command == "skip":
            return await self.playback_service.skip()
        if intent.command == "queue":
            return await self.playback_service.get_queue()
        if intent.command == "nowplaying":
            return await self.playback_service.get_now_playing()
        if intent.command == "help":
            return await self.get_help_response()
        if intent.command == "playlist":
            return await self.playlist_service.handle_intent(intent)

        return await self.get_help_response(
            "No entendí ese comando. Prueba /play, /queue, /playlist o /help."
        )

    async def get_state(self):
        return await self.playback_repository.get_state()

    async def get_help_response(
        self,
        custom_reply: str = "Estos son los comandos disponibles para el chat musical.",
    ) -> ChatResponse:
        state = await self.playback_repository.get_state()
        return ChatResponse(
            command="help",
            reply=custom_reply,
            state=state,
            alternatives=[],
            suggestions=HELP_SUGGESTIONS,
        )

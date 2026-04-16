from __future__ import annotations

from functools import lru_cache

from app.core.config import Settings, get_settings
from app.integrations.deezer_client import DeezerMusicCatalogClient
from app.integrations.gemini_client import GeminiIntentClient
from app.integrations.youtube_client import YouTubePlaybackSourceResolver
from app.modules.chat.parser import ChatCommandParser
from app.modules.chat.service import ChatService
from app.modules.playback.repository import FilePlaybackStateRepository
from app.modules.playback.service import PlaybackService
from app.modules.playlists.repository import FilePlaylistRepository
from app.modules.playlists.service import PlaylistService
from app.storage.json_store import JsonAppStateStore


class Container:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.store = JsonAppStateStore(settings.app_data_file)
        self.playback_repository = FilePlaybackStateRepository(self.store)
        self.playlist_repository = FilePlaylistRepository(self.store)
        self.deezer_client = DeezerMusicCatalogClient()
        self.youtube_resolver = YouTubePlaybackSourceResolver(
            settings.youtube_data_api_key
        )
        self.gemini_client = GeminiIntentClient(settings.gemini_api_key)
        self.chat_parser = ChatCommandParser(self.gemini_client)
        self.playback_service = PlaybackService(
            deezer_client=self.deezer_client,
            youtube_resolver=self.youtube_resolver,
            playback_repository=self.playback_repository,
            playlist_repository=self.playlist_repository,
        )
        self.playlist_service = PlaylistService(
            playlist_repository=self.playlist_repository,
            playback_repository=self.playback_repository,
            deezer_client=self.deezer_client,
            playback_service=self.playback_service,
        )
        self.chat_service = ChatService(
            parser=self.chat_parser,
            playback_service=self.playback_service,
            playlist_service=self.playlist_service,
            playback_repository=self.playback_repository,
        )


@lru_cache
def get_container() -> Container:
    return Container(get_settings())


def get_chat_service() -> ChatService:
    return get_container().chat_service


def get_playlist_service() -> PlaylistService:
    return get_container().playlist_service

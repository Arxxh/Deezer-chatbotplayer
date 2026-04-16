from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from app.integrations.gemini_client import GeminiIntentClient
from app.modules.chat.parser import ChatCommandParser
from app.modules.chat.models import ChatCommandIntent
from app.modules.playback.models import PlaybackState, Track
from app.modules.playback.repository import FilePlaybackStateRepository
from app.modules.playback.service import PlaybackService
from app.modules.playlists.models import Playlist
from app.modules.playlists.repository import FilePlaylistRepository
from app.modules.playlists.service import PlaylistService
from app.storage.json_store import JsonAppStateStore


class FakeDeezerClient:
    def __init__(self, tracks: list[Track]) -> None:
        self.tracks = tracks

    async def search_tracks(self, _query: str, _limit: int) -> list[Track]:
        return [track.model_copy(deep=True) for track in self.tracks]


class FakeYouTubeResolver:
    async def resolve_track_source(self, _track: Track):
        return None


class ParserTests(unittest.IsolatedAsyncioTestCase):
    async def test_playlist_add_slash_command(self) -> None:
        parser = ChatCommandParser(GeminiIntentClient(None))

        intent = await parser.parse("/playlist add favoritas :: stronger kanye west")

        self.assertEqual(
            intent,
            ChatCommandIntent(
                command="playlist",
                rawMessage="/playlist add favoritas :: stronger kanye west",
                playlistAction="add",
                playlistName="favoritas",
                playlistQuery="stronger kanye west",
            ),
        )


class PlaylistAndPlaybackTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.store = JsonAppStateStore(Path(self.temp_dir.name) / "app-state.json")
        self.playlist_repository = FilePlaylistRepository(self.store)
        self.playback_repository = FilePlaybackStateRepository(self.store)
        self.sample_track = Track(
            id=1,
            title="Stronger",
            artistName="Kanye West",
            albumTitle="Graduation",
            duration=312,
            previewUrl="https://cdn.example/preview.mp3",
            deezerUrl="https://www.deezer.com/track/1",
            coverUrl="https://cdn.example/cover.jpg",
            playbackSource=None,
        )
        self.second_track = self.sample_track.model_copy(
            update={
                "id": 2,
                "title": "Suave",
                "duration": 143,
            },
            deep=True,
        )
        self.playback_service = PlaybackService(
            deezer_client=FakeDeezerClient([self.sample_track]),
            youtube_resolver=FakeYouTubeResolver(),
            playback_repository=self.playback_repository,
            playlist_repository=self.playlist_repository,
        )
        self.playlist_service = PlaylistService(
            playlist_repository=self.playlist_repository,
            playback_repository=self.playback_repository,
            deezer_client=FakeDeezerClient([self.sample_track]),
            playback_service=self.playback_service,
        )

    async def asyncTearDown(self) -> None:
        self.temp_dir.cleanup()

    async def test_playlist_show_includes_total_duration(self) -> None:
        playlist = Playlist(
            id="playlist-1",
            name="Luis Miguel",
            tracks=[self.sample_track, self.second_track],
            createdAt="2026-01-01T00:00:00.000Z",
            updatedAt="2026-01-01T00:00:00.000Z",
        )
        await self.playlist_repository.save(playlist)

        response = await self.playlist_service.handle_intent(
            ChatCommandIntent(
                command="playlist",
                rawMessage="/playlist show Luis Miguel",
                playlistAction="show",
                playlistName="Luis Miguel",
            )
        )

        self.assertIn("duración total: 7 min 35 s", response.reply)

    async def test_song_play_clears_previous_playlist_queue(self) -> None:
        playlist = Playlist(
            id="playlist-1",
            name="Favoritas",
            tracks=[self.sample_track, self.second_track],
            createdAt="2026-01-01T00:00:00.000Z",
            updatedAt="2026-01-01T00:00:00.000Z",
        )
        await self.playlist_repository.save(playlist)

        await self.playback_service.play_playlist("Favoritas")
        await self.playback_service.play("stronger")

        current_state = await self.playback_repository.get_state()
        self.assertIsNotNone(current_state.current)
        self.assertEqual(current_state.current.title, "Stronger")
        self.assertEqual(current_state.queue, [])


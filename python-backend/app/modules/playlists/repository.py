from __future__ import annotations

from app.modules.playlists.models import Playlist
from app.storage.json_store import JsonAppStateStore


class FilePlaylistRepository:
    def __init__(self, store: JsonAppStateStore) -> None:
        self.store = store

    async def list(self) -> list[Playlist]:
        state = await self.store.read()
        return [playlist.model_copy(deep=True) for playlist in state.playlists]

    async def find_by_id(self, playlist_id: str) -> Playlist | None:
        playlists = await self.list()
        for playlist in playlists:
            if playlist.id == playlist_id:
                return playlist

        return None

    async def find_by_name(self, name: str) -> Playlist | None:
        normalized_name = normalize_playlist_name(name)

        for playlist in await self.list():
            if normalize_playlist_name(playlist.name) == normalized_name:
                return playlist

        return None

    async def save(self, playlist: Playlist) -> None:
        async def mutator(state) -> None:
            for index, current_playlist in enumerate(state.playlists):
                if current_playlist.id == playlist.id:
                    state.playlists[index] = playlist.model_copy(deep=True)
                    return

            state.playlists.append(playlist.model_copy(deep=True))

        await self.store.update(mutator)

    async def delete(self, playlist_id: str) -> Playlist | None:
        deleted_playlist: Playlist | None = None

        async def mutator(state) -> None:
            nonlocal deleted_playlist

            for index, current_playlist in enumerate(state.playlists):
                if current_playlist.id == playlist_id:
                    deleted_playlist = current_playlist.model_copy(deep=True)
                    del state.playlists[index]
                    return

        await self.store.update(mutator)
        return deleted_playlist


def normalize_playlist_name(name: str) -> str:
    return name.strip().lower()

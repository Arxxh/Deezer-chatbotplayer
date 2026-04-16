from __future__ import annotations

from app.modules.playback.models import PlaybackState
from app.storage.json_store import JsonAppStateStore


class FilePlaybackStateRepository:
    def __init__(self, store: JsonAppStateStore) -> None:
        self.store = store

    async def get_state(self) -> PlaybackState:
        state = await self.store.read()
        return state.playbackState.model_copy(deep=True)

    async def save_state(self, playback_state: PlaybackState) -> None:
        async def mutator(state) -> None:
            state.playbackState = playback_state.model_copy(deep=True)

        await self.store.update(mutator)

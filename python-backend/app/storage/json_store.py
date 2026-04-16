from __future__ import annotations

import asyncio
import inspect
import json
from pathlib import Path
from typing import Awaitable, Callable

from pydantic import BaseModel, Field

from app.modules.playback.models import PlaybackState, create_empty_playback_state
from app.modules.playlists.models import Playlist


class AppPersistenceState(BaseModel):
    playbackState: PlaybackState = Field(default_factory=create_empty_playback_state)
    playlists: list[Playlist] = Field(default_factory=list)


class JsonAppStateStore:
    def __init__(self, file_path: Path) -> None:
        self.file_path = file_path
        self._lock = asyncio.Lock()

    async def read(self) -> AppPersistenceState:
        return await asyncio.to_thread(self._read_sync)

    async def update(
        self,
        mutator: Callable[[AppPersistenceState], None | Awaitable[None]],
    ) -> AppPersistenceState:
        async with self._lock:
            current_state = await asyncio.to_thread(self._read_sync)
            result = mutator(current_state)

            if inspect.isawaitable(result):
                await result

            await asyncio.to_thread(self._write_sync, current_state)
            return current_state.model_copy(deep=True)

    def _read_sync(self) -> AppPersistenceState:
        try:
            raw_content = self.file_path.read_text(encoding="utf8")
        except FileNotFoundError:
            return AppPersistenceState()

        parsed_content = json.loads(raw_content)
        return AppPersistenceState.model_validate(parsed_content)

    def _write_sync(self, state: AppPersistenceState) -> None:
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        self.file_path.write_text(
            state.model_dump_json(indent=2),
            encoding="utf8",
        )

from __future__ import annotations

import asyncio
import json
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.modules.playback.models import Track


class DeezerMusicCatalogClient:
    def __init__(self) -> None:
        self.base_url = "https://api.deezer.com"

    async def search_tracks(self, query: str, limit: int) -> list[Track]:
        safe_limit = min(max(limit, 1), 10)
        query_string = urlencode(
            {
                "q": query,
                "limit": safe_limit,
                "output": "json",
            }
        )
        payload = await self._fetch_json(f"{self.base_url}/search?{query_string}")

        if isinstance(payload.get("error"), dict):
            raise RuntimeError(payload["error"].get("message") or "Unknown Deezer error")

        tracks: list[Track] = []
        for item in payload.get("data", []):
            tracks.append(
                Track(
                    id=item["id"],
                    title=item["title"],
                    artistName=item["artist"]["name"],
                    albumTitle=item["album"]["title"],
                    duration=item["duration"],
                    previewUrl=item.get("preview"),
                    deezerUrl=item["link"],
                    coverUrl=item["album"].get("cover_medium"),
                )
            )

        return tracks

    async def _fetch_json(self, url: str) -> dict[str, Any]:
        return await asyncio.to_thread(self._fetch_json_sync, url)

    def _fetch_json_sync(self, url: str) -> dict[str, Any]:
        request = Request(url, headers={"Accept": "application/json"})

        with urlopen(request, timeout=15) as response:
            if response.status < 200 or response.status >= 300:
                raise RuntimeError(f"Deezer search failed with status {response.status}")

            return json.loads(response.read().decode("utf8"))

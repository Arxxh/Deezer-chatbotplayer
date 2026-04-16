from __future__ import annotations

import asyncio
import json
import re
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.modules.playback.models import PlaybackSource, Track
from app.shared.text import normalize_text, normalize_title

NEGATIVE_TITLE_TERMS = [
    "live",
    "cover",
    "karaoke",
    "tribute",
    "slowed",
    "sped up",
    "nightcore",
    "8d",
    "reaction",
    "remix",
    "instrumental",
]


class YouTubePlaybackSourceResolver:
    def __init__(self, api_key: str | None) -> None:
        self.api_key = api_key
        self.api_base_url = "https://www.googleapis.com/youtube/v3"
        self._result_cache: dict[str, PlaybackSource | None] = {}

    async def resolve_track_source(self, track: Track) -> PlaybackSource | None:
        if not self.api_key:
            return None

        cache_key = self._build_cache_key(track)
        if cache_key in self._result_cache:
            return self._result_cache[cache_key]

        try:
            candidates = await self._search_candidates(track)
            best_candidate = self._select_best_candidate(track, candidates)
            self._result_cache[cache_key] = best_candidate
            return best_candidate
        except Exception:
            self._result_cache[cache_key] = None
            return None

    async def _search_candidates(self, track: Track) -> list[dict[str, Any]]:
        search_query = urlencode(
            {
                "part": "snippet",
                "q": f"{track.artistName} {track.title} official audio",
                "type": "video",
                "maxResults": 5,
                "order": "relevance",
                "videoCategoryId": "10",
                "videoEmbeddable": "true",
                "key": self.api_key or "",
            }
        )
        search_payload = await self._fetch_json(
            f"{self.api_base_url}/search?{search_query}"
        )
        video_ids = [
            item.get("id", {}).get("videoId")
            for item in search_payload.get("items", [])
            if item.get("id", {}).get("videoId")
        ][:5]

        if not video_ids:
            return []

        videos_query = urlencode(
            {
                "part": "snippet,contentDetails,status",
                "id": ",".join(video_ids),
                "key": self.api_key or "",
            }
        )
        videos_payload = await self._fetch_json(
            f"{self.api_base_url}/videos?{videos_query}"
        )

        return [
            {
                "videoId": item.get("id", ""),
                "title": item.get("snippet", {}).get("title", ""),
                "description": item.get("snippet", {}).get("description", ""),
                "channelTitle": item.get("snippet", {}).get("channelTitle", ""),
                "durationInSeconds": parse_iso_duration_to_seconds(
                    item.get("contentDetails", {}).get("duration", "")
                ),
                "embeddable": item.get("status", {}).get("embeddable", False),
            }
            for item in videos_payload.get("items", [])
        ]

    def _select_best_candidate(
        self, track: Track, candidates: list[dict[str, Any]]
    ) -> PlaybackSource | None:
        ranked_candidates = sorted(
            (
                {
                    "candidate": candidate,
                    "score": score_candidate(track, candidate),
                }
                for candidate in candidates
                if candidate.get("videoId") and candidate.get("embeddable")
            ),
            key=lambda item: item["score"],
            reverse=True,
        )

        best_match = ranked_candidates[0] if ranked_candidates else None
        if not best_match or best_match["score"] < 45:
            return None

        candidate = best_match["candidate"]
        return PlaybackSource(
            provider="youtube",
            videoId=candidate["videoId"],
            videoTitle=candidate["title"],
            channelTitle=candidate["channelTitle"],
            confidence=best_match["score"],
        )

    async def _fetch_json(self, url: str) -> dict[str, Any]:
        return await asyncio.to_thread(self._fetch_json_sync, url)

    def _fetch_json_sync(self, url: str) -> dict[str, Any]:
        request = Request(url, headers={"Accept": "application/json"})

        with urlopen(request, timeout=15) as response:
            if response.status < 200 or response.status >= 300:
                raise RuntimeError(
                    f"YouTube lookup failed with status {response.status}"
                )

            return json.loads(response.read().decode("utf8"))

    def _build_cache_key(self, track: Track) -> str:
        return f"{track.id}:{track.artistName}:{track.title}:{track.duration}"


def score_candidate(track: Track, candidate: dict[str, Any]) -> int:
    normalized_track_title = normalize_title(track.title)
    normalized_artist = normalize_text(track.artistName)
    normalized_candidate_title = normalize_text(candidate.get("title", ""))
    normalized_channel = normalize_text(candidate.get("channelTitle", ""))
    normalized_description = normalize_text(candidate.get("description", ""))

    if not normalized_candidate_title or not normalized_artist:
        return -100

    score = 0

    if (
        normalized_track_title in normalized_candidate_title
        or normalized_candidate_title in normalized_track_title
    ):
        score += 32

    if normalized_artist in normalized_candidate_title:
        score += 22

    if normalized_artist in normalized_channel:
        score += 18

    if (
        f"{normalized_artist} topic" in normalized_channel
        or f"{normalized_artist} - topic" in normalized_channel
    ):
        score += 18

    if "official audio" in normalized_candidate_title or "official video" in normalized_candidate_title:
        score += 12

    if "provided to youtube by" in normalized_description:
        score += 10

    duration_in_seconds = candidate.get("durationInSeconds")
    duration_difference = (
        abs(duration_in_seconds - track.duration)
        if isinstance(duration_in_seconds, int)
        else None
    )

    if duration_difference is not None:
        if duration_difference <= 4:
            score += 18
        elif duration_difference <= 8:
            score += 12
        elif duration_difference <= 15:
            score += 6
        elif duration_difference >= 45:
            score -= 18

    for term in NEGATIVE_TITLE_TERMS:
        if term in normalized_candidate_title or term in normalized_description:
            score -= 30

    return score


def parse_iso_duration_to_seconds(value: str) -> int | None:
    match = re.match(r"^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$", value)
    if not match:
        return None

    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds

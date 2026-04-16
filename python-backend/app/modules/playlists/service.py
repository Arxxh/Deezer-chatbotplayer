from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from app.integrations.deezer_client import DeezerMusicCatalogClient
from app.modules.chat.models import ChatCommandIntent, ChatResponse
from app.modules.playback.repository import FilePlaybackStateRepository
from app.modules.playback.service import PlaybackService
from app.modules.playlists.models import (
    PLAYLIST_TRACK_LIMIT,
    Playlist,
    PlaylistMutationResponse,
)
from app.modules.playlists.repository import FilePlaylistRepository

HELP_SUGGESTIONS = [
    "/play stronger kanye west",
    "/queue",
    "/nowplaying",
    "/pause",
    "/resume",
    "/skip",
    "/play playlist favoritas",
    "/playlist favoritas",
    "/playlist create favoritas",
    "/playlist delete favoritas",
]


class PlaylistService:
    def __init__(
        self,
        playlist_repository: FilePlaylistRepository,
        playback_repository: FilePlaybackStateRepository,
        deezer_client: DeezerMusicCatalogClient,
        playback_service: PlaybackService,
    ) -> None:
        self.playlist_repository = playlist_repository
        self.playback_repository = playback_repository
        self.deezer_client = deezer_client
        self.playback_service = playback_service

    async def list_playlists(self) -> list[Playlist]:
        return await self.playlist_repository.list()

    async def get_playlist(self, playlist_id: str) -> Playlist | None:
        return await self.playlist_repository.find_by_id(playlist_id)

    async def create_playlist(self, name: str) -> PlaylistMutationResponse:
        normalized_name = name.strip()
        if not normalized_name:
            raise ValueError("El nombre de la playlist es obligatorio.")

        existing_playlist = await self.playlist_repository.find_by_name(normalized_name)
        if existing_playlist:
            raise ValueError(f'Ya existe una playlist llamada "{normalized_name}".')

        now = current_iso_datetime()
        playlist = Playlist(
            id=str(uuid4()),
            name=normalized_name,
            tracks=[],
            createdAt=now,
            updatedAt=now,
        )
        await self.playlist_repository.save(playlist)

        return PlaylistMutationResponse(
            playlist=playlist,
            message=(
                f'Playlist "{playlist.name}" creada. '
                f"Límite: {PLAYLIST_TRACK_LIMIT} canciones."
            ),
        )

    async def add_track_to_playlist(
        self, playlist_id: str, query: str
    ) -> PlaylistMutationResponse:
        playlist = await self.playlist_repository.find_by_id(playlist_id)
        if not playlist:
            raise ValueError("La playlist no existe.")

        normalized_query = query.strip()
        if not normalized_query:
            raise ValueError("La búsqueda de canción es obligatoria.")

        if len(playlist.tracks) >= PLAYLIST_TRACK_LIMIT:
            raise ValueError(
                f'La playlist "{playlist.name}" ya alcanzó el límite de '
                f"{PLAYLIST_TRACK_LIMIT} canciones."
            )

        results = await self.deezer_client.search_tracks(normalized_query, 5)
        if not results:
            raise ValueError(f'No encontré resultados para "{normalized_query}".')

        selected_track = results[0]
        updated_playlist = playlist.model_copy(
            update={
                "tracks": [*playlist.tracks, selected_track],
                "updatedAt": current_iso_datetime(),
            },
            deep=True,
        )
        await self.playlist_repository.save(updated_playlist)

        return PlaylistMutationResponse(
            playlist=updated_playlist,
            message=(
                f'Añadí "{selected_track.title}" de {selected_track.artistName} '
                f'a "{updated_playlist.name}".'
            ),
        )

    async def delete_playlist(self, playlist_id: str) -> PlaylistMutationResponse:
        deleted_playlist = await self.playlist_repository.delete(playlist_id)
        if not deleted_playlist:
            raise ValueError("La playlist no existe.")

        return PlaylistMutationResponse(
            playlist=deleted_playlist,
            message=f'Playlist "{deleted_playlist.name}" eliminada.',
        )

    async def handle_intent(self, intent: ChatCommandIntent) -> ChatResponse:
        state = await self.playback_repository.get_state()

        if intent.playlistAction == "list":
            playlists = await self.list_playlists()

            if not playlists:
                return ChatResponse(
                    command="playlist",
                    reply="Todavía no hay playlists creadas.",
                    state=state,
                    alternatives=[],
                    suggestions=["/playlist create favoritas"],
                )

            reply = "Playlists disponibles:\n" + "\n".join(
                f"{index + 1}. {playlist.name} ({len(playlist.tracks)}/{PLAYLIST_TRACK_LIMIT})"
                for index, playlist in enumerate(playlists)
            )
            return ChatResponse(
                command="playlist",
                reply=reply,
                state=state,
                alternatives=[],
                suggestions=[
                    "/playlist show favoritas",
                    "/playlist add favoritas :: stronger kanye west",
                ],
            )

        if intent.playlistAction == "show":
            if not intent.playlistName:
                return await self._help_response(
                    "Usa /playlist show <nombre> para ver una playlist."
                )

            playlist = await self.playlist_repository.find_by_name(intent.playlistName)
            if not playlist:
                return ChatResponse(
                    command="playlist",
                    reply=f'No encontré una playlist llamada "{intent.playlistName}".',
                    state=state,
                    alternatives=[],
                    suggestions=["/playlist list", "/playlist create favoritas"],
                )

            track_text = (
                " | ".join(
                    f"{index + 1}. {track.title} - {track.artistName}"
                    for index, track in enumerate(playlist.tracks)
                )
                if playlist.tracks
                else "sin canciones"
            )
            total_duration = format_playlist_duration(sum_track_durations(playlist))

            return ChatResponse(
                command="playlist",
                reply=(
                    f'Playlist "{playlist.name}" '
                    f"({len(playlist.tracks)}/{PLAYLIST_TRACK_LIMIT} · duración total: "
                    f"{total_duration}): {track_text}."
                ),
                state=state,
                alternatives=[],
                suggestions=[
                    f"/playlist add {playlist.name} :: daft punk",
                    f"/playlist delete {playlist.name}",
                ],
            )

        if intent.playlistAction == "play":
            if not intent.playlistName:
                return await self._help_response(
                    "Usa /playlist <nombre> para reproducir una playlist creada."
                )

            playlist = await self.playlist_repository.find_by_name(intent.playlistName)
            if not playlist:
                return ChatResponse(
                    command="playlist",
                    reply=f'No encontré una playlist llamada "{intent.playlistName}".',
                    state=state,
                    alternatives=[],
                    suggestions=["/playlist list", "/playlist create favoritas"],
                )

            return await self.playback_service.play_playlist(playlist.name)

        if intent.playlistAction == "delete":
            if not intent.playlistName:
                return await self._help_response(
                    "Usa /playlist delete <nombre> para eliminar una playlist."
                )

            playlist = await self.playlist_repository.find_by_name(intent.playlistName)
            if not playlist:
                return ChatResponse(
                    command="playlist",
                    reply=f'No encontré una playlist llamada "{intent.playlistName}".',
                    state=state,
                    alternatives=[],
                    suggestions=["/playlist list", "/playlist create favoritas"],
                )

            try:
                response = await self.delete_playlist(playlist.id)
                return ChatResponse(
                    command="playlist",
                    reply=response.message,
                    state=state,
                    alternatives=[],
                    suggestions=["/playlist list", "/playlist create favoritas"],
                )
            except Exception as error:
                return ChatResponse(
                    command="playlist",
                    reply=str(error) or "No pude eliminar la playlist.",
                    state=state,
                    alternatives=[],
                    suggestions=["/playlist list", f"/playlist show {playlist.name}"],
                )

        if intent.playlistAction == "create":
            if not intent.playlistName:
                return await self._help_response(
                    "Usa /playlist create <nombre> para crear una playlist."
                )

            try:
                response = await self.create_playlist(intent.playlistName)
                return ChatResponse(
                    command="playlist",
                    reply=response.message,
                    state=state,
                    alternatives=[],
                    suggestions=[
                        f"/playlist add {response.playlist.name} :: stronger kanye west",
                        f"/playlist delete {response.playlist.name}",
                        "/playlist list",
                    ],
                )
            except Exception as error:
                return ChatResponse(
                    command="playlist",
                    reply=str(error) or "No pude crear la playlist.",
                    state=state,
                    alternatives=[],
                    suggestions=["/playlist create favoritas", "/playlist list"],
                )

        if intent.playlistAction == "add":
            if not intent.playlistName or not intent.playlistQuery:
                return await self._help_response(
                    "Usa /playlist add <playlist> :: <búsqueda> para agregar canciones."
                )

            playlist = await self.playlist_repository.find_by_name(intent.playlistName)
            if not playlist:
                return ChatResponse(
                    command="playlist",
                    reply=f'No encontré una playlist llamada "{intent.playlistName}".',
                    state=state,
                    alternatives=[],
                    suggestions=["/playlist list", "/playlist create favoritas"],
                )

            try:
                response = await self.add_track_to_playlist(
                    playlist.id, intent.playlistQuery
                )
                return ChatResponse(
                    command="playlist",
                    reply=response.message,
                    state=state,
                    alternatives=[
                        track.model_copy(deep=True)
                        for track in response.playlist.tracks[-3:][::-1]
                    ],
                    suggestions=[
                        f"/playlist show {response.playlist.name}",
                        f"/playlist add {response.playlist.name} :: around the world",
                        f"/playlist delete {response.playlist.name}",
                    ],
                )
            except Exception as error:
                return ChatResponse(
                    command="playlist",
                    reply=str(error) or "No pude agregar la canción a la playlist.",
                    state=state,
                    alternatives=[],
                    suggestions=[
                        f"/playlist show {playlist.name}",
                        f"/playlist add {playlist.name} :: stronger kanye west",
                        f"/playlist delete {playlist.name}",
                    ],
                )

        return await self._help_response(
            "Comandos playlist: /playlist list, /playlist <nombre>, /playlist create <nombre>, /playlist show <nombre>, /playlist add <playlist> :: <canción>, /playlist delete <nombre>."
        )

    async def _help_response(self, custom_reply: str) -> ChatResponse:
        state = await self.playback_repository.get_state()
        return ChatResponse(
            command="help",
            reply=custom_reply,
            state=state,
            alternatives=[],
            suggestions=HELP_SUGGESTIONS,
        )


def current_iso_datetime() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sum_track_durations(playlist: Playlist) -> int:
    total_duration = 0

    for track in playlist.tracks:
        if isinstance(track.duration, int) and track.duration > 0:
            total_duration += track.duration

    return total_duration


def format_playlist_duration(total_duration_seconds: int) -> str:
    if total_duration_seconds <= 0:
        return "0 min"

    hours = total_duration_seconds // 3600
    minutes = (total_duration_seconds % 3600) // 60
    seconds = total_duration_seconds % 60
    parts: list[str] = []

    if hours > 0:
        parts.append(f"{hours} h")

    if minutes > 0 or hours > 0:
        parts.append(f"{minutes} min")

    if seconds > 0 and hours == 0:
        parts.append(f"{seconds} s")

    return " ".join(parts)

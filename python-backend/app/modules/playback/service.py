from __future__ import annotations

from app.integrations.deezer_client import DeezerMusicCatalogClient
from app.integrations.youtube_client import YouTubePlaybackSourceResolver
from app.modules.chat.models import ChatResponse
from app.modules.playback.models import PlaybackState, Track
from app.modules.playback.repository import FilePlaybackStateRepository
from app.modules.playlists.repository import FilePlaylistRepository

PLAYLIST_PLAY_PREFIX = "playlist "


class PlaybackService:
    def __init__(
        self,
        deezer_client: DeezerMusicCatalogClient,
        youtube_resolver: YouTubePlaybackSourceResolver,
        playback_repository: FilePlaybackStateRepository,
        playlist_repository: FilePlaylistRepository,
    ) -> None:
        self.deezer_client = deezer_client
        self.youtube_resolver = youtube_resolver
        self.playback_repository = playback_repository
        self.playlist_repository = playlist_repository

    async def get_state(self) -> PlaybackState:
        return await self.playback_repository.get_state()

    async def play(self, query: str | None = None) -> ChatResponse:
        normalized_query = (query or "").strip()
        state = await self.playback_repository.get_state()

        if not normalized_query:
            return ChatResponse(
                command="play",
                reply="Necesito una búsqueda. Ejemplo: /play stronger kanye west",
                state=state,
                alternatives=[],
                suggestions=["/play stronger kanye west", "pon around the world"],
            )

        explicit_playlist_name = self._extract_explicit_playlist_name(normalized_query)
        if explicit_playlist_name is not None:
            return await self.play_playlist(explicit_playlist_name)

        matching_playlist = await self.playlist_repository.find_by_name(normalized_query)

        try:
            results = await self.deezer_client.search_tracks(normalized_query, 5)
        except Exception:
            return ChatResponse(
                command="play",
                reply="No pude consultar Deezer en este momento. Intenta de nuevo en unos segundos.",
                state=state,
                alternatives=[],
                suggestions=["/play stronger kanye west", "/help"],
            )

        if not results:
            if matching_playlist:
                return ChatResponse(
                    command="play",
                    reply=(
                        f'No encontré una canción para "{normalized_query}", pero sí existe tu '
                        f'playlist "{matching_playlist.name}". Usa /play playlist '
                        f"{matching_playlist.name} si quieres reproducirla completa."
                    ),
                    state=state,
                    alternatives=[],
                    suggestions=[
                        f"/play playlist {matching_playlist.name}",
                        f"/playlist {matching_playlist.name}",
                    ],
                )

            return ChatResponse(
                command="play",
                reply=f'No encontré resultados para "{normalized_query}".',
                state=state,
                alternatives=[],
                suggestions=["/play daft punk", "/play kanye west stronger"],
            )

        selected_track = await self._attach_playback_source(results[0])
        next_state = PlaybackState(current=selected_track, queue=[], isPaused=False)
        await self.playback_repository.save_state(next_state)

        playlist_recommendation = (
            f" Si querías reproducir tu playlist creada, usa /play playlist {matching_playlist.name}."
            if matching_playlist
            else ""
        )

        return ChatResponse(
            command="play",
            reply=(
                f'Reproduciendo "{selected_track.title}" de {selected_track.artistName}.'
                f"{playlist_recommendation}"
            ),
            state=next_state,
            alternatives=[track.model_copy(deep=True) for track in results[1:4]],
            suggestions=(
                [
                    "/queue",
                    f"/play playlist {matching_playlist.name}",
                    f"/playlist {matching_playlist.name}",
                ]
                if matching_playlist
                else ["/queue", "/nowplaying", "/skip"]
            ),
        )

    async def play_playlist(self, playlist_name: str | None = None) -> ChatResponse:
        normalized_playlist_name = (playlist_name or "").strip()
        state = await self.playback_repository.get_state()

        if not normalized_playlist_name:
            return ChatResponse(
                command="play",
                reply="Necesito el nombre de la playlist. Ejemplo: /play playlist favoritas",
                state=state,
                alternatives=[],
                suggestions=["/play playlist favoritas", "/playlist list"],
            )

        playlist = await self.playlist_repository.find_by_name(normalized_playlist_name)
        if not playlist:
            return ChatResponse(
                command="play",
                reply=f'No encontré una playlist llamada "{normalized_playlist_name}".',
                state=state,
                alternatives=[],
                suggestions=["/playlist list", "/playlist create favoritas"],
            )

        if not playlist.tracks:
            return ChatResponse(
                command="play",
                reply=f'La playlist "{playlist.name}" no tiene canciones todavía.',
                state=state,
                alternatives=[],
                suggestions=[
                    f"/playlist add {playlist.name} :: stronger kanye west",
                    f"/playlist show {playlist.name}",
                ],
            )

        tracks_with_playback_source = [
            await self._attach_playback_source(track) for track in playlist.tracks
        ]
        current_track = tracks_with_playback_source[0]
        queue = tracks_with_playback_source[1:]
        next_state = PlaybackState(current=current_track, queue=queue, isPaused=False)
        await self.playback_repository.save_state(next_state)

        return ChatResponse(
            command="play",
            reply=(
                f'Reproduciendo la playlist "{playlist.name}". '
                f"Cargué {len(tracks_with_playback_source)} canciones."
            ),
            state=next_state,
            alternatives=[],
            suggestions=["/queue", "/skip", f"/playlist show {playlist.name}"],
        )

    async def pause(self) -> ChatResponse:
        state = await self.playback_repository.get_state()

        if not state.current:
            return ChatResponse(
                command="pause",
                reply="No hay una canción activa para pausar.",
                state=state,
                alternatives=[],
                suggestions=["/play one more time"],
            )

        if state.isPaused:
            return ChatResponse(
                command="pause",
                reply="La reproducción ya estaba en pausa.",
                state=state,
                alternatives=[],
                suggestions=["/resume", "/queue"],
            )

        next_state = state.model_copy(update={"isPaused": True}, deep=True)
        await self.playback_repository.save_state(next_state)

        return ChatResponse(
            command="pause",
            reply=f'Pausé "{state.current.title}" de {state.current.artistName}.',
            state=next_state,
            alternatives=[],
            suggestions=["/resume", "/skip", "/queue"],
        )

    async def resume(self) -> ChatResponse:
        state = await self.playback_repository.get_state()

        if not state.current:
            return ChatResponse(
                command="resume",
                reply="No hay una canción activa para reanudar.",
                state=state,
                alternatives=[],
                suggestions=["/play one more time"],
            )

        if not state.isPaused:
            return ChatResponse(
                command="resume",
                reply="La reproducción ya estaba activa.",
                state=state,
                alternatives=[],
                suggestions=["/pause", "/queue"],
            )

        next_state = state.model_copy(update={"isPaused": False}, deep=True)
        await self.playback_repository.save_state(next_state)

        return ChatResponse(
            command="resume",
            reply=f'Reanudé "{state.current.title}" de {state.current.artistName}.',
            state=next_state,
            alternatives=[],
            suggestions=["/pause", "/skip", "/nowplaying"],
        )

    async def skip(self) -> ChatResponse:
        state = await self.playback_repository.get_state()

        if not state.current:
            return ChatResponse(
                command="skip",
                reply="No hay canción actual para saltar.",
                state=state,
                alternatives=[],
                suggestions=["/play daft punk"],
            )

        next_track = state.queue[0] if state.queue else None
        remaining_queue = state.queue[1:] if len(state.queue) > 1 else []
        next_state = PlaybackState(
            current=next_track.model_copy(deep=True) if next_track else None,
            queue=[track.model_copy(deep=True) for track in remaining_queue],
            isPaused=False,
        )
        await self.playback_repository.save_state(next_state)

        if not next_track:
            return ChatResponse(
                command="skip",
                reply=f'Salté "{state.current.title}". La cola quedó vacía.',
                state=next_state,
                alternatives=[],
                suggestions=["/play one more time", "/help"],
            )

        return ChatResponse(
            command="skip",
            reply=(
                f'Salté "{state.current.title}". Ahora sigue "{next_track.title}" '
                f"de {next_track.artistName}."
            ),
            state=next_state,
            alternatives=[],
            suggestions=["/queue", "/nowplaying", "/skip"],
        )

    async def get_queue(self) -> ChatResponse:
        state = await self.playback_repository.get_state()

        if not state.current and not state.queue:
            return ChatResponse(
                command="queue",
                reply="La cola está vacía.",
                state=state,
                alternatives=[],
                suggestions=["/play blinding lights", "/help"],
            )

        current_text = (
            f'Actual: "{state.current.title}" de {state.current.artistName}.'
            if state.current
            else "No hay canción actual."
        )
        queue_text = (
            " Próximas: "
            + " | ".join(
                f"{index + 1}. {track.title} - {track.artistName}"
                for index, track in enumerate(state.queue)
            )
            if state.queue
            else " No hay más canciones en cola."
        )

        return ChatResponse(
            command="queue",
            reply=f"{current_text}{queue_text}",
            state=state,
            alternatives=[],
            suggestions=["/play around the world", "/skip", "/nowplaying"],
        )

    async def get_now_playing(self) -> ChatResponse:
        state = await self.playback_repository.get_state()

        if not state.current:
            return ChatResponse(
                command="nowplaying",
                reply="No hay ninguna canción seleccionada todavía.",
                state=state,
                alternatives=[],
                suggestions=[
                    "/play daft punk harder better faster stronger",
                    "/queue",
                ],
            )

        status = "en pausa" if state.isPaused else "sonando"
        return ChatResponse(
            command="nowplaying",
            reply=f'Ahora {status}: "{state.current.title}" de {state.current.artistName}.',
            state=state,
            alternatives=[],
            suggestions=["/pause", "/resume", "/skip", "/queue"],
        )

    async def _attach_playback_source(self, track: Track) -> Track:
        try:
            playback_source = await self.youtube_resolver.resolve_track_source(track)
            return track.model_copy(update={"playbackSource": playback_source}, deep=True)
        except Exception:
            return track.model_copy(update={"playbackSource": None}, deep=True)

    def _extract_explicit_playlist_name(self, query: str) -> str | None:
        normalized_query = query.lower()

        if normalized_query == "playlist":
            return ""

        if not normalized_query.startswith(PLAYLIST_PLAY_PREFIX):
            return None

        return query[len(PLAYLIST_PLAY_PREFIX) :].strip()

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.deps import get_playlist_service
from app.modules.playlists.models import Playlist, PlaylistMutationResponse
from app.modules.playlists.schemas import AddPlaylistTrackRequest, CreatePlaylistRequest
from app.modules.playlists.service import PlaylistService
from app.shared.exceptions import ApiException

router = APIRouter(prefix="/playlists", tags=["playlists"])


@router.get("", response_model=list[Playlist])
async def list_playlists(
    service: PlaylistService = Depends(get_playlist_service),
) -> list[Playlist]:
    return await service.list_playlists()


@router.get("/{playlist_id}", response_model=Playlist)
async def get_playlist(
    playlist_id: str,
    service: PlaylistService = Depends(get_playlist_service),
) -> Playlist:
    playlist = await service.get_playlist(playlist_id)
    if not playlist:
        raise ApiException("Playlist no encontrada.", status_code=404)

    return playlist


@router.post("", response_model=PlaylistMutationResponse)
async def create_playlist(
    payload: CreatePlaylistRequest,
    service: PlaylistService = Depends(get_playlist_service),
) -> PlaylistMutationResponse:
    try:
        return await service.create_playlist(payload.name)
    except ValueError as error:
        raise ApiException(str(error), status_code=400) from error


@router.post("/{playlist_id}/tracks", response_model=PlaylistMutationResponse)
async def add_track_to_playlist(
    playlist_id: str,
    payload: AddPlaylistTrackRequest,
    service: PlaylistService = Depends(get_playlist_service),
) -> PlaylistMutationResponse:
    try:
        return await service.add_track_to_playlist(playlist_id, payload.query)
    except ValueError as error:
        status_code = 404 if str(error) == "La playlist no existe." else 400
        raise ApiException(str(error), status_code=status_code) from error


@router.delete("/{playlist_id}", response_model=PlaylistMutationResponse)
async def delete_playlist(
    playlist_id: str,
    service: PlaylistService = Depends(get_playlist_service),
) -> PlaylistMutationResponse:
    try:
        return await service.delete_playlist(playlist_id)
    except ValueError as error:
        status_code = 404 if str(error) == "La playlist no existe." else 400
        raise ApiException(str(error), status_code=status_code) from error

import type {
  Playlist,
  PlaylistMutationResponse,
} from '@/modules/playlists/domain/playlist';
import { apiRequest } from '@/shared/infrastructure/api/api-client';

export function listPlaylists() {
  return apiRequest<Playlist[]>('/playlists');
}

export function getPlaylist(playlistId: string) {
  return apiRequest<Playlist>(`/playlists/${playlistId}`);
}

export function createPlaylist(name: string) {
  return apiRequest<PlaylistMutationResponse>('/playlists', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function addTrackToPlaylist(playlistId: string, query: string) {
  return apiRequest<PlaylistMutationResponse>(`/playlists/${playlistId}/tracks`, {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

export function deletePlaylist(playlistId: string) {
  return apiRequest<PlaylistMutationResponse>(`/playlists/${playlistId}`, {
    method: 'DELETE',
  });
}

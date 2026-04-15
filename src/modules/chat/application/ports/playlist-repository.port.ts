import { Playlist } from '../../domain/entities/playlist';

export const PLAYLIST_REPOSITORY_PORT = Symbol('PLAYLIST_REPOSITORY_PORT');

// Puerto de persistencia de playlists.
// La aplicacion no necesita saber si la playlist vive en JSON, SQL o Redis.
export interface PlaylistRepositoryPort {
  list(): Promise<Playlist[]>;
  findById(playlistId: string): Promise<Playlist | null>;
  findByName(name: string): Promise<Playlist | null>;
  save(playlist: Playlist): Promise<void>;
  delete(playlistId: string): Promise<Playlist | null>;
}

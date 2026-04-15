import { Playlist } from '../../domain/entities/playlist';

export interface PlaylistResponse {
  playlist: Playlist;
  message: string;
}

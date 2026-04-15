import { Track } from './track';

export const PLAYLIST_TRACK_LIMIT = 10;

// Una playlist es una coleccion persistente y limitada de canciones.
export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: string;
  updatedAt: string;
}

import { PlaybackSource } from './playback-source';

export interface Track {
  id: number;
  title: string;
  artistName: string;
  albumTitle: string;
  duration: number;
  previewUrl: string | null;
  deezerUrl: string;
  coverUrl: string | null;
  playbackSource?: PlaybackSource | null;
}

// definicion de una cancion para el sistema. esto es track o una cancion...

import { PlaybackState } from '../../domain/entities/playback-state';

export const PLAYBACK_STATE_PORT = Symbol('PLAYBACK_STATE_PORT');

// Puerto de persistencia del estado de reproduccion.
// Hoy vive en memoria; manana podria vivir en Redis o Postgres.
export interface PlaybackStatePort {
  getState(): Promise<PlaybackState>;
  saveState(state: PlaybackState): Promise<void>;
}

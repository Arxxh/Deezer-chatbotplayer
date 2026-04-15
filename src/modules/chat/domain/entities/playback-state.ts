import { Track } from './track';

export interface PlaybackState {
  current: Track | null;
  queue: Track[];
  isPaused: boolean;
}
//  (Defencion) esto es un playback state para el sistema: "actual", "cola de repro", y si esta "pausado" o no...

export function createEmptyPlaybackState(): PlaybackState {
  return {
    current: null,
    queue: [],
    isPaused: false,
  };
}

// reproduccion vacio (normalmente se inicia asi un reproductor)
// esta funcion regresa eso para incializar el reproductor

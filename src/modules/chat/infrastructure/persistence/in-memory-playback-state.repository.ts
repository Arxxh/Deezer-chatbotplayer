import { Injectable } from '@nestjs/common';
import { PlaybackStatePort } from '../../application/ports/playback-state.port';
import {
  createEmptyPlaybackState,
  PlaybackState,
} from '../../domain/entities/playback-state';
import { Track } from '../../domain/entities/track';

@Injectable()
export class InMemoryPlaybackStateRepository implements PlaybackStatePort {
  // Estado efimero: ideal para MVP y pruebas locales.
  // Se pierde al reiniciar el proceso.
  private state: PlaybackState = createEmptyPlaybackState();

  getState(): Promise<PlaybackState> {
    return Promise.resolve(cloneState(this.state));
  }

  saveState(state: PlaybackState): Promise<void> {
    this.state = cloneState(state);
    return Promise.resolve();
  }
}

function cloneState(state: PlaybackState): PlaybackState {
  return {
    current: state.current ? cloneTrack(state.current) : null,
    queue: state.queue.map((track) => cloneTrack(track)),
    isPaused: state.isPaused,
  };
}

function cloneTrack(track: Track): Track {
  return {
    ...track,
    playbackSource: track.playbackSource ? { ...track.playbackSource } : null,
  };
}

import { Injectable } from '@nestjs/common';
import { PlaybackStatePort } from '../../application/ports/playback-state.port';
import { PlaybackState } from '../../domain/entities/playback-state';
import { Track } from '../../domain/entities/track';
import { FileAppStateStore } from './file-app-state.store';

@Injectable()
export class FilePlaybackStateRepository implements PlaybackStatePort {
  constructor(private readonly fileAppStateStore: FileAppStateStore) {}

  async getState(): Promise<PlaybackState> {
    const state = await this.fileAppStateStore.read();
    return clonePlaybackState(state.playbackState);
  }

  async saveState(playbackState: PlaybackState): Promise<void> {
    await this.fileAppStateStore.update((state) => {
      state.playbackState = clonePlaybackState(playbackState);
    });
  }
}

function clonePlaybackState(state: PlaybackState): PlaybackState {
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

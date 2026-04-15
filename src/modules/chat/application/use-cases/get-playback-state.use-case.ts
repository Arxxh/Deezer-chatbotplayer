import { Inject, Injectable } from '@nestjs/common';
import { PlaybackState } from '../../domain/entities/playback-state';
import { PLAYBACK_STATE_PORT } from '../ports/playback-state.port';
import type { PlaybackStatePort } from '../ports/playback-state.port';

@Injectable()
export class GetPlaybackStateUseCase {
  constructor(
    @Inject(PLAYBACK_STATE_PORT)
    private readonly playbackStatePort: PlaybackStatePort,
  ) {}

  execute(): Promise<PlaybackState> {
    return this.playbackStatePort.getState();
  }
}

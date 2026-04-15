import { Inject, Injectable } from '@nestjs/common';
import { ChatResponse } from '../contracts/chat-response';
import { PLAYBACK_STATE_PORT } from '../ports/playback-state.port';
import type { PlaybackStatePort } from '../ports/playback-state.port';

@Injectable()
export class SkipTrackUseCase {
  constructor(
    @Inject(PLAYBACK_STATE_PORT)
    private readonly playbackStatePort: PlaybackStatePort,
  ) {}

  async execute(): Promise<ChatResponse> {
    const state = await this.playbackStatePort.getState();

    if (!state.current) {
      return {
        command: 'skip',
        reply: 'No hay canción actual para saltar.',
        state,
        alternatives: [],
        suggestions: ['/play daft punk'],
      };
    }

    const [nextTrack, ...remainingQueue] = state.queue;
    const nextState = {
      current: nextTrack ?? null,
      queue: remainingQueue,
      isPaused: false,
    };

    await this.playbackStatePort.saveState(nextState);

    if (!nextTrack) {
      return {
        command: 'skip',
        reply: `Salté "${state.current.title}". La cola quedó vacía.`,
        state: nextState,
        alternatives: [],
        suggestions: ['/play one more time', '/help'],
      };
    }

    return {
      command: 'skip',
      reply: `Salté "${state.current.title}". Ahora sigue "${nextTrack.title}" de ${nextTrack.artistName}.`,
      state: nextState,
      alternatives: [],
      suggestions: ['/queue', '/nowplaying', '/skip'],
    };
  }
}

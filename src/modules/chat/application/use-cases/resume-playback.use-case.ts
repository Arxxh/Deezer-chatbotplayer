import { Inject, Injectable } from '@nestjs/common';
import { ChatResponse } from '../contracts/chat-response';
import { PLAYBACK_STATE_PORT } from '../ports/playback-state.port';
import type { PlaybackStatePort } from '../ports/playback-state.port';

@Injectable()
export class ResumePlaybackUseCase {
  constructor(
    @Inject(PLAYBACK_STATE_PORT)
    private readonly playbackStatePort: PlaybackStatePort,
  ) {}

  async execute(): Promise<ChatResponse> {
    const state = await this.playbackStatePort.getState();

    if (!state.current) {
      return {
        command: 'resume',
        reply: 'No hay una canción activa para reanudar.',
        state,
        alternatives: [],
        suggestions: ['/play one more time'],
      };
    }

    if (!state.isPaused) {
      return {
        command: 'resume',
        reply: 'La reproducción ya estaba activa.',
        state,
        alternatives: [],
        suggestions: ['/pause', '/queue'],
      };
    }

    const nextState = {
      ...state,
      isPaused: false,
    };

    await this.playbackStatePort.saveState(nextState);

    return {
      command: 'resume',
      reply: `Reanudé "${state.current.title}" de ${state.current.artistName}.`,
      state: nextState,
      alternatives: [],
      suggestions: ['/pause', '/skip', '/nowplaying'],
    };
  }
}

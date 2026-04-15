import { Inject, Injectable } from '@nestjs/common';
import { ChatResponse } from '../contracts/chat-response';
import { PLAYBACK_STATE_PORT } from '../ports/playback-state.port';
import type { PlaybackStatePort } from '../ports/playback-state.port';

@Injectable()
export class PausePlaybackUseCase {
  constructor(
    @Inject(PLAYBACK_STATE_PORT)
    private readonly playbackStatePort: PlaybackStatePort,
  ) {}

  async execute(): Promise<ChatResponse> {
    const state = await this.playbackStatePort.getState();

    if (!state.current) {
      return {
        command: 'pause',
        reply: 'No hay una canción activa para pausar.',
        state,
        alternatives: [],
        suggestions: ['/play one more time'],
      };
    }

    if (state.isPaused) {
      return {
        command: 'pause',
        reply: 'La reproducción ya estaba en pausa.',
        state,
        alternatives: [],
        suggestions: ['/resume', '/queue'],
      };
    }

    const nextState = {
      ...state,
      isPaused: true,
    };

    await this.playbackStatePort.saveState(nextState);

    return {
      command: 'pause',
      reply: `Pausé "${state.current.title}" de ${state.current.artistName}.`,
      state: nextState,
      alternatives: [],
      suggestions: ['/resume', '/skip', '/queue'],
    };
  }
}

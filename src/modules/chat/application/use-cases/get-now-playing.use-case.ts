import { Inject, Injectable } from '@nestjs/common';
import { ChatResponse } from '../contracts/chat-response';
import { PLAYBACK_STATE_PORT } from '../ports/playback-state.port';
import type { PlaybackStatePort } from '../ports/playback-state.port';

@Injectable()
export class GetNowPlayingUseCase {
  constructor(
    @Inject(PLAYBACK_STATE_PORT)
    private readonly playbackStatePort: PlaybackStatePort,
  ) {}

  async execute(): Promise<ChatResponse> {
    const state = await this.playbackStatePort.getState();

    if (!state.current) {
      return {
        command: 'nowplaying',
        reply: 'No hay ninguna canción seleccionada todavía.',
        state,
        alternatives: [],
        suggestions: [
          '/play daft punk harder better faster stronger',
          '/queue',
        ],
      };
    }

    const status = state.isPaused ? 'en pausa' : 'sonando';

    return {
      command: 'nowplaying',
      reply: `Ahora ${status}: "${state.current.title}" de ${state.current.artistName}.`,
      state,
      alternatives: [],
      suggestions: ['/pause', '/resume', '/skip', '/queue'],
    };
  }
}

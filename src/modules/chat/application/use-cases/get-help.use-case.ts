import { Inject, Injectable } from '@nestjs/common';
import { ChatResponse } from '../contracts/chat-response';
import { PLAYBACK_STATE_PORT } from '../ports/playback-state.port';
import type { PlaybackStatePort } from '../ports/playback-state.port';

@Injectable()
export class GetHelpUseCase {
  constructor(
    @Inject(PLAYBACK_STATE_PORT)
    private readonly playbackStatePort: PlaybackStatePort,
  ) {}

  async execute(
    customReply = 'Estos son los comandos disponibles para el chat musical.',
  ): Promise<ChatResponse> {
    const state = await this.playbackStatePort.getState();

    return {
      command: 'help',
      reply: customReply,
      state,
      alternatives: [],
      suggestions: [
        '/play stronger kanye west',
        '/queue',
        '/nowplaying',
        '/pause',
        '/resume',
        '/skip',
        '/play playlist favoritas',
        '/playlist favoritas',
        '/playlist create favoritas',
        '/playlist delete favoritas',
      ],
    };
  }
}

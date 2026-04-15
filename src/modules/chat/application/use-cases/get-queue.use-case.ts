import { Inject, Injectable } from '@nestjs/common';
import { ChatResponse } from '../contracts/chat-response';
import { PLAYBACK_STATE_PORT } from '../ports/playback-state.port';
import type { PlaybackStatePort } from '../ports/playback-state.port';

@Injectable()
export class GetQueueUseCase {
  constructor(
    @Inject(PLAYBACK_STATE_PORT)
    private readonly playbackStatePort: PlaybackStatePort,
  ) {}

  async execute(): Promise<ChatResponse> {
    const state = await this.playbackStatePort.getState();

    if (!state.current && state.queue.length === 0) {
      return {
        command: 'queue',
        reply: 'La cola está vacía.',
        state,
        alternatives: [],
        suggestions: ['/play blinding lights', '/help'],
      };
    }

    const currentText = state.current
      ? `Actual: "${state.current.title}" de ${state.current.artistName}.`
      : 'No hay canción actual.';
    const queueText =
      state.queue.length > 0
        ? ` Próximas: ${state.queue
            .map(
              (track, index) =>
                `${index + 1}. ${track.title} - ${track.artistName}`,
            )
            .join(' | ')}`
        : ' No hay más canciones en cola.';

    return {
      command: 'queue',
      reply: `${currentText}${queueText}`,
      state,
      alternatives: [],
      suggestions: ['/play around the world', '/skip', '/nowplaying'],
    };
  }
}

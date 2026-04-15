import { Injectable } from '@nestjs/common';
import { ChatResponse } from '../contracts/chat-response';
import { ChatCommandParserService } from '../services/chat-command-parser.service';
import { GetHelpUseCase } from './get-help.use-case';
import { GetNowPlayingUseCase } from './get-now-playing.use-case';
import { GetQueueUseCase } from './get-queue.use-case';
import { HandlePlaylistCommandUseCase } from './handle-playlist-command.use-case';
import { PausePlaybackUseCase } from './pause-playback.use-case';
import { PlayTrackUseCase } from './play-track.use-case';
import { ResumePlaybackUseCase } from './resume-playback.use-case';
import { SkipTrackUseCase } from './skip-track.use-case';

@Injectable()
export class HandleChatMessageUseCase {
  constructor(
    private readonly parser: ChatCommandParserService,
    private readonly playTrackUseCase: PlayTrackUseCase,
    private readonly pausePlaybackUseCase: PausePlaybackUseCase,
    private readonly resumePlaybackUseCase: ResumePlaybackUseCase,
    private readonly skipTrackUseCase: SkipTrackUseCase,
    private readonly getQueueUseCase: GetQueueUseCase,
    private readonly getNowPlayingUseCase: GetNowPlayingUseCase,
    private readonly handlePlaylistCommandUseCase: HandlePlaylistCommandUseCase,
    private readonly getHelpUseCase: GetHelpUseCase,
  ) {}

  async execute(message: string): Promise<ChatResponse> {
    // Punto de entrada unico para el chat: parsea la intencion
    // y deriva al caso de uso correspondiente.
    const intent = await this.parser.parse(message);

    switch (intent.command) {
      case 'play':
        return this.playTrackUseCase.execute(intent.query);
      case 'pause':
        return this.pausePlaybackUseCase.execute();
      case 'resume':
        return this.resumePlaybackUseCase.execute();
      case 'skip':
        return this.skipTrackUseCase.execute();
      case 'queue':
        return this.getQueueUseCase.execute();
      case 'nowplaying':
        return this.getNowPlayingUseCase.execute();
      case 'help':
        return this.getHelpUseCase.execute();
      case 'playlist':
        return this.handlePlaylistCommandUseCase.execute(intent);
      case 'unknown':
      default:
        return this.getHelpUseCase.execute(
          'No entendí ese comando. Prueba /play, /queue, /playlist o /help.',
        );
    }
  }
}

import { Module } from '@nestjs/common';
import { MUSIC_CATALOG_PORT } from './application/ports/music-catalog.port';
import { PLAYBACK_SOURCE_RESOLVER_PORT } from './application/ports/playback-source-resolver.port';
import { PLAYBACK_STATE_PORT } from './application/ports/playback-state.port';
import { PLAYLIST_REPOSITORY_PORT } from './application/ports/playlist-repository.port';
import { ChatCommandParserService } from './application/services/chat-command-parser.service';
import { AddTrackToPlaylistUseCase } from './application/use-cases/add-track-to-playlist.use-case';
import { CreatePlaylistUseCase } from './application/use-cases/create-playlist.use-case';
import { DeletePlaylistUseCase } from './application/use-cases/delete-playlist.use-case';
import { GetHelpUseCase } from './application/use-cases/get-help.use-case';
import { GetNowPlayingUseCase } from './application/use-cases/get-now-playing.use-case';
import { GetPlaybackStateUseCase } from './application/use-cases/get-playback-state.use-case';
import { GetPlaylistUseCase } from './application/use-cases/get-playlist.use-case';
import { GetQueueUseCase } from './application/use-cases/get-queue.use-case';
import { HandleChatMessageUseCase } from './application/use-cases/handle-chat-message.use-case';
import { HandlePlaylistCommandUseCase } from './application/use-cases/handle-playlist-command.use-case';
import { ListPlaylistsUseCase } from './application/use-cases/list-playlists.use-case';
import { PausePlaybackUseCase } from './application/use-cases/pause-playback.use-case';
import { PlayTrackUseCase } from './application/use-cases/play-track.use-case';
import { ResumePlaybackUseCase } from './application/use-cases/resume-playback.use-case';
import { SkipTrackUseCase } from './application/use-cases/skip-track.use-case';
import { DeezerMusicCatalogAdapter } from './infrastructure/deezer/deezer-music-catalog.adapter';
import { FileAppStateStore } from './infrastructure/persistence/file-app-state.store';
import { FilePlaybackStateRepository } from './infrastructure/persistence/file-playback-state.repository';
import { FilePlaylistRepository } from './infrastructure/persistence/file-playlist.repository';
import { InMemoryPlaybackStateRepository } from './infrastructure/persistence/in-memory-playback-state.repository';
import { YouTubePlaybackSourceResolverAdapter } from './infrastructure/youtube/youtube-playback-source-resolver.adapter';
import { ChatController } from './interfaces/http/chat.controller';
import { PlaylistsController } from './interfaces/http/playlists.controller';

@Module({
  controllers: [ChatController, PlaylistsController],
  providers: [
    // Servicios y casos de uso de la capa de aplicacion.
    ChatCommandParserService,
    HandleChatMessageUseCase,
    HandlePlaylistCommandUseCase,
    PlayTrackUseCase,
    PausePlaybackUseCase,
    ResumePlaybackUseCase,
    SkipTrackUseCase,
    GetQueueUseCase,
    GetNowPlayingUseCase,
    GetHelpUseCase,
    GetPlaybackStateUseCase,
    CreatePlaylistUseCase,
    DeletePlaylistUseCase,
    AddTrackToPlaylistUseCase,
    GetPlaylistUseCase,
    ListPlaylistsUseCase,
    // Adaptadores concretos de infraestructura.
    DeezerMusicCatalogAdapter,
    YouTubePlaybackSourceResolverAdapter,
    FileAppStateStore,
    FilePlaybackStateRepository,
    FilePlaylistRepository,
    InMemoryPlaybackStateRepository,
    // Aqui Nest conecta los puertos abstractos con implementaciones reales.
    {
      provide: MUSIC_CATALOG_PORT,
      useExisting: DeezerMusicCatalogAdapter,
    },
    {
      provide: PLAYBACK_STATE_PORT,
      useExisting: FilePlaybackStateRepository,
    },
    {
      provide: PLAYBACK_SOURCE_RESOLVER_PORT,
      useExisting: YouTubePlaybackSourceResolverAdapter,
    },
    {
      provide: PLAYLIST_REPOSITORY_PORT,
      useExisting: FilePlaylistRepository,
    },
  ],
})
export class ChatModule {}

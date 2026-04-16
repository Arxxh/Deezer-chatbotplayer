import { Inject, Injectable } from '@nestjs/common';
import { PLAYLIST_TRACK_LIMIT } from '../../domain/entities/playlist';
import type { Playlist } from '../../domain/entities/playlist';
import { ChatCommandIntent } from '../../domain/value-objects/chat-command';
import { ChatResponse } from '../contracts/chat-response';
import { PLAYBACK_STATE_PORT } from '../ports/playback-state.port';
import type { PlaybackStatePort } from '../ports/playback-state.port';
import { PLAYLIST_REPOSITORY_PORT } from '../ports/playlist-repository.port';
import type { PlaylistRepositoryPort } from '../ports/playlist-repository.port';
import { AddTrackToPlaylistUseCase } from './add-track-to-playlist.use-case';
import { CreatePlaylistUseCase } from './create-playlist.use-case';
import { DeletePlaylistUseCase } from './delete-playlist.use-case';
import { GetHelpUseCase } from './get-help.use-case';
import { ListPlaylistsUseCase } from './list-playlists.use-case';
import { PlayTrackUseCase } from './play-track.use-case';

@Injectable()
export class HandlePlaylistCommandUseCase {
  constructor(
    private readonly createPlaylistUseCase: CreatePlaylistUseCase,
    private readonly addTrackToPlaylistUseCase: AddTrackToPlaylistUseCase,
    private readonly deletePlaylistUseCase: DeletePlaylistUseCase,
    private readonly listPlaylistsUseCase: ListPlaylistsUseCase,
    private readonly getHelpUseCase: GetHelpUseCase,
    private readonly playTrackUseCase: PlayTrackUseCase,
    @Inject(PLAYLIST_REPOSITORY_PORT)
    private readonly playlistRepository: PlaylistRepositoryPort,
    @Inject(PLAYBACK_STATE_PORT)
    private readonly playbackStatePort: PlaybackStatePort,
  ) {}

  async execute(intent: ChatCommandIntent): Promise<ChatResponse> {
    // Este caso de uso traduce los subcomandos `/playlist ...`
    // a respuestas del chat manteniendo el mismo contrato de salida.
    const state = await this.playbackStatePort.getState();

    if (intent.playlistAction === 'list') {
      const playlists = await this.listPlaylistsUseCase.execute();

      if (playlists.length === 0) {
        return {
          command: 'playlist',
          reply: 'Todavía no hay playlists creadas.',
          state,
          alternatives: [],
          suggestions: ['/playlist create favoritas'],
        };
      }

      return {
        command: 'playlist',
        reply: `Playlists disponibles:\n${playlists
          .map(
            (playlist, index) =>
              `${index + 1}. ${playlist.name} (${playlist.tracks.length}/${PLAYLIST_TRACK_LIMIT})`,
          )
          .join('\n')}`,
        state,
        alternatives: [],
        suggestions: [
          '/playlist show favoritas',
          '/playlist add favoritas :: stronger kanye west',
        ],
      };
    }

    if (intent.playlistAction === 'show') {
      if (!intent.playlistName) {
        return this.getHelpUseCase.execute(
          'Usa /playlist show <nombre> para ver una playlist.',
        );
      }

      const playlist = await this.playlistRepository.findByName(
        intent.playlistName,
      );
      if (!playlist) {
        return {
          command: 'playlist',
          reply: `No encontré una playlist llamada "${intent.playlistName}".`,
          state,
          alternatives: [],
          suggestions: ['/playlist list', '/playlist create favoritas'],
        };
      }

      const trackText =
        playlist.tracks.length > 0
          ? playlist.tracks
              .map(
                (track, index) =>
                  `${index + 1}. ${track.title} - ${track.artistName}`,
              )
              .join(' | ')
          : 'sin canciones';
      const totalDuration = formatPlaylistDuration(
        getPlaylistDurationSeconds(playlist),
      );

      return {
        command: 'playlist',
        reply: `Playlist "${playlist.name}" (${playlist.tracks.length}/${PLAYLIST_TRACK_LIMIT} · duración total: ${totalDuration}): ${trackText}.`,
        state,
        alternatives: [],
        suggestions: [
          `/playlist add ${playlist.name} :: daft punk`,
          `/playlist delete ${playlist.name}`,
        ],
      };
    }

    if (intent.playlistAction === 'play') {
      if (!intent.playlistName) {
        return this.getHelpUseCase.execute(
          'Usa /playlist <nombre> para reproducir una playlist creada.',
        );
      }

      const playlist = await this.playlistRepository.findByName(
        intent.playlistName,
      );
      if (!playlist) {
        return {
          command: 'playlist',
          reply: `No encontré una playlist llamada "${intent.playlistName}".`,
          state,
          alternatives: [],
          suggestions: ['/playlist list', '/playlist create favoritas'],
        };
      }

      return this.playTrackUseCase.executePlaylist(playlist.name);
    }

    if (intent.playlistAction === 'delete') {
      if (!intent.playlistName) {
        return this.getHelpUseCase.execute(
          'Usa /playlist delete <nombre> para eliminar una playlist.',
        );
      }

      const playlist = await this.playlistRepository.findByName(
        intent.playlistName,
      );
      if (!playlist) {
        return {
          command: 'playlist',
          reply: `No encontré una playlist llamada "${intent.playlistName}".`,
          state,
          alternatives: [],
          suggestions: ['/playlist list', '/playlist create favoritas'],
        };
      }

      try {
        const response = await this.deletePlaylistUseCase.execute(playlist.id);

        return {
          command: 'playlist',
          reply: response.message,
          state,
          alternatives: [],
          suggestions: ['/playlist list', '/playlist create favoritas'],
        };
      } catch (error) {
        return {
          command: 'playlist',
          reply:
            error instanceof Error
              ? error.message
              : 'No pude eliminar la playlist.',
          state,
          alternatives: [],
          suggestions: ['/playlist list', `/playlist show ${playlist.name}`],
        };
      }
    }

    if (intent.playlistAction === 'create') {
      if (!intent.playlistName) {
        return this.getHelpUseCase.execute(
          'Usa /playlist create <nombre> para crear una playlist.',
        );
      }

      try {
        const response = await this.createPlaylistUseCase.execute(
          intent.playlistName,
        );
        return {
          command: 'playlist',
          reply: response.message,
          state,
          alternatives: [],
          suggestions: [
            `/playlist add ${response.playlist.name} :: stronger kanye west`,
            `/playlist delete ${response.playlist.name}`,
            '/playlist list',
          ],
        };
      } catch (error) {
        return {
          command: 'playlist',
          reply:
            error instanceof Error
              ? error.message
              : 'No pude crear la playlist.',
          state,
          alternatives: [],
          suggestions: ['/playlist create favoritas', '/playlist list'],
        };
      }
    }

    if (intent.playlistAction === 'add') {
      if (!intent.playlistName || !intent.playlistQuery) {
        return this.getHelpUseCase.execute(
          'Usa /playlist add <playlist> :: <búsqueda> para agregar canciones.',
        );
      }

      const playlist = await this.playlistRepository.findByName(
        intent.playlistName,
      );
      if (!playlist) {
        return {
          command: 'playlist',
          reply: `No encontré una playlist llamada "${intent.playlistName}".`,
          state,
          alternatives: [],
          suggestions: ['/playlist list', '/playlist create favoritas'],
        };
      }

      try {
        const response = await this.addTrackToPlaylistUseCase.execute(
          playlist.id,
          intent.playlistQuery,
        );

        return {
          command: 'playlist',
          reply: response.message,
          state,
          alternatives: response.playlist.tracks.slice(-3).reverse(),
          suggestions: [
            `/playlist show ${response.playlist.name}`,
            `/playlist add ${response.playlist.name} :: around the world`,
            `/playlist delete ${response.playlist.name}`,
          ],
        };
      } catch (error) {
        return {
          command: 'playlist',
          reply:
            error instanceof Error
              ? error.message
              : 'No pude agregar la canción a la playlist.',
          state,
          alternatives: [],
          suggestions: [
            `/playlist show ${playlist.name}`,
            `/playlist add ${playlist.name} :: stronger kanye west`,
            `/playlist delete ${playlist.name}`,
          ],
        };
      }
    }

    return this.getHelpUseCase.execute(
      'Comandos playlist: /playlist list, /playlist <nombre>, /playlist create <nombre>, /playlist show <nombre>, /playlist add <playlist> :: <canción>, /playlist delete <nombre>.',
    );
  }
}

function getPlaylistDurationSeconds(playlist: Playlist) {
  return playlist.tracks.reduce((totalDuration, track) => {
    if (!Number.isFinite(track.duration) || track.duration <= 0) {
      return totalDuration;
    }

    return totalDuration + track.duration;
  }, 0);
}

function formatPlaylistDuration(totalDurationSeconds: number) {
  if (!Number.isFinite(totalDurationSeconds) || totalDurationSeconds <= 0) {
    return '0 min';
  }

  const normalizedDuration = Math.floor(totalDurationSeconds);
  const hours = Math.floor(normalizedDuration / 3600);
  const minutes = Math.floor((normalizedDuration % 3600) / 60);
  const seconds = normalizedDuration % 60;
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} h`);
  }

  if (minutes > 0 || hours > 0) {
    parts.push(`${minutes} min`);
  }

  if (seconds > 0 && hours === 0) {
    parts.push(`${seconds} s`);
  }

  return parts.join(' ');
}

import { Inject, Injectable } from '@nestjs/common';
import { Track } from '../../domain/entities/track';
import { ChatResponse } from '../contracts/chat-response';
import { MUSIC_CATALOG_PORT } from '../ports/music-catalog.port';
import type { MusicCatalogPort } from '../ports/music-catalog.port';
import { PLAYBACK_SOURCE_RESOLVER_PORT } from '../ports/playback-source-resolver.port';
import type { PlaybackSourceResolverPort } from '../ports/playback-source-resolver.port';
import { PLAYBACK_STATE_PORT } from '../ports/playback-state.port';
import type { PlaybackStatePort } from '../ports/playback-state.port';
import { PLAYLIST_REPOSITORY_PORT } from '../ports/playlist-repository.port';
import type { PlaylistRepositoryPort } from '../ports/playlist-repository.port';

const PLAYLIST_PLAY_PREFIX = 'playlist ';

@Injectable()
export class PlayTrackUseCase {
  constructor(
    @Inject(MUSIC_CATALOG_PORT)
    private readonly musicCatalogPort: MusicCatalogPort,
    @Inject(PLAYBACK_SOURCE_RESOLVER_PORT)
    private readonly playbackSourceResolverPort: PlaybackSourceResolverPort,
    @Inject(PLAYBACK_STATE_PORT)
    private readonly playbackStatePort: PlaybackStatePort,
    @Inject(PLAYLIST_REPOSITORY_PORT)
    private readonly playlistRepository: PlaylistRepositoryPort,
  ) {}

  async execute(query?: string): Promise<ChatResponse> {
    const normalizedQuery = query?.trim();
    const state = await this.playbackStatePort.getState();

    if (!normalizedQuery) {
      return {
        command: 'play',
        reply: 'Necesito una búsqueda. Ejemplo: /play stronger kanye west',
        state,
        alternatives: [],
        suggestions: ['/play stronger kanye west', 'pon around the world'],
      };
    }

    const explicitPlaylistName =
      this.extractExplicitPlaylistName(normalizedQuery);
    if (explicitPlaylistName) {
      return this.executePlaylist(explicitPlaylistName);
    }

    const matchingPlaylist =
      await this.playlistRepository.findByName(normalizedQuery);

    let results: Track[] = [];
    try {
      results = await this.musicCatalogPort.searchTracks(normalizedQuery, 5);
    } catch {
      return {
        command: 'play',
        reply:
          'No pude consultar Deezer en este momento. Intenta de nuevo en unos segundos.',
        state,
        alternatives: [],
        suggestions: ['/play stronger kanye west', '/help'],
      };
    }

    if (results.length === 0) {
      if (matchingPlaylist) {
        return {
          command: 'play',
          reply: `No encontré una canción para "${normalizedQuery}", pero sí existe tu playlist "${matchingPlaylist.name}". Usa /play playlist ${matchingPlaylist.name} si quieres reproducirla completa.`,
          state,
          alternatives: [],
          suggestions: [
            `/play playlist ${matchingPlaylist.name}`,
            `/playlist ${matchingPlaylist.name}`,
          ],
        };
      }

      return {
        command: 'play',
        reply: `No encontré resultados para "${normalizedQuery}".`,
        state,
        alternatives: [],
        suggestions: ['/play daft punk', '/play kanye west stronger'],
      };
    }

    const selectedTrack = await this.attachPlaybackSource(results[0]);
    const nextState = {
      current: selectedTrack,
      queue: [],
      isPaused: false,
    };

    await this.playbackStatePort.saveState(nextState);

    const playlistRecommendation = matchingPlaylist
      ? ` Si querías reproducir tu playlist creada, usa /play playlist ${matchingPlaylist.name}.`
      : '';

    return {
      command: 'play',
      reply: `Reproduciendo "${selectedTrack.title}" de ${selectedTrack.artistName}.${playlistRecommendation}`,
      state: nextState,
      alternatives: results.slice(1, 4),
      suggestions: matchingPlaylist
        ? [
            '/queue',
            `/play playlist ${matchingPlaylist.name}`,
            `/playlist ${matchingPlaylist.name}`,
          ]
        : ['/queue', '/nowplaying', '/skip'],
    };
  }

  async executePlaylist(playlistName?: string): Promise<ChatResponse> {
    const normalizedPlaylistName = playlistName?.trim();
    const state = await this.playbackStatePort.getState();

    if (!normalizedPlaylistName) {
      return {
        command: 'play',
        reply:
          'Necesito el nombre de la playlist. Ejemplo: /play playlist favoritas',
        state,
        alternatives: [],
        suggestions: ['/play playlist favoritas', '/playlist list'],
      };
    }

    const playlist = await this.playlistRepository.findByName(
      normalizedPlaylistName,
    );
    if (!playlist) {
      return {
        command: 'play',
        reply: `No encontré una playlist llamada "${normalizedPlaylistName}".`,
        state,
        alternatives: [],
        suggestions: ['/playlist list', '/playlist create favoritas'],
      };
    }

    if (playlist.tracks.length === 0) {
      return {
        command: 'play',
        reply: `La playlist "${playlist.name}" no tiene canciones todavía.`,
        state,
        alternatives: [],
        suggestions: [
          `/playlist add ${playlist.name} :: stronger kanye west`,
          `/playlist show ${playlist.name}`,
        ],
      };
    }

    const tracksWithPlaybackSource = await Promise.all(
      playlist.tracks.map((track) => this.attachPlaybackSource(track)),
    );
    const [currentTrack, ...queue] = tracksWithPlaybackSource;
    const nextState = {
      current: currentTrack ?? null,
      queue,
      isPaused: false,
    };

    await this.playbackStatePort.saveState(nextState);

    return {
      command: 'play',
      reply: `Reproduciendo la playlist "${playlist.name}". Cargué ${tracksWithPlaybackSource.length} canciones.`,
      state: nextState,
      alternatives: [],
      suggestions: ['/queue', '/skip', `/playlist show ${playlist.name}`],
    };
  }

  private async attachPlaybackSource(track: Track): Promise<Track> {
    try {
      const playbackSource =
        await this.playbackSourceResolverPort.resolveTrackSource(track);

      return {
        ...track,
        playbackSource,
      };
    } catch {
      return {
        ...track,
        playbackSource: null,
      };
    }
  }

  private extractExplicitPlaylistName(query: string) {
    const normalizedQuery = query.toLowerCase();

    if (normalizedQuery === 'playlist') {
      return '';
    }

    if (!normalizedQuery.startsWith(PLAYLIST_PLAY_PREFIX)) {
      return null;
    }

    return query.slice(PLAYLIST_PLAY_PREFIX.length).trim();
  }
}

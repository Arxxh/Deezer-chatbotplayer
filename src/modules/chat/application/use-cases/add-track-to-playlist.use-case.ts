import { Inject, Injectable } from '@nestjs/common';
import { PlaylistResponse } from '../contracts/playlist-response';
import { MUSIC_CATALOG_PORT } from '../ports/music-catalog.port';
import type { MusicCatalogPort } from '../ports/music-catalog.port';
import { PLAYLIST_TRACK_LIMIT } from '../../domain/entities/playlist';
import { PLAYLIST_REPOSITORY_PORT } from '../ports/playlist-repository.port';
import type { PlaylistRepositoryPort } from '../ports/playlist-repository.port';

@Injectable()
export class AddTrackToPlaylistUseCase {
  constructor(
    @Inject(MUSIC_CATALOG_PORT)
    private readonly musicCatalogPort: MusicCatalogPort,
    @Inject(PLAYLIST_REPOSITORY_PORT)
    private readonly playlistRepository: PlaylistRepositoryPort,
  ) {}

  async execute(playlistId: string, query: string): Promise<PlaylistResponse> {
    // Se resuelve la cancion por texto usando Deezer
    // y solo se agrega la mejor coincidencia al playlist.
    const playlist = await this.playlistRepository.findById(playlistId);
    if (!playlist) {
      throw new Error('La playlist no existe.');
    }

    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      throw new Error('La búsqueda de canción es obligatoria.');
    }

    if (playlist.tracks.length >= PLAYLIST_TRACK_LIMIT) {
      throw new Error(
        `La playlist "${playlist.name}" ya alcanzó el límite de ${PLAYLIST_TRACK_LIMIT} canciones.`,
      );
    }

    const results = await this.musicCatalogPort.searchTracks(
      normalizedQuery,
      5,
    );
    if (results.length === 0) {
      throw new Error(`No encontré resultados para "${normalizedQuery}".`);
    }

    const selectedTrack = results[0];
    const updatedPlaylist = {
      ...playlist,
      tracks: [...playlist.tracks, selectedTrack],
      updatedAt: new Date().toISOString(),
    };

    await this.playlistRepository.save(updatedPlaylist);

    return {
      playlist: updatedPlaylist,
      message: `Añadí "${selectedTrack.title}" de ${selectedTrack.artistName} a "${updatedPlaylist.name}".`,
    };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PlaylistResponse } from '../contracts/playlist-response';
import { PLAYLIST_TRACK_LIMIT } from '../../domain/entities/playlist';
import { PLAYLIST_REPOSITORY_PORT } from '../ports/playlist-repository.port';
import type { PlaylistRepositoryPort } from '../ports/playlist-repository.port';

@Injectable()
export class CreatePlaylistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY_PORT)
    private readonly playlistRepository: PlaylistRepositoryPort,
  ) {}

  async execute(name: string): Promise<PlaylistResponse> {
    // Regla de negocio:
    // no permitimos playlists sin nombre ni nombres repetidos.
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new Error('El nombre de la playlist es obligatorio.');
    }

    const existingPlaylist =
      await this.playlistRepository.findByName(normalizedName);
    if (existingPlaylist) {
      throw new Error(`Ya existe una playlist llamada "${normalizedName}".`);
    }

    const now = new Date().toISOString();
    const playlist = {
      id: randomUUID(),
      name: normalizedName,
      tracks: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.playlistRepository.save(playlist);

    return {
      playlist,
      message: `Playlist "${playlist.name}" creada. Límite: ${PLAYLIST_TRACK_LIMIT} canciones.`,
    };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { PlaylistResponse } from '../contracts/playlist-response';
import { PLAYLIST_REPOSITORY_PORT } from '../ports/playlist-repository.port';
import type { PlaylistRepositoryPort } from '../ports/playlist-repository.port';

@Injectable()
export class DeletePlaylistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY_PORT)
    private readonly playlistRepository: PlaylistRepositoryPort,
  ) {}

  async execute(playlistId: string): Promise<PlaylistResponse> {
    const deletedPlaylist = await this.playlistRepository.delete(playlistId);

    if (!deletedPlaylist) {
      throw new Error('La playlist no existe.');
    }

    return {
      playlist: deletedPlaylist,
      message: `Playlist "${deletedPlaylist.name}" eliminada.`,
    };
  }
}

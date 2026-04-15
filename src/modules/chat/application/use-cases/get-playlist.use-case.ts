import { Inject, Injectable } from '@nestjs/common';
import { PLAYLIST_REPOSITORY_PORT } from '../ports/playlist-repository.port';
import type { PlaylistRepositoryPort } from '../ports/playlist-repository.port';

@Injectable()
export class GetPlaylistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY_PORT)
    private readonly playlistRepository: PlaylistRepositoryPort,
  ) {}

  execute(playlistId: string) {
    return this.playlistRepository.findById(playlistId);
  }
}

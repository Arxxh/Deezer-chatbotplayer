import { Inject, Injectable } from '@nestjs/common';
import { PLAYLIST_REPOSITORY_PORT } from '../ports/playlist-repository.port';
import type { PlaylistRepositoryPort } from '../ports/playlist-repository.port';

@Injectable()
export class ListPlaylistsUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY_PORT)
    private readonly playlistRepository: PlaylistRepositoryPort,
  ) {}

  execute() {
    return this.playlistRepository.list();
  }
}

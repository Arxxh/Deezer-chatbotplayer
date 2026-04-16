import { CreatePlaylistUseCase } from './create-playlist.use-case';
import { AddTrackToPlaylistUseCase } from './add-track-to-playlist.use-case';
import { DeletePlaylistUseCase } from './delete-playlist.use-case';
import { GetHelpUseCase } from './get-help.use-case';
import { HandlePlaylistCommandUseCase } from './handle-playlist-command.use-case';
import { ListPlaylistsUseCase } from './list-playlists.use-case';
import { PlayTrackUseCase } from './play-track.use-case';
import { PlaybackStatePort } from '../ports/playback-state.port';
import { PlaylistRepositoryPort } from '../ports/playlist-repository.port';
import {
  createEmptyPlaybackState,
  PlaybackState,
} from '../../domain/entities/playback-state';
import { Playlist } from '../../domain/entities/playlist';
import { Track } from '../../domain/entities/track';

class InMemoryPlaylistRepository implements PlaylistRepositoryPort {
  constructor(private readonly playlists: Playlist[] = []) {}

  list(): Promise<Playlist[]> {
    return Promise.resolve(
      this.playlists.map((playlist) => ({
        ...playlist,
        tracks: playlist.tracks.map((track) => ({ ...track })),
      })),
    );
  }

  findById(playlistId: string): Promise<Playlist | null> {
    return Promise.resolve(
      this.playlists.find((playlist) => playlist.id === playlistId) ?? null,
    );
  }

  findByName(name: string): Promise<Playlist | null> {
    return Promise.resolve(
      this.playlists.find(
        (playlist) =>
          playlist.name.trim().toLowerCase() === name.trim().toLowerCase(),
      ) ?? null,
    );
  }

  save(playlist: Playlist): Promise<void> {
    const playlistIndex = this.playlists.findIndex(
      (currentPlaylist) => currentPlaylist.id === playlist.id,
    );

    if (playlistIndex === -1) {
      this.playlists.push(playlist);
      return Promise.resolve();
    }

    this.playlists[playlistIndex] = playlist;
    return Promise.resolve();
  }

  delete(playlistId: string): Promise<Playlist | null> {
    const playlistIndex = this.playlists.findIndex(
      (playlist) => playlist.id === playlistId,
    );

    if (playlistIndex === -1) {
      return Promise.resolve(null);
    }

    const [deletedPlaylist] = this.playlists.splice(playlistIndex, 1);
    return Promise.resolve(deletedPlaylist);
  }
}

class FakePlaybackStateRepository implements PlaybackStatePort {
  constructor(private state: PlaybackState = createEmptyPlaybackState()) {}

  getState(): Promise<PlaybackState> {
    return Promise.resolve({
      current: this.state.current ? { ...this.state.current } : null,
      queue: this.state.queue.map((track) => ({ ...track })),
      isPaused: this.state.isPaused,
    });
  }

  saveState(state: PlaybackState): Promise<void> {
    this.state = {
      current: state.current ? { ...state.current } : null,
      queue: state.queue.map((track) => ({ ...track })),
      isPaused: state.isPaused,
    };

    return Promise.resolve();
  }
}

describe('HandlePlaylistCommandUseCase', () => {
  const firstTrack: Track = {
    id: 1,
    title: 'Todo Y Nada',
    artistName: 'Luis Miguel',
    albumTitle: '20 Años',
    duration: 216,
    previewUrl: 'https://cdn.example/preview-1.mp3',
    deezerUrl: 'https://www.deezer.com/track/1',
    coverUrl: 'https://cdn.example/cover-1.jpg',
  };

  const secondTrack: Track = {
    id: 2,
    title: 'Culpable O No',
    artistName: 'Luis Miguel',
    albumTitle: 'Busca Una Mujer',
    duration: 239,
    previewUrl: 'https://cdn.example/preview-2.mp3',
    deezerUrl: 'https://www.deezer.com/track/2',
    coverUrl: 'https://cdn.example/cover-2.jpg',
  };

  it('includes the total playlist duration in /playlist show', async () => {
    const playlistRepository = new InMemoryPlaylistRepository([
      {
        id: 'playlist-1',
        name: 'Luis Miguel',
        tracks: [firstTrack, secondTrack],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    const playbackStatePort = new FakePlaybackStateRepository();
    const useCase = new HandlePlaylistCommandUseCase(
      { execute: jest.fn() } as unknown as CreatePlaylistUseCase,
      { execute: jest.fn() } as unknown as AddTrackToPlaylistUseCase,
      { execute: jest.fn() } as unknown as DeletePlaylistUseCase,
      new ListPlaylistsUseCase(playlistRepository),
      new GetHelpUseCase(playbackStatePort),
      {
        execute: jest.fn(),
        executePlaylist: jest.fn(),
      } as unknown as PlayTrackUseCase,
      playlistRepository,
      playbackStatePort,
    );

    const response = await useCase.execute({
      command: 'playlist',
      rawMessage: '/playlist show Luis Miguel',
      playlistAction: 'show',
      playlistName: 'Luis Miguel',
    });

    expect(response.reply).toContain('duración total: 7 min 35 s');
    expect(response.reply).toContain('1. Todo Y Nada - Luis Miguel');
    expect(response.reply).toContain('2. Culpable O No - Luis Miguel');
  });
});

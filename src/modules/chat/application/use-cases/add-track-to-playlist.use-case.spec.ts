import { PLAYLIST_TRACK_LIMIT, Playlist } from '../../domain/entities/playlist';
import { Track } from '../../domain/entities/track';
import { MusicCatalogPort } from '../ports/music-catalog.port';
import { PlaylistRepositoryPort } from '../ports/playlist-repository.port';
import { AddTrackToPlaylistUseCase } from './add-track-to-playlist.use-case';

class InMemoryPlaylistRepository implements PlaylistRepositoryPort {
  constructor(private readonly playlists: Playlist[] = []) {}

  list(): Promise<Playlist[]> {
    return Promise.resolve(
      this.playlists.map((playlist) => ({
        ...playlist,
        tracks: [...playlist.tracks],
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
    const index = this.playlists.findIndex(
      (currentPlaylist) => currentPlaylist.id === playlist.id,
    );

    if (index === -1) {
      this.playlists.push(playlist);
      return Promise.resolve();
    }

    this.playlists[index] = playlist;
    return Promise.resolve();
  }

  delete(playlistId: string): Promise<Playlist | null> {
    const index = this.playlists.findIndex(
      (playlist) => playlist.id === playlistId,
    );

    if (index === -1) {
      return Promise.resolve(null);
    }

    const [deletedPlaylist] = this.playlists.splice(index, 1);
    return Promise.resolve(deletedPlaylist);
  }
}

class FakeMusicCatalog implements MusicCatalogPort {
  constructor(private readonly tracks: Track[]) {}

  searchTracks(): Promise<Track[]> {
    return Promise.resolve(this.tracks);
  }
}

describe('AddTrackToPlaylistUseCase', () => {
  const sampleTrack: Track = {
    id: 1,
    title: 'Stronger',
    artistName: 'Kanye West',
    albumTitle: 'Graduation',
    duration: 312,
    previewUrl: 'https://cdn.example/preview.mp3',
    deezerUrl: 'https://www.deezer.com/track/1',
    coverUrl: 'https://cdn.example/cover.jpg',
  };

  it('adds the first Deezer result to the playlist', async () => {
    const repository = new InMemoryPlaylistRepository([
      {
        id: 'playlist-1',
        name: 'favoritas',
        tracks: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const useCase = new AddTrackToPlaylistUseCase(
      new FakeMusicCatalog([sampleTrack]),
      repository,
    );

    const response = await useCase.execute('playlist-1', 'stronger kanye west');

    expect(response.playlist.tracks).toEqual([sampleTrack]);
    expect(response.message).toContain('Añadí');
  });

  it('rejects additions when the playlist has reached its limit', async () => {
    const tracks = Array.from({ length: PLAYLIST_TRACK_LIMIT }, (_, index) => ({
      ...sampleTrack,
      id: index + 1,
      title: `Track ${index + 1}`,
    }));

    const repository = new InMemoryPlaylistRepository([
      {
        id: 'playlist-1',
        name: 'favoritas',
        tracks,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const useCase = new AddTrackToPlaylistUseCase(
      new FakeMusicCatalog([sampleTrack]),
      repository,
    );

    await expect(
      useCase.execute('playlist-1', 'stronger kanye west'),
    ).rejects.toThrow('límite de 10 canciones');
  });
});

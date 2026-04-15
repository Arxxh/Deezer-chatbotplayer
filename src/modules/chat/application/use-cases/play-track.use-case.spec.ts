import { PlaybackSource } from '../../domain/entities/playback-source';
import { Playlist } from '../../domain/entities/playlist';
import { Track } from '../../domain/entities/track';
import { MusicCatalogPort } from '../ports/music-catalog.port';
import { PlaybackSourceResolverPort } from '../ports/playback-source-resolver.port';
import { PlaylistRepositoryPort } from '../ports/playlist-repository.port';
import { InMemoryPlaybackStateRepository } from '../../infrastructure/persistence/in-memory-playback-state.repository';
import { PlayTrackUseCase } from './play-track.use-case';

class FakeMusicCatalog implements MusicCatalogPort {
  constructor(private readonly tracks: Track[]) {}

  searchTracks(): Promise<Track[]> {
    return Promise.resolve(this.tracks);
  }
}

class FakePlaybackSourceResolver implements PlaybackSourceResolverPort {
  constructor(private readonly playbackSource: PlaybackSource | null = null) {}

  resolveTrackSource(): Promise<PlaybackSource | null> {
    return Promise.resolve(this.playbackSource);
  }
}

class InMemoryPlaylistRepository implements PlaylistRepositoryPort {
  constructor(private readonly playlists: Playlist[] = []) {}

  list(): Promise<Playlist[]> {
    return Promise.resolve(this.playlists.map((playlist) => ({ ...playlist })));
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

describe('PlayTrackUseCase', () => {
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

  const sampleTrackWithEmptyPlaybackSource: Track = {
    ...sampleTrack,
    playbackSource: null,
  };

  it('starts playback when there is no current track', async () => {
    const repository = new InMemoryPlaybackStateRepository();
    const useCase = new PlayTrackUseCase(
      new FakeMusicCatalog([sampleTrack]),
      new FakePlaybackSourceResolver({
        provider: 'youtube',
        videoId: 'abc123',
        videoTitle: 'Kanye West - Stronger',
        channelTitle: 'KanyeWestVEVO',
        confidence: 81,
      }),
      repository,
      new InMemoryPlaylistRepository(),
    );

    const response = await useCase.execute('stronger kanye west');

    expect(response.state.current).toEqual({
      ...sampleTrack,
      playbackSource: {
        provider: 'youtube',
        videoId: 'abc123',
        videoTitle: 'Kanye West - Stronger',
        channelTitle: 'KanyeWestVEVO',
        confidence: 81,
      },
    });
    expect(response.state.queue).toEqual([]);
    expect(response.reply).toContain('Reproduciendo');
  });

  it('replaces the active track and clears the previous queue', async () => {
    const repository = new InMemoryPlaybackStateRepository();
    await repository.saveState({
      current: sampleTrack,
      queue: [
        {
          ...sampleTrack,
          id: 8,
          title: 'Old queued track',
        },
      ],
      isPaused: false,
    });

    const secondTrack: Track = {
      ...sampleTrack,
      id: 2,
      title: 'Around the World',
    };

    const useCase = new PlayTrackUseCase(
      new FakeMusicCatalog([secondTrack]),
      new FakePlaybackSourceResolver(),
      repository,
      new InMemoryPlaylistRepository(),
    );

    const response = await useCase.execute('around the world');

    expect(response.state.current).toEqual({
      ...secondTrack,
      playbackSource: null,
    });
    expect(response.state.queue).toEqual([]);
    expect(response.reply).toContain('Reproduciendo');
  });

  it('guides the user when the query is missing', async () => {
    const repository = new InMemoryPlaybackStateRepository();
    const useCase = new PlayTrackUseCase(
      new FakeMusicCatalog([sampleTrack]),
      new FakePlaybackSourceResolver(),
      repository,
      new InMemoryPlaylistRepository(),
    );

    const response = await useCase.execute();

    expect(response.reply).toContain('Necesito una búsqueda');
  });

  it('plays an explicitly requested playlist and loads the rest of the tracks into the queue', async () => {
    const repository = new InMemoryPlaybackStateRepository();
    const secondTrack: Track = {
      ...sampleTrack,
      id: 2,
      title: 'Suave',
    };

    const useCase = new PlayTrackUseCase(
      new FakeMusicCatalog([]),
      new FakePlaybackSourceResolver(),
      repository,
      new InMemoryPlaylistRepository([
        {
          id: 'playlist-1',
          name: 'Luis Miguel',
          tracks: [sampleTrack, secondTrack],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    );

    const response = await useCase.execute('playlist Luis Miguel');

    expect(response.state.current).toEqual(sampleTrackWithEmptyPlaybackSource);
    expect(response.state.queue).toEqual([
      {
        ...secondTrack,
        playbackSource: null,
      },
    ]);
    expect(response.reply).toContain('Reproduciendo la playlist');
  });

  it('keeps /play focused on song search even if a playlist has the same name', async () => {
    const repository = new InMemoryPlaybackStateRepository();
    const useCase = new PlayTrackUseCase(
      new FakeMusicCatalog([sampleTrack]),
      new FakePlaybackSourceResolver(),
      repository,
      new InMemoryPlaylistRepository([
        {
          id: 'playlist-1',
          name: 'Stronger',
          tracks: [
            {
              ...sampleTrack,
              id: 2,
              title: 'Playlist track',
            },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    );

    const response = await useCase.execute('Stronger');

    expect(response.state.current).toEqual(sampleTrackWithEmptyPlaybackSource);
    expect(response.state.queue).toEqual([]);
    expect(response.reply).toContain('Reproduciendo "Stronger"');
    expect(response.reply).toContain('/play playlist Stronger');
  });
});

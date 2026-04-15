import { ConfigService } from '@nestjs/config';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileAppStateStore } from './file-app-state.store';

describe('FileAppStateStore', () => {
  it('persists state across store instances', async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'deezer-chat-'));
    const filePath = join(temporaryDirectory, 'app-state.json');

    const firstStore = new FileAppStateStore(
      new ConfigService({ APP_DATA_FILE: filePath }),
    );

    await firstStore.update((state) => {
      state.playbackState.current = {
        id: 1,
        title: 'Stronger',
        artistName: 'Kanye West',
        albumTitle: 'Graduation',
        duration: 312,
        previewUrl: 'https://cdn.example/preview.mp3',
        deezerUrl: 'https://www.deezer.com/track/1',
        coverUrl: 'https://cdn.example/cover.jpg',
      };
      state.playlists.push({
        id: 'playlist-1',
        name: 'favoritas',
        tracks: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
    });

    const secondStore = new FileAppStateStore(
      new ConfigService({ APP_DATA_FILE: filePath }),
    );
    const state = await secondStore.read();

    expect(state.playbackState.current?.title).toBe('Stronger');
    expect(state.playlists).toHaveLength(1);

    await rm(temporaryDirectory, { recursive: true, force: true });
  });
});

import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  createEmptyPlaybackState,
  PlaybackState,
} from '../../domain/entities/playback-state';
import { Playlist } from '../../domain/entities/playlist';

interface AppPersistenceState {
  playbackState: PlaybackState;
  playlists: Playlist[];
}

@Injectable()
export class FileAppStateStore {
  // `updateChain` serializa escrituras para evitar que dos operaciones
  // concurrentes se pisen sobre el mismo archivo JSON.
  private updateChain = Promise.resolve();

  constructor(@Optional() private readonly configService?: ConfigService) {}

  async read(): Promise<AppPersistenceState> {
    const filePath = this.getFilePath();

    try {
      const rawContent = await readFile(filePath, 'utf8');
      const parsedContent = JSON.parse(
        rawContent,
      ) as Partial<AppPersistenceState>;

      return {
        playbackState:
          parsedContent.playbackState ?? createEmptyPlaybackState(),
        playlists: parsedContent.playlists ?? [],
      };
    } catch (error) {
      if (isFileNotFoundError(error)) {
        return {
          playbackState: createEmptyPlaybackState(),
          playlists: [],
        };
      }

      throw error;
    }
  }

  async update(mutator: (state: AppPersistenceState) => void | Promise<void>) {
    let resultState: AppPersistenceState | null = null;

    this.updateChain = this.updateChain.then(async () => {
      const currentState = await this.read();
      await mutator(currentState);
      await this.write(currentState);
      resultState = currentState;
    });

    await this.updateChain;

    return resultState;
  }

  private async write(state: AppPersistenceState) {
    const filePath = this.getFilePath();
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(state, null, 2), 'utf8');
  }

  private getFilePath() {
    // Permite configurar la ruta via ENV y deja un default razonable para desarrollo.
    return (
      this.configService?.get<string>('APP_DATA_FILE') ??
      join(process.cwd(), 'var', 'data', 'app-state.json')
    );
  }
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code === 'ENOENT'
  );
}

import { Injectable } from '@nestjs/common';
import { PlaylistRepositoryPort } from '../../application/ports/playlist-repository.port';
import { Playlist } from '../../domain/entities/playlist';
import { Track } from '../../domain/entities/track';
import { FileAppStateStore } from './file-app-state.store';

@Injectable()
export class FilePlaylistRepository implements PlaylistRepositoryPort {
  constructor(private readonly fileAppStateStore: FileAppStateStore) {}

  async list(): Promise<Playlist[]> {
    const state = await this.fileAppStateStore.read();
    return state.playlists.map((playlist) => clonePlaylist(playlist));
  }

  async findById(playlistId: string): Promise<Playlist | null> {
    const playlists = await this.list();
    return playlists.find((playlist) => playlist.id === playlistId) ?? null;
  }

  async findByName(name: string): Promise<Playlist | null> {
    const normalizedName = normalizePlaylistName(name);
    const playlists = await this.list();

    return (
      playlists.find(
        (playlist) => normalizePlaylistName(playlist.name) === normalizedName,
      ) ?? null
    );
  }

  async save(playlist: Playlist): Promise<void> {
    // Upsert simple: crea si no existe o reemplaza la version persistida.
    await this.fileAppStateStore.update((state) => {
      const currentIndex = state.playlists.findIndex(
        (currentPlaylist) => currentPlaylist.id === playlist.id,
      );

      if (currentIndex === -1) {
        state.playlists.push(clonePlaylist(playlist));
        return;
      }

      state.playlists[currentIndex] = clonePlaylist(playlist);
    });
  }

  async delete(playlistId: string): Promise<Playlist | null> {
    let deletedPlaylist: Playlist | null = null;

    await this.fileAppStateStore.update((state) => {
      const currentIndex = state.playlists.findIndex(
        (currentPlaylist) => currentPlaylist.id === playlistId,
      );

      if (currentIndex === -1) {
        return;
      }

      deletedPlaylist = clonePlaylist(state.playlists[currentIndex]);
      state.playlists.splice(currentIndex, 1);
    });

    return deletedPlaylist;
  }
}

function normalizePlaylistName(name: string) {
  return name.trim().toLowerCase();
}

function clonePlaylist(playlist: Playlist): Playlist {
  return {
    ...playlist,
    tracks: playlist.tracks.map((track) => cloneTrack(track)),
  };
}

function cloneTrack(track: Track): Track {
  return { ...track };
}

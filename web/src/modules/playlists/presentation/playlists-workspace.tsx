'use client';

import { FormEvent, useEffect, useState } from 'react';
import { emitPlaylistsChanged } from '@/shared/application/browser-events';
import { formatDuration } from '@/shared/lib/format-duration';
import type { Playlist } from '@/modules/playlists/domain/playlist';
import {
  addTrackToPlaylist,
  createPlaylist,
  listPlaylists,
} from '@/modules/playlists/infrastructure/playlists-api';
import styles from './playlists-workspace.module.css';

export function PlaylistsWorkspace() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [draftName, setDraftName] = useState('');
  const [trackDrafts, setTrackDrafts] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingPlaylistId, setUpdatingPlaylistId] = useState<string | null>(null);

  useEffect(() => {
    void refreshPlaylists();
  }, []);

  async function refreshPlaylists() {
    try {
      setStatusMessage(null);
      const nextPlaylists = await listPlaylists();
      setPlaylists(nextPlaylists);
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'No pude cargar las playlists.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreatePlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextName = draftName.trim();
    if (!nextName) {
      return;
    }

    try {
      setIsCreating(true);
      const response = await createPlaylist(nextName);
      setDraftName('');
      setStatusMessage(response.message);
      await refreshPlaylists();
      emitPlaylistsChanged();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'No pude crear la playlist.',
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleAddTrack(playlistId: string) {
    const query = trackDrafts[playlistId]?.trim();
    if (!query) {
      return;
    }

    try {
      setUpdatingPlaylistId(playlistId);
      const response = await addTrackToPlaylist(playlistId, query);
      setTrackDrafts((currentDrafts) => ({
        ...currentDrafts,
        [playlistId]: '',
      }));
      setStatusMessage(response.message);
      await refreshPlaylists();
      emitPlaylistsChanged();
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'No pude agregar la canción a la playlist.',
      );
    } finally {
      setUpdatingPlaylistId(null);
    }
  }

  return (
    <section className={styles.workspace}>
      <header className={styles.topBar}>
        <div>
          <p className={styles.eyebrow}>Library room</p>
          <h2 className={styles.title}>
            Playlists persistentes con una regla dura: diez canciones por lista.
          </h2>
          <p className={styles.subtitle}>
            Esta vista conversa con el backend real, así que cada cambio sobrevive al
            reinicio de la app.
          </p>
        </div>
        <div className={styles.heroBadge}>
          <strong>{playlists.length}</strong>
          <span>saved lists</span>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.createPanel}>
          <div>
            <p className={styles.panelEyebrow}>Create playlist</p>
            <h3>Nuevo contenedor musical</h3>
            <p className={styles.panelCopy}>
              Cada playlist puede guardar hasta 10 canciones y vive en el backend.
            </p>
          </div>

          <form className={styles.createForm} onSubmit={handleCreatePlaylist}>
            <input
              className={styles.input}
              value={draftName}
              onChange={(event) => {
                setDraftName(event.target.value);
              }}
              placeholder="favoritas nocturnas"
            />
            <button className={styles.primaryButton} disabled={isCreating} type="submit">
              {isCreating ? 'Creating…' : 'Create'}
            </button>
          </form>

          {statusMessage ? <p className={styles.statusMessage}>{statusMessage}</p> : null}
        </aside>

        <div className={styles.libraryPanel}>
          <div className={styles.libraryHeader}>
            <div>
              <p className={styles.panelEyebrow}>Saved playlists</p>
              <h3>Tu biblioteca persistente</h3>
            </div>
            <span className={styles.limitPill}>10 tracks max</span>
          </div>

          {isLoading ? (
            <div className={styles.emptyState}>Loading playlists…</div>
          ) : playlists.length === 0 ? (
            <div className={styles.emptyState}>
              No hay playlists creadas todavía. Empieza con una arriba.
            </div>
          ) : (
            <div className={styles.playlistGrid}>
              {playlists.map((playlist) => {
                const trackCount = playlist.tracks.length;
                const isFull = trackCount >= 10;
                const isBusy = updatingPlaylistId === playlist.id;

                return (
                  <article key={playlist.id} className={styles.playlistCard}>
                    <div className={styles.playlistHeader}>
                      <div>
                        <strong>{playlist.name}</strong>
                        <span>{trackCount} / 10 tracks</span>
                      </div>
                      <div className={isFull ? styles.fullBadge : styles.openBadge}>
                        {isFull ? 'Full' : 'Open'}
                      </div>
                    </div>

                    <ul className={styles.trackList}>
                      {playlist.tracks.length === 0 ? (
                        <li className={styles.trackEmpty}>No songs yet.</li>
                      ) : (
                        playlist.tracks.map((track, index) => (
                          <li key={`${playlist.id}-${track.id}-${index}`} className={styles.trackItem}>
                            <div>
                              <strong>{track.title}</strong>
                              <span>
                                {track.artistName} · {formatDuration(track.duration)}
                              </span>
                            </div>
                          </li>
                        ))
                      )}
                    </ul>

                    <div className={styles.trackComposer}>
                      <input
                        className={styles.input}
                        value={trackDrafts[playlist.id] ?? ''}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setTrackDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [playlist.id]: nextValue,
                          }));
                        }}
                        placeholder="around the world daft punk"
                        disabled={isFull}
                      />
                      <button
                        className={styles.secondaryButton}
                        type="button"
                        disabled={isBusy || isFull}
                        onClick={() => {
                          void handleAddTrack(playlist.id);
                        }}
                      >
                        {isBusy ? 'Adding…' : 'Add track'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

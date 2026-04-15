'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Playlist } from '@/modules/playlists/domain/playlist';
import { listPlaylists } from '@/modules/playlists/infrastructure/playlists-api';
import {
  savePendingChatPrompt,
  emitChatPromptSelected as emitPromptEvent,
  subscribeToPlaylistsChanged,
} from '@/shared/application/browser-events';
import styles from './app-shell.module.css';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true);
  const [isPlaylistGroupOpen, setIsPlaylistGroupOpen] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // El sidebar se refresca cada vez que el chat crea, elimina o modifica
    // playlists para no depender de un reload manual.
    async function loadPlaylists() {
      try {
        const nextPlaylists = await listPlaylists();
        if (isMounted) {
          setPlaylists(nextPlaylists);
        }
      } catch {
        if (isMounted) {
          setPlaylists([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPlaylists(false);
        }
      }
    }

    void loadPlaylists();

    const unsubscribe = subscribeToPlaylistsChanged(() => {
      void loadPlaylists();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  function handlePrompt(prompt: string) {
    // Si ya estamos en el chat, rellenamos el composer al instante.
    // Si venimos de otra ruta, guardamos el prompt y navegamos limpio a `/`.
    if (pathname === '/') {
      emitPromptEvent(prompt);
      return;
    }

    savePendingChatPrompt(prompt);
    router.push('/');
  }

  return (
    <div
      className={styles.shell}
      data-collapsed={isSidebarCollapsed ? 'true' : 'false'}
    >
      <aside className={styles.sidebar}>
        <div className={styles.sidebarInner}>
          <header className={styles.topRow}>
            <button
              type="button"
              className={styles.collapseButton}
              aria-label={
                isSidebarCollapsed ? 'Expandir sidebar' : 'Contraer sidebar'
              }
              aria-expanded={!isSidebarCollapsed}
              onClick={() => {
                setIsSidebarCollapsed((currentValue) => !currentValue);
              }}
            >
              {isSidebarCollapsed ? '>>' : '<<'}
            </button>
          </header>

          <div className={styles.sidebarContent}>
            <button
              type="button"
              className={styles.playlistParent}
              aria-expanded={isPlaylistGroupOpen}
              data-open={isPlaylistGroupOpen ? 'true' : 'false'}
              onClick={() => {
                setIsPlaylistGroupOpen((currentValue) => !currentValue);
              }}
            >
              <span className={styles.playlistParentIcon}>PL</span>
              <span className={styles.playlistParentCopy}>
                <strong>Playlists</strong>
                <small>{playlists.length} guardadas</small>
              </span>
              <span className={styles.playlistParentArrow}>›</span>
            </button>

            <section
              className={styles.playlistSection}
              data-open={isPlaylistGroupOpen ? 'true' : 'false'}
            >
              <div className={styles.playlistSectionViewport}>
                {isLoadingPlaylists ? (
                  <p className={styles.emptyText}>Cargando playlists...</p>
                ) : playlists.length === 0 ? (
                  <p className={styles.emptyText}>No hay playlists creadas.</p>
                ) : (
                  <div className={styles.playlistList}>
                    {playlists.map((playlist) => (
                      <button
                        key={playlist.id}
                        type="button"
                        className={styles.playlistItem}
                        title={playlist.name}
                        onClick={() => {
                          handlePrompt(`/playlist show ${playlist.name}`);
                        }}
                      >
                        <span className={styles.playlistCover}>
                          <PlaylistCoverStack playlist={playlist} />
                        </span>
                        <span className={styles.playlistCopy}>
                          <strong>{playlist.name}</strong>
                          <small>{playlist.tracks.length} tracks</small>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}

function PlaylistCoverStack({ playlist }: { playlist: Playlist }) {
  // Usamos las últimas carátulas disponibles para que el sidebar refleje
  // visualmente lo que ya contiene cada playlist sin cargar otra vista.
  const covers = playlist.tracks
    .map((track) => track.coverUrl)
    .filter((coverUrl): coverUrl is string => Boolean(coverUrl))
    .slice(-3)
    .reverse();

  if (covers.length === 0) {
    return (
      <span className={styles.playlistFallbackCover}>
        {playlist.name.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <span className={styles.coverStack}>
      {covers.map((coverUrl, index) => (
        <span
          key={`${playlist.id}-${coverUrl}-${index}`}
          className={styles.coverThumb}
          style={{ zIndex: covers.length - index }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverUrl} alt={playlist.name} />
        </span>
      ))}
    </span>
  );
}

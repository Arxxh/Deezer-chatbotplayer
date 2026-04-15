'use client';

import type { PlaybackState } from '@/modules/chat/domain/chat';
import { formatDuration } from '@/shared/lib/format-duration';
import styles from './now-playing-panel.module.css';

interface NowPlayingPanelProps {
  playbackState: PlaybackState | null;
  isBootstrapping: boolean;
  onRefresh: () => void | Promise<void>;
}

export function NowPlayingPanel({
  playbackState,
  isBootstrapping,
  onRefresh,
}: NowPlayingPanelProps) {
  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Live deck</p>
          <h3 className={styles.title}>Now playing</h3>
        </div>
        <button type="button" className={styles.refreshButton} onClick={() => void onRefresh()}>
          Sync
        </button>
      </div>

      {isBootstrapping ? (
        <div className={styles.emptyState}>
          <p>Loading playback state…</p>
        </div>
      ) : playbackState?.current ? (
        <>
          <div className={styles.coverFrame}>
            {playbackState.current.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={playbackState.current.coverUrl}
                alt={playbackState.current.albumTitle}
                className={styles.coverImage}
              />
            ) : (
              <div className={styles.coverFallback}>
                {playbackState.current.artistName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className={styles.currentMeta}>
            <strong>{playbackState.current.title}</strong>
            <span>{playbackState.current.artistName}</span>
            <small>
              {playbackState.current.albumTitle} ·{' '}
              {formatDuration(playbackState.current.duration)}
            </small>
          </div>

          <div className={styles.badges}>
            <span className={styles.badge}>
              {playbackState.isPaused ? 'Paused' : 'Live'}
            </span>
            <span className={styles.badge}>{playbackState.queue.length} queued</span>
          </div>

          {playbackState.current.previewUrl ? (
            <audio
              className={styles.audio}
              controls
              preload="none"
              src={playbackState.current.previewUrl}
            />
          ) : (
            <p className={styles.metaText}>Esta pista no trae preview de Deezer.</p>
          )}

          <a
            className={styles.deezerLink}
            href={playbackState.current.deezerUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open in Deezer
          </a>

          <div className={styles.queueSection}>
            <div className={styles.queueHeader}>
              <p className={styles.eyebrow}>Queue</p>
            </div>
            {playbackState.queue.length === 0 ? (
              <p className={styles.metaText}>No songs waiting in queue.</p>
            ) : (
              <ul className={styles.queueList}>
                {playbackState.queue.map((track, index) => (
                  <li key={`${track.id}-${index}`} className={styles.queueItem}>
                    <div>
                      <strong>{track.title}</strong>
                      <span>{track.artistName}</span>
                    </div>
                    <small>{formatDuration(track.duration)}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <div className={styles.emptyState}>
          <p>No hay una pista activa todavía.</p>
          <span>Envía `/play ...` desde el chat para iniciar una sesión.</span>
        </div>
      )}
    </aside>
  );
}

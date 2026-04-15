'use client';

import type { PlaybackState } from '@/modules/chat/domain/chat';
import { formatDuration } from '@/shared/lib/format-duration';
import styles from './now-playing-bar.module.css';

interface NowPlayingBarProps {
  playbackState: PlaybackState | null;
  isSubmitting: boolean;
  onPlayPause: () => void;
  onSkip: () => void;
  playerTelemetry: {
    canControl: boolean;
    currentTimeSeconds: number;
    durationSeconds: number;
    volume: number;
  };
  onSeekTo: (seconds: number) => void;
  onSeekBy: (secondsDelta: number) => void;
  onVolumeChange: (volume: number) => void;
}

export function NowPlayingBar({
  playbackState,
  isSubmitting,
  onPlayPause,
  onSkip,
  playerTelemetry,
  onSeekTo,
  onSeekBy,
  onVolumeChange,
}: NowPlayingBarProps) {
  const currentTrack = playbackState?.current;

  if (!currentTrack) {
    return null;
  }

  const isPaused = playbackState?.isPaused ?? false;
  const currentTimeSeconds = toFiniteNonNegative(playerTelemetry.currentTimeSeconds);
  const durationSeconds = toFiniteNonNegative(playerTelemetry.durationSeconds);
  const volume = clamp(Math.round(playerTelemetry.volume), 0, 100);
  const progressMax = Math.max(durationSeconds, 1);
  const progressValue = Math.min(currentTimeSeconds, progressMax);

  return (
    <div className={styles.barContainer}>
      <div className={styles.topRow}>
        <div className={styles.trackInfo}>
          <div className={styles.coverWrapper}>
            {currentTrack.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentTrack.coverUrl} alt={currentTrack.albumTitle} />
            ) : (
              <span>{currentTrack.artistName.slice(0, 2).toUpperCase()}</span>
            )}
            {!isPaused && (
              <div className={styles.equalizerOverlay}>
                <div className={styles.bar}></div>
                <div className={styles.bar}></div>
                <div className={styles.bar}></div>
              </div>
            )}
          </div>
          <div className={styles.metadata}>
            <div className={styles.titleWrapper}>
              <span className={styles.nowPlayingBadge}>NOW PLAYING</span>
              <strong className={styles.title}>{currentTrack.title}</strong>
            </div>
            <span className={styles.artist}>{currentTrack.artistName}</span>
          </div>
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.controlButton}
            onClick={() => {
              onSeekBy(-10);
            }}
            disabled={isSubmitting || !playerTelemetry.canControl}
            aria-label="Retroceder 10 segundos"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.5 12 19 18V6l-7.5 6ZM4 12l7.5 6V6L4 12Z" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.controlButton}
            onClick={onPlayPause}
            disabled={isSubmitting}
            aria-label={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className={styles.controlButton}
            onClick={onSkip}
            disabled={isSubmitting}
            aria-label="Skip to next track"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.controlButton}
            onClick={() => {
              onSeekBy(10);
            }}
            disabled={isSubmitting || !playerTelemetry.canControl}
            aria-label="Adelantar 10 segundos"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 12 12.5 6v12L20 12ZM12.5 12 5 6v12l7.5-6Z" />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.mixerRow}>
        <label className={styles.progressBlock}>
          <span className={styles.rangeLabel}>Progreso</span>
          <div className={styles.rangeGroup}>
            <span className={styles.rangeValue}>
              {formatDuration(Math.floor(currentTimeSeconds))}
            </span>
            <input
              type="range"
              min={0}
              max={progressMax}
              step={1}
              value={progressValue}
              onChange={(event) => {
                onSeekTo(Number(event.target.value));
              }}
              disabled={!playerTelemetry.canControl}
              className={styles.rangeInput}
            />
            <span className={styles.rangeValue}>
              {formatDuration(Math.floor(durationSeconds))}
            </span>
          </div>
        </label>

        <label className={styles.volumeBlock}>
          <span className={styles.rangeLabel}>Volumen</span>
          <div className={styles.rangeGroup}>
            <span className={styles.rangeValue}>{volume}%</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={volume}
              onChange={(event) => {
                onVolumeChange(Number(event.target.value));
              }}
              disabled={!playerTelemetry.canControl}
              className={styles.rangeInput}
            />
          </div>
        </label>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function toFiniteNonNegative(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

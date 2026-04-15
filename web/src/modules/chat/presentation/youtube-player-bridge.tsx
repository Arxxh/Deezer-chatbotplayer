'use client';

import {
  forwardRef,
  useEffect,
  useEffectEvent,
  useId,
  useImperativeHandle,
  useRef,
} from 'react';
import type { PlaybackState } from '@/modules/chat/domain/chat';
import styles from './chat-workspace.module.css';

interface YouTubePlayerBridgeProps {
  playbackState: PlaybackState | null;
  onTelemetryChange?: (telemetry: PlayerTelemetry) => void;
}

let youtubeIframeApiPromise: Promise<void> | null = null;

export interface PlayerTelemetry {
  canControl: boolean;
  currentTimeSeconds: number;
  durationSeconds: number;
  volume: number;
}

export interface YouTubePlayerBridgeHandle {
  seekTo: (seconds: number) => void;
  seekBy: (secondsDelta: number) => void;
  setVolume: (volume: number) => void;
}

const DEFAULT_PLAYER_TELEMETRY: PlayerTelemetry = {
  canControl: false,
  currentTimeSeconds: 0,
  durationSeconds: 0,
  volume: 80,
};

export const YouTubePlayerBridge = forwardRef<
  YouTubePlayerBridgeHandle,
  YouTubePlayerBridgeProps
>(function YouTubePlayerBridge(
  { playbackState, onTelemetryChange }: YouTubePlayerBridgeProps,
  ref,
) {
  const playerElementId = useId().replace(/:/g, '-');
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const isPlayerReadyRef = useRef(false);
  const currentVideoIdRef = useRef<string | null>(null);
  const playbackStateRef = useRef<PlaybackState | null>(playbackState);
  const onTelemetryChangeRef = useRef(onTelemetryChange);
  const lastTelemetryRef = useRef<PlayerTelemetry>(DEFAULT_PLAYER_TELEMETRY);

  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

  useEffect(() => {
    onTelemetryChangeRef.current = onTelemetryChange;
  }, [onTelemetryChange]);

  const publishTelemetry = useEffectEvent(
    (telemetryOverride?: PlayerTelemetry) => {
      if (telemetryOverride) {
        lastTelemetryRef.current = telemetryOverride;
        onTelemetryChangeRef.current?.(telemetryOverride);
        return;
      }

      const player = playerRef.current;
      const latestPlaybackState = playbackStateRef.current;
      const source = latestPlaybackState?.current?.playbackSource;

      if (
        !player ||
        !isPlayerReadyRef.current ||
        !source ||
        source.provider !== 'youtube'
      ) {
        const fallbackTelemetry = {
          ...lastTelemetryRef.current,
          canControl: false,
          currentTimeSeconds: 0,
          durationSeconds: 0,
        };
        lastTelemetryRef.current = fallbackTelemetry;
        onTelemetryChangeRef.current?.(fallbackTelemetry);
        return;
      }

      const nextTelemetry = {
        canControl: true,
        currentTimeSeconds: toFiniteNonNegative(player.getCurrentTime()),
        durationSeconds: toFiniteNonNegative(player.getDuration()),
        volume: clamp(player.getVolume(), 0, 100),
      };

      lastTelemetryRef.current = nextTelemetry;
      onTelemetryChangeRef.current?.(nextTelemetry);
    },
  );

  const syncPlayer = useEffectEvent(() => {
    const player = playerRef.current;
    const latestPlaybackState = playbackStateRef.current;
    const source = latestPlaybackState?.current?.playbackSource;

    if (!player || !isPlayerReadyRef.current) {
      return;
    }

    if (!source || source.provider !== 'youtube') {
      player.stopVideo();
      currentVideoIdRef.current = null;
      publishTelemetry(DEFAULT_PLAYER_TELEMETRY);
      return;
    }

    if (currentVideoIdRef.current !== source.videoId) {
      if (latestPlaybackState?.isPaused) {
        player.cueVideoById(source.videoId);
      } else {
        player.loadVideoById(source.videoId);
      }
      currentVideoIdRef.current = source.videoId;
    }

    if (latestPlaybackState?.isPaused) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }

    publishTelemetry();
  });

  useImperativeHandle(ref, () => ({
    seekTo(seconds: number) {
      const player = playerRef.current;
      const duration = toFiniteNonNegative(player?.getDuration?.() ?? 0);

      if (!player || !isPlayerReadyRef.current || duration <= 0) {
        return;
      }

      player.seekTo(clamp(seconds, 0, duration), true);
      publishTelemetry();
    },
    seekBy(secondsDelta: number) {
      const player = playerRef.current;
      const currentTime = toFiniteNonNegative(player?.getCurrentTime?.() ?? 0);
      const duration = toFiniteNonNegative(player?.getDuration?.() ?? 0);

      if (!player || !isPlayerReadyRef.current || duration <= 0) {
        return;
      }

      player.seekTo(clamp(currentTime + secondsDelta, 0, duration), true);
      publishTelemetry();
    },
    setVolume(volume: number) {
      const player = playerRef.current;
      const nextVolume = clamp(volume, 0, 100);

      if (!player || !isPlayerReadyRef.current) {
        const fallbackTelemetry = {
          ...lastTelemetryRef.current,
          volume: nextVolume,
        };
        lastTelemetryRef.current = fallbackTelemetry;
        onTelemetryChangeRef.current?.(fallbackTelemetry);
        return;
      }

      player.setVolume(nextVolume);
      publishTelemetry();
    },
  }));

  useEffect(() => {
    let isCancelled = false;

    async function mountPlayer() {
      await loadYouTubeIframeApi();

      if (isCancelled || !window.YT) {
        return;
      }

      playerRef.current = new window.YT.Player(playerElementId, {
        width: 1,
        height: 1,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          origin: window.location.origin,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            isPlayerReadyRef.current = true;
            playerRef.current?.setVolume(lastTelemetryRef.current.volume);
            syncPlayer();
            publishTelemetry();
          },
          onStateChange: () => {
            publishTelemetry();
          },
        },
      });
    }

    void mountPlayer();

    return () => {
      isCancelled = true;
      isPlayerReadyRef.current = false;
      playerRef.current?.destroy();
      playerRef.current = null;
      currentVideoIdRef.current = null;
      publishTelemetry(DEFAULT_PLAYER_TELEMETRY);
    };
  }, [playerElementId]);

  useEffect(() => {
    syncPlayer();
  }, [
    playbackState?.current?.playbackSource?.provider,
    playbackState?.current?.playbackSource?.videoId,
    playbackState?.isPaused,
  ]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      publishTelemetry();
    }, 500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className={styles.hiddenPlayerMount} aria-hidden="true">
      <div id={playerElementId} />
    </div>
  );
});

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

function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (youtubeIframeApiPromise) {
    return youtubeIframeApiPromise;
  }

  youtubeIframeApiPromise = new Promise<void>((resolve) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );

    const previousHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousHandler?.();
      resolve();
    };

    if (existingScript) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.head.appendChild(script);
  });

  return youtubeIframeApiPromise;
}

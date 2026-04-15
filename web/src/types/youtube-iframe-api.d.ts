declare global {
  interface YouTubePlayerInstance {
    loadVideoById(videoId: string): void;
    cueVideoById(videoId: string): void;
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead?: boolean): void;
    getCurrentTime(): number;
    getDuration(): number;
    setVolume(volume: number): void;
    getVolume(): number;
    destroy(): void;
  }

  interface YouTubePlayerOptions {
    width?: string | number;
    height?: string | number;
    videoId?: string;
    playerVars?: Record<string, string | number>;
    events?: {
      onReady?: (event: { target: YouTubePlayerInstance }) => void;
      onStateChange?: (event: {
        data: number;
        target: YouTubePlayerInstance;
      }) => void;
      onError?: (event: {
        data: number;
        target: YouTubePlayerInstance;
      }) => void;
    };
  }

  interface YouTubeIframeApi {
    Player: new (
      elementId: string | HTMLElement,
      options?: YouTubePlayerOptions,
    ) => YouTubePlayerInstance;
  }

  interface Window {
    YT?: YouTubeIframeApi;
    onYouTubeIframeAPIReady?: (() => void) | undefined;
  }
}

export {};

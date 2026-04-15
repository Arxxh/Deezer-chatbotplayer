export interface PlaybackSource {
  provider: 'youtube';
  videoId: string;
  videoTitle: string;
  channelTitle: string;
  confidence: number;
}

export interface Track {
  id: number;
  title: string;
  artistName: string;
  albumTitle: string;
  duration: number;
  previewUrl: string | null;
  deezerUrl: string;
  coverUrl: string | null;
  playbackSource?: PlaybackSource | null;
}

export interface PlaybackState {
  current: Track | null;
  queue: Track[];
  isPaused: boolean;
}

export type ChatCommandName =
  | 'play'
  | 'pause'
  | 'resume'
  | 'skip'
  | 'queue'
  | 'nowplaying'
  | 'help'
  | 'playlist'
  | 'unknown';

export interface ChatResponse {
  command: ChatCommandName;
  reply: string;
  state: PlaybackState;
  alternatives: Track[];
  suggestions: string[];
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  alternatives?: Track[];
  suggestions?: string[];
}

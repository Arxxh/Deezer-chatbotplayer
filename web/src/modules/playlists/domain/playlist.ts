import type { Track } from '@/modules/chat/domain/chat';

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistMutationResponse {
  playlist: Playlist;
  message: string;
}

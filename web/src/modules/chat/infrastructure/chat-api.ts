import type { ChatResponse, PlaybackState } from '@/modules/chat/domain/chat';
import { apiRequest } from '@/shared/infrastructure/api/api-client';

interface ChatMessagePayload {
  message: string;
}

export function sendChatMessage(payload: ChatMessagePayload) {
  return apiRequest<ChatResponse>('/chat/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getPlaybackState() {
  return apiRequest<PlaybackState>('/chat/state');
}

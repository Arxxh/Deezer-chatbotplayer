import { PlaybackState } from '../../domain/entities/playback-state';
import { Track } from '../../domain/entities/track';
import { ChatCommandName } from '../../domain/value-objects/chat-command';

// Contrato de salida de la capa de aplicacion hacia el cliente.
// El frontend puede confiar en esta forma sin importar que adaptador usemos.
export interface ChatResponse {
  command: ChatCommandName;
  reply: string;
  state: PlaybackState;
  alternatives: Track[];
  suggestions: string[];
}

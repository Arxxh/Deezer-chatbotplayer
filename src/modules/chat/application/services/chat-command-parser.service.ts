import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ChatCommandIntent,
  ChatCommandName,
  PlaylistCommandAction,
} from '../../domain/value-objects/chat-command';

@Injectable()
export class ChatCommandParserService {
  private readonly logger = new Logger(ChatCommandParserService.name);

  async parse(message: string): Promise<ChatCommandIntent> {
    const rawMessage = message.trim();

    if (!rawMessage) {
      return {
        command: 'help',
        rawMessage,
      };
    }

    if (rawMessage.startsWith('/')) {
      return this.parseSlashCommand(rawMessage);
    }

    // Usar Gemini si está configurado
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const aiIntent = await this.parseWithGenerativeAI(rawMessage, apiKey);
        if (aiIntent) return aiIntent;
      } catch (error) {
        this.logger.error('Error al usar Gemini API', error);
        // Si flla, caemos al RegEx por defecto
      }
    }

    return this.parseNaturalLanguage(rawMessage);
  }

  private async parseWithGenerativeAI(
    rawMessage: string,
    apiKey: string,
  ): Promise<ChatCommandIntent | null> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
Eres un analizador de intenciones musicales muy inteligente. Vas a extraer la intención de entrada del usuario en lenguaje humano y retornarla en un JSON estrictamente estructurado bajo la interfaz de TypeScript \`ChatCommandIntent\`.

Esquema TypeScript:
type ChatCommandName = 'play' | 'pause' | 'resume' | 'skip' | 'queue' | 'nowplaying' | 'help' | 'playlist' | 'unknown';
interface ChatCommandIntent {
  command: ChatCommandName;
  rawMessage: string;
  query?: string; // Búsqueda de track a reproducir
  playlistAction?: 'list' | 'create' | 'add' | 'show' | 'delete' | 'play';
  playlistName?: string;
  playlistQuery?: string; // Nombre del track a añadir (o vacío si se refiere a "la canción actual", "esta cancion", etc)
}

Por ejemplo:
- "quiero escuchar the box de roddy" -> {"command": "play", "rawMessage": "...", "query": "the box roddy"}
- "queria pausar porfa" -> {"command": "pause", "rawMessage": "..."}
- "muestra mis listas" -> {"command": "playlist", "rawMessage": "...", "playlistAction": "list"}
- "creame la playlist corridos" -> {"command": "playlist", "rawMessage": "...", "playlistAction": "create", "playlistName": "corridos"}
- "/playlist corridos" -> {"command": "playlist", "rawMessage": "...", "playlistAction": "play", "playlistName": "corridos"}
- "agrega esta cancion a la playlist corridos" -> {"command": "playlist", "rawMessage": "...", "playlistAction": "add", "playlistName": "corridos"}
- "borra la playlist corridos" -> {"command": "playlist", "rawMessage": "...", "playlistAction": "delete", "playlistName": "corridos"}
- "añade la combi versace a la playlist bangers" -> {"command": "playlist", "rawMessage": "...", "playlistAction": "add", "playlistName": "bangers", "playlistQuery": "la combi versace"}
- "que estupidez" -> {"command": "unknown", "rawMessage": "..."}

Extrae el JSON para este comando:
"${rawMessage}"
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed: unknown = JSON.parse(responseText);

    if (isChatCommandIntentCandidate(parsed)) {
      return {
        ...parsed,
        rawMessage, // Mantenemos siempre el string original limpio
      };
    }
    return null;
  }

  private parseSlashCommand(rawMessage: string): ChatCommandIntent {
    const [commandToken] = rawMessage.split(/\s+/, 1);
    const query = rawMessage.slice(commandToken.length).trim();
    const command = this.mapSlashCommand(commandToken.slice(1).toLowerCase());

    if (command === 'playlist') {
      return this.parsePlaylistCommand(rawMessage, query);
    }

    return {
      command,
      rawMessage,
      query: query || undefined,
    };
  }

  private parseNaturalLanguage(rawMessage: string): ChatCommandIntent {
    // Normalizamos texto para tolerar mayusculas, acentos y espacios extra.
    const normalizedMessage = normalizeText(rawMessage);

    const playlistIntent = this.parsePlaylistNaturalLanguage(
      normalizedMessage,
      rawMessage,
    );
    if (playlistIntent) {
      return playlistIntent;
    }

    const playRegex =
      /^(?:quiero escuchar|quiero que reproduzcas|quiero que pongas|hagas play de|ponme|pon|reproduce|toca|play)(?:\s+(?:a|de|la cancion)(?=\s|$))?\s*(.*)$/i;
    const playMatch = normalizedMessage.match(playRegex);
    if (playMatch) {
      return {
        command: 'play',
        rawMessage,
        query: playMatch[1].trim() || undefined,
      };
    }

    const directCommands: Array<[ChatCommandName, string[]]> = [
      ['pause', ['pause', 'pausa', 'deten']],
      ['resume', ['resume', 'reanuda', 'continua', 'continua la musica']],
      ['skip', ['skip', 'salta', 'siguiente', 'siguiente cancion']],
      ['queue', ['queue', 'cola', 'ver cola']],
      [
        'nowplaying',
        [
          'now playing',
          'ahora suena',
          'que suena',
          'que esta sonando',
          'que esta sonando ahora',
        ],
      ],
      ['help', ['help', 'ayuda', 'comandos']],
    ];

    for (const [command, aliases] of directCommands) {
      if (aliases.includes(normalizedMessage)) {
        return {
          command,
          rawMessage,
        };
      }
    }

    if (['pon', 'reproduce', 'toca', 'play'].includes(normalizedMessage)) {
      return {
        command: 'play',
        rawMessage,
      };
    }

    return {
      command: 'unknown',
      rawMessage,
    };
  }

  private parsePlaylistNaturalLanguage(
    normalizedMessage: string,
    rawMessage: string,
  ): ChatCommandIntent | null {
    if (
      /^(lista|listar|ver|mostrar|muestrame|enseñame|ensename|mostrar mis|ver mis|muestrame mis)\s+(playlists?|listas?|mis playlists?|mis listas?)$/.test(
        normalizedMessage,
      )
    ) {
      return { command: 'playlist', rawMessage, playlistAction: 'list' };
    }

    const createRegex =
      /^(?:crea|creame|crear|quiero crear)\s+(?:una\s+)?(?:playlist|lista)(?:\s+llamada|\s+de|\s+que se llame)?\s+(.+)$/i;
    const createMatch = normalizedMessage.match(createRegex);
    if (createMatch) {
      return {
        command: 'playlist',
        rawMessage,
        playlistAction: 'create',
        playlistName: createMatch[1].trim(),
      };
    }

    const showRegex =
      /^(?:ver|mostrar|abre|enseñame|ensename)\s+(?:la\s+)?(?:playlist|lista)(?:\s+llamada|\s+de)?\s+(.+)$/i;
    const showMatch = normalizedMessage.match(showRegex);
    if (showMatch) {
      return {
        command: 'playlist',
        rawMessage,
        playlistAction: 'show',
        playlistName: showMatch[1].trim(),
      };
    }

    const deleteRegex =
      /^(?:borra|borrar|elimina|eliminar|quita)\s+(?:la\s+)?(?:playlist|lista)(?:\s+llamada|\s+de)?\s+(.+)$/i;
    const deleteMatch = normalizedMessage.match(deleteRegex);
    if (deleteMatch) {
      return {
        command: 'playlist',
        rawMessage,
        playlistAction: 'delete',
        playlistName: deleteMatch[1].trim(),
      };
    }

    const addRegex =
      /^(?:agrega|anade|añade|mete)\s+(.+?)\s+(?:a la\s+|a mi\s+|en la\s+|en mi\s+|a\s+)?(?:playlist|lista)\s+(.+)$/i;
    const addMatch = normalizedMessage.match(addRegex);
    if (addMatch) {
      const trackObj = addMatch[1].trim();
      const playlistName = addMatch[2].trim();

      if (
        trackObj === 'esta cancion' ||
        trackObj === 'esto' ||
        trackObj === 'la cancion actual' ||
        trackObj === 'la cancion'
      ) {
        return {
          command: 'playlist',
          rawMessage,
          playlistAction: 'add',
          playlistName,
        };
      }
      return {
        command: 'playlist',
        rawMessage,
        playlistAction: 'add',
        playlistName,
        playlistQuery: trackObj,
      };
    }

    return null;
  }

  private mapSlashCommand(command: string): ChatCommandName {
    // Este mapping concentra todos los aliases slash soportados.
    switch (command) {
      case 'play':
        return 'play';
      case 'pause':
        return 'pause';
      case 'resume':
        return 'resume';
      case 'skip':
        return 'skip';
      case 'queue':
        return 'queue';
      case 'nowplaying':
      case 'np':
        return 'nowplaying';
      case 'help':
        return 'help';
      case 'playlist':
        return 'playlist';
      default:
        return 'unknown';
    }
  }

  private parsePlaylistCommand(
    rawMessage: string,
    remainder: string,
  ): ChatCommandIntent {
    const normalizedRemainder = remainder.trim();

    if (!normalizedRemainder) {
      return {
        command: 'playlist',
        rawMessage,
      };
    }

    if (normalizedRemainder === 'list') {
      return {
        command: 'playlist',
        rawMessage,
        playlistAction: 'list',
      };
    }

    if (normalizedRemainder.startsWith('create ')) {
      return {
        command: 'playlist',
        rawMessage,
        playlistAction: 'create',
        playlistName:
          normalizedRemainder.slice('create '.length).trim() || undefined,
      };
    }

    if (normalizedRemainder.startsWith('show ')) {
      return {
        command: 'playlist',
        rawMessage,
        playlistAction: 'show',
        playlistName:
          normalizedRemainder.slice('show '.length).trim() || undefined,
      };
    }

    if (normalizedRemainder.startsWith('delete ')) {
      return {
        command: 'playlist',
        rawMessage,
        playlistAction: 'delete',
        playlistName:
          normalizedRemainder.slice('delete '.length).trim() || undefined,
      };
    }

    if (normalizedRemainder.startsWith('add ')) {
      const payload = normalizedRemainder.slice('add '.length).trim();
      const separatorIndex = payload.indexOf('::');

      if (separatorIndex === -1) {
        return {
          command: 'playlist',
          rawMessage,
          playlistAction: 'add',
        };
      }

      const playlistName = payload.slice(0, separatorIndex).trim();
      const playlistQuery = payload.slice(separatorIndex + 2).trim();

      return {
        command: 'playlist',
        rawMessage,
        playlistAction: 'add',
        playlistName: playlistName || undefined,
        playlistQuery: playlistQuery || undefined,
      };
    }

    return {
      command: 'playlist',
      rawMessage,
      playlistAction: 'play',
      playlistName: normalizedRemainder,
    };
  }
}

function isChatCommandIntentCandidate(
  value: unknown,
): value is Pick<
  ChatCommandIntent,
  'command' | 'query' | 'playlistAction' | 'playlistName' | 'playlistQuery'
> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.command === 'string' &&
    isOptionalString(candidate.query) &&
    isOptionalString(candidate.playlistName) &&
    isOptionalString(candidate.playlistQuery) &&
    isOptionalPlaylistAction(candidate.playlistAction)
  );
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isOptionalPlaylistAction(
  value: unknown,
): value is PlaylistCommandAction | undefined {
  return (
    value === undefined ||
    value === 'list' ||
    value === 'create' ||
    value === 'add' ||
    value === 'show' ||
    value === 'delete' ||
    value === 'play'
  );
}

function normalizeText(value: string): string {
  // NFD + regex elimina tildes: "qué" -> "que".
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

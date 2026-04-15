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

export type PlaylistCommandAction =
  | 'create'
  | 'add'
  | 'show'
  | 'list'
  | 'delete'
  | 'play';

// definimos los comandos validos para que el sistema entienda que comandos puede ejecutar internamente

export interface ChatCommandIntent {
  command: ChatCommandName;
  rawMessage: string;
  query?: string;
  playlistAction?: PlaylistCommandAction;
  playlistName?: string;
  playlistQuery?: string;
}

// command es ChatCommandName(sus tipos)
// rawMessage es el texto original por el usuario escrito
// query es el texto que sigue al comando, por ejemplo si el usuario escribe "/play Despacito", el rawMessage es "/play Despacito" y el query es "Despacito"

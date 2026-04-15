'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import type {
  ConversationMessage,
  PlaybackState,
  Track,
} from '@/modules/chat/domain/chat';
import {
  getPlaybackState,
  sendChatMessage,
} from '@/modules/chat/infrastructure/chat-api';
import type { Playlist } from '@/modules/playlists/domain/playlist';
import { listPlaylists } from '@/modules/playlists/infrastructure/playlists-api';
import {
  consumePendingChatPrompt,
  emitPlaylistsChanged,
  subscribeToChatPromptSelected,
  subscribeToChatReset,
  subscribeToPlaylistsChanged,
} from '@/shared/application/browser-events';
import {
  listRecentPrompts,
  pushRecentPrompt,
  subscribeToRecentPromptsChanged,
} from '@/shared/application/recent-prompts';
import {
  DEFAULT_COVER_THEME,
  extractCoverTheme,
} from '@/shared/lib/extract-cover-theme';
import { formatDuration } from '@/shared/lib/format-duration';
import styles from './chat-workspace.module.css';
import { NowPlayingBar } from './now-playing-bar';
import {
  PlayerTelemetry,
  YouTubePlayerBridge,
  YouTubePlayerBridgeHandle,
} from './youtube-player-bridge';

const COMMAND_AUTOCOMPLETE_SUGGESTIONS: AutocompleteSuggestion[] = [
  {
    id: 'play',
    label: '/play',
    value: '/play ',
    hint: 'Busca una canción',
  },
  {
    id: 'pause',
    label: '/pause',
    value: '/pause',
    hint: 'Pausar',
  },
  {
    id: 'resume',
    label: '/resume',
    value: '/resume',
    hint: 'Reanudar',
  },
  {
    id: 'skip',
    label: '/skip',
    value: '/skip',
    hint: 'Saltar track',
  },
  {
    id: 'queue',
    label: '/queue',
    value: '/queue',
    hint: 'Ver cola',
  },
  {
    id: 'nowplaying',
    label: '/nowplaying',
    value: '/nowplaying',
    hint: 'Canción actual',
  },
  {
    id: 'help',
    label: '/help',
    value: '/help',
    hint: 'Comandos',
  },
  {
    id: 'np',
    label: '/np',
    value: '/np',
    hint: 'Alias de nowplaying',
  },
  {
    id: 'playlist-create',
    label: '/playlist create',
    value: '/playlist create ',
    hint: 'Crear playlist',
  },
  {
    id: 'playlist-add',
    label: '/playlist add',
    value: '/playlist add ',
    hint: 'Agregar canción',
  },
  {
    id: 'playlist-list',
    label: '/playlist list',
    value: '/playlist list',
    hint: 'Ver playlists',
  },
  {
    id: 'playlist-show',
    label: '/playlist show',
    value: '/playlist show ',
    hint: 'Abrir playlist',
  },
  {
    id: 'playlist-delete',
    label: '/playlist delete',
    value: '/playlist delete ',
    hint: 'Eliminar playlist',
  },
  {
    id: 'play-playlist',
    label: '/play playlist',
    value: '/play playlist ',
    hint: 'Reproducir playlist creada',
  },
];

export function ChatWorkspace() {
  const playerBridgeRef = useRef<YouTubePlayerBridgeHandle | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playerTelemetry, setPlayerTelemetry] = useState<PlayerTelemetry>({
    canControl: false,
    currentTimeSeconds: 0,
    durationSeconds: 0,
    volume: 80,
  });
  const [coverTheme, setCoverTheme] = useState(DEFAULT_COVER_THEME);
  const currentCoverUrl = playbackState?.current?.coverUrl ?? null;

  useEffect(() => {
    // Recupera prompts disparados desde el sidebar cuando hubo navegación
    // previa hacia `/`, sin arrastrarlos en la URL ni al refrescar la página.
    const pendingPrompt = consumePendingChatPrompt();
    const currentUrl = new URL(window.location.href);
    const legacyPrompt = currentUrl.searchParams.get('prompt');

    if (pendingPrompt) {
      setDraft(pendingPrompt);
      return;
    }

    // Compatibilidad con URLs viejas del tipo `/?prompt=...`: usamos el valor
    // una sola vez y limpiamos la barra para que Ctrl+R ya no lo conserve.
    if (legacyPrompt) {
      setDraft(legacyPrompt);
      currentUrl.searchParams.delete('prompt');
      const nextQuery = currentUrl.searchParams.toString();
      const nextUrl = `${currentUrl.pathname}${
        nextQuery ? `?${nextQuery}` : ''
      }${currentUrl.hash}`;
      window.history.replaceState(window.history.state, '', nextUrl);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    // El workspace toma el color dominante de la portada actual para construir
    // un ambiente dinámico sin alterar el contenido principal del chat.
    async function syncCoverTheme() {
      const nextTheme = await extractCoverTheme(currentCoverUrl);

      if (!isCancelled) {
        setCoverTheme(nextTheme);
      }
    }

    void syncCoverTheme();

    return () => {
      isCancelled = true;
    };
  }, [currentCoverUrl]);

  useEffect(() => {
    let isMounted = true;

    async function loadPlaybackState() {
      try {
        const nextState = await getPlaybackState();
        if (isMounted) {
          setPlaybackState(nextState);
        }
      } catch {
        // El chat puede seguir funcionando aunque la carga inicial falle.
      }
    }

    void loadPlaybackState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return subscribeToChatReset(() => {
      setMessages([]);
      setDraft('');
      setErrorMessage(null);
    });
  }, []);

  useEffect(() => {
    return subscribeToChatPromptSelected((prompt) => {
      setDraft(prompt);
    });
  }, []);

  useEffect(() => {
    if (!messageListRef.current) {
      return;
    }

    messageListRef.current.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isSubmitting]);

  async function submitMessage(messageOverride?: string) {
    const nextMessage = (messageOverride ?? draft).trim();

    if (!nextMessage || isSubmitting) {
      return;
    }

    setDraft('');
    setErrorMessage(null);
    setIsSubmitting(true);
    pushRecentPrompt(nextMessage);

    // El mensaje del usuario se agrega primero para que el chat se sienta
    // inmediato mientras llega la respuesta real del backend.
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: nextMessage,
      },
    ]);

    try {
      const response = await sendChatMessage({ message: nextMessage });

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.reply,
          alternatives: response.alternatives,
          suggestions: response.suggestions,
        },
      ]);
      setPlaybackState(response.state);

      if (response.command === 'playlist') {
        emitPlaylistsChanged();
      }
    } catch (error) {
      const nextErrorMessage =
        error instanceof Error ? error.message : 'No pude hablar con el backend.';

      setErrorMessage(nextErrorMessage);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: nextErrorMessage,
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage();
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <section className={styles.workspace}>
      <div className={styles.workspaceBackdrop} aria-hidden="true">
        <div
          className={styles.workspaceTintBase}
          style={{ backgroundColor: coverTheme.baseWash }}
        />
        <div
          className={styles.workspaceTintPrimary}
          style={{ backgroundColor: coverTheme.primaryGlow }}
        />
        <div
          className={styles.workspaceTintSecondary}
          style={{ backgroundColor: coverTheme.secondaryGlow }}
        />
      </div>
      <YouTubePlayerBridge
        ref={playerBridgeRef}
        playbackState={playbackState}
        onTelemetryChange={setPlayerTelemetry}
      />

      <div className={styles.stage}>
        {hasMessages ? (
          <div ref={messageListRef} className={styles.messageScroll}>
            <div className={styles.messageColumn}>
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={
                    message.role === 'assistant'
                      ? styles.assistantMessage
                      : styles.userMessage
                  }
                >
                  <div className={styles.messageMeta}>
                    {message.role === 'assistant' ? 'musicBot' : 'Tu'}
                  </div>
                  <p className={styles.messageContent}>{message.content}</p>

                  {message.alternatives && message.alternatives.length > 0 ? (
                    <div className={styles.alternativeList}>
                      {message.alternatives.map((track) => (
                        <TrackSuggestionCard key={track.id} track={track} />
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}

              {isSubmitting ? (
                <article className={styles.assistantMessage}>
                  <div className={styles.messageMeta}>musicBot</div>
                  <p className={styles.messageContent}>Consultando el deck...</p>
                </article>
              ) : null}
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.logoLockup}>
              <div className={styles.heroMark} aria-hidden="true">
                <svg
                  className={styles.heroMarkIcon}
                  viewBox="0 0 64 64"
                  fill="none"
                >
                  <path
                    d="M42 11v28.4a10.5 10.5 0 1 1-6-9.48V19.52l18-4.93v19.32a10.5 10.5 0 1 1-6-9.48V11L42 12.64Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <h1 className={styles.heroTitle}>musicBot</h1>
            </div>

            <div className={styles.centerComposer}>
              <NowPlayingBar
                playbackState={playbackState}
                isSubmitting={isSubmitting}
                playerTelemetry={playerTelemetry}
                onPlayPause={() => {
                  void submitMessage(playbackState?.isPaused ? '/resume' : '/pause');
                }}
                onSkip={() => {
                  void submitMessage('/skip');
                }}
                onSeekTo={(seconds) => {
                  playerBridgeRef.current?.seekTo(seconds);
                }}
                onSeekBy={(secondsDelta) => {
                  playerBridgeRef.current?.seekBy(secondsDelta);
                }}
                onVolumeChange={(volume) => {
                  playerBridgeRef.current?.setVolume(volume);
                }}
              />
              <Composer
                draft={draft}
                isSubmitting={isSubmitting}
                errorMessage={errorMessage}
                onChange={setDraft}
                onSubmit={handleSubmit}
                onKeyDown={handleTextareaKeyDown}
              />

            </div>
          </div>
        )}

        {hasMessages ? (
          <div className={styles.composerDock}>
            <NowPlayingBar
              playbackState={playbackState}
              isSubmitting={isSubmitting}
              playerTelemetry={playerTelemetry}
              onPlayPause={() => {
                void submitMessage(playbackState?.isPaused ? '/resume' : '/pause');
              }}
              onSkip={() => {
                void submitMessage('/skip');
              }}
              onSeekTo={(seconds) => {
                playerBridgeRef.current?.seekTo(seconds);
              }}
              onSeekBy={(secondsDelta) => {
                playerBridgeRef.current?.seekBy(secondsDelta);
              }}
              onVolumeChange={(volume) => {
                playerBridgeRef.current?.setVolume(volume);
              }}
            />
            <Composer
              draft={draft}
              isSubmitting={isSubmitting}
              errorMessage={errorMessage}
              onChange={setDraft}
              onSubmit={handleSubmit}
              onKeyDown={handleTextareaKeyDown}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

interface ComposerProps {
  draft: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}

function Composer({
  draft,
  isSubmitting,
  errorMessage,
  onChange,
  onSubmit,
  onKeyDown,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // El composer resuelve dos flujos con las mismas teclas:
  // autocomplete abierto y, si no está abierto, historial local de prompts.
  const historyIndexRef = useRef<number | null>(null);
  const draftBeforeHistoryRef = useRef('');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [promptHistory, setPromptHistory] = useState<string[]>(() =>
    listRecentPrompts(),
  );
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const autocompleteSuggestions = getAutocompleteSuggestions(draft, playlists);
  const currentSuggestionIndex =
    autocompleteSuggestions.length === 0
      ? -1
      : Math.min(activeSuggestionIndex, autocompleteSuggestions.length - 1);

  useEffect(() => {
    let isMounted = true;

    async function loadPlaylists() {
      try {
        const nextPlaylists = await listPlaylists();
        if (isMounted) {
          setPlaylists(nextPlaylists);
        }
      } catch {
        if (isMounted) {
          setPlaylists([]);
        }
      }
    }

    void loadPlaylists();

    const unsubscribe = subscribeToPlaylistsChanged(() => {
      void loadPlaylists();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    return subscribeToRecentPromptsChanged(() => {
      setPromptHistory(listRecentPrompts());
    });
  }, []);

  function applyAutocompleteSuggestion(nextValue: string) {
    historyIndexRef.current = null;
    draftBeforeHistoryRef.current = '';
    onChange(nextValue);
    setActiveSuggestionIndex(0);

    requestAnimationFrame(() => {
      const selectionPosition = nextValue.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(
        selectionPosition,
        selectionPosition,
      );
    });
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const activeSuggestionValue =
      currentSuggestionIndex >= 0
        ? autocompleteSuggestions[currentSuggestionIndex]?.value
        : undefined;
    const canApplyAutocomplete =
      typeof activeSuggestionValue === 'string' &&
      activeSuggestionValue !== draft;

    // Mientras el panel de autocomplete está abierto, las flechas navegan las
    // sugerencias antes de pasar al historial de prompts.
    if (autocompleteSuggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveSuggestionIndex((currentIndex) =>
          (currentIndex + 1) % autocompleteSuggestions.length,
        );
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveSuggestionIndex((currentIndex) =>
          currentIndex === 0
            ? autocompleteSuggestions.length - 1
            : currentIndex - 1,
        );
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        if (typeof activeSuggestionValue === 'string') {
          applyAutocompleteSuggestion(activeSuggestionValue);
        }
        return;
      }

      if (event.key === 'Enter' && !event.shiftKey) {
        if (canApplyAutocomplete) {
          event.preventDefault();
          applyAutocompleteSuggestion(activeSuggestionValue);
          return;
        }
      }
    }

    // Sin autocomplete activo, flecha arriba/abajo recorre el historial local.
    if (event.key === 'ArrowUp' && promptHistory.length > 0) {
      event.preventDefault();

      const nextHistoryIndex =
        historyIndexRef.current === null
          ? 0
          : Math.min(historyIndexRef.current + 1, promptHistory.length - 1);

      if (historyIndexRef.current === null) {
        draftBeforeHistoryRef.current = draft;
      }

      historyIndexRef.current = nextHistoryIndex;
      onChange(promptHistory[nextHistoryIndex] ?? '');
      return;
    }

    if (event.key === 'ArrowDown' && historyIndexRef.current !== null) {
      event.preventDefault();

      if (historyIndexRef.current === 0) {
        historyIndexRef.current = null;
        onChange(draftBeforeHistoryRef.current);
        draftBeforeHistoryRef.current = '';
        return;
      }

      const nextHistoryIndex = historyIndexRef.current - 1;
      historyIndexRef.current = nextHistoryIndex;
      onChange(promptHistory[nextHistoryIndex] ?? '');
      return;
    }

    onKeyDown(event);
  }

  return (
    <form className={styles.composerShell} onSubmit={onSubmit}>
      {autocompleteSuggestions.length > 0 ? (
        <div className={styles.autocompletePanel}>
          {autocompleteSuggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              className={
                index === currentSuggestionIndex
                  ? `${styles.autocompleteItem} ${styles.autocompleteItemActive}`
                  : styles.autocompleteItem
              }
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onMouseEnter={() => {
                setActiveSuggestionIndex(index);
              }}
              onClick={() => {
                applyAutocompleteSuggestion(suggestion.value);
              }}
            >
              <span className={styles.autocompleteLabel}>
                {suggestion.label}
              </span>
              <span className={styles.autocompleteHint}>{suggestion.hint}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.composerSurface}>
        <textarea
          ref={textareaRef}
          rows={1}
          value={draft}
          onChange={(event) => {
            historyIndexRef.current = null;
            draftBeforeHistoryRef.current = '';
            onChange(event.target.value);
          }}
          onKeyDown={handleComposerKeyDown}
          placeholder="¿Que quieres saber?"
          className={styles.textarea}
        />

        <div className={styles.composerActions}>
          <button
            type="submit"
            className={styles.sendButton}
            disabled={isSubmitting}
            aria-label="Enviar mensaje"
          >
            {isSubmitting ? '...' : '>'}
          </button>
        </div>
      </div>

      {errorMessage ? <p className={styles.errorText}>{errorMessage}</p> : null}
    </form>
  );
}

function TrackSuggestionCard({ track }: { track: Track }) {
  return (
    <div className={styles.trackCard}>
      <div className={styles.trackCover}>
        {track.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.coverUrl} alt={track.albumTitle} />
        ) : (
          <span>{track.artistName.slice(0, 2).toUpperCase()}</span>
        )}
      </div>

      <div className={styles.trackBody}>
        <strong>{track.title}</strong>
        <span>
          {track.artistName} · {formatDuration(track.duration)}
        </span>
      </div>

      <a
        className={styles.inlineLink}
        href={track.deezerUrl}
        target="_blank"
        rel="noreferrer"
      >
        Deezer
      </a>
    </div>
  );
}

interface AutocompleteSuggestion {
  id: string;
  label: string;
  value: string;
  hint: string;
}

function getAutocompleteSuggestions(
  draft: string,
  playlists: Playlist[],
): AutocompleteSuggestion[] {
  const normalizedDraft = draft.trimStart().toLowerCase();

  if (!normalizedDraft.startsWith('/')) {
    return [];
  }

  if (normalizedDraft.startsWith('/playlist show')) {
    return getPlaylistNameSuggestions({
      playlists,
      action: 'show',
      normalizedDraft,
    });
  }

  if (normalizedDraft.startsWith('/playlist delete')) {
    return getPlaylistNameSuggestions({
      playlists,
      action: 'delete',
      normalizedDraft,
    });
  }

  if (normalizedDraft.startsWith('/playlist add')) {
    return getPlaylistNameSuggestions({
      playlists,
      action: 'add',
      normalizedDraft,
    });
  }

  if (normalizedDraft.startsWith('/play playlist')) {
    return getPlayPlaylistSuggestions(playlists, normalizedDraft);
  }

  if (normalizedDraft.startsWith('/play ')) {
    const playlistSuggestions = getPlayPlaylistSuggestions(
      playlists,
      normalizedDraft,
    );
    const commandSuggestions = COMMAND_AUTOCOMPLETE_SUGGESTIONS.filter(
      (suggestion) =>
        suggestion.label.toLowerCase().startsWith(normalizedDraft) ||
        suggestion.value.toLowerCase().startsWith(normalizedDraft),
    );

    return [...playlistSuggestions, ...commandSuggestions].slice(0, 6);
  }

  if (normalizedDraft === '/playlist' || normalizedDraft.startsWith('/playlist ')) {
    const commandSuggestions = COMMAND_AUTOCOMPLETE_SUGGESTIONS.filter(
      (suggestion) => suggestion.label.toLowerCase().startsWith(normalizedDraft),
    );
    const playlistPlaySuggestions = getPlaylistPlaySuggestions(
      playlists,
      normalizedDraft,
    );

    return [...playlistPlaySuggestions, ...commandSuggestions].slice(0, 6);
  }

  return COMMAND_AUTOCOMPLETE_SUGGESTIONS.filter(
    (suggestion) =>
      suggestion.label.toLowerCase().startsWith(normalizedDraft) ||
      suggestion.value.toLowerCase().startsWith(normalizedDraft),
  ).slice(0, 6);
}

function getPlayPlaylistSuggestions(
  playlists: Playlist[],
  normalizedDraft: string,
): AutocompleteSuggestion[] {
  const explicitPrefix = '/play playlist';
  const playlistQuery = normalizedDraft.startsWith(explicitPrefix)
    ? normalizedDraft.slice(explicitPrefix.length).trim()
    : normalizedDraft.slice('/play'.length).trim();

  return playlists
    .filter((playlist) =>
      playlist.name.toLowerCase().includes(playlistQuery),
    )
    .slice(0, 6)
    .map((playlist) => ({
      id: `play-playlist-${playlist.id}`,
      label: `/play playlist ${playlist.name}`,
      value: `/play playlist ${playlist.name}`,
      hint: `Playlist · ${playlist.tracks.length} tracks`,
    }));
}

function getPlaylistPlaySuggestions(
  playlists: Playlist[],
  normalizedDraft: string,
): AutocompleteSuggestion[] {
  // `/playlist <nombre>` funciona como atajo para reproducir la playlist,
  // por eso aquí sugerimos nombres reales además de los subcomandos.
  const playlistQuery = normalizedDraft.slice('/playlist'.length).trim();

  return playlists
    .filter((playlist) =>
      playlist.name.toLowerCase().includes(playlistQuery),
    )
    .slice(0, 6)
    .map((playlist) => ({
      id: `play-${playlist.id}`,
      label: `/playlist ${playlist.name}`,
      value: `/playlist ${playlist.name}`,
      hint: `Reproducir · ${playlist.tracks.length} tracks`,
    }));
}

function getPlaylistNameSuggestions({
  playlists,
  action,
  normalizedDraft,
}: {
  playlists: Playlist[];
  action: 'show' | 'delete' | 'add';
  normalizedDraft: string;
}): AutocompleteSuggestion[] {
  const actionPrefix = `/playlist ${action}`;
  const actionRemainder = normalizedDraft.slice(actionPrefix.length).trim();
  if (action === 'add' && actionRemainder.includes('::')) {
    return [];
  }

  const playlistQuery =
    action === 'add'
      ? actionRemainder.split('::', 1)[0]?.trim() ?? ''
      : actionRemainder;
  const matchingPlaylists = playlists
    .filter((playlist) =>
      playlist.name.toLowerCase().includes(playlistQuery),
    )
    .slice(0, 6)
    .map((playlist) => ({
      id: `${action}-${playlist.id}`,
      label:
        action === 'add'
          ? `${actionPrefix} ${playlist.name} :: `
          : `${actionPrefix} ${playlist.name}`,
      value:
        action === 'add'
          ? `${actionPrefix} ${playlist.name} :: `
          : `${actionPrefix} ${playlist.name}`,
      hint:
        action === 'delete'
          ? 'Eliminar playlist'
          : action === 'add'
            ? 'Elegir playlist'
          : `${playlist.tracks.length} tracks`,
    }));

  if (matchingPlaylists.length > 0) {
    return matchingPlaylists;
  }

  return COMMAND_AUTOCOMPLETE_SUGGESTIONS.filter((suggestion) =>
    suggestion.label.toLowerCase().startsWith(actionPrefix),
  );
}

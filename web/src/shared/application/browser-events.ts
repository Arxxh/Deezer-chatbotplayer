const PLAYLISTS_CHANGED_EVENT = 'playlists:changed';
const CHAT_RESET_EVENT = 'chat:reset';
const CHAT_PROMPT_SELECTED_EVENT = 'chat:prompt-selected';
const PENDING_CHAT_PROMPT_STORAGE_KEY = 'chat:pending-prompt';

// Este archivo funciona como un bus mínimo del lado del browser para conectar
// sidebar, chat y composer sin obligarlos a importarse entre sí.
export function emitPlaylistsChanged() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(PLAYLISTS_CHANGED_EVENT));
}

export function subscribeToPlaylistsChanged(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const listener = () => callback();
  window.addEventListener(PLAYLISTS_CHANGED_EVENT, listener);

  return () => {
    window.removeEventListener(PLAYLISTS_CHANGED_EVENT, listener);
  };
}

export function emitChatReset() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(CHAT_RESET_EVENT));
}

export function subscribeToChatReset(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const listener = () => callback();
  window.addEventListener(CHAT_RESET_EVENT, listener);

  return () => {
    window.removeEventListener(CHAT_RESET_EVENT, listener);
  };
}

export function emitChatPromptSelected(prompt: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(CHAT_PROMPT_SELECTED_EVENT, {
      detail: prompt,
    }),
  );
}

// Cuando el usuario dispara un prompt desde otra ruta, lo guardamos de forma
// temporal para poder recuperarlo al entrar al chat sin dejarlo en la URL.
export function savePendingChatPrompt(prompt: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(PENDING_CHAT_PROMPT_STORAGE_KEY, prompt);
}

export function consumePendingChatPrompt() {
  if (typeof window === 'undefined') {
    return null;
  }

  const pendingPrompt = window.sessionStorage.getItem(
    PENDING_CHAT_PROMPT_STORAGE_KEY,
  );

  if (!pendingPrompt) {
    return null;
  }

  window.sessionStorage.removeItem(PENDING_CHAT_PROMPT_STORAGE_KEY);
  return pendingPrompt;
}

export function subscribeToChatPromptSelected(
  callback: (prompt: string) => void,
) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const listener = (event: Event) => {
    const nextPrompt = (event as CustomEvent<string>).detail;
    callback(nextPrompt);
  };

  window.addEventListener(CHAT_PROMPT_SELECTED_EVENT, listener);

  return () => {
    window.removeEventListener(CHAT_PROMPT_SELECTED_EVENT, listener);
  };
}

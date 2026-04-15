// Local-only prompt history so the sidebar can feel like a thread list
// without introducing backend persistence for conversations yet.
const RECENT_PROMPTS_STORAGE_KEY = 'sonic-thread:recent-prompts';
const RECENT_PROMPTS_CHANGED_EVENT = 'recent-prompts:changed';
const MAX_RECENT_PROMPTS = 6;

export function listRecentPrompts() {
  if (typeof window === 'undefined') {
    return [];
  }

  const storedValue = window.localStorage.getItem(RECENT_PROMPTS_STORAGE_KEY);

  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue)
      ? parsedValue.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

export function pushRecentPrompt(prompt: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    return;
  }

  const nextPrompts = [
    trimmedPrompt,
    ...listRecentPrompts().filter((storedPrompt) => storedPrompt !== trimmedPrompt),
  ].slice(0, MAX_RECENT_PROMPTS);

  window.localStorage.setItem(
    RECENT_PROMPTS_STORAGE_KEY,
    JSON.stringify(nextPrompts),
  );
  window.dispatchEvent(new Event(RECENT_PROMPTS_CHANGED_EVENT));
}

export function subscribeToRecentPromptsChanged(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const listener = () => callback();
  window.addEventListener(RECENT_PROMPTS_CHANGED_EVENT, listener);

  return () => {
    window.removeEventListener(RECENT_PROMPTS_CHANGED_EVENT, listener);
  };
}

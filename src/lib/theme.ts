import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'portal.theme';
// The browser chrome matches the page's sky.
const SKY: Record<Theme, string> = { light: '#f7efe4', dark: '#1a1b2f' };

const darkQuery = () =>
  typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

/** The theme someone picked, or null to follow the phone's colour scheme. */
let picked: Theme | null = (() => {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
})();

const current = (): Theme => picked ?? (darkQuery()?.matches ? 'dark' : 'light');

const listeners = new Set<() => void>();

/** Puts the theme on <html> (index.html does the same before React loads, so there is no flash). */
export function applyTheme() {
  const theme = current();
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', SKY[theme]);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const query = darkQuery();
  query?.addEventListener('change', applyTheme);
  return () => {
    listeners.delete(listener);
    query?.removeEventListener('change', applyTheme);
  };
}

/** Pins a theme for this device (from then on the system scheme no longer switches it). */
export function setTheme(theme: Theme) {
  picked = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
  applyTheme();
}

/** The theme on screen now; re-renders when it changes. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, current);
}

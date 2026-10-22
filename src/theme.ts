import { useSettings, type Theme } from './store/settings';

/**
 * Light or dark for the whole app: the setting, or the device's own when it's "system". Sets
 * data-theme on <html> (global.css swaps the color tokens on it) and the browser chrome color.
 */

const dark = window.matchMedia('(prefers-color-scheme: dark)');

const CHROME = { light: '#f1ebe0', dark: '#16130f' };

export function resolvedTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? (dark.matches ? 'dark' : 'light') : theme;
}

function apply() {
  const look = resolvedTheme(useSettings.getState().theme);
  document.documentElement.dataset.theme = look;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', CHROME[look]);
}

/** Applies the theme now (before the first paint) and keeps it current as the setting or the device changes. */
export function startTheme() {
  apply();
  useSettings.subscribe((s, before) => {
    if (s.theme !== before.theme) apply();
  });
  dark.addEventListener('change', apply);
}

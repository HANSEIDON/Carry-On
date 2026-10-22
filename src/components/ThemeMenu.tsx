import { useEffect, useRef, useState } from 'react';
import { useSettings, type Theme } from '../store/settings';
import { resolvedTheme } from '../theme';
import styles from './ThemeMenu.module.css';

const CHOICES: { id: Theme; label: string; note: string }[] = [
  { id: 'system', label: 'Auto', note: 'Follows your device' },
  { id: 'light', label: 'Light', note: 'Paper by day' },
  { id: 'dark', label: 'Dark', note: 'The notebook at night' },
];

/** A small sun or moon (whichever look is on) that opens the choice of light, dark, or the device's. */
export function ThemeMenu() {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const look = resolvedTheme(theme);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  return (
    <div className={styles.box} ref={box}>
      <button className={styles.button} aria-label="Appearance" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {look === 'dark' ? (
            <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
          ) : (
            <>
              <circle cx="12" cy="12" r="4.2" />
              <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
            </>
          )}
        </svg>
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          {CHOICES.map((c) => (
            <button
              key={c.id}
              role="menuitemradio"
              aria-checked={theme === c.id}
              className={styles.option}
              onClick={() => {
                setTheme(c.id);
                setOpen(false);
              }}
            >
              {c.label}
              <span className={styles.note}>{c.note}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

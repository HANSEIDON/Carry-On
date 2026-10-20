import type { ReactNode } from 'react';
import styles from './TicketButton.module.css';

interface Props {
  children: ReactNode;
  /** Small printed line under the label, e.g. "ICN → PEK · 1h 40m". */
  sub?: string;
  onClick?: () => void;
  disabled?: boolean;
}

/** The app's main call to action, shaped like a ticket: label, perforation, stub with an arrow. */
export function TicketButton({ children, sub, onClick, disabled }: Props) {
  return (
    <button className={styles.ticket} onClick={onClick} disabled={disabled}>
      <span className={styles.body}>
        <span className={styles.title}>{children}</span>
        {sub && <span className={styles.sub}>{sub}</span>}
      </span>
      <span className={styles.stub} aria-hidden="true">
        <svg width="20" height="12" viewBox="0 0 20 12">
          <path d="M1 6h17M13 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}

import type { Tip } from '../domain/tips';
import { Icon } from './Icon';
import styles from './TipCard.module.css';

/** A tip: a small rounded note with a lightbulb, to read or put away. */
export function TipCard({ tip, onClose }: { tip: Tip; onClose: () => void }) {
  return (
    <aside className={styles.tip} aria-label="Tip">
      <span className={styles.badge} aria-hidden="true">
        <Icon name="bulb" size={17} />
      </span>
      <p className={styles.text}>
        <span className={styles.label}>Tip</span>
        {tip.text}
      </p>
      <button className={styles.close} onClick={onClose} aria-label="Dismiss tip">
        <Icon name="close" size={14} />
      </button>
    </aside>
  );
}

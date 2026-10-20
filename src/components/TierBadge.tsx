import { tierLabel } from '../domain/tier';
import type { Tier } from '../domain/types';
import styles from './TierBadge.module.css';

export function TierBadge({ tier }: { tier: Tier }) {
  if (tier === 'basic') return null;
  return (
    <span className={styles.badge} data-tier={tier}>
      {tierLabel(tier)}
    </span>
  );
}

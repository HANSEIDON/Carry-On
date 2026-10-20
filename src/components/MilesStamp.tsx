import styles from './MilesStamp.module.css';

/** Spendable miles, inked like a round passport stamp. */
export function MilesStamp({ miles }: { miles: number }) {
  return (
    <div className={styles.stamp} aria-label={`${miles} miles`}>
      <span className={styles.value}>{miles.toLocaleString('en-US')}</span>
      <span className={styles.unit}>Miles</span>
    </div>
  );
}

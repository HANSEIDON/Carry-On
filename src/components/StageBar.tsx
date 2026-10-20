import styles from './StageBar.module.css';

const STAGES = ['Check-in', 'Boarding', 'In flight', 'Arrived'] as const;
export type Stage = (typeof STAGES)[number];

/** Travel-day progress, like a departure board status line. */
export function StageBar({ current }: { current: Stage }) {
  const at = STAGES.indexOf(current);
  return (
    <ol className={styles.bar}>
      {STAGES.map((s, i) => (
        <li key={s} className={styles.stage} data-state={i < at ? 'done' : i === at ? 'now' : 'next'}>
          {s}
        </li>
      ))}
    </ol>
  );
}

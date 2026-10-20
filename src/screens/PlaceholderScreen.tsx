import styles from './PlaceholderScreen.module.css';

export function PlaceholderScreen({ title, note }: { title: string; note: string }) {
  return (
    <section>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.note}>{note}</p>
    </section>
  );
}

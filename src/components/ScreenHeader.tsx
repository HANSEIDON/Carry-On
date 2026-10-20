import { Icon } from './Icon';
import styles from './ScreenHeader.module.css';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

export function ScreenHeader({ title, subtitle, onBack }: Props) {
  return (
    <header className={styles.header}>
      {onBack && (
        <button className={styles.back} onClick={onBack} aria-label="Back">
          <Icon name="back" />
        </button>
      )}
      <div>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </header>
  );
}

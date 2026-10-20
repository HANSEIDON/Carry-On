import { useApp, type Tab } from '../store/appStore';
import { Icon, type IconName } from './Icon';
import styles from './TabBar.module.css';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'fly', label: 'Fly', icon: 'plane' },
  { id: 'luggage', label: 'Luggage', icon: 'luggage' },
  { id: 'dutyfree', label: 'Duty Free', icon: 'bag' },
  { id: 'passport', label: 'Passport', icon: 'passport' },
];

export function TabBar() {
  const screen = useApp((s) => s.screen);
  const go = useApp((s) => s.go);

  return (
    <nav className={styles.bar}>
      {TABS.map((t) => (
        <button
          key={t.id}
          className={styles.tab}
          data-active={screen === t.id}
          onClick={() => go(t.id)}
        >
          <Icon name={t.icon} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

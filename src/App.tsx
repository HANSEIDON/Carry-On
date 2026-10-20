import { useEffect } from 'react';
import { TabBar } from './components/TabBar';
import { loadOrCreateProfile } from './db/db';
import { tierFor } from './domain/tier';
import { BookingScreen } from './screens/BookingScreen';
import { FlyScreen } from './screens/FlyScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen';
import { useApp } from './store/appStore';
import styles from './App.module.css';

export function App() {
  const screen = useApp((s) => s.screen);
  const profile = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);

  useEffect(() => {
    loadOrCreateProfile().then(setProfile);
  }, [setProfile]);

  useEffect(() => {
    if (profile) document.documentElement.dataset.tier = tierFor(profile.lifetimeMiles);
  }, [profile]);

  if (!profile) return <div className={styles.app} />;

  return (
    <div className={styles.app}>
      <main className={styles.main}>
        {screen === 'fly' && <FlyScreen />}
        {screen === 'booking' && <BookingScreen />}
        {screen === 'luggage' && (
          <PlaceholderScreen title="Luggage" note="Your carriers and stickers, in 3D. Coming in phase 2." />
        )}
        {screen === 'dutyfree' && (
          <PlaceholderScreen title="Duty Free" note="Spend miles on new carriers. Coming in phase 2." />
        )}
        {screen === 'passport' && (
          <PlaceholderScreen title="Passport" note="Entry stamps and flight stats. Coming soon." />
        )}
      </main>
      {screen !== 'booking' && <TabBar />}
    </div>
  );
}

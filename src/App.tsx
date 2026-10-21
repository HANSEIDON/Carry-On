import { useEffect } from 'react';
import { TabBar } from './components/TabBar';
import { getActiveFlight, loadOrCreateProfile } from './db/db';
import { ArrivalScreen } from './screens/ArrivalScreen';
import { BoardingScreen } from './screens/BoardingScreen';
import { BookingScreen } from './screens/BookingScreen';
import { CheckinScreen } from './screens/CheckinScreen';
import { FlightScreen } from './screens/FlightScreen';
import { FlyScreen } from './screens/FlyScreen';
import { PassportScreen } from './screens/PassportScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen';
import { useApp, type Screen } from './store/appStore';
import { useTier } from './store/useTier';
import styles from './App.module.css';

const TAB_SCREENS: Screen[] = ['fly', 'luggage', 'dutyfree', 'passport'];

export function App() {
  const screen = useApp((s) => s.screen);
  const profile = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  const setFlight = useApp((s) => s.setFlight);
  const go = useApp((s) => s.go);
  const tier = useTier();

  useEffect(() => {
    (async () => {
      const p = await loadOrCreateProfile();
      // A flight still in the air resumes where it left off.
      const active = await getActiveFlight();
      if (active) {
        setFlight(active);
        go('flight');
      }
      setProfile(p);
    })();
  }, [setProfile, setFlight, go]);

  useEffect(() => {
    document.documentElement.dataset.tier = tier;
  }, [tier]);

  if (!profile) return <div className={styles.app} />;

  return (
    <div className={styles.app}>
      <main className={styles.main}>
        {screen === 'fly' && <FlyScreen />}
        {screen === 'booking' && <BookingScreen />}
        {screen === 'checkin' && <CheckinScreen />}
        {screen === 'boarding' && <BoardingScreen />}
        {screen === 'flight' && <FlightScreen />}
        {screen === 'arrival' && <ArrivalScreen />}
        {screen === 'luggage' && (
          <PlaceholderScreen title="Luggage" note="Your carriers and stickers, in 3D. Coming in phase 2." />
        )}
        {screen === 'dutyfree' && (
          <PlaceholderScreen title="Duty Free" note="Spend miles on new carriers. Coming in phase 2." />
        )}
        {screen === 'passport' && <PassportScreen />}
      </main>
      {TAB_SCREENS.includes(screen) && <TabBar />}
    </div>
  );
}

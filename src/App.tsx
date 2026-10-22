import { useEffect } from 'react';
import { Guide } from './components/Guide';
import { TabBar } from './components/TabBar';
import { getActiveFlight, loadOrCreateProfile } from './db/db';
import { ArrivalScreen } from './screens/ArrivalScreen';
import { BoardingScreen } from './screens/BoardingScreen';
import { BookingScreen } from './screens/BookingScreen';
import { CheckinScreen } from './screens/CheckinScreen';
import { DutyFreeScreen } from './screens/DutyFreeScreen';
import { FlightScreen } from './screens/FlightScreen';
import { FlyScreen } from './screens/FlyScreen';
import { LuggageScreen } from './screens/LuggageScreen';
import { PassportScreen } from './screens/PassportScreen';
import { useApp, type Screen } from './store/appStore';
import { useSettings } from './store/settings';
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
  const guideSeen = useSettings((s) => s.guideSeen);

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
      {/* A fresh page per screen, so each one opens at its top. */}
      <main className={styles.main} key={screen}>
        {screen === 'fly' && <FlyScreen />}
        {screen === 'booking' && <BookingScreen />}
        {screen === 'checkin' && <CheckinScreen />}
        {screen === 'boarding' && <BoardingScreen />}
        {screen === 'flight' && <FlightScreen />}
        {screen === 'arrival' && <ArrivalScreen />}
        {screen === 'luggage' && <LuggageScreen />}
        {screen === 'dutyfree' && <DutyFreeScreen />}
        {screen === 'passport' && <PassportScreen />}
      </main>
      {TAB_SCREENS.includes(screen) && <TabBar />}
      {/* First time here: a short guide over the home screen. */}
      {!guideSeen && screen === 'fly' && <Guide />}
    </div>
  );
}

import { BoardingPass } from '../components/BoardingPass';
import { ScreenHeader } from '../components/ScreenHeader';
import { StageBar } from '../components/StageBar';
import { startFlight } from '../db/db';
import { useApp } from '../store/appStore';
import { useTier } from '../store/useTier';
import styles from './BoardingScreen.module.css';

export function BoardingScreen() {
  const profile = useApp((s) => s.profile)!;
  const draft = useApp((s) => s.draft)!;
  const go = useApp((s) => s.go);
  const setFlight = useApp((s) => s.setFlight);
  const setDraft = useApp((s) => s.setDraft);
  const tier = useTier();
  const { plan, seat, purpose } = draft;

  const board = async () => {
    const flight = await startFlight(plan, seat!, purpose);
    setFlight(flight);
    setDraft(null);
    go('flight');
  };

  return (
    <section className={styles.screen}>
      <ScreenHeader title="Boarding pass" subtitle={`Gate ${plan.gate} · Now boarding`} onBack={() => go('checkin')} />
      <StageBar current="Boarding" />

      <BoardingPass
        plan={plan}
        seat={seat!}
        purpose={purpose}
        passenger={profile.name}
        tier={tier}
        onTorn={board}
      />

      <p className={styles.hint}>Pull the stub down to tear it off and take off</p>
    </section>
  );
}

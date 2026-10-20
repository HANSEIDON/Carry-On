import { cabinAudio } from '../audio/cabinAudio';
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

  // Engines spool up as the stub tears; this runs inside the gesture so browsers allow audio.
  const spoolUp = () => cabinAudio.start(seat!.zone, seat!.cabin, 'climb');

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

      {/* Touching the pass unlocks audio: iOS only allows it on a tap, not mid-drag. */}
      <div onPointerDown={() => cabinAudio.unlock()}>
        <BoardingPass
          plan={plan}
          seat={seat!}
          purpose={purpose}
          passenger={profile.name}
          tier={tier}
          onTear={spoolUp}
          onTorn={board}
        />
      </div>

      <p className={styles.hint}>Pull the stub down to tear it off and take off</p>
    </section>
  );
}

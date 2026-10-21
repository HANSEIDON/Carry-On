import { cabinAudio } from '../audio/cabinAudio';
import { BoardingPass } from '../components/BoardingPass';
import { ScreenHeader } from '../components/ScreenHeader';
import { StageBar } from '../components/StageBar';
import { startFlight } from '../db/db';
import { timbreFor } from '../domain/cabinTimbre';
import { useSettings } from '../store/settings';
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

  // The pass has been handed over: board, and the engines spool up.
  const board = async () => {
    const flight = await startFlight(plan, seat!, purpose);
    const timbre = timbreFor(plan.aircraft, plan.flightNumber);
    const sound = useSettings.getState();
    cabinAudio.setVolume(sound.volume);
    cabinAudio.setFocusMode(sound.focusMode);
    cabinAudio.start(seat!.zone, seat!.cabin, 'climb', purpose, sound.focusTones, timbre);
    setFlight(flight);
    setDraft(null);
    go('flight');
  };

  return (
    <section className={styles.screen}>
      <ScreenHeader title="Boarding pass" subtitle={`Gate ${plan.gate} · Now boarding`} onBack={() => go('checkin')} />
      <StageBar current="Boarding" />

      {/* Touching the pass unlocks audio (tear sound, then engines): iOS only allows it on a tap or key. */}
      <div onPointerDown={() => cabinAudio.unlock()} onKeyDown={() => cabinAudio.unlock()}>
        <BoardingPass plan={plan} seat={seat!} purpose={purpose} passenger={profile.name} tier={tier} onTorn={board} />
      </div>
    </section>
  );
}

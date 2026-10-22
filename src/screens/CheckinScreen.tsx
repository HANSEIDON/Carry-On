import { useMemo } from 'react';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { SeatLegend, SeatMapView } from '../components/SeatMapView';
import { StageBar } from '../components/StageBar';
import { TicketButton } from '../components/TicketButton';
import type { TripPurpose } from '../db/db';
import { AIRCRAFT_LABEL } from '../domain/flightPlan';
import { hashString } from '../domain/random';
import {
  autoAssign,
  buildSeatMap,
  CABIN_LABEL,
  canPick,
  seatPosition,
  ZONE_LABEL,
  type Seat,
} from '../domain/seatmap';
import { useApp } from '../store/appStore';
import { useTier } from '../store/useTier';
import styles from './CheckinScreen.module.css';

const PURPOSES: { id: TripPurpose; label: string }[] = [
  { id: 'study', label: 'Study' },
  { id: 'work', label: 'Work' },
  { id: 'reading', label: 'Reading' },
  { id: 'creative', label: 'Creative' },
  { id: 'other', label: 'Other' },
];

export function CheckinScreen() {
  const draft = useApp((s) => s.draft)!;
  const setDraft = useApp((s) => s.setDraft);
  const go = useApp((s) => s.go);
  const tier = useTier();
  const { plan, seat, purpose } = draft;

  // Taken seats stay the same for this flight today.
  const map = useMemo(
    () => buildSeatMap(plan.aircraft, hashString(`${plan.flightNumber}|${new Date().toDateString()}`)),
    [plan.aircraft, plan.flightNumber],
  );

  const pickSeat = (s: Seat) => {
    if (canPick(s, tier)) setDraft({ ...draft, seat: s });
  };

  const assign = () => {
    const s = autoAssign(map, tier);
    if (s) setDraft({ ...draft, seat: s });
  };

  return (
    <section className={styles.screen}>
      <ScreenHeader
        title="Check-in"
        subtitle={`${plan.flightNumber} · ${plan.fromCode} → ${plan.scenic ? 'Scenic' : plan.toCode} · ${AIRCRAFT_LABEL[plan.aircraft]}`}
        onBack={() => go('booking')}
      />
      <StageBar current="Check-in" />

      <div className={styles.block}>
        <p className="label">Trip purpose</p>
        <div className={styles.chips}>
          {PURPOSES.map((p) => (
            <button
              key={p.id}
              className={styles.chip}
              data-active={purpose === p.id}
              onClick={() => setDraft({ ...draft, purpose: p.id })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.block}>
        <div className={styles.seatHead}>
          <p className="label">Choose your seat</p>
          <button className={styles.assign} onClick={assign}>
            <Icon name="shuffle" size={14} />
            Assign for me
          </button>
        </div>
        <SeatLegend />
        <p className={styles.hint}>Front is quieter. Over the wing has a deep engine hum. The rear is loudest.</p>
      </div>

      <SeatMapView map={map} tier={tier} selectedId={seat?.id} onSelect={pickSeat} />

      <footer className={styles.footer}>
        {seat ? (
          <div className={styles.seatInfo}>
            <span className={styles.seatCode}>{seat.id}</span>
            <span>
              <span className={styles.seatLine}>
                {seatPosition(seat)} · {CABIN_LABEL[seat.cabin]}
                {seat.exit && ' · Exit row'}
              </span>
              <span className={styles.seatSub}>
                {ZONE_LABEL[seat.zone].place} · {ZONE_LABEL[seat.zone].sound}
              </span>
            </span>
          </div>
        ) : null}
        <TicketButton
          onClick={seat ? () => go('boarding') : assign}
          sub={seat ? `Seat ${seat.id} · ${CABIN_LABEL[seat.cabin]}` : 'Or tap a seat on the map'}
        >
          {seat ? 'Get boarding pass' : 'Assign me a seat'}
        </TicketButton>
      </footer>
    </section>
  );
}

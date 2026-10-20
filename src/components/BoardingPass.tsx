import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { cityByCode } from '../data/cities';
import type { TripPurpose } from '../db/db';
import type { FlightPlan } from '../domain/flightPlan';
import { formatDuration } from '../domain/geo';
import { CABIN_LABEL, type Seat } from '../domain/seatmap';
import { tierLabel } from '../domain/tier';
import type { Tier } from '../domain/types';
import { Barcode } from './Barcode';
import { Icon } from './Icon';
import styles from './BoardingPass.module.css';

interface Props {
  plan: FlightPlan;
  seat: Seat;
  purpose: TripPurpose;
  passenger: string;
  tier: Tier;
  /** Called the moment the stub tears, still inside the user's gesture (audio can start here). */
  onTear?: () => void;
  /** Called once the stub has fallen away. */
  onTorn: () => void;
}

const GROUP: Record<Tier, number> = { platinum: 1, gold: 2, silver: 3, basic: 4 };

/** Pull distance (px) that tears the stub off. */
const TEAR_AT = 110;

export function BoardingPass({ plan, seat, purpose, passenger, tier, onTear, onTorn }: Props) {
  const from = cityByCode(plan.fromCode)!;
  const to = cityByCode(plan.toCode)!;
  const now = new Date();
  const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
  const boarding = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const [pull, setPull] = useState({ x: 0, y: 0 });
  const [phase, setPhase] = useState<'idle' | 'dragging' | 'torn'>('idle');
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);

  const tear = () => {
    if (phase === 'torn') return;
    setPhase('torn');
    onTear?.();
    navigator.vibrate?.(30);
    setTimeout(onTorn, 700);
  };

  const onDown = (e: PointerEvent) => {
    if (phase === 'torn') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    setPhase('dragging');
  };

  const onMove = (e: PointerEvent) => {
    if (!start.current || phase !== 'dragging') return;
    const x = e.clientX - start.current.x;
    const y = Math.max(0, e.clientY - start.current.y);
    if (Math.hypot(x, y) > 6) moved.current = true;
    setPull({ x, y });
    if (Math.hypot(x, y) > TEAR_AT) {
      start.current = null;
      tear();
    }
  };

  const onUp = () => {
    if (phase !== 'dragging') return;
    start.current = null;
    // A tap (no drag) tears it too, for mouse users.
    if (!moved.current) return tear();
    setPull({ x: 0, y: 0 });
    setPhase('idle');
  };

  // The stub peels from its left edge: it slides with the finger and twists slightly.
  // The fall animation continues from wherever the finger let go.
  const stubPose = {
    '--px': `${pull.x * 0.5}px`,
    '--py': `${pull.y}px`,
    '--rot': `${pull.x * 0.06 + pull.y * 0.05}deg`,
  } as CSSProperties;

  return (
    <article className={styles.pass} data-tier={tier} style={{ '--airline': plan.airline.color } as CSSProperties}>
      <div className={styles.main}>
        <header className={styles.band}>
          <span>{plan.airline.name}</span>
          <span className={styles.mono}>{plan.flightNumber}</span>
        </header>
        <div className={styles.foil} />

        <div className={styles.route}>
          <div>
            <p className={styles.code}>{from.code}</p>
            <p className={styles.city}>{from.city}</p>
          </div>
          <span className={styles.plane}>
            <Icon name="plane" size={22} />
          </span>
          <div className={styles.right}>
            <p className={styles.code}>{plan.scenic ? from.code : to.code}</p>
            <p className={styles.city}>{plan.scenic ? 'Scenic loop' : to.city}</p>
          </div>
        </div>

        <dl className={styles.fields}>
          <Field label="Passenger" wide>
            {passenger}
            {tier !== 'basic' && <span className={styles.badge}>{tierLabel(tier)}</span>}
          </Field>
          <Field label="Purpose">{purpose.charAt(0).toUpperCase() + purpose.slice(1)}</Field>
          <Field label="Date">{date}</Field>
          <Field label="Boarding">{boarding}</Field>
          <Field label="Gate">{plan.gate}</Field>
          <Field label="Seat" strong>
            {seat.id}
          </Field>
          <Field label="Class">{CABIN_LABEL[seat.cabin]}</Field>
          <Field label="Group">{GROUP[tier]}</Field>
          <Field label="Focus" strong>
            {formatDuration(plan.minutes)}
          </Field>
        </dl>
      </div>

      <div className={styles.perforation} aria-hidden="true" />

      <div
        className={styles.stub}
        data-phase={phase}
        style={stubPose}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="button"
        tabIndex={0}
        aria-label="Tear the stub to board"
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && tear()}
      >
        <div className={styles.stubRow}>
          <span className={styles.mono}>
            {from.code} → {plan.scenic ? from.code : to.code}
          </span>
          <span className={styles.mono}>Seat {seat.id}</span>
          <span className={styles.mono}>{plan.flightNumber}</span>
        </div>
        <Barcode value={`${plan.flightNumber}|${seat.id}|${date}`} width={260} height={34} />
      </div>
    </article>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
  wide?: boolean;
  strong?: boolean;
}

function Field({ label, children, wide, strong }: FieldProps) {
  return (
    <div className={styles.field} data-wide={wide} data-strong={strong}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

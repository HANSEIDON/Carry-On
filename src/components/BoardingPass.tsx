import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { tearSound } from '../audio/tearSound';
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
  /** Called after the stub has dropped away and the pass has been handed over. */
  onTorn: () => void;
}

type Phase = 'idle' | 'dragging' | 'returning' | 'torn';

const GROUP: Record<Tier, number> = { platinum: 1, gold: 2, silver: 3, basic: 4 };

/** Pull distance (px) for the perforation to rip all the way across. */
const TEAR_AT = 120;
/** Tap-to-tear duration for mouse and keyboard users. */
const AUTO_TEAR_MS = 420;
/** Stub drop plus pass handover, before moving on. */
const EXIT_MS = 1100;

export function BoardingPass({ plan, seat, purpose, passenger, tier, onTorn }: Props) {
  const from = cityByCode(plan.fromCode)!;
  const to = cityByCode(plan.toCode)!;
  const now = new Date();
  const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
  const boarding = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const [progress, setProgress] = useState(0);
  const [phase, setPhaseState] = useState<Phase>('idle');
  const [touched, setTouched] = useState(false);
  const phaseRef = useRef<Phase>('idle');
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  /** Furthest the perforation has ripped; tearing the same fibers twice makes no sound. */
  const ripped = useRef(0);
  const lastStep = useRef(0);

  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };

  const detach = () => {
    start.current = null;
    setPhase('torn');
    setProgress(1);
    tearSound.snap();
    navigator.vibrate?.(25);
    setTimeout(onTorn, EXIT_MS);
  };

  /** Move the tear to `p` (0..1): sound and a light haptic tick for newly ripped fibers. */
  const step = (p: number) => {
    const t = performance.now();
    const fresh = p - ripped.current;
    if (fresh > 0) {
      tearSound.advance(fresh, Math.min(0.05, (t - lastStep.current) / 1000 || 0.016));
      if (Math.floor(p * 8) > Math.floor(ripped.current * 8)) navigator.vibrate?.(4);
      ripped.current = p;
    }
    lastStep.current = t;
    setProgress(p);
    if (p >= 1) detach();
  };

  const autoTear = () => {
    if (phaseRef.current === 'torn') return;
    setTouched(true);
    setPhase('dragging');
    const begin = progress;
    const t0 = performance.now();
    lastStep.current = t0;
    const frame = (t: number) => {
      const k = Math.min(1, (t - t0) / AUTO_TEAR_MS);
      step(begin + (1 - begin) * k * k);
      if (k < 1 && phaseRef.current === 'dragging') requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const onDown = (e: PointerEvent) => {
    if (phaseRef.current === 'torn') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic or already-released pointers can't be captured; dragging still works.
    }
    start.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    lastStep.current = performance.now();
    setTouched(true);
    setPhase('dragging');
  };

  const onMove = (e: PointerEvent) => {
    if (!start.current || phaseRef.current !== 'dragging') return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.hypot(dx, dy) > 6) moved.current = true;
    // Pulling down tears; pulling sideways helps a little.
    const pull = Math.max(0, dy) + Math.abs(dx) * 0.4;
    step(Math.min(1, pull / TEAR_AT));
  };

  const onUp = () => {
    if (phaseRef.current !== 'dragging' || !start.current) return;
    start.current = null;
    if (!moved.current) return autoTear();
    setPhase('returning');
    setProgress(0);
    setTimeout(() => phaseRef.current === 'returning' && setPhase('idle'), 450);
  };

  return (
    <article
      className={styles.pass}
      data-tier={tier}
      data-phase={phase}
      style={{ '--airline': plan.airline.color, '--p': progress } as CSSProperties}
    >
      {/* Shadow wrapper: the pieces are masked (perforation holes), so the shadow lives one level up. */}
      <div className={styles.paper}>
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
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          role="button"
          tabIndex={0}
          aria-label="Tear the stub to board"
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && autoTear()}
        >
          <div className={styles.stubPaper}>
            <div className={styles.stubRow}>
              <span className={styles.mono}>
                {from.code} → {plan.scenic ? from.code : to.code}
              </span>
              <span className={styles.mono}>Seat {seat.id}</span>
              <span className={styles.mono}>{plan.flightNumber}</span>
            </div>
            <Barcode value={`${plan.flightNumber}|${seat.id}|${date}`} width={260} height={34} />
          </div>
        </div>
      </div>

      <div className={styles.hint} data-hidden={touched} aria-hidden="true">
        <svg width="18" height="26" viewBox="0 0 18 26" className={styles.arrow}>
          <path d="M3 4l6 6 6-6M3 13l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Pull to tear</span>
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

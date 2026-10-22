import { useEffect, useMemo, useRef, useState } from 'react';
import { Coach, type CoachStep } from '../components/Coach';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { TicketButton } from '../components/TicketButton';
import { TipCard } from '../components/TipCard';
import { CITIES, cityByCode } from '../data/cities';
import { listFlights } from '../db/db';
import { routesFrom, routesNearDuration, SCENIC_MAX_MINUTES, scenicMiles, surpriseRoute } from '../domain/booking';
import { planRoute, planScenic } from '../domain/flightPlan';
import { formatDuration } from '../domain/geo';
import { nextTip } from '../domain/tips';
import type { Route } from '../domain/types';
import { useSettings } from '../store/settings';
import { useApp } from '../store/appStore';
import styles from './BookingScreen.module.css';

type Mode = 'destination' | 'time';

const TIME_PRESETS = [25, 45, 60, 90, 120, 180, 240, 360, 480, 720];

/** A route the user can pick; scenic flights loop back to the origin. */
type Pick = { kind: 'route'; route: Route } | { kind: 'scenic'; minutes: number };

export function BookingScreen() {
  const profile = useApp((s) => s.profile)!;
  const go = useApp((s) => s.go);
  const setDraft = useApp((s) => s.setDraft);

  const [originCode, setOriginCode] = useState(profile.currentCityCode);
  const [mode, setMode] = useState<Mode>('time');
  const [target, setTarget] = useState(120);
  const [query, setQuery] = useState('');
  const [pick, setPick] = useState<Pick | null>(null);
  /** Countries you've landed in (Surprise me leans toward the others). */
  const [visited, setVisited] = useState<Set<string>>(new Set());

  // The first time here: a short walk-through of the controls (instead of a tip).
  const firstVisit = useSettings((s) => !s.bookingGuideSeen);
  const finishBookingGuide = useSettings((s) => s.finishBookingGuide);
  const originRef = useRef<HTMLLabelElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const surpriseRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const coachSteps = useMemo<CoachStep[]>(
    () => [
      { target: () => originRef.current, text: 'You leave from where your last flight landed. Tap here to fly from any airport instead.' },
      { target: () => chipsRef.current, text: 'Pick how long you want to focus. The cities below are about that far away.' },
      { target: () => surpriseRef.current, text: 'Or let it surprise you: a flight your length, from anywhere in the world.' },
      { target: () => listRef.current, text: 'Tap a city, then Check in to choose your seat and board.' },
    ],
    [],
  );

  // Now and then, a tip (rarely: see src/domain/tips.ts).
  // Not on the first visit, where the walk-through covers it.
  const [tip, setTip] = useState(() => {
    const st = useSettings.getState();
    if (!st.bookingGuideSeen) return null;
    return nextTip({ lastShownAt: st.tipShownAt, seen: st.tipsSeen }, Date.now(), Math.random());
  });
  useEffect(() => {
    if (tip) useSettings.getState().tipShown(tip.id);
    // Counted once, when it first shows.
  }, []);

  useEffect(() => {
    void listFlights().then((flights) =>
      setVisited(new Set(flights.filter((f) => f.status === 'landed').map((f) => cityByCode(f.toCode)?.countryCode ?? ''))),
    );
  }, []);

  const origin = cityByCode(originCode)!;
  const showScenic = mode === 'time' && target <= SCENIC_MAX_MINUTES;

  const routes = useMemo(() => {
    if (mode === 'time') return routesNearDuration(origin, CITIES, target);
    const q = query.trim().toLowerCase();
    return routesFrom(origin, CITIES).filter(
      (r) =>
        !q ||
        r.to.city.toLowerCase().includes(q) ||
        r.to.country.toLowerCase().includes(q) ||
        r.to.code.toLowerCase().includes(q),
    );
  }, [mode, origin, target, query]);

  const isPicked = (p: Pick) =>
    pick?.kind === p.kind &&
    (p.kind === 'scenic'
      ? pick.kind === 'scenic' && pick.minutes === p.minutes
      : pick.kind === 'route' && pick.route.to.code === p.route.to.code);

  /** A flight of the chosen length from anywhere: the departure moves there too. */
  const surprise = () => {
    const route = surpriseRoute(CITIES, target, Math.random, visited);
    if (!route) return;
    setOriginCode(route.from.code);
    setPick({ kind: 'route', route });
  };

  const checkIn = () => {
    if (!pick) return;
    const plan = pick.kind === 'route' ? planRoute(origin, pick.route.to) : planScenic(origin, pick.minutes);
    setDraft({ plan, purpose: 'study' });
    go('checkin');
  };

  return (
    <section className={styles.screen}>
      <ScreenHeader title="Where to?" onBack={() => go('fly')} />
      {tip && <TipCard tip={tip} onClose={() => setTip(null)} />}

      <label className={styles.origin} ref={originRef}>
        <span className="label">Departing from</span>
        <span className={styles.originValue}>
          <span className={styles.originCity}>{origin.city}</span>
          <span className={styles.originCode}>{origin.code}</span>
          <Icon name="chevron" size={16} />
        </span>
        <select
          value={originCode}
          onChange={(e) => {
            setOriginCode(e.target.value);
            setPick(null);
          }}
          aria-label="Departure city"
        >
          {CITIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} · {c.city}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.tabs} role="tablist">
        {(['time', 'destination'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            className={styles.tab}
            onClick={() => {
              setMode(m);
              setPick(null);
            }}
          >
            {m === 'time' ? 'By focus time' : 'By destination'}
          </button>
        ))}
      </div>

      {mode === 'time' ? (
        <div className={styles.chips} ref={chipsRef}>
          {TIME_PRESETS.map((m) => (
            <button
              key={m}
              className={styles.chip}
              data-active={target === m}
              onClick={() => {
                setTarget(m);
                setPick(null);
              }}
            >
              {formatDuration(m)}
            </button>
          ))}
          <button className={styles.surprise} onClick={surprise} ref={surpriseRef}>
            <Icon name="shuffle" size={15} />
            Surprise me
          </button>
        </div>
      ) : (
        <label className={styles.search}>
          <Icon name="search" size={18} />
          <input placeholder="City, country or code" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      )}

      <ul className={styles.list} ref={listRef}>
        {showScenic && (
          <>
            <li className={`label ${styles.group}`}>Scenic flight</li>
            <RouteRow
              code={origin.code}
              title="Scenic flight"
              subtitle={`A loop over ${origin.city}`}
              minutes={target}
              miles={scenicMiles(target)}
              picked={isPicked({ kind: 'scenic', minutes: target })}
              onPick={() => setPick({ kind: 'scenic', minutes: target })}
            />
          </>
        )}

        {mode === 'time' && routes.length > 0 && (
          <li className={`label ${styles.group}`}>Departures around {formatDuration(target)}</li>
        )}
        {routes.map((r) => (
          <RouteRow
            key={r.to.code}
            code={r.to.code}
            title={r.to.city}
            subtitle={r.to.country}
            minutes={r.minutes}
            miles={r.miles}
            picked={isPicked({ kind: 'route', route: r })}
            onPick={() => setPick({ kind: 'route', route: r })}
          />
        ))}
        {routes.length === 0 && !showScenic && (
          <li className={styles.empty}>
            {mode === 'time'
              ? `No cities around ${formatDuration(target)} from ${origin.city}. Try another time.`
              : 'No matching cities.'}
          </li>
        )}
      </ul>

      {firstVisit && <Coach steps={coachSteps} onDone={finishBookingGuide} />}

      {pick && (
        <footer className={styles.footer}>
          <TicketButton
            onClick={checkIn}
            sub={
              pick.kind === 'route'
                ? `${origin.code} → ${pick.route.to.code} · ${formatDuration(pick.route.minutes)}`
                : `${origin.code} scenic · ${formatDuration(pick.minutes)}`
            }
          >
            Check in
          </TicketButton>
        </footer>
      )}
    </section>
  );
}

interface RouteRowProps {
  code: string;
  title: string;
  subtitle: string;
  minutes: number;
  miles: number;
  picked: boolean;
  onPick: () => void;
}

function RouteRow({ code, title, subtitle, minutes, miles, picked, onPick }: RouteRowProps) {
  return (
    <li>
      <button className={styles.row} data-picked={picked} onClick={onPick}>
        <span className={styles.code}>{code}</span>
        <span className={styles.place}>
          <span className={styles.city}>{title}</span>
          <span className={styles.country}>{subtitle}</span>
        </span>
        <span className={styles.meta}>
          <span className={styles.duration}>{formatDuration(minutes)}</span>
          <span className={styles.miles}>{miles.toLocaleString('en-US')} mi</span>
        </span>
      </button>
    </li>
  );
}

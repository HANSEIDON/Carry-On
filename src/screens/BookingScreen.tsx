import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { CITIES, cityByCode } from '../data/cities';
import { routesFrom, routesNearDuration, SCENIC_MAX_MINUTES, scenicMiles } from '../domain/booking';
import { planRoute, planScenic } from '../domain/flightPlan';
import { formatDuration } from '../domain/geo';
import type { Route } from '../domain/types';
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

  const checkIn = () => {
    if (!pick) return;
    const plan = pick.kind === 'route' ? planRoute(origin, pick.route.to) : planScenic(origin, pick.minutes);
    setDraft({ plan, purpose: 'study' });
    go('checkin');
  };

  return (
    <section className={styles.screen}>
      <ScreenHeader title="Book a flight" onBack={() => go('fly')} />

      <label className={styles.origin}>
        <span className={styles.label}>From</span>
        <select
          value={originCode}
          onChange={(e) => {
            setOriginCode(e.target.value);
            setPick(null);
          }}
        >
          {CITIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} · {c.city}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.segment} role="tablist">
        {(['time', 'destination'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            className={styles.segmentItem}
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
        <div className={styles.chips}>
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
        </div>
      ) : (
        <label className={styles.search}>
          <Icon name="search" size={18} />
          <input
            placeholder="City, country or code"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      )}

      <ul className={styles.list}>
        {showScenic && (
          <>
            <li className={styles.groupLabel}>Scenic flight</li>
            <RouteRow
              code={origin.code}
              title="Scenic flight"
              subtitle={`Loop over ${origin.city}`}
              minutes={target}
              miles={scenicMiles(target)}
              picked={isPicked({ kind: 'scenic', minutes: target })}
              onPick={() => setPick({ kind: 'scenic', minutes: target })}
            />
          </>
        )}

        {mode === 'time' && routes.length > 0 && (
          <li className={styles.groupLabel}>Destinations around {formatDuration(target)}</li>
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

      {pick && (
        <footer className={styles.footer}>
          <p className={styles.summary}>
            {pick.kind === 'route'
              ? `${origin.code} → ${pick.route.to.code} · ${formatDuration(pick.route.minutes)}`
              : `${origin.code} scenic · ${formatDuration(pick.minutes)}`}
          </p>
          <button className={styles.cta} onClick={checkIn}>
            Check in
          </button>
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
          <span>{title}</span>
          <span className={styles.sub}>{subtitle}</span>
        </span>
        <span className={styles.meta}>
          <span>{formatDuration(minutes)}</span>
          <span className={styles.sub}>{miles.toLocaleString('en-US')} mi</span>
        </span>
      </button>
    </li>
  );
}

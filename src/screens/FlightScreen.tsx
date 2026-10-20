import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { StageBar } from '../components/StageBar';
import { cityByCode } from '../data/cities';
import { divertFlight, landFlight } from '../db/db';
import { TIME_SCALE } from '../dev';
import { formatClock, progress, remainingMs } from '../domain/landing';
import { localTime } from '../domain/time';
import { useApp } from '../store/appStore';
import styles from './FlightScreen.module.css';

/** Temporary in-flight screen: countdown only. The map and cabin sound come next (phase 1). */
export function FlightScreen() {
  const flight = useApp((s) => s.flight)!;
  const go = useApp((s) => s.go);
  const setFlight = useApp((s) => s.setFlight);
  const setLanding = useApp((s) => s.setLanding);
  const setProfile = useApp((s) => s.setProfile);
  const [now, setNow] = useState(Date.now());
  const landing = useRef(false);

  const from = cityByCode(flight.fromCode)!;
  const to = cityByCode(flight.toCode)!;
  const left = remainingMs(flight.startedAt, flight.plannedMinutes, now, TIME_SCALE);
  const done = progress(flight.startedAt, flight.plannedMinutes, now, TIME_SCALE);
  const arrival = new Date(now + left / TIME_SCALE);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (left > 0 || landing.current) return;
    landing.current = true;
    landFlight(flight.id).then((result) => {
      setProfile(result.profile);
      setLanding(result);
      setFlight(null);
      go('arrival');
    });
  }, [left, flight.id, go, setFlight, setLanding, setProfile]);

  const endEarly = async () => {
    if (!confirm('End this flight now? You will divert and get no sticker or miles.')) return;
    await divertFlight(flight.id);
    setFlight(null);
    go('fly');
  };

  return (
    <section className={styles.screen}>
      <StageBar current="In flight" />

      <div className={styles.route}>
        <span className={styles.code}>{from.code}</span>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${done * 100}%` }} />
          <span className={styles.plane} style={{ left: `${done * 100}%` }}>
            <Icon name="plane" size={20} />
          </span>
        </div>
        <span className={styles.code}>{flight.scenic ? from.code : to.code}</span>
      </div>

      <div className={styles.clock}>
        <p className={styles.label}>Time to arrival</p>
        <p className={styles.time}>{formatClock(left)}</p>
        <p className={styles.sub}>
          Arrives {flight.scenic ? from.city : to.city} at {localTime(to.tz, arrival)} local time
        </p>
      </div>

      <dl className={styles.facts}>
        <div>
          <dt>Flight</dt>
          <dd>{flight.flightNumber}</dd>
        </div>
        <div>
          <dt>Seat</dt>
          <dd>{flight.seat}</dd>
        </div>
        <div>
          <dt>Purpose</dt>
          <dd>{flight.purpose}</dd>
        </div>
      </dl>

      <p className={styles.note}>Flight map and cabin sound are coming next.</p>

      <button className={styles.end} onClick={endEarly}>
        End flight early
      </button>
    </section>
  );
}

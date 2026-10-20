import { useEffect } from 'react';
import { announce } from '../audio/announcer';
import { BagTag } from '../components/BagTag';
import { StageBar } from '../components/StageBar';
import { airlineByCode } from '../data/airlines';
import { cityByCode } from '../data/cities';
import { arrival } from '../domain/announcements';
import { localTime } from '../domain/time';
import { useApp } from '../store/appStore';
import { useSound } from '../store/settings';
import styles from './ArrivalScreen.module.css';

let announcedLanding: string | null = null;

export function ArrivalScreen() {
  const landing = useApp((s) => s.landing)!;
  const go = useApp((s) => s.go);
  const setLanding = useApp((s) => s.setLanding);
  const { flight, stickers } = landing;
  const city = cityByCode(flight.toCode)!;
  const airline = airlineByCode(flight.airlineCode);

  // "Welcome to Tokyo, local time is …" once per landing.
  useEffect(() => {
    if (announcedLanding === flight.id || !useSound.getState().announcements) return;
    announcedLanding = flight.id;
    announce(
      arrival({
        airline: airline.name,
        flightNumber: flight.flightNumber,
        fromCity: cityByCode(flight.fromCode)!.city,
        toCity: city.city,
        scenic: flight.scenic,
        minutes: flight.plannedMinutes,
        altitudeFt: 0,
        localTime: localTime(city.tz),
      }),
    );
  }, [flight, airline.name, city]);

  const done = () => {
    setLanding(null);
    go('fly');
  };

  return (
    <section className={styles.screen}>
      <StageBar current="Arrived" />

      <div className={styles.welcome}>
        <p className={styles.label}>{flight.scenic ? 'Back on the ground' : 'Welcome to'}</p>
        <h1 className={styles.city}>{city.city}</h1>
        <p className={styles.sub}>Local time {localTime(city.tz)}</p>
      </div>

      <p className={styles.miles}>+{(flight.earnedMiles ?? 0).toLocaleString('en-US')} mi</p>

      <div className={styles.stickers}>
        <p className={styles.label}>Added to your carrier</p>
        <div className={styles.stack}>
          {stickers.map((s, i) => (
            <div key={s.id} className={styles.sticker} style={{ animationDelay: `${0.3 + i * 0.35}s` }}>
              <BagTag
                kind={s.kind}
                code={s.code}
                fromCode={flight.fromCode}
                flightNumber={flight.flightNumber}
                airline={airline}
                date={new Date(s.appliedAt)}
                id={s.id}
              />
            </div>
          ))}
        </div>
      </div>

      <button className={styles.cta} onClick={done}>
        Collect and continue
      </button>
    </section>
  );
}

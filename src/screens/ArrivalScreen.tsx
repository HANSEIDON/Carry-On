import { useEffect } from 'react';
import { announce } from '../audio/announcer';
import { BagTag } from '../components/BagTag';
import { StageBar } from '../components/StageBar';
import { TicketButton } from '../components/TicketButton';
import { airlineByCode } from '../data/airlines';
import { cityByCode } from '../data/cities';
import { arrival } from '../domain/announcements';
import { formatDuration } from '../domain/geo';
import { localHourMinute, localTime } from '../domain/time';
import { useApp } from '../store/appStore';
import { useSettings } from '../store/settings';
import styles from './ArrivalScreen.module.css';

let announcedLanding: string | null = null;

export function ArrivalScreen() {
  const landing = useApp((s) => s.landing)!;
  const go = useApp((s) => s.go);
  const setLanding = useApp((s) => s.setLanding);
  const { flight, stickers } = landing;
  const city = cityByCode(flight.toCode)!;
  const airline = airlineByCode(flight.airlineCode);
  const landed = new Date(flight.endedAt ?? Date.now());
  const stampDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: city.tz })
    .format(landed)
    .toUpperCase();

  // "Welcome to Tokyo, local time is …" once per landing.
  useEffect(() => {
    if (announcedLanding === flight.id || !useSettings.getState().announcements) return;
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
        local: localHourMinute(city.tz),
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
        <p className="label">{flight.scenic ? 'Back on the ground' : 'Welcome to'}</p>
        <h1 className={styles.city}>{city.city}</h1>
        <p className={styles.sub}>
          {formatDuration(flight.plannedMinutes)} of focus · local time {localTime(city.tz)}
        </p>

        {/* Entry stamp, inked the moment you land. */}
        <div className={styles.stamp} aria-label={`Arrived ${city.city} ${stampDate}`}>
          <span className={styles.stampTop}>{flight.scenic ? 'Scenic' : 'Arrived'}</span>
          <span className={styles.stampCode}>{city.code}</span>
          <span className={styles.stampDate}>{stampDate}</span>
        </div>
      </div>

      <div className={styles.miles}>
        <span className="label">Miles credited</span>
        <span className={styles.milesValue}>+{(flight.earnedMiles ?? 0).toLocaleString('en-US')}</span>
      </div>

      <div className={styles.stickers}>
        <p className="label">Added to your carrier</p>
        <div className={styles.stack}>
          {stickers.map((s, i) => (
            <div key={s.id} className={styles.sticker} style={{ animationDelay: `${0.9 + i * 0.35}s` }}>
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

      <TicketButton onClick={done} sub={`Back to ${city.city}`}>
        Collect and continue
      </TicketButton>
    </section>
  );
}

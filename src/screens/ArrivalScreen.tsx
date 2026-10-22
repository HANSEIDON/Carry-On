import { useEffect } from 'react';
import { announce } from '../audio/announcer';
import { StageBar } from '../components/StageBar';
import { StickerPicture } from '../components/StickerPicture';
import { TicketButton } from '../components/TicketButton';
import { airlineByCode } from '../data/airlines';
import { carrierType } from '../data/carriers';
import { cityByCode } from '../data/cities';
import { arrival } from '../domain/announcements';
import { stickerArt } from '../domain/stickerArt';
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
  const { flight, stickers, filled } = landing;
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
              <StickerPicture
                art={stickerArt(s, flight)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* The last spot taken: the carrier is kept as it is, a fresh one is packed, and miles come back. */}
      {filled.map((f) => (
        <div key={f.carrier.id} className={styles.filled} style={{ animationDelay: `${1.3 + stickers.length * 0.35}s` }}>
          <p className="label">Carrier full</p>
          <p className={styles.filledTitle}>Your {carrierType(f.carrier.modelId).name} is covered.</p>
          <p className={styles.filledNote}>It stays in your luggage just as it is. A fresh one is packed for the next trip.</p>
          <p className={styles.filledMiles}>
            +{f.bonus.toLocaleString('en-US')} mi
            {f.first && <span className={styles.filledFirst}>first time · double</span>}
          </p>
        </div>
      ))}

      <TicketButton onClick={done} sub={`Back to ${city.city}`}>
        Collect and continue
      </TicketButton>
    </section>
  );
}

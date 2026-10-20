import { useEffect, useState } from 'react';
import { CarrierView, type CarrierSticker } from '../components/CarrierView';
import { MilesStamp } from '../components/MilesStamp';
import { TicketButton } from '../components/TicketButton';
import { TierBadge } from '../components/TierBadge';
import { airlineByCode } from '../data/airlines';
import { cityByCode } from '../data/cities';
import { db, type Carrier } from '../db/db';
import { localTime } from '../domain/time';
import { nextTier, tierLabel } from '../domain/tier';
import { useApp } from '../store/appStore';
import { useTier } from '../store/useTier';
import styles from './FlyScreen.module.css';

function greeting(hour: number): string {
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function FlyScreen() {
  const profile = useApp((s) => s.profile)!;
  const go = useApp((s) => s.go);
  const tier = useTier();
  const here = cityByCode(profile.currentCityCode)!;
  const next = nextTier(profile.lifetimeMiles);

  const [carrier, setCarrier] = useState<Carrier>();
  const [stickers, setStickers] = useState<CarrierSticker[]>([]);

  useEffect(() => {
    (async () => {
      setCarrier(await db.carriers.get(profile.activeCarrierId));
      const list = await db.stickers.where('carrierId').equals(profile.activeCarrierId).toArray();
      const flights = await db.flights.bulkGet(list.map((s) => s.flightId));
      setStickers(
        list.map((s, i) => ({
          id: s.id,
          kind: s.kind,
          code: s.code,
          appliedAt: s.appliedAt,
          airlineColor: airlineByCode(flights[i]?.airlineCode ?? '').color,
        })),
      );
    })();
  }, [profile.activeCarrierId, profile.lifetimeMiles]);

  // Greeting and date follow the clock where the traveler is now, not the device.
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: here.tz }).format(now));
  const date = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: here.tz }).format(now);
  const count = stickers.length;
  const capacity = carrier?.capacity ?? 24;

  return (
    <section className={styles.screen}>
      <header className={styles.top}>
        <div>
          <p className="label">
            {date} · {localTime(here.tz)}
          </p>
          <h1 className={styles.greeting}>
            {greeting(hour)},
            <br />
            <em>{profile.name}.</em>
          </h1>
          {tier !== 'basic' && <TierBadge tier={tier} />}
        </div>
        <MilesStamp miles={profile.miles} />
      </header>

      <div className={styles.location}>
        <p className="label">Now at</p>
        <div className={styles.cityRow}>
          <span className={styles.city}>{here.city}</span>
          <span className={styles.code}>{here.code}</span>
        </div>
        <p className={styles.airport}>
          {here.airport} · {here.country}
        </p>
      </div>

      <div className={styles.carrierArea}>
        <CarrierView color={carrier?.color ?? '#2c3b55'} stickers={stickers} />
        <p className={styles.caption}>
          {count === 0
            ? 'Your first sticker is one flight away'
            : `${count} ${count === 1 ? 'sticker' : 'stickers'} · ${Math.max(0, capacity - count)} spaces left`}
        </p>
      </div>

      {next && (
        <div className={styles.tier}>
          <div className={styles.tierText}>
            <span>{tierLabel(tier)} member</span>
            <span>
              {next.remaining.toLocaleString('en-US')} mi to {tierLabel(next.tier)}
            </span>
          </div>
          <div className={styles.track}>
            <div
              className={styles.fill}
              style={{ width: `${(profile.lifetimeMiles / (profile.lifetimeMiles + next.remaining)) * 100}%` }}
            />
          </div>
        </div>
      )}

      <TicketButton sub={`From ${here.city} · ${here.code}`} onClick={() => go('booking')}>
        Book a flight
      </TicketButton>
    </section>
  );
}

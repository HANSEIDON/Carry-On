import { PlaceholderCarrier } from '../components/PlaceholderCarrier';
import { TierBadge } from '../components/TierBadge';
import { cityByCode } from '../data/cities';
import { localTime } from '../domain/time';
import { nextTier, tierFor, tierLabel } from '../domain/tier';
import { useApp } from '../store/appStore';
import styles from './FlyScreen.module.css';

export function FlyScreen() {
  const profile = useApp((s) => s.profile)!;
  const go = useApp((s) => s.go);
  const here = cityByCode(profile.currentCityCode)!;
  const tier = tierFor(profile.lifetimeMiles);
  const next = nextTier(profile.lifetimeMiles);

  return (
    <section className={styles.screen}>
      <header className={styles.header}>
        <p className={styles.name}>
          {profile.name} <TierBadge tier={tier} />
        </p>
        <p className={styles.miles}>{profile.miles.toLocaleString('en-US')} mi</p>
      </header>

      <div className={styles.location}>
        <p className={styles.label}>Now at</p>
        <p className={styles.code}>{here.code}</p>
        <p className={styles.city}>
          {here.city} · {here.airport} · {localTime(here.tz)}
        </p>
      </div>

      <div className={styles.carrier}>
        <PlaceholderCarrier color="#2b2e33" />
        <p className={styles.label}>0 / 24 stickers</p>
      </div>

      {next && (
        <div className={styles.tier}>
          <div className={styles.tierText}>
            <span>{next.remaining.toLocaleString('en-US')} mi to {tierLabel(next.tier)}</span>
          </div>
          <div className={styles.track}>
            <div
              className={styles.fill}
              style={{ width: `${(profile.lifetimeMiles / (profile.lifetimeMiles + next.remaining)) * 100}%` }}
            />
          </div>
        </div>
      )}

      <button className={styles.cta} onClick={() => go('booking')}>
        Book a flight
      </button>
    </section>
  );
}

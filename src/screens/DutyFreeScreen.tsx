import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { CarrierThumb } from '../components/CarrierThumb';
import { MilesStamp } from '../components/MilesStamp';
import { CARRIERS } from '../data/carriers';
import { addMilesForTesting, buyCarrier, listCarriers, setActiveCarrier, type Carrier } from '../db/db';
import { shopOrder, shopState } from '../domain/carrierShop';
import { TIER_THRESHOLDS, tierLabel } from '../domain/tier';
import { useApp } from '../store/appStore';
import { useTier } from '../store/useTier';
import styles from './DutyFreeScreen.module.css';

/** three.js is big: load it only when a 3D view opens. */
const Carrier3D = lazy(() => import('../components/Carrier3D').then((m) => ({ default: m.Carrier3D })));

/** On sale: every carrier that has its 3D model, cheapest tier first. */
const SHELF = CARRIERS.filter((c) => c.model).sort(shopOrder);

/** Let the display catch up on the neighbours' models before you pick them. */
const preload = (ids: string[]) => void import('../components/Carrier3D').then((m) => ids.forEach(m.preloadCarrier));

/**
 * Duty Free: one carrier at a time on a turning display (turn it with a finger), bought with
 * spendable miles. Some are for higher membership tiers. Scroll the shelf below and tap one to put
 * it on display. Buying takes two taps (the second confirms).
 */
export function DutyFreeScreen() {
  const profile = useApp((s) => s.profile)!;
  const setProfile = useApp((s) => s.setProfile);
  const go = useApp((s) => s.go);
  const tier = useTier();
  const [owned, setOwned] = useState<Carrier[]>([]);
  // Open on the carrier you came for (from the luggage room), else the first on the shelf.
  const [index, setIndex] = useState(() => Math.max(0, SHELF.findIndex((c) => c.id === useApp.getState().shopFocus)));
  const [armed, setArmed] = useState(false);
  const [justBought, setJustBought] = useState<Carrier | null>(null);
  const shelf = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void listCarriers().then(setOwned);
  }, [profile.miles, profile.activeCarrierId]);

  /** Slides the shelf (only the shelf, never the page) so this carrier's chip is in the middle. */
  const centre = (n: number, smooth: boolean) => {
    const row = shelf.current;
    const chip = row?.children[n] as HTMLElement | undefined;
    if (!row || !chip) return;
    row.scrollTo({ left: chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    centre(index, false);
    useApp.setState({ shopFocus: null });
    // Only once, on arrival.
  }, []);

  const type = SHELF[index];
  // Yours of this kind: the one in progress (not one you filled and keep as it is).
  const mine = useMemo(() => owned.find((c) => c.modelId === type.id && !c.filledAt), [owned, type.id]);
  const state = shopState(type, { owned: !!mine, tier, miles: profile.miles });

  const show = (i: number) => {
    const n = (i + SHELF.length) % SHELF.length;
    setIndex(n);
    setArmed(false);
    setJustBought(null);
    centre(n, true);
  };

  useEffect(() => {
    preload([SHELF[(index + 1) % SHELF.length].id, SHELF[(index + SHELF.length - 1) % SHELF.length].id]);
  }, [index]);

  const buy = async () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    const result = await buyCarrier(type.id, tier);
    setProfile(result.profile);
    setJustBought(result.carrier);
    setArmed(false);
  };

  const use = async (carrier: Carrier) => {
    setProfile(await setActiveCarrier(carrier.id));
    go('luggage');
  };

  let action;
  if (state.kind === 'owned') {
    action =
      mine && mine.id !== profile.activeCarrierId ? (
        <button className={styles.secondary} onClick={() => use(mine)}>
          {justBought ? 'Packed! Travel with it now' : 'In your luggage · travel with it'}
        </button>
      ) : (
        <p className={styles.note}>In your luggage{mine?.id === profile.activeCarrierId ? ' · travelling with you' : ''}</p>
      );
  } else if (state.kind === 'locked') {
    action = (
      <>
        <button className={styles.buy} disabled>
          For {tierLabel(state.tier)} members
        </button>
        <p className={styles.note}>
          {Math.max(0, TIER_THRESHOLDS[state.tier] - profile.lifetimeMiles).toLocaleString('en-US')} more flown miles to {tierLabel(state.tier)}
        </p>
      </>
    );
  } else if (state.kind === 'short') {
    action = (
      <>
        <button className={styles.buy} disabled>
          {type.price.toLocaleString('en-US')} mi
        </button>
        <p className={styles.note}>{state.missing.toLocaleString('en-US')} more miles to go</p>
      </>
    );
  } else if (state.kind === 'buyable') {
    action = (
      <button className={styles.buy} data-armed={armed} onClick={buy}>
        {armed ? `Tap again to buy · ${type.price.toLocaleString('en-US')} mi` : `Buy · ${type.price.toLocaleString('en-US')} mi`}
      </button>
    );
  }

  return (
    <section className={styles.screen}>
      <header className={styles.head}>
        <div>
          <p className="label">Duty Free</p>
          <h1 className={styles.title}>{type.name}</h1>
          <p className={styles.sub}>
            No. {type.id} · {tierLabel(type.tier)}
          </p>
        </div>
        <MilesStamp miles={profile.miles} />
      </header>

      {/* Turn it with a finger (sideways); up and down still scrolls the page. */}
      <div className={styles.stage}>
        <Suspense fallback={<p className={styles.loading}>Unpacking…</p>}>
          <Carrier3D id={type.id} scrollable />
        </Suspense>
      </div>

      <p className={styles.blurb}>{type.blurb}</p>
      <div className={styles.action}>{action}</div>

      <div className={styles.shelf} ref={shelf} role="radiogroup" aria-label="Carriers on sale">
        {SHELF.map((t, i) => {
          const s = shopState(t, { owned: owned.some((c) => c.modelId === t.id), tier, miles: profile.miles });
          return (
            <button key={t.id} role="radio" aria-checked={i === index} className={styles.chip} data-state={s.kind} onClick={() => show(i)}>
              <span className={styles.chipPicture}>
                <CarrierThumb id={t.id} alt="" />
              </span>
              <span className={styles.chipName}>{t.name}</span>
              <span className={styles.chipTag}>
                {s.kind === 'owned' ? 'Owned' : s.kind === 'locked' ? tierLabel(t.tier) : `${(t.price / 1000).toLocaleString('en-US')}k`}
              </span>
            </button>
          );
        })}
      </div>
      <p className={styles.more}>{CARRIERS.length - SHELF.length} more carriers are on their way.</p>

      {import.meta.env.DEV && (
        <button className={styles.dev} onClick={async () => setProfile(await addMilesForTesting(10_000))}>
          + 10,000 mi (dev only)
        </button>
      )}
    </section>
  );
}

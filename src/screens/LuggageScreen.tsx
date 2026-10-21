import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { CarrierThumb } from '../components/CarrierThumb';
import { carrierType, CARRIERS } from '../data/carriers';
import { listCarriers, setActiveCarrier, stickersOn, type Carrier } from '../db/db';
import type { StickerArt } from '../domain/stickerArt';
import { tierLabel } from '../domain/tier';
import { useApp } from '../store/appStore';
import styles from './LuggageScreen.module.css';

/** three.js is big: load it only when a 3D view opens. */
const Carrier3D = lazy(() => import('../components/Carrier3D').then((m) => ({ default: m.Carrier3D })));

type Owned = Carrier & { stickers: number };

const day = (t: number) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(t);

/**
 * The luggage room: the collection of all thirty carriers, and the one you tap standing on top.
 * Yours turn in 3D with their stickers on (drag to turn, pinch to look closer); the ones you
 * haven't found yet stand there as a silhouette, with the way to Duty Free; the ones still being
 * made are a question mark. A kind you've filled before keeps each filled one, stickers and all,
 * beside the one in progress.
 */
export function LuggageScreen() {
  const profile = useApp((s) => s.profile)!;
  const setProfile = useApp((s) => s.setProfile);
  const openShop = useApp((s) => s.openShop);
  const [owned, setOwned] = useState<Owned[]>([]);
  /** Carrier type on show; until you tap one, the one you travel with. */
  const [selected, setSelected] = useState<string | null>(null);
  /** A filled one of that kind on show instead of the one in progress. */
  const [copyId, setCopyId] = useState<string | null>(null);
  const [stickerList, setStickerList] = useState<{ carrierId: string; stickers: StickerArt[] }>();
  const top = useRef<HTMLElement>(null);

  useEffect(() => {
    void listCarriers().then(setOwned);
  }, [profile.activeCarrierId, profile.miles]);

  // Of each kind: the one in progress (on the shelf, by type), and the filled ones before it.
  const byType = useMemo(() => new Map(owned.filter((c) => !c.filledAt).map((c) => [c.modelId, c])), [owned]);
  const filledOf = useMemo(() => {
    const map = new Map<string, Owned[]>();
    for (const c of owned.filter((c) => c.filledAt)) map.set(c.modelId, [...(map.get(c.modelId) ?? []), c]);
    return map;
  }, [owned]);
  const active = owned.find((c) => c.id === profile.activeCarrierId);
  const typeId = selected ?? active?.modelId;
  const type = typeId ? carrierType(typeId) : null;
  const current = typeId ? byType.get(typeId) : undefined;
  const shelf = typeId ? (filledOf.get(typeId) ?? []) : [];
  const mine = (copyId && owned.find((c) => c.id === copyId)) || current;
  const inUse = !!mine && mine.id === profile.activeCarrierId;

  useEffect(() => {
    if (!mine) return;
    let live = true;
    const carrierId = mine.id;
    void stickersOn(carrierId).then((stickers) => live && setStickerList({ carrierId, stickers }));
    return () => {
      live = false;
    };
  }, [mine?.id, mine?.stickers]);
  // Only this carrier's (never the last one's for a moment while they load).
  const stickers = stickerList?.carrierId === mine?.id ? stickerList?.stickers : undefined;

  const pick = (id: string) => {
    setSelected(id);
    setCopyId(null);
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const use = async () => {
    if (!mine) return;
    setProfile(await setActiveCarrier(mine.id));
  };

  let title = ' ';
  let sub = ' ';
  if (type && mine?.filledAt) {
    title = type.name;
    sub = `No. ${type.id} · filled ${day(mine.filledAt)}`;
  } else if (type && mine) {
    title = type.name;
    sub = `No. ${type.id} · ${inUse ? 'travelling with you' : 'in the closet'}`;
  } else if (type) {
    title = 'Not found yet';
    sub = type.model ? `No. ${type.id} · waiting in Duty Free` : `No. ${type.id} · still being made`;
  }

  return (
    <section className={styles.screen}>
      <header className={styles.head} ref={top}>
        <p className="label">Luggage</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.sub}>{sub}</p>
      </header>

      <div className={styles.stage}>
        {type && mine && (
          <Suspense fallback={<p className={styles.loading}>Unpacking…</p>}>
            <Carrier3D id={type.id} stickers={stickers} />
          </Suspense>
        )}
        {type && !mine && type.model && (
          <div className={styles.shadow}>
            <CarrierThumb id={type.id} alt={`No. ${type.id}, not found yet`} silhouette />
          </div>
        )}
        {type && !mine && !type.model && <span className={styles.bigMark}>?</span>}
      </div>

      {type && (
        <div className={styles.status}>
          {mine ? (
            <>
              <span className={styles.count}>
                {mine.stickers} / {type.capacity} stickers
              </span>
              {mine.filledAt ? (
                <span className={styles.inUse}>Filled</span>
              ) : inUse ? (
                <span className={styles.inUse}>In use</span>
              ) : (
                <button className={styles.primary} onClick={use}>
                  Travel with this one
                </button>
              )}
            </>
          ) : type.model ? (
            <>
              <span className={styles.count}>
                {tierLabel(type.tier)} · {type.price.toLocaleString('en-US')} mi
              </span>
              <button className={styles.primary} onClick={() => openShop(type.id)}>
                Find it in Duty Free ›
              </button>
            </>
          ) : (
            <span className={styles.count}>Coming in a later update</span>
          )}
        </div>
      )}

      {/* Filled ones of this kind, kept as they are, and the one in progress. */}
      {shelf.length > 0 && (
        <div className={styles.copies} role="radiogroup" aria-label="Your carriers of this kind">
          {shelf.map((c) => (
            <button key={c.id} role="radio" aria-checked={mine?.id === c.id} className={styles.copy} onClick={() => setCopyId(c.id)}>
              <span className={styles.copyMark}>✓</span> No. {c.copy ?? 1} · {day(c.filledAt!)}
            </button>
          ))}
          {current && (
            <button role="radio" aria-checked={mine?.id === current.id} className={styles.copy} onClick={() => setCopyId(null)}>
              No. {current.copy ?? 1} · now
            </button>
          )}
        </div>
      )}

      <div className={styles.collectionHead}>
        <h2 className={styles.h2}>Collection</h2>
        <span className={styles.tally}>
          {new Set(owned.map((c) => c.modelId)).size} / {CARRIERS.length}
        </span>
      </div>

      <div className={styles.grid}>
        {CARRIERS.map((t) => {
          const have = byType.get(t.id);
          const full = filledOf.get(t.id)?.length ?? 0;
          return (
            <button
              key={t.id}
              className={`${styles.card} ${have ? '' : styles.unknown}`}
              aria-pressed={t.id === typeId}
              aria-label={have ? t.name : `No. ${t.id}, not found yet`}
              onClick={() => pick(t.id)}
            >
              <span className={styles.picture}>
                {have || t.model ? <CarrierThumb id={t.id} alt="" silhouette={!have} /> : <span className={styles.mark}>?</span>}
              </span>
              <span className={have ? styles.name : styles.number}>{have ? t.name : `No. ${t.id}`}</span>
              {have && have.id === profile.activeCarrierId && <span className={styles.dot} aria-label="In use" />}
              {full > 0 && <span className={styles.full} aria-label={`Filled ${full} times`}>✓{full > 1 ? ` ×${full}` : ''}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { passportSound } from '../audio/passportSound';
import { PassportEditor } from '../components/PassportEditor';
import { ThemeMenu } from '../components/ThemeMenu';
import { Cover, CoverInside, DataPage, LogPage, VisaPage } from '../components/PassportPages';
import { countryByCode, COUNTRIES } from '../data/countries';
import { listFlights, type Flight, type Profile } from '../db/db';
import { formatDuration } from '../domain/geo';
import { flightLog, holderOf, stampsFor, visaPages, type PlacedStamp } from '../domain/passport';
import { useApp } from '../store/appStore';
import { useTier } from '../store/useTier';
import styles from './PassportScreen.module.css';

/*
 * The passport as a booklet. Closed, it stands portrait, close to the camera. Tapped, it turns on
 * its side as the camera eases back (it shrinks to fit the open spread), then the cover swings up
 * over the spine: it's held open like at a border desk, a page above the spine and a page below,
 * the data page at the bottom of the first spread. Pages turn like paper: the bottom page lifts
 * with the finger and turns over the spine; let go past a third (or flick) and it turns, else it
 * falls back. A tap turns one page. Turning back past the first spread closes it again.
 *
 * Motion is the point of this screen, so it plays even with "reduce motion" on (it's short and
 * only ever starts from the user's own tap or swipe).
 *
 * The book is a stack of leaves. Leaf 0 is the cover (outside: the cover art; inside: the
 * endpaper). Leaf k ≥ 1 carries page 2k-2 on its front and page 2k-1 on its back. "turned" counts
 * the leaves flipped up: the top shows the back of the last one turned, the bottom the front of
 * the next one.
 */

/** Turning the booklet on its side while the camera pulls back. */
const ROTATE_MS = 700;
const COVER_MS = 760;
const PAGE_MS = 560;
/** How close the camera is to the closed booklet. */
const CLOSED_SCALE = 1.32;

type TurnKind = 'open' | 'close' | 'next' | 'prev';

interface Turn {
  kind: TurnKind;
  /** Leaves turned before and after. */
  from: number;
  to: number;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function PassportScreen() {
  const profile = useApp((s) => s.profile)!;
  const setProfile = useApp((s) => s.setProfile);
  const tier = useTier();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [turned, setTurnedState] = useState(0);
  const turnedRef = useRef(0);
  const setTurned = (n: number) => {
    turnedRef.current = n;
    setTurnedState(n);
  };
  const [turn, setTurnState] = useState<Turn | null>(null);
  /** The same turn, readable at once by gesture handlers (state lags a render behind). */
  const turnRef = useRef<Turn | null>(null);
  const setTurn = (t: Turn | null) => {
    turnRef.current = t;
    setTurnState(t);
  };
  const [editing, setEditing] = useState(false);
  /** What the editor shows while typing, so the page changes as you type. */
  const [preview, setPreview] = useState<Partial<Profile> | null>(null);

  const stage = useRef<HTMLDivElement>(null);
  const bookEl = useRef<HTMLDivElement>(null);
  const leafEl = useRef<HTMLDivElement>(null);
  const shadeEl = useRef<HTMLDivElement>(null);
  const castTopEl = useRef<HTMLDivElement>(null);
  const castBottomEl = useRef<HTMLDivElement>(null);
  /** rotateX of the turning leaf: 0 lying on the bottom, 180 turned up onto the top. */
  const angle = useRef(0);
  /** A tap's turn waiting for its leaf to be on screen: run the whole animation. */
  const pending = useRef(false);
  const drag = useRef<{ x: number; y: number; t: number; axis: 'x' | 'y' | null; id: number } | null>(null);
  const frame = useRef(0);
  const safety = useRef(0);

  useEffect(() => {
    void listFlights().then(setFlights);
    return () => {
      cancelAnimationFrame(frame.current);
      clearTimeout(safety.current);
    };
  }, []);

  const shown = preview ? { ...profile, ...preview } : profile;
  const holder = holderOf(shown);
  const country = countryByCode(holder.nationality) ?? COUNTRIES[0];
  const stamps = useMemo(() => stampsFor(flights), [flights]);
  const log = useMemo(() => flightLog(flights), [flights]);
  // Pages come in pairs (front and back of a leaf): pad with an empty visa page if needed.
  const visas = useMemo(() => {
    const v = visaPages(stamps);
    return v.length % 2 === 0 ? v : [...v, [] as PlacedStamp[]];
  }, [stamps]);
  const pageCount = 2 + visas.length;
  /** All leaves turned: the last visa page on top, the inside of the back cover below. */
  const lastSpread = 1 + pageCount / 2;

  const page = (i: number): ReactNode => {
    if (i === 0)
      return <DataPage holder={holder} country={country} photo={shown.photo} tier={tier} onEdit={() => setEditing(true)} />;
    if (i === 1)
      return (
        <LogPage
          log={log}
          miles={profile.lifetimeMiles}
          tier={tier}
          memberSince={holder.issued}
          homeCode={profile.currentCityCode}
          country={country}
        />
      );
    if (i < pageCount) return <VisaPage stamps={visas[i - 2]} number={i} country={country} />;
    return <CoverInside country={country} note={false} />;
  };
  const coverFace = (
    <div className={styles.coverTurn}>
      <Cover country={country} />
    </div>
  );
  const front = (leaf: number) => (leaf === 0 ? coverFace : page(2 * leaf - 2));
  const back = (leaf: number) => (leaf === 0 ? <CoverInside country={country} /> : page(2 * leaf - 1));

  // --- Drawing, straight on the DOM every frame (no re-renders) ------------------------------------

  /** The booklet from closed (0: standing portrait, up close) to open (1: on its side, camera back). */
  const paintBook = (p: number) => {
    if (!bookEl.current) return;
    bookEl.current.style.transform =
      p >= 1 ? 'none' : `translateY(${lerp(-25, 0, p)}%) rotate(${lerp(-90, 0, p)}deg) scale(${lerp(CLOSED_SCALE, 1, p)})`;
  };

  const paintLeaf = (a: number) => {
    angle.current = a;
    const lift = Math.sin((a * Math.PI) / 180);
    if (leafEl.current) leafEl.current.style.transform = `rotateX(${a}deg)`;
    if (shadeEl.current) shadeEl.current.style.opacity = String(lift * 0.38);
    // The leaf's shadow falls on whichever page it's over.
    if (castBottomEl.current) castBottomEl.current.style.opacity = String(a < 90 ? lift * 0.5 : 0);
    if (castTopEl.current) castTopEl.current.style.opacity = String(a > 90 ? lift * 0.5 : 0);
  };

  /** Run `draw(k)` for k from 0 to 1 over `ms`, then `done`. Lands even if frames stop (hidden tab). */
  const animate = (ms: number, draw: (k: number) => void, done: () => void) => {
    cancelAnimationFrame(frame.current);
    clearTimeout(safety.current);
    const start = performance.now();
    let over = false;
    const end = () => {
      if (over) return;
      over = true;
      cancelAnimationFrame(frame.current);
      clearTimeout(safety.current);
      draw(1);
      done();
    };
    const step = (now: number) => {
      const k = clamp((now - start) / ms, 0, 1);
      draw(k);
      if (k < 1) frame.current = requestAnimationFrame(step);
      else end();
    };
    frame.current = requestAnimationFrame(step);
    safety.current = window.setTimeout(end, ms + 300);
  };

  const settle = (t: Turn, landed: boolean) => {
    setTurned(landed ? t.to : t.from);
    setTurn(null);
    if (castTopEl.current) castTopEl.current.style.opacity = '0';
    if (castBottomEl.current) castBottomEl.current.style.opacity = '0';
    if (landed) navigator.vibrate?.(6);
  };

  /** Let the leaf finish its swing from wherever it is, to 180 (up) or 0 (down). */
  const swing = (t: Turn, to: number, ms: number, ease: (k: number) => number) => {
    const from = angle.current;
    const up = t.kind === 'open' || t.kind === 'next';
    const landed = up ? to === 180 : to === 0;
    const isCover = t.kind === 'open' || t.kind === 'close';
    if (landed) {
      if (isCover) passportSound.cover(t.kind === 'open', ms / 1000);
      else passportSound.page(ms / 1000);
    }
    animate(
      ms,
      (k) => paintLeaf(lerp(from, to, ease(k))),
      () => {
        if (t.kind === 'close' && landed) {
          // The cover is down: stand the booklet up again as the camera comes closer.
          animate(ROTATE_MS, (k) => paintBook(1 - easeInOut(k)), () => settle(t, true));
        } else settle(t, landed);
      },
    );
  };

  // Not turning: the booklet sits closed or open.
  useLayoutEffect(() => {
    if (!turn) paintBook(turned > 0 ? 1 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, turned]);

  // A leaf just came on screen: put it where it starts; a tap's turn plays through.
  useLayoutEffect(() => {
    if (!turn) return;
    paintLeaf(angle.current);
    if (!pending.current) return;
    pending.current = false;
    if (turn.kind === 'open') {
      // First the booklet turns on its side and the camera pulls back, then the cover lifts.
      animate(ROTATE_MS, (k) => paintBook(easeInOut(k)), () => swing(turn, 180, COVER_MS, easeInOut));
    } else {
      const up = turn.kind === 'next';
      swing(turn, up ? 180 : 0, turn.kind === 'close' ? COVER_MS : PAGE_MS, easeInOut);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn]);

  /** Which turn goes forward or back from here, if any. */
  const turnFor = (forward: boolean): Turn | null => {
    const turned = turnedRef.current;
    if (turned === 0) return forward ? { kind: 'open', from: 0, to: 1 } : null;
    if (forward) return turned + 1 <= lastSpread ? { kind: 'next', from: turned, to: turned + 1 } : null;
    return turned === 1 ? { kind: 'close', from: 1, to: 0 } : { kind: 'prev', from: turned, to: turned - 1 };
  };

  /** A whole turn from a tap, key or button. */
  const go = (forward: boolean, close = false) => {
    if (turnRef.current || editing) return;
    const now = turnedRef.current;
    const t = close ? (now > 0 ? { kind: 'close' as const, from: now, to: 0 } : null) : turnFor(forward);
    if (!t) return;
    angle.current = t.kind === 'open' || t.kind === 'next' ? 0 : 180;
    pending.current = true;
    setTurn(t);
  };

  // --- Gestures: a page follows the finger, like paper -----------------------------------------

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (turnRef.current || editing || (e.target as HTMLElement).closest('[data-no-turn]')) return;
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now(), axis: null, id: e.pointerId };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || turnedRef.current === 0) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.axis) {
      if (Math.hypot(dx, dy) < 8) return;
      d.axis = Math.abs(dy) >= Math.abs(dx) ? 'y' : 'x';
      const t = turnFor(d.axis === 'y' ? dy < 0 : dx < 0);
      if (!t) {
        drag.current = null;
        return;
      }
      try {
        stage.current!.setPointerCapture(e.pointerId);
      } catch {
        // The touch is already gone; the drag works without capture.
      }
      angle.current = t.kind === 'next' ? 0 : 180;
      setTurn(t);
      return;
    }
    const t = turnRef.current;
    if (!t) return;
    // A full page height of travel lifts the page to upright; twice that lays it on top.
    const pageHeight = stage.current!.clientHeight / 2;
    const pulled = d.axis === 'y' ? -dy / (2 * pageHeight) : -dx / stage.current!.clientWidth;
    paintLeaf(t.kind === 'next' ? clamp(pulled * 180, 0, 180) : clamp(180 + pulled * 180, 0, 180));
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    if (!d.axis) return go(true); // a tap: open, or turn one page
    const turn = turnRef.current;
    if (!turn) return;
    const up = turn.kind === 'next';
    const progress = up ? angle.current / 180 : (180 - angle.current) / 180;
    const moved = d.axis === 'y' ? -(e.clientY - d.y) : -(e.clientX - d.x);
    const velocity = moved / Math.max(1, performance.now() - d.t);
    const done = progress > 0.33 || (up ? velocity > 0.4 : velocity < -0.4);
    const to = up === done ? 180 : 0;
    const base = turn.kind === 'close' ? COVER_MS : PAGE_MS;
    swing(turn, to, base * Math.max(0.35, Math.abs(to - angle.current) / 180), easeOut);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') go(true);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') go(false);
    else if (e.key === 'Escape') go(false, true);
    else return;
    e.preventDefault();
  };

  // --- What's on screen --------------------------------------------------------------------------

  const open = turned > 0 || !!turn;
  let top: ReactNode = null;
  let bottom: ReactNode = turned === 0 ? coverFace : front(turned);
  let leaf: { front: ReactNode; back: ReactNode } | null = null;
  if (turn) {
    if (turn.kind === 'open') {
      bottom = front(1);
      leaf = { front: coverFace, back: back(0) };
    } else if (turn.kind === 'close') {
      // The whole upper stack folds down: the reader sees the top page, then the cover's outside.
      bottom = front(turn.from);
      leaf = { front: coverFace, back: back(turn.from - 1) };
    } else if (turn.kind === 'next') {
      top = back(turn.from - 1);
      bottom = front(turn.to);
      leaf = { front: front(turn.from), back: back(turn.from) };
    } else {
      top = back(turn.to - 1);
      bottom = front(turn.from);
      leaf = { front: front(turn.to), back: back(turn.to) };
    }
  } else if (turned > 0) {
    top = back(turned - 1);
  }

  /** The leaf turning is the front cover (opening or closing): it's larger than a page. */
  const coverLeaf = turn?.kind === 'open' || turn?.kind === 'close';
  const name = (i: number) => (i === 0 ? 'Data page' : i === 1 ? 'Endorsements' : i < pageCount ? `Visas ${i - 1}` : 'Back cover');
  const at = turn ? turn.to : turned;
  const where = at === 0 ? 'Cover' : at === 1 ? 'Data page' : `${name(2 * at - 3)} · ${name(2 * at - 2)}`;

  return (
    <section className={styles.screen}>
      <header className={styles.head}>
        <div>
          <p className="label">Passport</p>
          <h1 className={styles.title}>
            {stamps.length} {stamps.length === 1 ? 'stamp' : 'stamps'} · {log.countries}{' '}
            {log.countries === 1 ? 'country' : 'countries'}
          </h1>
          <p className={styles.sub}>{formatDuration(log.minutes)} of focus, flown and stamped</p>
        </div>
        {at > 0 ? (
          <button className={styles.close} onClick={() => go(false, true)} disabled={!!turn}>
            Close
          </button>
        ) : (
          <div className={styles.corner}>
            <ThemeMenu />
          </div>
        )}
      </header>

      <div
        ref={stage}
        className={styles.stage}
        tabIndex={0}
        role="group"
        aria-roledescription="passport"
        aria-label={`Passport, ${where}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={onKeyDown}
      >
        <div
          ref={bookEl}
          className={styles.book}
          data-open={open}
          style={
            {
              '--cover': country.cover,
              transform: turned > 0 ? 'none' : `translateY(-25%) rotate(-90deg) scale(${CLOSED_SCALE})`,
            } as CSSProperties
          }
        >
          <div className={styles.caseBottom} />
          {turned > 0 && turn?.kind !== 'close' && <div className={styles.caseTop} />}
          {top !== null && (
            <div className={styles.top}>
              {top}
              <div ref={castTopEl} className={styles.castTop} />
            </div>
          )}
          <div className={styles.bottom}>
            {bottom}
            <div ref={castBottomEl} className={styles.castBottom} />
          </div>
          {leaf && (
            <div ref={leafEl} className={styles.leaf} data-cover={coverLeaf}>
              <div className={styles.front}>
                {leaf.front}
                <div ref={shadeEl} className={styles.shade} />
              </div>
              <div className={styles.back}>
                {coverLeaf && <div className={styles.backRim} />}
                {leaf.back}
              </div>
            </div>
          )}
          {/* The gutter and the light on the spread: only once both pages lie open (never over empty space). */}
          {turned > 0 && turn?.kind !== 'close' && (
            <>
              <div className={styles.spine} aria-hidden="true" />
              <div className={styles.light} aria-hidden="true" />
            </>
          )}
        </div>
      </div>

      {/* Where you are in the booklet: a dot a spread, or a thin line once there are too many to dot. */}
      {lastSpread < 12 ? (
        <div className={styles.dots} aria-hidden="true">
          {Array.from({ length: lastSpread + 1 }, (_, i) => (
            <span key={i} data-on={i === at} />
          ))}
        </div>
      ) : (
        <div className={styles.track} aria-hidden="true">
          <span style={{ left: `${(at / lastSpread) * 100}%` }} />
        </div>
      )}

      {editing && (
        <PassportEditor
          profile={profile}
          onChange={setPreview}
          onClose={() => {
            setPreview(null);
            setEditing(false);
          }}
          onSaved={(p) => {
            setProfile(p);
            setPreview(null);
            setEditing(false);
          }}
        >
          {page(0)}
        </PassportEditor>
      )}
    </section>
  );
}

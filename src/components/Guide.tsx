import { useState, type ReactNode } from 'react';
import { useSettings } from '../store/settings';
import styles from './Guide.module.css';

/** A small drawing for each page, in the notebook's ink. */
const ART: Record<string, ReactNode> = {
  // A great-circle route with the plane on it.
  fly: (
    <svg viewBox="0 0 200 110">
      <path className={styles.dash} d="M24 86 Q100 -6 176 86" />
      <circle className={styles.dot} cx="24" cy="86" r="5" />
      <circle className={styles.dot} cx="176" cy="86" r="5" />
      <g transform="translate(100 40) scale(1.6)">
        <path
          className={styles.fill}
          transform="translate(-12.8 -12)"
          d="M10.2 21h1.6l4.6-7.6H21a1.5 1.5 0 0 0 0-3h-4.6L11.8 3h-1.6l2.2 7.4H7.6L6 8.4H4.6l1 3.6-1 3.6H6l1.6-2h4.8z"
        />
      </g>
    </svg>
  ),
  // A clock face, most of the way round.
  stay: (
    <svg viewBox="0 0 200 110">
      <circle className={styles.line} cx="100" cy="55" r="42" />
      <path className={styles.accent} d="M100 13 A42 42 0 1 1 61 70" />
      <path className={styles.line} d="M100 55 V30 M100 55 L118 64" />
    </svg>
  ),
  // A passport stamp and a travel label.
  collect: (
    <svg viewBox="0 0 200 110">
      <g transform="rotate(-8 70 55)">
        <ellipse className={styles.stamp} cx="70" cy="55" rx="44" ry="30" />
        <ellipse className={styles.stamp} cx="70" cy="55" rx="37" ry="23" />
        <text className={styles.stampText} x="70" y="61">
          HND
        </text>
      </g>
      <g transform="rotate(6 144 58)">
        <rect className={styles.label} x="112" y="36" width="64" height="44" rx="6" />
        <rect className={styles.ribbon} x="112" y="52" width="64" height="14" />
        <circle className={styles.ribbon} cx="144" cy="44" r="5" />
      </g>
    </svg>
  ),
  // A carrier with stickers on, and miles back.
  miles: (
    <svg viewBox="0 0 200 110">
      <rect className={styles.line} x="76" y="22" width="48" height="70" rx="8" />
      <path className={styles.line} d="M90 22 V10 H110 V22 M86 92 v6 M114 92 v6" />
      <rect className={styles.sticker} x="82" y="34" width="22" height="11" rx="2" transform="rotate(-6 93 39)" />
      <circle className={styles.sticker} cx="112" cy="58" r="7" />
      <rect className={styles.sticker} x="84" y="66" width="20" height="10" rx="2" transform="rotate(5 94 71)" />
      <text className={styles.plus} x="146" y="54">
        +
      </text>
      <text className={styles.mi} x="148" y="72">
        mi
      </text>
    </svg>
  ),
};

const PAGES: { art: string; title: string; text: string }[] = [
  {
    art: 'fly',
    title: 'Every focus session is a flight.',
    text: 'Pick how long you want to focus. Carry On finds a city that far away, and you fly there while you work.',
  },
  {
    art: 'stay',
    title: 'Stay on board.',
    text: 'Keep the app open until you land. End early and the flight diverts: no miles, no sticker.',
  },
  {
    art: 'collect',
    title: 'Land, and collect.',
    text: 'Each landing stamps your passport and puts a travel label on your carrier. Every country has its own.',
  },
  {
    art: 'miles',
    title: 'Miles go further.',
    text: 'Spend miles on new carriers in Duty Free. Fill a carrier with stickers to keep it, with a fresh one and bonus miles.',
  },
];

/** The first-run guide: four short pages over the home screen, once. Skip any time. */
export function Guide() {
  const finish = useSettings((s) => s.finishGuide);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;
  const p = PAGES[page];

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Welcome to Carry On">
      <div className={styles.sheet}>
        <button className={styles.skip} onClick={finish}>
          Skip
        </button>
        <div className={styles.art} key={p.art} aria-hidden="true">
          {ART[p.art]}
        </div>
        <p className="label">
          Welcome aboard · {page + 1} of {PAGES.length}
        </p>
        <h2 className={styles.title}>{p.title}</h2>
        <p className={styles.text}>{p.text}</p>
        <div className={styles.foot}>
          <div className={styles.dots} aria-hidden="true">
            {PAGES.map((_, i) => (
              <span key={i} data-on={i === page} />
            ))}
          </div>
          <button className={styles.next} onClick={() => (last ? finish() : setPage(page + 1))}>
            {last ? 'Let’s fly' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

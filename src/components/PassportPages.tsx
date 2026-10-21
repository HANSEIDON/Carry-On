import { useId, useMemo, type CSSProperties, type ReactNode } from 'react';
import type { Country } from '../data/countries';
import { HOUSE_STAMP } from '../data/countries';
import { formatDuration } from '../domain/geo';
import { mrzLines, type FlightLog, type PassportHolder, type PlacedStamp } from '../domain/passport';
import type { Tier } from '../domain/types';
import { PLANE_PATH } from './Icon';
import { PassportStamp } from './PassportStamp';
import styles from './PassportPages.module.css';

/**
 * The passport's pages. Open, a passport is held with its spine across the middle: each page is
 * landscape (125 × 88 mm), the data page at the bottom of the first spread. Pages are sized in
 * container units of their width (cqw), so they read the same at any size. The closed cover is
 * portrait; PassportScreen turns it into place and turns the pages.
 */

const theme = (country: Country) => ({ '--cover': country.cover }) as CSSProperties;

const date = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d).toUpperCase();

/** "대한민국 · South Korea", or just the name when it's the same in both. */
const issuer = (c: Country) => (c.native === c.name ? c.name : `${c.native} · ${c.name}`);

/** Fine security line work: a rosette of hypotrochoids, generated (no image). */
function Rosette({ cx, cy, scale, turns = 7 }: { cx: number; cy: number; scale: number; turns?: number }) {
  const d = useMemo(() => {
    const paths: string[] = [];
    for (const [R, r, k] of [
      [1, 0.27, 0.62],
      [0.92, 0.19, 0.74],
      [0.8, 0.31, 0.5],
    ]) {
      let p = '';
      const steps = 900;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2 * turns;
        const x = (R - r) * Math.cos(t) + k * r * Math.cos(((R - r) / r) * t);
        const y = (R - r) * Math.sin(t) - k * r * Math.sin(((R - r) / r) * t);
        p += `${i ? 'L' : 'M'}${(cx + x * scale).toFixed(1)} ${(cy + y * scale).toFixed(1)}`;
      }
      paths.push(p);
    }
    return paths;
  }, [cx, cy, scale, turns]);
  return (
    <g className={styles.lines}>
      {d.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </g>
  );
}

/** Wavy guilloche lines across a landscape page (100 × 70). */
function Waves({ count = 16, amp = 2.4 }: { count?: number; amp?: number }) {
  const d = useMemo(() => {
    const out: string[] = [];
    for (let j = 0; j < count; j++) {
      const y0 = (j + 0.5) * (70 / count);
      let p = '';
      for (let x = 0; x <= 100; x += 1) {
        const y = y0 + Math.sin(x / 7 + j * 0.55) * amp + Math.sin(x / 2.9 + j) * amp * 0.25;
        p += `${x ? 'L' : 'M'}${x} ${y.toFixed(2)}`;
      }
      out.push(p);
    }
    return out;
  }, [count, amp]);
  return (
    <g className={styles.lines}>
      {d.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </g>
  );
}

/** Background line work, scaled to a landscape page (100 × 70). */
function Security({ children }: { children: ReactNode }) {
  return (
    <svg className={styles.security} viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden="true">
      {children}
    </svg>
  );
}

/**
 * The cover crest, a made-up seal (no national arms): a ring of microtext, a laurel wreath, and a
 * globe crossed by a plane, all in gold foil.
 */
function Crest() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  /** Two laurel branches climbing the sides from the bottom, leaves smaller toward the tips. */
  const laurel = useMemo(() => {
    const R = 63;
    const at = (deg: number) => {
      const t = (deg * Math.PI) / 180;
      return { x: 100 + Math.cos(t) * R, y: 100 - Math.sin(t) * R };
    };
    const leaves: { x: number; y: number; rot: number; s: number }[] = [];
    const stems: string[] = [];
    for (const side of [-1, 1]) {
      // Left branch from 262° (bottom) up to 150°; the right one mirrored.
      const angles = Array.from({ length: 10 }, (_, i) => 262 - i * 12.5);
      const deg = (a: number) => (side === -1 ? a : 180 - a);
      stems.push(angles.map((a, i) => `${i ? 'L' : 'M'}${at(deg(a)).x.toFixed(1)} ${at(deg(a)).y.toFixed(1)}`).join(''));
      angles.forEach((a, i) => {
        const d = deg(a);
        const { x, y } = at(d);
        // Along the branch, tilted outward, alternating a little inside and outside the stem.
        const out = i % 2 === 0 ? 1 : -1;
        const nx = Math.cos((d * Math.PI) / 180) * 4 * out;
        const ny = -Math.sin((d * Math.PI) / 180) * 4 * out;
        leaves.push({ x: x + nx, y: y + ny, rot: -d + side * 28 * out, s: 1 - i * 0.045 });
      });
    }
    return { leaves, stems };
  }, []);
  // Even foil, the same gold as the lettering (CSS color).
  const gold = 'currentColor';
  return (
    <svg className={styles.crest} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <path id={`${id}-ring`} d="M 100 100 m -86 0 a 86 86 0 1 1 172 0 a 86 86 0 1 1 -172 0" />
      </defs>
      <g fill="none" stroke={gold}>
        <circle cx={100} cy={100} r={95} strokeWidth={2.4} />
        <circle cx={100} cy={100} r={78} strokeWidth={1} />
      </g>
      <text fill={gold} fontSize={9.2} letterSpacing={3.2} className={styles.crestText}>
        <textPath href={`#${id}-ring`} startOffset="0">
          CARRY ON · FOCUS · FLY · CARRY ON · FOCUS · FLY ·
        </textPath>
      </text>
      {/* Laurel: two branches climbing the sides, leaves along each. */}
      <g fill="none" stroke={gold} strokeWidth={1.3}>
        {laurel.stems.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g fill={gold}>
        {laurel.leaves.map((l, i) => (
          <ellipse key={i} cx={l.x} cy={l.y} rx={2.6 * l.s} ry={6.6 * l.s} transform={`rotate(${l.rot.toFixed(1)} ${l.x.toFixed(1)} ${l.y.toFixed(1)})`} />
        ))}
      </g>
      {/* The globe, crossed by a plane. */}
      <g fill="none" stroke={gold} strokeWidth={1.8}>
        <circle cx={100} cy={98} r={34} />
        <ellipse cx={100} cy={98} rx={14} ry={34} />
        <ellipse cx={100} cy={98} rx={26} ry={34} />
        <path d="M 68 86 h 64 M 66 98 h 68 M 68 110 h 64" />
      </g>
      <path d={PLANE_PATH} fill={gold} transform="translate(116 58) rotate(-35) scale(1.25)" />
      <path d="M 100 34 l 2.6 5.4 5.9 .8 -4.3 4.1 1 5.9 -5.2 -2.8 -5.2 2.8 1 -5.9 -4.3 -4.1 5.9 -.8 z" fill={gold} />
    </svg>
  );
}

function ChipMark() {
  return (
    <svg className={styles.chip} viewBox="0 0 40 26" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth={1.6}>
        <rect x={1.5} y={1.5} width={37} height={23} rx={3} />
        <circle cx={20} cy={13} r={5.5} />
        <path d="M1.5 13h13M25.5 13h13" />
      </g>
    </svg>
  );
}

/** Tone-on-tone pattern pressed into the whole cover (blind embossing), in a portrait 88 × 125 frame. */
function Deboss() {
  const d = useMemo(() => {
    const lines: string[] = [];
    for (let j = 0; j < 46; j++) {
      const y0 = (j + 0.5) * (125 / 46);
      let p = '';
      for (let x = 0; x <= 88; x += 1) {
        const y = y0 + Math.sin(x / 6 + j * 0.42) * 1.4 + Math.sin(x / 2.3 + j) * 0.35;
        p += `${x ? 'L' : 'M'}${x} ${y.toFixed(2)}`;
      }
      lines.push(p);
    }
    return lines;
  }, []);
  return (
    <svg className={styles.deboss} viewBox="0 0 88 125" preserveAspectRatio="none" aria-hidden="true">
      {/* A pressed line: shadow, with a faint highlight just above it. */}
      <g fill="none" strokeWidth={0.16}>
        {d.map((p, i) => (
          <g key={i}>
            <path d={p} stroke="rgba(255,255,255,0.05)" transform="translate(0 -0.18)" />
            <path d={p} stroke="rgba(0,0,0,0.22)" />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** The front cover (portrait, 88 × 125): country, crest, the word for passport, the chip mark. */
export function Cover({ country }: { country: Country }) {
  return (
    <div className={`${styles.page} ${styles.cover}`} style={theme(country)}>
      <Deboss />
      <div className={styles.coverTop}>
        <span className={styles.coverNative}>{country.native}</span>
        <span className={styles.coverName}>{country.official ?? country.name}</span>
      </div>
      <Crest />
      <div className={styles.coverBottom}>
        {country.passportWord && <span className={styles.coverWord}>{country.passportWord}</span>}
        <span className={styles.coverTitle}>Passport</span>
        <ChipMark />
      </div>
    </div>
  );
}

/** Inside of a cover: the endpaper in the cover's color. The front one carries a note. */
export function CoverInside({ country, note = true }: { country: Country; note?: boolean }) {
  return (
    <div className={`${styles.page} ${styles.inside}`} style={theme(country)}>
      <Security>
        <Rosette cx={50} cy={35} scale={30} turns={9} />
      </Security>
      {note && (
        <p className={styles.insideNote}>
          The bearer of this passport is a traveler of the Carry On network, and every flight inside it was flown with
          focus.
        </p>
      )}
    </div>
  );
}

/** A data page field; the grid has six columns. */
function Field({ label, children, span = 6, big }: { label: string; children: ReactNode; span?: number; big?: boolean }) {
  return (
    <div className={big ? `${styles.field} ${styles.big}` : styles.field} style={{ gridColumn: `span ${span}` }}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Silhouette() {
  return (
    <svg className={styles.silhouette} viewBox="0 0 70 90" aria-hidden="true">
      <circle cx={35} cy={33} r={14} />
      <path d="M8 90c2-20 13-30 27-30s25 10 27 30z" />
    </svg>
  );
}

export function DataPage({
  holder,
  country,
  photo,
  tier,
  onEdit,
}: {
  holder: PassportHolder;
  country: Country;
  photo?: string;
  tier: Tier;
  onEdit: () => void;
}) {
  const [line1, line2] = mrzLines(holder);
  const fullName = [holder.givenNames, holder.surname].filter(Boolean).join(' ');
  return (
    <div
      className={`${styles.page} ${styles.data}`}
      style={theme(country)}
      onPointerMove={(e) => {
        // The laminate's hologram catches the light as the finger moves.
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--hx', ((e.clientX - r.left) / r.width).toFixed(3));
        e.currentTarget.style.setProperty('--hy', ((e.clientY - r.top) / r.height).toFixed(3));
      }}
    >
      <Security>
        <Rosette cx={66} cy={30} scale={21} />
        <Waves count={10} amp={1.6} />
      </Security>

      <header className={styles.dataHead}>
        <span className={styles.kicker}>Passport · Passeport · Pasaporte</span>
        <span className={styles.issuer}>{issuer(country)}</span>
      </header>
      <button className={styles.edit} data-no-turn onClick={onEdit}>
        Edit
      </button>

      <div className={styles.dataBody}>
        <button className={styles.photo} data-no-turn onClick={onEdit} aria-label={photo ? 'Change photo' : 'Add a photo'}>
          {photo ? <img src={photo} alt="" /> : <Silhouette />}
          {!photo && <span className={styles.photoHint}>Add photo</span>}
        </button>
        <dl className={styles.fields}>
          <Field label="Type" span={1}>
            P
          </Field>
          <Field label="Code" span={2}>
            {country.iso3.replace(/</g, '')}
          </Field>
          <Field label="Passport No." span={3}>
            {holder.passportNo}
          </Field>
          <Field label="Surname" big>
            {holder.surname || '—'}
          </Field>
          <Field label="Given names" big>
            {holder.givenNames}
          </Field>
          <Field label="Nationality" span={2}>
            {country.name}
          </Field>
          <Field label="Date of issue" span={2}>
            {date(holder.issued)}
          </Field>
          <Field label="Date of expiry" span={2}>
            {date(holder.expires)}
          </Field>
          <Field label="Authority">Carry On Airways · {tier}</Field>
        </dl>
        <div className={styles.side}>
          <div className={styles.ghost} aria-hidden="true">
            {photo ? <img src={photo} alt="" /> : <Silhouette />}
          </div>
        </div>
      </div>

      <div className={styles.sign}>
        <span className={styles.signLabel}>Holder’s signature</span>
        <span className={styles.signature}>{fullName}</span>
      </div>

      {/* An optically variable band, like a passport's kinegram: iridescent microtext. */}
      <div className={styles.ovd} aria-hidden="true">
        <span>{'CARRY ON · FOCUS · FLY · '.repeat(8)}</span>
      </div>

      <div className={styles.mrz} aria-label="Machine-readable zone">
        <span>{line1}</span>
        <span>{line2}</span>
      </div>

      <div className={styles.laminate} aria-hidden="true" />
    </div>
  );
}

function Entry({ label, value }: { label: string; value: string }) {
  return (
    <li className={styles.entry}>
      <span>{label}</span>
      <span className={styles.leader} />
      <span>{value}</span>
    </li>
  );
}

const PURPOSE_LABEL: Record<string, string> = {
  study: 'STUDY',
  work: 'WORK',
  reading: 'READING',
  creative: 'CREATIVE',
  other: 'OTHER',
};

export function LogPage({
  log,
  miles,
  tier,
  memberSince,
  homeCode,
  country,
}: {
  log: FlightLog;
  miles: number;
  tier: Tier;
  memberSince: Date;
  homeCode: string;
  country: Country;
}) {
  const hours = (m: number) => formatDuration(m).toUpperCase();
  const purposes = Object.entries(log.minutesByPurpose)
    .sort((a, b) => b[1] - a[1])
    .map(([p, m]) => `${PURPOSE_LABEL[p]} ${hours(m)}`)
    .join(' · ');
  const seal = {
    id: `seal|${memberSince.getTime()}`,
    kind: 'landed' as const,
    style: { ...HOUSE_STAMP, authority: 'CARRY ON AIRWAYS · MEMBERSHIP', entry: `${tier.toUpperCase()} MEMBER` },
    countryCode: null,
    airportCode: homeCode,
    airport: '',
    city: '',
    date: date(memberSince),
    flightNumber: '',
  };
  return (
    <div className={`${styles.page} ${styles.log}`} style={theme(country)}>
      <Security>
        <Waves />
      </Security>
      <header className={styles.pageHead}>
        <span>Amendments and endorsements</span>
        <span>Observations</span>
      </header>

      <p className={styles.typed}>The holder of this passport has flown:</p>
      <ul className={styles.entries}>
        <Entry label="FLIGHTS" value={String(log.flights)} />
        <Entry label="FOCUS" value={hours(log.minutes)} />
        <Entry label="COUNTRIES" value={String(log.countries)} />
        <Entry label="CITIES" value={String(log.cities)} />
        <Entry label="MILES" value={miles.toLocaleString('en-US')} />
        {log.mostVisited && (
          <Entry label="MOST VISITED" value={`${log.mostVisited.city.toUpperCase()} ×${log.mostVisited.times}`} />
        )}
        {log.longest && <Entry label="LONGEST" value={`${log.longest.from} → ${log.longest.to}`.toUpperCase()} />}
        {log.diverted > 0 && <Entry label="DIVERTED" value={String(log.diverted)} />}
      </ul>
      {purposes && <p className={styles.typed}>Purpose of travel: {purposes}</p>}
      {log.flights === 0 && <p className={styles.typed}>No flights yet. The first one is waiting at the gate.</p>}

      <div className={styles.seal}>
        <PassportStamp stamp={seal} />
      </div>
      <footer className={styles.pageFoot}>1</footer>
    </div>
  );
}

/** Stamp widths on a landscape page, in % of its width. */
const STAMP_WIDTH: Record<string, number> = { circle: 22, oval: 27, rect: 28, schengen: 28, hexagon: 23, arch: 20 };

export function VisaPage({ stamps, number, country }: { stamps: PlacedStamp[]; number: number; country: Country }) {
  return (
    <div className={`${styles.page} ${styles.visa}`} style={theme(country)}>
      <Security>
        <Waves />
      </Security>
      <header className={styles.pageHead}>
        <span>Visas</span>
        <span>Visas · Visados</span>
      </header>
      {stamps.map(({ stamp, x, y, rotate }) => (
        <div
          key={stamp.id}
          className={styles.placed}
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${STAMP_WIDTH[stamp.style.shape] * (stamp.kind === 'exit' ? 0.88 : 1)}cqw`,
            transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
          }}
        >
          <PassportStamp stamp={stamp} />
        </div>
      ))}
      {stamps.length === 0 && <p className={styles.empty}>Your next border crossing gets stamped here.</p>}
      <footer className={styles.pageFoot}>{number}</footer>
    </div>
  );
}

import { useId, type ReactNode } from 'react';
import type { StampStyle } from '../data/countries';
import type { PassportStampData } from '../domain/passport';
import { hashString } from '../domain/random';
import { PLANE_PATH } from './Icon';
import styles from './PassportStamp.module.css';

/**
 * A rubber stamp inked on a passport page, drawn in SVG in the country's style (src/data/countries.ts).
 * The ink isn't perfect: edges are roughened and the coverage patchy (an SVG filter seeded by the
 * stamp, so each one is a little different and stays the same).
 */
export function PassportStamp({ stamp }: { stamp: PassportStampData }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const seed = hashString(stamp.id) % 997;
  const { shape } = stamp.style;
  const Shape = SHAPES[shape];
  const box = VIEWBOX[shape];
  return (
    <svg
      className={styles.stamp}
      data-shape={shape}
      data-kind={stamp.kind}
      viewBox={`0 0 ${box[0]} ${box[1]}`}
      style={{ color: stamp.style.ink }}
      role="img"
      aria-label={`${stamp.style.authority} ${stamp.kind === 'exit' ? stamp.style.exit : stamp.style.entry} ${stamp.airportCode} ${stamp.date}`}
    >
      <defs>
        <filter id={`${id}-ink`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.6" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed={seed + 11} result="blot" />
          <feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 2.05" result="cover" />
          <feComposite in="rough" in2="cover" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${id}-ink)`} fill="none" stroke="currentColor">
        <Shape s={stamp} id={id} />
      </g>
    </svg>
  );
}

const VIEWBOX: Record<StampStyle['shape'], [number, number]> = {
  circle: [120, 120],
  oval: [150, 100],
  rect: [150, 92],
  schengen: [150, 96],
  hexagon: [128, 112],
  arch: [112, 124],
};

type ShapeProps = { s: PassportStampData; id: string };

const label = (s: PassportStampData) => (s.kind === 'exit' ? s.style.exit : s.style.entry);

/** Text in the stamp's condensed face, shrunk to fit `max` units wide. */
function Line({
  x,
  y,
  size,
  max,
  children,
  mono,
  weight = 500,
  anchor = 'middle',
}: {
  x: number;
  y: number;
  size: number;
  max: number;
  children: string;
  mono?: boolean;
  weight?: number;
  anchor?: 'start' | 'middle' | 'end';
}) {
  const per = mono ? 0.6 : 0.46;
  const fit = Math.min(size, max / Math.max(1, children.length * per));
  return (
    <text
      x={x}
      y={y}
      fontSize={fit}
      fontWeight={weight}
      textAnchor={anchor}
      fill="currentColor"
      stroke="none"
      className={mono ? styles.mono : styles.condensed}
    >
      {children}
    </text>
  );
}

/** Text along an arc (`d`), centered. */
function Arc({ d, id, size, children, spacing = 0.9 }: { d: string; id: string; size: number; children: string; spacing?: number }) {
  return (
    <>
      <path id={id} d={d} stroke="none" />
      <text fontSize={size} letterSpacing={spacing} fill="currentColor" stroke="none" className={styles.condensed}>
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
          {children}
        </textPath>
      </text>
    </>
  );
}

/** The plane, flying in for an entry and out (tilted up) for an exit. */
function Plane({ x, y, size, kind }: { x: number; y: number; size: number; kind: PassportStampData['kind'] }) {
  const tilt = kind === 'exit' ? -28 : kind === 'entry' ? 22 : 0;
  return (
    <path
      d={PLANE_PATH}
      fill="currentColor"
      stroke="none"
      transform={`translate(${x - size / 2} ${y - size / 2}) scale(${size / 24}) rotate(${tilt} 12 12)`}
    />
  );
}

function Circle({ s, id }: ShapeProps) {
  const top = (r: number) => `M ${60 - r} 60 A ${r} ${r} 0 0 1 ${60 + r} 60`;
  const bottom = (r: number) => `M ${60 - r} 60 A ${r} ${r} 0 0 0 ${60 + r} 60`;
  return (
    <>
      <circle cx={60} cy={60} r={56} strokeWidth={2.6} />
      <circle cx={60} cy={60} r={45.5} strokeWidth={1} />
      <Arc d={top(48)} id={`${id}-t`} size={Math.min(8, 150 / Math.max(10, s.style.authority.length) / 0.5)}>
        {s.style.authority}
      </Arc>
      <Arc d={bottom(53.6)} id={`${id}-b`} size={7.4}>
        {label(s)}
      </Arc>
      <circle cx={8.5} cy={60} r={1.4} fill="currentColor" stroke="none" />
      <circle cx={111.5} cy={60} r={1.4} fill="currentColor" stroke="none" />
      <Plane x={60} y={34} size={13} kind={s.kind} />
      <Line x={60} y={66} size={23} max={70} weight={600}>
        {s.airportCode}
      </Line>
      <line x1={30} y1={72} x2={90} y2={72} strokeWidth={0.8} />
      <Line x={60} y={82} size={8.6} max={66} mono>
        {s.date}
      </Line>
    </>
  );
}

function Oval({ s, id }: ShapeProps) {
  return (
    <>
      <ellipse cx={75} cy={50} rx={72} ry={46} strokeWidth={2.6} />
      <ellipse cx={75} cy={50} rx={60} ry={35} strokeWidth={1} />
      <Arc d="M 10 50 A 65 40 0 0 1 140 50" id={`${id}-t`} size={7.8} spacing={0.8}>
        {s.style.authority}
      </Arc>
      <Arc d="M 6 50 A 69 43.5 0 0 0 144 50" id={`${id}-b`} size={7.2}>
        {`${s.airport.toUpperCase()} · ${s.airportCode}`}
      </Arc>
      <Line x={75} y={41} size={11} max={96} weight={600}>
        {label(s)}
      </Line>
      <Line x={75} y={58} size={13} max={96} mono>
        {s.date}
      </Line>
      <Plane x={75} y={70} size={10} kind={s.kind} />
    </>
  );
}

function Rect({ s }: ShapeProps) {
  const entry = s.kind !== 'exit';
  return (
    <>
      <rect x={1.5} y={1.5} width={147} height={89} rx={3} strokeWidth={2.6} />
      <rect x={6} y={6} width={138} height={80} rx={1.5} strokeWidth={0.8} />
      <Line x={75} y={17} size={7.2} max={128}>
        {s.style.authority}
      </Line>
      <line x1={12} y1={22} x2={138} y2={22} strokeWidth={0.8} />
      <Line x={75} y={38} size={14} max={126} weight={600}>
        {label(s)}
      </Line>
      <Line x={75} y={55} size={14} max={126} mono>
        {s.date}
      </Line>
      <Line x={75} y={66} size={6.6} max={126}>
        {entry ? 'DURATION OF STAY · 90 DAYS' : `FLIGHT ${s.flightNumber}`}
      </Line>
      <line x1={12} y1={71} x2={138} y2={71} strokeWidth={0.8} />
      <Line x={14} y={81} size={8} max={92} anchor="start">
        {`${s.airport.toUpperCase()} (${s.airportCode})`}
      </Line>
      <Plane x={130} y={78.5} size={10} kind={s.kind} />
    </>
  );
}

function Schengen({ s }: ShapeProps) {
  const stars: ReactNode[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    stars.push(<Star key={i} x={31 + Math.sin(a) * 19} y={48 - Math.cos(a) * 19} r={2.6} />);
  }
  const entry = s.kind !== 'exit';
  return (
    <>
      <rect x={1.5} y={1.5} width={147} height={93} rx={13} strokeWidth={2.6} />
      <rect x={6} y={6} width={138} height={84} rx={9} strokeWidth={0.8} />
      {stars}
      <Line x={31} y={53} size={13} max={22} weight={600}>
        {s.style.mark ?? ''}
      </Line>
      <line x1={58} y1={14} x2={58} y2={82} strokeWidth={0.8} />
      <Plane x={80} y={28} size={15} kind={s.kind} />
      {/* Entry: an arrow into a bar. Exit: out of it. */}
      <g strokeWidth={2} strokeLinecap="round">
        {entry ? (
          <>
            <line x1={100} y1={28} x2={119} y2={28} />
            <path d="M 113 22.5 L 119 28 L 113 33.5" />
            <line x1={124} y1={20} x2={124} y2={36} />
          </>
        ) : (
          <>
            <line x1={100} y1={20} x2={100} y2={36} />
            <line x1={105} y1={28} x2={124} y2={28} />
            <path d="M 118 22.5 L 124 28 L 118 33.5" />
          </>
        )}
      </g>
      <Line x={100} y={57} size={15} max={80} mono>
        {s.date}
      </Line>
      <Line x={100} y={72} size={8} max={80}>
        {s.airport.toUpperCase()}
      </Line>
      <Line x={100} y={83} size={6.4} max={80} mono>
        {`${s.airportCode} ${String(hashString(s.id) % 9000 + 1000)}`}
      </Line>
    </>
  );
}

function Star({ x, y, r }: { x: number; y: number; r: number }) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.42;
    return `${(x + Math.cos(a) * rr).toFixed(2)},${(y + Math.sin(a) * rr).toFixed(2)}`;
  }).join(' ');
  return <polygon points={points} fill="currentColor" stroke="none" />;
}

function Hexagon({ s }: ShapeProps) {
  const hex = (w: number, h: number) => {
    const cx = 64;
    const cy = 56;
    return [
      [cx - w / 2, cy],
      [cx - w / 4, cy - h / 2],
      [cx + w / 4, cy - h / 2],
      [cx + w / 2, cy],
      [cx + w / 4, cy + h / 2],
      [cx - w / 4, cy + h / 2],
    ]
      .map((p) => p.join(','))
      .join(' ');
  };
  return (
    <>
      <polygon points={hex(124, 108)} strokeWidth={2.6} strokeLinejoin="round" />
      <polygon points={hex(110, 95)} strokeWidth={0.9} strokeLinejoin="round" />
      <Line x={64} y={28} size={7} max={62}>
        {s.style.authority}
      </Line>
      <Line x={64} y={45} size={10} max={84} weight={600}>
        {label(s)}
      </Line>
      <Line x={64} y={64} size={17} max={60} weight={600}>
        {s.airportCode}
      </Line>
      <Line x={64} y={79} size={9} max={74} mono>
        {s.date}
      </Line>
      <Plane x={64} y={91} size={9} kind={s.kind} />
    </>
  );
}

function Arch({ s, id }: ShapeProps) {
  const outer = 'M 3 121 L 3 56 A 53 53 0 0 1 109 56 L 109 121 Z';
  const inner = 'M 9 115 L 9 56 A 47 47 0 0 1 103 56 L 103 115 Z';
  return (
    <>
      <path d={outer} strokeWidth={2.6} strokeLinejoin="round" />
      <path d={inner} strokeWidth={0.9} strokeLinejoin="round" />
      <Arc d="M 15 57 A 41 41 0 0 1 97 57" id={`${id}-t`} size={7} spacing={0.7}>
        {s.style.authority}
      </Arc>
      <Plane x={56} y={40} size={13} kind={s.kind} />
      <Line x={56} y={64} size={11} max={84} weight={600}>
        {label(s)}
      </Line>
      <line x1={18} y1={70} x2={94} y2={70} strokeWidth={0.8} />
      <Line x={56} y={86} size={20} max={80} weight={600}>
        {s.airportCode}
      </Line>
      <Line x={56} y={103} size={9} max={84} mono>
        {s.date}
      </Line>
    </>
  );
}

const SHAPES: Record<StampStyle['shape'], (p: ShapeProps) => ReactNode> = {
  circle: Circle,
  oval: Oval,
  rect: Rect,
  schengen: Schengen,
  hexagon: Hexagon,
  arch: Arch,
};

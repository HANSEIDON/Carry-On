import type { CSSProperties } from 'react';
import { hashString, seededRandom } from '../domain/random';
import type { StickerKind } from '../domain/landing';
import styles from './CarrierView.module.css';

export interface CarrierSticker {
  id: string;
  kind: StickerKind;
  code: string;
  airlineColor: string;
  appliedAt: number;
}

interface Props {
  color: string;
  stickers: CarrierSticker[];
}

/**
 * Temporary 2D carrier (the 3D model comes in phase 2) with every collected sticker stuck on it.
 * Each sticker keeps the same spot and tilt forever (seeded by its id); newer ones land on top,
 * older ones yellow a little.
 */
export function CarrierView({ color, stickers }: Props) {
  const ordered = [...stickers].sort((a, b) => a.appliedAt - b.appliedAt);
  const newest = ordered.at(-1)?.appliedAt ?? 0;

  return (
    <div className={styles.carrier}>
      <svg viewBox="0 0 200 270" className={styles.case} aria-hidden="true">
        <defs>
          <linearGradient id="shellLight" x1="0" x2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
            <stop offset="0.35" stopColor="#fff" stopOpacity="0.02" />
            <stop offset="1" stopColor="#000" stopOpacity="0.18" />
          </linearGradient>
          <clipPath id="shellClip">
            <rect x="18" y="44" width="164" height="204" rx="22" />
          </clipPath>
        </defs>
        {/* Telescopic handle */}
        <rect x="74" y="4" width="52" height="12" rx="6" fill="#2a2724" />
        <rect x="80" y="14" width="5" height="34" fill="#4a4540" />
        <rect x="115" y="14" width="5" height="34" fill="#4a4540" />
        {/* Shell */}
        <rect x="18" y="44" width="164" height="204" rx="22" fill={color} />
        <rect x="18" y="44" width="164" height="204" rx="22" fill="url(#shellLight)" />
        <g clipPath="url(#shellClip)">
          {[56, 86, 114, 144].map((x) => (
            <g key={x}>
              <line x1={x} y1="62" x2={x} y2="230" stroke="#000" strokeOpacity="0.22" strokeWidth="2.5" />
              <line x1={x + 2} y1="62" x2={x + 2} y2="230" stroke="#fff" strokeOpacity="0.08" strokeWidth="1.5" />
            </g>
          ))}
          {/* Corner guards */}
          {[
            [18, 44],
            [158, 44],
            [18, 224],
            [158, 224],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x - 4} y={y - 4} width="30" height="30" rx="10" fill="#000" fillOpacity="0.28" />
          ))}
        </g>
        {/* Wheels */}
        {[34, 166].map((x) => (
          <g key={x}>
            <rect x={x - 7} y="246" width="14" height="8" rx="2" fill="#2a2724" />
            <circle cx={x} cy="258" r="8" fill="#1d1a17" />
            <circle cx={x} cy="258" r="3" fill="#5a544a" />
          </g>
        ))}
      </svg>

      <div className={styles.stickers}>
        {ordered.map((s) => {
          const rand = seededRandom(hashString(s.id));
          const age = newest - s.appliedAt;
          const style = {
            left: `${4 + rand() * 52}%`,
            top: `${6 + rand() * 74}%`,
            '--tilt': `${(rand() - 0.5) * 28}deg`,
            '--band': s.airlineColor,
            // A week of travel fades a sticker a touch; it never goes past "well worn".
            '--age': Math.min(0.45, age / (7 * 86_400_000) * 0.45),
          } as CSSProperties;
          return s.kind === 'priority' ? (
            <span key={s.id} className={styles.priority} style={style}>
              Priority
            </span>
          ) : (
            <span key={s.id} className={styles.tag} style={style}>
              <span className={styles.code}>{s.code}</span>
              <span className={styles.bars} />
            </span>
          );
        })}
      </div>

      <div className={styles.floor} />
    </div>
  );
}

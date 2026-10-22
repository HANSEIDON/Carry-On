import type { CSSProperties } from 'react';
import { CABIN_LABEL, cabinUnlocked, type CabinClass, type Seat, type SeatMap } from '../domain/seatmap';
import type { Tier } from '../domain/types';
import styles from './SeatMapView.module.css';

interface Props {
  map: SeatMap;
  tier: Tier;
  selectedId?: string;
  onSelect: (seat: Seat) => void;
}

/** Nine-abreast economy shrinks so a wide-body still fits a phone screen. */
function seatSize(cabin: CabinClass, seatsPerRow: number): number {
  if (cabin === 'first') return 50;
  if (cabin === 'business') return 40;
  return seatsPerRow >= 9 ? 25 : 32;
}

const UNLOCK_NOTE: Record<CabinClass, string> = { first: 'Platinum only', business: 'Silver and above', economy: '' };

/**
 * The nose seen from above, printed like the rest of the plan: a long, pointed nose that tapers
 * to full width three quarters of the way down, the radome seam near the tip, and the cockpit windows
 * as six ink panes in a curved row (no tint, no shine). The cabin starts just behind the windows,
 * inside the nose's straight part (see .fuselage), so there's no empty stretch in front of the seats.
 */
function Nose() {
  return (
    <svg className={styles.nose} viewBox="0 0 100 104" aria-hidden="true">
      <path
        className={styles.skin}
        d="M0.4 104 L0.4 78 C0.4 50 7 26 20 12.5 C28.5 4.6 39 0.8 50 0.8 C61 0.8 71.5 4.6 80 12.5 C93 26 99.6 50 99.6 78 L99.6 104"
      />
      <path className={styles.seam} d="M31.5 9.4 Q50 15.4 68.5 9.4" />
      <path
        className={styles.windows}
        d="M17.8 60 L22.2 55.8 L24.4 62.6 L19.4 66.4 Z
           M24.6 53.4 Q30.4 48.6 36.4 46 L38 53.6 Q32 55.6 27 59.4 Z
           M37.8 45.4 Q43.6 43.6 49.2 43.3 L49.2 51.8 Q44 52 39.4 53 Z
           M62.2 45.4 Q56.4 43.6 50.8 43.3 L50.8 51.8 Q56 52 60.6 53 Z
           M75.4 53.4 Q69.6 48.6 63.6 46 L62 53.6 Q68 55.6 73 59.4 Z
           M82.2 60 L77.8 55.8 L75.6 62.6 L80.6 66.4 Z"
      />
    </svg>
  );
}

export function SeatMapView({ map, tier, selectedId, onSelect }: Props) {
  const seatById = new Map(map.seats.map((s) => [s.id, s]));
  const wingRows = new Set(map.wingRows);
  // Room between the seats and the walls; a nine-abreast wide-body needs its width for the seats.
  const wide = map.cabins.some((c) => c.columns.filter(Boolean).length >= 9);

  return (
    <div className={styles.plane}>
      <Nose />
      <div className={styles.fuselage} style={{ '--side': wide ? '10px' : '18px' } as CSSProperties}>
      {map.cabins.map((cabin) => {
        const unlocked = cabinUnlocked(cabin.cabin, tier);
        const template = cabin.columns.map((c) => (c ? 'var(--seat)' : 'var(--aisle)')).join(' ');
        const size = seatSize(cabin.cabin, cabin.columns.filter(Boolean).length);
        const gridStyle = { '--seat': `${size}px`, gridTemplateColumns: template } as CSSProperties;
        const rows = Array.from({ length: cabin.lastRow - cabin.firstRow + 1 }, (_, i) => cabin.firstRow + i);
        const firstAisle = cabin.columns.indexOf(null);

        return (
          <section key={cabin.cabin} className={styles.cabin}>
            <p className={styles.cabinLabel}>
              {CABIN_LABEL[cabin.cabin]}
              {!unlocked && <span className={styles.lockNote}> · {UNLOCK_NOTE[cabin.cabin]}</span>}
            </p>

            <div className={styles.row} style={gridStyle}>
              {cabin.columns.map((c, i) => (
                <span key={i} className={styles.letter}>
                  {c}
                </span>
              ))}
            </div>

            {rows.map((row) => (
              <div
                key={row}
                className={styles.row}
                style={gridStyle}
                data-wing={wingRows.has(row)}
                data-exit={cabin.exitRows?.includes(row) ?? false}
              >
                {cabin.columns.map((letter, i) => {
                  if (!letter) {
                    return (
                      <span key={i} className={styles.aisle}>
                        {i === firstAisle ? row : ''}
                      </span>
                    );
                  }
                  const seat = seatById.get(`${row}${letter}`)!;
                  const state = seat.id === selectedId ? 'selected' : seat.occupied ? 'taken' : unlocked ? 'free' : 'locked';
                  return (
                    <button
                      key={i}
                      className={styles.seat}
                      data-state={state}
                      disabled={state === 'taken' || state === 'locked'}
                      aria-label={`${seat.id}, ${seat.window ? 'window' : seat.aisle ? 'aisle' : 'middle'}, ${state}`}
                      onClick={() => onSelect(seat)}
                    />
                  );
                })}
              </div>
            ))}
          </section>
        );
      })}
      </div>
    </div>
  );
}

export function SeatLegend() {
  return (
    <div className={styles.legend}>
      {(['free', 'taken', 'selected', 'locked'] as const).map((s) => (
        <span key={s} className={styles.legendItem}>
          <span className={styles.seat} data-state={s} data-legend />
          {s === 'free' ? 'Available' : s === 'taken' ? 'Taken' : s === 'selected' ? 'Your seat' : 'Locked'}
        </span>
      ))}
    </div>
  );
}

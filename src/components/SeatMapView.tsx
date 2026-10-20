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
  if (cabin === 'first') return 46;
  if (cabin === 'business') return 36;
  return seatsPerRow >= 9 ? 23 : 28;
}

const UNLOCK_NOTE: Record<CabinClass, string> = { first: 'Platinum only', business: 'Silver and above', economy: '' };

export function SeatMapView({ map, tier, selectedId, onSelect }: Props) {
  const seatById = new Map(map.seats.map((s) => [s.id, s]));
  const wingRows = new Set(map.wingRows);

  return (
    <div className={styles.fuselage}>
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

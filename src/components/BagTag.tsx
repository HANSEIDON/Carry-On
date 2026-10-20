import type { CSSProperties } from 'react';
import type { Airline } from '../data/airlines';
import { cityByCode } from '../data/cities';
import type { StickerKind } from '../domain/landing';
import { hashString } from '../domain/random';
import { Barcode } from './Barcode';
import styles from './BagTag.module.css';

interface Props {
  kind: StickerKind;
  code: string;
  fromCode: string;
  flightNumber: string;
  airline: Airline;
  date: Date;
  /** Seeds the tag number and barcode. */
  id: string;
}

/** Flat preview of a sticker. The realistic version is a decal on the 3D carrier (phase 2). */
export function BagTag({ kind, code, fromCode, flightNumber, airline, date, id }: Props) {
  if (kind === 'priority') {
    return (
      <div className={styles.priority}>
        <span className={styles.priorityWord}>Priority</span>
        <span className={styles.mono}>{airline.name}</span>
      </div>
    );
  }

  const city = cityByCode(code);
  const day = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase().replace(' ', '');
  // Real tags carry a 10-digit licence plate: 0 + airline number + 6-digit serial.
  const airlineNumber = 100 + (hashString(airline.code) % 900);
  const serial = String(hashString(id) % 1_000_000).padStart(6, '0');

  return (
    <div className={styles.tag} style={{ '--airline': airline.color } as CSSProperties}>
      <div className={styles.top}>
        <span>{airline.name}</span>
        <span>
          {flightNumber} · {day}
        </span>
      </div>
      <div className={styles.dest}>
        <span className={styles.code}>{code}</span>
        <span className={styles.mono}>
          {city?.city}
          <br />
          {fromCode} → {code}
        </span>
      </div>
      <Barcode value={id} width={196} height={20} color="#111" />
      <span className={styles.number}>
        0{airlineNumber} {airline.code} {serial}
      </span>
    </div>
  );
}

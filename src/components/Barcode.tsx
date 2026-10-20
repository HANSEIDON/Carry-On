import { useMemo } from 'react';
import { hashString, seededRandom } from '../domain/random';

interface Props {
  value: string;
  width: number;
  height: number;
  color?: string;
}

/** Decorative barcode; bars are derived from `value`, so the same pass always looks the same. */
export function Barcode({ value, width, height, color = 'currentColor' }: Props) {
  const bars = useMemo(() => {
    const rand = seededRandom(hashString(value));
    const out: { x: number; w: number }[] = [];
    for (let x = 0; x < width - 3; ) {
      const w = 1 + Math.floor(rand() * 3);
      out.push({ x, w });
      x += w + 1 + Math.floor(rand() * 2);
    }
    return out;
  }, [value, width]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y={0} width={b.w} height={height} fill={color} />
      ))}
    </svg>
  );
}

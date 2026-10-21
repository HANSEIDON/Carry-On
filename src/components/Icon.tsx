const PATHS = {
  plane:
    'M10.2 21h1.6l4.6-7.6H21a1.5 1.5 0 0 0 0-3h-4.6L11.8 3h-1.6l2.2 7.4H7.6L6 8.4H4.6l1 3.6-1 3.6H6l1.6-2h4.8z',
  luggage:
    'M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6M7 6h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM9 10v6M15 10v6M8 20v1.5M16 20v1.5',
  bag: 'M6 7h12l1 13H5zM9 7a3 3 0 0 1 6 0',
  passport:
    'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM12 7.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM9 17h6',
  back: 'M15 5l-7 7 7 7',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  chevron: 'M6 9l6 6 6-6',
} as const;

export type IconName = keyof typeof PATHS;

/** The plane silhouette (24×24, nose to the right), for drawings that need it inline (passport stamps). */
export const PLANE_PATH = PATHS.plane;

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const filled = name === 'plane';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

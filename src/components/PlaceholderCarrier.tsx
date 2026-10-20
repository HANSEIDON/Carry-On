/** Temporary 2D carrier until the 3D models land (phase 2, open-source models first). */
export function PlaceholderCarrier({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 160 210" width="150" role="img" aria-label="Your carrier">
      <rect x="58" y="6" width="44" height="26" rx="6" fill="none" stroke="#4a4f57" strokeWidth="6" />
      <rect x="18" y="28" width="124" height="160" rx="16" fill={color} stroke="#3e434b" strokeWidth="2" />
      {[46, 80, 114].map((x) => (
        <line key={x} x1={x} y1="40" x2={x} y2="176" stroke="#3a3e45" strokeWidth="3" />
      ))}
      <rect x="18" y="104" width="124" height="4" fill="#1e2126" />
      <circle cx="40" cy="196" r="8" fill="#16181c" />
      <circle cx="120" cy="196" r="8" fill="#16181c" />
    </svg>
  );
}

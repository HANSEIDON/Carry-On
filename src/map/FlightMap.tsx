import { geoCircle, geoDistance, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from 'd3-geo';
import { memo, useEffect, useMemo, useState } from 'react';
import { CITIES } from '../data/cities';
import { isNight, subsolarPoint } from '../domain/sun';
import type { City } from '../domain/types';
import styles from './FlightMap.module.css';
import { globeRenderer } from './globeRenderer';
import { loadWorld, type WorldData } from './worldData';

const W = 400;
const H = 440;
const PAD = 36;

/** Scenic loops circle this far (degrees, ~40 km) around the city. */
const SCENIC_RADIUS = 0.35;

type Pt = [number, number];
const pt = (c: { lat: number; lon: number }): Pt => [c.lon, c.lat];

interface Props {
  from: City;
  to: City;
  scenic: boolean;
  /** 0..1 */
  progress: number;
  now: Date;
}

/**
 * In-flight map, styled like a seat-back moving map: globe, route, day/night, plane.
 * NASA satellite imagery when WebGL is available; a vector globe otherwise (and while loading).
 */
export function FlightMap({ from, to, scenic, progress, now }: Props) {
  const [world, setWorld] = useState<WorldData | null>(null);
  useEffect(() => {
    loadWorld().then(setWorld);
  }, []);

  const { projection, path, route, at } = useMemo(() => {
    const a = pt(from);
    const b = pt(to);
    const mid = scenic ? a : geoInterpolate(a, b)(0.5);
    // Show the whole route with some context; short hops still show the region.
    const halfSpan = scenic ? 1.2 : Math.max(3, ((geoDistance(a, b) * 180) / Math.PI / 2) * 1.3);
    const projection = geoOrthographic()
      .rotate([-mid[0], -mid[1]])
      .clipAngle(90)
      .fitExtent(
        [
          [PAD, PAD],
          [W - PAD, H - PAD],
        ],
        geoCircle().center(mid).radius(halfSpan)(),
      );

    const loop = geoCircle().center(a).radius(SCENIC_RADIUS).precision(2)();
    const loopRing = loop.coordinates[0] as Pt[];
    const route = scenic
      ? { type: 'LineString' as const, coordinates: loopRing }
      : { type: 'LineString' as const, coordinates: [a, b] };

    const interp = geoInterpolate(a, b);
    const at = (t: number): Pt => {
      if (!scenic) return interp(Math.min(1, Math.max(0, t))) as Pt;
      const i = Math.min(loopRing.length - 1, Math.floor(t * (loopRing.length - 1)));
      return loopRing[i];
    };

    return { projection, path: geoPath(projection), route, at };
  }, [from, to, scenic]);

  // Night shading only needs to move once a minute.
  const minute = Math.floor(now.getTime() / 60_000);

  const [satellite, setSatellite] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const [lon, lat] = projection.rotate();
    const [tx, ty] = projection.translate();
    const pixelRatio = Math.min(2.5, Math.max(1.5, window.devicePixelRatio));
    globeRenderer
      .render(
        {
          center: [-lon, -lat],
          scale: projection.scale(),
          translate: [tx, ty],
          width: W,
          height: H,
          sun: subsolarPoint(new Date(minute * 60_000)),
        },
        pixelRatio,
      )
      .then((url) => alive && setSatellite(url));
    return () => {
      alive = false;
    };
  }, [projection, minute]);
  const night = useMemo(() => {
    const sun = subsolarPoint(new Date(minute * 60_000));
    const anti: Pt = [sun.lon + 180, -sun.lat];
    return [90, 84, 78].map((r) => path(geoCircle().center(anti).radius(r)()) ?? '');
  }, [minute, path]);

  const flown = useMemo(() => {
    if (scenic) {
      const ring = route.coordinates;
      return { type: 'LineString' as const, coordinates: ring.slice(0, Math.max(2, Math.ceil(progress * ring.length))) };
    }
    return { type: 'LineString' as const, coordinates: [pt(from), at(progress)] };
  }, [scenic, route, from, at, progress]);

  const plane = projection(at(progress));
  const ahead = projection(at(Math.min(1, progress + 0.01)));
  const behind = projection(at(Math.max(0, progress - 0.01)));
  const heading =
    ahead && behind ? (Math.atan2(ahead[1] - behind[1], ahead[0] - behind[0]) * 180) / Math.PI : 0;

  const fromXY = projection(pt(from));
  const toXY = projection(pt(to));

  return (
    <svg className={styles.map} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Flight map from ${from.city} to ${to.city}`}>
      <defs>
        <filter id="glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      {satellite ? (
        <>
          <image href={satellite} x={0} y={0} width={W} height={H} />
          {world && <path d={path(world.borders) ?? ''} className={styles.borderOnImagery} />}
        </>
      ) : (
        <>
          <BaseLayer path={path} world={world} />
          {night.map((d, i) => (
            <path key={i} d={d} className={styles.night} />
          ))}
          <CityLights projection={projection} minute={minute} />
        </>
      )}

      <path d={path(route) ?? ''} className={styles.route} />
      <path d={path(flown) ?? ''} className={styles.flown} />

      {fromXY && <Marker xy={fromXY} label={from.code} />}
      {!scenic && toXY && <Marker xy={toXY} label={to.code} />}

      {plane && (
        <g transform={`translate(${plane[0]} ${plane[1]}) rotate(${heading}) scale(1.25)`}>
          <path
            className={styles.plane}
            transform="translate(-12.8 -12)"
            d="M10.2 21h1.6l4.6-7.6H21a1.5 1.5 0 0 0 0-3h-4.6L11.8 3h-1.6l2.2 7.4H7.6L6 8.4H4.6l1 3.6-1 3.6H6l1.6-2h4.8z"
          />
        </g>
      )}
    </svg>
  );
}

/** Ocean, graticule, land and borders: drawn once per route. */
const BaseLayer = memo(function BaseLayer({ path, world }: { path: ReturnType<typeof geoPath>; world: WorldData | null }) {
  return (
    <g>
      <path d={path({ type: 'Sphere' }) ?? ''} className={styles.ocean} />
      <path d={path(geoGraticule10()) ?? ''} className={styles.graticule} />
      {world && <path d={path(world.countries) ?? ''} className={styles.land} />}
      {world && <path d={path(world.borders) ?? ''} className={styles.border} />}
      <path d={path({ type: 'Sphere' }) ?? ''} className={styles.rim} />
    </g>
  );
});

const CityLights = memo(function CityLights({
  projection,
  minute,
}: {
  projection: ReturnType<typeof geoOrthographic>;
  minute: number;
}) {
  const at = new Date(minute * 60_000);
  const center = projection.invert?.([W / 2, H / 2]);
  return (
    <g>
      {CITIES.map((c) => {
        // Skip cities on the far side of the globe.
        if (center && geoDistance(center as Pt, pt(c)) > Math.PI / 2) return null;
        const xy = projection(pt(c));
        if (!xy) return null;
        const lit = isNight(c, at);
        return lit ? (
          <g key={c.code}>
            <circle cx={xy[0]} cy={xy[1]} r={4} className={styles.lightGlow} filter="url(#glow)" />
            <circle cx={xy[0]} cy={xy[1]} r={1.4} className={styles.light} />
          </g>
        ) : (
          <circle key={c.code} cx={xy[0]} cy={xy[1]} r={1.3} className={styles.city} />
        );
      })}
    </g>
  );
});

function Marker({ xy, label }: { xy: [number, number]; label: string }) {
  return (
    <g transform={`translate(${xy[0]} ${xy[1]})`}>
      <circle r={4} className={styles.marker} />
      <text y={-10} className={styles.label}>
        {label}
      </text>
    </g>
  );
}

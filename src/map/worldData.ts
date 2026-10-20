import type { FeatureCollection, MultiLineString } from 'geojson';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

export interface WorldData {
  countries: FeatureCollection;
  borders: MultiLineString;
}

let cache: Promise<WorldData> | null = null;

/** Natural Earth 1:50m countries, loaded lazily so the first screen stays light. */
export function loadWorld(): Promise<WorldData> {
  cache ??= import('world-atlas/countries-50m.json').then((m) => {
    const topo = m.default as unknown as Topology<{ countries: GeometryCollection }>;
    return {
      countries: feature(topo, topo.objects.countries) as FeatureCollection,
      borders: mesh(topo, topo.objects.countries, (a, b) => a !== b),
    };
  });
  return cache;
}

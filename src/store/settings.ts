import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** In-flight map look: printed paper map (default), seat-back map colors, or a dark night globe. */
export type MapStyle = 'paper' | 'classic' | 'dark';

/** Per-device preferences (kept in localStorage). */
interface Settings {
  volume: number;
  announcements: boolean;
  chimes: boolean;
  mapStyle: MapStyle;
  setVolume: (v: number) => void;
  setAnnouncements: (on: boolean) => void;
  setChimes: (on: boolean) => void;
  setMapStyle: (style: MapStyle) => void;
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      volume: 0.45,
      announcements: true,
      chimes: true,
      mapStyle: 'paper',
      setVolume: (volume) => set({ volume }),
      setAnnouncements: (announcements) => set({ announcements }),
      setChimes: (chimes) => set({ chimes }),
      setMapStyle: (mapStyle) => set({ mapStyle }),
    }),
    {
      name: 'carry-on-settings',
      version: 2,
      // v0 had NASA map styles (removed); v2 makes the paper map the default look.
      migrate: (state) => {
        const s = state as Partial<Settings>;
        return { ...s, mapStyle: s.mapStyle === 'classic' ? 'classic' : 'paper' } as Settings;
      },
    },
  ),
);

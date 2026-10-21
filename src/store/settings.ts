import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** In-flight map look: printed paper map (default), seat-back map colors, or a dark night globe. */
export type MapStyle = 'paper' | 'classic' | 'dark';

/** Per-device preferences (kept in localStorage). */
interface Settings {
  /** Sound level. Announcements follow it at a fixed share (ANNOUNCEMENT_SHARE in cabinAudio). */
  volume: number;
  announcements: boolean;
  chimes: boolean;
  /** Focus mode: the low cabin rumble turned down further, for long sessions. Off by default. */
  focusMode: boolean;
  /** Experimental binaural focus tones under the cabin noise (headphones only). Off by default. */
  focusTones: boolean;
  mapStyle: MapStyle;
  setVolume: (v: number) => void;
  setAnnouncements: (on: boolean) => void;
  setChimes: (on: boolean) => void;
  setFocusMode: (on: boolean) => void;
  setFocusTones: (on: boolean) => void;
  setMapStyle: (style: MapStyle) => void;
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      volume: 0.45,
      announcements: true,
      chimes: true,
      focusMode: false,
      focusTones: false,
      mapStyle: 'paper',
      setVolume: (volume) => set({ volume }),
      setAnnouncements: (announcements) => set({ announcements }),
      setChimes: (chimes) => set({ chimes }),
      setFocusMode: (focusMode) => set({ focusMode }),
      setFocusTones: (focusTones) => set({ focusTones }),
      setMapStyle: (mapStyle) => set({ mapStyle }),
    }),
    {
      name: 'carry-on-settings',
      version: 3,
      // v0 had NASA map styles (removed); v2 makes the paper map the default look;
      // v3 drops the separate voice volume (announcements now follow the sound level).
      migrate: (state, version) => {
        const { voiceVolume: _voiceVolume, ...s } = state as Partial<Settings> & { voiceVolume?: number };
        if (version < 2) s.mapStyle = s.mapStyle === 'classic' ? 'classic' : 'paper';
        return s as Settings;
      },
    },
  ),
);

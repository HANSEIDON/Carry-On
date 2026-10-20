import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Per-device sound preferences (kept in localStorage). */
interface SoundSettings {
  volume: number;
  announcements: boolean;
  chimes: boolean;
  setVolume: (v: number) => void;
  setAnnouncements: (on: boolean) => void;
  setChimes: (on: boolean) => void;
}

export const useSound = create<SoundSettings>()(
  persist(
    (set) => ({
      volume: 0.6,
      announcements: true,
      chimes: true,
      setVolume: (volume) => set({ volume }),
      setAnnouncements: (announcements) => set({ announcements }),
      setChimes: (chimes) => set({ chimes }),
    }),
    { name: 'carry-on-sound' },
  ),
);

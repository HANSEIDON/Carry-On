import { create } from 'zustand';
import type { Profile } from '../db/db';

export type Tab = 'fly' | 'luggage' | 'dutyfree' | 'passport';
export type Screen = Tab | 'booking';

interface AppState {
  screen: Screen;
  profile: Profile | null;
  go: (screen: Screen) => void;
  setProfile: (profile: Profile) => void;
}

export const useApp = create<AppState>((set) => ({
  screen: 'fly',
  profile: null,
  go: (screen) => set({ screen }),
  setProfile: (profile) => set({ profile }),
}));

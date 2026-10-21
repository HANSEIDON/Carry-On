import { create } from 'zustand';
import type { Flight, LandingResult, Profile, TripPurpose } from '../db/db';
import type { FlightPlan } from '../domain/flightPlan';
import type { Seat } from '../domain/seatmap';

export type Tab = 'fly' | 'luggage' | 'dutyfree' | 'passport';
/** Travel-day stages, shown one at a time (Flighty-style). */
export type Screen = Tab | 'booking' | 'checkin' | 'boarding' | 'flight' | 'arrival';

/** The flight being booked, before it takes off. */
export interface Draft {
  plan: FlightPlan;
  purpose: TripPurpose;
  seat?: Seat;
}

interface AppState {
  screen: Screen;
  profile: Profile | null;
  draft: Draft | null;
  flight: Flight | null;
  landing: LandingResult | null;
  /** The carrier Duty Free should open on (set when you come from the luggage room). */
  shopFocus: string | null;
  go: (screen: Screen) => void;
  openShop: (carrierTypeId: string | null) => void;
  setProfile: (profile: Profile) => void;
  setDraft: (draft: Draft | null) => void;
  setFlight: (flight: Flight | null) => void;
  setLanding: (landing: LandingResult | null) => void;
}

export const useApp = create<AppState>((set) => ({
  screen: 'fly',
  profile: null,
  draft: null,
  flight: null,
  landing: null,
  shopFocus: null,
  go: (screen) => set({ screen }),
  openShop: (shopFocus) => set({ screen: 'dutyfree', shopFocus }),
  setProfile: (profile) => set({ profile }),
  setDraft: (draft) => set({ draft }),
  setFlight: (flight) => set({ flight }),
  setLanding: (landing) => set({ landing }),
}));

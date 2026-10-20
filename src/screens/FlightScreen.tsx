import { useEffect, useMemo, useRef, useState } from 'react';
import { announce, silenceAnnouncements } from '../audio/announcer';
import { cabinAudio } from '../audio/cabinAudio';
import { airlineByCode } from '../data/airlines';
import { cityByCode } from '../data/cities';
import { divertFlight, landFlight, type Flight } from '../db/db';
import { TIME_SCALE } from '../dev';
import * as scripts from '../domain/announcements';
import { flightState, phaseBounds, type FlightPhase } from '../domain/flightProfile';
import { aircraftFor, distanceKm } from '../domain/geo';
import { formatClock, progress, remainingMs } from '../domain/landing';
import { hashString, seededRandom } from '../domain/random';
import { ZONE_LABEL } from '../domain/seatmap';
import { localTime } from '../domain/time';
import { FlightMap } from '../map/FlightMap';
import { useApp } from '../store/appStore';
import { useSound } from '../store/settings';
import styles from './FlightScreen.module.css';

const PHASE_LABEL: Record<FlightPhase, string> = { climb: 'Climbing', cruise: 'Cruising', descent: 'Descending' };

/** A flight that started this recently gets the full welcome; resumed flights don't. */
const FRESH_START_MS = 15_000;

/** Scenic loop circumference (km) at the radius drawn on the map. */
const SCENIC_LOOP_KM = 2 * Math.PI * 39;

/** Flights already welcomed, so remounts (and React dev double-mounts) don't repeat it. */
const welcomed = new Set<string>();

/** Leaving the cabin: sound and voice stop where the flight ends, not on unmount. */
function leaveCabin() {
  silenceAnnouncements();
  cabinAudio.stop();
}

export function FlightScreen() {
  const flight = useApp((s) => s.flight)!;
  const go = useApp((s) => s.go);
  const setFlight = useApp((s) => s.setFlight);
  const setLanding = useApp((s) => s.setLanding);
  const setProfile = useApp((s) => s.setProfile);
  const sound = useSound();

  const [now, setNow] = useState(Date.now());
  const [needsTap, setNeedsTap] = useState(!cabinAudio.playing);
  const landing = useRef(false);

  const from = cityByCode(flight.fromCode)!;
  const to = cityByCode(flight.toCode)!;
  const airline = airlineByCode(flight.airlineCode);
  const routeKm = distanceKm(from, to);
  const aircraft = flight.scenic ? 'narrowbody' : aircraftFor(routeKm);
  const zone = flight.zone ?? 'wing';

  const left = remainingMs(flight.startedAt, flight.plannedMinutes, now, TIME_SCALE);
  const done = progress(flight.startedAt, flight.plannedMinutes, now, TIME_SCALE);
  const state = flightState(done, flight.plannedMinutes, aircraft, flight.scenic);
  const totalKm = flight.scenic ? SCENIC_LOOP_KM : routeKm;
  const arrival = new Date(now + left / TIME_SCALE);
  const destination = flight.scenic ? from : to;

  const contextRef = useRef<scripts.AnnouncementContext>(null!);
  contextRef.current = {
    airline: airline.name,
    flightNumber: flight.flightNumber,
    fromCity: from.city,
    toCity: to.city,
    scenic: flight.scenic,
    minutes: flight.plannedMinutes,
    altitudeFt: state.altitudeFt,
  };

  // Clock tick.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Cabin volume follows the setting.
  useEffect(() => cabinAudio.setVolume(sound.volume), [sound.volume]);

  // Welcome aboard, once, for a flight that has just taken off.
  useEffect(() => {
    if (welcomed.has(flight.id)) return;
    welcomed.add(flight.id);
    if (Date.now() - flight.startedAt < FRESH_START_MS && useSound.getState().announcements) {
      announce(scripts.welcome(contextRef.current));
    }
  }, [flight.id, flight.startedAt]);

  // Phase changes: the sound shifts, the seatbelt sign chimes, the crew speaks.
  const lastPhase = useRef<FlightPhase>(state.phase);
  useEffect(() => {
    if (state.phase === lastPhase.current) return;
    lastPhase.current = state.phase;
    cabinAudio.setPhase(state.phase);
    if (sound.chimes) cabinAudio.chime('single');
    if (!sound.announcements) return;
    if (state.phase === 'cruise') announce(scripts.cruise(contextRef.current));
    if (state.phase === 'descent') announce(scripts.descent(contextRef.current));
  }, [state.phase, sound.chimes, sound.announcements]);

  // Now and then during cruise the seatbelt sign blinks, like a real flight.
  const chimeAt = useMemo(() => seatbeltChimes(flight), [flight]);
  const chimed = useRef(new Set<number>());
  useEffect(() => {
    for (const t of chimeAt) {
      if (done < t || chimed.current.has(t)) continue;
      chimed.current.add(t);
      if (sound.chimes) cabinAudio.chime('single');
    }
  }, [done, chimeAt, sound.chimes]);

  // Touchdown.
  useEffect(() => {
    if (left > 0 || landing.current) return;
    landing.current = true;
    leaveCabin();
    landFlight(flight.id).then((result) => {
      setProfile(result.profile);
      setLanding(result);
      setFlight(null);
      go('arrival');
    });
  }, [left, flight.id, go, setFlight, setLanding, setProfile]);

  const turnOnSound = () => {
    cabinAudio.start(zone, flight.cabin, state.phase);
    cabinAudio.setVolume(sound.volume);
    setNeedsTap(false);
  };

  const endEarly = async () => {
    if (!confirm('End this flight now? You will divert and get no sticker or miles.')) return;
    leaveCabin();
    await divertFlight(flight.id);
    setFlight(null);
    go('fly');
  };

  return (
    <section className={styles.screen}>
      <div className={styles.mapWrap}>
        <FlightMap from={from} to={to} scenic={flight.scenic} progress={done} now={new Date(now)} />
        <div className={styles.mapTop}>
          <span className={styles.chip}>{flight.flightNumber}</span>
          <span className={styles.chip}>{PHASE_LABEL[state.phase]}</span>
        </div>
      </div>

      <div className={styles.clock}>
        <p className={styles.time}>{formatClock(left)}</p>
        <p className={styles.sub}>
          to {destination.city} · arrives {localTime(destination.tz, arrival)} local
        </p>
      </div>

      <dl className={styles.stats}>
        <Stat label="Altitude" value={`${state.altitudeFt.toLocaleString('en-US')} ft`} />
        <Stat label="Ground speed" value={`${state.groundSpeedKmh} km/h`} />
        <Stat label="Outside" value={`${state.outsideTempC}°C`} />
        <Stat label="Distance to go" value={`${Math.round(totalKm * (1 - done)).toLocaleString('en-US')} km`} />
        <Stat label="Seat" value={flight.seat} />
        <Stat label="Cabin sound" value={ZONE_LABEL[zone].sound} />
      </dl>

      <div className={styles.sound}>
        {needsTap ? (
          <button className={styles.soundOn} onClick={turnOnSound}>
            Turn on cabin sound
          </button>
        ) : (
          <label className={styles.volume}>
            <span>Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={sound.volume}
              onChange={(e) => sound.setVolume(Number(e.target.value))}
            />
          </label>
        )}
        <div className={styles.toggles}>
          <Toggle
            label="Announcements"
            on={sound.announcements}
            onChange={(on) => {
              sound.setAnnouncements(on);
              if (!on) silenceAnnouncements();
            }}
          />
          <Toggle label="Seatbelt chimes" on={sound.chimes} onChange={sound.setChimes} />
        </div>
      </div>

      <button className={styles.end} onClick={endEarly}>
        End flight early
      </button>
    </section>
  );
}

/** Progress points (0..1) inside the cruise where the seatbelt sign chimes: about one per 35 minutes. */
function seatbeltChimes(flight: Flight): number[] {
  const { climbEnd, descentStart } = phaseBounds(flight.plannedMinutes);
  const cruiseMinutes = (descentStart - climbEnd) * flight.plannedMinutes;
  const count = Math.floor(cruiseMinutes / 35);
  const rand = seededRandom(hashString(flight.id));
  return Array.from({ length: count }, () => climbEnd + 0.05 + rand() * (descentStart - climbEnd - 0.1)).sort();
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button className={styles.toggle} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className={styles.knob} />
      {label}
    </button>
  );
}

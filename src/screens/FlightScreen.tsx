import { useEffect, useMemo, useRef, useState } from 'react';
import { announce, setAnnouncementFlight, silenceAnnouncements } from '../audio/announcer';
import { cabinAudio } from '../audio/cabinAudio';
import { airlineByCode } from '../data/airlines';
import { cityByCode } from '../data/cities';
import { divertFlight, landFlight, type Flight } from '../db/db';
import { TIME_SCALE } from '../dev';
import * as scripts from '../domain/announcements';
import { timbreFor } from '../domain/cabinTimbre';
import { flightState, phaseBounds, type FlightPhase } from '../domain/flightProfile';
import { aircraftFor, distanceKm } from '../domain/geo';
import { formatClock, progress, remainingMs } from '../domain/landing';
import { hashString, seededRandom } from '../domain/random';
import { ZONE_LABEL } from '../domain/seatmap';
import { localHourMinute, localTime } from '../domain/time';
import { StageBar } from '../components/StageBar';
import { FlightMap } from '../map/FlightMap';
import { useApp } from '../store/appStore';
import { useSettings, type MapStyle } from '../store/settings';
import styles from './FlightScreen.module.css';

const PHASE_LABEL: Record<FlightPhase, string> = { climb: 'Climbing', cruise: 'Cruising', descent: 'Descending' };

const MAP_STYLES: { id: MapStyle; label: string; note: string }[] = [
  { id: 'paper', label: 'Paper', note: 'A printed map, like a travel journal' },
  { id: 'classic', label: 'Classic', note: 'Seat-back map colors' },
  { id: 'dark', label: 'Night', note: 'Dark globe with city lights' },
];

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
  const settings = useSettings();

  const [now, setNow] = useState(Date.now());
  const [needsTap, setNeedsTap] = useState(!cabinAudio.playing);
  const [mapMenu, setMapMenu] = useState(false);
  const [soundMenu, setSoundMenu] = useState(false);
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
    remainingMinutes: Math.round(left / 60_000),
    local: localHourMinute(from.tz, new Date(now)),
  };

  // Clock tick.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // The cabin follows the settings.
  useEffect(() => cabinAudio.setVolume(settings.volume), [settings.volume]);
  useEffect(() => cabinAudio.setFocusMode(settings.focusMode), [settings.focusMode]);

  // This flight's crew does the talking (one captain per flight number).
  useEffect(() => setAnnouncementFlight(flight.flightNumber), [flight.flightNumber]);

  // Welcome aboard, then the captain readies the cabin: once, for a flight that has just taken off.
  useEffect(() => {
    if (welcomed.has(flight.id)) return;
    welcomed.add(flight.id);
    if (Date.now() - flight.startedAt < FRESH_START_MS && useSettings.getState().announcements) {
      announce(scripts.welcome(contextRef.current));
      announce(scripts.takeoff());
    }
  }, [flight.id, flight.startedAt]);

  // Phase changes: the sound shifts and the captain speaks (an announcement brings its own chime).
  const lastPhase = useRef<FlightPhase>(state.phase);
  useEffect(() => {
    if (state.phase === lastPhase.current) return;
    lastPhase.current = state.phase;
    cabinAudio.setPhase(state.phase);
    if (settings.announcements && state.phase === 'cruise') announce(scripts.cruise(contextRef.current));
    else if (settings.announcements && state.phase === 'descent') announce(scripts.descent(contextRef.current));
    else if (settings.chimes) cabinAudio.chime('single');
  }, [state.phase, settings.chimes, settings.announcements]);

  // On final approach the captain calls the crew to their seats. Skipped if the flight resumed past it.
  const landingCueMs = useMemo(() => landingCue(flight.plannedMinutes) * 60_000, [flight.plannedMinutes]);
  const landingCalled = useRef(left <= landingCueMs);
  useEffect(() => {
    if (landingCalled.current || left > landingCueMs || left <= 0) return;
    landingCalled.current = true;
    if (settings.announcements) announce(scripts.landing());
  }, [left, landingCueMs, settings.announcements]);

  // Now and then during cruise the seatbelt sign blinks, like a real flight.
  const chimeAt = useMemo(() => seatbeltChimes(flight), [flight]);
  const chimed = useRef(new Set(chimeAt.filter((t) => done >= t)));
  useEffect(() => {
    for (const t of chimeAt) {
      if (done < t || chimed.current.has(t)) continue;
      chimed.current.add(t);
      if (settings.chimes) cabinAudio.chime('single');
    }
  }, [done, chimeAt, settings.chimes]);

  // Some longer flights hit a patch of light turbulence once: the captain puts the sign on.
  const bumpAt = useMemo(() => turbulence(flight), [flight]);
  const bumped = useRef(bumpAt !== null && done >= bumpAt);
  useEffect(() => {
    if (bumpAt === null || bumped.current || done < bumpAt) return;
    bumped.current = true;
    if (settings.announcements) announce(scripts.seatbelt());
    else if (settings.chimes) cabinAudio.chime('single');
  }, [done, bumpAt, settings.announcements, settings.chimes]);

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
    cabinAudio.start(zone, flight.cabin, state.phase, flight.purpose, settings.focusTones, timbreFor(aircraft, flight.flightNumber));
    cabinAudio.setVolume(settings.volume);
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
      <StageBar current="In flight" />

      <div className={styles.mapWrap}>
        <FlightMap
          from={from}
          to={to}
          scenic={flight.scenic}
          progress={done}
          now={new Date(now)}
          mapStyle={settings.mapStyle}
        />
        <div className={styles.mapTop}>
          <span className={styles.chip}>{flight.flightNumber}</span>
          <span className={styles.chip}>{PHASE_LABEL[state.phase]}</span>
        </div>
        <button className={styles.mapButton} aria-expanded={mapMenu} onClick={() => setMapMenu((o) => !o)}>
          Map · {MAP_STYLES.find((s) => s.id === settings.mapStyle)?.label}
        </button>
        {mapMenu && (
          <div className={styles.mapMenu} role="menu">
            {MAP_STYLES.map((s) => (
              <button
                key={s.id}
                role="menuitemradio"
                aria-checked={settings.mapStyle === s.id}
                className={styles.mapOption}
                onClick={() => {
                  settings.setMapStyle(s.id);
                  setMapMenu(false);
                }}
              >
                <span>{s.label}</span>
                <span className={styles.mapNote}>{s.note}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.clock}>
        <p className={styles.time} aria-label={`${formatClock(left)} to arrival`}>
          {/* Fixed-width digits so the serif countdown doesn't wobble every second. */}
          {formatClock(left)
            .split('')
            .map((ch, i) => (
              <span key={i} className={ch === ':' ? styles.colon : styles.digit}>
                {ch}
              </span>
            ))}
        </p>
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

      {/* Just the volume here; everything else waits behind "Sound settings". */}
      <div className={styles.sound}>
        {needsTap ? (
          <button className={styles.soundOn} onClick={turnOnSound}>
            Turn on cabin sound
          </button>
        ) : (
          <label className={styles.volume}>
            <span>Sound</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.volume}
              onChange={(e) => settings.setVolume(Number(e.target.value))}
            />
          </label>
        )}
        <button
          className={styles.soundMenuButton}
          aria-expanded={soundMenu}
          aria-controls="sound-settings"
          onClick={() => setSoundMenu((o) => !o)}
        >
          Sound settings
        </button>
      </div>

      {soundMenu && (
        <div id="sound-settings" className={styles.soundMenu}>
          <Setting
            label="Announcements"
            note="Captain and crew, a little under the cabin sound"
            on={settings.announcements}
            onChange={(on) => {
              settings.setAnnouncements(on);
              if (!on) silenceAnnouncements();
            }}
          />
          <Setting
            label="Seatbelt chimes"
            note="Now and then during cruise, like a real flight"
            on={settings.chimes}
            onChange={settings.setChimes}
          />
          <Setting
            label="Focus mode"
            note="Less low rumble, easier on long sessions"
            on={settings.focusMode}
            onChange={settings.setFocusMode}
          />
          <Setting
            label="Binaural tones"
            note="Experimental · headphones only"
            on={settings.focusTones}
            onChange={(on) => {
              settings.setFocusTones(on);
              cabinAudio.setFocusTones(on, flight.purpose);
            }}
          />
        </div>
      )}

      <button className={styles.end} onClick={endEarly}>
        End flight early
      </button>
    </section>
  );
}

/** Minutes before touchdown for "Cabin crew, please take your seats for landing": 8, or half the descent if shorter. */
function landingCue(plannedMinutes: number): number {
  const { descentStart } = phaseBounds(plannedMinutes);
  return Math.min(8, (1 - descentStart) * plannedMinutes * 0.5);
}

/** About a third of flights of 90 minutes or more get one bumpy patch mid-cruise; null for the rest. */
function turbulence(flight: Flight): number | null {
  if (flight.plannedMinutes < 90) return null;
  const rand = seededRandom(hashString(`${flight.id}|bumps`));
  if (rand() > 0.35) return null;
  const { climbEnd, descentStart } = phaseBounds(flight.plannedMinutes);
  return climbEnd + 0.15 + rand() * (descentStart - climbEnd - 0.3);
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

function Setting({
  label,
  note,
  on,
  onChange,
}: {
  label: string;
  note: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button className={styles.setting} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className={styles.settingText}>
        <span>{label}</span>
        <span className={styles.settingNote}>{note}</span>
      </span>
      <span className={styles.knob} />
    </button>
  );
}

"""Cabin timbre filters from real airliner recordings (no loops, no voices).

The app generates cabin noise live and shapes it with a filter. This script makes that filter
from a real recording, so the noise takes on the timbre of that aircraft:

  1. Spectrum per frame (8192-point FFT, 50% overlap), per channel.
  2. The MEDIAN over time in every frequency bin. Voices, a baby crying, clinks and bumps come
     and go; the cabin roar is always there. The median keeps the roar and drops the rest.
  3. Comfort for hours of listening (the things that tire ears and annoy, per psychoacoustics):
     - pure tones out: engine fan whines (A320 2.7 kHz, 737 1.5/3 kHz) and recorder whine
       (777 10.8 kHz) are flattened down to the surrounding noise (1/3-octave envelope)
     - deep bass eased below 110 Hz (6 dB/octave), so no pressure "hitting" the ears
     - highs eased above 8 kHz (6 dB/octave) and nothing above 16 kHz (recorder artefacts)
  4. A linear-phase FIR (8192 taps) with that magnitude, normalized to unit energy: white noise
     through it comes out at the same RMS with the aircraft's spectrum.

Inputs:  scripts/sound/raw/<freesound id>__*.wav  (see docs/ASSETS.md)
Outputs: public/audio/cabin/<timbre>.wav (stereo float32 impulse responses, a few tens of KB)
         public/audio/cabin/timbres.json (band levels: average, median, and the comfort target;
         peak tonality before and after)

Run:  scripts/tts/.venv/Scripts/python -I scripts/sound/make_cabin_ir.py
"""

import json
from pathlib import Path

import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
RAW = HERE / "raw"
OUT = ROOT / "public" / "audio" / "cabin"

N_FFT = 8192
HOP = N_FFT // 2

# timbre id -> (Freesound id, description). Licenses in docs/ASSETS.md.
TIMBRES = {
    "a320": ("438972", "Airbus A320 in flight (Kinoton, CC0)"),
    "b737": ("433005", "Boeing 737 in flight (fassaria, CC0)"),
    "b777": ("396292", "Boeing 777 business, binaural (digifishmusic, CC BY 4.0)"),
}

# Comfort shaping (see the docstring).
TONE_CLAMP_DB = 1.0
BASS_CORNER_HZ = 110
TREBLE_CORNER_HZ = 8000
TOP_HZ = 16000

BANDS = [(40, 80), (80, 160), (160, 320), (320, 640), (640, 1280), (1280, 2560), (2560, 5120), (5120, 10240)]


def spectra(channel: np.ndarray) -> np.ndarray:
    """Power spectrum of every frame: shape (frames, bins)."""
    window = np.hanning(N_FFT)
    count = 1 + (len(channel) - N_FFT) // HOP
    frames = np.lib.stride_tricks.sliding_window_view(channel, N_FFT)[::HOP][:count]
    return np.abs(np.fft.rfft(frames * window, axis=1)) ** 2


def smooth_log(power: np.ndarray, freqs: np.ndarray, fraction: float = 1 / 24) -> np.ndarray:
    """Average each bin with its neighbours within +/- half a 1/24 octave."""
    out = power.copy()
    half = 2 ** (fraction / 2)
    cumulative = np.concatenate([[0.0], np.cumsum(power)])
    for i, f in enumerate(freqs):
        if f <= 0:
            continue
        lo = np.searchsorted(freqs, f / half)
        hi = np.searchsorted(freqs, f * half, side="right")
        out[i] = (cumulative[hi] - cumulative[lo]) / max(1, hi - lo)
    return out


def detonalize(power: np.ndarray, freqs: np.ndarray, passes: int = 3) -> np.ndarray:
    """Flatten narrow peaks (pure tones) down to the 1/3-octave envelope around them.

    A strong tone lifts its own envelope, so this repeats: each pass measures the
    surroundings again without the part of the tone already removed.
    """
    for _ in range(passes):
        envelope = smooth_log(power, freqs, 1 / 3)
        power = np.minimum(power, envelope * 10 ** (TONE_CLAMP_DB / 10))
    return power


def comfort_tilt(freqs: np.ndarray) -> np.ndarray:
    """Power gain: ease deep bass and highs, nothing above TOP_HZ."""
    gain = np.ones_like(freqs)
    low = freqs < BASS_CORNER_HZ
    gain[low] = (np.maximum(freqs[low], 1) / BASS_CORNER_HZ) ** 2
    high = freqs > TREBLE_CORNER_HZ
    gain[high] = (TREBLE_CORNER_HZ / freqs[high]) ** 2
    # Fade out over the last 3 kHz instead of a hard edge.
    fade = (freqs > TOP_HZ - 3000) & (freqs <= TOP_HZ)
    gain[fade] *= np.cos((freqs[fade] - (TOP_HZ - 3000)) / 3000 * np.pi / 2) ** 2
    gain[freqs > TOP_HZ] = 0
    return gain


def max_tonality(power: np.ndarray, freqs: np.ndarray) -> float:
    """How far (dB) the most prominent narrow peak stands above its 1/3-octave surroundings."""
    envelope = smooth_log(power, freqs, 1 / 3)
    useful = (freqs > 40) & (freqs < TOP_HZ)
    return round(float(10 * np.log10(power[useful] / envelope[useful]).max()), 1)


def fir_from_power(power: np.ndarray, freqs: np.ndarray) -> np.ndarray:
    magnitude = np.sqrt(power)
    magnitude[freqs < 25] = 0  # no sub-sonic rumble
    h = np.fft.irfft(magnitude, n=N_FFT)
    h = np.roll(h, N_FFT // 2) * np.hanning(N_FFT)
    return h


def band_db(power: np.ndarray, freqs: np.ndarray) -> list[float]:
    ref = power[(freqs >= 160) & (freqs < 320)].sum()
    return [round(10 * np.log10(power[(freqs >= lo) & (freqs < hi)].sum() / ref), 1) for lo, hi in BANDS]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    report = {}
    for timbre, (sound_id, description) in TIMBRES.items():
        files = list(RAW.glob(f"{sound_id}__*.wav"))
        if not files:
            print(f"skip {timbre}: no {sound_id}__*.wav in {RAW}")
            continue
        x, rate = sf.read(files[0], dtype="float64", always_2d=True)
        if x.shape[1] == 1:
            x = np.repeat(x, 2, axis=1)
        freqs = np.fft.rfftfreq(N_FFT, 1 / rate)

        irs, mean_bands, median_bands, comfort_bands, tone_before, tone_after = [], [], [], [], [], []
        for ch in range(2):
            s = spectra(x[:, ch])
            raw_median = np.median(s, axis=0)
            median = smooth_log(raw_median, freqs)
            mean = smooth_log(s.mean(axis=0), freqs)
            comfort = smooth_log(detonalize(raw_median, freqs), freqs) * comfort_tilt(freqs)
            irs.append(fir_from_power(comfort, freqs))
            mean_bands.append(band_db(mean, freqs))
            median_bands.append(band_db(median, freqs))
            comfort_bands.append(band_db(comfort, freqs))
            tone_before.append(max_tonality(raw_median, freqs))
            tone_after.append(max_tonality(comfort, freqs))

        ir = np.stack(irs, axis=1)
        ir /= np.sqrt((ir**2).sum(axis=0).mean())  # unit energy, keeping the left/right balance
        sf.write(OUT / f"{timbre}.wav", ir.astype(np.float32), rate, subtype="FLOAT")
        report[timbre] = {
            "description": description,
            "rate": rate,
            "bands": [f"{lo}-{hi}" for lo, hi in BANDS],
            "average_db": np.mean(mean_bands, axis=0).round(1).tolist(),
            "median_db": np.mean(median_bands, axis=0).round(1).tolist(),
            "comfort_db": np.mean(comfort_bands, axis=0).round(1).tolist(),
            "tonality_db_before": max(tone_before),
            "tonality_db_after": max(tone_after),
        }
        print(f"{timbre}: {files[0].name} -> {timbre}.wav ({(OUT / f'{timbre}.wav').stat().st_size / 1024:.0f} KB)")

    (OUT / "timbres.json").write_text(json.dumps(report, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()

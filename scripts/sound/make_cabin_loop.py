"""Turn real airliner cabin recordings into seamless loops for the app.

For each WAV in scripts/sound/raw/ (downloaded by hand, CC0 or CC BY — see docs/ASSETS.md):
  1. find the steadiest stretch: no talking, clinks or bumps (lowest level and brightness swings)
  2. cut a loop from it and crossfade its end into its start, so it repeats with no seam
  3. take out sub-sonic rumble below ~30 Hz and set a common loudness
  4. write an MP3 (plays on every browser) to public/sound-lab/ plus a manifest for the sound lab page

Run:  scripts/tts/.venv/Scripts/python -I scripts/sound/make_cabin_loop.py
"""

import json
from pathlib import Path

import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
RAW = HERE / "raw"
OUT = ROOT / "public" / "sound-lab"

LOOP_SECONDS = 90
CROSSFADE_SECONDS = 4
FRAME_SECONDS = 0.5
TARGET_RMS_DBFS = -23.0

# Freesound sound ID -> what the sound lab shows. Licenses checked on each sound's page.
LABELS = {
    "438972": ("Airbus A320 · in flight", "Kinoton", "CC0"),
    "433005": ("Boeing 737 · in flight", "fassaria", "CC0"),
    "451741": ("Large jet · in flight, faint cabin chatter", "richwise", "CC0"),
    "396292": ("Boeing 777 business · binaural", "digifishmusic", "CC BY 4.0"),
}


def frames_profile(x: np.ndarray, rate: int) -> tuple[np.ndarray, np.ndarray]:
    """Per half-second frame: level (dB) and mid-high band energy (dB), where voices and clinks live."""
    mono = x.mean(axis=1)
    n = int(rate * FRAME_SECONDS)
    count = len(mono) // n
    level = np.empty(count)
    bright = np.empty(count)
    freqs = np.fft.rfftfreq(n, 1 / rate)
    band = (freqs > 500) & (freqs < 4000)
    window = np.hanning(n)
    for i in range(count):
        f = mono[i * n : (i + 1) * n]
        level[i] = 10 * np.log10(np.mean(f**2) + 1e-12)
        spec = np.abs(np.fft.rfft(f * window)) ** 2
        bright[i] = 10 * np.log10(spec[band].sum() + 1e-12)
    return level, bright


def steadiest_start(level: np.ndarray, bright: np.ndarray, window_frames: int) -> int:
    """Start frame of the window with the smallest swings (and no single big jump)."""
    def jumps(v: np.ndarray) -> np.ndarray:
        return np.abs(v - np.median(v))

    badness = jumps(level) + 1.5 * jumps(bright)
    best, best_score = 0, float("inf")
    for start in range(0, len(badness) - window_frames):
        w = badness[start : start + window_frames]
        score = w.mean() + 0.5 * np.percentile(w, 98)
        if score < best_score:
            best, best_score = start, score
    return best


def high_pass(x: np.ndarray, rate: int, cutoff: float = 30.0) -> np.ndarray:
    """Remove sub-sonic rumble with a gentle FFT taper (offline, so no phase worries)."""
    spec = np.fft.rfft(x, axis=0)
    freqs = np.fft.rfftfreq(len(x), 1 / rate)
    gain = np.clip((freqs - cutoff * 0.5) / (cutoff * 0.5), 0, 1)
    return np.fft.irfft(spec * gain[:, None], n=len(x), axis=0)


def seamless_loop(seg: np.ndarray, rate: int) -> np.ndarray:
    """seg is LOOP + CROSSFADE long; its tail is blended into its head (equal power)."""
    length = LOOP_SECONDS * rate
    fade = CROSSFADE_SECONDS * rate
    out = seg[:length].copy()
    t = np.linspace(0, 1, fade, endpoint=False)[:, None]
    out[:fade] = seg[:fade] * np.sin(t * np.pi / 2) + seg[length : length + fade] * np.cos(t * np.pi / 2)
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    sources = sorted(RAW.glob("*.wav"))
    if not sources:
        print(f"no WAV files in {RAW}")
        return

    manifest = []
    for path in sources:
        x, rate = sf.read(path, dtype="float64", always_2d=True)
        if x.shape[1] == 1:
            x = np.repeat(x, 2, axis=1)
        x = x[:, :2]
        need = (LOOP_SECONDS + CROSSFADE_SECONDS) * rate
        if len(x) < need:
            print(f"skip {path.name}: shorter than {LOOP_SECONDS + CROSSFADE_SECONDS}s")
            continue

        level, bright = frames_profile(x, rate)
        window = int((LOOP_SECONDS + CROSSFADE_SECONDS) / FRAME_SECONDS)
        start_frame = steadiest_start(level, bright, window)
        start = int(start_frame * FRAME_SECONDS * rate)
        seg = high_pass(x[start : start + need], rate)
        loop = seamless_loop(seg, rate)

        rms = np.sqrt(np.mean(loop**2))
        loop *= 10 ** (TARGET_RMS_DBFS / 20) / max(rms, 1e-9)
        peak = np.max(np.abs(loop))
        if peak > 0.98:
            loop *= 0.98 / peak

        name = path.stem
        file = f"cabin-{name}.mp3"
        sf.write(OUT / file, loop.astype(np.float32), rate, format="MP3", subtype="MPEG_LAYER_III")
        label, author, license_ = LABELS.get(name.split("__")[0], (name, "", ""))
        manifest.append({
            "name": label,
            "author": author,
            "license": license_,
            "file": file,
            "from": round(start / rate, 1),
            "seconds": LOOP_SECONDS,
        })
        print(f"{path.name}: loop from {start / rate:.0f}s -> {file} ({(OUT / file).stat().st_size / 1e6:.1f} MB)")

    (OUT / "cabin-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()

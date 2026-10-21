"""Voice candidates for the captain and the cabin crew, generated with Kokoro-82M (Apache 2.0).

Writes WAV files plus a manifest to public/voice-samples/ so they can be compared at
http://localhost:5173/voice-samples/index.html (with and without the cabin PA filter).

A candidate can blend several Kokoro voices (weighted average of their style vectors) and be
lowered in pitch: it is synthesized slightly faster, then stretched back, which drops pitch and
formants together for a bigger, deeper voice at the same pace.

Setup (once):  python -m venv scripts/tts/.venv
               scripts/tts/.venv/Scripts/python -m pip install kokoro-onnx soundfile
               model files in scripts/tts/models/ (kokoro-v1.0.onnx, voices-v1.0.bin)
Run:           scripts/tts/.venv/Scripts/python -I scripts/tts/generate_samples.py
"""

import json
import time
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
MODELS = HERE / "models"
OUT = ROOT / "public" / "voice-samples"

# Lines from the final script (src/domain/announcements.ts, docs/SPEC.md 3.8).
LINES = {
    "captain": (
        "Good afternoon from the flight deck. We've reached our cruising altitude of thirty-five thousand feet, "
        "and the seatbelt sign is now off. We'll have you in Tokyo in about one hour and thirty minutes. "
        "Sit back, and enjoy the quiet."
    ),
    "crew": (
        "Ladies and gentlemen, welcome aboard Hanul Air flight four seven four to Tokyo. "
        "Our flight time today is two hours. Please fasten your seatbelt, and set your phone to flight mode."
    ),
}

# Round 4: a warmer, seasoned captain (Onyx read as dark and stern). Pitch stays near natural:
# lowering it also darkens the voice, which is what made Onyx sound gruff.
# Alice (crew) stays at her three speeds for comparison.
CANDIDATES = [
    # id, speaker, [(voice, weight)], description, speed, semitones (negative = deeper)
    ("michael", "captain", [("am_michael", 1)], "American · Michael, natural pitch · steady and friendly", 1.0, 0.0),
    ("michael-low", "captain", [("am_michael", 1)], "American · Michael, half a semitone lower", 1.0, -0.5),
    ("george", "captain", [("bm_george", 1)], "British · George, natural pitch · warm and measured", 1.0, 0.0),
    ("fable", "captain", [("bm_fable", 1)], "British · Fable, natural pitch · soft-spoken storyteller", 1.0, 0.0),
    ("michael-george", "captain", [("am_michael", 0.5), ("bm_george", 0.5)], "Blend · Michael + George, half a semitone lower", 1.0, -0.5),
    ("michael-fenrir", "captain", [("am_michael", 0.6), ("am_fenrir", 0.4)], "Blend · 60% Michael + 40% Fenrir, natural pitch", 1.0, 0.0),
    ("alice-105", "crew", [("bf_alice", 1)], "Alice · speed 1.05", 1.05, 0.0),
    ("alice-112", "crew", [("bf_alice", 1)], "Alice · speed 1.12", 1.12, 0.0),
    ("alice-120", "crew", [("bf_alice", 1)], "Alice · speed 1.20", 1.20, 0.0),
]

# Pauses between sentences: an unhurried captain who has said this a thousand times.
SENTENCE_PAUSE = {"captain": 0.36, "crew": 0.24}


def style(kokoro: Kokoro, mix: list[tuple[str, float]]) -> np.ndarray:
    total = sum(w for _, w in mix)
    return sum(kokoro.get_voice_style(name) * (w / total) for name, w in mix).astype(np.float32)


def lower_pitch(samples: np.ndarray, semitones: float) -> np.ndarray:
    """Stretch by the pitch ratio (played at the same rate, pitch drops by `semitones`)."""
    if semitones == 0:
        return samples
    ratio = 2 ** (-semitones / 12)
    positions = np.arange(0, len(samples) - 1, 1 / ratio)
    return np.interp(positions, np.arange(len(samples)), samples).astype(np.float32)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.wav"):
        old.unlink()

    kokoro = Kokoro(str(MODELS / "kokoro-v1.0.onnx"), str(MODELS / "voices-v1.0.bin"))
    manifest = []
    for cid, speaker, mix, note, speed, semitones in CANDIDATES:
        lang = "en-gb" if mix[0][0].startswith("b") else "en-us"
        # Speak faster by the pitch ratio so the stretch brings it back to `speed`.
        ratio = 2 ** (-semitones / 12)
        started = time.perf_counter()
        samples, rate = kokoro.create(
            LINES[speaker],
            voice=style(kokoro, mix),
            speed=speed * ratio,
            lang=lang,
            sentence_pause=SENTENCE_PAUSE[speaker],
        )
        samples = lower_pitch(samples, semitones)
        # Normalize to the same loudness ceiling so candidates compare fairly.
        samples = samples / max(1e-6, float(np.max(np.abs(samples)))) * 0.89
        took = time.perf_counter() - started
        seconds = len(samples) / rate
        file = f"{speaker}-{cid}.wav"
        sf.write(OUT / file, samples, rate)
        manifest.append({"speaker": speaker, "voice": cid, "note": note, "file": file, "seconds": round(seconds, 1)})
        print(f"{file}: {seconds:.1f}s in {took:.1f}s")

    (OUT / "manifest.json").write_text(
        json.dumps({"round": 4, "lines": LINES, "samples": manifest}, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"wrote {len(manifest)} samples to {OUT}")


if __name__ == "__main__":
    main()

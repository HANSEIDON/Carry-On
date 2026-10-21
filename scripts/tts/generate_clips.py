"""Announcement voice clips: one MP3 per phrase per voice, for the app to play in a row.

Reads scripts/tts/parts.json (every phrase the script can say, and which voices the app uses;
made by `node scripts/tts/list_parts.mjs`) and writes

    public/audio/voice/<voice>/<clip key>.mp3     mono, 24 kHz, ~25 kbps, silence trimmed, even loudness
    public/audio/voice/<voice>/clips.json         the clip keys that exist (the app checks this)

Resumable: clips that already exist are skipped, so a long run can be stopped and started again.
Each phrase gets a fixed random seed, so a clip made again comes out the same.

Voices (chosen in the sound lab, 2026-10-21):
    cb-default   captain · Chatterbox built-in voice, calm
    cb-george    captain · Chatterbox in George's timbre (refs/ref-george.wav, a Kokoro reading), calm
    alice-112    crew    · Kokoro bf_alice at 1.12x

The two engines live in separate virtual environments; each run makes the voices its engine can:

    Crew (Kokoro, fast on any CPU):
        scripts/tts/.venv/Scripts/python -I scripts/tts/generate_clips.py
    Captains (Chatterbox, about 0.1x realtime on CPU, much faster on an NVIDIA GPU):
        scripts/tts/.venv-chatterbox/Scripts/python -I scripts/tts/generate_clips.py

Options:
    --voice cb-george      only this voice
    --match "Tokyo|Seoul"  only phrases matching this regular expression (e.g. a quick demo set)
    --limit 20             stop after this many new clips
    --device cuda          Chatterbox device (default: cuda when available, else cpu)

Setup on another PC (e.g. a desktop with an NVIDIA GPU): see docs/VOICE_CLIPS.md.
"""

import argparse
import json
import re
import sys
import time
import zlib
from pathlib import Path

import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
MODELS = HERE / "models"
REFS = HERE / "refs"
OUT = ROOT / "public" / "audio" / "voice"

VOICES = {
    "cb-default": {"engine": "chatterbox", "ref": None, "exaggeration": 0.35, "cfg": 0.5},
    "cb-george": {"engine": "chatterbox", "ref": "ref-george.wav", "exaggeration": 0.3, "cfg": 0.5},
    "alice-112": {"engine": "kokoro", "voice": "bf_alice", "speed": 1.12, "lang": "en-gb", "sentence_pause": 0.24},
}

# Clip finishing: the app sets the pauses between phrases, so clips start and end on the voice.
HEAD_PAD = 0.03
TAIL_PAD = 0.06
TARGET_RMS_DB = -20.0
PEAK_LIMIT = 0.89
# About 25 kbps: plenty for a voice the cabin PA filter band-limits anyway (~20 MB for every clip).
MP3_LEVEL = 0.9


def finish(samples: np.ndarray, rate: int) -> np.ndarray:
    """Trim silence (keeping a short pad), match loudness across clips, and fade the edges."""
    x = samples.astype(np.float64)
    frame = int(rate * 0.01)
    count = len(x) // frame
    rms = np.sqrt(np.mean(x[: count * frame].reshape(count, frame) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    voiced = np.flatnonzero(db > max(-55.0, db.max() - 40))
    if len(voiced):
        start = max(0, voiced[0] * frame - int(HEAD_PAD * rate))
        end = min(len(x), (voiced[-1] + 1) * frame + int(TAIL_PAD * rate))
        x = x[start:end]
        speech_rms = np.sqrt(np.mean(rms[voiced] ** 2))
        x *= 10 ** (TARGET_RMS_DB / 20) / speech_rms
    peak = np.max(np.abs(x))
    if peak > PEAK_LIMIT:
        x *= PEAK_LIMIT / peak
    fade = min(len(x) // 2, int(rate * 0.005))
    if fade:
        ramp = np.linspace(0, 1, fade)
        x[:fade] *= ramp
        x[-fade:] *= ramp[::-1]
    return x.astype(np.float32)


class KokoroEngine:
    def __init__(self, _device: str):
        from kokoro_onnx import Kokoro

        self.kokoro = Kokoro(str(MODELS / "kokoro-v1.0.onnx"), str(MODELS / "voices-v1.0.bin"))

    def speak(self, text: str, settings: dict, _seed: int) -> tuple[np.ndarray, int]:
        return self.kokoro.create(
            text,
            voice=settings["voice"],
            speed=settings["speed"],
            lang=settings["lang"],
            sentence_pause=settings["sentence_pause"],
        )


class ChatterboxEngine:
    def __init__(self, device: str):
        import os

        import torch
        from chatterbox.tts import ChatterboxTTS, Conditionals

        if device == "auto":
            device = "cuda" if torch.cuda.is_available() else "cpu"
        if device == "cpu":
            torch.set_num_threads(os.cpu_count() or 4)
        print(f"chatterbox on {device}", flush=True)
        self.torch = torch
        self.device = device
        self.model = ChatterboxTTS.from_local(MODELS / "chatterbox", device=device)
        self.load_builtin = lambda: Conditionals.load(MODELS / "chatterbox" / "conds.pt", map_location=device).to(device)
        self.voice = None

    def use(self, settings: dict) -> None:
        """Condition on the voice once, not per phrase."""
        key = settings.get("ref")
        if self.voice == key:
            return
        if key:
            self.model.prepare_conditionals(str(REFS / key), exaggeration=settings["exaggeration"])
        else:
            self.model.conds = self.load_builtin()
        self.voice = key

    def speak(self, text: str, settings: dict, seed: int) -> tuple[np.ndarray, int]:
        self.use(settings)
        self.torch.manual_seed(seed)
        wav = self.model.generate(text, exaggeration=settings["exaggeration"], cfg_weight=settings["cfg"])
        return wav.squeeze(0).cpu().numpy(), self.model.sr


ENGINES = {"kokoro": KokoroEngine, "chatterbox": ChatterboxEngine}


def available_engine() -> str:
    """The engine this virtual environment has installed."""
    try:
        import chatterbox  # noqa: F401

        return "chatterbox"
    except ImportError:
        return "kokoro"


def write_index(voice_dir: Path) -> int:
    keys = sorted(p.stem for p in voice_dir.glob("*.mp3"))
    (voice_dir / "clips.json").write_text(json.dumps(keys, indent=0) + "\n", encoding="utf-8")
    return len(keys)


def main() -> None:
    args = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    args.add_argument("--voice", action="append", help="voice id (repeatable); default: all of this engine's voices")
    args.add_argument("--match", help="only phrases matching this regular expression")
    args.add_argument("--limit", type=int, help="stop after this many new clips")
    args.add_argument("--device", default="auto", help="chatterbox device: auto, cuda or cpu")
    opts = args.parse_args()

    listing = json.loads((HERE / "parts.json").read_text(encoding="utf-8"))
    engine_name = available_engine()
    wanted = opts.voice or [v for vs in listing["voices"].values() for v in vs if VOICES[v]["engine"] == engine_name]
    for voice in wanted:
        if VOICES[voice]["engine"] != engine_name:
            sys.exit(f"{voice} needs {VOICES[voice]['engine']}; run this with that engine's virtual environment")
    if not wanted:
        sys.exit(f"no voices for {engine_name} in parts.json")

    engine = ENGINES[engine_name](opts.device)
    pattern = re.compile(opts.match, re.IGNORECASE) if opts.match else None
    made = 0
    for voice in wanted:
        speaker = next(s for s, vs in listing["voices"].items() if voice in vs)
        settings = VOICES[voice]
        voice_dir = OUT / voice
        voice_dir.mkdir(parents=True, exist_ok=True)
        todo = [
            p
            for p in listing["parts"]
            if p["speaker"] == speaker
            and not (voice_dir / f"{p['key']}.mp3").exists()
            and (pattern is None or pattern.search(p["text"]))
        ]
        print(f"{voice}: {len(todo)} clips to make", flush=True)
        started = time.perf_counter()
        spoken = 0.0
        for i, part in enumerate(todo, 1):
            if opts.limit is not None and made >= opts.limit:
                break
            samples, rate = engine.speak(part["text"], settings, zlib.crc32(f"{voice}|{part['key']}".encode()))
            clip = finish(np.asarray(samples), rate)
            path = voice_dir / f"{part['key']}.mp3"
            tmp = path.with_name(f"{path.stem}.partial")
            sf.write(tmp, clip, rate, format="MP3", subtype="MPEG_LAYER_III", bitrate_mode="CONSTANT", compression_level=MP3_LEVEL)
            tmp.replace(path)
            made += 1
            spoken += len(clip) / rate
            if i % 25 == 0 or i == len(todo):
                took = time.perf_counter() - started
                left = (len(todo) - i) * took / i
                print(f"  {voice} {i}/{len(todo)}  {spoken / took:.2f}x realtime  ~{left / 60:.0f} min left", flush=True)
                write_index(voice_dir)
        print(f"{voice}: {write_index(voice_dir)} clips in {voice_dir.relative_to(ROOT)}", flush=True)


if __name__ == "__main__":
    main()

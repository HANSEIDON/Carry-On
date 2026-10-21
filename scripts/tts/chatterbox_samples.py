"""Captain voice candidates with Chatterbox (Resemble AI, MIT), CPU.

Chatterbox reads in the timbre of a short reference clip and brings its own, more natural
phrasing. References are natural-pitch Kokoro readings (scripts/tts/refs/, made by this repo,
so no real person's voice is cloned) plus Chatterbox's built-in voice. Low exaggeration keeps
the delivery calm.

Writes captain WAVs into public/voice-samples/ and swaps them into its manifest (crew entries kept).

Setup (once):  python -m venv scripts/tts/.venv-chatterbox
               scripts/tts/.venv-chatterbox/Scripts/python -m pip install chatterbox-tts soundfile
Model files:   scripts/tts/models/chatterbox/ (ve.safetensors, t3_cfg.safetensors, s3gen.safetensors,
               tokenizer.json, conds.pt from huggingface.co/ResembleAI/chatterbox, about 3 GB).
               Fetched with curl over IPv4: the Hugging Face client stalls on this network.
Run:           scripts/tts/.venv-chatterbox/Scripts/python -I scripts/tts/chatterbox_samples.py
"""

import json
import os
import time
from pathlib import Path

import soundfile as sf
import torch
from chatterbox.tts import ChatterboxTTS

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
MODELS = HERE / "models" / "chatterbox"
REFS = HERE / "refs"
OUT = ROOT / "public" / "voice-samples"

LINE = (
    "Good afternoon from the flight deck. We've reached our cruising altitude of thirty-five thousand feet, "
    "and the seatbelt sign is now off. We'll have you in Tokyo in about one hour and thirty minutes. "
    "Sit back, and enjoy the quiet."
)

# id, reference clip (None = built-in voice), description, exaggeration, cfg_weight
CANDIDATES = [
    ("cb-default", None, "Chatterbox built-in voice · calm", 0.35, 0.5),
    ("cb-michael", "ref-michael.wav", "Chatterbox in Michael's timbre · calm", 0.3, 0.5),
    ("cb-george", "ref-george.wav", "Chatterbox in George's timbre · calm", 0.3, 0.5),
    ("cb-fenrir", "ref-fenrir.wav", "Chatterbox in Fenrir's timbre · calm", 0.3, 0.5),
]


def main() -> None:
    torch.set_num_threads(os.cpu_count() or 4)
    started = time.perf_counter()
    model = ChatterboxTTS.from_local(MODELS, device="cpu")
    print(f"model ready in {time.perf_counter() - started:.0f}s")

    captains = []
    for cid, ref, note, exaggeration, cfg in CANDIDATES:
        t0 = time.perf_counter()
        wav = model.generate(
            LINE,
            audio_prompt_path=str(REFS / ref) if ref else None,
            exaggeration=exaggeration,
            cfg_weight=cfg,
        )
        audio = wav.squeeze(0).cpu().numpy()
        file = f"captain-{cid}.wav"
        sf.write(OUT / file, audio, model.sr)
        seconds = len(audio) / model.sr
        took = time.perf_counter() - t0
        captains.append({"speaker": "captain", "voice": cid, "note": note, "file": file, "seconds": round(seconds, 1)})
        print(f"{file}: {seconds:.1f}s of speech in {took:.0f}s ({seconds / took:.2f}x realtime)", flush=True)

    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for old in manifest["samples"]:
        if old["speaker"] == "captain" and not old["voice"].startswith("cb-"):
            (OUT / old["file"]).unlink(missing_ok=True)
    manifest["samples"] = captains + [s for s in manifest["samples"] if s["speaker"] != "captain"]
    manifest["round"] = 5
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {len(captains)} captain samples")


if __name__ == "__main__":
    main()

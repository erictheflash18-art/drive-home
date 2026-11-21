#!/usr/bin/env python3
"""Make the game text match what was actually said in each recording.

Uses whisper.cpp (brew install whisper-cpp) with the model in tools/models/,
all on this Mac.

  python3 tools/transcribe.py            # preview: what would change
  python3 tools/transcribe.py --apply    # write the changes into js/lines.js

The voice server also imports this to match each new recording as it's saved.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, "audio")
MODEL = os.path.join(ROOT, "tools", "models", "ggml-small.en.bin")
LINES_JS = os.path.join(ROOT, "js", "lines.js")
TEXTS = os.path.join(AUDIO, "texts.json")


def available():
    return os.path.exists(MODEL) and subprocess.run(["which", "whisper-cli"], capture_output=True).returncode == 0


def transcribe(audio_path, hint=""):
    """Speech → text. `hint` (the expected line) helps with names like Kenosha or Snickers."""
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, "in.wav")
        subprocess.run(["afconvert", audio_path, wav, "-f", "WAVE", "-d", "LEI16@16000", "-c", "1"],
                       check=True, capture_output=True, timeout=60)
        cmd = ["whisper-cli", "-m", MODEL, "-f", wav, "-nt", "-np"]
        if hint:
            cmd += ["--prompt", hint]
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=120).stdout
    return " ".join(out.split())


def comparable(s):
    return " ".join(re.sub(r"[^a-z0-9 ]+", " ", s.lower()).split())


def style(heard, original):
    """Dress the transcript up in the game's style, borrowing caps from the original line."""
    h = " ".join(heard.split()).strip()
    if not h:
        return original
    h = re.sub(r"\byo[,.!]?\s+john\b", "YO JOHN", h, flags=re.I)
    letters = [c for c in original if c.isalpha()]
    if letters and all(c.isupper() for c in letters):
        return h.upper()
    # Borrow the original's shouting: whole CAPS phrases ("THE WATER IS COLD"), and
    # single CAPS words only if they're real words (not THE / IN / IS on their own).
    words = re.findall(r"[A-Za-z']+", original)
    runs, run = [], []
    for w in words + [""]:
        if len(w) >= 2 and w.isupper():
            run.append(w)
        else:
            if run:
                runs.append(run)
            run = []
    stop = {"THE", "IN", "IS", "IT", "AND", "TO", "OF", "A", "AN", "ON", "AT", "YOU", "ME", "MY", "SO"}
    phrases = set()
    for r in runs:  # every contiguous piece of each CAPS run
        for i in range(len(r)):
            for j in range(i + 1, len(r) + 1):
                piece = r[i:j]
                if len(piece) == 1 and (piece[0] in stop or len(piece[0]) < 3):
                    continue
                if piece[0] == "YO" and len(piece) <= 2:
                    continue
                phrases.add(tuple(piece))
    for ph in sorted(phrases, key=len, reverse=True):
        pat = r"\b" + r"\W+".join(re.escape(w) for w in ph) + r"\b"
        h = re.sub(pat, lambda m: m.group(0).upper(), h, flags=re.I)
    h = re.sub(r"^yo\b", "YO", h, flags=re.I)
    return h


def match(audio_path, original, heard=None):
    """Returns the new line text, or None if it already matches (ignoring punctuation and case)."""
    if heard is None:
        heard = transcribe(audio_path, original)
    # whisper labels non-speech like [BEEPING], [BLANK_AUDIO], (music): never use those as words
    heard = " ".join(re.sub(r"\[[^\]]*\]|\([^)]*\)|\*[^*]*\*", " ", heard or "").split())
    if not re.search(r"[A-Za-z]{2}", heard):
        return None
    if comparable(heard) == comparable(original):
        return None
    return style(heard, original)


def clip_path(key):
    for ext in (".m4a", ".wav"):
        p = os.path.join(AUDIO, key + ext)
        if os.path.exists(p):
            return p
    return None


def main():
    apply = "--apply" in sys.argv
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from voice_server import read_texts, write_texts, replace_line

    texts = read_texts()
    keys = [k for k in sorted(texts) if clip_path(k)]

    def work(k):
        return k, match(clip_path(k), texts[k])

    with ThreadPoolExecutor(4) as pool:
        results = list(pool.map(work, keys))
    changes = {k: new for k, new in results if new}
    print(json.dumps({k: {"old": texts[k], "new": v} for k, v in changes.items()}, indent=1, ensure_ascii=False))
    print(f"{len(changes)} of {len(keys)} lines differ from what was said.", file=sys.stderr)
    if apply:
        for k, new in changes.items():
            err = replace_line(texts[k], new)
            if err:
                print(f"skipped {k}: {err}", file=sys.stderr)
                continue
            texts[k] = new
        write_texts(texts)
        print("Applied.", file=sys.stderr)


if __name__ == "__main__":
    main()

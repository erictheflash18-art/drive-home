#!/usr/bin/env python3
"""Local server for the game + the voice recording page.

Run:   python3 tools/voice_server.py
Open:  http://localhost:8765/record.html   (record lines)
       http://localhost:8765/?preview      (play the game)

Recordings arrive as WAV, get converted to AAC (.m4a, plays on iPhone and
everywhere else) with macOS's built-in afconvert, and land in audio/.
audio/manifest.js is rewritten after every save so the game knows what exists.
"""
import http.server
import json
import os
import re
import subprocess
import tempfile
import time
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, "audio")
LINES_JS = os.path.join(ROOT, "js", "lines.js")
TEXTS = os.path.join(AUDIO, "texts.json")  # the words each take was recorded with
KEY_RE = re.compile(r"^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$")
EXTS = (".m4a", ".wav")


def clips():
    out = {}
    for name in sorted(os.listdir(AUDIO)):
        base, ext = os.path.splitext(name)
        if ext in EXTS and KEY_RE.match(base):
            mtime = int(os.path.getmtime(os.path.join(AUDIO, name)))
            out[base] = f"audio/{name}?v={mtime}"
    return out


def write_manifest():
    data = json.dumps(clips(), indent=1)
    with open(os.path.join(AUDIO, "manifest.js"), "w") as f:
        f.write("// Written by tools/voice_server.py: which lines have a recording.\n")
        f.write(f"const VOICE_CLIPS = {data};\n")


def read_texts():
    try:
        with open(TEXTS) as f:
            return json.load(f)
    except Exception:
        return {}


def write_texts(texts):
    with open(TEXTS, "w") as f:
        json.dump(texts, f, indent=1, ensure_ascii=False, sort_keys=True)


def replace_line(old, new):
    """Swap one string literal in lines.js. Refuses if it isn't found exactly once."""
    with open(LINES_JS, encoding="utf-8") as f:
        src = f.read()
    old_lit = json.dumps(old, ensure_ascii=False)
    count = src.count(old_lit)
    if count != 1:
        return f"Found that line {count} times in lines.js, so I didn't touch it. Edit lines.js directly for this one."
    src = src.replace(old_lit, json.dumps(new, ensure_ascii=False))
    tmp = LINES_JS + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(src)
    os.replace(tmp, LINES_JS)
    return None


def remove_key(key):
    for ext in EXTS:
        p = os.path.join(AUDIO, key + ext)
        if os.path.exists(p):
            os.remove(p)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # keep the terminal quiet

    def reply(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def key_param(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        key = (q.get("key") or [""])[0]
        return key if KEY_RE.match(key) else None

    def do_GET(self):
        if urllib.parse.urlparse(self.path).path == "/api/list":
            return self.reply(200, clips())
        return super().do_GET()

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        key = self.key_param()
        if not key:
            return self.reply(400, {"error": "bad key"})
        if path == "/api/delete":
            remove_key(key)
            texts = read_texts()
            texts.pop(key, None)
            write_texts(texts)
            write_manifest()
            return self.reply(200, {"ok": True})
        if path == "/api/text":
            length = int(self.headers.get("Content-Length", 0))
            if length > 20000:
                return self.reply(400, {"error": "too long"})
            body = json.loads(self.rfile.read(length) or b"{}")
            old, new = body.get("old"), body.get("new")
            if not isinstance(old, str) or not isinstance(new, str) or not new.strip():
                return self.reply(400, {"error": "The line can't be empty."})
            new = " ".join(new.split())  # no line breaks inside a line
            err = replace_line(old, new)
            if err:
                return self.reply(409, {"error": err})
            return self.reply(200, {"ok": True, "text": new})
        if path != "/api/save":
            return self.reply(404, {"error": "unknown"})
        length = int(self.headers.get("Content-Length", 0))
        if length <= 44 or length > 50_000_000:
            return self.reply(400, {"error": "bad audio"})
        data = self.rfile.read(length)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(data)
            wav = tmp.name
        remove_key(key)
        out = os.path.join(AUDIO, key + ".m4a")
        try:
            subprocess.run(["afconvert", wav, out, "-f", "m4af", "-d", "aac"],
                           check=True, capture_output=True, timeout=60)
            os.remove(wav)
            os.chmod(out, 0o644)
        except Exception:
            fallback = os.path.join(AUDIO, key + ".wav")  # keep the WAV if conversion fails
            os.replace(wav, fallback)
            os.chmod(fallback, 0o644)
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        texts = read_texts()
        texts[key] = (q.get("text") or [""])[0]
        write_texts(texts)
        write_manifest()
        return self.reply(200, {"ok": True, "clips": clips()})


if __name__ == "__main__":
    os.makedirs(AUDIO, exist_ok=True)
    write_manifest()
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    print("Recording page: http://localhost:8765/record.html")
    print("Game:           http://localhost:8765/?preview")
    server.serve_forever()

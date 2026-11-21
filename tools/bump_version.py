#!/usr/bin/env python3
"""Stamp a version on every script/stylesheet link in index.html (?v=...), so phones load the
new files after a push instead of an old cached copy. Run before each push."""
import os, re, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, "index.html")
v = time.strftime("%m%d%H%M")
html = open(p).read()
html = re.sub(r'((?:src|href)="(?:js|css|audio|photos)/[^"?]+)(\?v=[^"]*)?"', lambda m: f'{m.group(1)}?v={v}"', html)
open(p, "w").write(html)
print("version", v)

"""One-time extraction of the supplied v27 game; source files stay editable."""
from pathlib import Path
import base64
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
ORIGINAL = ROOT.parents[1] / "index.html"
text = ORIGINAL.read_text(encoding="utf-8")
for folder in ("src", "assets"):
    (ROOT / folder).mkdir(parents=True, exist_ok=True)

assets = {}
pattern = re.compile(r"data:([\w.+/-]+);base64,([A-Za-z0-9+/=]+)")

def externalize(match):
    mime, encoded = match.groups()
    binary = base64.b64decode(encoded, validate=True)
    digest = hashlib.sha256(binary).hexdigest()
    extension = {"image/png": "png", "font/woff2": "woff2", "font/woff": "woff", "application/font-woff": "woff"}.get(mime)
    if not extension:
        raise ValueError(f"Unsupported embedded type: {mime}")
    name = f"assets/{digest[:20]}.{extension}"
    (ROOT / name).write_bytes(binary)
    assets[name] = {"mime": mime, "sha256": digest, "bytes": len(binary)}
    return name

text = pattern.sub(externalize, text)
script_names = iter(["game.js", "character-data.js", "frame-bounds.js", "extensions.js"])
def split_script(match):
    name = next(script_names)
    (ROOT / "src" / name).write_text(match.group(1), encoding="utf-8")
    return f'<script src="src/{name}"></script>'

text = re.sub(r"<script\b[^>]*>([\s\S]*?)</script>", split_script, text)
style_names = iter(["game.css", "characters.css"])
def split_style(match):
    name = next(style_names)
    css = match.group(1).replace("assets/", "../assets/")
    (ROOT / "src" / name).write_text(css, encoding="utf-8")
    return f'<link rel="stylesheet" href="src/{name}">'

text = re.sub(r"<style\b[^>]*>([\s\S]*?)</style>", split_style, text)
(ROOT / "dev.html").write_text(text, encoding="utf-8")
(ROOT / "assets" / "manifest.json").write_text(json.dumps(assets, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Extracted 4 scripts, 2 styles, {len(assets)} assets. Original preserved.")

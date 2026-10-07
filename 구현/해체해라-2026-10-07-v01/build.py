"""Build a portable, offline single HTML file using only this project."""
from pathlib import Path
import argparse
import base64
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parent

def build():
    manifest = json.loads((ROOT / "assets/manifest.json").read_text(encoding="utf-8"))
    urls = {}
    for name, meta in manifest.items():
        binary = (ROOT / name).read_bytes()
        if hashlib.sha256(binary).hexdigest() != meta["sha256"]:
            raise ValueError(f"Asset modified: {name}. Update its manifest before building.")
        urls[name] = f'data:{meta["mime"]};base64,{base64.b64encode(binary).decode("ascii")}'

    def embed_assets(text):
        return re.sub(r"(?:\.\./)?assets/[a-f0-9]{20}\.(?:png|woff2?|ttf)", lambda m: urls[m.group(0).removeprefix("../")], text)

    html = (ROOT / "dev.html").read_text(encoding="utf-8")
    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: "<style>" + embed_assets((ROOT / m.group(1)).read_text(encoding="utf-8")) + "</style>", html)
    html = re.sub(r'<script src="([^"]+)"></script>', lambda m: "<script>" + embed_assets((ROOT / m.group(1)).read_text(encoding="utf-8")).replace("</script", "<\\/script") + "</script>", html)
    return html

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Verify current index.html is reproducible")
    args = parser.parse_args()
    output = build().encode("utf-8")
    target = ROOT / "index.html"
    if args.check:
        if not target.exists() or target.read_bytes() != output:
            raise SystemExit("FAIL: index.html is missing or differs from source")
        print("PASS: portable HTML is reproducible; asset hashes verified")
    else:
        target.write_bytes(output)
        print(f"Built index.html ({len(output):,} bytes), all assets and fonts embedded")

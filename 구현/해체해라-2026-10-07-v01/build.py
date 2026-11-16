"""Build offline HTML plus the adjacent assets folder; optionally one standalone file."""
from pathlib import Path
import argparse
import base64
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parent

def build(standalone=False):
    manifest = json.loads((ROOT / "assets/manifest.json").read_text(encoding="utf-8"))
    urls = {}
    for name, meta in manifest.items():
        binary = (ROOT / name).read_bytes()
        if hashlib.sha256(binary).hexdigest() != meta["sha256"]:
            raise ValueError(f"Asset modified: {name}. Update its manifest before building.")
        urls[name] = f'data:{meta["mime"]};base64,{base64.b64encode(binary).decode("ascii")}' if standalone else name

    def embed_assets(text):
        return re.sub(r"(?:\.\./)?assets/[a-f0-9]{20}\.(?:png|woff2?|ttf|mp3|wav)", lambda m: urls[m.group(0).removeprefix("../")], text)

    html = (ROOT / "dev.html").read_text(encoding="utf-8")
    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: "<style>" + embed_assets((ROOT / m.group(1).split("?", 1)[0]).read_text(encoding="utf-8")) + "</style>", html)
    html = re.sub(r'<script src="([^"]+)"></script>', lambda m: "<script>" + embed_assets((ROOT / m.group(1).split("?", 1)[0]).read_text(encoding="utf-8")).replace("</script", "<\\/script") + "</script>", html)
    return html

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Verify current index.html is reproducible")
    parser.add_argument("--standalone", action="store_true", help="Build untracked offline/index.html with all media embedded")
    args = parser.parse_args()
    output = build(args.standalone).encode("utf-8")
    target = ROOT / "offline/index.html" if args.standalone else ROOT / "index.html"
    if args.check:
        if not target.exists() or target.read_bytes() != output:
            raise SystemExit("FAIL: index.html is missing or differs from source")
        print("PASS: portable HTML is reproducible; asset hashes verified")
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(output)
        print(f"Built {target.relative_to(ROOT)} ({len(output):,} bytes); "+("all media embedded" if args.standalone else "keep the adjacent assets folder for offline use"))

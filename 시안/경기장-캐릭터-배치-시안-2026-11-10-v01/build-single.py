"""Bundle this preview into one offline HTML file (same embedding as 구현/.../build.py).

usage: python build-single.py [output.html]
default output: <repo>/deployment-output/경기장-캐릭터-배치-미리보기-2026-11-10-v01.html (git-ignored, ~100MB)
"""
from pathlib import Path
import base64
import hashlib
import json
import re
import sys

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
GAME = REPO / "구현" / "해체해라-2026-10-07-v01"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / "deployment-output" / "경기장-캐릭터-배치-미리보기-2026-11-10-v01.html"
if OUT.exists():
    raise SystemExit(f"Output already exists; choose a new version filename: {OUT}")

manifest = json.loads((GAME / "assets/manifest.json").read_text(encoding="utf-8"))
urls = {}
for name, meta in manifest.items():
    binary = (GAME / name).read_bytes()
    if hashlib.sha256(binary).hexdigest() != meta["sha256"]:
        raise SystemExit(f"Asset modified: {name}")
    urls[name] = f'data:{meta["mime"]};base64,{base64.b64encode(binary).decode("ascii")}'

def embed(text):
    return re.sub(r"(?:\.\./)?assets/[a-f0-9]{20}\.(?:png|woff2?|ttf|mp3|wav)", lambda m: urls[m.group(0).removeprefix("../")], text)

def source(href):
    # Every href in index.html is relative to the <base>, i.e. the game folder.
    text = (GAME / href.split("?", 1)[0]).resolve().read_text(encoding="utf-8")
    if href.split("?", 1)[0].endswith("/placement.js"):
        image = base64.b64encode((HERE / "체형별-뼈대-원본-v01.png").read_bytes()).decode("ascii")
        text = 'window.PlacementAtlasURL="data:image/png;base64,' + image + '";\n' + text
    return text

html = (HERE / "index.html").read_text(encoding="utf-8")
html = re.sub(r"<base [^>]*>", "", html)
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: "<style>" + embed(source(m.group(1))) + "</style>", html)
html = re.sub(r'<script src="([^"]+)"></script>', lambda m: "<script>" + embed(source(m.group(1))).replace("</script", "<\\/script") + "</script>", html)
if re.search(r'(?:src|href)="(?!data:)[^"#]', html):
    raise SystemExit("An external file reference is still left in the bundle")
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_bytes(html.encode("utf-8"))
print(f"Built {OUT} ({OUT.stat().st_size:,} bytes)")

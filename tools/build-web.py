"""Package the current game for static hosting without changing the offline game."""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / "구현" / "해체해라-2026-10-07-v01"
OUT = ROOT / "dist"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def build():
    html = (GAME / "dev.html").read_text(encoding="utf-8")
    files = {}
    for match in re.finditer(r'(?:src|href)="(src/[^"?]+)(?:\?[^" ]*)?"', html):
        name = match.group(1)
        files[name] = (GAME / name).read_bytes()

    manifest = json.loads((GAME / "assets/manifest.json").read_text(encoding="utf-8"))
    for name, metadata in manifest.items():
        data = (GAME / name).read_bytes()
        if digest(data) != metadata["sha256"]:
            raise ValueError(f"Asset hash mismatch: {name}")
        files[name] = data

    # New source revisions receive new URLs, while hashed images remain cacheable.
    html = re.sub(
        r'((?:src|href)=")((?:src/)[^"?]+)(?:\?[^" ]*)?"',
        lambda m: f'{m[1]}{m[2]}?v={digest(files[m[2]])[:12]}"',
        html,
    )
    files["index.html"] = html.encode("utf-8")
    for name, data in files.items():
        if len(data) >= 25 * 1024 * 1024:
            raise ValueError(f"Static asset too large: {name}")
        if name.endswith((".css", ".js")):
            for asset in re.findall(r"(?:\.\./)?(assets/[a-f0-9]{20}\.(?:png|woff2?|ttf|mp3|wav))", data.decode("utf-8")):
                if asset not in files:
                    raise ValueError(f"Missing asset in {name}: {asset}")

    # Refuse stale or unrelated output instead of recursively deleting a directory.
    existing = {p.relative_to(OUT).as_posix() for p in OUT.rglob("*") if p.is_file()}
    unexpected = existing - files.keys()
    if unexpected:
        raise ValueError(f"Unexpected output files; preserve and inspect: {sorted(unexpected)}")
    for name, data in files.items():
        target = OUT / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    print(json.dumps({"output": "dist", "files": len(files), "bytes": sum(map(len, files.values())), "assets_verified": len(manifest), "index_bytes": len(files["index.html"])}, ensure_ascii=True))


if __name__ == "__main__":
    build()

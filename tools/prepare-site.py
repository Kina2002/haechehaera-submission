"""Create a small Sites source checkout without the large offline Git history."""
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "deployment-output" / "site"

if __name__ == "__main__":
    if not (ROOT / "dist/index.html").is_file():
        raise SystemExit("Run python tools/build-web.py first")
    source_files = {p.relative_to(ROOT / "dist") for p in (ROOT / "dist").rglob("*") if p.is_file()}
    stale = {p.relative_to(SITE / "dist") for p in (SITE / "dist").rglob("*") if p.is_file()} - source_files
    if stale:
        raise SystemExit(f"Preserve and inspect stale Site files: {sorted(map(str, stale))}")
    for name in sorted(source_files):
        destination = SITE / "dist" / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / "dist" / name, destination)
    (SITE / ".openai").mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / ".openai/hosting.json", SITE / ".openai/hosting.json")
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    (SITE / "README.md").write_text(
        "# Haechehaera static release\n\n"
        "Generated from https://github.com/Kina2002/haechehaera-submission\n\n"
        f"Source commit: {commit}\n\n"
        "Run tools/build-web.py and tools/prepare-site.py in the source repository to update this checkout.\n",
        encoding="utf-8",
    )
    print(f"Prepared {len(source_files)} static files in {SITE}")

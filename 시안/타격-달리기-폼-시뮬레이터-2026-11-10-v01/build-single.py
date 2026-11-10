"""Build the offline motion-study HTML; never overwrite an existing result."""
from pathlib import Path
import re
import sys

HERE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "폼-비교-시뮬레이터-v01.html"
if OUT.exists():
    raise SystemExit(f"Output already exists; choose another filename: {OUT}")

html = (HERE / "index.html").read_text(encoding="utf-8")
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: "<style>" + (HERE / m.group(1)).read_text(encoding="utf-8") + "</style>", html)
html = re.sub(r'<script src="([^"]+)"></script>', lambda m: "<script>" + (HERE / m.group(1)).read_text(encoding="utf-8").replace("</script", "<\\/script") + "</script>", html)
if re.search(r'(?:src|href)="(?!data:)[^"#]', html):
    raise SystemExit("External file references remain")
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_bytes(html.encode("utf-8"))
print(f"Built {OUT} ({OUT.stat().st_size:,} bytes)")

"""Build the offline motion-study HTML; never overwrite an existing result."""
from pathlib import Path
import re
import sys
import base64
import json

HERE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "폼-비교-시뮬레이터-v02.html"
if OUT.exists():
    raise SystemExit(f"Output already exists; choose another filename: {OUT}")

html = (HERE / "index.html").read_text(encoding="utf-8")
def data_url(name):
    return 'data:image/png;base64,' + base64.b64encode((HERE / name).read_bytes()).decode('ascii')
files = {'bat-a':'타격-기준캐릭터-B01-B03-v01.png', 'bat-b':'타격-기준캐릭터-B04-B06-v01.png', 'run-a':'달리기-기준캐릭터-R01-R03-v01.png', 'run-b':'달리기-기준캐릭터-R04-R06-v01.png'}
html = html.replace('<script src="motion.js">', '<script>window.FormAtlasURLs=' + json.dumps({k:data_url(v) for k,v in files.items()}) + ';</script>\n<script src="motion.js">')
html = html.replace('src="기준-캐릭터.png"', 'src="' + data_url('기준-캐릭터.png') + '"')
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: "<style>" + (HERE / m.group(1)).read_text(encoding="utf-8") + "</style>", html)
html = re.sub(r'<script src="([^"]+)"></script>', lambda m: "<script>" + (HERE / m.group(1)).read_text(encoding="utf-8").replace("</script", "<\\/script") + "</script>", html)
if re.search(r'(?:src|href)="(?!data:)[^"#]', html):
    raise SystemExit("External file references remain")
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_bytes(html.encode("utf-8"))
print(f"Built {OUT} ({OUT.stat().st_size:,} bytes)")

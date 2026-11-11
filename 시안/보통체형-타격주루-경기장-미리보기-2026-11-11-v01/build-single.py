from pathlib import Path
import base64,json,sys
here=Path(__file__).resolve().parent
dest=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else here/'보통체형-타격주루-경기장-미리보기-v01.html'
if dest.exists():
    raise SystemExit('Output already exists. Choose a new output filename.')
assets={}
for key,name in {'atlas':'보통형-동작24칸-v02.png','low':'경기장-낮은공격-배경-v01.png','high':'경기장-높은주루-배경-v01.png'}.items():
    assets[key]='data:image/png;base64,'+base64.b64encode((here/name).read_bytes()).decode('ascii')
html=(here/'index.html').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="preview.css">','<style>'+(here/'preview.css').read_text(encoding='utf-8')+'</style>')
script='window.FLOW_ASSETS='+json.dumps(assets,ensure_ascii=False)+';\n'+(here/'preview.js').read_text(encoding='utf-8')
html=html.replace('<script src="preview.js"></script>','<script>'+script.replace('</script','<\\/script')+'</script>')
dest.parent.mkdir(parents=True,exist_ok=True)
dest.write_text(html,encoding='utf-8')
print(str(dest))
print(dest.stat().st_size)


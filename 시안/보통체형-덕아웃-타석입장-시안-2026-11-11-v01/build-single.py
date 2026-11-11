from pathlib import Path
import base64,json,sys
here=Path(__file__).resolve().parent
old=here.parent/'보통체형-타격주루-경기장-미리보기-2026-11-11-v02'
names={'entrance':'보통형-타석입장24칸-v01.png','field':'경기장-덕아웃입장-배경-v01.png','existing':'보통형-동작24칸-v02.png'}
assets={k:'data:image/png;base64,'+base64.b64encode((here/v).read_bytes()).decode('ascii') for k,v in names.items()}
data=here/'continuation-data.js'
if not data.exists():
    original=(old/'보통체형-타격주루-경기장-미리보기-v02.html').read_text(encoding='utf-8')
    old_bg='data:image/png;base64,'+base64.b64encode((old/'경기장-낮은공격-배경-v01.png').read_bytes()).decode('ascii')
    assert old_bg in original
    child=original.replace(old_bg,assets['field'])
    data.write_text('window.CONTINUATION_HTML='+json.dumps(child,ensure_ascii=False)+';\n',encoding='utf-8')
dest=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else here/'보통체형-덕아웃-타석입장-미리보기-v01.html'
if dest.exists():raise SystemExit('Existing output preserved. Choose a new filename.')
html=(here/'index.html').read_text(encoding='utf-8').replace('<link rel="stylesheet" href="preview.css">','<style>'+(here/'preview.css').read_text(encoding='utf-8')+'</style>')
html=html.replace('<script src="continuation-data.js"></script>','<script>'+data.read_text(encoding='utf-8').replace('</script','<\\/script')+'</script>')
script='window.ENTRY_ASSETS='+json.dumps(assets,ensure_ascii=False)+';\n'+(here/'preview.js').read_text(encoding='utf-8')
html=html.replace('<script src="preview.js"></script>','<script>'+script.replace('</script','<\\/script')+'</script>')
dest.write_text(html,encoding='utf-8');print(dest);print(dest.stat().st_size)

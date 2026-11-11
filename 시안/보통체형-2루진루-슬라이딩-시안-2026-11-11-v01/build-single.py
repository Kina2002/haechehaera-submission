from pathlib import Path
import base64,json,sys
here=Path(__file__).resolve().parent
dest=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else here/'보통체형-2루진루-슬라이딩-미리보기-v01.html'
if dest.exists(): raise SystemExit('Choose a new filename; existing output is preserved.')
names={'runner':'보통형-2루동작24칸-v01.png','tagger':'2루수-포구태그8칸-v01.png','standing':'보통형-동작24칸-v02.png','thrower':'수비-포구송구6칸-v02.png','field':'경기장-2루주루-배경-v01.png'}
assets={k:'data:image/png;base64,'+base64.b64encode((here/v).read_bytes()).decode('ascii') for k,v in names.items()}
html=(here/'index.html').read_text(encoding='utf-8').replace('<link rel="stylesheet" href="preview.css">','<style>'+(here/'preview.css').read_text(encoding='utf-8')+'</style>')
for name in ['tag-rules.js','preview.js']:
 script=(('window.SECOND_ASSETS='+json.dumps(assets,ensure_ascii=False)+';\\n') if name=='preview.js' else '')+(here/name).read_text(encoding='utf-8')
 script=script.replace('\\n', '\\n',0) if False else script
 if name=='preview.js': script=script.replace(';\\n',';\n',1)
 html=html.replace('<script src="'+name+'"></script>','<script>'+script.replace('</script','<\\/script')+'</script>')
dest.write_text(html,encoding='utf-8');print(dest);print(dest.stat().st_size)

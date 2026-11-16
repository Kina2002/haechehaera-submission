from pathlib import Path
from PIL import Image
import json,shutil,numpy as np,base64
here=Path(__file__).resolve().parent
d=json.loads((here/'분리-요청문.json').read_text(encoding='utf-8'))
result=[]
for f in d['files']:
 p=here/f['file']
 if not p.exists():shutil.copy2(f['source'],p)
 a=np.array(Image.open(p).convert('RGBA'));h,w=a.shape[:2]
 result.append({'layer':f['key'],'file':f['file'],'size':[w,h],'alphaZero':int((a[:,:,3]==0).sum()),'alphaOpaque':int((a[:,:,3]>200).sum())})
if not (here/'분리전-확인그림.png').exists():shutil.copy2(d['reference'],here/'분리전-확인그림.png')
(here/'원본-크기-알파-확인.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
payload={f['key']:'data:image/png;base64,'+base64.b64encode((here/f['file']).read_bytes()).decode() for f in d['files']}
payload['original']='data:image/png;base64,'+base64.b64encode((here/'분리전-확인그림.png').read_bytes()).decode()
(here/'보통형-머리몸-분리확인-v01.html').write_text((here/'preview-template.html').read_text(encoding='utf-8').replace('/*DATA*/',json.dumps(payload)),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))

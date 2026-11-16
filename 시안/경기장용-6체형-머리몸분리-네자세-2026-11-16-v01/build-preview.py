from pathlib import Path
import json,base64,hashlib
here=Path(__file__).resolve().parent
d=json.loads((here/'측정-원본.json').read_text(encoding='utf-8'))
n=d['bodies'][0]['frames'][0]
d['normalHeight']=n['footY']-d['heads'][0]['opaqueTop']
d['pixelScale']=40/d['normalHeight']
d['headFile']='공통머리-4자세-보통형원본.png'
d['coordinateNote']='source pixels; body uniform import scale per type; head scale always 1; normal standing = 40 display pixels'
notes=['기준 비례 그대로','두꺼운 몸통·팔·허벅지','좁은 몸통·가느다란 팔다리','넓은 어깨·좁은 허리','긴 몸통과 팔다리','짧은 몸통과 팔다리']
for i,b in enumerate(d['bodies']):
 f=b['frames'][0]
 b['referenceHeightRatio']=d['referenceHeights'][i]/d['referenceHeights'][0]
 b['standingDisplayHeight']=40*b['referenceHeightRatio']
 b['bodyScale']=(d['normalHeight']*b['referenceHeightRatio']-(n['neck'][1]-d['heads'][0]['opaqueTop']))/(f['footY']-f['neck'][1])
 b['note']=notes[i]
 b['sha256']=hashlib.sha256((here/b['file']).read_bytes()).hexdigest()
 for p,f in enumerate(b['frames']):
  hf=d['heads'][p];nf=d['bodies'][0]['frames'][p]
  f['headOffsetFromNeck']=[hf['crop'][0]-nf['neck'][0],hf['crop'][1]-nf['neck'][1]]
d['headSha256']=hashlib.sha256((here/d['headFile']).read_bytes()).hexdigest()
(here/'머리몸-배치기준-v01.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
assets={f:'data:image/png;base64,'+base64.b64encode((here/f).read_bytes()).decode() for f in [d['headFile']]+[b['file'] for b in d['bodies']]}
html=(here/'preview-template.html').read_text(encoding='utf-8').replace('__DATA__',json.dumps(d,ensure_ascii=False)).replace('__ASSETS__',json.dumps(assets,ensure_ascii=False))
(here/'index.html').write_text(html,encoding='utf-8')
print(json.dumps([{'id':b['id'],'bodyScale':round(b['bodyScale'],4),'height':round(b['standingDisplayHeight'],2)} for b in d['bodies']],ensure_ascii=False))

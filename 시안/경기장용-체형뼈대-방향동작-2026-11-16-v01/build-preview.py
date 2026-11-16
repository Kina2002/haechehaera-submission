from pathlib import Path
from PIL import Image
import numpy as np,json,base64
from analyze_atlas import components
HERE=Path(__file__).resolve().parent
TYPES=[('normal','보통형',40,'보통형-몸동작24칸-v01.png'),('heavy','단단한 중량형',42,'중량형-몸동작24칸-v01.png'),('slender','날렵형',43,'날렵형-몸동작24칸-v01.png'),('broad','어깨 넓은형',42,'어깨넓은형-몸동작24칸-v02.png'),('tall','키 큰형',46,'키큰형-몸동작24칸-v01.png'),('compact','작고 단정한형',36,'작은형-몸동작24칸-v01.png')]
NAMES=['정면 서기','앞 오른쪽 서기','뒤 오른쪽 서기','뒷모습 서기','걷기 1','걷기 2','걷기 3','걷기 4','걷기 5','걷기 6','무릎 굽힘','상체 숙임','달리기 1','달리기 2','달리기 3','달리기 4','달리기 5','달리기 6','타격 준비','체중 싣기','맞히기','스윙 마무리','배트 내리기','빈손 서기']
DIRS=['F','FR','BR','B']+['FR']*8+['BR']*6+['FR']*6
TILTS=[0,0,0,0,2,-2,-4,2,-2,-4,3,14,-7,-8,-6,-8,-6,-5,0,3,-5,-8,0,0]
EXPECTED_X=[147,144,137,125,121,119,148,129,130,129,125,137,150,150,148,143,134,134,149,137,111,89,116,120]
def bounds(mask):
 y,x=np.where(mask);return [int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)]
heads=np.array(Image.open(HERE/'공통-빈머리-4방향-v01.png').convert('RGBA')).astype(int)
hh,hw=heads.shape[0]//2,heads.shape[1]//2
head_data={}
for i,d in enumerate(['F','FR','BR','B']):
 c=heads[i//2*hh:(i//2+1)*hh,i%2*hw:(i%2+1)*hw]; mask=c[:,:,3]>200
 x0,y0,x1,y1=bounds(mask);y,x=np.where(mask & (np.indices(mask.shape)[0]>y1-12))
 head_data[d]={'rect':[i%2*hw+x0,i//2*hh+y0,x1-x0,y1-y0],'neckX':round(float(np.median(x))-x0,2),'height':16,'width':18}
bodies=[]
for key,name,height,file in TYPES:
 if not (HERE/file).exists():continue
 a=np.array(Image.open(HERE/file).convert('RGBA')).astype(int);h,w=a.shape[:2]; cw,ch=w//6,h//4
 frames=[]
 for f in range(24):
  c=a[f//6*ch:(f//6+1)*ch,f%6*cw:(f%6+1)*cw]
  skin=(c[:,:,3]>200)&(c[:,:,0]>170)&(c[:,:,1]>90)&(c[:,:,2]>70)&(c[:,:,0]-c[:,:,1]>18)&(c[:,:,1]-c[:,:,2]<75)
  cand=[b for b in components(skin) if b[2]-b[0]<cw*.18 and b[3]-b[1]<ch*.10 and b[1]<ch*.52 and b[1]>ch*.10 and b[0]>cw*.20 and b[2]<cw*.82]
  if not cand:raise ValueError((key,f,'no neck'))
  # The neck is a small isolated skin component above the white collar.
  # Bats/hands are larger; every selected component is recorded for review.
  b=min(cand,key=lambda b:abs((b[0]+b[2])/2-cw*EXPECTED_X[f]/256)+abs(b[1]-ch*.30)*.3)
  neck=[(b[0]+b[2])/2,b[1]]
  bb=bounds(c[:,:,3]>200)
  lower=(c[:,:,3]>200)&(np.indices(skin.shape)[0]>ch*.65)
  ly,lx=np.where(lower)
  ground=int(ly.max()+1)
  if f in range(12,18):ground=max(ground,round(ch*.86))
  frames.append({'name':NAMES[f],'rect':[f%6*cw,f//6*ch,cw,ch],'neck':neck,'neckComponent':b,'anchor':[neck[0],ground],'bounds':bb,'direction':DIRS[f],'tilt':TILTS[f]})
 # Keep the actor's horizontal root fixed through a sequence. The head follows
 # the recorded neck instead of re-centering every pose on its neck.
 for f in frames:f['anchor'][0]=frames[0]['neck'][0]
 scale=(height-16+.75)/(frames[0]['anchor'][1]-frames[0]['neck'][1])
 bodies.append({'id':key,'name':name,'file':file,'height':height,'scale':round(scale,6),'frames':frames})
data={'version':'v01','grid':64,'baseline':58,'rootX':32,'headOverlap':.75,'headFile':'공통-빈머리-4방향-v01.png','heads':head_data,'bodies':bodies}
(HERE/'뼈대-기준점-v01.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
template=(HERE/'preview-template.html').read_text(encoding='utf-8')
data['urls']={f:'data:image/png;base64,'+base64.b64encode((HERE/f).read_bytes()).decode() for f in [data['headFile']]+[b['file'] for b in bodies]}
(HERE/'경기장용-체형뼈대-비교-v01.html').write_text(template.replace('/*__DATA__*/',json.dumps(data,ensure_ascii=False)),encoding='utf-8')
print(json.dumps({'bodies':len(bodies),'frames':sum(len(b['frames']) for b in bodies),'headDirections':list(head_data)},ensure_ascii=False))

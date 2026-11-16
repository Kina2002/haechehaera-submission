from pathlib import Path
from PIL import Image
import json,base64,shutil,numpy as np
here=Path(__file__).resolve().parent
chosen=json.loads((here/'selected.json').read_text(encoding='utf-8'))
dest=here/chosen['selected']
if not dest.exists():shutil.copy2(chosen['source'],dest)
orig=np.array(Image.open(here/'기존-6체형-기준원본.png').convert('RGBA'));new=np.array(Image.open(dest).convert('RGBA'))
def bound(a,region,white=False):
 x0,y0,x1,y1=region;c=a[y0:y1,x0:x1]
 mask=(c[:,:,3]>200)
 if white:mask&=(np.min(c[:,:,:3],axis=2)<195)
 y,x=np.where(mask)
 return [int(x.min()+x0),int(y.min()+y0),int(x.max()+x0+1),int(y.max()+y0+1)]
original=bound(orig,[40,150,320,780])
regions=[[70,150,380,780],[400,150,805,780],[815,150,1370,780],[1380,150,1720,780]]
bounds=[bound(new,r,True) for r in regions]
report={'originalStandingBounds':original,'newPoseBounds':bounds,'scaleReference':'Only standing full-height normalized to40px for comparison. Same new-body scale applied to all four poses. Source image bytes unmodified.','approval':'awaiting user comparison; five other bodies on hold','background':'white','generatedSize':[new.shape[1],new.shape[0]]}
(here/'비교-표시기준.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
def data(name):return 'data:image/png;base64,'+base64.b64encode((here/name).read_bytes()).decode()
payload={'original':data('기존-6체형-기준원본.png'),'new':data(chosen['selected']),'originalBounds':original,'bounds':bounds}
html=(here/'review-template.html').read_text(encoding='utf-8').replace('/*DATA*/',json.dumps(payload,ensure_ascii=False))
(here/'보통형-원본과-네자세-비교-v01.html').write_text(html,encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))

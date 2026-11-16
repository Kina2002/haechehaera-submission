from pathlib import Path
from PIL import Image
import numpy as np,json
from collections import deque
HERE=Path(__file__).resolve().parent
def components(mask):
    seen=np.zeros(mask.shape,bool); out=[]
    for y,x in zip(*np.where(mask)):
        if seen[y,x]:continue
        q=deque([(int(y),int(x))]);seen[y,x]=1;pts=[]
        while q:
            yy,xx=q.popleft();pts.append((yy,xx))
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny,nx=yy+dy,xx+dx
                if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=1;q.append((ny,nx))
        if len(pts)>15:
            a=np.array(pts);out.append([int(a[:,1].min()),int(a[:,0].min()),int(a[:,1].max()+1),int(a[:,0].max()+1),len(pts)])
    return out
if __name__=='__main__':
    a=np.array(Image.open(HERE/'보통형-몸동작24칸-v01.png').convert('RGBA')).astype(int)
    for f in range(24):
        c=a[f//6*256:(f//6+1)*256,f%6*256:(f%6+1)*256]
        skin=(c[:,:,3]>200)&(c[:,:,0]>170)&(c[:,:,1]>90)&(c[:,:,2]>70)&(c[:,:,0]-c[:,:,1]>18)&(c[:,:,1]-c[:,:,2]<75)
        print(f,components(skin))

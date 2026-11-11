from pathlib import Path
from PIL import Image
import json
here=Path(__file__).resolve().parent
im=Image.open(here/'보통형-2루동작24칸-v01.png').convert('RGBA')
anchors={9:(25,230),10:(28,230),11:(33,230),15:(12,197),16:(18,207),17:(27,210),18:(58,225),19:(62,227),20:(85,230),21:(94,231),22:(61,223),23:(128,225)}
rows=[]
for f,(x,y) in anchors.items():
 rgba=im.getpixel(((f%6)*256+x,(f//6)*256+y))
 assert rgba[3]>200, f'Frame {f}: anchor is outside the visible shoe or hand'
 rows.append({'frame':f,'anchor':[x,y],'rgba':rgba,'opaque':rgba[3]>200})
print(json.dumps(rows))

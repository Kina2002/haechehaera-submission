/* Detailed management and small match sprites share identity, not drawing scale. */
(()=>{'use strict';
const D=window.LAB_DATA,P=window.PLAYER_PARTS;
for(let body=0;body<6;body++)for(let row=0;row<6;row++)for(let col=0;col<6;col++){const f=D.bodies[body].motion.frames[row][col],bounds=window.FRAME_BOUNDS[body][row*6+col];f.rect=bounds.rect;f.runs=bounds.runs;}
const names={hair:'머리카락',beard:'수염',wear:'안경·선글라스',black:'아이블랙',eyes:'눈 모양',nose:'코',brows:'눈썹',mouth:'입'};
const variants={hair:['아주 짧은 머리','짧은 옆머리','귀를 덮는 머리','목덜미 머리','귀 뒤로 넘긴 장발','웨이브 장발','낮게 묶은 머리'],beard:['짧은 턱수염','턱선 수염','짧은 전체 수염','풍성한 전체 수염','콧수염+턱수염'],wear:['얇은 둥근 안경','얇은 사각 안경','브라운 안경','반무테 안경','스포츠 선글라스','파란 스포츠 선글라스'],black:['짧은 아이블랙','긴 아이블랙','번진 아이블랙'],eyes:['기본 눈','차분한 눈','부드러운 눈','날카로운 눈','온화한 눈','반쯤 감은 눈'],nose:['기본 코','둥근 코','넓은 코','작은 코','긴 코','각진 코'],brows:['가는 일자','굵은 일자','완만한 아치','각진 눈썹','짧은 눈썹','완만한 사선'],mouth:['기본 입','옅은 미소','일자 입','부드러운 입','도톰한 입','얇은 입']};
const prefixes={hair:'H',beard:'F',wear:'A',black:'I',eyes:'E',nose:'N',brows:'B',mouth:'M'};
const colors=['#35251f','#211c1b','#693f29','#a76736','#d7b566','#aaa9ae','#923b29'];
const eyeColors=[null,'#734428','#3182c4','#489e61','#c79835','#87969f'];
const decoded=new Map(),crops=new Map(),cache=new Map();
function canvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c;}
function ctx(c){const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;return g;}
async function image(key,uri){if(decoded.has(key))return decoded.get(key);const im=new Image();im.src=uri;await im.decode();decoded.set(key,im);return im;}
function crop(key,rect,tone){const id=[key,...rect,tone||''].join(':');if(crops.has(id))return crops.get(id);const c=canvas(rect[2],rect[3]),g=ctx(c);g.drawImage(decoded.get(key),...rect,0,0,c.width,c.height);const px=g.getImageData(0,0,c.width,c.height),d=px.data,target=tone?.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16));for(let i=0;i<d.length;i+=4){if(d[i+3]<48){d[i+3]=0;continue;}if(target){const lum=(d[i]+d[i+1]+d[i+2])/3;const f=Math.max(.32,Math.min(1.65,lum/65));for(let j=0;j<3;j++)d[i+j]=Math.min(245,target[j]*f);}}g.putImageData(px,0,0);if(crops.size>1000)crops.clear();crops.set(id,c);return c;}
function ident(kind,index){return prefixes[kind]+String(index+1).padStart(2,'0');}
function iris(sp,color){if(!color)return sp;const c=canvas(sp.width,sp.height),g=ctx(c);g.drawImage(sp,0,0);const im=g.getImageData(0,0,c.width,c.height),d=im.data,t=color.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16));for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4,r=d[i],v=d[i+1],b=d[i+2];if(y>c.height*.25&&y<c.height*.88&&d[i+3]>160&&r>v*1.12&&v>b*1.04&&r<160&&r>35){const f=Math.max(.32,Math.min(.95,(r+v+b)/220));for(let j=0;j<3;j++)d[i+j]=t[j]*f;}}g.putImageData(im,0,0);return c;}
function selected(config){const a={hair:-1,beard:-1,wear:-1,black:-1,eyes:0,nose:3,brows:0,mouth:0,...config.parts};for(const k of ['eyes','nose','brows','mouth'])if(a[k]<0)a[k]=k==='nose'?3:0;return a;}
function dir(f,row,col){if(!f.eyes?.length)return 3;if(row===5&&col===3)return 2;if(['1,4','2,1','4,5','5,4','5,5'].includes(row+','+col))return 3;return f.view==='front'?0:1;}
function eyes(g,f,px,py,color){if(!color)return;const t=color.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16));for(const e of f.eyes||[]){const x=Math.round(e[0]+px),y=Math.round(e[1]+py),w=Math.max(1,Math.round(e[2])),h=Math.max(1,Math.round(e[3]));const im=g.getImageData(x,y,w,h),d=im.data;for(let i=0;i<d.length;i+=4){const lum=(d[i]+d[i+1]+d[i+2])/3;if(d[i+3]>100&&Math.max(d[i],d[i+1],d[i+2])<110&&lum>7)for(let j=0;j<3;j++)d[i+j]=t[j]*(.7+lum/160);}g.putImageData(im,x,y);}}

const baseCache=new Map();
function rgb(hex){return hex.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16));}
function blue(r,g,b){return b>r*1.40&&b>g*1.15&&b>35;}
// A cap landmark is measured inside this body's actual pose, not a shared head rectangle.
function capBounds(base,face){const g=ctx(base),im=g.getImageData(0,0,base.width,base.height),d=im.data,[fx,fy,fw,fh]=face;let left=base.width,right=0,top=base.height,bottom=0;
 for(let y=Math.max(0,Math.floor(fy-fw));y<Math.min(base.height,fy+fh*.28);y++)for(let x=Math.max(0,Math.floor(fx-fw*.32));x<Math.min(base.width,fx+fw*1.25);x++){const i=(y*base.width+x)*4;if(d[i+3]>96&&blue(d[i],d[i+1],d[i+2])){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
 return right>left?[left,top,right+1,bottom+1]:[fx-fw*.08,fy-fw*.64,fx+fw*1.08,fy+fh*.12];
}
function uniformBase(source,config,face,cap,detail=false){
 const cv=canvas(source.width,source.height),g=ctx(cv);g.drawImage(source,0,0);if(!config.palette)return cv;
 const im=g.getImageData(0,0,cv.width,cv.height),d=im.data,primary=rgb(config.palette.primary),secondary=rgb(config.palette.secondary),skin=rgb(config.palette.skin),[cx,cy,cr,cb]=cap;
 // Locate the detailed jersey's belt; its blue band separates shirt and white trousers.
 let waist=detail?680:0,peak=0;
 if(detail)for(let y=560;y<820;y++){let n=0;for(let x=420;x<600;x++){const i=(y*cv.width+x)*4;if(d[i+3]>160&&blue(d[i],d[i+1],d[i+2]))n++;}if(n>peak){peak=n;waist=y;}}
 const capFloor=new Int32Array(cv.width).fill(-1);
 for(let y=Math.max(0,Math.floor(cy));y<Math.min(cv.height,Math.ceil(cb));y++)for(let x=Math.max(0,Math.floor(cx));x<Math.min(cv.width,Math.ceil(cr));x++){const i=(y*cv.width+x)*4;if(d[i+3]>96&&blue(d[i],d[i+1],d[i+2]))capFloor[x]=y;}
 for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){const i=(y*cv.width+x)*4;if(d[i+3]<96){d[i+3]=0;continue;}const [r,v,b]=[d[i],d[i+1],d[i+2]],inCap=x>=cx&&x<cr&&y>=cy&&y<cb;let target=null,shade=1;
  if(blue(r,v,b)){const bill=inCap&&y>cy+(cb-cy)*.57&&capFloor[x]-y<Math.max(3,(cb-cy)*.17);target=bill||detail&&!inCap&&y<waist?secondary:primary;shade=Math.max(.28,Math.min(1.22,b/170));}
  else if(detail&&r>145&&v>145&&b>145&&Math.max(r,v,b)-Math.min(r,v,b)<65&&y>face[1]+face[3]&&y<waist-16){target=primary;shade=Math.max(.50,Math.min(1.1,(r+v+b)/720));}
  else if(inCap&&Math.min(r,v,b)>175){target=secondary;shade=1;}
  else if(!detail&&Math.min(r,v,b)>170&&y>face[1]+face[3]&&y<face[1]+face[3]*1.62){target=secondary;shade=.95;}
  else if(r>185&&v>108&&b>48&&r>v*1.13&&v>b*1.14&&r-v<100&&v-b<105){target=skin;shade=Math.max(.66,Math.min(1.05,r/245));}
  if(target)for(let k=0;k<3;k++)d[i+k]=Math.min(255,Math.round(target[k]*shade));
 }
 g.putImageData(im,0,0);return cv;
}
function motionRect(kind,index,face,eye,cap){const [x,y,w,h]=face,[ex,ey,ew,eh]=eye,cx=ex+ew/2;
 if(kind==='hair'){const cw=cap[2]-cap[0],width=cw*[1.01,1.04,1.06,1.07,1.11,1.16,1.24][index],top=cap[1]+(cap[3]-cap[1])*.13,end=y+h*[.48,.65,.85,1.15,1.70,1.75,1.78][index];return[(cap[0]+cap[2]-width)/2,top,width,end-top];}
 if(kind==='beard')return [[cx-w*.15,y+h*.88,w*.30,h*.29],[cx-w*.41,y+h*.46,w*.82,h*.64],[cx-w*.40,y+h*.52,w*.80,h*.59],[cx-w*.44,y+h*.51,w*.88,h*.78],[cx-w*.25,y+h*.64,w*.50,h*.48]][index];
 if(kind==='wear')return [ex-ew*.19,ey-eh*.01,ew*1.38,eh*1.14];
 if(kind==='black')return [ex,ey+eh*.99,ew,Math.max(2,h*(index===1?.09:.14))];
}
function renderMotion(config){const b=D.bodies[config.body],row=config.row||0,col=config.col||0,f=b.motion.frames[row][col],r=f.rect,pad=40,cv=canvas(r[2]-r[0]+pad*2,r[3]-r[1]+pad*2),g=ctx(cv),px=pad-r[0],py=pad-r[1],face=[f.face[0]+px,f.face[1]+py,f.face[2],f.face[3]],sel=selected(config),direction=dir(f,row,col);
 const raw=canvas(cv.width,cv.height),rg=ctx(raw);rg.save();rg.beginPath();for(const [y,x,end]of f.runs)rg.rect(x+px,y+py,end-x,1);rg.clip();rg.drawImage(decoded.get(b.motion.base),r[0],r[1],r[2]-r[0],r[3]-r[1],pad,pad,r[2]-r[0],r[3]-r[1]);rg.restore();const cap=capBounds(raw,face),baseCanvas=uniformBase(raw,config,face,cap);
 const es=(f.eyes||[]).map(e=>[e[0]+px,e[1]+py,e[2],e[3]]),ex=es.length?Math.min(...es.map(e=>e[0])):face[0]+face[2]*.12,ey=es.length?Math.min(...es.map(e=>e[1])):face[1]+face[3]*.1,ew=es.length?Math.max(...es.map(e=>e[0]+e[2]))-ex:face[2]*.76,eh=es.length?Math.max(...es.map(e=>e[1]+e[3]))-ey:face[3]*.3,eye=[ex,ey,ew,eh],rects={};
 if(row===5&&col===3&&es.length<2)eye.splice(0,4,face[0]+face[2]*.20,face[1]+face[3]*.08,face[2]*.66,face[3]*.26);
 const angle=es.length===2?Math.atan2((es[1][1]+es[1][3]/2)-(es[0][1]+es[0][3]/2),(es[1][0]+es[1][2]/2)-(es[0][0]+es[0][2]/2)):(f.tilt||0)*Math.PI/180;
 function part(kind){const index=sel[kind];if(index<0)return;const p=P.motion[ident(kind,index)];if(!p)return;const q=motionRect(kind,index,face,eye,cap);rects[kind]=q;if(es.length<2&&kind!=='hair'&&!(row===5&&col===3))return;
  // A hidden/downward face must not acquire floating spectacles or a beard on its helmet.
  const sp=crop('motion-'+ident(kind,index),p.views[direction],['hair','beard'].includes(kind)?colors[config.hairColor||0]:null),[x,y,w,h]=q;g.save();if(kind!=='hair'){const cx=eye[0]+eye[2]/2,cy=eye[1]+eye[3]/2;g.translate(cx,cy);g.rotate(angle);g.drawImage(sp,x-cx,y-cy,w,h);}else g.drawImage(sp,x,y,w,h);g.restore();}
 part('hair');g.drawImage(baseCanvas,0,0);eyes(g,f,px,py,eyeColors[config.eyeColor||0]);
 const prior=g.getImageData(0,0,cv.width,cv.height);part('beard');part('black');part('wear');
 // Keep helmet/cap pixels above the face in front of accessories, in every team colour.
 const merged=g.getImageData(0,0,cv.width,cv.height),orig=ctx(raw).getImageData(0,0,cv.width,cv.height).data;
 for(let y=0;y<Math.min(cv.height,Math.ceil(face[1]+face[3]*.35));y++)for(let x=0;x<cv.width;x++){const i=(y*cv.width+x)*4;if(orig[i+3]>96&&blue(orig[i],orig[i+1],orig[i+2]))for(let k=0;k<4;k++)merged.data[i+k]=prior.data[i+k];}g.putImageData(merged,0,0);
 return{canvas:cv,baseCanvas,face,eye:{box:eye,eyes:es},rects,cap,foot:[pad+(r[2]-r[0])/2,pad+r[3]-r[1]],pose:f};
}
const detailCaps=[[421,128,598,250],[435,32,587,128],[415,101,602,219],[423,45,602,157],[403,91,617,223],[418,41,606,148]];
function detailHairRect(body,index){const [x,y,r,bottom]=detailCaps[body],f=P.detail.bodies[body].face,w=r-x,cx=(x+r)/2,width=w*[1.055,1.08,1.10,1.13,1.16,1.24,1.13][index],top=y+(bottom-y)*.08,end=f[1]+f[3]*[.30,.55,.87,1.14,1.34,1.38,1.36][index];return[cx-width/2,top,width,end-top];}
function renderDetail(config){const b=P.detail.bodies[config.body],sel=selected(config),cv=canvas(1024,1536),g=ctx(cv),rects={};
 function part(kind){const index=sel[kind];if(index<0)return;const id=ident(kind,index),p=P.detail.parts[id];if(!p)return;let sp=crop('detail-'+id,p.region,['hair','beard','brows'].includes(kind)?colors[config.hairColor||0]:null);if(kind==='eyes')sp=iris(sp,eyeColors[config.eyeColor||0]);const q=kind==='hair'&&!config.legacyHair?detailHairRect(config.body,index):b.placements[id];g.drawImage(sp,...q);rects[kind]=q;}
 const baseCanvas=uniformBase(decoded.get('detail-body-'+config.body),config,b.face,detailCaps[config.body],true);part('hair');g.drawImage(baseCanvas,0,0);for(const k of ['eyes','brows','nose','mouth','beard','black','wear'])part(k);

 return {canvas:cv,baseCanvas,face:b.face,eye:{box:b.placements.E01,eyes:[]},rects,foot:[512,1456],pose:{rect:[0,0,1024,1536],face:b.face}};
}
let ready;
window.CharacterRenderer={names,variants,hairColors:colors.map((c,i)=>[String(i),c]),eyeColors:eyeColors.map((c,i)=>[String(i),c]),
 async init(){if(!ready)ready=(async()=>{for(const b of D.bodies)await image(b.motion.base,D.assets[b.motion.base].uri);for(const [id,p]of Object.entries(P.motion))await image('motion-'+id,p.uri);for(const [id,p]of Object.entries(P.detail.parts))await image('detail-'+id,p.uri);for(let i=0;i<6;i++)await image('detail-body-'+i,P.detail.bodies[i].uri);})();await ready;},
 async prepare(){await this.init();},async images(){await this.init();return{};},
 render(config){const key=JSON.stringify(config);if(cache.has(key))return cache.get(key);const out=config.mode==='detail'?renderDetail(config):renderMotion(config);if(cache.size>360)cache.clear();cache.set(key,out);return out;},clear(){cache.clear();},
 diagnostics(){return{bodies:6,posesPerBody:36,motionVariants:Object.keys(P.motion).length,directions:4,detailVariants:Object.keys(P.detail.parts).length,decoded:decoded.size};}
};
})();


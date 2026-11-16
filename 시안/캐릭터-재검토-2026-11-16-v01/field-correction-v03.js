/* Draw separate approved head/body layers on an integer pixel grid. */
(()=>{'use strict';
const D=structuredClone(window.FIELD_ASSETS_V13),R=window.PortraitCorrectionV01,images={},cache=new Map(),heads=new Map(),irisCenters=new Map(),frames=new Map();
D.assets.normalRun.uri='보통형-달리기-팔교대-수정후보-v01.png';
D.assets.normalRun.rects=D.assets.normalRun.rects.map((f,i)=>({...f,rect:[Math.floor(i%3*1263/3),Math.floor(Math.floor(i/3)*1246/3),421,Math.ceil(1246/3)]}));
const bodyIds=['compact','tall','normal','broad','slender','heavy'];
const names=['정면 서기','사선 서기','옆 서기','뒤 사선 서기','뒤 서기','리드','걷기 A','걷기 B','뒤 걷기 A','뒤 걷기 B','달리기 A','달리기 B','달리기 C','달리기 D','뒤 달리기 A','뒤 달리기 B','감속','베이스 대기','타격 준비','힘 모으기','타격 접촉','타격 마무리','체크 스윙','배트 정리','발 슬라이딩 진입','발 슬라이딩','발 접촉 회복','머리 슬라이딩 진입','머리 슬라이딩','손 접촉 회복','고개 숙임','타구 확인','사구 반응','양팔 환호','주먹 환호','가리키기','높은 마무리','마무리 정리','첫발 준비'];
const directions=[0,1,4,2,3,1,1,1,3,3,1,1,1,1,3,3,1,1,1,1,1,2,1,1,1,1,1,1,1,1,0,1,1,0,1,1,2,2,1];
const angles={24:-15,25:-18,26:-8,27:40,28:60,29:30,30:0,32:-10};
for(let i=0;i<8;i++){names.push('달리기 주기 '+(i+1));directions.push(1);}
for(let i=0;i<12;i++){names.push(['어깨 높이','다리 높이 들기','낮게 모으기'][i%3]+' · '+['준비','힘 모으기','맞힘','마무리'][Math.floor(i/3)]);directions.push(i<9?1:2);}
for(let i=0;i<18;i++){names.push(['열혈','소심','허세','느긋','엉뚱','투덜'][i%6]+' 버릇 '+(Math.floor(i/6)+1));directions.push(0);}
Object.assign(angles,{63:10,69:-10,73:-6,75:-10});
const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
const rgb=s=>s.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));
function tint(t,l){const f=l<95?.40:l<140?.58:l<185?.78:l<220?.92:1.05;return t.map(v=>Math.max(0,Math.min(255,Math.round(v*f))));}
function pixels(key,rect,w,h,mat,a){
 const k=JSON.stringify([key,rect,w,h,mat,a.skin,a.hairColor,a.eyeColor,a.primary,a.secondary]);if(cache.has(k))return cache.get(k);
 const c=make(w,h),g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;g.drawImage(images[key],...rect,0,0,w,h);
 const im=g.getImageData(0,0,w,h),d=im.data,skin=rgb(R.skinColors[a.skin]||R.skinColors[0]),hair=rgb(R.hairColors[a.hairColor]||R.hairColors[0]),eye=rgb(R.eyeColors[a.eyeColor]||R.eyeColors[0]),team=rgb(a.primary||'#126451'),secondary=rgb(a.secondary||'#f4f5ed');
 for(let i=0;i<d.length;i+=4){if(d[i+3]<160){d[i]=d[i+1]=d[i+2]=d[i+3]=0;continue;}d[i+3]=255;const r=d[i],v=d[i+1],b=d[i+2],l=.2126*r+.7152*v+.0722*b;let out;
  if(mat==='skin')out=tint(skin,l);
  else if(mat==='hair')out=tint(hair,Math.min(255,l*2.1+25));
  else if(mat==='body'){
   if(r>v+10&&v>b+10&&b/Math.max(v,1)>.58)out=tint(skin,l);
   else if(v>r*1.22&&v>b*.84)out=tint(team,Math.min(255,l*2.2+20));
   else if(l>110&&Math.max(r,v,b)-Math.min(r,v,b)<35)out=tint(secondary,l);
  }else if(mat==='cloth')out=tint(team,Math.min(255,l*2.2+20));
  else if(mat==='eyes'){
   if(b>r*1.3&&b>v*1.06)out=tint(eye,Math.min(255,l*2+30));
   else if(r>v+10&&v>b+10)out=tint(skin,l);
  }
  else if(mat==='mouth')out=tint(skin.map((v,j)=>v*(j===0?.82:.57)),220);
  if(out)for(let j=0;j<3;j++)d[i+j]=out[j];else for(let j=0;j<3;j++)d[i+j]=Math.round(d[i+j]/32)*32;
 }
 if(mat==='eyes'){
  const sourceKey=key+':'+rect.join(',');let centers=irisCenters.get(sourceKey);
  if(!centers){const raw=make(rect[2],rect[3]),ctx=raw.getContext('2d',{willReadFrequently:true});ctx.drawImage(images[key],...rect,0,0,raw.width,raw.height);const rgba=ctx.getImageData(0,0,raw.width,raw.height).data,groups=[[0,0,0],[0,0,0]];
   for(let y=0;y<raw.height;y++)for(let x=0;x<raw.width;x++){const i=(y*raw.width+x)*4;if(rgba[i+3]>=160&&rgba[i+2]>rgba[i]*1.3&&rgba[i+2]>rgba[i+1]*1.06){const q=groups[x<raw.width/2?0:1];q[0]+=x;q[1]+=y;q[2]++;}}
   centers=groups.filter(q=>q[2]).map(q=>[q[0]/q[2]/raw.width,q[1]/q[2]/raw.height]);irisCenters.set(sourceKey,centers);
  }
  const color=tint(eye,225);for(const[x,y]of centers){const i=(Math.min(h-1,Math.floor(y*h))*w+Math.min(w-1,Math.floor(x*w)))*4;for(let j=0;j<3;j++)d[i+j]=color[j];d[i+3]=255;}
 }
 if(mat==='body'){
  const seen=new Uint8Array(w*h);for(let q=0;q<w*h;q++){if(seen[q]||!d[q*4+3])continue;const list=[],todo=[q];seen[q]=1;while(todo.length){const n=todo.pop();list.push(n);const x=n%w,y=Math.floor(n/w);for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++){const j=yy*w+xx;if(!seen[j]&&d[j*4+3]){seen[j]=1;todo.push(j);}}}if(list.length<3)for(const n of list)d[n*4+3]=0;}
 }
 g.putImageData(im,0,0);if(cache.size>1400)cache.clear();cache.set(k,c);return c;
}
function head(a,direction=0,headwear='cap',bow=false,facingLeft=false){
 const p={hair:-1,beard:-1,wear:-1,black:-1,eyes:0,nose:0,brows:0,mouth:0,...a.parts},key=JSON.stringify([a,direction,headwear,bow,facingLeft]);if(heads.has(key))return heads.get(key);
 const c=make(25,24),g=c.getContext('2d');g.imageSmoothingEnabled=false;
 const draw=(key,i,x,y,w,h,m)=>g.drawImage(pixels(key,D.assets[key].rects[i].rect,w,h,m,a),x,y);
 if(direction===4){
  // An actual profile uses the previously unused profile source, one near eye,
  // and no substitute front/three-quarter hair, cap or accessory layers.
  draw('directions',1,4,6,17,15,'skin');
  const eye=Math.max(0,p.eyes)%6,eh=[4,3,4,4,3,3][eye];
  const eyePair=pixels('features',D.assets.features.rects[6+eye].rect,10,eh,'eyes',a);
  g.drawImage(eyePair,0,0,5,eh,15,11,5,eh);
  const brows=pixels('features',D.assets.features.rects[12+Math.max(0,p.brows)%6].rect,10,1,'hair',a);
  g.drawImage(brows,0,0,5,1,15,10,5,1);
  draw('features',18+Math.max(0,p.nose)%6,20,15,1,1,'skin');
  draw('features',24+Math.max(0,p.mouth)%6,18,17,2,1,'mouth');
  heads.set(key,c);return c;
 }
 const baseRect=bow?D.reference.heads[3].crop:D.reference.heads[0].crop;
 if(direction===0)g.drawImage(pixels('baseHeads',baseRect,17,15,'skin',a),4,6);
 else draw('directions',direction===1?0:direction===2?2:3,4,6,17,15,'skin');
 if(direction<2){const ex=direction===1?8:7,ey=11,eye=Math.max(0,p.eyes)%6;
  draw('features',eye+(direction===1?6:0),ex,ey,10,[4,3,4,4,3,3][eye],'eyes');
  draw('features',12+Math.max(0,p.brows)%6,ex,ey-2,10,1,'hair');
  const nose=Math.max(0,p.nose)%6,mouth=Math.max(0,p.mouth)%6,mouthHeight=[1,2,1,2,2,2][mouth];
  draw('features',18+nose,direction===1?16:12,15,[1,2,2,1,1,2][nose],1,'skin');
  draw('features',24+mouth,direction===1?13:11,19-mouthHeight,3,mouthHeight,'mouth');
  if(p.beard>=0)g.drawImage(R.renderPart('equipment',p.beard,9,4,'hair',a),direction===1?10:8,18);
  if(p.black>=0)g.drawImage(R.renderPart('equipment',12+p.black,10,2,null,a),ex,16);
 }
 if(p.hair>=0){const hair=p.hair%7,w=hair>=3?21:20,h=[12,12,13,16,19,18,19][hair];g.save();
  // Keep the face opening clear below the fringe; long hair stays at the sides.
  if(direction<2){g.beginPath();g.rect(0,0,25,24);g.rect(direction===1?9:7,11,direction===1?12:11,10);g.clip('evenodd');}
  draw('hair',direction*7+hair,2,3,w,h,'hair');g.restore();}
 if(headwear==='helmet'&&direction===1)draw('sideHelmet',0,2,0,22,17,'cloth');
 else if(headwear!=='none')draw('caps',(headwear==='helmet'?4:0)+direction,2,0,22,headwear==='helmet'?17:12,'cloth');
 if(direction<2&&p.wear>=0&&!a.eyePatch)g.drawImage(R.renderPart('equipment',5+p.wear,12,4,null,a),direction===1?7:6,11);
 if(direction<2&&a.eyePatch){
  const side=a.eyePatchSide==='right'?'right':'left',visible=direction===0||side===(facingLeft?'left':'right');
  if(visible){g.save();if((side==='right')!==facingLeft){g.translate(25,0);g.scale(-1,1);}g.drawImage(R.renderPart('equipment',11,12,6,null,a),7,10);g.restore();}
 }
 if(heads.size>600)heads.clear();heads.set(key,c);return c;
}
function render(a={},pose=0,options={}){
 a={body:2,skin:0,hairColor:2,eyeColor:0,...a};const frameKey=JSON.stringify([a,pose,options]);if(frames.has(frameKey))return frames.get(frameKey);const c=make(64,64),g=c.getContext('2d');g.imageSmoothingEnabled=false;
 const type=bodyIds[a.body]||'normal';let rect,neck,foot,s,key,targetHeight=25.55,direction=options.direction??directions[pose]??0;
 if(!options.reference){
  const suffix=pose>=59?'Personality':pose>=47?'BatForms':pose>=39?'Run':pose>=36?'Follow':'Motion';
  const index=pose>=59?pose-59:pose>=47?pose-47:pose>=39?pose-38:pose>=36?pose-36:pose;
  key=type+suffix;if(!D.assets[key])throw Error('Missing body atlas: '+key);
  const f=D.assets[key].rects[index];rect=f.rect;neck=f.neck;foot=f.footY;
  const baseline=D.reference.bodies.find(b=>b.id===type),target=(baseline.frames[0].footY-baseline.frames[0].neck[1])*baseline.bodyScale*D.reference.pixelScale;
  targetHeight=target;
  const stand=D.assets[type+'Motion'].rects[0];s=target/(stand.footY-stand.neck[1]);
  if(pose>=36){const scale=D.assets[key].rects[suffix==='Personality'?3:0];s=target/(scale.footY-scale.neck[1])*(suffix==='BatForms'?.97:1);}
 }else{
  const b=D.reference.bodies.find(b=>b.id===type),index=options.referencePose??(pose===30?3:pose>=18&&pose<=23?2:pose>=6&&pose<=15?1:0),f=b.frames[index];
  key='body-'+type;rect=f.crop;neck=f.neck;foot=f.footY;s=b.bodyScale*D.reference.pixelScale;
 }
 const ground=57,bodyX=Math.round(32+(rect[0]-neck[0])*s),bw=Math.max(1,Math.round(rect[2]*s)),bh=Math.max(1,Math.round(rect[3]*s));
 const body=pixels(key,rect,bw,bh,'body',a),h=head(a,direction,options.headwear??a.headwear??'cap',pose===30,!!options.flip);
 if(body.lastOpaqueRow===undefined){const d=body.getContext('2d').getImageData(0,0,bw,bh).data;let last=0;for(let y=0;y<bh;y++)for(let x=0;x<bw;x++)if(d[(y*bw+x)*4+3])last=y;body.lastOpaqueRow=last;}
 const unliftedY=ground-1-body.lastOpaqueRow,unliftedNeck=Math.round(unliftedY+(neck[1]-rect[1])*s);
 const lift=options.lift??([42,46].includes(pose)?Math.max(1,unliftedNeck-Math.round(ground-targetHeight)+1):pose===65?4:0);
 const bodyY=unliftedY-lift,ny=Math.round(bodyY+(neck[1]-rect[1])*s);
 if(options.flip){g.translate(64,0);g.scale(-1,1);}
 if(options.layer!=='head')g.drawImage(body,bodyX,bodyY);
 if(options.layer!=='body'){g.save();g.translate(32,ny+1);g.rotate((angles[pose]||0)*Math.PI/180);g.drawImage(h,-12,-21);g.restore();}
 if(options.layer!=='head'&&[31,32,33,34,65,66,68].includes(pose)){g.save();g.beginPath();g.rect(0,0,64,ny);g.clip();g.drawImage(body,bodyX,bodyY);g.restore();}
 // Rasterize the tilted head back onto the native grid; canvas rotations otherwise
 // leave fractional-alpha edge coverage even with nearest-neighbor sampling.
 const raster=g.getImageData(0,0,64,64);for(let i=3;i<raster.data.length;i+=4)raster.data[i]=raster.data[i]<160?0:255;g.putImageData(raster,0,0);
 // Anatomical contacts are measured from the body layer, never the hat or hair.
 if(!body.contacts){const d=body.getContext('2d').getImageData(0,0,bw,bh).data;let toe=-1,hand=-1,handYs=[];
  for(let y=0;y<bh;y++)for(let x=0;x<bw;x++)if(d[(y*bw+x)*4+3]){if(y===body.lastOpaqueRow)toe=Math.max(toe,x);if(x>hand){hand=x;handYs=[y];}else if(x===hand)handYs.push(y);}
  body.contacts={foot:[Math.max(0,toe),body.lastOpaqueRow],hand:[hand,handYs[Math.floor(handYs.length/2)]]};
 }
 const point=p=>[options.flip?63-bodyX-p[0]:bodyX+p[0],bodyY+p[1]];
 const out={canvas:c,neck:[32,ny],foot:[32,ground],contacts:{foot:point(body.contacts.foot),hand:point(body.contacts.hand)},bodyBounds:[bodyX,bodyY,bw,bh],body:type,pose,headDirection:direction,headView:['front','frontThreeQuarter','backThreeQuarter','back','profile'][direction],needsArt:pose===30?['bow-head','bow-hair','bow-headwear']:direction===4?['profile-hair','profile-headwear','profile-accessories']:[],name:names[pose],referenceOnly:!!options.reference};if(frames.size>1800)frames.clear();frames.set(frameKey,out);return out;
}
// Neighboring cells may contain a few generated edge pixels. Select the connected
// body at source resolution before nearest-neighbor sampling, so small hands are kept.
function isolateBodies(im,cols,rows){
 const c=make(im.width,im.height),g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const x0=Math.round(col*c.width/cols),y0=Math.round(row*c.height/rows),w=Math.round((col+1)*c.width/cols)-x0,h=Math.round((row+1)*c.height/rows)-y0;
  const image=g.getImageData(x0,y0,w,h),d=image.data,seen=new Uint8Array(w*h);let largest=[];
  for(let p=0;p<w*h;p++){if(seen[p]||d[p*4+3]<160)continue;let list=[],queue=[p];seen[p]=1;while(queue.length){const n=queue.pop();list.push(n);const x=n%w,y=Math.floor(n/w);for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++){const j=yy*w+xx;if(!seen[j]&&d[j*4+3]>=160){seen[j]=1;queue.push(j);}}}if(list.length>largest.length)largest=list;}
  const keep=new Uint8Array(w*h);for(const p of largest)keep[p]=1;for(let p=0;p<w*h;p++)if(!keep[p])d[p*4+3]=0;g.putImageData(image,x0,y0);
 }return c;
}
let ready=false,promise;
async function init(){if(!promise)promise=(async()=>{await R.init();await Promise.all(Object.entries(D.assets).map(async([key,a])=>{const im=new Image();im.src=a.uri;await im.decode();images[key]=/(Motion|Follow|Run|BatForms|Personality)$/.test(key)?isolateBodies(im,...a.grid):im;}));ready=true;})();return promise;}
const availablePoses=body=>Array.from({length:77},(_,i)=>i).filter(i=>D.assets[(bodyIds[body]||'normal')+(i>=59?'Personality':i>=47?'BatForms':i>=39?'Run':i>=36?'Follow':'Motion')]);
window.FieldCorrectionV01={headViews:['front','frontThreeQuarter','backThreeQuarter','back','profile'],init,head,render,names,directions,availablePoses,equipment:(index,w,h,a={})=>pixels('equipment',D.assets.equipment.rects[index].rect,w,h,'neutral',a),get ready(){return ready;},diagnostics(){return{ready,framesPerBody:bodyIds.map((_,i)=>availablePoses(i).length),bodies:bodyIds,headDirections:5,missingHeadViews:['bow'],profileEquipmentReady:false,headSource:D.reference.headSha256};}};
})();

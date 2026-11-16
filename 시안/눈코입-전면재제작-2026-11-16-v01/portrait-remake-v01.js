/* Original modular portraits. Saved appearance indices remain stable. */
(()=>{'use strict';
const A=structuredClone(window.PORTRAIT_ASSETS_V13),images={},partsCache=new Map(),portraits=new Map();
delete A.features;
const skinColors=['#ffd3a5','#e9b383','#d79b6c','#b87a51','#8d583d','#624130'];
const hairColors=['#35251f','#211c1b','#693f29','#a76736','#d7b566','#aaa9ae','#923b29'];
const eyeColors=['#3b2823','#734428','#3182c4','#489e61','#c79835','#87969f'];
const bodyOrder=[5,4,0,3,2,1]; // Existing IDs: compact,tall,normal,broad,slender,heavy.
const bodyNames=['작은형','키큰형','보통형','어깨넓은형','날렵형','중량형'];
const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
const rgb=s=>s.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));
const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
function shade(t,l){const f=l<90?.38:l<130?.55:l<170?.74:l<215?.91:1.06;return t.map(x=>clamp(Math.round(x*f),0,255));}
function part(kind,index,w,h,material,config){
 const key=JSON.stringify([kind,index,w,h,material,config]);if(partsCache.has(key))return partsCache.get(key);
 const cv=make(w,h),g=cv.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;
 const rect=A[kind].rects[index];g.drawImage(images[kind],...rect,0,0,w,h);
 const im=g.getImageData(0,0,w,h),d=im.data,skin=rgb(skinColors[config.skin]||skinColors[0]),hair=rgb(hairColors[config.hairColor]||hairColors[0]),eye=rgb(eyeColors[config.eyeColor]||eyeColors[0]),primary=rgb(config.primary||'#126451'),secondary=rgb(config.secondary||'#f4f5ed');
 for(let i=0;i<d.length;i+=4){
  if(d[i+3]<160){d[i]=d[i+1]=d[i+2]=d[i+3]=0;continue;}d[i+3]=255;
  const r=d[i],v=d[i+1],b=d[i+2],l=.2126*r+.7152*v+.0722*b;let out;
  if(material==='skin')out=shade(skin,l);
  else if(material==='hair')out=shade(hair,Math.min(255,l*2.1+25));
  else if(material==='cloth')out=r>v+10&&v>b+10?shade(skin,l):v>r*1.16&&v>b*.85?shade(primary,clamp(l*2.25+20,0,255)):shade(secondary,l);
  else if(material==='eyes'){
   if(b>r*1.25&&b>v*1.05)out=shade(eye,clamp(l*2+30,0,255));
   else if(r>v*1.15&&v>b*1.07)out=shade(skin,l);
  }else if(material==='mouth')out=l>170?shade(skin,l):shade(skin.map((x,j)=>x*(j===0?.78:.62)),l*1.15);
  if(out)for(let c=0;c<3;c++)d[i+c]=out[c];
  else for(let c=0;c<3;c++)d[i+c]=Math.round(d[i+c]/17)*17;
 }
 g.putImageData(im,0,0);if(partsCache.size>1800)partsCache.clear();partsCache.set(key,cv);return cv;
}
function render(config={}){
 if(!ready)throw Error('PortraitRendererV13 is not ready');
 const a={body:2,skin:0,hairColor:2,eyeColor:0,...config},p={hair:1,beard:-1,wear:-1,black:-1,eyes:0,nose:0,brows:0,mouth:0,...config.parts};
 const key=JSON.stringify([a,p]);if(portraits.has(key))return portraits.get(key);
 const cv=make(128,160),g=cv.getContext('2d');g.imageSmoothingEnabled=false;
 const put=(k,n,x,y,w,h,m)=>{if(n>=0)g.drawImage(part(k,n,w,h,m,a),x,y);};
 const hairSizes=[[64,57],[69,58],[74,61],[76,72],[76,96],[80,86],[74,91]];
 const hi=p.hair>=0&&p.hair<7?p.hair:-1,hs=hairSizes[hi];
 // Long hair is behind the neck and uniform; the front overlay is clipped below the jaw.
 if(hi>=3)put('hair',hi,64-Math.round(hs[0]/2),5,...hs,'hair');
 put('head',0,35,12,58,94,'skin');
 const bi=bodyOrder[clamp(a.body,0,5)],bw=[120,128,108,128,113,110][bi],bh=[82,82,82,82,87,82][bi];
 put('bodies',bi,64-Math.round(bw/2),78,bw,bh,'cloth');
 NewFaceParts.drawPortrait(g,a,p);
 if(p.beard>=0&&p.beard<5){const q=[[58,78,12,7],[41,65,46,22],[40,65,48,28],[39,64,50,30],[53,67,22,16]][p.beard];put('equipment',p.beard,...q,'hair');}
 if(p.black>=0&&p.black<3)put('equipment',12+p.black,43,59,42,5,null);
 if(hi>=0){g.save();g.beginPath();g.rect(0,0,128,86);g.clip();put('hair',hi,64-Math.round(hs[0]/2),5,...hs,'hair');g.restore();}
 if(a.headwear==='cap')put('hair',7,28,4,72,42,'cloth');
 if(a.headwear==='helmet')put('equipment',15,27,3,75,65,'cloth');
 if(p.wear>=0&&p.wear<6&&!a.eyePatch)put('equipment',5+p.wear,39,47,50,[19,13,17,14,16,16][p.wear],null);
 if(a.eyePatch){g.save();if(a.eyePatchSide==='right'){g.translate(128,0);g.scale(-1,1);}put('equipment',11,39,43,50,26,null);g.restore();}
 const result={canvas:cv,face:[35,12,58,76],crop:[23,0,82,112],body:a.body,identity:{body:a.body,skin:a.skin,hairColor:a.hairColor,eyeColor:a.eyeColor,parts:{...p}}};
 if(portraits.size>300)portraits.clear();portraits.set(key,result);return result;
}
let ready=false,promise;
async function init(){if(!promise)promise=(async()=>{await NewFaceParts.init();await Promise.all(Object.entries(A).map(async([key,asset])=>{const im=new Image();im.src=asset.uri;await im.decode();images[key]=im;}));ready=true;})();return promise;}
window.PortraitRemakeV01={init,render,renderPart:part,skinColors,hairColors,eyeColors,bodyNames,get ready(){return ready;},clear(){portraits.clear();partsCache.clear();},diagnostics(){return{ready,assets:Object.keys(images).length,heads:1,bodies:6,faceParts:24,hair:7,equipment:16,nativeSize:[128,160]};}};
if(false&&window.CharacterRenderer){const previous=CharacterRenderer.init.bind(CharacterRenderer);CharacterRenderer.init=async()=>{await Promise.all([previous(),init()]);};}
})();

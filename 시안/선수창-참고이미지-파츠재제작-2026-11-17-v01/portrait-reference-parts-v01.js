/* Player-window parts remade from the user's 2026-11-17 reference. Original PNG is preserved. */
(()=>{'use strict';
const M=window.PORTRAIT_REFERENCE_PARTS,cache=new Map();
const skin=['#ffd3a5','#e9b383','#d79b6c','#b87a51','#8d583d','#624130'],hair=['#35251f','#211c1b','#693f29','#a76736','#d7b566','#aaa9ae','#923b29'],eyes=['#3b2823','#734428','#3182c4','#489e61','#c79835','#87969f'];
const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h}),rgb=s=>s.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16)),mul=(c,f)=>c.map(v=>Math.min(255,Math.round(v*f)));
let image,mouthImage,promise;
function size(row,rect){
 const rs=row===3?M.mouthV02.rects:M.rects.slice(row*6,row*6+6),mw=Math.max(...rs.map(r=>r[2])),mh=Math.max(...rs.map(r=>r[3]));
 const s=[38/mw,36/mw,7/mh,15/mw][row];
 return [Math.max(1,Math.round(rect[2]*s)),Math.max(1,Math.round(rect[3]*s))];
}
function part(row,index,a={}){
 index=Math.max(0,index??0)%6;const key=JSON.stringify([row,index,a.skin,a.eyeColor,a.hairColor]);if(cache.has(key))return cache.get(key);
 const rect=row===3?M.mouthV02.rects[index]:M.rects[row*6+index],[w,h]=size(row,rect),c=make(w,h),g=c.getContext('2d',{willReadFrequently:true});
 // Area sampling retains the thin diagonal mouth seam. The output below is binary alpha and a fixed palette.
 g.imageSmoothingEnabled=row===3;g.imageSmoothingQuality='high';g.drawImage(row===3?mouthImage:image,...rect,0,0,w,h);
 const im=g.getImageData(0,0,w,h),d=im.data,sc=rgb(skin[a.skin??0]||skin[0]),hc=rgb(hair[a.hairColor??2]||hair[2]),ec=rgb(eyes[a.eyeColor??2]||eyes[2]);let iris=0;
 for(let i=0;i<d.length;i+=4){
  if(d[i+3]<(row===3?96:M.alphaThreshold)){d[i]=d[i+1]=d[i+2]=d[i+3]=0;continue;}
  d[i+3]=255;const r=d[i],v=d[i+1],b=d[i+2],l=.2126*r+.7152*v+.0722*b;let out;
  if(row===0){
   if(b>r*1.15&&b>v*1.03){out=mul(ec,l<80?.52:l<135?.82:1.2);iris++;}
   else if(l>190&&Math.max(r,v,b)-Math.min(r,v,b)<60)out=[247,243,232];
   else if(l>125&&r>v*1.12)out=mul(sc,l>180?.94:.71);
   else if(l<85)out=[55,34,38];
   else if(l<145)out=[100,55,55];
   else out=[206,194,187];
  }else if(row===1)out=mul(hc,l<85?.7:.94);
  else if(row===2)out=mul(sc,l<130?.68:l<185?.85:1.04);
  else {const f=l<110?[.52,.31,.32]:l<170?[.76,.48,.47]:[1,.76,.69];out=sc.map((v,j)=>Math.round(v*f[j]));}
  for(let j=0;j<3;j++)d[i+j]=out[j];
 }
 g.putImageData(im,0,0);c.irisPixels=iris;c.source={row,index,rect};cache.set(key,c);return c;
}
function drawPortrait(g,a,p){
 const put=(row,n,cx,y,bottom=false)=>{const c=part(row,n,a);g.drawImage(c,Math.round(cx-c.width/2),bottom?y-c.height:y);};
 put(0,p.eyes,64,49);put(1,p.brows,64,46,true);put(2,p.nose,64,59);put(3,p.mouth,64,69);
}
function init(){if(!promise)promise=(async()=>{image=new Image();image.src=M.uri;mouthImage=new Image();mouthImage.src=M.mouthV02.uri;await Promise.all([image.decode(),mouthImage.decode()]);})();return promise;}
window.PortraitReferenceParts={init,part,drawPortrait,size,manifest:M,skinColors:skin,eyeColors:eyes};
})();

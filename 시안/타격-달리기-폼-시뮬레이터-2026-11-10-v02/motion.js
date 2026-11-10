/* Displays the reference-character bitmap cels. No procedural replacement avatar. */
(function(){
'use strict';
const files={
 'bat-a':'타격-기준캐릭터-B01-B03-v01.png',
 'bat-b':'타격-기준캐릭터-B04-B06-v01.png',
 'run-a':'달리기-기준캐릭터-R01-R03-v01.png',
 'run-b':'달리기-기준캐릭터-R04-R06-v01.png'
};
const atlases={},cels=new Map();
const starts={bat:[0,.18,.37,.51,.65,.86],run:[0,1/6,2/6,.5,2/3,5/6]};
function phase(kind,t){const p=((t%1)+1)%1;let n=0;starts[kind].forEach((v,i)=>{if(p+1e-8>=v)n=i;});return n;}
function atlasFor(id){const n=Number(id.slice(1))-1;return{key:(id[0]==='B'?'bat':'run')+(n<3?'-a':'-b'),row:n%3};}
const ready=Promise.all(Object.entries(files).map(([key,file])=>new Promise((resolve,reject)=>{
 const im=new Image();im.onload=()=>{atlases[key]=im;resolve();};im.onerror=()=>reject(new Error('그림을 불러오지 못했습니다: '+file));im.src=window.FormAtlasURLs?.[key]||file;
})));
function cel(form,frame,silhouette){
 const a=atlasFor(form.id),key=form.id+':'+frame+':'+silhouette;if(cels.has(key))return cels.get(key);
 const im=atlases[a.key];if(!im)return null;
 const x=Math.round(frame*im.width/6),y=Math.round(a.row*im.height/3),sw=Math.round((frame+1)*im.width/6)-x,sh=Math.round((a.row+1)*im.height/3)-y;
 const c=document.createElement('canvas');c.width=sw;c.height=sh;const g=c.getContext('2d');g.drawImage(im,x,y,sw,sh,0,0,sw,sh);
 if(silhouette){g.globalCompositeOperation='source-in';g.fillStyle='#d1e9db';g.fillRect(0,0,sw,sh);}
 cels.set(key,c);return c;
}
function render(g,w,h,form,kind,t,opt={}){
 g.clearRect(0,0,w,h);g.fillStyle='#092430';g.fillRect(0,0,w,h);
 const ground=Math.round(h*.91);g.fillStyle='#153b3b';g.fillRect(0,ground,w,h-ground);g.fillStyle='#53736a';g.fillRect(0,ground,w,1);
 if(kind==='run'&&!opt.small){
  const offset=((opt.clock||0)*90)%(w*.25);g.fillStyle='#71958b';
  for(let i=-1;i<6;i++)g.fillRect(Math.round(i*w*.25-offset),ground+7,Math.max(12,w*.08),2);
 }
 const c=cel(form,phase(kind,t),!!opt.silhouette);if(!c)return;
 // Every cel has a fixed cell scale; jumping and crouching retain their drawn height.
 const size=opt.small?48:Math.min(w*.94,h*1.02);
 const ratio=size/c.height,dw=Math.round(c.width*ratio),dh=Math.round(size);
 const dx=Math.round((w-dw)/2),dy=Math.round(ground-dh*.94);
 g.save();g.imageSmoothingEnabled=false;
 if(opt.left){g.translate(w,0);g.scale(-1,1);}
 g.drawImage(c,dx,dy,dw,dh);g.restore();
}
window.FormMotion={ready,render,phase,atlasFor,files};
})();

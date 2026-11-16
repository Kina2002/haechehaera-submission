/* New generated facial parts; all consumers share measured atlas crops. */
(()=>{'use strict';
const M=window.NEW_FACE_PARTS,images={},cache=new Map();
const skin=['#ffd3a5','#e9b383','#d79b6c','#b87a51','#8d583d','#624130'],hair=['#35251f','#211c1b','#693f29','#a76736','#d7b566','#aaa9ae','#923b29'],eyes=['#3b2823','#734428','#3182c4','#489e61','#c79835','#87969f'];
const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h}),rgb=s=>s.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16)),mul=(v,f)=>v.map(x=>Math.min(255,Math.round(x*f)));
function size(space,row,rect){
 const rs=M[space].rects.slice(row*6,row*6+6),mw=Math.max(...rs.map(r=>r[2])),mh=Math.max(...rs.map(r=>r[3]));
 let scale=space==='portrait'?[38/mw,38/mw,8/mh,15/mw][row]:[4/mh,9/mw,2/Math.max(mw,mh),3/mw][row];
 if(space==='profile'&&row===1)scale=3/mw;
 if(space==='bow'&&row===0)scale=2/mh;
 return [Math.max(1,Math.round(rect[2]*scale)),Math.max(1,Math.round(rect[3]*scale))];
}
function part(space,row,index,a={}){
 index=Math.max(0,index??0)%6;
 const key=JSON.stringify([space,row,index,a.skin,a.hairColor,a.eyeColor]);if(cache.has(key))return cache.get(key);
 const rect=M[space].rects[row*6+index],[w,h]=size(space,row,rect),c=make(w,h),g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;
 if(space==='profile'&&row===0){g.translate(w,0);g.scale(-1,1);}g.drawImage(images[M[space].rowSources?.[row]||space],...rect,0,0,w,h);g.setTransform(1,0,0,1,0,0);
 const im=g.getImageData(0,0,w,h),d=im.data,sc=rgb(skin[a.skin??0]||skin[0]),hc=rgb(hair[a.hairColor??2]||hair[2]),ec=rgb(eyes[a.eyeColor??0]||eyes[0]),iris=[],dark=[];
 for(let q=0;q<w*h;q++){const i=q*4,r=d[i],v=d[i+1],b=d[i+2],l=.2126*r+.7152*v+.0722*b;
  if(d[i+3]<210){d[i]=d[i+1]=d[i+2]=d[i+3]=0;continue;}d[i+3]=255;let out;
  if(row===0){
   if(b>r*1.15&&b>v*1.03){out=mul(ec,l<95?.62:l<155?.88:1.08);iris.push(q);}
   else if(l>110&&r>v*1.16&&v>b*1.10){d[i+3]=0;continue;}
   else if(l<120){out=[48,35,31];dark.push(q);}
   else out=l>200?[246,241,229]:[203,198,188];
  }else if(row===1)out=mul(hc,.77);
  else if(row===2)out=mul(sc,l<140?.65:.82);
  else out=sc.map((v,i)=>Math.round(v*[.48,.37,.33][i]));
  for(let j=0;j<3;j++)d[i+j]=out[j];
 }
 // Tiny on-field pupils need one stable colored pixel per visible eye.
 const count=space==='profile'?1:2,anchors=[];
 if(row===0){for(let side=0;side<count;side++){
  const candidates=dark.filter(q=>(count===1||Math.min(1,Math.floor((q%w)*2/w))===side)&&Math.floor(q/w)>0);
  const existing=iris.filter(q=>count===1||Math.min(1,Math.floor((q%w)*2/w))===side);
  if(existing.length){anchors.push(existing[Math.floor(existing.length/2)]);continue;}
  if(candidates.length){const cx=count===1?w*.65:w*(side?.76:.24),cy=(h-1)*.63;
   candidates.sort((p,q)=>Math.abs(p%w-cx)+Math.abs(Math.floor(p/w)-cy)*2-Math.abs(q%w-cx)-Math.abs(Math.floor(q/w)-cy)*2);
   const q=candidates[0],color=mul(ec,.72);for(let j=0;j<3;j++)d[q*4+j]=color[j];anchors.push(q);
  }
 }}
 g.putImageData(im,0,0);c.irisAnchors=anchors.map(q=>[q%w,Math.floor(q/w)]);c.source={space,row,index,rect};cache.set(key,c);return c;
}
function drawPortrait(g,a,p){
 const put=(row,i,cx,y,bottom=false)=>{const c=part('portrait',row,i,a);g.drawImage(c,Math.round(cx-c.width/2),bottom?y-c.height:y);};
 put(0,p.eyes,64,49);put(1,p.brows,64,46,true);put(2,p.nose,64,59);put(3,p.mouth,64,70);
}
function drawField(g,a,p,d){
 if(d===2||d===3)return;
 const space=d===4?'profile':d===1?'frontThreeQuarter':'front';
 const eye=part(space,0,p.eyes,a),brow=part(space,1,p.brows,a),nose=part(space,2,p.nose,a),mouth=part(space,3,p.mouth,a);
 const cx=d===4?18:d===1?13:12;
 g.drawImage(eye,Math.round(cx-eye.width/2),13-Math.floor(eye.height/2));
 g.drawImage(brow,Math.round(cx-brow.width/2),10-brow.height);
 g.drawImage(nose,d===4?20:d===1?17:12,15);
 g.drawImage(mouth,d===4?19-mouth.width:d===1?14:Math.round(12-mouth.width/2),17);
}
let promise;function init(){if(!promise)promise=Promise.all(Object.entries(M).map(async([k,m])=>{const im=new Image();im.src=m.uri;await im.decode();images[k]=im;}));return promise;}
window.NewFaceParts={init,part,drawPortrait,drawField,manifest:M,skinColors:skin,eyeColors:eyes};
})();

/* 캐릭터 리디자인 시안 · 2026-11-09 v01 — 코드로 그리는 2.5등신 픽셀 캐릭터
   모양(타원·막대·다각형)을 픽셀 칸마다 "안/밖"으로만 판정해 칠하므로 어떤 크기로 그려도 흐려지지 않고,
   마지막에 바깥 외곽선 1픽셀을 두릅니다. 게임 원본 파일은 바꾸지 않습니다. */
(function(){
'use strict';
const SKIN=['#ffd3a5','#e9b383','#d79b6c','#b87a51','#8d583d','#624130'];
const HAIR=['#1d1a1a','#4a2e1f','#7a4a26','#d1a24f','#a3452b','#8d8d8d'];
const OUT='#17201c',SHOE='#2b2b33',GLOVE='#a5682f',GLOVE_D='#6f4421',BAT='#d9b26f',EYE='#1c1c22',WHITE='#ffffff',BROW='#2a1f1a',MOUTH='#5a2424',TONGUE='#e0707a';
const PROP_COLORS=['#d9433b','#3a6fd8','#f2c53d','#ee81b2'];
const HEAD={rx:21,ry:19};
const NOMINAL=85; // design units from cap top to the ground for the normal body

function shade(hex,f){const n=parseInt(hex.slice(1),16),m=v=>Math.max(0,Math.min(255,Math.round(v*f)));return '#'+[n>>16&255,n>>8&255,n&255].map(v=>m(v).toString(16).padStart(2,'0')).join('');}
const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];

// Body types. legLen and torso radii change the silhouette; the head stays the same chibi size.
const BODIES={
 normal:{name:'보통',legLen:28,trx:13,try:14,sh:12,armR:3.6,legR:4.4},
 big:{name:'크고 둥근 덩치',legLen:25,trx:19.5,try:16,sh:16.5,armR:5.1,legR:6},
 slim:{name:'마르고 다리가 긴 날렵형',legLen:34,trx:10.5,try:13,sh:10.5,armR:3,legR:3.5},
 broad:{name:'어깨 넓은 역삼각형',legLen:29,trx:15,try:14,sh:17.5,armR:4.5,legR:4.4,taper:true},
 tall:{name:'키 크고 길쭉함',legLen:35,trx:12,try:15.5,sh:12,armR:3.4,legR:4},
 small:{name:'작고 단정함',legLen:23,trx:12,try:12.5,sh:11,armR:3.3,legR:4.1},
};
function frame(b){const hipY=98-b.legLen,ty=hipY-b.try+3,neckY=ty-b.try+3,hy=neckY-HEAD.ry+4;return {hipY,ty,neckY,hy};}

// ---- shapes in design units (y grows downward, ground at y=100) ----
function ell(cx,cy,rx,ry,color,ang=0){const c=Math.cos(-ang),s=Math.sin(-ang),R=Math.max(rx,ry);return {bb:[cx-R,cy-R,cx+R,cy+R],color,test(x,y){const dx=x-cx,dy=y-cy,u=dx*c-dy*s,v=dx*s+dy*c;return u*u/(rx*rx)+v*v/(ry*ry)<=1;}};}
// grow(x,y,g): the same shape g units fatter, used to paint a 1-pixel outline around limbs so arms stay visible over the shirt.
function seg(a,b,ra,rb,color,outline=false){const R=Math.max(ra,rb)+1.5,vx=b[0]-a[0],vy=b[1]-a[1],L=vx*vx+vy*vy||1;
 const grow=(x,y,g)=>{let t=((x-a[0])*vx+(y-a[1])*vy)/L;t=t<0?0:t>1?1:t;const dx=x-a[0]-vx*t,dy=y-a[1]-vy*t,r=ra+(rb-ra)*t+g;return dx*dx+dy*dy<=r*r;};
 return {bb:[Math.min(a[0],b[0])-R,Math.min(a[1],b[1])-R,Math.max(a[0],b[0])+R,Math.max(a[1],b[1])+R],color,outline,grow,test:(x,y)=>grow(x,y,0)};}
function poly(pts,color){const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);return {bb:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],color,test(x,y){let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,yi]=pts[i],[xj,yj]=pts[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;}};}
// A band around a limb: the part of a thick bar a->b between t0 and t1 along its length (a cuff, wristband, tape).
function band(a,b,t0,t1,r,color){const vx=b[0]-a[0],vy=b[1]-a[1],L=vx*vx+vy*vy||1;return {bb:[Math.min(a[0],b[0])-r,Math.min(a[1],b[1])-r,Math.max(a[0],b[0])+r,Math.max(a[1],b[1])+r],color,test(x,y){const t=((x-a[0])*vx+(y-a[1])*vy)/L;if(t<t0||t>t1)return false;const dx=x-a[0]-vx*t,dy=y-a[1]-vy*t;return dx*dx+dy*dy<=r*r;}};}
function clip(shape,fn){const t=shape.test;shape.test=(x,y)=>fn(x,y)&&t(x,y);return shape;}
function ring(cx,cy,rx,ry,w,color,fn){return {bb:[cx-rx-w,cy-ry-w,cx+rx+w,cy+ry+w],color,test(x,y){const v=Math.hypot((x-cx)/rx,(y-cy)/ry);return Math.abs(v-1)*Math.min(rx,ry)<=w/2&&(!fn||fn(x,y));}};}
function rot(pts,cx,cy,ang){const c=Math.cos(ang),s=Math.sin(ang);return pts.map(([x,y])=>[cx+(x-cx)*c-(y-cy)*s,cy+(x-cx)*s+(y-cy)*c]);}

function colorsOf(spec){const main=spec.main||'#08654e',sub=spec.sub||'#f6f8f4',skin=SKIN[spec.skin??1],hair=HAIR[spec.hairColor??1];
 // Like the current game: cap and shirt in the main colour, trousers in the second colour, socks in the main colour.
 return {main,mainD:shade(main,.7),capD:shade(main,.6),belt:shade(main,.45),sub,subD:shade(sub,.78),skin,skinD:shade(skin,.84),hair};}

// ---- body parts ----
function arm(S,sh,el,ha,b,c,far,spec){
 const skin=far?c.skinD:c.skin,sleeve=far?c.mainD:c.main,cuff=far?c.subD:c.sub,p=spec.props||{};
 S.push(seg(sh,el,b.armR+.6,b.armR*.92,skin,true));S.push(seg(el,ha,b.armR*.92,b.armR*.85,skin,true));S.push(ell(ha[0],ha[1],b.armR*1.08,b.armR*1.08,skin));
 S.push(seg(sh,lerp(sh,el,.6),b.armR+.6,b.armR+.45,sleeve));
 S.push(band(sh,el,.5,.6,b.armR+.5,cuff));
 if(p.tape){const t=far?'#d2d2cc':'#f4f4ee';S.push(band(el,ha,.12,.38,b.armR*.92+.35,t));S.push(band(el,ha,.5,.76,b.armR*.88+.35,t));}
 if(p.wristband)S.push(band(el,ha,.42,.9,b.armR+1.2,far?shade(p.wristband,.8):p.wristband));
 S.push(ell(ha[0],ha[1],b.armR*1.08,b.armR*1.08,skin));
}
function leg(S,hip,knee,foot,b,c,far,toe){
 const pants=far?c.subD:c.sub,socks=far?c.mainD:c.main,ankle=[foot[0],foot[1]-2.4];
 S.push(seg(hip,knee,b.legR*1.12,b.legR,pants,true));
 S.push(seg(knee,ankle,b.legR,b.legR*.82,socks,true));
 S.push(seg(knee,lerp(knee,ankle,.45),b.legR+.35,b.legR*.95,pants));
 S.push(ell(foot[0]+toe,foot[1],b.legR+2.3,2.9,far?'#45454f':SHOE));
}
function torso(S,cx,cy,b,c,spec,ang=0){
 if(b.taper){const pts=[[cx-b.sh,cy-b.try+3],[cx+b.sh,cy-b.try+3],[cx+b.trx-3,cy+b.try-1],[cx-b.trx+3,cy+b.try-1]];
  S.push(poly(rot(pts,cx,cy,ang),c.main));S.push(ell(cx,cy-b.try*.35,b.sh*.98,b.try*.7,c.main,ang));S.push(ell(cx,cy+b.try*.4,b.trx-1.5,b.try*.6,c.main,ang));}
 else S.push(ell(cx,cy,b.trx,b.try,c.main,ang));
 const by=cy+b.try*.62,bx=cx+Math.sin(ang)*-b.try*.62;
 S.push(clip(ell(bx,by,b.trx+.4,2.4,c.belt,ang),(x,y)=>true));
 if(spec.props?.necklace){/* drawn with the head, so the chain sits over the collar */}
}
// Head: ears, face, hair under the cap, cap crown and brim. Returns layout used later for the face pixels.
function head(S,hx,hy,side,spec,c){
 const {rx,ry}=HEAD,capY=hy-ry*.48,f=spec.feature,p=spec.props||{},hair=spec.hair||'short';
 if(hair==='long')S.push(side?ell(hx-rx*.5,hy+ry*.45,rx*.55,ry*.7,c.hair):ell(hx,hy+ry*.2,rx*1.04,ry*.92,c.hair));
 if(p.necklace)S.push(ring(hx+(side?3:0),hy+ry+2.6,7.5,3.4,1.5,'#f2c53d',(x,y)=>y>hy+ry+1.2));
 const er=f==='bigEars'?5.4:3.6;
 if(!side){S.push(ell(hx-rx*.97,hy+ry*.12,er*.78,er,c.skin));S.push(ell(hx+rx*.97,hy+ry*.12,er*.78,er,c.skin));}
 S.push(ell(hx,hy,rx,ry,c.skin));
 if(side)S.push(ell(hx-rx*.22,hy+ry*.14,er*.78,er,shade(c.skin,.93)));
 if(hair!=='buzz'){
  const low=hair==='long'?.75:hair==='spiky'?.25:-.05;
  if(side)S.push(clip(ell(hx,hy,rx+.5,ry+.5,c.hair),(x,y)=>x<hx-rx*(hair==='long'?.5:.62)&&y>capY-1&&y<hy+ry*low));
  else S.push(clip(ell(hx,hy,rx+.5,ry+.5,c.hair),(x,y)=>Math.abs(x-hx)>rx*(hair==='long'?.8:.9)&&y>capY-1&&y<hy+ry*(low-.08)));
 }
 if(hair==='spiky'){
  const spikes=side?[[[hx-rx*.82,capY+2],[hx-rx*1.42,capY+3],[hx-rx*.98,capY+7]],[[hx-rx*.92,capY+6],[hx-rx*1.38,capY+10],[hx-rx*.86,capY+11]]]
   :[[[hx-rx*.95,capY+2],[hx-rx*1.35,capY+5],[hx-rx*.98,capY+8]],[[hx+rx*.95,capY+2],[hx+rx*1.35,capY+5],[hx+rx*.98,capY+8]]];
  spikes.forEach(t=>S.push(poly(t,c.hair)));
 }
 if(p.headband){S.push(clip(ell(hx,hy,rx+.6,ry+.6,p.headband),(x,y)=>y>capY+2.2&&y<capY+5.4));
  if(side)S.push(poly([[hx-rx*.95,capY+3],[hx-rx*1.45,capY+1.5],[hx-rx*1.5,capY+6],[hx-rx*.95,capY+5.2]],p.headband));}
 // Cap: a rounder crown in the main colour, a thin band in the second colour, a darker brim.
 S.push(clip(ell(hx,hy-1.2,rx+1.1,ry+2,c.main),(x,y)=>y<capY+1.4));
 S.push(clip(ell(hx,hy-1.2,rx+1.1,ry+2,c.sub),(x,y)=>y>=capY&&y<capY+1.4));
 if(side)S.push(ell(hx+rx*.84,capY+1.9,rx*.58,2.8,c.capD));
 else S.push(clip(ell(hx,capY+1.4,rx*.78,3.4,c.capD),(x,y)=>y>capY));
 if(f==='cowlick')S.push(poly([[hx-5,hy-ry-.4],[hx-9,hy-ry-7],[hx-2.5,hy-ry-2.6],[hx+.5,hy-ry-8],[hx+1.5,hy-ry-.4]],c.hair));
 return {hx,hy,capY,side};
}

// ---- poses (facing right except "stand") ----
const POSES={
 stand(S,b,F,c,spec){const hip=b.trx*.42;
  leg(S,[-hip,F.hipY],[-hip-.4,F.hipY+b.legLen*.5],[-hip-.9,97.2],b,c,false,0);
  leg(S,[hip,F.hipY],[hip+.4,F.hipY+b.legLen*.5],[hip+.9,97.2],b,c,false,0);
  torso(S,0,F.ty,b,c,spec);
  const sx=Math.max(b.sh,b.trx-1.5); // arms hang just outside a round belly
  arm(S,[-sx,F.neckY+4],[-sx-3,F.ty+2],[-sx-3.4,F.ty+10.5],b,c,false,spec);
  arm(S,[sx,F.neckY+4],[sx+3,F.ty+2],[sx+3.4,F.ty+10.5],b,c,false,spec);
  return head(S,0,F.hy,false,spec,c);},
 ready(S,b,F,c,spec){const d=6;
  leg(S,[-2,F.hipY+d],[-8,F.hipY+d+b.legLen*.42],[-9.5,97.2],b,c,true,2);
  arm(S,[2,F.neckY+d+5],[6,F.ty+d+5],[11,F.ty+d+12],b,c,true,spec);
  torso(S,3,F.ty+d,b,c,spec,.26);
  leg(S,[5,F.hipY+d],[13.5,F.hipY+d+b.legLen*.36],[12.5,97.2],b,c,false,2);
  const h=head(S,8,F.hy+d+3.5,true,spec,c);
  arm(S,[7.5,F.neckY+d+5],[12.5,F.ty+d+5],[17,F.ty+d+11],b,c,false,spec);
  S.push(ell(19.5,F.ty+d+11.5,6.2,5.4,GLOVE,-.3));S.push(ell(20.5,F.ty+d+11,3.4,2.8,GLOVE_D,-.3));
  return h;},
 bat(S,b,F,c,spec){const hands=[-8,F.neckY+2];
  leg(S,[-4,F.hipY],[-9,F.hipY+b.legLen*.5],[-12,97.2],b,c,true,2);
  // The bat points up and back, clear of the big head.
  S.push(seg(hands,[-31,F.neckY-27],1.6,3,BAT));
  arm(S,[-3,F.neckY+5],[-11,F.neckY+9.5],hands,b,c,true,spec);
  torso(S,0,F.ty,b,c,spec,-.04);
  leg(S,[4,F.hipY],[8.5,F.hipY+b.legLen*.5],[11.5,97.2],b,c,false,2);
  const h=head(S,3,F.hy,true,spec,c);
  arm(S,[5,F.neckY+5],[1,F.neckY+12.5],[-4.5,F.neckY+3],b,c,false,spec);
  return h;},
 run(S,b,F,c,spec){const L=b.legLen;
  leg(S,[0,F.hipY],[-6,F.hipY+L*.55],[-15,97],b,c,true,2);
  arm(S,[3,F.neckY+5],[12,F.neckY+11],[17,F.neckY+5],b,c,true,spec);
  torso(S,4,F.ty+1,b,c,spec,.22);
  leg(S,[5,F.hipY],[15,F.hipY+L*.3],[12,F.hipY+L*.76],b,c,false,2);
  const h=head(S,9,F.hy+2,true,spec,c);
  arm(S,[6.5,F.neckY+5],[-2,F.neckY+12],[-7,F.neckY+7],b,c,false,spec);
  return h;},
};

// ---- face pixels (personality = brows, eyes, mouth; feature and glasses) ----
function face(P,k,h,spec){
 const R=HEAD.rx*k,cx=P.X(h.hx),cy=P.Y(h.hy),pers=spec.personality||'calm',p=spec.props||{};
 // Big chibi eyes: about a fifth of the head wide, a third tall, so expressions survive at field size.
 const ew=R<8?1:R<12?2:3,eh=R<8?2:R<12?3:4,gap=R<11?1:2;
 const eyes=h.side?[Math.round(cx+R*.12),Math.round(cx+R*.58)]:[Math.round(cx-R*.38),Math.round(cx+R*.38)];
 const eyeTop=Math.round(cy+R*.06),mx=Math.round(h.side?cx+R*.4:cx),my=Math.round(cy+R*.52),bigEye=h.side?1:0;
 eyes.forEach((ex,i)=>{const x0=ex-Math.floor(ew/2);
  if(pers==='calm'){P.rect(x0,eyeTop+eh-1,ew+(ew<2?1:0),1,EYE);return;}
  if(pers==='odd'&&i===bigEye){P.rect(x0-1,eyeTop-1,ew+2,eh+1,WHITE);P.rect(x0,eyeTop,ew,Math.max(1,eh-1),EYE);return;}
  P.rect(x0,eyeTop,ew,eh,EYE);if(ew>=2&&eh>=3)P.set(x0,eyeTop,WHITE);
 });
 if(p.glasses)eyes.forEach((ex,i)=>{const x0=ex-Math.floor(ew/2)-1,y0=eyeTop-1,w=ew+2,hh=eh+2,G='#26262b',cut=w>=4&&hh>=5?1:0; // rounded rims
  P.rect(x0+cut,y0,w-2*cut,1,G);P.rect(x0+cut,y0+hh-1,w-2*cut,1,G);P.rect(x0,y0+cut,1,hh-2*cut,G);P.rect(x0+w-1,y0+cut,1,hh-2*cut,G);
  if(i===0)P.line(x0+w,y0+1,eyes[1]-Math.floor(ew/2)-2,y0+1,G);});
 const by=eyeTop-gap-1,bw=ew+(R<9?1:2);
 eyes.forEach((ex,i)=>{const toward=i===0?1:-1,x0=ex-Math.floor(bw/2),x1=x0+bw-1;let yo=by,yi=by;
  if(pers==='hot')yi=by+1;
  if(pers==='shy')yi=by-1;
  if(pers==='brag'&&i===1){yo=by-2;yi=by-1;}
  if(pers==='grumpy'){yo=by+1;yi=by+1;}
  if(pers==='calm'){yo=by-1;yi=by-1;}
  const xo=toward>0?x0:x1,xi=toward>0?x1:x0;P.line(xo,yo,xi,yi,BROW);if(R>=15)P.line(xo,yo-1,xi,yi-1,BROW);
 });
 const mw=Math.max(2,Math.round(R*.3)),m0=mx-Math.floor(mw/2);
 if(pers==='hot'){const mh=Math.max(2,Math.round(R*.22));P.rect(m0,my-1,mw,mh,MOUTH);if(mh>=3)P.rect(m0+1,my+mh-2,Math.max(1,mw-2),1,TONGUE);if(spec.feature==='gapTooth'&&mw>=3){P.rect(m0,my-1,mw,1,WHITE);P.set(m0+Math.floor(mw/2),my-1,MOUTH);}}
 else if(pers==='shy')P.rect(m0+(mw>2?1:0),my,Math.max(1,mw-(mw>2?2:0)),1,MOUTH);
 else if(pers==='brag'){P.rect(m0,my,mw-1,1,MOUTH);P.set(m0+mw-1,my-1,MOUTH);}
 else if(pers==='calm'){P.rect(m0+1,my,Math.max(1,mw-2),1,MOUTH);P.set(m0,my-1,MOUTH);P.set(m0+mw-1,my-1,MOUTH);}
 else if(pers==='odd'){P.rect(m0,my,mw,1,MOUTH);const t=Math.max(1,Math.round(R*.12));P.rect(m0+Math.floor(mw/2),my+1,t,t,TONGUE);}
 else if(pers==='grumpy'){P.rect(m0+1,my-1,Math.max(1,mw-2),1,MOUTH);P.set(m0,my,MOUTH);P.set(m0+mw-1,my,MOUTH);}
 const cheekY=eyeTop+eh+(R<10?0:1),near=h.side?eyes[1]+1:eyes[1]+1,far=h.side?eyes[0]-1:eyes[0]-1;
 const f=spec.feature;
 if(f==='freckles')[near,far].forEach(x=>{P.set(x-1,cheekY,'#b0703f');if(R>=10)P.set(x+1,cheekY,'#b0703f');});
 if(f==='blush')[near,far].forEach(x=>P.rect(x-1,cheekY,2,1,'#f08f8f'));
 if(f==='bandage'){P.rect(near-1,cheekY,3,2,'#f4dcae');if(R>=12)P.set(near,cheekY,'#c9a06a');}
 if(f==='mole')P.set(m0+mw,my+1,'#3a2a20');
 if(f==='snaggle')P.set(m0+1,my+1,WHITE);
 return {R,cx,cy,eyeTop,eyes};
}

// ---- rasterise: shapes -> pixel colours -> outline -> canvas ----
const cache=new Map();
function render(spec,pose,H){
 const key=JSON.stringify([spec,pose,H]);if(cache.has(key))return cache.get(key);
 const b=BODIES[spec.body||'normal'],F=frame(b),c=colorsOf(spec),S=[];
 const h=POSES[pose](S,b,F,c,spec);
 const k=H/NOMINAL;let x0=1e9,y0=1e9,x1=-1e9;for(const s of S){x0=Math.min(x0,s.bb[0]);y0=Math.min(y0,s.bb[1]);x1=Math.max(x1,s.bb[2]);}
 const px0=Math.floor(x0*k)-3,py0=Math.floor((y0-100)*k)-3,W=Math.ceil(x1*k)+3-px0,Hh=4-py0,buf=new Array(W*Hh).fill(null);
 const g1=1/k; // one pixel in design units
 for(const s of S){const ax=Math.max(0,Math.floor(s.bb[0]*k)-px0-2),bx=Math.min(W-1,Math.ceil(s.bb[2]*k)-px0+2),ay=Math.max(0,Math.floor((s.bb[1]-100)*k)-py0-2),byy=Math.min(Hh-1,Math.ceil((s.bb[3]-100)*k)-py0+2);
  for(let py=ay;py<=byy;py++)for(let px=ax;px<=bx;px++){const x=(px+px0+.5)/k,y=(py+py0+.5)/k+100;
   if(s.test(x,y))buf[py*W+px]=s.color;else if(s.outline&&s.grow(x,y,g1))buf[py*W+px]=OUT;}}
 const P=painter(buf,W,Hh,k,px0,py0);
 const layout=face(P,k,h,spec);
 const out=buf.slice();
 for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){const i=y*W+x;if(buf[i])continue;if((x>0&&buf[i-1])||(x<W-1&&buf[i+1])||(y>0&&buf[i-W])||(y<Hh-1&&buf[i+W]))out[i]=OUT;}
 if(spec.personality==='shy'){const Q=painter(out,W,Hh,k,px0,py0),sx=Math.round(layout.cx+layout.R*(h.side?.98:.92)),sy=layout.eyeTop-1;
  if(layout.R>=12){Q.rect(sx,sy,2,3,'#8fd3ff');Q.set(sx,sy,'#e8f7ff');}else Q.rect(sx,sy,1,2,'#8fd3ff');}
 const cv=document.createElement('canvas');cv.width=W;cv.height=Hh;const g=cv.getContext('2d'),img=g.createImageData(W,Hh);
 for(let i=0;i<out.length;i++){const col=out[i];if(!col)continue;const n=parseInt(col.slice(1),16);img.data[i*4]=n>>16&255;img.data[i*4+1]=n>>8&255;img.data[i*4+2]=n&255;img.data[i*4+3]=255;}
 g.putImageData(img,0,0);
 const result={canvas:cv,footX:-px0,footY:-py0+Math.round(0)};
 if(cache.size>600)cache.clear();cache.set(key,result);return result;
}
function painter(buf,W,Hh,k,px0,py0){
 const set=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<W&&y<Hh)buf[y*W+x]=c;};
 return {X:x=>x*k-px0,Y:y=>(y-100)*k-py0,set,
  rect(x,y,w,h,c){for(let j=0;j<h;j++)for(let i=0;i<w;i++)set(x+i,y+j,c);},
  frame(x,y,w,h,c){for(let i=0;i<w;i++){set(x+i,y,c);set(x+i,y+h-1,c);}for(let j=0;j<h;j++){set(x,y+j,c);set(x+w-1,y+j,c);}},
  line(x0,y0,x1,y1,c){const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);for(let i=0;i<=n;i++)set(x0+(x1-x0)*i/n,y0+(y1-y0)*i/n,c);}};
}

// ---- v03 rules: strength tilts body and props; personality, feature and face are separate ----
const STRENGTH_BODY={power:'big',speed:'slim',throw:'broad',velocity:'tall',control:'small',contact:'normal',eye:'normal',sense:'normal',catch:'normal'};
const STRENGTH_PROPS={power:['wristband','tape','necklace'],speed:['headband','headband','spiky'],eye:['glasses','glasses','glasses']};
const PROP_NAMES={wristband:'두꺼운 손목 밴드',tape:'팔뚝 테이핑',necklace:'굵은 목걸이',headband:'머리띠',spiky:'바람에 날리는 머리',glasses:'동그란 안경'};
const FEATURES=['freckles','bandage','blush','cowlick','gapTooth','mole','snaggle','bigEars'];
const FEATURE_NAMES={freckles:'주근깨',bandage:'반창고',blush:'발그레한 볼',cowlick:'삐친 머리',gapTooth:'앞니 빠짐',mole:'점',snaggle:'덧니',bigEars:'큰 귀'};
const PERSONALITIES=['hot','shy','brag','calm','odd','grumpy'];
const PERSONALITY_NAMES={hot:'열혈',shy:'소심',brag:'허세',calm:'느긋',odd:'엉뚱',grumpy:'투덜이'};
const STRENGTH_NAMES={power:'파워',speed:'주력',eye:'선구안',contact:'컨택',sense:'야구센스',catch:'포구',throw:'송구',velocity:'구속',control:'제구'};
const HAIRS=['short','long','spiky','buzz'];
function rng(seed){let a=seed>>>0;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function pick(r,list){return list[Math.floor(r()*list.length)];}
function makeSpec(strength,seed,opts={}){
 const r=rng(seed),bodies=Object.keys(BODIES),fit=STRENGTH_BODY[strength];
 const body=r()<.5?fit:pick(r,bodies.filter(x=>x!==fit));
 // The strength is the highest ability, so the next ability is never above it.
 const top=55+Math.floor(r()*26),second=25+Math.floor(r()*(top-24)),distinct=top>=60&&top-second>=5;
 const props={};let propName='없음 (강점이 뚜렷하지 않음)';
 if(distinct&&STRENGTH_PROPS[strength]){const pr=pick(r,STRENGTH_PROPS[strength]);propName=PROP_NAMES[pr];
  if(pr==='wristband')props.wristband=pick(r,PROP_COLORS);else if(pr==='headband')props.headband=pick(r,PROP_COLORS);else if(pr!=='spiky')props[pr]=true;}
 let hair=pick(r,HAIRS);if(distinct&&propName===PROP_NAMES.spiky)hair='spiky';
 const spec={body,skin:Math.floor(r()*6),hairColor:Math.floor(r()*6),hair,feature:pick(r,FEATURES),personality:pick(r,PERSONALITIES),props,...opts};
 spec.info={strength:STRENGTH_NAMES[strength],top,second,body:BODIES[body].name,prop:propName,feature:FEATURE_NAMES[spec.feature],personality:PERSONALITY_NAMES[spec.personality]};
 return spec;
}
window.Chibi={render,makeSpec,BODIES,NOMINAL,PERSONALITIES,PERSONALITY_NAMES,FEATURE_NAMES,PROP_NAMES,STRENGTH_NAMES,PROP_COLORS};
})();

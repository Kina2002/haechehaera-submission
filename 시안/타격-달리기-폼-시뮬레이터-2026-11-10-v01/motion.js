/* Original procedural motion study. No game characters/assets are imported.
 * All runners cover the same ground distance per second; cadence changes step size.
 * These are design comparisons, not production sprites or a baseball physics model. */
(function(){
'use strict';
const W=168,H=144,OX=78,GY=128,SPEED=90;
const C={outline:'#1a2935',skin:'#e6b68c',skinLight:'#f6d3a3',skinDark:'#bd8466',jersey:'#167560',jerseyLight:'#299779',jerseyDark:'#105443',pants:'#e8ece0',pantsDark:'#bccfca',shoe:'#233747',shoeLight:'#49616b',hair:'#30313c',helmet:'#155348',helmetLight:'#2d8c72',bat:'#d6a668',batDark:'#996b43'};
const canvas=()=>{const v=document.createElement('canvas');v.width=W;v.height=H;return v;};
const cache=new Map();let work=canvas(),c=work.getContext('2d',{willReadFrequently:true});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const P=(x,y)=>[x,y],add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
function blend(keys,t){for(let i=1;i<keys.length;i++){if(t<=keys[i][0])return mix(keys[i-1][1],keys[i][1],smooth((t-keys[i-1][0])/(keys[i][0]-keys[i-1][0])));}return keys.at(-1)[1];}
function line(a,b,color,width){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();}
function polygon(points,fill,stroke=C.outline,width=1.7){c.beginPath();points.forEach((a,i)=>i?c.lineTo(...a):c.moveTo(...a));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.stroke();}}
function ellipse(x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function limb(a,b,d,r,color,far=false){line(a,b,C.outline,r+2.6);line(b,d,C.outline,r+2.6);line(a,b,color,r);line(b,d,color,r);ellipse(...b,r*.47,r*.47,color);}
function ik(a,b,L1,L2,sign=-1){const dx=b[0]-a[0],dy=b[1]-a[1],dist=Math.max(.01,Math.hypot(dx,dy)),d=Math.min(dist,L1+L2-.01),ux=dx/dist,uy=dy/dist;const q=(L1*L1-L2*L2+d*d)/(2*d),h=Math.sqrt(Math.max(0,L1*L1-q*q));return[a[0]+ux*q-uy*h*sign,a[1]+uy*q+ux*h*sign];}
function leg(hip,foot,far){const knee=ik(hip,foot,17.5,18,-1);limb(hip,knee,foot,6.4,far?C.pantsDark:C.pants,far);line([knee[0]*.25+foot[0]*.75,knee[1]*.25+foot[1]*.75],foot,far?C.jerseyDark:C.jersey,5.8);polygon([[foot[0]-3.8,foot[1]-2.8],[foot[0]+4.2,foot[1]-2.4],[foot[0]+8,foot[1]-.4],[foot[0]+7,foot[1]+2.6],[foot[0]-4,foot[1]+2.6]],far?C.shoe:C.shoeLight,C.outline,1.5);line([foot[0]-2,foot[1]+1.7],[foot[0]+6,foot[1]+1.7],'#182d36',1.3);return knee;}
function arm(shoulder,hand,far,bend=1){const elbow=ik(shoulder,hand,14,14,bend);limb(shoulder,elbow,hand,4.2,far?C.skinDark:C.skin);line(shoulder,[mix(shoulder[0],elbow[0],.5),mix(shoulder[1],elbow[1],.5)],far?C.jerseyDark:C.jersey,6.8);line([mix(shoulder[0],elbow[0],.43),mix(shoulder[1],elbow[1],.43)],[mix(shoulder[0],elbow[0],.53),mix(shoulder[1],elbow[1],.53)],far?C.pantsDark:C.pants,1.3);ellipse(...hand,2.8,2.6,C.outline);ellipse(...hand,1.8,1.7,far?C.skinDark:C.skinLight);return elbow;}
function torso(hip,shoulder,twist=0){const sw=10.8+twist,hw=7.5;polygon([[shoulder[0]-sw,shoulder[1]-1],[shoulder[0]+sw,shoulder[1]-1],[hip[0]+hw,hip[1]+1],[hip[0]-hw,hip[1]+1]],C.jersey);polygon([[shoulder[0]-sw+1,shoulder[1]],[shoulder[0]-4,shoulder[1]+2],[hip[0]-3,hip[1]],[hip[0]-hw+1,hip[1]]],C.jerseyDark,null);line([shoulder[0]+3,shoulder[1]+5],[hip[0]+2,hip[1]-3],C.jerseyLight,1.1);line([hip[0]-7,hip[1]-1],[hip[0]+7,hip[1]-1],C.outline,2.2);c.fillStyle='#cfb77c';c.fillRect(hip[0]+1,hip[1]-2,2,2);}
function head(neck,tilt=0){const x=neck[0]+2+tilt,y=neck[1]-13;line([neck[0],neck[1]+4],[neck[0]+1,neck[1]-1],C.outline,7);line([neck[0],neck[1]+3],[neck[0]+1,neck[1]-1],C.skin,4);polygon([[x-11,y-8],[x-12,y+3],[x-7,y+11],[x+4,y+13],[x+12,y+7],[x+13,y-6],[x+8,y-12],[x-4,y-14]],C.skin);polygon([[x-11,y-6],[x-10,y+4],[x-6,y+10],[x-3,y+10],[x-7,y+1],[x-6,y-8]],C.skinDark,null);ellipse(x-10.5,y+2,3.2,4.1,C.outline);ellipse(x-10,y+2,2.1,2.8,C.skin);c.fillStyle=C.hair;c.fillRect(x-10,y-7,3,8);c.fillStyle=C.outline;c.fillRect(x-2,y-1,2,3);c.fillRect(x+7,y-1,2,3);c.fillRect(x-3,y-4,5,1);c.fillRect(x+6,y-4,4,1);c.fillStyle=C.skinDark;c.fillRect(x+5,y+3,3,2);c.fillStyle='#69443a';c.fillRect(x+2,y+8,5,1);c.fillStyle=C.skinLight;c.fillRect(x+8,y+4,2,2);polygon([[x-14,y-7],[x-13,y-14],[x-8,y-19],[x+3,y-20],[x+12,y-15],[x+14,y-7]],C.helmet);polygon([[x-11,y-13],[x-7,y-17],[x+2,y-18],[x+10,y-14],[x+11,y-11],[x-10,y-11]],C.helmetLight,null);polygon([[x-14,y-8],[x+12,y-9],[x+22,y-5],[x+22,y-2],[x+12,y-3],[x-11,y-5]],C.helmet,C.outline,1.5);line([x+11,y-7],[x+20,y-4],C.helmetLight,1.2);return[x,y];}
function bat(grip,angle){const tip=[grip[0]+Math.cos(angle)*39,grip[1]+Math.sin(angle)*39],mid=[mix(grip[0],tip[0],.42),mix(grip[1],tip[1],.42)];line(grip,tip,C.outline,6);line(grip,mid,C.batDark,2.8);line(mid,tip,C.bat,4);line([tip[0]-.6,tip[1]-.4],[mid[0]-.6,mid[1]-.4],'#edc995',1.1);return tip;}
function batPose(form,t){
 const p=form.p,load=blend([[0,0],[.25,1],[.42,.3],[.56,0],[1,0]],t),swing=blend([[0,0],[.4,0],[.56,1],[.73,1],[.92,0],[1,0]],t),follow=blend([[0,0],[.56,0],[.73,1],[.92,0],[1,0]],t);
 const sway=p.sway*Math.sin(t*Math.PI*2),hy=-31+p.crouch*(1-.75*swing)+load*(p.crouch>4?1.5:-2);
 const hip=P(sway+3*swing,hy),shoulder=P(hip[0]+p.lean+4*swing,hy-21),neck=P(shoulder[0],shoulder[1]-4);
 const farHip=add(hip,[-5,0]),nearHip=add(hip,[5,0]),rear=P(-p.stance,0),front=P(p.stance+4*swing,-p.kick*load);
 const grip=P(blend([[0,shoulder[0]+18],[.25,shoulder[0]+17],[.43,shoulder[0]+20],[.56,shoulder[0]+19],[.73,shoulder[0]+p.finishX],[.84,shoulder[0]+12],[.98,shoulder[0]+18],[1,shoulder[0]+18]],t),blend([[0,shoulder[1]-5-p.hands],[.25,shoulder[1]-7-p.hands],[.43,shoulder[1]-3-p.hands*.5],[.56,hy-13],[.73,shoulder[1]+p.finishY],[.84,shoulder[1]+4],[.98,shoulder[1]-5-p.hands],[1,shoulder[1]-5-p.hands]],t));
 const angle=blend([[0,p.bat],[.25,p.bat-.25],[.43,-1.5],[.56,.05],[.73,p.finishAngle],[.84,-1.1],[.98,p.bat],[1,p.bat]],t);
 return{hip,shoulder,neck,farHip,nearHip,rear,front,grip,angle,farShoulder:add(shoulder,[-3,-1]),nearShoulder:add(shoulder,[mix(9,-6,follow),1]),twist:-Math.sin(swing*Math.PI)*1.5,tilt:swing*.8,follow};
}
function drawBat(form,t){const q=batPose(form,t),kn1=leg(q.farHip,q.rear,true),kn2=leg(q.nearHip,q.front,false);if(t<.46)bat(q.grip,q.angle);arm(q.farShoulder,add(q.grip,[-2,2]),true,-1);torso(q.hip,q.shoulder,q.twist);const h=head(q.neck,q.tilt);if(t>=.46)bat(q.grip,q.angle);arm(q.nearShoulder,add(q.grip,[1,-1]),false,q.grip[0]>=q.nearShoulder[0]?1:-1);return{...q,knees:[kn1,kn2],head:h};}
function runPose(form,t){const p=form.p,a=t*Math.PI*2,hip=P(0,-31-p.bob*(.5+.5*Math.cos(a*2))),shoulder=P(p.lean,hip[1]-21),neck=P(shoulder[0],shoulder[1]-4);const stride=SPEED*.48/p.cadence;
 const foot=ph=>{let q=(ph+1)%1;if(q<.48)return P(stride*.5-stride*q/.48,0);const u=(q-.48)/.52;return P(-stride*.5+stride*smooth(u),-p.lift*Math.sin(u*Math.PI));};
 const rear=foot(t+.5),front=foot(t),farShoulder=add(shoulder,[-7-p.armWide*.35,-1]),nearShoulder=add(shoulder,[8+p.armWide*.35,1]);
 const hand=(sh,phase)=>{const upper=Math.PI/2+Math.sin(phase)*p.arm,el=add(sh,[13*Math.cos(upper),13*Math.sin(upper)]),lower=upper-Math.PI*.55;return{el,ha:add(el,[12*Math.cos(lower),12*Math.sin(lower)])};};
 return{hip,shoulder,neck,rear,front,farHip:add(hip,[-5,0]),nearHip:add(hip,[5,0]),farShoulder,nearShoulder,farHand:hand(farShoulder,a),nearHand:hand(nearShoulder,a+Math.PI),twist:Math.sin(a)*1.2,tilt:p.head+Math.sin(a)*.3};
}
function drawRun(form,t){const q=runPose(form,t),k1=leg(q.farHip,q.rear,true);arm(q.farShoulder,q.farHand.ha,true,-1);const k2=leg(q.nearHip,q.front,false);torso(q.hip,q.shoulder,q.twist);const h=head(q.neck,q.tilt);arm(q.nearShoulder,q.nearHand.ha,false,1);return{...q,knees:[k1,k2],head:h};}
function raster(form,t,kind){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W,H);c.translate(OX,GY);const joints=kind==='bat'?drawBat(form,t):drawRun(form,t);const img=c.getImageData(0,0,W,H);for(let i=3;i<img.data.length;i+=4)img.data[i]=img.data[i]>=140?255:0;c.setTransform(1,0,0,1,0,0);c.putImageData(img,0,0);const result=canvas();result.getContext('2d').drawImage(work,0,0);return{canvas:result,joints};}
function sprite(form,t,kind){const i=Math.min(47,Math.floor(((t%1+1)%1)*48+1e-8)),key=form.id+':'+i;let entry=cache.get(key);if(!entry){entry=raster(form,i/48,kind);cache.set(key,entry);}return entry;}
function colors(){return{ground:'#284c4e',grid:'#284851',bg:'#0b2534',dim:'#7caaad',ink:'#c9e7df'};}
function scene(ctx,w,h,kind,time){const p=colors();ctx.fillStyle=p.bg;ctx.fillRect(0,0,w,h);const ground=h*.86;ctx.fillStyle=kind==='bat'?'#15383e':'#12353c';ctx.fillRect(0,ground,w,h-ground);ctx.strokeStyle=p.ground;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,ground+.5);ctx.lineTo(w,ground+.5);ctx.stroke();if(kind==='bat'){ctx.strokeStyle='#3c5d60';ctx.beginPath();ctx.moveTo(w*.23,ground);ctx.lineTo(w*.43,ground-9);ctx.lineTo(w*.77,ground-4);ctx.stroke();}else{const step=40,shift=time*SPEED%step;ctx.strokeStyle='#31515b';for(let x=-shift;x<w;x+=step){ctx.beginPath();ctx.moveTo(x,ground+8);ctx.lineTo(x+12,ground+8);ctx.stroke();}}return ground;}
function render(ctx,w,h,form,kind,t,options={}){const ground=scene(ctx,w,h,kind,options.clock||0),entry=sprite(form,t,kind);const maxScale=Math.min((ground-8)/(kind==='bat'?118:102),w/165);let scale=Math.min(options.scale||maxScale,maxScale);if(options.small)scale=.44;const x=w*.48;ctx.imageSmoothingEnabled=false;
 let picture=entry.canvas;
 if(options.silhouette){if(!entry.mask){entry.mask=canvas();const m=entry.mask.getContext('2d');m.drawImage(entry.canvas,0,0);m.globalCompositeOperation='source-in';m.fillStyle='#d7e2d9';m.fillRect(0,0,W,H);}picture=entry.mask;}
 ctx.save();ctx.translate(x,ground-2.6*scale);if(options.left)ctx.scale(-1,1);ctx.drawImage(picture,-OX*scale,-GY*scale,W*scale,H*scale);ctx.restore();
 return entry.joints;
}
function phase(kind,t){if(kind==='run')return Math.min(5,Math.floor(t*6));const times=FormCandidates.sampleTimes.bat;let n=0;for(let i=1;i<times.length;i++)if(t>=times[i]-.035)n=i;return n;}
window.FormMotion={render,sprite,raster,batPose,runPose,phase,cache,constants:{W,H,OX,GY,SPEED},palette:C};
})();

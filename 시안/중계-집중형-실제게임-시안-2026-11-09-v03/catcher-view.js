/* 독립 시안: 기존 경기 좌표를 낮은 홈 뒤 카메라에 투영합니다.
 * 경기 진행·판정·저장·선수 데이터는 원본 엔진이 처리합니다.
 * 캐릭터 이미지는 기존 게임의 포즈를 그대로 사용하며 새 캐릭터를 그리지 않습니다. */
(function(){
'use strict';
const B=BroadcastPreview.settings;
const V={f:900,height:2.55,distance:10,unitHeight:1.75/50,cache:new Map(),frame:null,calls:[],collecting:false};
BroadcastPreview.lowView=V;
const originalDraw=drawField,originalSprite=sprite,originalSpeech=paintPlayerSpeech22;
function viewportHeight(){return 900/B.aspect;}
function horizon(){return viewportHeight()*.25;}
function project(x,z,h=0){
 const depth=Math.max(1.2,z+V.distance);
 return {x:450+V.f*x/depth,y:horizon()+V.f*(V.height-h)/depth,scale:V.f*V.unitHeight/depth,z};
}
function oldGround(x,y){
 // The old field has compressed outfield depth. Expand it to a ground plane
 // before perspective projection; infield bases retain their diamond positions.
 return {x:(x-450)*19.4/200,z:y<230?38.8+(230-y)*1.5:(450-y)*38.8/220};
}
function actorPoint(a){
 const m=team()?.match,e=V.frame?.e,side=e?.attack??attack(m),bat=tside(m,side);
 const batId=e?.batter||bat.lineup[shownOrder(m,side)].id;
 let p;
 if(a.p?.id===batId&&Math.abs(a.x-450)<70&&a.y>425){p={x:a.p.hand==='좌타'?1.38:-1.38,z:.25};}
 else if(a.fieldPos==='C'&&a.y>435){p={x:0,z:-1.65};}
 else p=oldGround(a.x,a.y);
 return {...project(p.x,p.z),ground:p};
}
function shownOrder(m,side){return (V.frame?.e?.before?.order||visibleMatchState(m).order)[side];}
function polygon(c,points,fill,stroke=null,width=1){
 c.beginPath();points.forEach((p,i)=>{const q=project(p[0],p[1]);if(i)c.lineTo(q.x,q.y);else c.moveTo(q.x,q.y);});c.closePath();
 if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
function circleGround(c,x,z,r,fill,stroke=null){
 const points=Array.from({length:48},(_,i)=>{const a=i*Math.PI/24;return[x+Math.cos(a)*r,z+Math.sin(a)*r];});
 polygon(c,points,fill,stroke);
}
function groundLine(c,points,color,width){
 c.beginPath();points.forEach((p,i)=>{const q=project(p[0],p[1]);if(i)c.lineTo(q.x,q.y);else c.moveTo(q.x,q.y);});c.strokeStyle=color;c.lineWidth=width;c.stroke();
}
function background(c,time){
 const H=viewportHeight(),edge=horizon()+V.f*V.height/110;
 c.fillStyle='#72b5cc';c.fillRect(0,0,900,H);
 if(!V.stadium){V.stadium=document.createElement('canvas');V.stadium.width=900;V.stadium.height=530;}
 const key=[team()?.primary,team()?.secondary,team()?.match?.opp?.primary,team()?.match?.opp?.secondary].join(':');
 if(V.stadiumKey!==key){const g=V.stadium.getContext('2d');g.imageSmoothingEnabled=false;drawStadium(g,900,530,time);V.stadiumKey=key;}
 // Existing stands and fence become a low horizon; the ground is drawn anew.
 c.drawImage(V.stadium,0,0,900,189,0,0,900,edge+1);
 c.fillStyle='#58a134';c.fillRect(0,edge,900,H-edge);
 if(ART.scenes?.[3]){c.globalAlpha=.8;c.drawImage(ART.scenes[3],0,412,900,263,0,edge,900,H-edge);c.globalAlpha=1;}
 for(let z=96;z>=0;z-=6)polygon(c,[[-160,z], [160,z], [160,z+3],[-160,z+3]],'#28752a20');
 // A true ground-plane diamond: distant bases flatten towards the horizon.
 polygon(c,[[0,-1.6],[22,19.4],[0,41],[-22,19.4]],'#d8a76a');
 polygon(c,[[0,7],[13.8,20],[0,33],[-13.8,20]],'#5eaa39');
 for(let z=30;z>7;z-=4){
  const half=Math.max(0,13.8*(1-Math.abs(z-20)/13));
  polygon(c,[[-half,z],[half,z],[Math.max(0,half-2),z+1.8],[-Math.max(0,half-2),z+1.8]],'#3c8b301c');
 }
 circleGround(c,0,18.4,2.7,'#dfb477');
 circleGround(c,0,0,2.55,'#ddb071');
 groundLine(c,[[-70,70],[0,0],[70,70]],'#fff4d6',2.2);
 for(const [x,z]of [[19.4,19.4],[0,38.8],[-19.4,19.4]])polygon(c,[[x-.25,z-.25],[x+.25,z-.25],[x+.25,z+.25],[x-.25,z+.25]],'#fffbe9');
 polygon(c,[[-.3,18.35],[.3,18.35],[.3,18.49],[-.3,18.49]],'#fff7e5');
 for(const sign of [-1,1])polygon(c,[[sign*.65,-.72],[sign*1.6,-.72],[sign*1.6,.92],[sign*.65,.92]],null,'#fff3db',1.4);
 polygon(c,[[-.23,.22],[.23,.22],[.23,-.1],[0,-.3],[-.23,-.1]],'#fffbea');
 // A few deterministic dirt flecks add texture without changing the game RNG.
 let seed=7319;
 for(let i=0;i<240;i++){
  seed=(seed*1664525+1013904223)>>>0;const x=(seed%4400)/100-22;
  seed=(seed*1664525+1013904223)>>>0;const z=(seed%4200)/100-1;
  if(Math.abs(x)+Math.abs(z-20)>22||Math.abs(x)+Math.abs(z-20)<13)continue;
  const q=project(x,z);c.fillStyle='#a5764638';c.fillRect(q.x,q.y,Math.max(1,q.scale),1);
 }
}
function playerBitmap(call,actor,t){
 const p=actor.p,tm=call.tm;
 let pose=standingPose15(call.pose,tm,p,t),flip=standingFlip15(pose,call.x,call.y,call.flip);
 // Off-field rendering preserves the current pose without applying the old
 // field's perspective a second time. The original game actor pass runs once.
 const [row,col]=actionFrame15(pose,t,p,0),key=[pose,row,col,flip,pose==='run'?Math.floor(call.tick/100):0].join(':');
 let entry=V.cache.get(p.id);
 if(!entry){const canvas=document.createElement('canvas');canvas.id='low-actor-buffer';canvas.setAttribute('data-lab-scene','');canvas.width=480;canvas.height=540;entry={canvas,key:null};V.cache.set(p.id,entry);if(V.cache.size>45)V.cache.delete(V.cache.keys().next().value);}
 if(entry.key!==key){
  const g=entry.canvas.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,480,540);g.setTransform(3,0,0,3,0,0);g.imageSmoothingEnabled=false;
  originalSprite(g,80,160,1,tm,call.number,call.role,pose,call.tick,call.id,flip);entry.key=key;
 }
 return entry.canvas;
}
function drawActors(c,frame){
 const byId=new Map(frame.actors.filter(a=>a.p).map(a=>[a.p.id,a]));
 const ordered=V.calls.map(call=>{const actor=byId.get(call.id);return actor?{call,actor,point:actorPoint(actor)}:null;}).filter(Boolean).sort((a,b)=>b.point.z-a.point.z);
 for(const {call,actor,point:q}of ordered){
  const s=q.scale;if(q.x<-180||q.x>1080||q.y<0||q.y>viewportHeight()+140)continue;
  const bitmap=playerBitmap(call,actor,frame.t);
  c.fillStyle='#0b38134d';c.beginPath();c.ellipse(q.x,q.y+1,19*s,3.8*s,0,0,Math.PI*2);c.fill();
  c.drawImage(bitmap,q.x-80*s,q.y-160*s,160*s,180*s);
  if(actor.fieldPos==='P'){
   const text='#'+actor.p.number+' '+actor.p.name;c.font='10px NeoDunggeunmo,monospace';const w=c.measureText(text).width+12;
   c.fillStyle='#062335e8';c.fillRect(q.x-w/2,q.y+8,w,17);c.fillStyle='#e7f4f5';c.textAlign='center';c.fillText(text,q.x,q.y+20);
  }
 }
}
function drawPitch(c,e,t){
 if(!e?.pitchThrown||t<.13||t>.29)return;
 // A pitch approaches the catcher in depth, rather than travelling down a
 // top-down screen. The event timing and outcome remain the engine's values.
 const u=clamp((t-.13)/.09,0,1),targetX=clamp(((e.ball?.[1]?.[0]||450)-450)/100,-.4,.4);
 let x=.22*(1-u)+targetX*u,z=18.4*(1-u)-.3*u,h=1.55*(1-u)+.85*u;
 if(t>.22){const catchU=clamp((t-.22)/.07,0,1);x=targetX*(1-catchU)-.55*catchU;z=-.3-1.35*catchU;h=.85-.3*catchU;}
 const q=project(x,z,h),r=clamp(V.f*.035/(z+V.distance),1.2,4);
 c.shadowColor='#092d3c';c.shadowBlur=2;c.fillStyle='#fffce4';c.beginPath();c.arc(q.x,q.y,r,0,Math.PI*2);c.fill();c.shadowBlur=0;
 c.fillStyle='#d36b61';c.fillRect(q.x,q.y-r*.6,.8,Math.max(1,r));
}
function lowRender(cv,time,frame){
 const c=cv.getContext('2d'),k=cv.width/900;c.save();c.setTransform(k,0,0,k,0,0);c.imageSmoothingEnabled=false;
 background(c,time);drawActors(c,frame);drawPitch(c,frame.e,frame.t);c.restore();
}
sprite=function(c,x,y,scale,tm,number=0,role='player',pose='idle',tick=0,id='',flip=false){
 if(V.collecting&&c.canvas.id==='field'&&role==='player')V.calls.push({x,y,scale,tm,number,role,pose,tick,id,flip});
 return originalSprite.apply(this,arguments);
};
// Reuse the game's own speech text and collision avoidance, replacing only its
// head anchor for the low view. No face or dialogue data is changed.
let speechSource=originalSpeech.toString();
const anchorStart=speechSource.indexOf('const x=cr.left-box.left'),anchorEnd=speechSource.indexOf('const w=bubble.offsetWidth',anchorStart);
if(anchorStart<0||anchorEnd<0)throw Error('낮은 시점: 말풍선 좌표 연결을 확인해 주세요.');
const oldAnchor=speechSource.slice(anchorStart,anchorEnd).trim();
const anchorBody=oldAnchor.replace(/^const x=/,'x=').replace(/;$/,'');
speechSource=speechSource.slice(0,anchorStart)+'let x,y;if(BroadcastPreview.settings.lowActive){const q=BroadcastPreview.lowView.head(actor);x=cr.left-box.left+q.x*cr.width/900;y=cr.top-box.top+q.y*cr.height/(900/BroadcastPreview.settings.aspect);}else{'+anchorBody+';}\n'+speechSource.slice(anchorEnd);
const projectedSpeech=(0,eval)('('+speechSource+')');
V.head=a=>{const q=actorPoint(a);return{x:q.x,y:q.y-50*q.scale};};
paintPlayerSpeech22=function(e,t,actors){
 if(V.collecting){V.frame={e,t,actors};return;}
 return projectedSpeech(e,t,actors);
};
drawField=function(time){
 const active=B.on&&screen==='match'&&!!team()?.match;
 V.calls=[];V.frame=null;V.collecting=active;
 try{originalDraw(time);}finally{V.collecting=false;}
 B.lowActive=active&&document.body.classList.contains('bc-close-camera');
 document.body.classList.toggle('bc-low-view',B.lowActive);
 const cv=$('#field');if(!cv||!V.frame)return;
 if(B.lowActive)lowRender(cv,time,V.frame);
 projectedSpeech(V.frame.e,V.frame.t,V.frame.actors);
};
V.project=project;V.actorPoint=actorPoint;
})();

/* Two broadcast cameras, same engine coordinates and event clock. */
(()=>{'use strict';
const V={low:false,collecting:false,calls:[],frame:null,stadium:null,stadiumKey:'',entry:null,lastBatter:''};
const originalDraw=drawField,originalSprite=sprite,originalSpeech=paintPlayerSpeech22;
const cap=(v,a,b)=>Math.max(a,Math.min(b,v));
function ground(x,y){return{x:(x-450)*19.4/200,z:y<230?38.8+(230-y)*1.5:y<336?19.4+(336-y)*19.4/106:y<340?18.4+(340-y)/4:(450-y)*18.4/110};}
function project(x,z,h=0){
 if(V.low){const depth=Math.max(5,z+10),blend=cap((z-4)/14,0,1),hf=900+(520-900)*(blend*blend*(3-2*blend));return{x:450+hf*x/depth,y:212+900*(2.55-h)/depth,scale:22.5/depth,z};}
 const y=z<0?448-z*3:z<=38.8?448-160*Math.pow(z/38.8,.65):288-Math.min(45,(z-38.8)*.45);
 return{x:450+x*9.6,y:y-h*24,scale:.65+.4*(1-cap(z/55,0,1)),z};
}
function actorPoint(a){
 let p=ground(a.x,a.y);
 if(V.low){const m=team()?.match,defense=m&&a.tm===tside(m,1-(anim?.e.attack??attack(m)));if(defense&&a.fieldPos==='C'&&a.y>430)p={x:0,z:-1.4};else if(['bat','swing'].includes(a.pose)&&a.y>425)p={x:a.p?.hand==='좌타'?1.38:-1.38,z:.25};}
 return project(p.x,p.z);
}
function polygon(c,points,fill,stroke){c.beginPath();points.forEach(([x,z],i)=>{const q=project(x,z);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y);});c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke();}}
function circle(c,x,z,r,fill){polygon(c,Array.from({length:32},(_,i)=>[x+Math.cos(i*Math.PI/16)*r,z+Math.sin(i*Math.PI/16)*r]),fill);}
function background(c,time){
 const key=[team()?.primary,team()?.secondary,team()?.match?.opp?.primary,team()?.match?.opp?.secondary].join(':');
 if(!V.stadium||V.stadiumKey!==key){V.stadium=document.createElement('canvas');V.stadium.width=900;V.stadium.height=530;drawStadium(V.stadium.getContext('2d'),900,530,time);V.stadiumKey=key;}
 c.fillStyle='#79b9d1';c.fillRect(0,0,900,530);c.drawImage(V.stadium,0,0,900,189,0,0,900,239);
 c.fillStyle='#4e963d';c.fillRect(0,239,900,291);if(ART.scenes?.[3]){c.save();c.globalAlpha=.55;c.drawImage(ART.scenes[3],0,412,900,263,0,239,900,291);c.restore();}
 for(let z=110;z>=-10;z-=5)polygon(c,[[-150,z],[150,z],[150,z+2.5],[-150,z+2.5]],'#ffffff0c');
 polygon(c,[[0,-2],[22,19.4],[0,41],[-22,19.4]],'#cfa36d');
 polygon(c,[[0,7],[13.5,20],[0,32],[-13.5,20]],'#5da24a');
 circle(c,0,18.4,2.8,'#dcb481');circle(c,0,0,2.8,'#dcb481');
 for(const sign of [-1,1]){c.beginPath();[0,19.4,40,85].forEach((z,i)=>{const q=project(sign*z,z);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y);});c.strokeStyle='#fbefd6';c.lineWidth=1.5;c.stroke();}
 for(const [x,z]of [[19.4,19.4],[0,38.8],[-19.4,19.4]]){const q=project(x,z);c.fillStyle='#fff6de';c.beginPath();c.moveTo(q.x-5,q.y);c.lineTo(q.x,q.y-3);c.lineTo(q.x+5,q.y);c.lineTo(q.x,q.y+3);c.closePath();c.fill();}
 polygon(c,[[-.23,.22],[.23,.22],[.23,-.1],[0,-.3],[-.23,-.1]],'#fffbea');
 for(const sign of [-1,1])polygon(c,[[sign*.65,-.72],[sign*1.6,-.72],[sign*1.6,.92],[sign*.65,.92]],null,'#fff3db');
 polygon(c,[[-.35,18.4],[.35,18.4],[.35,18.65],[-.35,18.65]],'#fffbea');
 c.fillStyle='#7ab7d0';c.fillRect(0,232,900,3);c.fillStyle='#1b6590';c.fillRect(0,235,900,6);StadiumBannersV13.paint(c,team(),team().match);
}
function officialPoint(o){
 if(o.base===0){const m=team().match,side=anim?.e.attack??attack(m),df=tside(m,1-side);
  const call=V.calls.find(a=>a.tm===df&&df.lineup.find(v=>v.id===a.id)?.pos==='C'),xy=call&&Math.hypot(call.x-FIELD.C[0],call.y-FIELD.C[1])<15?[call.x,call.y]:FIELD.C;
  const catcher=actorPoint({x:xy[0],y:xy[1],fieldPos:'C',pose:'catcher',tm:df});
  // Keep the plate umpire full-size, behind and screen-right of the catcher for either batting hand.
  return{x:catcher.x+(V.low?52:24),y:Math.min(520,catcher.y+(V.low?34:24)),scale:catcher.scale,z:catcher.z-2,behindCatcher:true};
 }
 const p=ground(...o.xy),q=project(p.x,p.z);if(!V.low&&o.base===3)q.x=Math.max(236,q.x);return{...q,x:cap(q.x,22,878),y:Math.min(508,q.y)};
}
function judge(c,o){
 const q=officialPoint(o),spec=umpireAsset18(o.base,o.call?.kind||'out'),entry=UMPIRE_ART18[spec.file],im=umpireImages18[spec.file];if(!im||!entry)return;
 const seq=entry.rows[spec.row];let frame=o.state.frame;if(o.call?.kind==='strike')frame=frame>=2&&frame<=4?1:0;
 const f=seq[frame],s=40*q.scale/seq[0].rect[3];c.save();c.translate(Math.round(q.x),Math.round(q.y));if(spec.flip)c.scale(-1,1);c.drawImage(im,...f.rect,-f.foot[0]*s,-f.foot[1]*s,f.rect[2]*s,f.rect[3]*s);c.restore();
 if(o.state.speaking&&o.call){const word={safe:'세이프',out:'아웃',k:'삼진',strike:'스트라이크'}[o.call.kind];c.font='12px sans-serif';c.textAlign='center';const w=c.measureText(word).width+14;c.fillStyle='#fff2d9';c.fillRect(q.x-w/2,q.y-49*q.scale-17,w,19);c.fillStyle='#263d42';c.fillText(word,q.x,q.y-49*q.scale-3);}
}
function playerAnchor(e,id,t,point,forcePhase){
 const m=team().match,tm=tside(m,1-e.attack),p=ply(tm,id);if(!p)return null;const position=tm.lineup.find(v=>v.id===id)?.pos,xy=DefenseMotionV22.positionAt(e,tm,id,t),action=DefenseMotionV22.action(p,tm,position,'idle',...xy,0,e,t);
 if(!action)return null;if(forcePhase)action.phase=forcePhase;const out=CharacterPartsV17.render(FieldIntegrationV13.config(p,tm),0,{headwear:position==='C'?'catcher':'cap',catcher:position==='C',action}),q=actorPoint({x:xy[0],y:xy[1],fieldPos:position,pose:'glove',tm,p}),s=Math.max(.55,q.scale*.91),anchor=action.holdBase?out.contacts.foot:out.foot,ap=out[point]||out.glovePoint;
 const hand=point==='handPoint'||point==='held'&&['load','release'].includes(action.phase),grip=hand?out.handPoint:ap;if(!grip)return null;const k=Math.round(64*s)/64;return{x:Math.round(q.x-anchor[0]*s)+grip[0]*k,y:Math.round(q.y-anchor[1]*s)+grip[1]*k,scale:q.scale,occluded:!hand&&position==='C'&&action.view==='B'&&action.phase.startsWith('crouch')};
}
function batAnchor(e){
 const tm=tside(team().match,e.attack),p=ply(tm,e.batter),q=actorPoint({x:p.hand==='좌타'?478:422,y:455,pose:'swing',tm,p}),out=CharacterPartsV17.render(FieldIntegrationV13.config(p,tm),53+PlayerMotionV13.identity(p).bat,{headwear:'helmet',flip:p.hand==='좌타'}),tip=BattingMotionV25.tip(out);
 if(!tip)return null;const s=Math.max(.55,q.scale*.91),k=Math.round(64*s)/64;
 return {x:Math.round(q.x-out.foot[0]*s)+tip[0]*k,y:Math.round(q.y-out.foot[1]*s)+tip[1]*k};
}
function contactBall(q,e,t){
 if(!e.batting25||!e.contact||t<.13||t>=e.motion19.land)return q;
 const end=batAnchor(e);if(!end)return q;
 if(t<=.22){const from=V.low?project(.22,18.4,1.55):(()=>{const g=ground(...e.ball[0]);return project(g.x,g.z,.08);})();const u=cap((t-.13)/.09,0,1);return{x:from.x+(end.x-from.x)*u,y:from.y+(end.y-from.y)*u,scale:q.scale};}
 const fade=Math.max(.221,Math.min(.30,e.motion19.land-.035));if(t>=fade)return q;
 const g=ground(...e.ball[1]),origin=project(g.x,g.z,.08),u=1-cap((t-.22)/(fade-.22),0,1);
 return{...q,x:q.x+(end.x-origin.x)*u*u,y:q.y+(end.y-origin.y)*u*u};
}
function ball(c,e,t){
 V.lastBall=null;if(!e)return;let q;
 if(V.low&&e.pitchThrown&&t>=.13&&t<.29){const u=cap((t-.13)/.09,0,1);q=project(.22*(1-u),18.4*(1-u)-.3*u,1.55*(1-u)+.85*u);}
 else{const p=ballPoint19(e,t);if(!p)return;const g=ground(...p);q=project(g.x,g.z,.08);}
 const plan=e.motion19,mix=(a,b,u)=>({x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,scale:b.scale});
 if(plan){const flight=plan.throws.find(s=>t>=s.start&&t<=s.end);
  if(flight){const from=playerAnchor(e,flight.thrower,flight.start,'handPoint','release'),end=ground(...flight.to),to=flight.receiver?playerAnchor(e,flight.receiver,flight.end,'glovePoint','receive'):project(end.x,end.z,.08);if(from&&to)q=mix(from,to,cap((t-flight.start)/(flight.end-flight.start),0,1));}
  else if(t>=plan.pickup&&!['hr','foul','wp','pb'].includes(e.type)){const last=plan.throws.filter(s=>s.end<t).at(-1),owner=last?last.receiver:e.fielderId,held=owner&&playerAnchor(e,owner,t,'held');if(held)q=held;}
  else if(e.defense24?.drop&&t>=plan.land&&t<plan.pickup){
   const start=playerAnchor(e,e.fielderId,plan.land,'glovePoint','receive'),end=ground(...e.defense24.recovery),to=project(end.x,end.z,.08),u=cap((t-plan.land)/(plan.pickup-plan.land),0,1);
   if(start){q=mix(start,to,u);q.y-=Math.sin(u*Math.PI)*5;const receive=playerAnchor(e,e.fielderId,plan.pickup,'glovePoint','ground');if(receive&&t>=plan.pickup-.025)q=mix(q,receive,cap((t-plan.pickup+.025)/.025,0,1));}
  }
  else if((plan.caught||e.defense24?.drop)&&t>=plan.land-.035){const end=playerAnchor(e,e.fielderId,plan.land,'glovePoint','receive');if(end)q=mix(q,end,cap((t-plan.land+.035)/.035,0,1));}
  else if(e.contact&&!plan.caught&&t>=plan.pickup-.025){const end=playerAnchor(e,e.fielderId,plan.pickup,'glovePoint','ground');if(end)q=mix(q,end,cap((t-plan.pickup+.025)/.025,0,1));}
  if(plan.steal&&!e.pitchThrown&&t<plan.pickup){const tm=tside(team().match,1-e.attack),id=tm.lineup.find(v=>v.pos==='C')?.id,held=playerAnchor(e,id,t,'glovePoint');if(held)q=held;}
  if(e.pitchThrown&&!e.contact&&!['wp','pb','hbp'].includes(e.type)&&t>=.22&&t<.29){const tm=tside(team().match,1-e.attack),id=tm.lineup.find(v=>v.pos==='C')?.id,end=playerAnchor(e,id,.29,'glovePoint');if(end){const start=V.low?project(0,0,.85):project(0,0,.08);q=mix(start,end,(t-.22)/.07);if(end.occluded&&t>=.255)q.occluded=true;}}
 }
 q=contactBall(q,e,t);if(q.occluded)return;V.lastBall={x:q.x,y:q.y};c.fillStyle='#09273655';c.fillRect(q.x+2,q.y+3,5,2);c.fillStyle='#fff5da';const r=V.low?Math.max(2,q.scale*1.2):2.2;c.fillRect(Math.round(q.x-r),Math.round(q.y-r),Math.ceil(r*2),Math.ceil(r*2));c.fillStyle='#c15e4c';c.fillRect(Math.round(q.x),Math.round(q.y-r),1,Math.ceil(r*2));
}
sprite=function(c,x,y,scale,tm,number=0,role='player',pose='idle',tick=0,id='',flip=false){
 if(V.collecting&&c.canvas.id==='field'&&role==='player'){V.calls.push({x,y,scale,tm,number,role,pose,tick,id,flip,opacity:c.globalAlpha});return;}
 return originalSprite.apply(this,arguments);
};
paintPlayerSpeech22=function(e,t,actors){if(V.collecting){V.frame={e,t,actors};return;}return originalSpeech.apply(this,arguments);};
drawField=function(time){
 const cv=$('#field'),m=team()?.match;if(!cv||!m||!FieldIntegrationV13.ready)return originalDraw(time);
 const e=anim?.e,t=anim?playProgress(clamp(anim.elapsed/anim.duration,0,1)):0,side=e?.attack??attack(m);
 const current=tside(m,side).lineup[m.order[side]]?.id,batterKey=[m.id,m.inning,m.half,current].join(':');
 if(!e&&!sideSwitch&&!entrance&&!reaction&&batterKey!==V.lastBatter){V.lastBatter=batterKey;V.entry={id:current,side,elapsed:0,total:1800,last:time};}
 if(V.entry){const en=V.entry;if(e||sideSwitch||en.id!==current)V.entry=null;else{if(!m.paused)en.elapsed+=Math.max(0,Math.min(100,time-en.last))*matchPlaybackRate(m);en.last=time;waitMs=Math.max(waitMs,en.total-en.elapsed);if(en.elapsed>=en.total)V.entry=null;}}
 V.low=side===0&&!(e&&(e.contact&&t>=(e.batting25?(e.batting25.command==='power'?.28:.26):.22)||['bb','hbp','wp','pb','sb','cs'].includes(e.type)&&t>.25))&&!sideSwitch;
 V.calls=[];V.frame=null;V.collecting=true;try{originalDraw(time);}finally{V.collecting=false;}
 const frame=V.frame||{e,t,actors:V.calls.map(a=>({...a,p:ply(a.tm,a.id),fieldPos:a.tm.lineup.find(v=>v.id===a.id)?.pos}))},byId=new Map(frame.actors.map(a=>[a.p?.id,a]));
 const c=cv.getContext('2d'),k=cv.width/900;c.save();c.setTransform(k,0,0,cv.height/530,0,0);c.imageSmoothingEnabled=false;background(c,time);
 const items=V.calls.map(call=>{const actor={...byId.get(call.id),...call,p:ply(call.tm,call.id)};if(V.entry?.id===call.id){const en=V.entry,u=cap(en.elapsed/en.total,0,1),walk=cap(u/.72,0,1),start=V.low?(en.side===m.home?505:395):(en.side===m.home?865:35),end=V.low?450+(actor.p.hand==='좌타'?1.38:-1.38)*200/19.4:call.x;actor.x=start+(end-start)*walk;if(V.low)actor.y=450-.25*110/18.4;actor.pose=u<.9?'walk':call.pose;actor.flip=start>end;actor.entry=u;}
  if(e&&anim.resultShown&&(e.outIds.includes(call.id)||e.runs?.includes(call.id))){const score=e.runs?.includes(call.id),delay=score?(e.type==='hr'?1700:650):550,u=cap((resultHoldMs(e)-anim.holdLeft-delay)/1700,0,1),end=side===m.home?865:35;actor.x=call.x+(end-call.x)*u;actor.y=call.y+(455-call.y)*u;actor.departure=u;actor.exitFlip=end<call.x;}
  const q=actorPoint(actor);return{kind:'player',call,actor,q};});
 for(const o of activeJudges18(e))items.push({kind:'judge',official:o,q:officialPoint(o)});
 items.sort((a,b)=>a.q.y-b.q.y);V.lastFrame=[];V.lastOfficials=items.filter(a=>a.kind==='judge').map(a=>({base:a.official.base,...a.q}));
 for(const item of items){if(item.kind==='judge'){judge(c,item.official);continue;}const{call,actor,q}=item;if(!actor.p)continue;
  const state=FieldIntegrationV13.describe(actor.p,call.tm,call.pose,call.tick,call.x,call.y,call.flip);
  if(actor.entry!==undefined){state.frame=actor.entry<.72?(Math.floor(actor.entry*20)%2?6:7):actor.entry<.9?74:47+state.forms.bat;state.flip=actor.entry<.72?actor.flip:actor.p.hand==='좌타';state.contact=null;}
  if(actor.departure>0){state.frame=Math.floor(call.tick/160)%2?6:7;state.flip=actor.exitFlip;state.contact=null;}
  if(state.catcher&&state.frame===5&&!state.action)state.direction=3;
  // Batting keeps the pose's registered head direction; do not twist only the head toward the camera.
  V.lastFrame.push({id:call.id,frame:state.frame,contact:state.contact,x:q.x,y:q.y,worldX:call.x,worldY:call.y,scale:q.scale,flip:state.flip,entry:actor.entry,direction:state.direction,readyView:state.readyView,action:state.action,headwear:state.headwear,catcher:state.catcher,position:state.position,offense:state.offense});
  c.save();c.globalAlpha=call.opacity*(actor.departure===undefined?1:cap((1-actor.departure)/.15,0,1));FieldIntegrationV13.paint(c,q.x,q.y,q.scale,call.tm,actor.p,state);c.restore();
 }
 ball(c,e,t);BattingMotionV25.trail(c,e,t,V.lastBall);c.restore();
 // Reuse collision-aware speech, supplying a projected head anchor in its existing units.
 const speechActors=frame.actors.map(a=>{const q=actorPoint(a),oldHeight=49*zoneScale15(a.tm,a.p,q.y,fieldScale(q.y));return{...a,x:q.x,y:q.y-47*q.scale+oldHeight};});
 originalSpeech(e,t,speechActors);window.StadiumLayoutV13?.arrange();
};
V.batAnchor=batAnchor;V.project=project;V.ground=ground;V.actorPoint=actorPoint;V.playerAnchor=playerAnchor;V.officialPoint=officialPoint;window.StadiumViewV13=V;
})();

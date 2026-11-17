/* The match engine still resolves every event and runner path. Only drawing changes. */
(()=>{'use strict';
const F=FieldRendererV13,M=PlayerMotionV13,originalSprite=sprite,samples=new Map(),gearCache=new Map();
const oldRunnerPoint=runnerPoint;runnerPoint=function(move,u){if(move.points.length<3||anim?.e.bh||move.out)return oldRunnerPoint(move,u);const points=move.points.map(p=>p.slice());if(move.from===0){const p=ply(tside(team().match,anim?.e.attack??attack(team().match)),move.id);points[0]=[p?.hand==='좌타'?478:422,455];}return M.routePoint(points,travelProgress15(u));};
const oldInit=CharacterRenderer.init.bind(CharacterRenderer);
CharacterRenderer.init=async()=>{await Promise.all([oldInit(),F.init()]);};
F.init().then(()=>{if(typeof render==='function')render();}).catch(error=>{runtimeErrors.push(String(error));console.error(error);});
function playerConfig(p,tm){return PortraitIntegrationV13.config(p,tm);}
function describe(p,tm,pose,tick,x,y,flip){
 const m=team()?.match,e=anim?.e,t=anim?playProgress(clamp(anim.elapsed/anim.duration,0,1)):0,form=M.identity(p);
 const attackSide=e?.attack??(m?attack(m):0),offense=m&&tm===tside(m,attackSide),move=e?.moves?.find(v=>v.id===p.id);
 let frame=0,contact=null,anchorProgress=1,direction,headwear=offense?'helmet':'cap',phase=pose;
 const k=tm.id+':'+p.id,prior=samples.get(k),dx=prior?x-prior.x:0,dy=prior?y-prior.y:0,step=Math.hypot(dx,dy);
 const distance=(prior?.pose==='run'?prior.distance:0)+(step<70?step:0);samples.set(k,{x,y,pose,distance});if(samples.size>80)samples.delete(samples.keys().next().value);
 const rear=dy<-.02&&Math.abs(dy)>Math.abs(dx)*.8;
 const run=()=>M.running(distance*24,form.run,rear);
 if(pose==='run')frame=run();
 else if(pose==='slide')frame=form.variation===0?28:25;
 else if(pose==='bat')frame=47+form.bat;
 else if(pose==='swing')frame=t<.20?50+form.bat:t<.25?53+form.bat:t<.34?56+form.bat:38;
 else if(pose==='sad')frame=30;
 else if(pose==='confused')frame=31;
 else if(pose==='celebrate')frame=59+form.habit+6*Math.min(2,Math.floor((tick%900)/300));
 else if(pose==='catcher')frame=5;
 else if(pose==='pitch')frame=t<.1?1:t<.17?70:35;
 else if(pose==='throw')frame=35;
 else if(pose==='catch')frame=33;
 else if(pose==='glove')frame=5;
 else if(pose==='lead'||pose==='ready')frame=5;
 else frame=offense?17:1;
 if(offense&&move){
  const mt=runnerProgress(move,t,e),before=runnerPoint(move,Math.max(0,Math.min(.997,mt-.003))),after=runnerPoint(move,Math.min(1,mt+.003));
  if(mt>0)flip=after[0]<before[0];
  if(mt>=1){frame=move.out?30:move.to===4?(e.type==='hr'?59+form.habit+6:34):17;contact=move.out?null:'foot';
   if((e.tag||e.type==='sb')&&!move.out&&move.to<4){const head=form.variation===0;const recovery=Math.min(1,(Math.max(0,t-(move.until||.9))*(anim?.duration||4200)+(anim?.resultShown?Math.max(0,resultHoldMs(e)-anim.holdLeft):0))/700);
    frame=recovery<.3?(head?28:25):recovery<.75?(head?29:26):17;contact=head&&recovery<.75?'hand':'foot';}
  }
  else if(mt>0&&['bb','hbp'].includes(e.type)){frame=Math.floor(distance/5)%2?6:7;}
  else if(mt>.9&&!move.out&&!e.tag){frame=16;}
  if((e.tag||e.type==='sb')&&mt>.86&&mt<1){const head=form.variation===0;frame=mt<.91?(head?27:24):(head?28:25);}
  if(mt>.86&&!move.out&&move.to<4){contact=[28,29].includes(frame)?'hand':'foot';anchorProgress=clamp((mt-.86)/.14,0,1);}
  if(mt>0&&mt<1&&!move.out&&!e.bh&&move.points.length>2){const xy=runnerPoint(move,mt),near=Math.min(...move.points.slice(1,-1).map(p=>Math.hypot(xy[0]-p[0],xy[1]-p[1])));if(near<12){contact='foot';anchorProgress=1-near/12;}}
  phase=mt>=1?(move.out?'아웃':'도착'):'진루';
 }else if(offense&&m&&(e?.before.bases||m.bases).includes(p.id)){frame=17;contact='foot';}
 if(offense&&e&&p.id===e.batter&&(!move||runnerProgress(move,t,e)===0)){
  if(['bb','hbp'].includes(e.type)&&t>.22)frame=23;
  if(e.type==='hbp'&&t>.2&&t<.45)frame=32;
  if(e.type==='foul'&&t>.34&&t<.7)frame=31;
  if(e.type==='swing'&&t>.4)frame=t<.72?38:47+form.bat;
  if(e.type==='kl'&&t>.7)frame=30;
  if(e.type==='ks'&&t>.4)frame=30;
  if(['bat','swing'].includes(pose))flip=p.hand==='좌타';
 }
 if(offense&&e?.outIds.includes(p.id)&&anim?.resultShown&&resultHoldMs(e)-anim.holdLeft>550){frame=Math.floor(tick/160)%2?6:7;contact=null;}
 if(offense&&['bat','swing'].includes(pose))flip=p.hand==='좌타';
 if(rear&&pose==='run')direction=3;
 if(!offense&&e){const receive=e.motion19?.throws.find(v=>v.receiver===p.id&&t>=v.end-.03);if(receive&&Math.hypot(x-BASES[receive.base][0],y-BASES[receive.base][1])<3){contact='foot';flip=receive.base===1||receive.base===4;direction=1;}}
 const catcher=!offense&&tm.lineup?.find(v=>v.id===p.id)?.pos==='C';if(catcher)headwear='catcher';
 const position=tm.lineup?.find(v=>v.id===p.id)?.pos;headwear=CharacterPartsV17.equipmentFor(offense,position).headwear; return{frame,contact,anchorProgress,direction,headwear,flip,phase,offense,catcher,position,forms:form};
}
function paint(c,x,y,scale,tm,p,state){
 const a=playerConfig(p,tm),out=F.render(a,state.frame,{headwear:state.headwear,flip:state.flip,direction:state.direction,catcher:state.catcher,defense:!state.offense,position:state.position}),bitmap=out.canvas;
 const touch=state.contact?out.contacts[state.contact]:out.foot,u=state.anchorProgress??1,anchor=out.foot.map((v,i)=>v+(touch[i]-v)*u),s=Math.max(.55,scale*.91);
 c.save();c.imageSmoothingEnabled=false;
 c.fillStyle='#062c2555';c.beginPath();c.ellipse(Math.round(x),Math.round(y)+1,9*s,2.3*s,0,0,Math.PI*2);c.fill();
 c.drawImage(bitmap,Math.round(x-anchor[0]*s),Math.round(y-anchor[1]*s),Math.round(64*s),Math.round(64*s));
 c.restore();return out;
}
sprite=function(c,x,y,scale,tm,number=0,role='player',pose='idle',tick=0,id='',flip=false){
 if(role!=='player'||c.canvas.id!=='field'||!F.ready)return originalSprite.apply(this,arguments);
 const p=tm.players?.find(v=>v.id===id);if(!p)return originalSprite.apply(this,arguments);
 const state=describe(p,tm,pose,tick,x,y,flip);paint(c,x,y,scale,tm,p,state);
};
window.FieldIntegrationV13={describe,paint,config:playerConfig,get ready(){return F.ready;}};
})();

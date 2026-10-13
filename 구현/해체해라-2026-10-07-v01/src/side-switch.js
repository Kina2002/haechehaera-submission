'use strict';

// Presentation only: the final pitch has already resolved the next half inning.
function sideSwitchProgress(){return sideSwitch?clamp(sideSwitch.elapsed/sideSwitch.total,0,1):1;}
function sideSwitchPhase(){const u=sideSwitchProgress();return u<.16?'out':u<.55?'switch':'next';}
function sideSwitchBench(side,index=0){return [side===0?58:842,405+(index%3-1)*10];}
function beginSideSwitch(m,e){
 if(!e.inningChange||m.done||skipJob)return false;
 const from={...clone(e.before),...clone(e.after),inning:e.inning,half:e.half,attack:e.attack,defense:clone(e.before.defense),outs:3};
 const to=snap(m),outgoing=[],incoming=[];
 const add=(list,tm,id,pos,pose='idle')=>{const p=ply(tm,id);if(p&&!list.some(x=>x.p.id===id))list.push({p,tm,x:pos[0],y:pos[1],pose});};
 const oldDefense=tside(m,1-e.attack),oldAttack=tside(m,e.attack);
 oldDefense.lineup.forEach(item=>add(outgoing,oldDefense,item.id,m.formation?.[item.id]||fieldPosition(item.pos,from.defense)));
 const battingIds=[e.batter,...e.before.bases.filter(Boolean),...e.moves.map(move=>move.id)];
 for(const id of battingIds){
  const move=e.moves.find(x=>x.id===id),p=ply(oldAttack,id);
  const base=e.after.bases.indexOf(id);
  const pos=move?move.points.at(-1):base>=0?BASES[base+1]:[p?.hand==='좌타'?478:422,455];
  add(outgoing,oldAttack,id,pos);
 }
 const newDefense=tside(m,1-to.attack),newAttack=tside(m,to.attack);
 newDefense.lineup.forEach(item=>add(incoming,newDefense,item.id,fieldPosition(item.pos,to.defense),item.pos==='C'?'catcher':'idle'));
 const next=newAttack.lineup[to.order[to.attack]],p=ply(newAttack,next.id);
 add(incoming,newAttack,next.id,[p.hand==='좌타'?478:422,455],'bat');
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
 sideSwitch={match:m,eventId:e.id,from,to,outgoing,incoming,fromZoom:e.attack===0&&!e.contact?1.16:1,toZoom:to.attack===0?1.16:1,elapsed:0,total:reduced?900:2800,reduced,phase:'out'};
 waitMs=0;
 return true;
}
function settleSideSwitch(){
 if(!sideSwitch)return;
 const m=sideSwitch.match;
 if(!m.done){const df=tside(m,1-attack(m));m.formation=Object.fromEntries(df.lineup.map(item=>[item.id,fieldPosition(item.pos,m.defense)]));}
 sideSwitch=null;
}
function advanceSideSwitch(m,dt){
 if(!sideSwitch)return;
 if(sideSwitch.match!==m||m.done){settleSideSwitch();return;}
 sideSwitch.elapsed=Math.min(sideSwitch.total,sideSwitch.elapsed+dt);
 const phase=sideSwitchPhase();
 if(sideSwitch.elapsed>=sideSwitch.total){settleSideSwitch();waitMs=300;render();}
 else if(sideSwitch.phase!==phase){sideSwitch.phase=phase;render();}
 paintSideSwitch();
}
function sideSwitchCopy(){
 const s=sideSwitch;if(!s)return null;
 const old=s.from.inning+'회 '+(s.from.half?'말':'초'),next=s.to.inning+'회 '+(s.to.half?'말':'초'),own=s.to.attack===0;
 if(sideSwitchPhase()==='out')return {overline:old+' 종료',title:'3아웃!',detail:(s.from.attack===0?'우리 팀 공격':'우리 팀 수비')+'을 마쳤습니다.'};
 if(sideSwitchPhase()==='switch')return {overline:old+' → '+next,title:'공수 교대',detail:'선수들이 자리를 바꾸고 있습니다.'};
 return {overline:'다음 이닝',title:next+' · 우리 팀 '+(own?'공격':'수비'),detail:own?'이제 우리 타자들이 나섭니다.':'수비수들이 위치를 잡습니다.'};
}
function sideSwitchHTML(){
 const copy=sideSwitchCopy();
 return '<div id="sideSwitchHost"'+(!copy||sideSwitch.match.paused?' hidden':'')+'>'+(copy?'<div class="side-switch-card" role="status" aria-live="polite"><small>'+esc(copy.overline)+'</small><strong>'+esc(copy.title)+'</strong><p>'+esc(copy.detail)+'</p></div>':'')+'</div>';
}
function paintSideSwitch(){
 const host=$('#sideSwitchHost');if(!host||!sideSwitch)return;
 host.style.opacity=String(clamp((1-sideSwitchProgress())/.15,0,1));
 const status=$('#fieldStatus');if(status)status.textContent=sideSwitchCopy().detail;
}
function drawSideSwitch(c,m,time){
 if(!sideSwitch||sideSwitch.match!==m)return;
 const s=sideSwitch,u=sideSwitchProgress(),actors=[];
 const add=(list,enter)=>{
  const motion=smoothProgress(clamp((u-(enter ? .5 : .14))/(enter ? .36 : .4),0,1));
  list.forEach((actor,index)=>{
   const q=clamp(motion+(index%3-1)*.015,0,1),side=actor.tm===team()?0:1,bench=sideSwitchBench(side,index);
   const start=enter?bench:[actor.x,actor.y],end=enter?[actor.x,actor.y]:bench;
   const p=s.reduced?(u<.55?0:1):q;
   const opacity=s.reduced?1:enter?clamp(p/.12,0,1):clamp((1-p)/.2,0,1);
   if(s.reduced&&(enter?u<.55:u>=.55)||opacity<=0)return;
   actors.push({...actor,x:start[0]+(end[0]-start[0])*p,y:start[1]+(end[1]-start[1])*p,flip:end[0]<start[0],pose:!s.reduced&&p>0&&p<1?'run':actor.pose,opacity});
  });
 };
 add(s.outgoing,false);add(s.incoming,true);actors.sort((a,b)=>a.y-b.y);
 for(const actor of actors){c.save();c.globalAlpha=actor.opacity;sprite(c,actor.x,actor.y,fieldScale(actor.y),actor.tm,actor.p.number,'player',actor.pose,time,actor.p.id,actor.flip);c.restore();}
 rect(c,0,0,900,530,'#071c3638');
}

(()=>{
 const beforeState=visibleMatchState;
 visibleMatchState=function(m){return sideSwitch?.match===m?clone(sideSwitchPhase()==='next'?sideSwitch.to:sideSwitch.from):beforeState(m);};
 const beforeMatch=matchHTML;
 matchHTML=function(){return beforeMatch().replace('<div id="bigPlay"></div>','<div id="bigPlay"></div>'+sideSwitchHTML());};
 const beforeControls=updateControls;
 updateControls=function(){
  beforeControls();if(!sideSwitch||screen!=='match')return;
  $$('[data-action="command"],[data-action="defense"],[data-action="skip"],[data-v8="sub-open"]').forEach(b=>b.disabled=true);
  const timer=$('#countdown'),hint=$('#commandHint');if(timer)timer.textContent='—';if(hint)hint.textContent='공수 교대 중 · 선수 이동이 끝나면 다음 공을 준비합니다.';
  paintSideSwitch();
 };
 const beforeField=drawField;
 drawField=function(time){
  const m=team()?.match;if(!sideSwitch||sideSwitch.match!==m)return beforeField(time);
  const cv=$('#field');if(!cv)return;const c=cv.getContext('2d');c.imageSmoothingEnabled=false;
  const s=sideSwitch,u=s.reduced?(sideSwitchProgress()<.55?0:1):smoothProgress(sideSwitchProgress()),zoom=s.fromZoom+(s.toZoom-s.fromZoom)*u;
  c.save();c.translate(450*(1-zoom),490*(1-zoom));c.scale(zoom,zoom);drawStadium(c,900,530,time);drawSideSwitch(c,m,time);c.restore();lastDrawTime=time;paintSideSwitch();
 };
 const beforeGo=go;
 go=function(where){if(where!=='match')settleSideSwitch();return beforeGo(where);};
 const beforeSkip=skipRemainingMatch;
 skipRemainingMatch=function(){settleSideSwitch();return beforeSkip();};
 const beforeSub=subDialog;
 subDialog=function(){if(sideSwitch){toast('공수 교대가 끝난 뒤 선수를 교체해 주세요.');return;}return beforeSub();};
 window.HaecheSideSwitch={snapshot:()=>sideSwitch?{eventId:sideSwitch.eventId,phase:sideSwitchPhase(),progress:sideSwitchProgress(),from:{inning:sideSwitch.from.inning,half:sideSwitch.from.half,attack:sideSwitch.from.attack},to:{inning:sideSwitch.to.inning,half:sideSwitch.to.half,attack:sideSwitch.to.attack}}:null};
})();

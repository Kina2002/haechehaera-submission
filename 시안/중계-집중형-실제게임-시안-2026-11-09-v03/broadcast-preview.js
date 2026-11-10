/* 중계 집중형 v03: 공격은 홈 뒤 낮은 원근 구도, 수비·타구는 전체 구도.
 * catcher-view.js가 기존 선수 리소스를 낮은 카메라 좌표로 그립니다.
 * data-test-session: 실제 구단 저장 읽기·쓰기 없음. 캐릭터는 현재 게임 리소스 사용. */
(function(){
'use strict';
const BC={on:true,labels:'key',sideCam:true,aspect:2.05,cam:{cx:450,bottom:532,w:900}};
window.BroadcastPreview={ready:false,settings:BC};
const WIDE={cx:450,bottom:532,w:900};
const CLOSE={cx:450,bottom:532,w:640};
let logOpen=false;
function shownState(){const m=team()?.match;return m?visibleMatchState(m):null;}
function ourAttack(){return shownState()?.attack===0;}
function cameraTarget(){
 if(!BC.sideCam||!ourAttack()||(typeof sideSwitch!=='undefined'&&sideSwitch))return WIDE;
 if(document.body.classList.contains('bc-still'))return CLOSE;
 // Keep balls and strikes close. Only an actual bat contact widens the view;
 // playProgress is the animation's on-field clock, not its raw elapsed fraction.
 if(anim){
  if(BC.eventId!==anim.e.id){BC.eventId=anim.e.id;BC.followBall=false;}
  const t=playProgress(clamp(anim.elapsed/anim.duration,0,1)),e=anim.e;
  const widen=e.contact&&t>=.22||['wp','pb','hbp'].includes(e.type)&&t>=.22||['sb','cs'].includes(e.type)&&t>=.05||e.type==='bb'&&t>=.30;
  if(widen&&!BC.followBall){BC.followBall=true;BC.snap=true;}
  return BC.followBall?WIDE:CLOSE;
 }
 if(BC.followBall&&(typeof waitMs!=='undefined'&&waitMs>150||typeof reaction!=='undefined'&&reaction))return WIDE;
 BC.followBall=false;return CLOSE;
}
function cameraLabel(){
 if(!BC.sideCam)return '공통 시점 · 경기장 전체';
 if(!ourAttack())return '수비 시점 · 외야까지 넓게';
 if(cameraTarget()!==WIDE)return '공격 시점 · 포수 너머 투수 정면';
 return anim?.e?.contact?'타구 발생 · 주루와 수비 전체 보기':'주루·수비 · 경기장 전체';
}
function updateCameraLabel(){
 const el=$('.bc-camera-label'),label=cameraLabel();if(el&&el.textContent!==label)el.textContent=label;
 document.body.classList.toggle('bc-close-camera',BC.on&&BC.sideCam&&ourAttack()&&cameraTarget()===CLOSE);
}
function updateCrop(){
 const host=$('.bc-pitch');if(!host||!BC.on)return;
 const r=host.getBoundingClientRect();if(!r.width||!r.height)return;
 BC.aspect=clamp(r.width/r.height,1.65,2.35);
 const w=Math.floor(Math.min(r.width,r.height*BC.aspect)),h=Math.floor(w/BC.aspect);
 host.style.setProperty('--pitch-w',w+'px');host.style.setProperty('--pitch-h',h+'px');
}
function stepCam(){
 const now=performance.now(),dt=Math.min(120,now-(BC.camTime||now));BC.camTime=now;const target=cameraTarget();
 updateCameraLabel();
 if(BC.snap){Object.assign(BC.cam,target);BC.snap=false;return;}
 const f=1-Math.exp(-dt/(target===WIDE?180:320));for(const k of ['cx','bottom','w'])BC.cam[k]+=(target[k]-BC.cam[k])*f;
}
BC.view=()=>{
 if(!(BC.on&&document.body.classList.contains('in-game')))return{x:0,y:0,w:900,h:530};
 const w=BC.cam.w,h=w/BC.aspect;return{x:BC.cam.cx-w/2,y:BC.cam.bottom-h,w,h};
};
const fit0=fitField15;
fitField15=function(cv,c){
 if(!(BC.on&&document.body.classList.contains('in-game')))return fit0(cv,c);
 stepCam();const v=BC.view(),W=clamp(Math.round((cv.clientWidth||900)*(devicePixelRatio||1)),600,2600),H=Math.round(W*v.h/v.w);
 if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
 const k=W/v.w;c.setTransform(k,0,0,k,-v.x*k,-v.y*k);c.imageSmoothingEnabled=false;
};
// Adapt the existing player speech coordinates to the camera window.
const speechSrc=paintPlayerSpeech22.toString(),A='sx=cr.width/900,sy=cr.height/530;',B='const x=cr.left-box.left+actor.x*sx,y=cr.top-box.top+(actor.y-';
if(speechSrc.includes(A)&&speechSrc.includes(B))paintPlayerSpeech22=(0,eval)('('+speechSrc.replace(A,'_v=BroadcastPreview.settings.view(),sx=cr.width/_v.w,sy=cr.height/_v.h;').replace(B,'const x=cr.left-box.left+(actor.x-_v.x)*sx,y=cr.top-box.top+(actor.y-_v.y-')+')');
const label0=drawActorLabel;
drawActorLabel=function(c,a,labels){
 if(BC.on&&BC.labels==='key'){
  const m=team()?.match,e=anim?.e;if(m){const tm=tside(m,shownState().attack);
   if(!(a.tm===tm||a.fieldPos==='P'||e&&a.p?.id===e.fielderId))return;}
 }
 return label0.apply(this,arguments);
};
// In the batting close-up, keep a base umpire out of the frame when the crop
// would leave only half a body along the top or side. All return in the wide view.
const judges0=activeJudges18;
activeJudges18=function(e){
 const officials=judges0(e);
 if(!BC.on||!BC.sideCam||!ourAttack()||BC.cam.w>=780)return officials;
 const v=BC.view();return officials.filter(o=>o.base===0||o.xy[0]-30>=v.x&&o.xy[0]+30<=v.x+v.w&&o.xy[1]-60*fieldScale(o.xy[1])>=v.y);
};

function put(el,parent){if(el&&el.parentNode!==parent)parent.appendChild(el);}
function replaceIfChanged(el,html){if(el.dataset.html!==html){el.innerHTML=html;el.dataset.html=html;}}
function scoreHTML(m,st){
 // The game resolves a pitch before its animation ends. Hide that pending result
 // in the inning/hit/error cells, just as visibleMatchState does for the main score.
 const pending=anim&&!anim.resultShown?anim.e:null,innings=m.innings.map(a=>a.slice()),hits=m.hits.slice(),errors=m.errors.slice();
 if(pending){
  const side=pending.attack,delta=m.score[side]-st.score[side];
  if(delta&&innings[side][pending.inning-1]!=null)innings[side][pending.inning-1]-=delta;
  if(pending.hit)hits[side]--;
  errors[1-side]-=pending.errors?.length||0;
 }
 const n=Math.max(7,...innings.map(a=>a.length));
 return '<table class="bc-innings" aria-label="이닝별 점수와 안타·실책"><thead><tr><th>팀</th>'+Array.from({length:n},(_,i)=>'<th class="'+(i+1===st.inning?'inning-now':'')+'">'+(i+1)+'</th>').join('')+'<th class="total">R</th><th>H</th><th>E</th></tr></thead><tbody>'+[1-m.home,m.home].map(side=>{
  const tm=tside(m,side);return '<tr class="'+(side===st.attack?'batting':'')+'"><th scope="row">'+badge(tm)+'<span>'+esc(tm.name)+'</span>'+(side===st.attack?'<em>공격</em>':'')+'</th>'+Array.from({length:n},(_,i)=>'<td class="'+(i+1===st.inning?'inning-now':'')+'">'+(innings[side][i]??'–')+'</td>').join('')+'<td class="total">'+st.score[side]+'</td><td>'+hits[side]+'</td><td>'+errors[side]+'</td></tr>';
 }).join('')+'</tbody></table>';
}
function arrange(){
 if(!BC.on||screen!=='match')return;
 const layout=$('.match-layout'),m=team()?.match;if(!layout||!m)return;
 let shell=layout.querySelector(':scope>.bc-shell');
 if(!shell){
  const dug=[...layout.querySelectorAll(':scope>.dugout')],source=layout.querySelector(':scope>section');
  if(!source||dug.length!==2)return;
  shell=document.createElement('section');shell.className='bc-shell';
  shell.innerHTML='<header class="bc-top"><div class="bc-brand"><span class="bc-live">● LIVE</span><strong>해체해라</strong><span class="bc-phase"></span></div><div class="bc-board"></div><div class="bc-top-right"><div class="bc-count"></div><div class="bc-toolbar"></div></div></header><section class="bc-main"><div class="bc-arena"><div class="bc-arena-bar"><span class="bc-camera-label">경기장 중계</span><span>선수들의 움직임에 집중하세요</span><button type="button" class="small" data-bc="log">경기 기록</button></div><div class="bc-pitch"></div><div class="bc-recent" aria-label="최근 플레이"></div><div class="bc-records" hidden><div class="bc-records-title"><b>경기 기록</b><button type="button" data-bc="log" class="small">닫기 ×</button></div></div></div><aside class="bc-lineup"><div class="bc-lineup-caption"><span>공격 팀 타순</span><small>현재 타자 강조</small></div><div class="bc-lineup-slot"></div><div class="bc-lineup-note">공수 교대 시 공격 팀으로 전환</div></aside></section><section class="bc-bottom"><div class="bc-batter-slot"></div><div class="bc-command-slot"></div><div class="bc-pitcher-slot"></div></section>';
  layout.appendChild(shell);source.classList.add('bc-source');
  const phase=shell.querySelector('.bc-phase');phase.textContent=ourAttack()?'우리 팀 공격':'우리 팀 수비';
  // Keep the game's actual nodes and handlers. No game state or player data is replaced here.
  put($('.countboard'),shell.querySelector('.bc-count'));
  put($('.match-top .row'),shell.querySelector('.bc-toolbar'));
  put(source.querySelector('.field-wrap'),shell.querySelector('.bc-pitch'));
  put(source.querySelector('.controls'),shell.querySelector('.bc-command-slot'));
  put(source.querySelector('.play-history21'),shell.querySelector('.bc-records'));
  shell._dug=dug;
  shell._cards=dug.map(d=>d.querySelector('.current-card'));
  const st=shownState();
  put(shell._cards[st.attack],shell.querySelector('.bc-batter-slot'));
  put(shell._cards[1-st.attack],shell.querySelector('.bc-pitcher-slot'));
  for(let side=0;side<dug.length;side++){
   const d=dug[side];d.classList.add('bc-dugout');d.querySelectorAll('.batrow').forEach((r,i)=>{if(i>=9)r.hidden=true;});
   const title=d.querySelector('h3>span:last-child');
   if(title)title.innerHTML='<span>'+esc(tside(m,side).name)+'</span><small>'+(side===0?'우리 팀':'상대 팀')+' · 공격</small>';
  }
 }
 const st=shownState(),atk=st.attack,tm=tside(m,atk);
 put(shell._dug[atk],shell.querySelector('.bc-lineup-slot'));
 put(shell._dug[1-atk],layout);
 shell._dug[1-atk].hidden=true;shell._dug[atk].hidden=false;
 put(shell._cards[atk],shell.querySelector('.bc-batter-slot'));put(shell._cards[1-atk],shell.querySelector('.bc-pitcher-slot'));
 shell.querySelector('.bc-lineup').style.setProperty('--bat-team',COLORS[tm.primary][1]);
 const phase=shell.querySelector('.bc-phase'),phaseText=atk===0?'우리 팀 공격':'우리 팀 수비';if(phase.textContent!==phaseText)phase.textContent=phaseText;
 phase.classList.toggle('is-attack',atk===0);
 replaceIfChanged(shell.querySelector('.bc-board'),scoreHTML(m,st));
 const events=typeof visibleHistory21==='function'?visibleHistory21(m):m.events;
 const last=events.at(-1),recent=last?'<span>최근 플레이</span><b>'+esc(last.batterName||'')+'</b><span class="bc-recent-text">'+esc(eventCaption(last))+'</span>':'<span>경기 시작</span><span class="bc-recent-text">선수들이 첫 공을 준비합니다.</span>';
 replaceIfChanged(shell.querySelector('.bc-recent'),recent);
 shell.querySelector('.bc-records').hidden=!logOpen;
 shell.querySelector('[data-bc="log"]').classList.toggle('active',logOpen);
 document.body.classList.toggle('bc-attack',atk===0);
 updateCameraLabel();
 updateCrop();
}
// A render replaces #app. Reorganise before the next paint; never mutate unchanged text.
let arranging=false;
new MutationObserver(()=>{if(arranging)return;arranging=true;try{arrange();}finally{arranging=false;}}).observe($('#app'),{childList:true,subtree:true});
document.addEventListener('click',ev=>{
 if(ev.target.closest('[data-bc="log"]')){logOpen=!logOpen;arrange();}
 if(ev.target.closest('[data-action="pause"]'))document.body.classList.remove('bc-still');
});
function setMode(on){
 BC.on=on;document.body.classList.toggle('bc-on',on);BC.snap=true;render();arrange();
 if(screen==='match')drawField(performance.now());
 document.querySelectorAll('.bc-dock [data-mode]').forEach(b=>b.classList.toggle('active',(b.dataset.mode==='on')===on));
}
function setSideCam(on){
 BC.sideCam=on;BC.snap=true;updateCameraLabel();
 const b=document.querySelector('[data-cam]');if(b){b.classList.toggle('active',on);b.textContent='공수 시점 '+(on?'ON':'OFF');}
 if(screen==='match')drawField(performance.now());
}
function startDemo(){
 let t=team();if(!t){t=newTeam('해체 드림즈',11,3);data.slots[0]=t;data.current=0;}
 activeGame=true;if(!t.match||t.match.done)startMatch();else go('match');
 const m=team()?.match;if(m){m.auto=true;m.paused=true;}render();
}
function dismissEntrance(){
 if(typeof entrance!=='undefined'&&entrance){document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('바로 경기로'))b.click();});return false;}return true;
}
function stillScene(kind){
 const m=team()?.match;if(!m||m.done){startDemo();return setTimeout(()=>stillScene(kind),150);}
 if(!dismissEntrance()){m.paused=false;return setTimeout(()=>stillScene(kind),150);}
 // Let a pitch already started by the game finish before arranging the still.
 if(anim){m.auto=false;m.paused=false;return setTimeout(()=>stillScene(kind),100);}
 m.auto=true;m.paused=true;
 m.inning=3;m.half=kind==='defense'?(m.home===0?0:1):(m.home===0?1:0);
 m.score=[2,1];m.innings=[[1,1,0,null,null,null,null],[0,1,0,null,null,null,null]];
 // Leave the half-inning not yet begun blank in the scoreboard.
 m.innings[m.home][2]=m.half===0?null:0;
 m.hits=[4,3];m.errors=[0,0];m.order=[3,2];m.last=[2,1];
 const at=tside(m,attack(m)),now=m.order[attack(m)],ids=at.lineup.slice(0,9).filter((_,i)=>i!==now).map(x=>x.id);
 m.bases=kind==='defense'?[ids[0],null,null]:[ids[0],ids[1],null];
 m.outs=1;m.balls=1;m.strikes=1;m.formation=null;if(typeof prepare==='function')prepare(m);
 m.paused=true;document.body.classList.add('bc-still');BC.snap=true;render();arrange();drawField(performance.now());
 window.BroadcastPreview.still=kind;
 document.querySelectorAll('.bc-dock [data-scene]').forEach(b=>b.classList.toggle('active',b.dataset.scene===kind));
}
function playDemo(){
 document.body.classList.remove('bc-still');window.BroadcastPreview.still=false;
 const m=team()?.match;if(!m||m.done){startDemo();return setTimeout(playDemo,150);}
 if(!dismissEntrance())return setTimeout(playDemo,150);
 m.auto=true;m.paused=false;render();arrange();
 document.querySelectorAll('.bc-dock [data-scene]').forEach(b=>b.classList.toggle('active',b.dataset.scene==='play'));
}
function dock(){
 const el=document.createElement('aside');el.className='bc-dock';
 el.innerHTML='<b>중계 집중형 · 포수 뒤 시점 v03</b><span class="bc-dock-group"><button data-mode="on" class="active">새 화면</button><button data-mode="off">현재 화면</button></span><span class="bc-dock-group"><button data-scene="attack">우리 공격</button><button data-scene="defense">우리 수비</button><button data-scene="play">▶ 움직임 보기</button></span><button data-cam class="active">공수 시점 ON</button><small>미리보기 전용</small>';
 document.body.appendChild(el);el.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.mode)setMode(b.dataset.mode==='on');if(b.hasAttribute('data-cam'))setSideCam(!BC.sideCam);if(b.dataset.scene==='play')playDemo();else if(b.dataset.scene)stillScene(b.dataset.scene);});
}
addEventListener('resize',()=>{updateCrop();BC.snap=true;if(screen==='match')drawField(performance.now());});
(function boot(){
 if(typeof ART==='undefined'||!ART.ready||typeof charsReady==='undefined'||!charsReady)return setTimeout(boot,150);
 document.body.classList.add('bc-on');dock();startDemo();arrange();
 window.BroadcastPreview.ready=true;Object.assign(window.BroadcastPreview,{setMode,setSideCam,arrange,stillScene,playDemo});
 const q=new URLSearchParams(location.search);if(q.get('mode')==='off')setMode(false);
 if(q.get('play')==='1')playDemo();else stillScene(q.get('still')==='defense'?'defense':'attack');
})();
})();

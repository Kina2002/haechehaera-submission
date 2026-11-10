/* 중계 화면 시안 · 2026-11-09 v01
   경기장을 화면 가득 깔고, 점수·카운트·타자/투수 카드·조작 버튼을 경기장 위 모서리에 띄우는 배치를 실제 게임 위에서 보여 줍니다.
   게임 부품을 지우지 않고 자리만 옮기며, "지금 화면"으로 바꾸면 원래 배치로 돌아갑니다.
   data-test-session 모드라 실제 구단 저장을 읽거나 쓰지 않습니다. 게임 원본 파일은 바꾸지 않습니다. */
(function(){
'use strict';
const BC={on:true,crop:{x:60,y:110,w:780,h:422},labels:'key',sideCam:true,aspect:780/422};
window.BroadcastPreview={ready:false,settings:BC};

// Camera crop: keep the whole diamond, both foul lines and the outfield, cut most of the stands and sky.
function updateCrop(){const availW=Math.max(600,innerWidth-16),availH=Math.max(360,innerHeight-16);
 const h=clamp(Math.round(BC.crop.w*availH/availW),360,450);BC.crop.h=h;BC.crop.y=532-h;BC.aspect=BC.crop.w/h;
 const aspect=BC.crop.w/h,w=Math.floor(Math.min(availW,availH*aspect));
 document.body.style.setProperty('--bc-aspect',aspect.toFixed(4));document.body.style.setProperty('--bc-w',w+'px');}

// Attack and defence cameras. Both keep home plate at the bottom; the attack camera is about 1.2x closer on the
// batter-pitcher duel (second base still fully in view) and eases out to the wide view when the ball is hit.
const WIDE={cx:450,bottom:532,w:780},CLOSE={cx:450,bottom:532,w:640};
BC.cam={...WIDE};
function ourAttack(){const m=team()?.match;if(!m)return false;const e=anim?.e;return (e?e.attack:attack(m))===0;}
function camTarget(){
 if(!BC.sideCam||!ourAttack()||(typeof sideSwitch!=='undefined'&&sideSwitch))return WIDE;
 const e=anim?.e;if(e&&e.contact&&anim.elapsed/anim.duration>.2)return WIDE;
 // Zoom in only as far as keeps a runner on second base fully in view (wide, short windows get less zoom).
 return {...CLOSE,w:Math.min(WIDE.w,Math.max(CLOSE.w,Math.ceil((CLOSE.bottom-176)*BC.aspect)))};
}
function stepCam(){const now=performance.now(),dt=Math.min(120,now-(BC.camTime||now));BC.camTime=now;const t=camTarget();
 if(BC.snap){Object.assign(BC.cam,t);BC.snap=false;return;}
 const f=1-Math.exp(-dt/260);for(const k of ['cx','bottom','w'])BC.cam[k]+=(t[k]-BC.cam[k])*f;}
BC.view=()=>{if(!(BC.on&&document.body.classList.contains('in-game')))return {x:0,y:0,w:900,h:530};
 const w=BC.cam.w,h=w/BC.aspect;return {x:BC.cam.cx-w/2,y:BC.cam.bottom-h,w,h};};

// The field canvas keeps game coordinates; only the visible window changes.
const fit0=fitField15;
fitField15=function(cv,c){
 if(BC.on&&document.body.classList.contains('in-game'))stepCam();
 const v=BC.view();if(v.w===900&&v.x===0)return fit0(cv,c);
 const W=clamp(Math.round((cv.clientWidth||900)*(window.devicePixelRatio||1)),600,2600),H=Math.round(W*v.h/v.w);
 if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}const k=W/v.w;c.setTransform(k,0,0,k,-v.x*k,-v.y*k);c.imageSmoothingEnabled=false;
};
// Speech bubbles follow the cropped window.
const speechSrc=paintPlayerSpeech22.toString(),A='sx=cr.width/900,sy=cr.height/530;',B='const x=cr.left-box.left+actor.x*sx,y=cr.top-box.top+(actor.y-';
if(speechSrc.includes(A)&&speechSrc.includes(B))paintPlayerSpeech22=(0,eval)('('+speechSrc.replace(A,'_v=BroadcastPreview.settings.view(),sx=cr.width/_v.w,sy=cr.height/_v.h;').replace(B,'const x=cr.left-box.left+(actor.x-_v.x)*sx,y=cr.top-box.top+(actor.y-_v.y-')+')');
else console.warn('중계 화면 시안: 말풍선 위치 코드가 예상과 달라 그대로 둡니다.');

// Name tags only for the players who matter right now: batter and runners, the pitcher, and the fielder making the play.
const label0=drawActorLabel;
drawActorLabel=function(c,a,labels){
 if(BC.on&&BC.labels==='key'){const m=team()?.match,e=anim?.e;if(m){const bat=tside(m,e?e.attack:attack(m));
  if(!(a.tm===bat||a.fieldPos==='P'||(e&&a.p?.id===e.fielderId)))return;}}
 return label0.apply(this,arguments);
};

// Move the game's own parts into overlay boxes on the field (they keep their ids, so the game still updates them).
function box(wrap,cls){let b=wrap.querySelector(':scope>.'+cls);if(!b){b=document.createElement('div');b.className='bc-box '+cls;wrap.appendChild(b);}return b;}
function put(el,parent){if(el&&el.parentNode!==parent)parent.appendChild(el);}
function arrange(){
 if(!BC.on||screen!=='match')return;const wrap=$('.field-wrap');if(!wrap)return;
 // Home plate sits at the bottom centre, so nothing goes there: playback runs along the stands at the top,
 // our team's card and command buttons stack in the empty foul ground at the bottom left.
 const tl=box(wrap,'bc-tl'),tc=box(wrap,'bc-tc'),tr=box(wrap,'bc-tr'),bl=box(wrap,'bc-bl'),br=box(wrap,'bc-br');
 put($('.scoreboard'),tl);put($('.countboard'),tl);
 const row=$('.match-top .row');if(row){row.classList.add('bc-toolbar');put(row,tc);}
 const ctr=$('.controls');if(ctr&&ctr.parentNode!==bl)bl.insertBefore(ctr,bl.firstChild);
 const dug=$$('.match-layout>.dugout');put(dug[0]?.querySelector('.current-card'),bl);put(dug[1]?.querySelector('.current-card'),br);
 // Attack or defence badge on the score bug, in our colour when we bat; our card is the highlighted one.
 let side=tl.querySelector('.bc-side');if(!side){side=document.createElement('div');side.className='bc-side';tl.insertBefore(side,tl.firstChild);}
 // Only touch the text when it changes: rewriting it is itself a DOM change that would wake the observer again forever.
 const ours=ourAttack(),tm=team(),label=ours?'우리 팀 공격':'우리 팀 수비';if(side.textContent!==label)side.textContent=label;side.classList.toggle('attack',ours);
 if(tm)side.style.setProperty('--our',COLORS[tm.primary][1]);
 document.body.classList.toggle('bc-attack',ours);document.body.classList.toggle('bc-defense',!ours);
 if(!tr.childElementCount)tr.innerHTML='<button class="small" data-bc="lineup">라인업</button><button class="small" data-bc="log">경기 기록</button>';
 tr.querySelector('[data-bc="lineup"]').classList.toggle('on',document.body.classList.contains('bc-lineup'));
 tr.querySelector('[data-bc="log"]').classList.toggle('on',document.body.classList.contains('bc-log'));
}
// Re-arrange right after the game rebuilds its screen (before the browser paints), so the old layout never flashes.
let arranging=false;new MutationObserver(()=>{if(arranging)return;arranging=true;try{arrange();}finally{arranging=false;}}).observe(document.querySelector('#app'),{childList:true,subtree:true});
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-bc]');if(!b)return;const cls='bc-'+b.dataset.bc;
 document.body.classList.toggle(cls);if(cls==='bc-lineup')document.body.classList.remove('bc-log');if(cls==='bc-log')document.body.classList.remove('bc-lineup');arrange();});

function setMode(on){BC.on=on;document.body.classList.toggle('bc-on',on);document.body.classList.remove('bc-lineup','bc-log');updateCrop();render();arrange();if(screen==='match')drawField(performance.now());
 document.querySelectorAll('.bc-dock [data-mode]').forEach(b=>b.classList.toggle('active',(b.dataset.mode==='on')===on));}
function dock(){const el=document.createElement('aside');el.className='bc-dock';
 el.innerHTML='<b>중계 화면 시안</b><button data-mode="on" class="active">새 화면</button><button data-mode="off">지금 화면</button><button data-dock="labels" title="이름표: 중요한 선수만 / 모두">이름표: 중요한 선수만</button><button data-dock="cam">카메라: 공격 때 가깝게</button>';
 document.body.appendChild(el);
 el.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.mode)setMode(b.dataset.mode==='on');
  if(b.dataset.dock==='cam'){BC.sideCam=!BC.sideCam;b.textContent='카메라: '+(BC.sideCam?'공격 때 가깝게':'항상 넓게');if(screen==='match')drawField(performance.now());}
  if(b.dataset.dock==='labels'){BC.labels=BC.labels==='key'?'all':'key';b.textContent='이름표: '+(BC.labels==='key'?'중요한 선수만':'모두');}});}

function startDemo(){let t=team();if(!t){t=newTeam('해체 드림즈',11,3);data.slots[0]=t;data.current=0;}
 activeGame=true;if(!t.match||t.match.done)startMatch();else go('match');const m=team()?.match;if(m){m.auto=true;m.paused=false;}render();}
// ?still=attack|defense|1 opens a paused scene for screenshots (attack: we bat with runners on first and second;
// defence: we field with a runner on first); ?mode=off starts in the current layout.
function stillScene(kind){
 if(typeof entrance!=='undefined'&&entrance){document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('바로 경기로'))b.click();});return setTimeout(()=>stillScene(kind),300);}
 const m=team()?.match;if(!m||anim)return setTimeout(()=>stillScene(kind),200);
 if(kind==='attack')m.half=m.home===0?1:0;if(kind==='defense')m.half=m.home===0?0:1;
 const at=tside(m,attack(m)),now=m.order[attack(m)],ids=at.lineup.slice(0,9).map(x=>x.id).filter((id,i)=>i!==now);
 m.bases=kind==='defense'?[ids[0],null,null]:[ids[0],ids[1],null];m.outs=1;m.balls=1;m.strikes=1;m.formation=null;if(typeof prepare==='function')prepare(m);
 m.paused=true;document.body.classList.add('bc-still');BC.snap=true;render();arrange();drawField(performance.now());window.BroadcastPreview.still=kind||true;
}
window.BroadcastPreview.stillScene=k=>stillScene(k);
addEventListener('resize',()=>{updateCrop();if(screen==='match')drawField(performance.now());});
(function boot(){
 if(typeof ART==='undefined'||!ART.ready||typeof charsReady==='undefined'||!charsReady)return setTimeout(boot,200);
 document.body.classList.add('bc-on');updateCrop();dock();startDemo();arrange();
 window.BroadcastPreview.ready=true;window.BroadcastPreview.setMode=setMode;window.BroadcastPreview.arrange=arrange;
 const q=new URLSearchParams(location.search);if(q.get('mode')==='off')setMode(false);if(q.has('still'))stillScene(q.get('still'));
})();
})();

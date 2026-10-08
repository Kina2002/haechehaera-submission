(function(root,factory){
 const rules=factory();if(typeof module==='object'&&module.exports)module.exports=rules;else root.TutorialRules28=rules;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const steps=['lineup','start','mode','batting','substitution','wrapup'];
 function create(step='lineup'){return {version:1,status:'active',step,matchId:null,defenseSeen:false};}
 function normalize(s){
  if(!s||s.version!==1||!['active','completed','skipped'].includes(s.status)||!steps.includes(s.step)||!(s.matchId===null||typeof s.matchId==='string')||typeof s.defenseSeen!=='boolean')return null;
  return {version:1,status:s.status,step:s.step,matchId:s.matchId,defenseSeen:s.defenseSeen};
 }
 function scene(s,c){
  if(!s||s.status!=='active'||!c.active||c.blocked)return null;
  if(c.done&&['result','home'].includes(c.screen))return c.screen==='result'?'result':'home';
  if(!c.live){
   if(s.step==='lineup'&&c.screen==='lineup')return 'lineup';
   if(s.step==='start'&&['lineup','home'].includes(c.screen))return 'start';
   return null;
  }
  if(c.screen!=='match'||!c.ready)return null;
  if(s.step==='mode')return 'mode';
  if(s.step==='batting')return c.auto?null:c.attack===0?'batting':!s.defenseSeen?'defense':null;
  if(s.step==='substitution')return 'substitution';
  return null;
 }
 return {create,normalize,scene};
});

if(typeof window!=='undefined'&&typeof document!=='undefined')(()=>{
 'use strict';
 const rules=window.TutorialRules28;
 let view=null,held=null,starting=false;
 const content={
  lineup:{n:1,title:'선발 9명을 먼저 정해요',text:'선수는 12명, 출전은 9명입니다. 자동 배치가 현재 능력치와 체력에 맞춰 선발·수비 위치·타순을 추천합니다. 나머지 선수는 후보로 남아요.',goal:'빛나는 자동 배치 버튼을 눌러 보세요.',target:'[data-action="lineup-auto"]',allow:'[data-action="lineup-auto"]'},
  start:{n:2,title:'이 편성으로 첫 경기를 시작해요',text:'출전 선수와 타순이 준비됐습니다. 경기 시작 버튼을 누르면 입장 연출을 거쳐 경기에 들어갑니다.',goal:'경기 시작 버튼을 눌러 보세요.',target:'[data-action="lineup-start"], [data-action="start"]',allow:'[data-action="lineup-start"], [data-action="start"]'},
  mode:{n:2,title:'감독님이 지시하는 반자동 경기',text:'반자동은 공마다 최대 10초 동안 지시합니다. 자동 경기는 선수들이 판단하며 1·2·3배속으로 볼 수 있어요. 남은 경기 스킵도 같은 경기 규칙으로 결과를 계산합니다.',goal:'우선 반자동으로 한 번 지시해 볼까요?',target:'.match-top .row',button:'반자동으로 시작',action:'play'},
  defense:{n:3,title:'지금은 우리 팀 수비 차례예요',text:'초·말과 공격·수비는 전광판에서 확인합니다. 수비는 전진·기본·후퇴와 좌·중앙·우를 고릅니다. 선택한 수비 위치는 이 타석 동안 유지돼요.',goal:'수비 지시 하나를 누르세요. 우리 공격 때 타격 안내가 이어집니다.',target:'.defcommands',allow:'[data-action="defense"]'},
  batting:{n:3,title:'타자에게 원하는 방향을 알려 주세요',text:'컨택은 맞히기에, 풀스윙은 강한 타구에, 참아는 좋은 공을 기다리는 데 유리합니다. 능력치와 상대 투수도 영향을 주며, 지시가 성공을 보장하지는 않아요.',goal:'컨택·풀스윙·참아 중 하나를 눌러 보세요.',target:'.commands',allow:'[data-action="command"]'},
  substitution:{n:4,title:'체력이 줄면 후보도 살펴봐요',text:'선수 옆 체력 막대를 확인하세요. 체력이 절반 아래로 떨어지면 경기 능력이 감소합니다. 교체한 선수는 이 경기에 다시 나올 수 없어요.',goal:'선수 교체 창을 열어 후보와 체력을 확인하세요. 지금 교체할 필요는 없습니다.',target:'[data-v8="sub-open"]',allow:'[data-v8="sub-open"]'},
  result:{n:5,title:'경기가 끝나면 다음 경기를 준비해요',text:'경기 결과에서 점수·경기 흐름·결산을 확인할 수 있습니다. 구단 홈에서 다음 경기 운영비를 확인한 뒤 훈련과 영입을 결정해요.',goal:'구단 홈으로 이동해 마지막 안내를 확인하세요.',target:'.result-next',button:'구단 홈으로',action:'home'},
  home:{n:5,title:'운영비를 남기고 선수들을 키워요',text:'강조된 칸이 다음 경기 운영비입니다. 훈련에는 해당 훈련시설과 자금이 필요하고, 영입에는 영입비와 경기 급여가 듭니다. 무리해서 돈을 쓰기 전에 운영비를 확인하세요.',goal:'훈련·영입 화면을 열어 보거나 안내를 마쳐도 됩니다.',target:'.home-budget',button:'안내 마치기',action:'finish'}
 };
 function state(t=team()){return rules.normalize(t?.tutorial28);}
 function busy(){return starting||!!entrance||!!clubEventView||!!mlbDialog||!!achievementNotice||!!$('#dialog')?.open||document.hidden||!!skipJob;}
 function hold(m){if(!m||m.done||held?.m===m)return;release(false);held={m,prior:m.paused};m.paused=true;save();window.GameAudio?.update();}
 function release(resume=true){
  if(!held)return;const h=held;held=null;
  h.m.paused=resume&&screen==='match'&&team()?.match===h.m&&!document.hidden&&!$('#dialog')?.open?h.prior:true;
  lastFrame=performance.now();
 }
 function remove(){if(!view)return;for(const [b,prior] of view.access){if(prior===null)b.removeAttribute('aria-describedby');else b.setAttribute('aria-describedby',prior);}view.root.remove();view=null;}
 function advance(step){const s=team()?.tutorial28;if(!s||s.status!=='active')return;s.step=step;save();}
 function close(status){const s=team()?.tutorial28;if(s)s.status=status;remove();release();save();render();}
 function context(){const m=team()?.match;return {active:activeGame,screen,live:!!m&&!m.done,done:!!m?.done,auto:!!m?.auto,attack:m?attack(m):null,blocked:busy(),ready:!anim&&!reaction&&!shiftLead&&waitMs<=0&&!m?.pendingEntrance};}
 function refresh(){
  const t=team(),s=state(t),m=t?.match;
  if(s?.status==='active'&&m&&!m.done&&s.matchId!==m.id){t.tutorial28.matchId=m.id;t.tutorial28.step='mode';t.tutorial28.defenseSeen=false;save();}
  const kind=rules.scene(state(t),context());
  if(!kind){remove();if(held)release(false);return;}
  if(m?.done&&t.tutorial28.step!=='wrapup')advance('wrapup');
  const def=content[kind];let target=$(def.target);
  if(kind==='home'&&!target)target=$('.club-report');
  if(!target){remove();return;}
  if(view?.kind===kind&&view.target===target)return;
  remove();if(screen==='match')hold(m);
  const root=document.createElement('div');root.className='tutorial-layer';
  root.innerHTML='<div class="tutorial-shade top"></div><div class="tutorial-shade left"></div><div class="tutorial-shade right"></div><div class="tutorial-shade bottom"></div><div class="tutorial-focus"></div><section class="tutorial-card" role="dialog" aria-modal="false" aria-labelledby="tutorial-title"><div class="tutorial-meta"><span>첫 경기 안내 · '+def.n+' / 5</span><b>'+(screen==='match'?'경기 · 지시 시간 정지':'감독님 가이드')+'</b></div><h2 id="tutorial-title">'+esc(def.title)+'</h2><p id="tutorial-description">'+esc(def.text)+'</p><p class="tutorial-goal" id="tutorial-goal">'+esc(def.goal)+'</p><div class="tutorial-actions">'+(kind==='home'?'<button data-tutorial="growth">훈련 보기</button><button data-tutorial="market">영입 보기</button>':'')+(def.button?'<button class="primary" data-tutorial="'+def.action+'">'+def.button+'</button>':'')+'<button class="ghost small" data-tutorial="skip">안내 건너뛰기</button></div></section>';
  const access=def.allow?[...document.querySelectorAll(def.allow)].map(b=>{const prior=b.getAttribute('aria-describedby');b.setAttribute('aria-describedby','tutorial-title tutorial-description tutorial-goal');return [b,prior];}):[];
  document.body.append(root);view={root,kind,target,def,access};
  if(def.allow)target.querySelectorAll(def.allow).forEach(b=>b.disabled=false);
  if(def.allow&&target.matches(def.allow))target.disabled=false;
  target.scrollIntoView({block:'center',inline:'center',behavior:'instant'});position();
  (def.allow?$(def.allow):root.querySelector('button'))?.focus({preventScroll:true});
 }
 function position(){
  if(!view)return;const {root,target}=view,card=root.querySelector('.tutorial-card');
  const w=document.documentElement.clientWidth,h=window.innerHeight,r=target.getBoundingClientRect();
  const x=Math.max(6,r.left-6),y=Math.max(6,r.top-6),right=Math.min(w-6,r.right+6),bottom=Math.min(h-6,r.bottom+6);
  const box=(selector,left,top,width,height)=>Object.assign(root.querySelector(selector).style,{left:left+'px',top:top+'px',width:Math.max(0,width)+'px',height:Math.max(0,height)+'px'});
  box('.top',0,0,w,y);box('.left',0,y,x,bottom-y);box('.right',right,y,w-right,bottom-y);box('.bottom',0,bottom,w,h-bottom);box('.tutorial-focus',x,y,right-x,bottom-y);
  const cw=Math.min(410,w-24);card.style.width=cw+'px';card.style.maxHeight=Math.max(170,h-24)+'px';
  const ch=card.getBoundingClientRect().height;
  let left=x,top=bottom+12;
  if(right+12+cw<=w){left=right+12;top=Math.min(y,h-ch-12);}
  else if(top+ch>h){top=y-ch-12;if(top<12){left=12;top=12;}}
  card.style.left=Math.max(12,Math.min(left,w-cw-12))+'px';card.style.top=Math.max(12,Math.min(top,h-ch-12))+'px';
 }
 const beforeTeam=newTeam;newTeam=function(name,primary,secondary,deferRoster=false){const t=beforeTeam(name,primary,secondary,deferRoster);if(deferRoster)t.tutorial28=rules.create();return t;};
 const beforeValidate=validateTeam;validateTeam=function(t){beforeValidate(t);if(t.tutorial28!==undefined){const s=rules.normalize(t.tutorial28);if(s)t.tutorial28=s;else delete t.tutorial28;}};
 const beforeAssign=autoAssignLineup;autoAssignLineup=function(t){const error=beforeAssign(t);if(!error&&state(t)?.step==='lineup')advance('start');return error;};
 const beforeStart=startMatch;startMatch=function(){starting=true;remove();release(false);try{beforeStart();}finally{starting=false;refresh();}};
 const beforeCommit=commitInstruction;commitInstruction=function(m,kind,value,fn){const ok=beforeCommit(m,kind,value,fn),s=state();if(ok&&s?.status==='active'&&s.step==='batting'){if(kind==='defense')team().tutorial28.defenseSeen=true;else if(kind==='attack')advance('substitution');save();}return ok;};
 const beforeSub=subDialog;subDialog=function(){beforeSub();if($('#dialog')?.open&&state()?.status==='active'&&state()?.step==='substitution'){advance('wrapup');$('#dialog').insertAdjacentHTML('afterbegin','<p class="tutorial-sub-note">후보와 체력만 확인해도 됩니다. 창을 닫은 뒤 경기 재개를 누르세요.</p>');remove();}};
 const beforeRender=render;render=function(){remove();beforeRender();if(screen==='settings'&&activeGame&&team())$('#app').insertAdjacentHTML('beforeend','<section class="panel settings-extra"><h3>첫 경기 안내</h3><p>자동 배치부터 타격 지시·교체·경기 후 운영까지 실제 버튼을 누르며 배웁니다. 현재 구단의 선수와 기록은 이어집니다.</p><button data-tutorial="replay">튜토리얼 다시 보기</button><p class="tiny muted">경기 중이면 현재 경기의 진행 방식 안내부터, 경기 전이면 라인업부터 시작합니다.</p></section>');refresh();};
 const beforeTick=tick;tick=function(now){refresh();beforeTick(now);};
 // Capture on window so blocked actions never reach the existing document handlers.
 window.addEventListener('click',ev=>{
  const b=ev.target.closest('button,[data-action]'),a=b?.dataset.tutorial;
  if(a){ev.preventDefault();ev.stopImmediatePropagation();
   if(a==='skip')close('skipped');
   else if(a==='replay'){remove();release(false);const m=team()?.match;team().tutorial28=rules.create(m&&!m.done?'mode':'lineup');team().tutorial28.matchId=m&&!m.done?m.id:null;save();go(m&&!m.done?'match':'lineup');}
   else if(a==='play'){const m=team()?.match;if(!m||m.done)return;advance('batting');remove();release();m.auto=false;m.paused=false;lastFrame=performance.now();save();render();}
   else if(a==='home'){remove();release();advance('wrapup');go('home');}
   else if(['finish','growth','market'].includes(a)){close('completed');if(a!=='finish')go(a);}
   return;
  }
  if(!view||view.root.contains(ev.target))return;
  if(b&&!b.disabled&&view.def.allow&&b.matches(view.def.allow)){remove();release();if(team()?.match&&screen==='match')team().match.paused=false;return;}
  ev.preventDefault();ev.stopImmediatePropagation();
 },true);
 window.addEventListener('keydown',ev=>{
  if(!view)return;
  if(ev.key==='Escape'){ev.preventDefault();ev.stopImmediatePropagation();close('skipped');return;}
  if(ev.key==='Tab'){
   const allowed=view.def.allow?[...document.querySelectorAll(view.def.allow)].filter(x=>!x.disabled):[];
   const nodes=[...allowed,...view.root.querySelectorAll('button')],i=nodes.indexOf(document.activeElement);
   ev.preventDefault();nodes[(i+(ev.shiftKey?-1:1)+nodes.length)%nodes.length]?.focus({preventScroll:true});
  }
 },true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&held)held.prior=true;});
 window.addEventListener('resize',()=>{view?.target.scrollIntoView({block:'center',inline:'center',behavior:'instant'});position();});window.addEventListener('scroll',position,{passive:true});
 window.HaecheTutorial28={snapshot:()=>({state:state(),scene:view?.kind||null,held:!!held}),refresh};
 refresh();
})();

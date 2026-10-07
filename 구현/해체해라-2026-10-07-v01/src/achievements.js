// Permanent club badges. Achievement unlocks never grant wins, trophies or money.
const ACHIEVEMENTS=[
 {id:'games-1',group:'발자취',metric:'games',target:1,title:'플레이 볼!',goal:'구단 경기 1회 완료',mark:'G',tier:'I'},
 {id:'games-10',group:'발자취',metric:'games',target:10,title:'우리도 이제 야구단',goal:'구단 경기 10회 완료',mark:'G',tier:'II'},
 {id:'games-50',group:'발자취',metric:'games',target:50,title:'해체는 아직 이르다',goal:'구단 경기 50회 완료',mark:'G',tier:'III'},
 {id:'wins-1',group:'승리',metric:'wins',target:1,title:'첫 승의 맛',goal:'누적 1승 달성',mark:'W',tier:'I'},
 {id:'wins-10',group:'승리',metric:'wins',target:10,title:'이기는 법을 배웠다',goal:'누적 10승 달성',mark:'W',tier:'II'},
 {id:'wins-50',group:'승리',metric:'wins',target:50,title:'동네를 넘어',goal:'누적 50승 달성',mark:'W',tier:'III'},
 {id:'wins-100',group:'승리',metric:'wins',target:100,title:'해체 불가',goal:'누적 100승 달성',mark:'W',tier:'IV'},
 {id:'hits-100',group:'선수 활약',metric:'hits',target:100,title:'안타 제조기',goal:'선수 한 명이 개인 통산 100안타',mark:'H',tier:'I'},
 {id:'homers-10',group:'선수 활약',metric:'homers',target:10,title:'담장 밖으로',goal:'선수 한 명이 개인 통산 10홈런',mark:'H',tier:'II'},
 {id:'facilities-1',group:'구단 성장',metric:'facilities',target:1,title:'우리의 첫 시설',goal:'구단 시설 1개 보유',mark:'B',tier:'I'},
 {id:'facilities-5',group:'구단 성장',metric:'facilities',target:5,title:'제법 구단답다',goal:'구단 시설 5개 보유',mark:'B',tier:'II'},
 {id:'facilities-10',group:'구단 성장',metric:'facilities',target:10,title:'야구에 진심인 구단',goal:'구단 시설 10개 보유',mark:'B',tier:'III'},
 {id:'mlb-1',group:'MLB 진출',metric:'mlb',target:1,title:'더 큰 무대로',goal:'선수 1명 MLB 진출 성공',mark:'M',tier:'I'},
 {id:'mlb-3',group:'MLB 진출',metric:'mlb',target:3,title:'빅리그의 산실',goal:'선수 3명 MLB 진출 성공',mark:'M',tier:'II'},
 {id:'mlb-10',group:'MLB 진출',metric:'mlb',target:10,title:'세계로 보내는 구단',goal:'선수 10명 MLB 진출 성공',mark:'M',tier:'III'}
];
function achievementMetrics(t){
 const players=[...(t.players||[]),...(t.departed||[]),...(t.mlbHistory||[]).filter(h=>h.success).map(h=>h.player)];
 const best=key=>players.reduce((n,p)=>Math.max(n,p?.stats?.[key]||0),0);
 const facilities=new Set((t.facilities||[]).filter(id=>FACILITIES.some(f=>f[0]===id)));
 return {games:t.w+t.l+t.d,wins:t.w,hits:best('h'),homers:best('hr'),facilities:facilities.size,
  mlb:new Set((t.mlbHistory||[]).filter(h=>h.success).map(h=>h.player.id)).size};
}
function syncAchievements(t,now=Date.now()){
 // Personal statistics change during play; recognize them only after the game ends.
 if(!t||live(t))return {changed:false,added:[]};
 const retroactive=t.achievements===undefined,metrics=achievementMetrics(t);
 t.achievements??={version:1,unlocked:[]};
 const owned=new Set(t.achievements.unlocked.map(x=>x.id)),added=[];
 for(const def of ACHIEVEMENTS)if(!owned.has(def.id)&&metrics[def.metric]>=def.target){
  const entry={id:def.id,at:now,atGame:metrics.games,seen:false,retroactive};
  t.achievements.unlocked.push(entry);added.push(entry);
 }
 return {changed:retroactive||added.length>0,added};
}
function pendingAchievements(t){return t?.achievements?.unlocked.filter(x=>!x.seen)||[];}
function acknowledgeAchievements(t,ids){
 const selected=new Set(ids);let changed=false;
 for(const h of t?.achievements?.unlocked||[])if(selected.has(h.id)&&!h.seen){h.seen=true;changed=true;}
 return changed;
}
function validateAchievementState(t){
 const state=t.achievements;if(state===undefined)return;
 if(!state||state.version!==1||!Array.isArray(state.unlocked)||state.unlocked.length>ACHIEVEMENTS.length)throw Error('업적 저장 형식 오류');
 const ids=new Set();
 for(const h of state.unlocked){
  if(!h||!ACHIEVEMENTS.some(d=>d.id===h.id)||ids.has(h.id)||
   !Number.isSafeInteger(h.at)||h.at<0||h.at>8640000000000000||
   !Number.isSafeInteger(h.atGame)||h.atGame<0||typeof h.seen!=='boolean'||typeof h.retroactive!=='boolean')throw Error('업적 달성 기록 오류');
  ids.add(h.id);
 }
}

// UI integration. One grouped notification stays until acknowledged, without a modal.
const validateBeforeAchievements=validateTeam;
validateTeam=function(t){validateBeforeAchievements(t);validateAchievementState(t);};
const saveBeforeAchievements=save;
save=function(force=false){if(activeGame)syncAchievements(team());return saveBeforeAchievements(force);};
let achievementFilter='all',achievementGroup='all',achievementViewTeam=null,achievementNotice=null,achievementNoticeTimer=0;
function achievementBadge(def){return '<span class="ach-badge" aria-hidden="true"><b>'+def.mark+'</b><small>'+def.tier+'</small></span>';}
function achievementDate(h){return (h.retroactive?'기존 기록 인정 · 확인일 ':'달성일 ')+new Date(h.at).toLocaleDateString('ko-KR')+' · 구단 '+h.atGame+'경기';}
function achievementCard(def,t,metrics){
 const h=t.achievements?.unlocked.find(x=>x.id===def.id),value=h?def.target:Math.min(metrics[def.metric],def.target);
 return '<article class="ach-card '+(h?'earned':'locked')+'" data-achievement="'+def.id+'">'+achievementBadge(def)+
  '<div class="ach-card-content"><div class="ach-card-top"><span>'+def.group+'</span><span class="ach-state">'+(h?'✓ 달성'+(!h.seen?' · NEW':''):'진행 중')+'</span></div><h3>'+def.title+'</h3><p>'+def.goal+'</p>'+
  '<div class="ach-progress"><progress max="'+def.target+'" value="'+value+'" aria-label="'+def.goal+'"></progress><b>'+value+' / '+def.target+'</b></div>'+
  '<small class="ach-date">'+(h?achievementDate(h):'앞으로 '+(def.target-value)+(def.metric==='mlb'?'명':def.metric==='facilities'?'개':def.metric==='wins'?'승':def.metric==='games'?'경기':def.metric==='hits'?'안타':'홈런'))+'</small></div></article>';
}
function achievementsHTML(t){
 if(achievementViewTeam!==t.id){achievementViewTeam=t.id;achievementFilter='all';achievementGroup='all';}
 const metrics=achievementMetrics(t),owned=new Set((t.achievements?.unlocked||[]).map(x=>x.id)),pending=pendingAchievements(t),total=ACHIEVEMENTS.length;
 const defs=ACHIEVEMENTS.filter(d=>(achievementGroup==='all'||d.group===achievementGroup)&&(achievementFilter==='all'||owned.has(d.id)===(achievementFilter==='earned')));
 return '<section class="ach-hero"><div><p class="eyebrow">CLUB MILESTONES</p><h1>우리 구단의 업적</h1><p>한 경기, 한 선수. 해체하지 않고 쌓아 온 이야기.</p><span class="ach-club-name">'+esc(t.name)+'</span></div><div class="ach-total"><strong>'+owned.size+'<small> / '+total+'</small></strong><span>획득한 업적 배지</span></div></section>'+
  '<div class="ach-toolbar"><div class="ach-filters" aria-label="업적 상태">'+[['all','전체',total],['progress','진행 중',total-owned.size],['earned','달성',owned.size]].map(([id,label,n])=>'<button data-ach-filter="'+id+'" aria-pressed="'+(achievementFilter===id)+'">'+label+' <b>'+n+'</b></button>').join('')+'</div><label>분야 <select data-ach-group>'+['all',...new Set(ACHIEVEMENTS.map(d=>d.group))].map(g=>'<option value="'+g+'" '+(g===achievementGroup?'selected':'')+'>'+(g==='all'?'모든 분야':g)+'</option>').join('')+'</select></label></div>'+
  (pending.length?'<div class="ach-unread"><span>새 업적 '+pending.length+'개를 달성했습니다.</span><button class="small" data-ach-read-all>새 업적 모두 확인</button></div>':'')+
  '<div class="ach-grid">'+(defs.length?defs.map(d=>achievementCard(d,t,metrics)).join(''):'<section class="panel ach-empty"><h3>'+(achievementFilter==='earned'?'아직 달성한 업적이 없습니다.':'표시할 업적이 없습니다.')+'</h3><p>전체 목록에서 다음 목표를 찾아보세요.</p><button data-ach-filter="all">전체 업적 보기</button></section>')+'</div>'+
  '<p class="ach-footnote">업적은 구단별로 저장하며 한 번 달성하면 유지됩니다. 승리 트로피와 자금은 별도로 유지합니다.<br>이전 구단은 남아 있는 경기·선수·시설·MLB 기록으로 인정합니다. 선수 활약에는 이적한 선수의 보존된 기록도 포함합니다.</p>';
}
function achievementSummaryHTML(t){
 const n=t.achievements?.unlocked.length||0,pending=pendingAchievements(t).length;
 return '<section class="panel ach-summary"><div><span class="eyebrow">CLUB MILESTONES</span><h3>구단 업적 <b>'+n+' / '+ACHIEVEMENTS.length+'</b></h3><p>'+(pending?'새 업적 '+pending+'개를 확인하세요.':'경기와 육성의 발자취를 모아 보세요.')+'</p></div><button data-go="achievements">업적 보기'+(pending?' · NEW':'')+'</button></section>';
}
const navBeforeAchievements=buttonsNav;
buttonsNav=function(){
 navBeforeAchievements();if(!activeGame||!team())return;
 const nav=$('#header nav'),settings=nav?.querySelector('[data-go="settings"]'),n=pendingAchievements(team()).length;
 if(nav){const b=document.createElement('button');b.dataset.go='achievements';b.className=screen==='achievements'?'active':'';b.textContent='업적'+(n?' · '+n:'');b.disabled=screen==='match'&&!team().match?.paused&&!team().match?.done;settings?nav.insertBefore(b,settings):nav.append(b);}
};
function removeAchievementNotice(){if(achievementNotice){achievementNotice.el.remove();achievementNotice=null;}}
function updateAchievementNotice(){
 const t=activeGame?team():null,pending=pendingAchievements(t);
 const allowed=['home','result','records','players','growth','market','facilities','finance','news','achievements'].includes(screen);
 if(!t||!allowed||live(t)||!pending.length){removeAchievementNotice();return;}
 if(document.querySelector('dialog[open]')||clubEventView||mlbDialog||entrance)return;
 const ids=pending.map(x=>x.id),key=t.id+':'+ids.join(',');if(achievementNotice?.key===key)return;
 removeAchievementNotice();const first=ACHIEVEMENTS.find(d=>d.id===ids[0]),el=document.createElement('aside');el.className='achievement-notice';el.setAttribute('aria-label','새 업적 알림');
 el.innerHTML='<div class="ach-notice-main" role="status" aria-live="polite">'+achievementBadge(first)+'<div><span class="eyebrow">ACHIEVEMENT UNLOCKED</span><h3>'+first.title+(ids.length>1?' 외 '+(ids.length-1)+'개':'')+'</h3><p>새로운 구단 업적을 달성했습니다.</p></div></div><div class="ach-notice-actions"><button class="small ghost" data-ach-dismiss>확인</button><button class="small primary" data-ach-open>업적 보기</button></div>';
 achievementNotice={el,key,ids,teamId:t.id};document.body.append(el);
 el.addEventListener('click',e=>{const b=e.target.closest('[data-ach-dismiss],[data-ach-open]');if(!b||team()?.id!==t.id)return;
  const open=b.hasAttribute('data-ach-open');acknowledgeAchievements(t,ids);removeAchievementNotice();save();if(open)go('achievements');else render();
 });
}
function scheduleAchievementNotice(){
 if(achievementNoticeTimer)return;
 achievementNoticeTimer=setTimeout(()=>{achievementNoticeTimer=0;updateAchievementNotice();},0);
}
const renderBeforeAchievements=render;
render=function(){
 const t=activeGame?team():null;
 const changed=t&&syncAchievements(t).changed;
 if(screen==='achievements'&&t){
  ensureClub(t);document.body.classList.remove('in-game');document.body.dataset.screen=screen;buttonsNav();$('#app').innerHTML=achievementsHTML(t);
  if(lastScreen!==screen)window.scrollTo(0,0);lastScreen=screen;
  if(saveError)$('#app').insertAdjacentHTML('afterbegin','<div class="error-banner">'+esc(saveError)+'</div>');
 }else{
  renderBeforeAchievements();
  if(t&&['home','records'].includes(screen))$('#app').insertAdjacentHTML(screen==='records'?'afterbegin':'beforeend',achievementSummaryHTML(t));
 }
 if(changed)save();scheduleAchievementNotice();
};
document.addEventListener('close',scheduleAchievementNotice,true);
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-ach-filter],[data-ach-read-all]');if(!b||!activeGame||!team())return;
 if(b.hasAttribute('data-ach-filter')){achievementFilter=b.dataset.achFilter;render();$('#app [data-ach-filter="'+achievementFilter+'"]').focus({preventScroll:true});}
 else{acknowledgeAchievements(team(),pendingAchievements(team()).map(x=>x.id));save();render();}
});
document.addEventListener('change',e=>{if(e.target.matches('[data-ach-group]')){achievementGroup=e.target.value;render();$('[data-ach-group]').focus({preventScroll:true});}});

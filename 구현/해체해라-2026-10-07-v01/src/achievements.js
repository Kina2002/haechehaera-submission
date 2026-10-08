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
const ORIGINAL_ACHIEVEMENT_IDS=new Set(ACHIEVEMENTS.map(d=>d.id));
ACHIEVEMENTS.push(
 {id:'game-hits-3',group:'선수 활약',metric:'gameHits',target:3,title:'오늘 공이 수박만 하네',goal:'한 선수가 한 경기 3안타 이상 · 승패 무관 · 홈런 포함',mark:'H',tier:'III'},
 ...[['contact','컨택','배트에 자석'],['power','파워','담장은 거들 뿐'],['eye','선구안','그 공은 안 삽니다'],['speed','주력','발에 모터 달았냐'],['sense','야구센스','야구는 머리로'],['catch','포구','글러브에 접착제'],['throw','송구','레이저 배송'],['velocity','구속','공이 안 보이는데요'],['control','제구','주문하신 코너입니다'],['stamina','스태미나','퇴근이 뭔데요']].map(([key,label,title])=>({id:'stat-'+key+'-100',group:'선수 성장',metric:'stat-'+key,key,target:100,title,goal:label+' 100인 선수를 최초 보유 · 훈련·실제 영입 모두 인정',mark:'A',tier:'I'})),
 ...[[1,'이것도 야구냐'],[10,'내일은 이기겠지'],[50,'보살의 경지'],[100,'그래도 우리 팀']].map(([target,title],i)=>({id:'losses-'+target,group:'패배',metric:'losses',target,title,goal:'누적 '+target+'패 달성 · 콜드패 포함',mark:'L',tier:['I','II','III','IV'][i]})),
 ...[['winStreak','연승',['이게 우리 팀이라고?','승리가 체질','해체 금지 구역']],['lossStreak','연패',['내일은 이긴다며','야구 끊습니다','근데 다음 경기 몇 시죠?']]].flatMap(([metric,label,titles])=>[3,5,10].map((target,i)=>({id:metric+'-'+target,group:'연승·연패',metric,target,title:titles[i],goal:target+label+' 달성 · 무승부는 연속 기록 유지',mark:metric==='winStreak'?'W':'L',tier:['I','II','III'][i]}))),
 {id:'pinch-winner',group:'감독의 순간',metric:'pinchWinner',target:1,title:'감독의 한 수',goal:'대타의 첫 타석 안타로 앞선 뒤 동점·역전 없이 승리 · 홈런 포함',mark:'P',tier:'I'},
 {id:'comeback-3',group:'야구의 드라마',metric:'comeback',target:1,title:'아직 안 끝났다',goal:'경기 중 3점 차 이상 뒤졌다가 최종 승리',mark:'D',tier:'I'},
 {id:'break-losses-3',group:'야구의 드라마',metric:'breakLosses',target:1,title:'드디어 이겼다',goal:'3연패 이상 이후 승리 · 무승부는 연패 유지',mark:'D',tier:'II'},
 {id:'bonehead-win-3',group:'이 게임다운 목표',metric:'boneheadWin',target:1,title:'이걸 이기네',goal:'우리 팀이 한 경기 본헤드 3회 이상을 저지르고도 승리',mark:'!',tier:'I'},
 {id:'bonehead-redemption',group:'이 게임다운 목표',metric:'redemption',target:1,title:'오늘만 봐준다',goal:'본헤드 당사자가 같은 경기에서 이후 결승 안타로 만회하고 승리',mark:'!',tier:'II'},
 {id:'mercy-loss-1',group:'야구의 드라마',metric:'mercyLoss',target:1,title:'오늘은 여기까지',goal:'우리 팀의 첫 콜드패 · 3회 종료부터 양 팀 공격 완료 후 10점 차 이상',mark:'L',tier:'I'}
);
function achievementPlayers(t){return [...(t.players||[]),...(t.departed||[]),...(t.mlbHistory||[]).filter(h=>h.success).map(h=>h.player)].filter(Boolean);}
function achievementOutcome(m){return Array.isArray(m.score)?Math.sign(m.score[0]-m.score[1]):m.result==='승리'?1:m.result==='패배'?-1:0;}
function achievementProof(m,p,detail=''){
 const out={};if(m){if(typeof m.id==='string')out.gameId=m.id;const opponent=typeof m.opp==='string'?m.opp:m.opp?.name;if(opponent)out.opponent=opponent;if(Array.isArray(m.score))out.score=m.score.slice();}
 if(p){if(typeof p.id==='string')out.playerId=p.id;if(typeof p.name==='string')out.playerName=p.name;if(Number.isInteger(p.number))out.number=p.number;}
 if(detail)out.detail=detail;return out;
}
function emptyAchievementFacts(){return {version:1,maxDeficit:0,failedIds:[],leadHit:null};}
function applyAchievementEvent(f,e,subs=[]){
 if(f.lastEvent===e.id)return;const before=e.before?.score,after=e.after?.score;if(!before||!after)return;
 const prev=before[0]-before[1],next=after[0]-after[1];f.maxDeficit=Math.max(f.maxDeficit,-prev,-next);
 if(next<=0)f.leadHit=null;
 else if(prev<=0)f.leadHit=e.attack===0&&e.hit>0?{eventId:e.id,playerId:e.batter,playerName:e.batterName||'',number:e.batterNumber,
  pinchFirst:subs.some(s=>s.pinch&&s.inId===e.batter&&s.firstPAEvent===e.id),redeemed:f.failedIds.includes(e.batter)}:null;
 // A mistake on this same play cannot count as an earlier mistake.
 if(e.bh&&e.bhSide===0)for(const id of e.bhActors||[])if(!f.failedIds.includes(id))f.failedIds.push(id);
 f.lastEvent=e.id;
}
function achievementGameFacts(m){
 if(m.achievementStats?.version===1)return JSON.parse(JSON.stringify(m.achievementStats));
 const f=emptyAchievementFacts(),events=new Map();
 for(const e of [...(m.recap?.highlights||[]),...(m.events||[])])events.set(e.id,{...events.get(e.id),...e});
 const index=e=>Number(String(e.id).split(':').pop());
 for(const e of [...events.values()].sort((a,b)=>index(a)-index(b)))applyAchievementEvent(f,e,m.subs||[]);
 return f;
}
function achievementStreaks(t){
 if(t.achievementStreaks)return {...t.achievementStreaks};
 const s={version:1,win:0,loss:0,bestWin:0,bestLoss:0,lastGame:null};
 for(const m of [...(t.history||[])].reverse()){const outcome=achievementOutcome(m);if(outcome>0){s.win++;s.loss=0;}else if(outcome<0){s.loss++;s.win=0;}s.bestWin=Math.max(s.bestWin,s.win);s.bestLoss=Math.max(s.bestLoss,s.loss);s.lastGame=m.id||null;}
 return s;
}
function achievementMetrics(t){
 const players=achievementPlayers(t);
 const best=key=>players.reduce((n,p)=>Math.max(n,p?.stats?.[key]||0),0);
 const facilities=new Set((t.facilities||[]).filter(id=>FACILITIES.some(f=>f[0]===id)));
 const streaks=achievementStreaks(t),metrics={games:t.w+t.l+t.d,wins:t.w,losses:t.l,hits:best('h'),homers:best('hr'),facilities:facilities.size,
  mlb:new Set((t.mlbHistory||[]).filter(h=>h.success).map(h=>h.player.id)).size,winStreak:streaks.bestWin,lossStreak:streaks.bestLoss,
  gameHits:0,pinchWinner:0,comeback:0,breakLosses:0,boneheadWin:0,redemption:0,mercyLoss:0,proofs:{}};
 for(const def of ACHIEVEMENTS.filter(d=>d.key)){const p=players.find(p=>p.a?.[def.key]===100);metrics[def.metric]=p?100:0;if(p)metrics.proofs[def.metric]=achievementProof(null,p);}
 for(const [metric,key]of [['hits','h'],['homers','hr']]){const p=players.find(p=>p.stats?.[key]===metrics[metric]);if(p)metrics.proofs[metric]=achievementProof(null,p);}
 let losses=0;
 for(const m of [...(t.history||[])].reverse()){
  const outcome=achievementOutcome(m),f=achievementGameFacts(m),lead=f.leadHit,proof=achievementProof(m);
  const record=(metric,yes,p=null,detail='')=>{if(yes){metrics[metric]=1;metrics.proofs[metric]=achievementProof(m,p,detail);}};
  for(const p of Object.values(m.recap?.box||{}))if(p.h>metrics.gameHits){metrics.gameHits=p.h;metrics.proofs.gameHits=achievementProof(m,p,p.h+'안타');}
  const hitter=lead?{id:lead.playerId,name:lead.playerName,number:lead.number}:null;
  record('comeback',outcome>0&&f.maxDeficit>=3,null,'최대 '+f.maxDeficit+'점 차 열세');
  record('breakLosses',outcome>0&&(f.breakLosses||losses>=3));
  record('pinchWinner',outcome>0&&lead?.pinchFirst,hitter);
  record('redemption',outcome>0&&lead?.redeemed,hitter);
  record('boneheadWin',outcome>0&&(Array.isArray(m.bh)?m.bh[0]:m.bh??m.boneheads?.[0]??0)>=3);
  record('mercyLoss',outcome<0&&!!m.mercy,null,m.mercy?m.mercy.inning+'회 · '+m.mercy.margin+'점 차':'');
  if(outcome<0)losses++;else if(outcome>0)losses=0;
  if(m.achievementStats?.streakWin===metrics.winStreak)metrics.proofs.winStreak=proof;
  if(m.achievementStats?.streakLoss===metrics.lossStreak)metrics.proofs.lossStreak=proof;
 }
 return metrics;
}
function syncAchievements(t,now=Date.now()){
 // Personal statistics change during play; recognize them only after the game ends.
 if(!t||live(t))return {changed:false,added:[]};
 const retroactive=t.achievements===undefined,upgrade=t.achievements?.catalog!==2,metrics=achievementMetrics(t);
 t.achievements??={version:1,unlocked:[]};t.achievements.catalog=2;
 const owned=new Set(t.achievements.unlocked.map(x=>x.id)),added=[];
 for(const def of ACHIEVEMENTS)if(!owned.has(def.id)&&metrics[def.metric]>=def.target){
  const entry={id:def.id,at:now,atGame:metrics.games,seen:false,retroactive:retroactive||(upgrade&&!ORIGINAL_ACHIEVEMENT_IDS.has(def.id))};
  if(metrics.proofs[def.metric])entry.proof=metrics.proofs[def.metric];
  t.achievements.unlocked.push(entry);added.push(entry);
 }
 return {changed:upgrade||added.length>0,added};
}
function pendingAchievements(t){return t?.achievements?.unlocked.filter(x=>!x.seen)||[];}
function acknowledgeAchievements(t,ids){
 const selected=new Set(ids);let changed=false;
 for(const h of t?.achievements?.unlocked||[])if(selected.has(h.id)&&!h.seen){h.seen=true;changed=true;}
 return changed;
}
function validateAchievementState(t){
 const streaks=t.achievementStreaks;
 if(streaks!==undefined&&(!streaks||streaks.version!==1||!['win','loss','bestWin','bestLoss'].every(k=>Number.isSafeInteger(streaks[k])&&streaks[k]>=0)||streaks.win>streaks.bestWin||streaks.loss>streaks.bestLoss||(streaks.win>0&&streaks.loss>0)||(streaks.lastGame!==null&&typeof streaks.lastGame!=='string')))throw Error('연승·연패 저장 형식 오류');
 for(const m of [t.match,...(t.history||[])].filter(Boolean))if(m.achievementStats!==undefined)validateAchievementFacts(m.achievementStats);
 const state=t.achievements;if(state===undefined)return;
 if(!state||state.version!==1||(state.catalog!==undefined&&state.catalog!==2)||!Array.isArray(state.unlocked)||state.unlocked.length>ACHIEVEMENTS.length)throw Error('업적 저장 형식 오류');
 const ids=new Set();
 for(const h of state.unlocked){
  if(!h||!ACHIEVEMENTS.some(d=>d.id===h.id)||ids.has(h.id)||
   !Number.isSafeInteger(h.at)||h.at<0||h.at>8640000000000000||
   !Number.isSafeInteger(h.atGame)||h.atGame<0||typeof h.seen!=='boolean'||typeof h.retroactive!=='boolean')throw Error('업적 달성 기록 오류');
  ids.add(h.id);
  if(h.proof!==undefined)validateAchievementProof(h.proof);
 }
}
function validateAchievementProof(p){
 if(!p||typeof p!=='object'||Array.isArray(p))throw Error('업적 장면 기록 오류');
 for(const k of ['gameId','opponent','playerId','playerName','detail'])if(p[k]!==undefined&&(typeof p[k]!=='string'||p[k].length>200))throw Error('업적 장면 기록 오류');
 if(p.number!==undefined&&(!Number.isInteger(p.number)||p.number<0||p.number>99))throw Error('업적 선수 등번호 오류');
 if(p.score!==undefined&&(!Array.isArray(p.score)||p.score.length!==2||!p.score.every(n=>Number.isSafeInteger(n)&&n>=0)))throw Error('업적 점수 기록 오류');
}
function validateAchievementFacts(f){
 if(!f||f.version!==1||!Number.isSafeInteger(f.maxDeficit)||f.maxDeficit<0||!Array.isArray(f.failedIds)||f.failedIds.length>35||new Set(f.failedIds).size!==f.failedIds.length||f.failedIds.some(id=>typeof id!=='string'||id.length>200))throw Error('경기 업적 판정 기록 오류');
 if(f.lastEvent!==undefined&&typeof f.lastEvent!=='string')throw Error('경기 업적 사건 기록 오류');
 if(f.leadHit!==null){const hit=f.leadHit;if(!hit||typeof hit.eventId!=='string'||typeof hit.playerId!=='string'||typeof hit.pinchFirst!=='boolean'||typeof hit.redeemed!=='boolean')throw Error('결승타 업적 기록 오류');validateAchievementProof(hit);}
 if(f.breakLosses!==undefined&&typeof f.breakLosses!=='boolean')throw Error('연패 탈출 기록 오류');
 for(const k of ['streakWin','streakLoss'])if(f[k]!==undefined&&(!Number.isSafeInteger(f[k])||f[k]<0))throw Error('경기 연속 기록 오류');
}

// UI integration. One grouped notification stays until acknowledged, without a modal.
const recapBeforeAchievements=recordRecap;
recordRecap=function(m,e){
 for(const s of m.subs||[])if(e.attack===0&&e.pa&&s.inId===e.batter&&s.firstPAEvent===null)s.firstPAEvent=e.id;
 m.achievementStats??=achievementGameFacts(m);applyAchievementEvent(m.achievementStats,e,m.subs||[]);return recapBeforeAchievements(m,e);
};
const rewardBeforeAchievements=reward;
reward=function(m){
 if(m.rewarded)return rewardBeforeAchievements(m);
 const t=team(),streaks=achievementStreaks(t),previousLosses=streaks.loss;
 const result=rewardBeforeAchievements(m);if(!m.rewarded)return result;
 const outcome=achievementOutcome(m);m.achievementStats??=achievementGameFacts(m);
 if(streaks.lastGame!==m.id){if(outcome>0){streaks.win++;streaks.loss=0;}else if(outcome<0){streaks.loss++;streaks.win=0;}streaks.bestWin=Math.max(streaks.bestWin,streaks.win);streaks.bestLoss=Math.max(streaks.bestLoss,streaks.loss);streaks.lastGame=m.id;}
 m.achievementStats.breakLosses=outcome>0&&previousLosses>=3;m.achievementStats.streakWin=streaks.win;m.achievementStats.streakLoss=streaks.loss;t.achievementStreaks=streaks;
 const h=(t.history||[]).find(h=>h.id===m.id);if(h)h.achievementStats=JSON.parse(JSON.stringify(m.achievementStats));
 syncAchievements(t);return result;
};
const validateBeforeAchievements=validateTeam;
validateTeam=function(t){validateBeforeAchievements(t);validateAchievementState(t);};
const saveBeforeAchievements=save;
save=function(force=false){if(activeGame)syncAchievements(team());return saveBeforeAchievements(force);};
let achievementFilter='all',achievementGroup='all',achievementViewTeam=null,achievementNotice=null,achievementNoticeTimer=0;
function achievementBadge(def,hidden=false){return '<span class="ach-badge" aria-hidden="true"><b>'+(hidden?'?':def.mark)+'</b><small>'+(hidden?'':def.tier)+'</small></span>';}
function achievementDate(h){return (h.retroactive?'기존 기록 인정 · 확인일 ':'달성일 ')+new Date(h.at).toLocaleDateString('ko-KR')+' · 구단 '+h.atGame+'경기';}
function achievementCard(def,t,metrics){
 const h=t.achievements?.unlocked.find(x=>x.id===def.id);
 return '<article class="ach-card '+(h?'earned':'locked')+'" data-achievement="'+def.id+'">'+achievementBadge(def,!h)+
  '<div class="ach-card-content"><div class="ach-card-top"><span>'+def.group+'</span><span class="ach-state">'+(h?'✓ 달성'+(!h.seen?' · NEW':''):'미달성')+'</span></div><h3>'+esc(def.title)+'</h3>'+
  (h?'<p>'+esc(def.goal)+'</p>'+achievementProofHTML(h.proof)+'<small class="ach-date">'+achievementDate(h)+'</small>':'<p class="ach-hidden-condition">달성하면 조건이 공개됩니다.</p>')+'</div></article>';
}
function achievementProofHTML(p){if(!p)return '';const parts=[];if(p.playerName)parts.push(p.playerName+(p.number!==undefined?' #'+p.number:''));if(p.opponent)parts.push('상대 '+p.opponent);if(p.score)parts.push(p.score.join(' : '));if(p.detail)parts.push(p.detail);return parts.length?'<p class="ach-proof">'+parts.map(esc).join(' · ')+'</p>':'';}
function achievementsHTML(t){
 if(achievementViewTeam!==t.id){achievementViewTeam=t.id;achievementFilter='all';achievementGroup='all';}
 const metrics=achievementMetrics(t),owned=new Set((t.achievements?.unlocked||[]).map(x=>x.id)),pending=pendingAchievements(t),total=ACHIEVEMENTS.length;
 const defs=ACHIEVEMENTS.filter(d=>(achievementGroup==='all'||d.group===achievementGroup)&&(achievementFilter==='all'||owned.has(d.id)===(achievementFilter==='earned')));
 return '<section class="ach-hero"><div><p class="eyebrow">CLUB MILESTONES</p><h1>우리 구단의 업적</h1><p>한 경기, 한 선수. 해체하지 않고 쌓아 온 이야기.</p><span class="ach-club-name">'+esc(t.name)+'</span></div><div class="ach-total"><strong>'+owned.size+'<small> / '+total+'</small></strong><span>획득한 업적 배지</span></div></section>'+
  '<div class="ach-toolbar"><div class="ach-filters" aria-label="업적 상태">'+[['all','전체',total],['progress','미달성',total-owned.size],['earned','달성',owned.size]].map(([id,label,n])=>'<button data-ach-filter="'+id+'" aria-pressed="'+(achievementFilter===id)+'">'+label+' <b>'+n+'</b></button>').join('')+'</div><label>분야 <select data-ach-group>'+['all',...new Set(ACHIEVEMENTS.map(d=>d.group))].map(g=>'<option value="'+g+'" '+(g===achievementGroup?'selected':'')+'>'+(g==='all'?'모든 분야':g)+'</option>').join('')+'</select></label></div>'+
  (pending.length?'<div class="ach-unread"><span>새 업적 '+pending.length+'개를 달성했습니다.</span><button class="small" data-ach-read-all>새 업적 모두 확인</button></div>':'')+
  '<div class="ach-grid">'+(defs.length?defs.map(d=>achievementCard(d,t,metrics)).join(''):'<section class="panel ach-empty"><h3>'+(achievementFilter==='earned'?'아직 달성한 업적이 없습니다.':'표시할 업적이 없습니다.')+'</h3><p>전체 목록에서 다음 목표를 찾아보세요.</p><button data-ach-filter="all">전체 업적 보기</button></section>')+'</div>'+
  '<p class="ach-footnote">이름을 단서로 업적을 찾아보세요. 조건은 달성한 뒤 공개됩니다.<br>업적은 구단별로 저장하며 한 번 달성하면 유지됩니다. 이전 구단은 남아 있는 경기·선수·시설·MLB 기록으로 인정합니다.</p>';
}
function achievementSummaryHTML(t,compact=false){
 const n=t.achievements?.unlocked.length||0,pending=pendingAchievements(t).length;
 if(compact)return '<section class="panel ach-summary home-achievements"><h3>구단 업적</h3><div class="row between"><span>달성한 업적</span><b class="gold">'+n+' / '+ACHIEVEMENTS.length+'</b></div><button class="small" data-go="achievements">업적 보기'+(pending?' · 새 업적 '+pending+'개':'')+'</button></section>';
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
  if(t&&screen==='records')$('#app').insertAdjacentHTML('afterbegin',achievementSummaryHTML(t));
  if(t&&screen==='home'){
   const report=$('.club-report'),summary=report?.firstElementChild,budget=$('#app > .operating-budget');
   if(summary){summary.classList.add('home-club-summary');summary.insertAdjacentHTML('afterend',achievementSummaryHTML(t,true));}
   if(report&&budget)report.append(budget);
  }
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

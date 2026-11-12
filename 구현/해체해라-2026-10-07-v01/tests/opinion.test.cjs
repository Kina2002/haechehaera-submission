// Disband opinion, emergency loan, forfeits, disband and rebuild (build step ③): per-game changes, the losing streak,
// the season-end settlement (summed, then clamped once), the 동네 6th-place streak, disband before promotion, the rebuild,
// the loan (amount, once per season, interest, repayment, season-end +10), 0:9 forfeits, old saves and validation.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8');
const game=read('game.js'),ext=read('extensions.js'),league=read('league.js'),growth=read('growth.js'),opinion=read('opinion.js'),events=read('club-events.js'),auto=read('auto-lineup.js');
const O_HOOKS=opinion.indexOf('// Game hooks.'),O_UI=opinion.indexOf('// UI integration.');
assert.ok(O_HOOKS>0&&O_UI>O_HOOKS&&opinion.indexOf('// Game hooks.',O_HOOKS+1)<0&&opinion.indexOf('// UI integration.',O_UI+1)<0,'opinion.js markers');
const line=(src,re)=>{const m=src.match(re);assert.ok(m,'missing source line '+re);return m[0];};
function seeded(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}

const helpers=`
 var club=(name='우리')=>{const t=newTeam(name,11,5);data.slots=[t,null];data.current=0;ensureClub(t);t.players.forEach(p=>{p.age=20;});return t;};
 // One league game the way the game counts it (payout, wages and contracts, then the league result and the hooks).
 var play=(t,score,extra={})=>{const L=t.league,fx=leagueFixture(L),m={id:'m'+L.season+'-'+fx.round,rng:777,score,league:{season:L.season,tier:L.tier,round:fx.round,oppId:fx.oppId},...extra};
  payLeaguePayout(t,m);for(const p of t.players)settleContract26(t,p,m,0);const info=settleLeagueMatch(t,m);return m;};
 // The season end with a chosen final rank (the real table is still computed; only the rank is replaced).
 var forceRank=null;(()=>{const step=LEAGUE_SEASON_END_STEPS.find(s=>s.id==='rank'),real=step.run;step.run=(t,ctx)=>{real(t,ctx);if(forceRank)ctx.rank=forceRank;};})();
 var endSeason=(t,rank,value=null)=>{if(value!==null)t.opinion.value=value;forceRank=rank;t.league.round=LEAGUE.seasonGames;try{return runSeasonEnd(t);}finally{forceRank=null;}};
 var shrink=(t,n)=>{t.players=t.players.slice(0,n);repairRoster26(t);};
 var setMarket=(t,prices)=>{t.market=createMarketCandidates(t).slice(0,prices.length);t.market.forEach((p,i)=>{p.price=prices[i];});t.marketRound=t.w+t.l+t.d;};
 var tryValidate=t=>{try{validateTeam(JSON.parse(JSON.stringify(t)));return 'ok';}catch(e){return e.message;}};
`;
// Real game code: game.js rules, the economy/contract parts of extensions.js, the club-event table, auto-lineup,
// league.js and growth.js up to their UI sections, then opinion.js up to its UI section.
function world({seed=20261111}={}){
 const math=Object.create(Math);math.random=seeded(seed);let ids=0;
 const ctx=vm.createContext({Math:math,crypto:{randomUUID:()=>'id-'+(++ids),getRandomValues:a=>{a[0]=4242;return a;}},location:{hash:''},performance:{now:()=>0},
  document:{documentElement:{hasAttribute:()=>true}},window:{addEventListener:()=>{}},GameStorage:{create:()=>({})},
  money:n=>n+'만원',selection:null,CharacterRenderer:{names:{},variants:{}}});
 vm.runInContext(game.slice(0,game.indexOf('\nfunction rect(')),ctx);
 for(const re of [/^function opponentAbility\(.*$/m,/^function recordRecap\(.*$/m,/^function validBattingDraft\(.*$/m])vm.runInContext(line(game,re),ctx);
 vm.runInContext('chooseGroup=()=>null;',ctx);
 vm.runInContext(ext.slice(ext.indexOf('const BALANCE='),ext.indexOf('\nconst oldInitial=')),ctx);
 for(const re of [/^const oldValidate=validateTeam;.*$/m,/^const live=.*$/m,/^function ledger\(.*$/m,/^function spend\(.*$/m,/^function gain\(.*$/m,/^function news\(.*$/m,
  /^function crowdDemand\(.*$/m,/^function attendance\(.*$/m,/^const MARKET_REFRESH_COST=.*$/m,/^function createMarketCandidates\(.*$/m,/^function salaryAsk\(.*$/m])vm.runInContext(line(ext,re),ctx);
 vm.runInContext(ext.slice(ext.indexOf('let fatigueSnapshot=null;'),ext.indexOf('reward=function(m){')),ctx);
 vm.runInContext(ext.slice(ext.indexOf('const legacyAsk26='),ext.indexOf('function validVacancy26(')),ctx);
 for(const re of [/^function validVacancy26\(.*$/m,/^const plyBefore26=ply;$/m,/^ply=function\(t,id\).*$/m])vm.runInContext(line(ext,re),ctx);
 vm.runInContext(ext.slice(ext.indexOf('negotiate=function(p,amount,random='),ext.indexOf('\nconst commitBefore26=')),ctx);
 vm.runInContext(events.slice(events.indexOf('const CLUB_EVENT_TYPES'),events.indexOf('const CLUB_EVENT_DURATION')),ctx);
 vm.runInContext(auto,ctx);
 vm.runInContext(league.slice(0,league.indexOf('// UI integration.')),ctx);
 vm.runInContext(growth.slice(0,growth.indexOf('// UI integration.')),ctx);
 vm.runInContext(opinion.slice(0,O_UI),ctx);
 vm.runInContext(helpers,ctx);
 const run=code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
 return {run,exec:code=>vm.runInContext(code,ctx)};
}
const deltas=c=>c.parts.map(p=>[p.key,p.delta]);

test('decided numbers, stages and the season-end order',()=>{
 const {run}=world();
 const O=run('OPINION');
 assert.equal(O.start,30);assert.equal(O.restart,20);assert.equal(O.disbandAt,100);
 assert.deepEqual([O.win,O.loss,O.draw,O.unpaid,O.loanTaken,O.loanAtSeasonEnd],[-5,5,0,5,15,10]);
 assert.deepEqual(O.rank,[-30,-15,0,0,10,20]);
 assert.deepEqual([O.coldWin,O.coldLoss,O.streakFrom,O.streakExtra,O.last6,O.last6From,O.fanUp,O.fanDown],[-5,5,3,2,10,2,-2,2]);
 assert.deepEqual(run('[0,29,30,59,60,89,90,100].map(opinionStageName)'),['평온','평온','술렁임','술렁임','분노','분노','해체 직전','해체 직전']);
 assert.deepEqual(run('EMERGENCY_LOAN'),{interest:.1,repayShare:.3,margin:1.2,players:10,marketSize:3});
 assert.deepEqual(run('LEAGUE_SEASON_END_STEPS.map(s=>s.id)'),['rank','prize','opinion','disband','promotion','aging','rebuild','offseason','opinion-record']);
 // a new club starts at 30% with no loan
 assert.deepEqual(run('(()=>{const t=club();return [t.opinion.value,t.opinion.lossStreak,t.loan===undefined,tryValidate(t)];})()'),[30,0,true,'ok']);
});

test('per-game changes: win, loss, draw, cold games, unpaid wages, fan events, clamp at 0 and 100',()=>{
 const {run}=world();
 const one=(score,extra='{}',value=50,streak=0)=>run(`(()=>{const t=club();t.opinion.value=${value};t.opinion.lossStreak=${streak};const m=play(t,${JSON.stringify(score)},${extra});return {c:m.opinion,v:t.opinion.value,h:t.opinion.log.at(-1).kind};})()`);
 const cases=[
  [[3,1],'{}',45,[['win',-5]]],
  [[12,1],'{mercy:{inning:3,margin:11}}',40,[['win',-5],['coldWin',-5]]],
  [[1,3],'{}',55,[['loss',5]]],
  [[0,10],'{mercy:{inning:4,margin:10}}',60,[['loss',5],['coldLoss',5]]],
  [[2,2],'{}',50,[['draw',0]]],
  [[1,2],'{finance:{debt:120}}',60,[['loss',5],['unpaid',5]]],
  [[4,2],'{finance:{debt:0}}',45,[['win',-5]]],
  [[2,2],"{clubEvent:{kind:'autograph',text:'팬 사인회에 끝까지 남음',fans:18}}",48,[['draw',0],['fanUp',-2]]],
  [[2,2],"{clubEvent:{kind:'litter',text:'구장 주변 쓰레기 무단 투기',fans:-22}}",52,[['draw',0],['fanDown',2]]],
  // the event's own direction counts even when the player had no fans to lose
  [[2,2],"{clubEvent:{kind:'ignore',text:'팬의 인사를 무시함',fans:0}}",52,[['draw',0],['fanDown',2]]],
  [[2,2],"{clubEvent:{kind:'bench-song',text:'후보 선수에게도 응원가가',fans:0}}",50,[['draw',0],['fanNone',0]]],
 ];
 for(const [score,extra,value,parts] of cases){const r=one(score,extra);assert.equal(r.v,value,extra);assert.deepEqual(deltas(r.c),parts,extra);assert.equal(r.c.from,50);assert.equal(r.c.to,value);assert.equal(r.h,'match');}
 // everything at once on the 3rd straight loss: loss 5 + cold 5 + streak 2 + unpaid 5 + fan-losing event 2
 const all=one([0,11],"{mercy:{inning:3,margin:11},finance:{debt:40},clubEvent:{kind:'litter',text:'x'}}",50,2);
 assert.deepEqual(deltas(all.c),[['loss',5],['coldLoss',5],['streak',2],['unpaid',5],['fanDown',2]]);assert.equal(all.v,69);
 // clamped once at the ends
 assert.equal(one([0,10],"{mercy:{inning:3,margin:10},finance:{debt:5}}",97).v,100);
 assert.equal(one([10,0],'{mercy:{inning:3,margin:10}}',4).v,0);
 // the history entry and the saved match keep the change
 const h=run(`(()=>{const t=club();t.history.unshift({id:'m1-0'});const m=play(t,[0,3]);return {h:t.history[0].opinion,m:m.opinion,v:tryValidate(t)};})()`);
 assert.deepEqual(h.h,h.m);assert.deepEqual(deltas(h.m),[['loss',5]]);assert.equal(h.v,'ok');
});

test('losing streak: +2 more from the 3rd straight loss, draws neither break nor extend it, a win ends it',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club();t.opinion.value=50;const out=[];for(const s of [[0,1],[0,1],[2,2],[0,1],[0,1],[1,0],[0,1]]){play(t,s);out.push([t.opinion.value,t.opinion.lossStreak]);}return out;})()`);
 assert.deepEqual(r,[[55,1],[60,2],[60,2],[67,3],[74,4],[69,0],[74,1]]);
 // P09 example: five straight losses add 31%p, not 25%p
 assert.equal(run(`(()=>{const t=club();t.opinion.value=0;for(let i=0;i<5;i++)play(t,[0,2]);return t.opinion.value;})()`),31);
 // forfeits extend the same streak
 const f=run(`(()=>{const t=club();t.opinion.value=0;play(t,[0,1]);play(t,[0,1]);shrink(t,8);t.funds=0;setMarket(t,[400,500,600]);t.loan={v:1,amount:10,repay:11,left:11,repaid:0,season:1,at:0};
  const r=forfeitRemainingGames(t);return {count:r.count,log:t.opinion.log.filter(e=>e.kind==='forfeit').slice(0,3).map(e=>e.parts.map(p=>[p.key,p.delta]))};})()`);
 assert.equal(f.count,8);assert.deepEqual(f.log,[[['forfeit',5],['streak',2]],[['forfeit',5],['streak',2]],[['forfeit',5],['streak',2]]]);
});

test('season-end settlement: rank, loan left and later parts are summed first and clamped once',()=>{
 const {run}=world();
 // at 100% during the season: 2nd place −15 and the loan +10 give 95 (adding one by one with clamps would give 85)
 const a=run(`(()=>{const t=club();t.loan={v:1,amount:100,repay:110,left:60,repaid:50,season:1,at:0};const s=endSeason(t,2,100);return {o:s.opinion,v:t.opinion.value,move:s.move,valid:tryValidate(t)};})()`);
 assert.deepEqual(deltas(a.o),[['rank',-15],['loanLeft',10]]);assert.equal(a.o.from,100);assert.equal(a.o.to,95);assert.equal(a.v,95);assert.equal(a.move,'stay');assert.equal(a.valid,'ok');
 // ⑤ hook: hall of fame −5 joins the same sum
 const b=run(`(()=>{const t=club();OPINION_SEASON_END_PARTS.push(()=>({key:'hall',label:'명예의 전당',delta:-5}));try{const s=endSeason(t,4,50);return s.opinion;}finally{OPINION_SEASON_END_PARTS.pop();}})()`);
 assert.deepEqual(deltas(b),[['rank',0],['hall',-5]]);assert.equal(b.to,45);
 // clamps
 assert.equal(run('(()=>{const t=club();return endSeason(t,1,10).opinion.to;})()'),0);
 const c=run(`(()=>{const t=club();t.league.tier=1;t.loan={v:1,amount:100,repay:110,left:110,repaid:0,season:1,at:0};const s=endSeason(t,6,75);return {o:s.opinion,disband:s.disband,tier:t.league.tier};})()`);
 assert.deepEqual(deltas(c.o),[['rank',20],['loanLeft',10]]);assert.equal(c.o.to,100);assert.equal(c.disband,true);assert.equal(c.tier,0);
 // the settlement happens once per season
 assert.equal(run(`(()=>{const t=club();endSeason(t,3,40);return opinionSeasonEndStep(t,{season:1,tier:0,rank:6,skip:[]});})()`),null);
});

test('동네 6th streak: +10 more from the 2nd straight 동네 6th, only 동네 seasons count, reset by another rank or a rebuild',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club(),out=[];
  const season=(rank,tier=null)=>{if(tier!==null)t.league.tier=tier;const s=endSeason(t,rank,0);out.push({tier:s.tier,parts:s.opinion.parts.map(p=>[p.key,p.delta]),last6:t.opinion.last6,next:t.league.tier});startNextSeason(t);};
  season(6);season(6);season(6);season(5);season(6);season(6,1);season(6);season(6);
  return out;})()`);
 assert.deepEqual(r.map(x=>x.parts),[
  [['rank',20]],[['rank',20],['last6',10]],[['rank',20],['last6',10]],[['rank',10]],[['rank',20]],
  [['rank',20]],// 지역 리그 6th: relegated, the 동네 count starts over
  [['rank',20]],[['rank',20],['last6',10]]]);
 assert.deepEqual(r.map(x=>x.last6),[1,2,3,0,1,0,1,2]);
 assert.equal(r[5].tier,1);assert.equal(r[5].next,0);
 assert.ok(r.find(x=>x.parts.some(p=>p[0]==='last6')).parts.find(p=>p[0]==='last6'));
 // a rebuild starts the count over
 const after=run(`(()=>{const t=club();endSeason(t,6,0);startNextSeason(t);const s=endSeason(t,6,90);startNextSeason(t);const s2=endSeason(t,6,0);return {first:s.disband,last6:t.opinion.last6,parts:s2.opinion.parts.map(p=>p.key)};})()`);
 assert.equal(after.first,true);assert.deepEqual(after.parts,['rank']);assert.equal(after.last6,1);
});

test('disband at 100% is checked before promotion: relegation is skipped, the prize is removed, a ④ guard can prevent it',()=>{
 const {run}=world();
 // 2부 6th at 85%: +20 → 100 → disband → 동네 리그 (relegation would have given 지역)
 const a=run(`(()=>{const t=club();t.league.tier=2;t.stadium=2;const s=endSeason(t,6,85);const h=t.league.history.at(-1);return {s,tier:t.league.tier,h:{move:h.move,nextTier:h.nextTier,disband:h.disband,prize:h.prize},phase:t.league.phase};})()`);
 assert.equal(a.s.disband,true);assert.equal(a.s.move,'disband');assert.equal(a.tier,0);assert.equal(a.phase,'offseason');
 assert.deepEqual(a.h,{move:'disband',nextTier:0,disband:true,prize:0});
 // 동네 3rd at 100%: the 1,000,000 won prize is paid in step 2 and lost in step 4
 const b=run(`(()=>{const t=club();t.funds=1234;const s=endSeason(t,3,100);return {prize:s.prize,lost:s.lostPrize,funds:t.funds,ledger:t.ledger.slice(0,3).map(x=>[x.label,x.amount]),news:t.news.map(x=>x.title),text:leagueMoveText(s,t.league)};})()`);
 assert.equal(b.prize,0);assert.equal(b.lost,100);assert.equal(b.funds,3000);
 assert.deepEqual(b.ledger,[['재창단 · 시작 자금',3000-1234],['해체 · 시즌 상금 취소',-100],['동네 리그 3위 상금',100]]);
 assert.ok(b.news.some(x=>/구단 해체 발표/.test(x))&&b.news.some(x=>/재창단/.test(x)));assert.match(b.text,/해체/);
 // a 1st place at 100% drops to 70 and is promoted as usual
 const c=run(`(()=>{const t=club();const s=endSeason(t,1,100);return [s.opinion.to,s.disband===undefined,t.league.tier,s.move];})()`);
 assert.deepEqual(c,[70,true,1,'up']);
 // ④ guard (revival ticket): opinion set to 70, no disband, promotion runs (지역 4th stays in 지역)
 const d=run(`(()=>{const t=club();t.league.tier=1;OPINION_DISBAND_GUARDS.push((t,ctx)=>{setOpinion(t,70,'구단 회생권',{kind:'ticket'});return {by:'ticket'};});
  try{const s=endSeason(t,4,100);return {disband:s.disband,prevented:s.disbandPrevented,v:t.opinion.value,tier:t.league.tier,move:s.move,players:t.players.length,valid:tryValidate(t)};}finally{OPINION_DISBAND_GUARDS.pop();}})()`);
 assert.deepEqual(d,{disband:false,prevented:'ticket',v:70,tier:1,move:'stay',players:12,valid:'ok'});
});

test('rebuild: 동네, start funds, no debt or loan, facilities gone, stadium 1, default ticket, ≤3 loyal players kept, 12 players, 20%',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club(),loy=[90,85,85,80,72,70,69,50,40,30,20,10];t.players.forEach((p,i)=>{p.loyalty=loy[i];});
  const ids=t.players.map(p=>p.id),before=t.players.slice(0,3).map(p=>JSON.stringify(p.a));
  Object.assign(t,{funds:9000,debt:120,stadium:3,ticket:25,facilities:['bat','conditioning','locker','uniform'],w:30,l:20,d:2,trophies:30,mlbHistory:[{success:true,player:{id:'mlb1'}}],achievements:{version:1,catalog:2,unlocked:[]}});
  t.loan={v:1,amount:500,repay:550,left:550,repaid:0,season:1,at:0};t.history.push({id:'old-game'});t.league.tier=1;
  const s=endSeason(t,5,95);
  return {s,kept:t.players.slice(0,3).map(p=>p.id),keptA:t.players.slice(0,3).map(p=>JSON.stringify(p.a)),before,ids,n:t.players.length,names:t.players.map(p=>p.name),
   ages:t.players.slice(3).map(p=>p.age),contracts:t.players.map(p=>p.contract),energy:t.players.every(p=>p.energy===p.a.stamina),lineup:lineupError(t),
   club:{funds:t.funds,debt:t.debt,loan:t.loan,stadium:t.stadium,ticket:t.ticket,facilities:t.facilities,tier:t.league.tier,w:t.w,l:t.l,trophies:t.trophies,history:t.history.length,mlb:t.mlbHistory.length,ach:!!t.achievements},
   opinion:{v:t.opinion.value,disbands:t.opinion.disbands,last6:t.opinion.last6,rebuild:t.opinion.rebuilds[0],lastLog:t.opinion.log.at(-1).kind},
   departed:t.departed.filter(p=>p.departureKind==='disband').map(p=>p.id),seasonEntry:t.league.history.at(-1).rebuild,valid:tryValidate(t),
   block:leagueNextSeasonBlock(t),start:startNextSeason(t),season:t.league.season,phase:t.league.phase,tierAfter:t.league.tier,contractsAfter:t.players.map(p=>p.contract)};})()`);
 assert.equal(r.s.disband,true);
 assert.deepEqual(r.kept,r.ids.slice(0,3),'90, then the two 85s in roster order');assert.deepEqual(r.keptA,r.before,'kept players keep their abilities');
 assert.equal(r.n,12);assert.ok(r.ages.every(a=>a>=19&&a<=26),'newcomers enter at 19~26');
 assert.equal(new Set(r.names).size,12,'rebuild names avoid keepers and other newcomers');
 assert.ok(r.contracts.every(c=>c===10));assert.equal(r.energy,true);assert.equal(r.lineup,'');
 assert.deepEqual(r.club,{funds:3000,debt:0,loan:null,stadium:1,ticket:10,facilities:[],tier:0,w:30,l:20,trophies:30,history:1,mlb:1,ach:true});
 assert.deepEqual([r.opinion.v,r.opinion.disbands,r.opinion.last6,r.opinion.lastLog],[20,1,0,'rebuild']);
 assert.deepEqual(r.opinion.rebuild.kept.map(k=>k.loyalty),[90,85,85]);assert.equal(r.opinion.rebuild.left,9);assert.equal(r.opinion.rebuild.added,9);
 assert.deepEqual(r.departed.sort(),r.ids.slice(3).sort(),'the other nine are in the departure list');
 assert.deepEqual(r.seasonEntry.kept.length,3);assert.equal(r.valid,'ok');
 assert.equal(r.block,'');assert.equal(r.start,'');assert.equal(r.season,2);assert.equal(r.phase,'season');assert.equal(r.tierAfter,0);assert.ok(r.contractsAfter.every(c=>c===10));
 // fewer than three eligible, and none
 const few=run(`(()=>{const out=[];for(const loy of [[75,69,69,10,10,10,10,10,10,10,10,10],[69,60,50,40,30,20,10,5,5,5,5,5],[70,70,70,70,70,70,70,70,70,70,70,70]]){const t=club();t.players.forEach((p,i)=>{p.loyalty=loy[i];});const ids=t.players.map(p=>p.id);endSeason(t,6,100);out.push({kept:t.players.filter(p=>ids.includes(p.id)).map(p=>ids.indexOf(p.id)),n:t.players.length,valid:tryValidate(t)});}return out;})()`);
 assert.deepEqual(few,[{kept:[0],n:12,valid:'ok'},{kept:[],n:12,valid:'ok'},{kept:[0,1,2],n:12,valid:'ok'}]);
});

test('emergency loan: amount, debt paid at once, +15%p, once per season, offseason counts for the next season',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club();shrink(t,8);t.funds=0;t.debt=30;setMarket(t,[400,500,600]);
  const state=operationState(t),offer=loanOffer(t);const err=takeEmergencyLoan(t);
  const after={funds:t.funds,debt:t.debt,loan:{...t.loan},v:t.opinion.value,loans:t.opinion.loans,log:t.opinion.log.at(-1).parts.map(p=>[p.key,p.delta]),news:t.news[0].title};
  t.funds=0;const again=emergencyLoanBlock(t);t.loan.left=0;const sameSeason=emergencyLoanBlock(t);
  t.league.phase='offseason';const offseason=emergencyLoanBlock(t);t.league.phase='season';
  return {state:state.kind,offer,err,after,again,sameSeason,offseason,valid:tryValidate(t)};})()`);
 assert.equal(r.state,'loan');
 assert.deepEqual(r.offer,{need:2,cheapest:400,debt:30,refreshes:0,refresh:0,amount:990,repay:1089});
 assert.equal(r.err,'');
 assert.deepEqual(r.after.loan,{v:1,amount:990,repay:1089,left:1089,repaid:0,season:1,at:r.after.loan.at});
 assert.equal(r.after.funds,960);assert.equal(r.after.debt,0);assert.equal(r.after.v,45);assert.equal(r.after.loans,1);
 assert.deepEqual(r.after.log,[['loan',15]]);assert.match(r.after.news,/긴급 대출/);
 assert.match(r.again,/갚지 못한/);assert.match(r.sameSeason,/시즌당 한 번/);assert.equal(r.offseason,'');assert.equal(r.valid,'ok');
 // more players missing than candidates: one refresh for every three past the list
 const big=run(`(()=>{const out=[];for(const n of [7,5,3,0]){const t=club();shrink(t,n);t.funds=0;setMarket(t,[300,320,350]);out.push(loanOffer(t));}return out.map(o=>[o.need,o.refreshes,o.amount,o.repay]);})()`);
 assert.deepEqual(big,[[3,0,1080,1188],[5,1,1900,2090],[7,2,2720,2992],[10,3,3900,4290]]);
 // no loan when the roster is full or the money covers the cheapest candidate
 const blocks=run(`(()=>{const t=club();setMarket(t,[400]);const full=emergencyLoanBlock(t);shrink(t,9);t.funds=400;const rich=[emergencyLoanBlock(t),operationState(t).kind];t.funds=399;return [full,rich,operationState(t).kind];})()`);
 assert.match(blocks[0],/10명 이상/);assert.match(blocks[1][0],/영입할 수 있습니다/);assert.equal(blocks[1][1],'hire');assert.equal(blocks[2],'loan');
});

test('loan repayment: after wages, up to 30% of the game income, never more than the money or the loan; +10%p if left at season end',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club();t.loan={v:1,amount:990,repay:1089,left:1089,repaid:0,season:1,at:0};const out=[];
  const f=()=>({reward:500,ticket:300,stores:0,league:200,net:100,debt:0});
  t.funds=1000;let m={id:'a',finance:f()};out.push([repayLoanFromMatch(t,m),t.funds,t.loan.left,m.finance.net,m.finance.loanLeft]);
  t.funds=100;m={id:'b',finance:f()};out.push([repayLoanFromMatch(t,m),t.funds,t.loan.left]);
  out.push(repayLoanFromMatch(t,m));// once per game
  t.funds=5000;t.loan.left=50;m={id:'c',finance:f()};out.push([repayLoanFromMatch(t,m),t.funds,t.loan.left,t.loan.repaid,t.news[0].title]);
  m={id:'d',finance:f()};out.push([repayLoanFromMatch(t,m),m.finance.loanRepay===undefined]);
  return out;})()`);
 assert.deepEqual(r[0],[300,700,789,-200,789]);
 assert.deepEqual(r[1],[100,0,689]);assert.equal(r[2],0);
 assert.deepEqual(r[3],[50,4950,0,450,'긴급 대출 상환 완료']);
 assert.deepEqual(r[4],[0,true]);
 // through the league game hook (wages first, then the repayment), and the season-end +10 only while a loan is left
 const g=run(`(()=>{const t=club();t.loan={v:1,amount:990,repay:1089,left:1089,repaid:0,season:1,at:0};t.funds=2000;
  const m=play(t,[3,2],{finance:{reward:600,ticket:400,stores:0,net:300,debt:0}});const first=[m.finance.loanRepay,t.loan.left];
  const s=endSeason(t,4,30).opinion.parts.map(p=>p.key);t.loan.left=0;startNextSeason(t);const s2=endSeason(t,4,30).opinion.parts.map(p=>p.key);return {first,s,s2,valid:tryValidate(t)};})()`);
 assert.deepEqual(g.first,[300,789]);assert.deepEqual(g.s,['rank','loanLeft']);assert.deepEqual(g.s2,['rank']);assert.equal(g.valid,'ok');
});

test('forfeits: 0:9 losses for the rest of the season, only when no money and no loan are left, then the season end',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club();t.opinion.value=0;for(let i=0;i<3;i++)play(t,[2,1]);shrink(t,8);t.funds=0;setMarket(t,[400,500,600]);
  const asLoan=forfeitBlock(t);takeEmergencyLoan(t);t.funds=0;
  const before={l:t.l,w:t.w,funds:t.funds,games:t.players.map(p=>p.stats.games)};
  const res=forfeitRemainingGames(t);
  const ours=t.league.history.at(-1).table.find(x=>x.id==='us');
  return {asLoan,res,before,after:{l:t.l,w:t.w},results:t.league.results.filter(g=>g.home==='us'||g.away==='us').map(g=>({round:g.round,us:g.home==='us'?g.score[0]:g.score[1],them:g.home==='us'?g.score[1]:g.score[0],forfeit:!!g.forfeit})),
   forfeitLog:t.opinion.log.filter(e=>e.kind==='forfeit').map(e=>e.to),phase:t.league.phase,entry:{forfeits:t.league.history.at(-1).forfeits,l:ours.l,w:ours.w},forfeits:t.opinion.forfeits,news:t.news.map(x=>x.title),valid:tryValidate(t)};})()`);
 assert.match(r.asLoan,/긴급 대출/);
 assert.equal(r.res.count,7);assert.equal(r.after.l-r.before.l,7);assert.equal(r.after.w,r.before.w);
 assert.equal(r.results.length,10);
 for(const g of r.results.slice(3))assert.deepEqual([g.us,g.them,g.forfeit],[0,9,true]);
 for(const g of r.results.slice(0,3))assert.equal(g.forfeit,false);
 // 15 after the loan (0 − 15 from three wins … floor 0, then +15), then +5 +5 +7 +7 +7 +7 +7
 assert.deepEqual(r.forfeitLog,[20,25,32,39,46,53,60]);
 assert.equal(r.phase,'offseason');assert.deepEqual(r.entry,{forfeits:7,l:7,w:3});assert.equal(r.forfeits,7);
 assert.ok(r.news.some(x=>/부전패 7경기/.test(x)));assert.equal(r.valid,'ok');
 // not allowed while a fix exists
 const blocks=run(`(()=>{const t=club();const full=forfeitBlock(t);shrink(t,9);t.funds=1e6;const rich=forfeitBlock(t);t.funds=0;setMarket(t,[400]);const loan=forfeitBlock(t);return [full,rich,loan];})()`);
 assert.match(blocks[0],/치를 수 있습니다/);assert.match(blocks[1],/영입/);assert.match(blocks[2],/긴급 대출/);
});

test('a short roster never blocks "다음 시즌 시작" for good: hire, loan, or start and forfeit; a disband refills the roster',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club();for(let i=0;i<10;i++)play(t,[1,0]);for(const p of t.players)negotiate(p,salaryAsk(p),()=>.99);
  shrink(t,8);setMarket(t,[400,500,600]);
  t.funds=1000;const hire=leagueNextSeasonBlock(t);
  t.funds=0;const loan=leagueNextSeasonBlock(t);
  t.loan={v:1,amount:100,repay:110,left:110,repaid:0,season:1,at:0};const none=leagueNextSeasonBlock(t);
  const start=startNextSeason(t),state=operationState(t).kind;
  // a whole season of forfeits at 60%: +5+5+7×8 = 66 → 100, 6th +20, loan +10 → disband and rebuild with 12 players
  t.opinion.value=60;t.opinion.lossStreak=0;const res=forfeitRemainingGames(t);
  return {hire,loan,none,start,state,count:res.count,disband:res.seasonEnd.disband,n:t.players.length,next:leagueNextSeasonBlock(t),loanAfter:t.loan,valid:tryValidate(t)};})()`);
 assert.match(r.hire,/10명/);assert.match(r.loan,/긴급 대출/);assert.equal(r.none,'');
 assert.equal(r.start,'');assert.equal(r.state,'forfeit');assert.equal(r.count,10);
 assert.equal(r.disband,true);assert.equal(r.n,12);assert.equal(r.next,'');assert.equal(r.loanAfter,null);assert.equal(r.valid,'ok');
});

test('stage news when the stage changes, and the ④ hook for changes outside games',()=>{
 const {run}=world();
 const r=run(`(()=>{const out=[];for(const [v,s] of [[25,[0,1]],[58,[0,1]],[88,[0,1]],[31,[1,0]],[62,[1,0]],[92,[1,0]],[40,[0,1]]]){const t=club();t.news=[];t.opinion.value=v;play(t,s);out.push(t.news.map(x=>x.title));}return out;})()`);
 assert.match(r[0][0],/^해체 여론 술렁임 · /);assert.match(r[1][0],/^해체 여론 분노 · /);assert.match(r[2][0],/^해체 여론 해체 직전 · /);
 assert.equal(r[3][0],'해체 여론 술렁임 → 평온');assert.equal(r[4][0],'해체 여론 분노 → 술렁임');assert.equal(r[5][0],'해체 여론 해체 직전 → 분노');
 assert.deepEqual(r[6],[],'no stage change, no news');
 const h=run(`(()=>{const t=club();const e=changeOpinion(t,-15,'MLB 진출 보상','mlb');const s=setOpinion(t,70,'구단 회생권',{kind:'ticket'});return {e:[e.kind,e.from,e.to],s:[s.kind,s.to,s.parts[0].delta],valid:tryValidate(t)};})()`);
 assert.deepEqual(h,{e:['mlb',30,15],s:['ticket',70,55],valid:'ok'});
});

test('old saves: validation passes first, then 30% with no loan and the 동네 6th streak from the season records, once',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=newTeam('예전 구단',4,3);t.w=12;t.l=20;data.slots=[t,null];data.current=0;ensureClub(t);delete t.opinion;delete t.loan;
  t.league.phase='offseason';t.league.season=3;t.league.history=[{season:1,tier:0,rank:6,nextTier:0,prize:0},{season:2,tier:0,rank:6,nextTier:0,prize:0}];t.news=[];
  const raw=JSON.parse(JSON.stringify(t)),validated=tryValidate(raw);data.slots=[raw,null];ensureClub(raw);const first=JSON.parse(JSON.stringify(raw.opinion));ensureClub(raw);
  return {validated,first,second:raw.opinion,loan:raw.loan,news:raw.news.filter(x=>/해체 여론 30%/.test(x.title)).length,valid:tryValidate(raw)};})()`);
 assert.equal(r.validated,'ok');
 assert.equal(r.first.value,30);assert.equal(r.first.last6,2);assert.equal(r.first.settled,3);assert.equal(r.first.disbands,0);assert.equal(r.loan,undefined);
 assert.deepEqual(r.second,r.first);assert.equal(r.news,1);assert.equal(r.valid,'ok');
 // the next 동네 6th is the third in a row
 assert.deepEqual(run(`(()=>{const t=data.slots[0];startNextSeason(t);return endSeason(t,6,0).opinion.parts.map(p=>[p.key,p.delta]);})()`),[['rank',20],['last6',10]]);
});

test('validation: missing data is fine, malformed opinion, loan and disband records are rejected',()=>{
 const {run}=world();
 const check=mutate=>run(`(()=>{const t=club();play(t,[0,1]);const c=JSON.parse(JSON.stringify(t));${mutate};try{validateTeam(c);return 'ok';}catch(e){return e.message;}})()`);
 assert.equal(check(''),'ok');
 assert.equal(check('delete c.opinion;delete c.loan'),'ok');
 assert.equal(check('c.loan=null'),'ok');
 assert.equal(check('c.loan={v:1,amount:100,repay:110,left:40,repaid:70,season:2,at:1}'),'ok');
 assert.equal(check("c.departed=[{...c.players[0],departureKind:'disband',disband:{season:1,tier:0,loyalty:20,at:1}}]"),'ok');
 for(const bad of ['c.opinion.value=101','c.opinion.value=-1',"c.opinion.value='30'",'c.opinion.v=2','c.opinion=[]','c.opinion.log={}','c.opinion.lossStreak=-1','c.opinion.last6=1.5',
  "c.opinion.log.push({kind:'match',from:30,to:130,parts:[]})","c.opinion.log.push({kind:'match',from:30,to:35,parts:[{key:'loss',label:'패배',delta:'5'}]})",
  'c.opinion.rebuilds=[{season:1,kept:[1,2,3,4]}]','c.loan={amount:100,repay:110,left:120,repaid:0,season:1}',"c.loan={amount:'x',repay:110,left:10,season:1}",'c.loan=5',
  'c.league.history=[{season:1,tier:0,rank:3,nextTier:0,prize:0,opinion:{from:30,to:200,parts:[]}}]',
  "c.departed=[{...c.players[0],departureKind:'disband'}]","c.history=[{id:'x',opinion:{from:1,to:2}}]"])
  assert.match(check(bad),/해체 여론 자료 오류/,bad);
});

// League and season (build step ①): schedule, table and tie-breakers, promotion with the stadium rule,
// prizes and payouts, per-season contracts, old-save migration and validation.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const read=f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8');
const game=read('game.js'),ext=read('extensions.js'),league=read('league.js');
const PURE_END=league.indexOf('// Game hooks.'),HOOKS_END=league.indexOf('// UI integration.');
assert.ok(PURE_END>0&&HOOKS_END>PURE_END,'league.js markers');
const line=(src,re)=>{const m=src.match(re);assert.ok(m,'missing source line '+re);return m[0];};

// Real game code: rules from game.js, the economy/contract parts of extensions.js, then league.js up to the UI.
function world({seed=20261111}={}){
 let s=seed>>>0||1;const math=Object.create(Math);math.random=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};
 const ctx=vm.createContext({Math:math,crypto:{randomUUID,getRandomValues:a=>{a[0]=4242;return a;}},location:{hash:''},performance:{now:()=>0},
  document:{documentElement:{hasAttribute:()=>true}},window:{addEventListener:()=>{}},GameStorage:{create:()=>({})},
  recordRecap:()=>{},restoreAbilities:()=>{},validVacancy26:()=>false,money:n=>n+'만원',selection:null,CharacterRenderer:{names:{},variants:{}}});
 vm.runInContext(game.slice(0,game.indexOf('\nfunction rect(')),ctx);
 vm.runInContext(line(game,/^function opponentAbility\(.*$/m),ctx);
 vm.runInContext(ext.slice(ext.indexOf('const BALANCE='),ext.indexOf('\nconst oldInitial=')),ctx);
 for(const re of [/^const oldValidate=validateTeam;.*$/m,/^const live=.*$/m,/^function ledger\(.*$/m,/^function spend\(.*$/m,/^function gain\(.*$/m,/^function news\(.*$/m,
  /^function crowdDemand\(.*$/m,/^function attendance\(.*$/m,/^const MARKET_REFRESH_COST=.*$/m,/^function createMarketCandidates\(.*$/m,/^function salaryAsk\(.*$/m])vm.runInContext(line(ext,re),ctx);
 vm.runInContext(ext.slice(ext.indexOf('const legacyAsk26='),ext.indexOf('function validVacancy26(')),ctx);
 vm.runInContext(ext.slice(ext.indexOf('negotiate=function(p,amount'),ext.indexOf('\nconst commitBefore26=')),ctx);
 vm.runInContext(league.slice(0,HOOKS_END),ctx);
 vm.runInContext(`
  const club=(name='우리')=>{const t=newTeam(name,11,5);data.slots=[t,null];data.current=0;ensureClub(t);return t;};
  // Plays one league round the way the game does: wages and contract countdown first, then the league result.
  const playRound=(t,score)=>{const L=t.league,fx=leagueFixture(L),m={id:'m'+L.season+'-'+fx.round,rng:777,score,league:{season:L.season,tier:L.tier,round:fx.round,oppId:fx.oppId}};
   payLeaguePayout(t,m);for(const p of t.players)settleContract26(t,p,m,0);return settleLeagueMatch(t,m);};
  const finishWith=(t,results)=>{const L=t.league;L.results=results;L.round=LEAGUE.seasonGames;return runSeasonEnd(t);};
 `,ctx);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
}

test('schedule: 10 rounds of 3 games, every pair twice (once each home), our club alternates home and away',()=>{
 const run=world();
 const s=run("buildLeagueSchedule(['a','b','c','d','e'])");
 assert.equal(s.length,10);
 const pairs={};
 s.forEach((round,r)=>{
  assert.equal(round.length,3);
  const ids=round.flatMap(g=>[g.home,g.away]);assert.equal(new Set(ids).size,6,'each club once per round');
  for(const g of round){const key=[g.home,g.away].sort().join('-');(pairs[key]??=[]).push(g.home);}
  const ours=round.find(g=>g.home==='us'||g.away==='us');assert.equal(ours.home==='us',r%2===0,'round '+(r+1)+' home/away');
 });
 assert.equal(Object.keys(pairs).length,15);
 for(const [key,homes] of Object.entries(pairs)){assert.equal(homes.length,2,key);assert.notEqual(homes[0],homes[1],key+' home once each');}
});

test('a new season draws 5 of the 7 resident clubs at the tier mid +6/+3/0/−3/−6 with 13 valid players each',()=>{
 const run=world();
 for(const tier of [0,1,2,3]){
  const L=run(`newLeagueState(${tier},1,99+${tier})`);
  assert.equal(L.teams.length,5);assert.equal(L.phase,'season');assert.equal(L.round,0);
  const pool=run(`LEAGUE_POOL[${tier}].map(x=>x.id)`);assert.ok(L.teams.every(x=>pool.includes(x.id)));assert.equal(new Set(L.teams.map(x=>x.id)).size,5);
  assert.deepEqual(L.teams.map(x=>x.offset).sort((a,b)=>a-b),[-6,-3,0,3,6]);
  const mid=[39,51,63,75][tier];
  for(const o of L.teams){
   assert.equal(o.target,mid+o.offset);assert.equal(o.level,(o.target-43.5)/4);
   assert.ok(Math.abs(o.strength-o.target)<4,o.name+' strength '+o.strength+' vs '+o.target);
   assert.equal(o.players.length,13);assert.equal(new Set(o.players.map(p=>p.number)).size,13);
   for(const p of o.players)for(const [k,v] of Object.entries(p.a)){assert.ok(Number.isInteger(v)&&v>=1&&v<=100,k+'='+v);if(k==='sense')assert.ok(v<=70);}
  }
  assert.equal(L.schedule.length,10);assert.deepEqual(Object.keys(L.lots).sort(),['us',...L.teams.map(x=>x.id)].sort());
 }
 // The same seed gives the same draw, offsets and schedule (player abilities come from Math.random).
 assert.deepEqual(run('[newLeagueState(0,1,5).teams.map(x=>x.id+x.offset),newLeagueState(0,1,5).schedule]')[0],run('newLeagueState(0,1,5).teams.map(x=>x.id+x.offset)'));
});

test('table: W2 D1 L0, then head-to-head points, run difference, runs scored and the season lottery',()=>{
 const run=world();
 const table=(results,lots={})=>run(`leagueStandings({teams:['a','b','c','d','e'].map(id=>({id})),results:${JSON.stringify(results)},lots:${JSON.stringify(lots)}})`);
 const g=(home,away,h,a)=>({round:0,home,away,score:[h,a]});
 // points
 let t=table([g('us','a',3,1),g('b','c',2,2),g('d','e',0,4)]);
 const pts=Object.fromEntries(t.map(r=>[r.id,r.pts]));assert.deepEqual(pts,{us:2,a:0,b:1,c:1,d:0,e:2});
 assert.deepEqual(t.find(r=>r.id==='us'),{...t.find(r=>r.id==='us'),gp:1,w:1,d:0,l:0,rf:3,ra:1,diff:2});
 // head-to-head beats a better run difference
 t=table([g('a','us',1,0),g('us','b',9,0),g('c','d',0,0)]);// us 2 pts (+8), a 2 pts (+1) but a beat us
 assert.deepEqual(t.slice(0,2).map(r=>[r.id,r.pts]),[['a',2],['us',2]]);assert.equal(t[0].tieBreak,'h2h');
 // equal head-to-head (draw) → run difference
 t=table([g('us','a',1,1),g('us','b',5,0),g('a','c',2,0)]);
 assert.deepEqual(t.slice(0,2).map(r=>r.id),['us','a']);assert.equal(t[0].tieBreak,'diff');
 // equal difference → runs scored
 t=table([g('us','a',2,2),g('us','b',4,1),g('a','c',3,0)]);// both +3, us scored 6, a scored 5
 assert.deepEqual(t.slice(0,2).map(r=>r.id),['us','a']);assert.equal(t[0].tieBreak,'rf');
 // everything equal → lottery drawn at season start
 const flat=[g('us','a',1,1)];
 assert.deepEqual(table(flat,{us:.1,a:.9}).slice(0,2).map(r=>r.id),['a','us']);
 assert.deepEqual(table(flat,{us:.9,a:.1}).slice(0,2).map(r=>r.id),['us','a']);assert.equal(table(flat,{us:.9,a:.1})[0].tieBreak,'lot');
 // three-way tie: head-to-head mini table among the tied clubs only
 // three-way tie (us > a > b > us): the mini table among the three is level, so run difference decides
 t=table([g('us','a',1,0),g('a','b',1,0),g('b','us',3,0),g('c','d',0,0)]);
 assert.deepEqual(t.slice(0,3).map(r=>[r.id,r.pts,r.h2h]),[['b',2,2],['a',2,2],['us',2,2]]);assert.equal(t[0].tieBreak,'diff');
 // a club outside the tie does not count in the head-to-head points
 t=table([g('us','a',1,0),g('a','c',1,0),g('c','us',1,0),g('b','us',5,0),g('a','b',0,0)]);
 // us 2 · c 2 (c beat us) · a 3 · b 3 (drew each other); wins over clubs outside each tie are not head-to-head points
 assert.deepEqual(Object.fromEntries(t.map(r=>[r.id,r.h2h])),{a:1,b:1,c:2,us:0,d:0,e:0});
 assert.deepEqual(t.map(r=>r.id).slice(0,4),['b','a','c','us']);// b over a on run difference, c over us on head-to-head
 assert.deepEqual(t.map(r=>r.rank),[1,2,3,4,5,6]);
});

test('promotion: 1st goes up when the stadium grade is enough; 동네 6th stays; others drop; 1부 1st is champion',()=>{
 const run=world();
 const cases=[[0,1,'win',1,'up'],[0,1,'lose',0,'stay'],[1,1,'lose',0,'down'],[2,2,'lose',1,'down'],[2,3,'win',3,'up'],[3,3,'win',3,'champion'],[3,5,'lose',2,'down']];
 for(const [tier,stadium,how,next,move] of cases){
  const r=run(`(()=>{const t=club();t.stadium=${stadium};t.league=newLeagueState(${tier},3,7);const L=t.league;
   const res=L.teams.map((o,i)=>({round:i,home:'us',away:o.id,score:${how==='win'?'[5,0]':'[0,5]'}}));
   const sum=finishWith(t,res);return {sum,tier:L.tier,phase:L.phase,pending:L.pendingPromotion,history:L.history.length};})()`);
  assert.equal(r.sum.rank,how==='win'?1:6,JSON.stringify([tier,how]));assert.equal(r.sum.move,move,JSON.stringify([tier,stadium,how]));
  assert.equal(r.tier,next);assert.equal(r.sum.nextTier,next);assert.equal(r.phase,'offseason');assert.equal(r.pending,null);assert.equal(r.history,1);
 }
});

test('promotion stadium rule: 1st without the grade waits for an offseason expansion, otherwise the club stays',()=>{
 const run=world();
 // 지역 1st with a grade-1 stadium: 2부 needs grade 2. Expanding in this offseason promotes at once.
 let r=run(`(()=>{const t=club();t.funds=8000;t.league=newLeagueState(1,2,3);const L=t.league;
  const sum=finishWith(t,L.teams.map((o,i)=>({round:i,home:'us',away:o.id,score:[4,1]})));
  const before={tier:L.tier,pending:L.pendingPromotion,move:sum.move,prize:sum.prize,funds:t.funds};
  const seasonBlock=(()=>{L.phase='season';const b=stadiumUpgradeBlock(t);L.phase='offseason';return b;})();
  const error=expandStadium(t);return {before,seasonBlock,error,tier:L.tier,stadium:t.stadium,funds:t.funds,pending:L.pendingPromotion,last:L.history.at(-1).move};})()`);
 assert.deepEqual(r.before.pending,{to:2,need:2,season:2});assert.equal(r.before.tier,1);assert.equal(r.before.move,'blocked');
 assert.equal(r.before.prize,2000);assert.equal(r.before.funds,10000);
 assert.match(r.seasonBlock,/오프시즌/);assert.equal(r.error,'');
 assert.equal(r.stadium,2);assert.equal(r.funds,2000);assert.equal(r.tier,2);assert.equal(r.pending,null);assert.equal(r.last,'up');
 // Not expanding: the next season starts in the same league and the record keeps "blocked".
 r=run(`(()=>{const t=club();t.funds=0;t.league=newLeagueState(2,4,3);t.stadium=2;const L=t.league;
  finishWith(t,L.teams.map((o,i)=>({round:i,home:'us',away:o.id,score:[4,1]})));const poor=expandStadium(t);
  t.players.forEach(p=>p.contract=10);const error=startNextSeason(t);
  return {poor,error,tier:L.tier,season:L.season,phase:L.phase,pending:L.pendingPromotion,last:L.history.at(-1).move,pool:L.teams.every(o=>LEAGUE_POOL[2].some(d=>d.id===o.id))};})()`);
 assert.match(r.poor,/자금/);assert.equal(r.error,'');assert.equal(r.tier,2);assert.equal(r.season,5);assert.equal(r.phase,'season');
 assert.equal(r.pending,null);assert.equal(r.last,'blocked');assert.equal(r.pool,true);
 // Stadium costs and the offseason-only rule
 assert.deepEqual(run('[1,2,3,4,5].map(n=>stadiumUpgradeCost({stadium:n}))'),[8000,10000,15000,20000,0]);
 assert.match(run(`(()=>{const t=club();t.funds=99999;return stadiumUpgradeBlock(t);})()`),/오프시즌/);
 assert.match(run(`(()=>{const t=club();t.funds=99999;t.stadium=5;t.league.phase='offseason';return stadiumUpgradeBlock(t);})()`),/최대/);
});

test('prizes for 1st to 3rd by tier and the per-game league payout by tier',()=>{
 const run=world();
 assert.deepEqual(run('[0,1,2,3].map(t=>[1,2,3,4,5,6].map(r=>leaguePrize(t,r)))'),[[500,200,100,0,0,0],[2000,1000,500,0,0,0],[5000,2500,1000,0,0,0],[10000,5000,2500,0,0,0]]);
 // 2nd place pays the 2nd prize into the funds and the ledger.
 const r=run(`(()=>{const t=club();t.funds=0;const L=t.league,[a,b,c,d,e]=L.teams.map(o=>o.id),g=(home,away,h,x)=>({round:0,home,away,score:[h,x]});
  const sum=finishWith(t,[g(a,'us',2,1),g('us',b,3,0),g('us',c,3,0),g('us',d,3,0),g('us',e,3,0),g(a,b,1,0),g(a,c,1,0),g(a,d,1,0),g(a,e,1,0)]);
  return {rank:sum.rank,prize:sum.prize,funds:t.funds,ledger:t.ledger[0]};})()`);
 assert.deepEqual([r.rank,r.prize,r.funds,r.ledger.amount],[2,200,200,200]);assert.match(r.ledger.label,/2위 상금/);
 // payout: credited once per league game, before wages; 동네 0 · 지역 300 · 2부 800 · 1부 1500
 for(const [tier,amount] of [[0,0],[1,300],[2,800],[3,1500]]){
  const p=run(`(()=>{const t=club();t.funds=0;t.league=newLeagueState(${tier},1,1);const fx=leagueFixture(t.league),m={score:[1,0],league:{season:1,tier:${tier},round:0,oppId:fx.oppId}};
   const first=payLeaguePayout(t,m),again=payLeaguePayout(t,m);return [first,again,t.funds,m.league.payout];})()`);
  assert.deepEqual(p,[amount,0,amount,amount]);
 }
 // a game from another season or round never pays or counts
 assert.deepEqual(run(`(()=>{const t=club();t.league.tier=3;t.funds=0;const m={score:[1,0],league:{season:9,tier:3,round:0,oppId:t.league.teams[0].id}};return [payLeaguePayout(t,m),settleLeagueMatch(t,m),t.league.round];})()`),[0,null,0]);
});

test('contracts are per season: all end together at season end, renewals happen in the offseason',()=>{
 const run=world();
 const r=run(`(()=>{const t=club(),seen=[];
  for(let i=0;i<4;i++){playRound(t,[3,1]);seen.push(t.players.map(p=>p.contract));}
  const signing=contractGamesFor26(t);const rookie=player(false,t.players.map(p=>p.number));t.players.push(rookie);
  const rookieBefore=rookie.contract;
  for(let i=4;i<9;i++)playRound(t,[0,2]);const lastBefore=t.players.map(p=>p.contract);
  const end=playRound(t,[2,2]);
  const off={phase:t.league.phase,contracts:t.players.map(p=>p.contract),expired:t.players.every(p=>p.wage26.expired),block:leagueNextSeasonBlock(t),signing:contractGamesFor26(t),round:t.league.round,results:t.league.results.length};
  const early=startNextSeason(t);
  for(const p of t.players)negotiate(p,salaryAsk(p),()=>.99);
  const renewed=t.players.map(p=>p.contract);const started=startNextSeason(t);
  return {seen,signing,rookieBefore,lastBefore,end,off,early,renewed,started,season:t.league.season,round:t.league.round,after:t.players.map(p=>p.contract),w:t.w,l:t.l,d:t.d,offContract:t.players.every(p=>!p.wage26.expired)};})()`);
 assert.deepEqual(r.seen.map(x=>[...new Set(x)]),[[9],[8],[7],[6]]);
 assert.equal(r.signing,6);assert.equal(r.rookieBefore,6,'a mid-season signing runs to the end of this season');
 assert.deepEqual([...new Set(r.lastBefore)],[1]);
 assert.equal(r.end.last,true);assert.equal(r.off.phase,'offseason');assert.equal(r.off.round,10);assert.equal(r.off.results,30);
 assert.deepEqual([...new Set(r.off.contracts)],[0]);assert.equal(r.off.expired,true);
 assert.match(r.off.block,/13명/);assert.equal(r.off.signing,10,'an offseason signing runs to the end of the next season');
 assert.match(r.early,/재계약/);
 assert.deepEqual([...new Set(r.renewed)],[10]);assert.equal(r.started,'');assert.equal(r.season,2);assert.equal(r.round,0);
 assert.deepEqual([...new Set(r.after)],[10]);assert.equal(r.offContract,true);
 // cumulative record keeps counting outside the league code (reward does it); the league never resets w/l/d
 assert.deepEqual([r.w,r.l,r.d],[0,0,0]);
});

test('every league round records our game and the two AI games; the table always has 30 games after a season',()=>{
 const run=world();
 const r=run(`(()=>{const t=club(),rounds=[];for(let i=0;i<10;i++){const info=playRound(t,[i%3,1]);rounds.push([info.round,t.league.results.length]);}
  const rows=leagueStandings(t.league);return {rounds,gp:rows.map(x=>x.gp),pts:rows.reduce((s,x)=>s+x.pts,0),hist:t.league.history[0]};})()`);
 assert.deepEqual(r.rounds,[[0,3],[1,6],[2,9],[3,12],[4,15],[5,18],[6,21],[7,24],[8,27],[9,30]]);
 assert.deepEqual(r.gp,[10,10,10,10,10,10]);
 assert.equal(r.pts,60,'every game hands out 2 points in total (2+0 or 1+1)');
 assert.equal(r.hist.season,1);assert.equal(r.hist.table.length,6);
});

test('AI-vs-AI light model: about 2.3 runs a side, a few draws, the stronger club wins more',()=>{
 const run=world();
 const r=run(`(()=>{const L={rng:12345},even=[],gap=[];let draws=0,runs=0,strong=0;
  for(let i=0;i<4000;i++){const [h,a]=simulateLeagueGame(L,{strength:50},{strength:50});runs+=h+a;if(h===a)draws++;}
  for(let i=0;i<4000;i++){const [h,a]=simulateLeagueGame(L,{strength:62},{strength:50});if(h>a)strong++;}
  return {perSide:runs/8000,draws:draws/4000,strong:strong/4000,rng:L.rng};})()`);
 assert.ok(r.perSide>2.2&&r.perSide<2.6,'runs '+r.perSide);
 assert.ok(r.draws>.02&&r.draws<.09,'draws '+r.draws);
 assert.ok(r.strong>.55,'stronger wins '+r.strong);
 assert.ok(Number.isInteger(r.rng));
});

test('old-shaped save: validation passes first, then 동네 season 1, contracts to the first season end, w/l/d kept',()=>{
 const run=world();
 const r=run(`(()=>{const t=newTeam('예전 구단',4,3);delete t.league;
  t.balance={...t.balance,contractGames:5};t.w=7;t.l=5;t.d=1;t.stadium=2;t.funds=4321;
  t.players.forEach((p,i)=>{p.contract=i%4;p.wage26={ask:100,baseline:clone(p.stats),clubGames:0,expired:p.contract===0,lastChange:null};});
  const raw=JSON.parse(JSON.stringify(t));let validated='';try{validateTeam(raw);validated='ok';}catch(e){validated=e.message;}
  data.slots=[raw,null];data.current=0;ensureClub(raw);
  const L=raw.league,copy=JSON.parse(JSON.stringify(raw));let again='';try{validateTeam(copy);again='ok';}catch(e){again=e.message;}
  return {validated,again,tier:L.tier,season:L.season,phase:L.phase,round:L.round,results:L.results.length,contracts:[...new Set(raw.players.map(p=>p.contract))],
   expired:raw.players.some(p=>p.wage26.expired),balanceKey:'contractGames' in raw.balance,wld:[raw.w,raw.l,raw.d],stadium:raw.stadium,funds:raw.funds,news:raw.news[0].title};})()`);
 assert.equal(r.validated,'ok');assert.equal(r.again,'ok');
 assert.deepEqual([r.tier,r.season,r.phase,r.round,r.results],[0,1,'season',0,0]);
 assert.deepEqual(r.contracts,[10]);assert.equal(r.expired,false);assert.equal(r.balanceKey,false);
 assert.deepEqual(r.wld,[7,5,1]);assert.equal(r.stadium,2);assert.equal(r.funds,4321);assert.match(r.news,/동네 리그 시즌 1/);
});

test('validation: a missing league is fine, a damaged league or match tag is rejected',()=>{
 const run=world();
 const check=mutate=>run(`(()=>{const t=club(),c=JSON.parse(JSON.stringify(t));${mutate};try{validateTeam(c);return 'ok';}catch(e){return e.message;}})()`);
 assert.equal(check(''),'ok');assert.equal(check('delete c.league'),'ok');
 assert.equal(check("c.league.phase='offseason';c.league.round=10;c.league.pendingPromotion={to:2,need:2,season:1}"),'ok');
 for(const bad of ["c.league.tier=4","c.league.season=0","c.league.phase='break'","c.league.round=11","c.league.teams.pop()","c.league.schedule[0][0].home=c.league.schedule[0][1].home",
  "c.league.results=[{round:0,home:'us',away:'zz',score:[1,0]}]","c.league.teams[0].players[0].a.contact=101","c.league.history=[{season:1,tier:0,rank:7,nextTier:0,prize:0}]",
  "c.league.rng=-1","c.league.lots={us:'x'}"])
  assert.match(check(bad),/리그 자료 오류/,bad);
 // the league tag on a saved match
 const tag=x=>run(`(()=>{try{validateLeagueState({match:{league:${x}}});return 'ok';}catch(e){return e.message;}})()`);
 assert.equal(tag("{season:1,tier:0,round:9,oppId:'n1',payout:0,recorded:true}"),'ok');
 for(const bad of ["{season:1,tier:0,round:10,oppId:'n1'}","{season:1,tier:5,round:0,oppId:'n1'}","{season:1,tier:0,round:0}","null","{season:1,tier:0,round:0,oppId:'n1',payout:'x'}"])assert.match(tag(bad),/리그 자료 오류/,bad);
});

test('hooks: tier sets opponent level, crowd demand, market offset and season contract length',()=>{
 const levels=world()('[0,1,2,3].map(tier=>opponentLevel({w:99,league:{tier}}))');
 assert.deepEqual(levels,[-1.125,1.875,4.875,7.875]);
 // crowd demand ×1 / 1.1 / 1.25 / 1.4, still capped by seats
 const crowd=world()(`(()=>{const t=club();t.players.forEach(p=>p.fans=50);t.stadium=5;const out=[];for(const tier of [0,1,2,3]){t.league.tier=tier;out.push(attendance(t));}t.stadium=1;t.players.forEach(p=>p.fans=900);t.league.tier=3;out.push(attendance(t));return out;})()`);
 // 12 players × 50 fans × .3 + 80 = 260 people (in units of 10) at the base ticket price
 assert.deepEqual(crowd.slice(0,4),[260,286,325,364]);
 assert.equal(crowd[4],200,'seat cap of a grade-1 stadium (2,000 seats)');
 // market: same draw, +0 / +10 on the nine abilities (cap 100), price and salary from the existing formula
 const pick=tier=>world({seed:77})(`(()=>{const t=club();t.league.tier=${tier};return createMarketCandidates(t).map(p=>({a:p.a,price:p.price,salary:p.salary,fair:p.price===Math.round(abilityPrice(p)*balance(t).hireFactor)&&p.salary===Math.max(3,Math.round(abilityPrice(p)*balance(t).salaryFactor))}));})()`);
 const low=pick(0),high=pick(2);
 low.forEach((p,i)=>{for(const k of ['contact','power','eye','speed','sense','catch','throw','velocity','control'])assert.equal(high[i].a[k],Math.min(100,p.a[k]+10),k);assert.equal(high[i].a.stamina,p.a.stamina);assert.ok(high[i].price>p.price);assert.ok(p.fair&&high[i].fair);});
 // contract length follows the season
 assert.deepEqual(world()(`(()=>{const t=club(),a=contractGamesFor26(t);t.league.round=7;const b=contractGamesFor26(t);t.league.phase='offseason';return [a,b,contractGamesFor26(t),contractGamesFor26(null)];})()`),[10,3,10,10]);
});

test('league opponent: stored players, 13 with relief, full energy, colors kept apart from ours, valid team',()=>{
 const run=world();
 const r=run(`(()=>{const t=club(),rec=t.league.teams[0];t.primary=rec.primary;const o=leagueOpponentTeam(t,rec.id);let valid='ok';try{validateTeam(o);}catch(e){valid=e.message;}
  return {valid,n:o.players.length,lineup:o.lineup.length,pitcher:o.lineup[9].pos,relief:o.reliefRoster23,level:o.leagueLevel===rec.level,id:o.leagueTeamId===rec.id,
   same:o.players.every((p,i)=>JSON.stringify(p.a)===JSON.stringify(rec.players[i].a)),energy:o.players.every(p=>p.energy===p.a.stamina),fresh:o.players.every(p=>p.stats.games===0),
   apart:colorDistance(COLORS[o.primary][1],COLORS[t.primary][1])>125,league:'league' in o};})()`);
 assert.deepEqual(r,{valid:'ok',n:13,lineup:10,pitcher:'P',relief:true,level:true,id:true,same:true,energy:true,fresh:true,apart:true,league:false});
});

test('extension points: season-end steps run in order and later steps can be inserted or skipped',()=>{
 const run=world();
 assert.deepEqual(run('LEAGUE_SEASON_END_STEPS.map(s=>s.id)'),['rank','prize','promotion','offseason']);
 const r=run(`(()=>{const order=[];addLeagueSeasonEndStep({id:'opinion',run:(t,ctx)=>order.push('opinion:'+ctx.rank+':'+ctx.prize)},{after:'prize'});
  addLeagueSeasonEndStep({id:'disband',run:(t,ctx)=>{order.push('disband');ctx.skip.push('promotion');}},{after:'opinion'});
  addLeagueSeasonEndStep({id:'aging',run:()=>order.push('aging')},{after:'promotion'});
  LEAGUE_MATCH_HOOKS.push((t,m,info)=>order.push('match:'+info.round+':'+info.result));
  const t=club();for(let i=0;i<10;i++)playRound(t,[5,0]);
  return {ids:LEAGUE_SEASON_END_STEPS.map(s=>s.id),order:order.slice(-4),matches:order.filter(x=>x.startsWith('match')).length,tier:t.league.tier,phase:t.league.phase};})()`);
 assert.deepEqual(r.ids,['rank','prize','opinion','disband','promotion','aging','offseason']);
 assert.deepEqual(r.order,['match:9:W','opinion:1:500','disband','aging']);
 assert.equal(r.matches,10);assert.equal(r.tier,0,'skipped promotion keeps the tier');assert.equal(r.phase,'offseason');
});

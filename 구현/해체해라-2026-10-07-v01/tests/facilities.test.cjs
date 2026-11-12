// Facility overhaul and the away gate (build step ⑤): the P17 table and slots, build/upgrade/demolish money, the upkeep split,
// every facility effect (through the real per-game settlement where it applies), the P16 away gate by bus level, training
// discounts and caps by level, the academy prospect, the hall of fame, the old-save migration (merges, removed shops, slot
// overflow) and validation, the rebuild with the new ids, and the numbers against the simulator's REFORM table.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {REFORM}=require('./run-economy-sim.cjs');
const read=f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8');
const game=read('game.js'),ext=read('extensions.js'),league=read('league.js'),growth=read('growth.js'),opinion=read('opinion.js'),events=read('club-events.js'),auto=read('auto-lineup.js');
const mlb=read('mlb.js'),support=read('mlb-support.js'),fac=read('facilities.js');
const F_HOOKS=fac.indexOf('// Game hooks.'),F_UI=fac.indexOf('// UI integration.');
assert.ok(F_HOOKS>0&&F_UI>F_HOOKS&&fac.indexOf('// Game hooks.',F_HOOKS+1)<0&&fac.indexOf('// UI integration.',F_UI+1)<0,'facilities.js markers');
const line=(src,re)=>{const m=src.match(re);assert.ok(m,'missing source line '+re);return m[0];};
function seeded(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
const close=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-9,msg+': '+a+' vs '+b);

const helpers=`
 var club=(name='우리')=>{const t=newTeam(name,11,5);data.slots=[t,null];data.current=0;ensureClub(t);t.players.forEach(p=>{p.age=20;p.loyalty=60;p.fans=50;});t.balance.fanEventChance=0;t.funds=100000;return t;};
 var builds=(t,ids)=>ids.map(id=>buildFacility(t,id));
 var forceRank=null;(()=>{const step=LEAGUE_SEASON_END_STEPS.find(s=>s.id==='rank'),real=step.run;step.run=(t,ctx)=>{real(t,ctx);if(forceRank)ctx.rank=forceRank;};})();
 var endSeason=(t,rank,value=null)=>{if(value!==null)t.opinion.value=value;forceRank=rank;t.league.round=LEAGUE.seasonGames;try{return runSeasonEnd(t);}finally{forceRank=null;}};
 var nextSeason=t=>{const L=t.league;L.season++;L.phase='season';L.round=0;L.results=[];};
 var tryValidate=t=>{try{const c=JSON.parse(JSON.stringify(t));c.match=null;validateTeam(c);return 'ok';}catch(e){return e.message;}};
 (()=>{const before=validateTeam;validateTeam=function(t){before(t);validateMlbState(t);};})();
 // One league game through the real settlement (extensions.js reward() with every wrapper); the fixture decides home or away.
 var playLeague=(t,score)=>{const L=t.league,fx=leagueFixture(L),m={id:'m'+L.season+'-'+fx.round,opp:{name:'상대'},home:fx.usHome?0:1,score,done:true,rewarded:false,rng:777,
   events:[],checks:{events:0,violations:[],motions:0,reactions:0},innings:[[0],[0]],hits:[0,0],errors:[0,0],bh:[0,0],pitches:0,subs:[],league:{season:L.season,tier:L.tier,round:fx.round,oppId:fx.oppId}};
  t.match=m;const before=t.funds;reward(m);return {m,before,after:t.funds};};
 var mlbN=0;
 // A real MLB departure through mlb.js (main three 90, roll 0); the pending reward is taken so nothing waits.
 var send=(t,loyalty=60)=>{const p=enrich(player(true,t.players.map(x=>x.number)));p.name='빅리거'+(++mlbN);p.age=24;p.contract=10;p.loyalty=loyalty;p.stats.games=10;
  for(const k of ['contact','power','eye'])p.a[k]=90;for(const k of ['velocity','control'])p.a[k]=Math.min(p.a[k],70);p.a.stamina=Math.min(p.a.stamina,60);p.energy=p.a.stamina;
  t.players.push(p);const r=completeMlbAttempt(t,mlbQuote(t,p.id),()=>0);if(!r.ok)throw Error(r.message);chooseMlbReward(t,r.result.id,'loyalty',()=>0);return r.result;};
 var botTeam=(level=0)=>{const o=newTeam('상대',8,4,true);o.players=[];for(let i=0;i<10;i++){const p=player(false,o.players.map(p=>p.number),true,level);p.a.stamina=randomInt(40,80);p.energy=p.a.stamina;o.players.push(p);}o.lineup=dhLineup(o.players);o.setupStage='complete';return o;};
 var startGame=(t,opp,home,seed)=>{const m={id:'g'+seed,opp,home,inning:1,half:0,outs:0,balls:0,strikes:0,bases:[null,null,null],score:[0,0],hits:[0,0],errors:[0,0],order:[0,0],last:[null,null],
  innings:[Array(7).fill(null),Array(7).fill(null)],paPitches:0,pitches:0,bh:[0,0],bhBase:[2,1],bhBaseUsed:[0,0],opportunities:[0,0],events:[],rng:(seed>>>0)||7,paused:false,auto:false,done:false,rewarded:false,
  lastLines:{},reactionCount:0,checks:{events:0,violations:[],motions:0,reactions:0},defense:{side:1,depth:1}};
  t.match=m;for(const tm of [t,opp]){tm.lineup.forEach(x=>ply(tm,x.id).stats.games++);pitcher(tm).stats.appearances++;tm.players.forEach(p=>p.energy=p.a.stamina);}
  m.used=t.lineup.map(x=>x.id);m.subs=[];m.innings[attack(m)][0]=0;prepare(m);return m;};
`;
// Real game code in load order: game.js rules, the economy/fatigue/settlement/contract parts of extensions.js (with the facility
// seams and the base reward), club events, mlb.js, league.js, growth.js, opinion.js and mlb-support.js up to their UI sections,
// then facilities.js up to its UI section.
function world({seed=20261111}={}){
 const math=Object.create(Math);math.random=seeded(seed);let ids=0;
 const ctx=vm.createContext({Math:math,crypto:{randomUUID:()=>'id-'+(++ids),getRandomValues:a=>{a[0]=4242;return a;}},location:{hash:''},performance:{now:()=>0},
  document:{documentElement:{hasAttribute:()=>true}},window:{addEventListener:()=>{}},GameStorage:{create:()=>({})},
  money:n=>n+'만원',selection:null,CharacterRenderer:{names:{},variants:{}}});
 vm.runInContext(game.slice(0,game.indexOf('\nfunction rect(')),ctx);
 for(const re of [/^function opponentAbility\(.*$/m,/^function recordRecap\(.*$/m,/^function validBattingDraft\(.*$/m])vm.runInContext(line(game,re),ctx);
 vm.runInContext('chooseGroup=()=>null;',ctx);
 vm.runInContext(ext.slice(ext.indexOf('const BALANCE='),ext.indexOf('\nconst oldInitial=')),ctx);
 for(const re of [/^const oldValidate=validateTeam;.*$/m,/^const FACILITIES=.*$/m,/^const live=.*$/m,/^function ledger\(.*$/m,/^function spend\(.*$/m,/^function gain\(.*$/m,/^function news\(.*$/m,
  /^function crowdDemand\(.*$/m,/^function attendance\(.*$/m,/^function costGrowth\(.*$/m,/^function trainingFacility\(.*$/m,/^const MARKET_REFRESH_COST=.*$/m,/^function createMarketCandidates\(.*$/m,/^function salaryAsk\(.*$/m])vm.runInContext(line(ext,re),ctx);
 // the fatigue wrapper of resolvePitch (with the stamina seam) and the per-game settlement reward()
 vm.runInContext(ext.slice(ext.indexOf('let fatigueSnapshot=null;'),ext.indexOf('// Composite the final')),ctx);
 vm.runInContext(ext.slice(ext.indexOf('const legacyAsk26='),ext.indexOf('function validVacancy26(')),ctx);
 for(const re of [/^function validVacancy26\(.*$/m,/^const plyBefore26=ply;$/m,/^ply=function\(t,id\).*$/m])vm.runInContext(line(ext,re),ctx);
 vm.runInContext(ext.slice(ext.indexOf('negotiate=function(p,amount,random='),ext.indexOf('\nconst commitBefore26=')),ctx);
 vm.runInContext(events.slice(events.indexOf('const CLUB_EVENT_TYPES'),events.indexOf('const CLUB_EVENT_DURATION')),ctx);
 vm.runInContext(auto,ctx);
 vm.runInContext(mlb.split('// UI integration.')[0],ctx);
 vm.runInContext(league.slice(0,league.indexOf('// UI integration.')),ctx);
 vm.runInContext(growth.slice(0,growth.indexOf('// UI integration.')),ctx);
 vm.runInContext(opinion.slice(0,opinion.indexOf('// UI integration.')),ctx);
 vm.runInContext(support.slice(0,support.indexOf('// UI integration.')),ctx);
 vm.runInContext(fac.slice(0,F_UI),ctx);
 vm.runInContext(helpers,ctx);
 const run=code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
 return {run,exec:code=>vm.runInContext(code,ctx)};
}

test('the P17 table: 15 facilities in five groups, prices, upkeep, levels, slots by stadium grade, the season-end order',()=>{
 const {run}=world();
 const T=run('FACILITY_TABLE.map(f=>[f.id,f.category,f.name,facilityPrice(f),f.train?"level":f.awayOnly?"away "+f.upkeep:f.upkeep])');
 assert.deepEqual(T,[
  ['bat','훈련','타격 훈련장',1000,'level'],['field','훈련','수비 훈련장',1000,'level'],['pitch','훈련','불펜',1000,'level'],['conditioning','훈련','컨디셔닝 센터',1000,'level'],
  ['locker','복지','라커룸',1000,100],['massage','복지','마사지실',1000,100],['sleep','복지','수면실',1000,100],['food','복지','선수 식당',1500,100],
  ['uniform','수익','유니폼 매장',500,0],['restaurant','수익','구장 음식점',1000,100],['billboard','수익','광고판',1500,100],
  ['fans','팬','팬 만남 광장',1000,100],['bus','팬','응원단 버스',1000,'away 100'],['hall','팬','명예의 전당',2000,100],['academy','특별','유소년 아카데미',2000,150]]);
 const F=run('FACILITY');
 assert.deepEqual(F.train.slice(1),[{add:1000,upkeep:150,discount:0,exp:1,cap:0},{add:2500,upkeep:250,discount:.2,exp:1.2,cap:0},{add:5000,upkeep:300,discount:.4,exp:1.4,cap:5}]);
 assert.deepEqual(F.bus.slice(1),[{add:1000,share:.15},{add:2000,share:.2},{add:5000,share:.25},{add:8000,share:.3}]);
 assert.deepEqual([F.uniformPerFan,F.restaurantPerCrowd,F.billboard,F.lockerLoyalty,F.plazaFans,F.massageSave,F.sleepSense,F.foodExp,F.hallOpinion,F.hallMemoryDrop,F.refund],[.05,1,[120,200,350,600],1,2,.15,5,1.1,-5,5,.3]);
 assert.deepEqual(run('[1,2,3,4,5].map(n=>facilitySlots({stadium:n}))'),[5,8,11,14,17]);
 assert.deepEqual(run('FACILITY_TABLE.map(f=>facilityMaxLevel(f))'),[3,3,3,3,1,1,1,1,1,1,1,1,4,1,1]);
 // the list older code reads: [id, name, effect, trained abilities, category]; every ability has a training facility
 const rows=run('FACILITIES');assert.equal(rows.length,15);assert.deepEqual(rows[3],['conditioning','컨디셔닝 센터','주력 · 스태미나 훈련',['speed','stamina'],'훈련']);
 assert.deepEqual(run('KEYS.map(k=>trainingFacility(k)[0])'),['bat','bat','bat','conditioning','field','field','field','pitch','pitch','conditioning']);
 assert.equal(run('LEAGUE_SEASON_END_STEPS.map(s=>s.id).at(-1)'),'facilities');
 // the retired BALANCE values (one flat build cost and upkeep) are gone from the settings
 assert.deepEqual(run('[("facilityPrice" in BALANCE),("maintenance" in BALANCE),("facilityPrice" in BALANCE_LABELS)]'),[false,false,false]);
});

test('numbers match the simulator REFORM table (P17 v03); listed differences: the level-3 cap and the academy experience',()=>{
 const {run}=world();
 const T=run('FACILITY_TABLE'),F=run('FACILITY'),simId={cond:'conditioning',fanplaza:'fans'};
 for(const [sid,f] of Object.entries(REFORM.fac)){
  const d=T.find(x=>x.id===(simId[sid]||sid));assert.ok(d,'missing '+sid);
  if(f.train){assert.deepEqual(d.train,f.train,sid);assert.equal(F.train[1].add,f.price,sid);continue;}
  assert.equal(d.id==='bus'?F.bus[1].add:d.price,f.price,sid+' price');assert.equal(d.upkeep,f.maint,sid+' upkeep');assert.equal(!!d.awayOnly,!!f.awayOnly,sid+' away only');
 }
 for(const n of [1,2,3]){const s=REFORM.trainLevels[n],g=F.train[n];assert.deepEqual([g.add,g.upkeep,g.discount,g.exp],[s.add,s.maint,s.disc,s.exp],'level '+n);}
 // the simulator caps 80/80/85 (match cap 80); the game's match cap is 85 since ②, so level 3 gives 90 (+5 in both)
 assert.deepEqual(REFORM.trainLevels.slice(1).map(x=>x.cap-80),F.train.slice(1).map(x=>x.cap));
 assert.deepEqual(REFORM.busLevels.slice(1),F.bus.slice(1).map(x=>x.add));
 assert.deepEqual(REFORM.busShares,[0,...F.bus.slice(1).map(x=>x.share)]);
 assert.deepEqual([REFORM.uniformPerFan,REFORM.restaurantPerCrowd,REFORM.billboard,REFORM.foodExp,REFORM.hallPressure,REFORM.hallMemory],[F.uniformPerFan,F.restaurantPerCrowd,F.billboard,F.foodExp,F.hallOpinion,F.hallMemoryDrop]);
 // the simulator's academy ×1.3 is replaced by the 19-year-old youth bonus (P17 · P10 notes): no facility factor for a prospect
 assert.equal(REFORM.academyExp,1.3);
 assert.equal(run('(()=>{const t=club();builds(t,["academy"]);const p=academyProspect(t,2);return facilityExpFactor(t,p,"contact")*growthYouthMultiplier(p.age);})()'),1.5);
});

test('build, upgrade and demolish: costs, the 30% refund of build + upgrades, slots, funds and the live-game block',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club(),f=[];t.stadium=5;
  f.push(buildFacility(t,'bat'),t.funds,facilityLevel(t,'bat'),facilityPaid(t,'bat'));
  f.push(upgradeFacility(t,'bat'),t.funds,upgradeFacility(t,'bat'),t.funds,facilityLevel(t,'bat'),facilityPaid(t,'bat'),upgradeFacility(t,'bat'));
  const d=demolishFacility(t,'bat');f.push(d.refund,t.funds,facilityHas(t,'bat'),t.facilityData.levels.bat===undefined,t.facilityData.paid.bat===undefined);
  buildFacility(t,'bus');for(let i=0;i<3;i++)upgradeFacility(t,'bus');f.push(facilityLevel(t,'bus'),facilityPaid(t,'bus'),facilityRefund(t,'bus'),upgradeFacility(t,'bus'));
  builds(t,['uniform','hall','academy','food']);f.push(facilityRefund(t,'uniform'),facilityRefund(t,'hall'),facilityRefund(t,'academy'),facilityRefund(t,'food'),upgradeFacility(t,'food'));
  f.push(buildFacility(t,'uniform'),buildFacility(t,'nope'));
  return {f,ledger:t.ledger.slice(0,3).map(x=>[x.label,x.amount]),news:t.news[0]?.title,valid:tryValidate(t)};})()`);
 assert.deepEqual(r.f,['',99000,1,1000,'',96500,'',91500,3,8500,'최고 단계입니다.',2550,94050,false,true,true,4,16000,4800,'최고 단계입니다.',150,600,600,450,'단계가 없는 시설입니다.','이미 지은 시설입니다.','없는 시설입니다.']);
 assert.equal(r.valid,'ok');
 // slots by grade, funds and a running game
 const s=run(`(()=>{const t=club(),out=[];out.push(builds(t,['bat','field','pitch','conditioning','locker']).join('|'),buildFacility(t,'massage'));
  t.stadium=2;out.push(buildFacility(t,'massage'),t.facilities.length+'/'+facilitySlots(t));
  t.funds=400;out.push(buildFacility(t,'sleep'),buildFacility(t,'uniform'));t.funds=500;out.push(buildFacility(t,'uniform'),t.funds);
  t.funds=99999;t.match={done:false};out.push(buildFacility(t,'sleep'),upgradeFacility(t,'bat'),facilityDemolishBlock(t,'bat'));t.match=null;
  return out;})()`);
 assert.deepEqual(s,['||||','건물 자리가 없습니다(5 / 5). 경기장을 확장하거나 시설을 철거해 주세요.','','6/8','건설 자금이 부족합니다. 1000만원이 필요합니다.','건설 자금이 부족합니다. 500만원이 필요합니다.','',0,
  '경기가 끝난 뒤 지을 수 있습니다.','경기가 끝난 뒤 올릴 수 있습니다.','경기가 끝난 뒤 철거할 수 있습니다.']);
});

test('upkeep split: training by level, academy 150, uniform 0, bus 100 on away games only, the rest 100; the next-game estimate',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club();t.stadium=5;builds(t,FACILITY_TABLE.map(f=>f.id));upgradeFacility(t,'field');upgradeFacility(t,'pitch');upgradeFacility(t,'pitch');for(let i=0;i<3;i++)upgradeFacility(t,'bus');
  const rows=Object.fromEntries(facilityUpkeepRows(t,{home:1}).map(r=>[r.id,r.amount]));
  const next0=operatingBudget(t).maintenance;const L=t.league;L.round=1;const next1=operatingBudget(t).maintenance;L.round=0;
  return {home:facilityUpkeepTotal(t,{home:0}),away:facilityUpkeepTotal(t,{home:1}),rows,next0,next1,homeBus:facilityUpkeepOf(t,'bus',false)};})()`);
 assert.deepEqual(r.rows,{bat:150,field:250,pitch:300,conditioning:150,locker:100,massage:100,sleep:100,food:100,uniform:0,restaurant:100,billboard:100,fans:100,bus:100,hall:100,academy:150});
 assert.equal(r.home,1800);assert.equal(r.away,1900);assert.equal(r.homeBus,0);
 assert.deepEqual([r.next0,r.next1],[1800,1900],'round 1 is a home game, round 2 away (the bus upkeep shows only then)');
});

test('the real settlement: home game (uniform, restaurant, billboard, locker +1, plaza +2) and away game (away gate, billboard, bus upkeep)',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club();t.stadium=3;t.ticket=10;builds(t,['locker','fans','uniform','restaurant','billboard','bus']);upgradeFacility(t,'bus');
  const crowd1=attendance(t),g1=playLeague(t,[3,1]),f1=JSON.parse(JSON.stringify(g1.m.finance)),loy1=t.players.map(p=>p.loyalty),fans1=t.players.map(p=>p.fans);
  const crowd2=attendance(t),g2=playLeague(t,[0,2]),f2=JSON.parse(JSON.stringify(g2.m.finance)),loy2=t.players.map(p=>p.loyalty),fans2=t.players.map(p=>p.fans);
  return {crowd1,crowd2,f1,f2,d1:g1.after-g1.before,d2:g2.after-g2.before,loy1,loy2,fans1,fans2,hist:t.history[0].finance.facility,valid:tryValidate(t)};})()`);
 const {f1,f2}=r;
 assert.equal(f1.facility.home,true);assert.equal(f1.ticket,r.crowd1*10);
 assert.deepEqual([f1.facility.fans,f1.facility.uniform,f1.facility.restaurant,f1.facility.billboard,f1.facility.awayGate],[600,30,r.crowd1,120,0],'600 personal fans × 500원 = 30만, crowd × 1만 (10 people × 1,000원), 동네 120만');
 close(f1.stores,30+r.crowd1+120,'shop income');
 assert.equal(f1.maintenance,400,'locker, plaza, restaurant, billboard 100 each; uniform 0; bus 0 at home');assert.equal(f1.facility.upkeep,400);
 close(r.d1,f1.net,'funds change = the settlement net');
 assert.ok(r.loy1.every(v=>v===61),'locker +1');assert.ok(r.fans1.every(v=>v===55),'win +3 and plaza +2');
 // away: round(crowd × 20%) × our ticket, only the billboard of the shops, the bus upkeep
 assert.equal(f2.facility.home,false);assert.equal(f2.facility.awayCrowd,Math.round(r.crowd2*.2));assert.equal(f2.ticket,Math.round(r.crowd2*.2)*10);assert.equal(f2.facility.awayGate,f2.ticket);
 assert.deepEqual([f2.facility.bus,f2.facility.share,f2.stores,f2.facility.uniform,f2.facility.restaurant],[2,.2,120,0,0]);
 assert.equal(f2.maintenance,500,'the bus upkeep is paid on away games');assert.deepEqual(f2.facility.rows.map(x=>x.id),['locker','fans','restaurant','billboard','bus']);
 close(r.d2,f2.net,'funds change = the settlement net');
 assert.ok(r.loy2.every(v=>v===62),'locker +1 after a loss too');assert.ok(r.fans2.every(v=>v===57),'plaza +2 without a win');
 assert.deepEqual(r.hist,f2.facility,'the saved history keeps the detail');assert.equal(r.valid,'ok');
 // the same club without the locker and the plaza: loyalty stays, fans only get the win
 const b=run(`(()=>{const t=club();t.stadium=3;builds(t,['uniform']);const g=playLeague(t,[3,1]);return {loy:t.players.map(p=>p.loyalty),fans:t.players.map(p=>p.fans),maint:g.m.finance.maintenance,stores:g.m.finance.stores};})()`);
 assert.ok(b.loy.every(v=>v===60));assert.ok(b.fans.every(v=>v===53));assert.deepEqual([b.maint,b.stores],[0,30]);
 // a home game pays no away gate even with a bus; an away game without a bus earns nothing (P16: 0% at the start)
 const c=run(`(()=>{const t=club();const g1=playLeague(t,[1,1]),g2=playLeague(t,[1,1]);return [g1.m.home,g1.m.finance.ticket>0,g2.m.home,g2.m.finance.ticket,g2.m.finance.facility.share];})()`);
 assert.deepEqual(c,[0,true,1,0,0]);
});

test('away gate share by bus level (P16) and shop income by league tier and personal fans (P17)',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club();t.stadium=5;t.ticket=12;const crowd=attendance(t),out=[];
  out.push([busShare(t),facilitySettlement(t,{home:1},crowd).awayGate]);buildFacility(t,'bus');
  for(let n=1;n<=4;n++){if(n>1)upgradeFacility(t,'bus');const x=facilitySettlement(t,{home:1},crowd);out.push([busShare(t),x.awayGate,x.awayCrowd]);}
  builds(t,['billboard','uniform','restaurant']);const tiers=[0,1,2,3].map(k=>{t.league.tier=k;return [facilitySettlement(t,{home:0},crowd).billboard,facilitySettlement(t,{home:1},crowd).billboard];});
  t.league.tier=0;t.players.forEach((p,i)=>{p.fans=i===0?61:50;});const u=facilitySettlement(t,{home:0},crowd);
  return {crowd,out,tiers,u:[u.fans,u.uniform,u.restaurant],away:facilitySettlement(t,{home:1},crowd).uniform,budget:facilityBudgetShops(t),crowdB:attendance(t)};})()`);
 const c=r.crowd;
 assert.deepEqual(r.out,[[0,0],[.15,Math.round(c*.15)*12,Math.round(c*.15)],[.2,Math.round(c*.2)*12,Math.round(c*.2)],[.25,Math.round(c*.25)*12,Math.round(c*.25)],[.3,Math.round(c*.3)*12,Math.round(c*.3)]]);
 assert.deepEqual(r.tiers,[[120,120],[200,200],[350,350],[600,600]],'billboard every game by tier');
 assert.deepEqual(r.u,[611,30.55,c],'500원 per fan, exact');assert.equal(r.away,0,'uniform shop only at home');
 const b=r.crowdB;close(r.budget,30.55+b+120+120+Math.round(b*.3)*12,'next-game estimate: home shops + away shops + away gate');
});

test('마사지실: our players use 15% less stamina in real pitches; the opponent is unchanged',()=>{
 const used=massage=>{const {run}=world({seed:777});return run(`(()=>{const t=club();t.stadium=2;if(${massage})buildFacility(t,'massage');const o=botTeam(0),m=startGame(t,o,0,4242);
  for(let i=0;i<15&&!m.done;i++)resolvePitch(m);return {us:t.players.reduce((s,p)=>s+(p.a.stamina-p.energy),0),them:o.players.reduce((s,p)=>s+(p.a.stamina-p.energy),0),pitches:m.pitches,score:m.score};})()`);};
 const a=used(false),b=used(true);
 assert.ok(a.us>10,'our club used stamina: '+a.us);assert.deepEqual([a.pitches,a.score],[b.pitches,b.score],'same game');
 close(b.us,a.us*.85,'stamina used ×0.85');close(b.them,a.them,'opponent unchanged');
 const {run}=world();
 assert.deepEqual(run(`(()=>{const t=club(),o=botTeam(0);buildFacility(t,'massage');return [staminaUseFactor(t,t.players[0]),staminaUseFactor(t,o.players[0])];})()`),[.85,1]);
});

test('수면실: the bonehead score of our player uses sense +5 (capped at 100); other players unchanged',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club(),o=botTeam(0),p=t.players[0],q=o.players[0];p.a.sense=60;const before=[bhScore(p,4),bhScore(q,4)];buildFacility(t,'sleep');
  const after=[bhScore(p,4),bhScore(q,4)];p.a.sense=98;const capped=bhScore(p,7),plain=98*.7+p.a.eye*.3,full=100*.7+p.a.eye*.3;return {before,after,capped,full,plain,sense:p.a.sense};})()`);
 close(r.after[0],r.before[0]+3.5,'sense +5 × 0.7');close(r.after[1],r.before[1],'opponent');
 close(r.capped,r.full,'98 + 5 counts as 100');assert.equal(r.sense,98,'the real ability is untouched');
});

test('선수 식당 and training levels: experience ×1.1 / ×1.2 / ×1.4 via the growth hook, level-3 cap 90, training cost −20% / −40%',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club();t.stadium=5;const p=t.players[0];const m=k=>growthExpMultiplier(t,p,k,0)/growthExpMultiplier({facilities:[]},p,k,0);const out={};
  out.base=[m('contact'),m('speed')];buildFacility(t,'food');out.food=[m('contact'),m('speed')];
  buildFacility(t,'bat');out.l1=m('contact');upgradeFacility(t,'bat');out.l2=[m('contact'),m('eye'),m('speed')];upgradeFacility(t,'bat');out.l3=[m('contact'),m('sense')];
  out.cap=[growthCap(t,p,'contact'),growthCap(t,p,'sense'),growthCap(t,p,'stamina')];buildFacility(t,'conditioning');upgradeFacility(t,'conditioning');upgradeFacility(t,'conditioning');
  out.capStamina=growthCap(t,p,'stamina');t.balance.staminaCap=88;out.capStamina88=growthCap(t,p,'stamina');t.balance.staminaCap=100;
  // a real level-up stops at 90 instead of 85
  p.a.power=88;p.exp={};const ups=addMatchExp(t,p,{power:400},k=>1);out.power=[p.a.power,ups.length];
  p.a.contact=50;p.a.speed=50;demolishFacility(t,'bat');const plain=[costGrowth(p,'contact'),costGrowth(p,'speed')];
  buildFacility(t,'bat');const c1=costGrowth(p,'contact');upgradeFacility(t,'bat');const c2=costGrowth(p,'contact');upgradeFacility(t,'bat');const c3=costGrowth(p,'contact');
  out.cost=[plain,c1,c2,c3,costGrowth(p,'speed')];return out;})()`);
 assert.deepEqual(r.base,[1,1]);r.food.forEach(v=>close(v,1.1,'food'));close(r.l1,1.1,'level 1 adds nothing');
 close(r.l2[0],1.32,'food × level 2');close(r.l2[1],1.32,'eye is a bat ability');close(r.l2[2],1.1,'speed is not');
 close(r.l3[0],1.54,'food × level 3');close(r.l3[1],1.1,'sense is not');
 assert.deepEqual(r.cap,[90,85,85]);assert.equal(r.capStamina,90);assert.equal(r.capStamina88,88);
 assert.deepEqual(r.power,[90,1],'match growth past 85 with a level-3 batting facility');
 // cost(50) × 110 = 220 → level 2 −20% 176 → level 3 −40% 132; speed follows the conditioning center (level 3 here)
 assert.deepEqual(r.cost,[[220,132],220,176,132,132]);
});

test('명예의 전당: season-end opinion −5%p, support requests lower remembered loyalty by 5, inductions survive a rebuild',()=>{
 const {run}=world();
 const r=run(`(()=>{const a=club();const s1=endSeason(a,3,50);const without=[a.opinion.value,a.league.history.at(-1).opinion.parts.map(p=>p.key)];
  const t=club();t.stadium=2;const h1=send(t,95);buildFacility(t,'hall');const inducted0=t.facilityData.hall.inducted.map(x=>x.id);
  const q=mlbSupportQuote(t,h1);const req=requestMlbSupport(t,h1.id);const h2=send(t,80);
  endSeason(t,3,50);const withHall=[t.opinion.value,t.league.history.at(-1).opinion.parts.map(p=>[p.key,p.delta])];
  const inducted1=t.facilityData.hall.inducted.map(x=>x.name);
  demolishFacility(t,'hall');const q2=mlbSupportQuote(t,h2);
  return {without,withHall,drop:q.drop,after:[req.from,req.to],drop2:q2.drop,inducted0,h1:h1.id,inducted1,keep:t.facilityData.hall.inducted.length,valid:tryValidate(t)};})()`);
 assert.deepEqual(r.without,[50,['rank']]);
 assert.deepEqual(r.withHall,[45,[['rank',0],['hall',-5]]]);
 assert.equal(r.drop,5);assert.deepEqual(r.after,[95,90]);assert.equal(r.drop2,10,'without the hall it is −10 again');
 assert.deepEqual(r.inducted0,[r.h1],'MLB alumni are inducted when the hall is built');assert.equal(r.inducted1.length,2,'and at the season end');
 assert.equal(r.keep,2,'the record stays when the building goes');assert.equal(r.valid,'ok');
 // the opinion part is summed before the one clamp (③): 2 − 30 − 5 → 0
 assert.equal(run(`(()=>{const t=club();buildFacility(t,'hall');endSeason(t,1,2);return t.opinion.value;})()`),0);
});

test('유소년 아카데미: one free 19-year-old prospect per season at the season end, lower abilities, hire, missed, none without the academy',()=>{
 const {run}=world();
 const r=run(`(()=>{const out={};
  const a=club();endSeason(a,3);out.none=a.facilityData.academy.prospect;
  const t=club();t.stadium=2;buildFacility(t,'academy');
  const real=player;player=(...args)=>{const p=real(...args);FACILITY_NINE.forEach((k,i)=>{p.a[k]=[10,20,22,25,40,70,100,19,30][i];});return p;};
  const p0=academyProspect(t,9);player=real;out.formula=FACILITY_NINE.map(k=>p0.a[k]);out.formulaAge=p0.age;
  const n0=t.players.length;endSeason(t,3);const A=t.facilityData.academy,p=A.prospect,funds0=t.funds;// after the 3rd-place prize
  out.p={age:p.age,price:p.price,season:p.academy.season,A:A.season,salary:p.salary>0,news:t.news.some(x=>x.title.startsWith('유소년 아카데미 유망주'))};
  out.again=facilitySeasonEndStep(t,{season:1});out.same=A.prospect.id===p.id;out.valid1=tryValidate(t);
  out.hire=hireAcademyProspect(t);const h=t.players.at(-1);
  out.hired={id:h.id===p.id,n:t.players.length-n0,funds:t.funds-funds0,contract:h.contract,age:h.age,unique:new Set(t.players.map(x=>x.number)).size===t.players.length,wage:!!h.wage26,left:A.prospect,log:A.log.map(x=>x.result)};
  out.hireAgain=hireAcademyProspect(t);
  nextSeason(t);endSeason(t,3);const p2=A.prospect;nextSeason(t);endSeason(t,3);
  out.next={s2:p2.academy.season,s3:A.prospect.academy.season,log:A.log.map(x=>x.result)};out.valid2=tryValidate(t);
  return out;})()`);
 assert.equal(r.none,null,'no academy, no prospect');
 assert.deepEqual(r.formula,[10,20,20,20,35,65,95,19,25],'9 abilities −5, not below 20; a value under 20 stays');assert.equal(r.formulaAge,19);
 assert.deepEqual(r.p,{age:19,price:0,season:2,A:2,salary:true,news:true});
 assert.equal(r.again,null,'once per season');assert.equal(r.same,true);assert.equal(r.valid1,'ok');
 assert.equal(r.hire,'');
 assert.deepEqual(r.hired,{id:true,n:1,funds:0,contract:10,age:19,unique:true,wage:true,left:null,log:['hired']});
 assert.equal(r.hireAgain,'데려올 유망주가 없습니다.');
 assert.deepEqual(r.next,{s2:3,s3:4,log:['hired','missed']},'an unsigned prospect leaves when the next one comes');assert.equal(r.valid2,'ok');
});

test('academy prospect names avoid current players and recruitment candidates',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club();t.market=createMarketCandidates(t);const before=JSON.stringify(t);
  const blocked=[...t.players,...t.market].map(p=>p.name),names=[];
  for(let i=0;i<30;i++)names.push(academyProspect(t,2).name);
  return {blocked,names,unchanged:before===JSON.stringify(t)};})()`);
 assert.ok(r.unchanged,'generating prospects leaves existing names intact');
 assert.ok(r.names.every(name=>!r.blocked.includes(name)));
});

test('the rebuild (③) removes the new facilities, their levels and a waiting prospect; the hall list stays',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club();t.stadium=3;builds(t,['bat','bus','hall','academy','uniform']);upgradeFacility(t,'bat');upgradeFacility(t,'bus');send(t,60);
  const e1=endSeason(t,3);const waiting=!!t.facilityData.academy.prospect;nextSeason(t);
  t.players.forEach((p,i)=>{p.loyalty=i<2?90:30;});t.mlbSupport.tickets=0;const e2=endSeason(t,6,100);// no revival ticket: the disband goes ahead
  const S=t.facilityData;return {waiting,disband:e2.disband,facilities:t.facilities,levels:S.levels,paid:S.paid,prospect:S.academy.prospect,log:S.academy.log.map(x=>x.result),hall:S.hall.inducted.length,stadium:t.stadium,valid:tryValidate(t)};})()`);
 assert.equal(r.waiting,true);assert.equal(r.disband,true);
 assert.deepEqual([r.facilities,r.levels,r.paid,r.prospect,r.log,r.hall,r.stadium],[[],{},{},null,['rebuild'],1,1]);assert.equal(r.valid,'ok');
});

test('old saves: ids mapped (run/fitness → conditioning, shower/locker → locker, goods → uniform), 편의점 and merged duplicates refunded, once',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club();t.stadium=3;delete t.facilityData;t.facilities=['bat','run','fitness','shower','locker','goods','store','fans','massage','xyz','bat'];
  t.balance.facilityPrice=1000;t.balance.maintenance=150;const funds=t.funds,before=tryValidate(t);
  ensureClub(t);const S=t.facilityData,after={facilities:t.facilities,levels:S.levels,paid:S.paid,refund:t.funds-funds,balance:['facilityPrice' in t.balance,'maintenance' in t.balance],
   news:t.news[0].title,text:t.news[0].text,migrated:S.migrated.refund,dropped:S.migrated.dropped,ledger:t.ledger[0].label};
  ensureClub(t);return {before,after,again:t.funds-funds,valid:tryValidate(t)};})()`);
 assert.equal(r.before,'ok','an old save passes the check before the conversion');
 assert.deepEqual(r.after.facilities,['bat','conditioning','locker','uniform','fans','massage']);
 assert.deepEqual(r.after.levels,{bat:1,conditioning:1});
 assert.deepEqual(r.after.paid,{bat:1000,conditioning:1000,locker:1000,uniform:1000,fans:1000,massage:1000});
 assert.equal(r.after.refund,3000,'체력 훈련실 and 탈의실 (merged) and 편의점 (removed) at 1,000만 each');assert.equal(r.after.migrated,3000);
 assert.deepEqual(r.after.balance,[false,false],'the retired settings are dropped');assert.deepEqual(r.after.dropped,['xyz']);
 assert.equal(r.after.news,'시설 개편 · 15개 시설');assert.match(r.after.text,/달리기장 → 컨디셔닝 센터/);assert.match(r.after.text,/체력 훈련실 → 컨디셔닝 센터에 합침/);assert.match(r.after.text,/편의점 없어짐/);
 assert.match(r.after.ledger,/시설 개편/);assert.equal(r.again,3000,'the conversion runs once');assert.equal(r.valid,'ok');
 // a custom old build cost is what is refunded and recorded; the first of two merged facilities is kept
 const c=run(`(()=>{const t=club();delete t.facilityData;t.facilities=['locker','shower','store'];t.balance.facilityPrice=1200;const f=t.funds;ensureClub(t);
  return [t.facilities,t.funds-f,t.facilityData.paid.locker,facilityRefund(t,'locker')];})()`);
 assert.deepEqual(c,[['locker'],2400,1200,360]);
 // slot overflow: nothing is deleted, building waits until a facility is demolished
 const o=run(`(()=>{const t=club();delete t.facilityData;t.facilities=['bat','field','pitch','run','massage','sleep','food'];const f=t.funds;ensureClub(t);
  const b1=buildFacility(t,'locker');demolishFacility(t,'sleep');demolishFacility(t,'food');const b2=buildFacility(t,'locker');
  return {n:t.facilities.length,refund:t.funds-f,text:t.news.find(x=>x.title==='시설 개편 · 15개 시설').text,b1,b2,valid:tryValidate(t)};})()`);
 assert.equal(o.b1,'건물 자리가 없습니다(7 / 5). 경기장을 확장하거나 시설을 철거해 주세요.');assert.match(o.text,/건물 자리를 넘었습니다\(7 \/ 5\)/);
 assert.equal(o.b2,'건물 자리가 없습니다(5 / 5). 경기장을 확장하거나 시설을 철거해 주세요.');assert.equal(o.n,5);assert.equal(o.valid,'ok');
 // a new club gets an empty state and no conversion news
 assert.deepEqual(run(`(()=>{const t=club();return [t.facilities,t.facilityData.migrated===undefined,t.news.some(x=>x.title==='시설 개편 · 15개 시설')];})()`),[[],true,false]);
});

test('validation: new state checked (ids, duplicates, levels, money, prospect, settlement detail), older saves and retired settings accepted',()=>{
 const {run}=world();
 const bad=mutate=>run(`(()=>{const t=club();t.stadium=3;builds(t,['bat','locker','bus','academy']);upgradeFacility(t,'bat');endSeason(t,3);t.history.push({id:'h1',finance:{facility:{uniform:30,rows:[{id:'bus',amount:100}],bus:2,share:.1}}});
  const c=JSON.parse(JSON.stringify(t));c.match=null;${mutate};try{validateTeam(c);return 'ok';}catch(e){return e.message;}})()`);
 assert.equal(bad(''),'ok');
 for(const [m,msg] of [
  ["c.facilities.push('run')",'시설 목록'],["c.facilities.push('bat')",'시설 목록'],
  ['c.facilityData.levels.bat=4','시설 단계'],['c.facilityData.levels.locker=1','시설 단계'],['c.facilityData.levels.hall=1','시설 단계'],['c.facilityData.levels.bus=5','시설 단계'],
  ['c.facilityData.paid.bat=-1','들인 돈'],['c.facilityData.paid.hall=10','들인 돈'],['c.facilityData.v=2','형식'],
  ['c.facilityData.academy.prospect.age=10','아카데미 유망주'],['c.facilityData.academy.prospect.price=50','아카데미 유망주'],["c.facilityData.academy.log.push({name:'x',result:'gone'})",'유소년 아카데미'],
  ["c.facilityData.hall.inducted.push({id:5})",'명예의 전당'],
  ['c.history.at(-1).finance.facility.uniform=-1','경기 시설 결산'],['c.history.at(-1).finance.facility.share=2','경기 시설 결산'],['c.history.at(-1).finance.facility.bus=5','경기 시설 결산']])
  assert.match(bad(m),new RegExp('시설 자료 오류 · '+msg),m);
 // an older save (no facilityData): old ids and the retired settings load; ids are converted afterwards by ensureClub
 assert.equal(bad("delete c.facilityData;c.facilities=['run','shower','goods','store'];c.balance.facilityPrice=1000;c.balance.maintenance=150"),'ok');
 assert.equal(bad("c.balance.maintenance=150"),'ok','old settings are accepted until they are dropped on load');
 assert.match(bad("c.balance.maintenance=-1"),/시험 설정 오류/);
});

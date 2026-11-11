// Match-experience growth, age, aging and retirement (build step ②): per-event experience with the league and youth
// multipliers, level-up by cost tier with the match-growth cap, entry age, aging bands, retirement, old-save ages,
// validation, and the match-start snapshot that survives a reload.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {EXP_PRESETS,makeTracker,eventExp}=require('./exp-events.cjs');
const {ageP21,entryP21,TEN}=require('./run-economy-sim.cjs');
const read=f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8');
const game=read('game.js'),ext=read('extensions.js'),league=read('league.js'),growth=read('growth.js');
const G_HOOKS=growth.indexOf('// Game hooks.'),G_UI=growth.indexOf('// UI integration.');
assert.ok(G_HOOKS>0&&G_UI>G_HOOKS&&growth.indexOf('// Game hooks.',G_HOOKS+1)<0&&growth.indexOf('// UI integration.',G_UI+1)<0,'growth.js markers');
const line=(src,re)=>{const m=src.match(re);assert.ok(m,'missing source line '+re);return m[0];};
function seeded(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
const close=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-9,msg+': '+a+' vs '+b);

const helpers=`
 var club=(name='우리')=>{const t=newTeam(name,11,5);data.slots=[t,null];data.current=0;ensureClub(t);return t;};
 var botTeam=(level=0)=>{const o=newTeam('상대',8,4,true);o.players=[];for(let i=0;i<10;i++){const p=player(false,o.players.map(p=>p.number),true,level);p.a.stamina=randomInt(40,80);p.energy=p.a.stamina;o.players.push(p);}o.lineup=dhLineup(o.players);o.setupStage='complete';return o;};
 // Starts a game the way startMatch does (starters' games +1, full energy), then takes the growth snapshot.
 var startGame=(t,opp,home,seed)=>{const m={id:'g'+seed,opp,home,inning:1,half:0,outs:0,balls:0,strikes:0,bases:[null,null,null],score:[0,0],hits:[0,0],errors:[0,0],order:[0,0],last:[null,null],
  innings:[Array(7).fill(null),Array(7).fill(null)],paPitches:0,pitches:0,bh:[0,0],bhBase:[2,1],bhBaseUsed:[0,0],opportunities:[0,0],events:[],rng:(seed>>>0)||7,paused:false,auto:false,done:false,rewarded:false,
  lastLines:{},reactionCount:0,checks:{events:0,violations:[],motions:0,reactions:0},defense:{side:1,depth:1}};
  t.match=m;for(const tm of [t,opp]){tm.lineup.forEach(x=>ply(tm,x.id).stats.games++);pitcher(tm).stats.appearances++;tm.players.forEach(p=>p.energy=p.a.stamina);}
  m.used=t.lineup.map(x=>x.id);m.subs=[];m.innings[attack(m)][0]=0;beginMatchGrowth(t,m);prepare(m);return m;};
 // A league round the way the game counts it (wages and contract countdown, then the league result and season end).
 var playRound=(t,score)=>{const L=t.league,fx=leagueFixture(L),m={id:'m'+L.season+'-'+fx.round,rng:777,score,league:{season:L.season,tier:L.tier,round:fx.round,oppId:fx.oppId}};
  payLeaguePayout(t,m);for(const p of t.players)settleContract26(t,p,m,0);return settleLeagueMatch(t,m);};
 var tryValidate=t=>{try{validateTeam(JSON.parse(JSON.stringify(t)));return 'ok';}catch(e){return e.message;}};
`;
// Real game code: game.js rules and match engine, the economy/fatigue/contract parts of extensions.js, league.js and
// growth.js up to their UI sections. Player ids are deterministic so two worlds with one seed are identical.
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
 vm.runInContext(league.slice(0,league.indexOf('// UI integration.')),ctx);
 vm.runInContext(growth.slice(0,G_UI),ctx);
 vm.runInContext(helpers,ctx);
 const run=code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
 return {run,ctx,exec:code=>vm.runInContext(code,ctx)};
}

test('decided numbers: per-event experience is v02p × 1.2, K=10, league ×1.0/1.2/1.4/1.6, youth bonus, cap 85, retirement table',()=>{
 const {run}=world();
 const G=run('GROWTH');
 assert.deepEqual(G.events,EXP_PRESETS.decided);
 assert.equal(G.K,10);assert.equal(G.matchCap,85);
 assert.deepEqual(G.league,[1,1.2,1.4,1.6]);
 assert.deepEqual(run('[19,21,22,25,26,29,30,40].map(growthYouthMultiplier)'),[1.5,1.5,1.3,1.3,1,1,1,1]);
 assert.deepEqual(run('[34,35,36,37,38,39,40,45].map(retirementWishChance)'),[0,.1,.2,.35,.5,.65,.8,.8]);
 // cost tier × K: 1~49 ×1 · 50~64 ×2 · 65~79 ×3 · 80~89 ×4 · 90~94 ×6 · 95~99 ×8
 assert.deepEqual(run('[1,49,50,64,65,79,80,89,90,94,95,99].map(growthNeed)'),[10,10,20,20,30,30,40,40,60,60,80,80]);
});

test('per-event experience equals the simulator formula for fielders, DH and pitchers',()=>{
 const {run}=world();
 const s={h:2,doubles:1,triples:0,hr:1,rbi:3,sf:1,bb:1,hbp:1,sb:1,r:2,bh:1,e:1,pk:4,pout:12};
 const tk={pa:5,noWhiffPA:3,catchOut:2,throwOut:1,cleanThrow:1,dpTurn:1,ofAssist:1,cs:1,pitched:1,outs:15,whiffInd:6,pCatch:1,pThrow:1,cover1B:1,cleanInn:2,escape:1};
 for(const pos of ['SS','CF','1B','C','DH','P']){
  for(const innings of [5,7]){
   const mine=run(`matchEventExp(${JSON.stringify(pos)},${JSON.stringify(s)},${JSON.stringify(tk)},{full:true,extra:${innings>5}})`);
   const theirs=eventExp(pos,s,{...tk,pitched:true},innings,EXP_PRESETS.decided);
   for(const k of TEN)close(mine[k],theirs[k],pos+' '+k);
  }
 }
 // a pitcher who only pitched gets the pitcher 출전 sense, not the batting part
 const p=run(`matchEventExp('P',${JSON.stringify(s)},{pitched:1,outs:3},{})`);
 close(p.contact,0,'pitcher contact');close(p.sense,.96,'pitcher sense');
 // a substitute who never started gets no 끝까지 stamina; extra innings only when on the field at the end
 const sub=run(`matchEventExp('LF',{},{},{full:false,extra:true})`);close(sub.stamina,.96,'sub stamina');close(sub.speed,.6,'range');
});

test('real engine games: the saved tracker matches tests/exp-events.cjs and the multipliers and level-ups are applied',()=>{
 const seen={},innings=new Set();
 for(let g=0;g<12;g++){
  const {run,ctx,exec}=world({seed:300+g});
  exec(`var T=club();T.league.tier=${g%4};T.players.forEach((p,i)=>{p.age=[19,23,27,31][i%4];});var before=T.players.map(p=>({...p.a}));var O=botTeam(${g%3});var M=startGame(T,O,${g%2},${9001+g*7919});`);
  const tracker=makeTracker();let n=0;
  while(!exec('M.done')&&n<4000){tracker.onEvent(null,exec('resolvePitch(M)'));n++;}
  assert.ok(exec('M.done'),'game ended');assert.deepEqual(run('M.checks.violations'),[]);
  const by=tracker.finish();
  for(const s of Object.values(run('growthTrackTotals(M.growth.track)')))for(const [k,v] of Object.entries(s))seen[k]=(seen[k]||0)+v;
  innings.add(run('M.inning'));
  const r=run(`(()=>{const plan=matchGrowthPlan(T,M);return {plan:plan.map(x=>({id:x.p.id,pos:x.pos,raw:x.raw,s:x.stats})),lineup:T.lineup,inning:M.inning,
   players:T.players.map((p,i)=>({id:p.id,age:p.age,a:p.a,before:before[i],exp:p.exp||{}})),gain:M.growth.gain,notes:M.growth.notes,done:M.growth.done,tier:M.growth.tier,history:T.history[0].growth};})()`);
  assert.equal(r.done,true);assert.equal(r.tier,g%4);
  assert.deepEqual(r.plan.map(x=>x.id).sort(),r.lineup.map(x=>x.id).sort(),'only the ten players who played');
  for(const row of r.plan){
   const theirs=eventExp(row.pos,row.s,by[row.id],r.inning,EXP_PRESETS.decided);
   for(const k of TEN)close(row.raw[k],theirs[k],'game '+g+' '+row.pos+' '+k);
   // gained = raw × league × youth, and consumed needs + what is left = gained (all start below the cap)
   const p=r.players.find(x=>x.id===row.id),mult=[1,1.2,1.4,1.6][g%4]*({19:1.5,23:1.3,27:1,31:1})[p.age];
   for(const k of TEN){
    const gained=row.raw[k]*mult;if(gained>0)assert.ok(Math.abs(r.gain[row.id][k]-gained)<.006,k);
    let used=0;for(let v=p.before[k];v<p.a[k];v++)used+=(v<50?1:v<65?2:v<80?3:v<90?4:6)*10;
    if(p.a[k]<85)assert.ok(Math.abs(used+(p.exp[k]||0)-gained)<1e-3,'game '+g+' '+k+' used '+used+' left '+p.exp[k]+' gained '+gained);
   }
  }
  // bench players and the notes
  for(const p of r.players.filter(x=>!r.plan.some(y=>y.id===x.id))){assert.deepEqual(p.a,p.before);assert.deepEqual(p.exp,{});}
  for(const x of r.notes){const p=r.players.find(y=>y.id===x.id);assert.equal(x.from,p.before[x.k]);assert.equal(x.to,p.a[x.k]);}
  assert.deepEqual(r.history,r.notes,'the history entry keeps the growth notes');
 }
 // these twelve games cover every counted event and both a 5-inning game and one past the 5th inning
 for(const k of ['pa','noWhiffPA','catchOut','throwOut','cleanThrow','dpTurn','ofAssist','cs','pCatch','pThrow','cover1B','whiffInd','outs','cleanInn','escape'])assert.ok(seen[k]>0,'event '+k+' covered');
 assert.ok(innings.has(5)&&[...innings].some(x=>x>5),'innings '+[...innings]);
});

test('substitutes: the slot decides the role, the replaced starter loses the full-game stamina, opponent relief is ignored',()=>{
 const {run,exec}=world({seed:808});
 exec(`var T=club();var O=botTeam(0);var M=startGame(T,O,0,13579);var DH=T.lineup.find(x=>x.pos==='DH'),OUT=DH.id,IN=T.players[10].id,PIN=T.players[11].id;`);
 let n=0;while(!exec('M.done')&&n<60){exec('resolvePitch(M)');n++;}
 // our pinch hitter takes the DH slot (as substitute() does); an opponent pitching change is in m.subs with side 1
 exec(`(()=>{DH.id=IN;M.used.push(IN);M.subs.push({out:'a',in:'b',outId:OUT,inId:IN,inning:M.inning,pos:'DH',pinch:true,firstPAEvent:null});ply(T,IN).stats.games++;
  M.subs.push({side:1,outId:O.lineup[9].id,inId:'opp-relief',pos:'P'});})()`);
 while(!exec('M.done')&&n<4000){exec('resolvePitch(M)');n++;}
 const r=run(`(()=>{const plan=matchGrowthPlan(T,M);const row=id=>plan.find(x=>x.p.id===id);return {ids:plan.map(x=>x.p.id),out:row(OUT),inn:row(IN),pin:row(PIN)||null,inning:M.inning,
  starter:row(T.lineup[0].id),gain:Object.keys(M.growth.gain),OUT,IN,PIN};})()`);
 assert.equal(r.ids.length,11,'ten starters and one substitute');assert.equal(r.pin,null,'a bench player who never played gets nothing');
 assert.equal(r.out.pos,'DH');assert.equal(r.inn.pos,'DH');
 const extra=r.inning>5?.96:0;
 close(r.out.raw.stamina,0,'replaced starter: no full game, not on the field at the end');
 close(r.inn.raw.stamina,extra,'substitute: no full game, extra innings only');
 close(r.starter.raw.stamina,.96+extra,'starter who finished');
 assert.ok(r.gain.includes(r.IN)&&r.gain.includes(r.OUT)&&!r.gain.includes(r.PIN));
});

test('league, youth and facility multipliers multiply the same raw experience',()=>{
 const {run}=world();
 const r=run(`(()=>{const out=[];
  for(const tier of [0,1,2,3])for(const age of [20,23,30]){
   const t=club(),p=t.players[0],dh=t.lineup.find(x=>x.pos==='DH');dh.id=p.id;t.lineup[0].id=t.players[11].id;p.age=age;
   const m={id:'x',inning:5,done:false,subs:[],league:{tier}};t.match=m;beginMatchGrowth(t,m);
   p.stats.pa++;p.stats.ab++;p.stats.h++;// one single
   trackGrowthEvent(m.growth.track,{id:'e1',attack:0,batter:p.id,type:'single',pa:true});
   const ex=JSON.parse(JSON.stringify(p.exp||{}));settleMatchGrowth(t,m);out.push({tier,age,contact:p.exp.contact,sense:p.exp.sense,before:ex});
  }
  const t=club(),p=t.players[0];t.lineup[9].id=p.id;t.lineup.forEach((x,i)=>{if(i<9&&x.id===p.id)x.id=t.players[11].id;});p.age=30;
  const m={id:'y',inning:5,done:false,subs:[]};t.match=m;beginMatchGrowth(t,m);p.stats.pk+=3;p.stats.pout+=3;
  for(let i=0;i<3;i++)trackGrowthEvent(m.growth.track,{id:'k'+i,attack:1,inning:1,half:0,pitcher:p.id,type:'ks',pa:true,ab:true,outsAdded:1,before:{bases:[null,null,null]},runs:[]});
  GROWTH_EXP_MULTIPLIERS.push((t,p,k)=>k==='velocity'?1.1:1);settleMatchGrowth(t,m);GROWTH_EXP_MULTIPLIERS.pop();
  return {out,velocity:p.exp.velocity,control:p.exp.control,sense:p.exp.sense};})()`);
 for(const x of r.out){
  const mult=[1,1.2,1.4,1.6][x.tier]*(x.age<=21?1.5:x.age<=25?1.3:1);
  assert.deepEqual(x.before,{});
  close(x.contact,Math.round((1.92+.48)*mult*1e4)/1e4,'contact tier '+x.tier+' age '+x.age);
  close(x.sense,Math.round(.96*mult*1e4)/1e4,'sense');
 }
 // pitcher: three strikeouts (velocity .96 each, ×1.1 from the facility hook), three outs + a clean inning for control, 출전 sense
 close(r.velocity,Math.round(3*.96*1.1*1e4)/1e4,'velocity with facility hook');close(r.control,Math.round((3*.24+.24)*1e4)/1e4,'control');close(r.sense,.96,'pitcher sense');
});

test('level-up: cost tier × K, several steps at once, the match-growth cap 85 (stamina too) and trained abilities above the cap',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club(),p=t.players[0];
  p.a.contact=49;p.a.power=84;p.a.stamina=85;p.a.eye=90;p.a.speed=64;p.energy=Math.min(p.energy,p.a.stamina);
  const ups=addMatchExp(t,p,{contact:35,power:1000,stamina:50,eye:500,speed:19.5});
  return {a:{contact:p.a.contact,power:p.a.power,stamina:p.a.stamina,eye:p.a.eye,speed:p.a.speed},exp:p.exp,ups};})()`);
 assert.deepEqual(r.a,{contact:51,power:85,stamina:85,eye:90,speed:64});
 // 49→50 costs 10, 50→51 costs 20: 35 − 30 = 5 left
 close(r.exp.contact,5,'contact left');
 assert.equal(r.exp.power,0,'experience past the cap is dropped');assert.equal(r.exp.stamina,0);assert.equal(r.exp.eye,0);
 close(r.exp.speed,19.5,'64→65 needs 20');
 assert.deepEqual(r.ups,[{k:'contact',from:49,to:51},{k:'power',from:84,to:85}]);
});

test('entry age: 19~26, three distinct abilities +(age−19) capped at 100, the simulator draws; recruits and the first roster',()=>{
 const {run}=world();
 // same draws as entryP21 in tests/run-economy-sim.cjs
 const vals=seeded(5);
 for(let i=0;i<300;i++){
  const a=Object.fromEntries(TEN.map(k=>[k,1+Math.floor(vals()*100)]));
  const mine=run(`(()=>{const rnd=(${seeded.toString()})(${1000+i});const p={a:${JSON.stringify(a)},stats:{}};const raised=enterPlayerAge(p,rnd);return {age:p.age,a:p.a,raised,energy:p.energy};})()`);
  const q={a:{...a}};entryP21(q,seeded(1000+i));
  assert.equal(mine.age,q.age);assert.deepEqual(mine.a,q.a);
  assert.ok(mine.age>=19&&mine.age<=26);
  const changed=TEN.filter(k=>mine.a[k]!==a[k]);assert.ok(changed.length<=3);
  for(const k of changed)assert.equal(mine.a[k],Math.min(100,a[k]+mine.age-19));
  assert.equal(mine.energy,mine.a.stamina);
 }
 const ages=run(`(()=>{const seen=new Set();for(let i=0;i<400;i++){const p={a:{contact:99,power:99,eye:99,speed:99,sense:99,catch:99,throw:99,velocity:99,control:99,stamina:99},stats:{}};enterPlayerAge(p);seen.add(p.age);if(Object.values(p.a).some(v=>v>100))return 'over';if(p.age>19&&Object.values(p.a).filter(v=>v===100).length!==3)return 'not three';}return [...seen].sort((a,b)=>a-b);})()`);
 assert.deepEqual(ages,[19,20,21,22,23,24,25,26]);
 assert.deepEqual(run(`(()=>{const p={a:{contact:50,power:50,eye:50,speed:50,sense:50,catch:50,throw:50,velocity:50,control:50,stamina:50},stats:{}};const r=enterPlayerAge(p,Math.random,19);return [p.age,r,Object.values(p.a).every(v=>v===50)];})()`),[19,{},true]);
 // recruit candidates: entry age, and price/wage from the raised abilities with the existing formula
 const market=run(`(()=>{const t=club();t.league.tier=1;return createMarketCandidates(t).map(p=>({age:p.age,ok:p.price===Math.round(abilityPrice(p)*balance(t).hireFactor)&&p.salary===Math.max(3,Math.round(abilityPrice(p)*balance(t).salaryFactor))&&p.energy===p.a.stamina}));})()`);
 assert.equal(market.length,3);for(const p of market){assert.ok(p.age>=19&&p.age<=26);assert.equal(p.ok,true);}
 // the first twelve players of a new club (deferred roster → ensureInitialRoster)
 const first=run(`(()=>{const t=newTeam('새 구단',11,5,true);data.slots=[t,null];data.current=0;ensureClub(t);ensureInitialRoster(t);
  return {n:t.players.length,ages:t.players.map(p=>p.age),pay:t.players.every(p=>p.salary===Math.max(3,Math.round(abilityPrice(p)*balance(t).salaryFactor))&&p.wage26.ask===Math.min(10000,Math.max(3,Math.round(abilityPrice(p)*balance(t).salaryFactor*(1+(50-p.loyalty)/200))))),valid:tryValidate(t)};})()`);
 assert.equal(first.n,12);assert.ok(first.ages.every(a=>a>=19&&a<=26));assert.ok(new Set(first.ages).size>1,'ages differ');assert.equal(first.pay,true);assert.equal(first.valid,'ok');
});

test('aging: +1 then 30~35 three −2, 36~40 five −3, 41+ all ten −5, floor 1, same draws as ageP21, energy follows stamina',()=>{
 const {run}=world();
 const vals=seeded(99);
 for(let age=18;age<=48;age++)for(let rep=0;rep<4;rep++){
  const a=Object.fromEntries(TEN.map(k=>[k,1+Math.floor(vals()*100)])),seed=age*100+rep;
  const mine=run(`(()=>{const rnd=(${seeded.toString()})(${seed});const p={age:${age},a:${JSON.stringify(a)},energy:${a.stamina},stats:{}};const r=agePlayerSeason(p,rnd);return {p,r};})()`);
  const q={age,a:{...a}};ageP21(q,seeded(seed));
  assert.equal(mine.p.age,age+1);assert.deepEqual(mine.p.a,q.a);
  const band=age+1>=41?[10,5]:age+1>=36?[5,3]:age+1>=30?[3,2]:[0,0];
  assert.equal(mine.r.planned,band[0]*band[1]);
  for(const k of TEN){assert.ok(mine.p.a[k]>=1);if(mine.r.drop[k])assert.equal(mine.p.a[k],Math.max(1,a[k]-band[1]));}
  assert.ok(Object.keys(mine.r.drop).length<=band[0]);
  assert.ok(mine.p.energy<=mine.p.a.stamina,'energy ≤ stamina');
 }
 // floor and stamina/energy sync
 const low=run(`(()=>{const p={age:44,a:{contact:3,power:3,eye:3,speed:3,sense:3,catch:3,throw:3,velocity:3,control:3,stamina:40},energy:40,stats:{}};agePlayerSeason(p,()=>.5);return p;})()`);
 assert.ok(Object.entries(low.a).every(([k,v])=>v===(k==='stamina'?35:1)));assert.equal(low.energy,35);
});

test('season end in the league flow: everyone ages once after promotion, declines are saved, a retry does not age twice',()=>{
 const {run}=world();
 assert.deepEqual(run('LEAGUE_SEASON_END_STEPS.map(s=>s.id)'),['rank','prize','promotion','aging','offseason']);
 const r=run(`(()=>{const t=club(),ages=[19,24,29,30,34,35,36,40,41,26,22,33];t.players.forEach((p,i)=>{p.age=ages[i];});
  const before=t.players.map(p=>({id:p.id,a:{...p.a}}));Math.random=(()=>{let s=7;return ()=>{s=(s*16807)%2147483647;return .2+.8*(s/2147483647);};})();// never below 0.2: 35~36세 never wish
  for(let i=0;i<10;i++)playRound(t,[3,1]);
  const after=t.players.map(p=>({id:p.id,age:p.age,a:{...p.a},energy:p.energy}));
  const snapshot=JSON.stringify(t.players.map(p=>[p.age,p.a]));const again=agingSeasonEndStep(t,{season:1,tier:0});
  return {before,after,again,same:snapshot===JSON.stringify(t.players.map(p=>[p.age,p.a])),aging:t.aging,phase:t.league.phase,departed:t.departed.filter(p=>p.departureKind==='retired').map(p=>p.retired.age),news:t.news.map(x=>x.title),valid:tryValidate(t)};})()`);
 assert.equal(r.phase,'offseason');assert.equal(r.again,null);assert.equal(r.same,true,'no second aging for season 1');
 assert.equal(r.aging.season,1);assert.equal(r.aging.log.length,1);const entry=r.aging.log[0];
 assert.equal(entry.season,1);assert.equal(entry.aged,12);
 const startAges=[19,24,29,30,34,35,36,40,41,26,22,33];
 for(const p of r.after){
  const i=r.before.findIndex(x=>x.id===p.id),age=startAges[i]+1,band=age>=41?[10,5]:age>=36?[5,3]:age>=30?[3,2]:[0,0];
  assert.equal(p.age,age);
  const changed=Object.keys(p.a).filter(k=>p.a[k]!==r.before[i].a[k]);
  assert.ok(changed.length<=band[0],'age '+age+' changed '+changed.length);
  for(const k of changed)assert.equal(p.a[k],Math.max(1,r.before[i].a[k]-band[1]));
  assert.ok(p.energy<=p.a.stamina);
  if(band[0])assert.ok(entry.rows.some(x=>x.id===p.id&&x.age===age));
 }
 // 41+ retire wish 80% → with draws ≥ .2 the 37~42세 band can still wish; whoever retired is recorded with a reason
 for(const x of entry.retired){assert.equal(x.reason,'wish');assert.ok(x.age>=35);}
 assert.equal(r.departed.length,entry.retired.length);
 assert.ok(r.news.some(x=>/선수 나이 \+1/.test(x)));assert.equal(r.valid,'ok');
});

test('retirement: wishes at season end and the manager order in the offseason keep records and repair the roster',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club(),ages=[38,40,36,35,30,29,25,22,21,20,19,33];t.players.forEach((p,i)=>{p.age=ages[i];p.stats.games=10+i;});
  const starters=t.lineup.map(x=>x.id);
  // in season the order is refused
  const inSeason=orderRetirement(t,t.players[6].id);
  Math.random=()=>0;// every player aged 35+ (after +1) wishes to retire
  for(let i=0;i<10;i++)playRound(t,[0,1]);
  const retired=t.departed.filter(p=>p.departureKind==='retired').map(p=>({name:p.name,age:p.retired.age,reason:p.retired.reason,season:p.retired.season,games:p.retired.games}));
  const left=t.players.length,lineupFull=t.lineup.every(x=>x.id),vacancy=!!t.rosterVacancy26,valid1=tryValidate(t),block1=leagueNextSeasonBlock(t);
  // the manager orders one more retirement in the offseason
  const target=t.players.find(p=>p.age===31);const order=orderRetirement(t,target.id),again=orderRetirement(t,target.id);
  const log=t.aging.log.at(-1);
  for(const p of t.players)negotiate(p,salaryAsk(p),()=>.99);
  const block2=leagueNextSeasonBlock(t);
  return {inSeason,retired,left,lineupFull,vacancy,valid1,block1,order,again,left2:t.players.length,lineupIds:t.lineup.map(x=>x.id),players:t.players.map(p=>p.id),
   logRetired:log.retired,valid2:tryValidate(t),block2,records:t.departed.filter(p=>p.departureKind==='retired').map(p=>p.stats.games),ply:!!ply(t,target.id)};})()`);
 assert.match(r.inSeason,/오프시즌/);
 // ages after +1: 39 41 37 36 → wish (all ≥35); 31 30 26 23 22 21 20 34 stay
 assert.deepEqual(r.retired.map(x=>x.age).sort(),[36,37,39,41]);
 assert.ok(r.retired.every(x=>x.reason==='wish'&&x.season===1));
 assert.equal(r.left,8);assert.equal(r.vacancy,true,'8 players leave empty lineup slots (vacancy)');assert.equal(r.valid1,'ok');
 assert.match(r.block1,/재계약/);
 assert.equal(r.order,'');assert.match(r.again,/떠난/);assert.equal(r.left2,7);
 assert.ok(r.lineupIds.filter(Boolean).every(id=>r.players.includes(id)),'lineup only holds current players');
 assert.deepEqual(r.logRetired.map(x=>x.reason).sort(),['order','wish','wish','wish','wish']);
 assert.equal(r.valid2,'ok');assert.match(r.block2,/10명/);
 assert.equal(r.records.length,5);assert.ok(r.records.every(g=>g>=10),'personal records are kept');assert.equal(r.ply,true);
});

test('old saves: validation passes first, then ages are 19 + floor(games ÷ 10), once, without aging an ended season again',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=newTeam('예전 구단',4,3);delete t.league;t.w=40;t.l=30;t.d=3;
  const games=[0,9,10,47,123,5,5,5,5,5,5,5];t.players.forEach((p,i)=>{p.stats.games=games[i];delete p.age;delete p.exp;});delete t.aging;
  t.market=[player(false,[])];delete t.market[0].age;
  const raw=JSON.parse(JSON.stringify(t));const validated=tryValidate(raw);
  data.slots=[raw,null];data.current=0;ensureClub(raw);const first=raw.players.map(p=>p.age),news=raw.news.filter(x=>x.title==='선수 나이 추정').length;
  ensureClub(raw);const second=raw.players.map(p=>p.age),news2=raw.news.filter(x=>x.title==='선수 나이 추정').length;
  // a save made in an offseason after step ①: that ended season is already in the estimate
  const off=newTeam('오프시즌 구단',4,3);off.w=10;data.slots=[off,null];ensureClub(off);delete off.aging;off.players.forEach(p=>delete p.age);off.league.phase='offseason';off.league.season=3;ensureClub(off);
  return {validated,first,second,news,news2,season:raw.aging.season,market:raw.market[0].age,offSeason:off.aging.season,valid:tryValidate(raw)};})()`);
 assert.equal(r.validated,'ok');
 assert.deepEqual(r.first,[19,19,20,23,31,19,19,19,19,19,19,19]);assert.deepEqual(r.second,r.first);
 assert.equal(r.news,1);assert.equal(r.news2,1);assert.equal(r.season,0);assert.equal(r.market,19);
 assert.equal(r.offSeason,3);assert.equal(r.valid,'ok');
});

test('validation: missing growth data is fine, malformed growth data is rejected',()=>{
 const {run}=world();
 const check=mutate=>run(`(()=>{const t=club();t.players[0].exp={contact:3.5};const m={id:'v',inning:1,done:false,subs:[]};
  const c=JSON.parse(JSON.stringify(t));${mutate};try{validateTeam(c);return 'ok';}catch(e){return e.message;}})()`);
 assert.equal(check(''),'ok');
 assert.equal(check('c.players.forEach(p=>{delete p.age;delete p.exp;});delete c.aging'),'ok');
 assert.equal(check("c.aging.log=[{season:1,tier:0,aged:12,rows:[{id:'a',name:'x',age:31,drop:{contact:2}}],retired:[{id:'b',name:'y',age:37,reason:'wish'}]}];c.aging.season=1"),'ok');
 assert.equal(check("c.departed=[{...c.players[0],departureKind:'retired',retired:{reason:'order',season:2,age:36}}]"),'ok');
 for(const bad of ["c.players[0].age='20'","c.players[0].age=20.5","c.players[0].age=3","c.players[0].exp={contact:-1}","c.players[0].exp={luck:2}","c.players[0].exp=[1]",
  "c.aging={season:-1,log:[]}","c.aging={season:0,log:{}}","c.aging.log=[{season:1,rows:[{id:'a',age:31,drop:{contact:-2}}],retired:[]}]",
  "c.aging.log=[{season:1,rows:[],retired:[{id:'a',reason:'bored'}]}]","c.departed=[{...c.players[0],departureKind:'retired',retired:{reason:'x',season:1}}]",
  "c.market=[{...c.players[0],age:'old'}]"])
  assert.match(check(bad),/성장·나이 자료 오류/,bad);
 // the saved match snapshot
 const match=mutate=>run(`(()=>{const t=club(),o=botTeam(0);const m=startGame(t,o,0,77);for(let i=0;i<30;i++)resolvePitch(m);const c=JSON.parse(JSON.stringify(t));${mutate};try{validateTeam(c);return 'ok';}catch(e){return e.message;}})()`);
 assert.equal(match(''),'ok');assert.equal(match('delete c.match.growth'),'ok');
 for(const bad of ['c.match.growth.v=2','c.match.growth.base[c.players[0].id].h=-1','c.match.growth.start=[{id:1}]',"c.match.growth.track.halves=[{k:'1:0',o:-1,r:0,w:0,rn:false,p:null}]",
  "c.match.growth.track.by={x:{pa:'2'}}","c.match.growth.notes=[{id:'x',k:'contact',from:40,to:40}]","c.match.growth.done='no'"])
  assert.match(match(bad),/성장·나이 자료 오류/,bad);
});

test('the match-start snapshot survives a reload in the middle of a game: same experience as an uninterrupted game',()=>{
 const play=reloadAt=>{
  const {run,exec}=world({seed:4321});
  exec(`var T=club();T.players.forEach((p,i)=>{p.age=19+i;});T.league.tier=2;var O=botTeam(1);var M=startGame(T,O,1,24680);`);
  let n=0,valid=null;
  while(!exec('M.done')&&n<4000){
   if(n===reloadAt){valid=run('tryValidate(T)');exec(`(()=>{const saved=JSON.parse(JSON.stringify(data));data.slots=saved.slots;T=team();M=T.match;O=M.opp;})()`);}
   exec('resolvePitch(M)');n++;
  }
  return {valid,n,r:run(`({a:T.players.map(p=>p.a),exp:T.players.map(p=>p.exp||null),notes:M.growth.notes,gain:M.growth.gain,stats:T.players.map(p=>p.stats),score:M.score,
   box:Object.keys(M.recap.box).length,extra:T.players.reduce((s,p)=>s+p.stats.doubles+p.stats.bb+p.stats.sb+p.stats.e,0)})`)};
 };
 const straight=play(-1),reloaded=play(30),late=play(80);
 assert.equal(reloaded.valid,'ok');assert.equal(late.valid,'ok');
 assert.ok(straight.n>80,'the game is longer than the reload points');
 assert.deepEqual(reloaded.r,straight.r);assert.deepEqual(late.r,straight.r);
 assert.ok(Object.keys(straight.r.gain).length===10,'ten players gained experience');
 // a game already in progress when the update arrived (no snapshot) gives no experience and still ends normally
 const {run,exec}=world({seed:4321});
 exec(`var T=club();var O=botTeam(1);var M=startGame(T,O,1,24680);delete M.growth;`);
 let n=0;while(!exec('M.done')&&n<4000){exec('resolvePitch(M)');n++;}
 assert.deepEqual(run('[M.rewarded,T.players.every(p=>p.exp===undefined),T.history.length,T.history[0].growth===undefined]'),[true,true,1,true]);
});

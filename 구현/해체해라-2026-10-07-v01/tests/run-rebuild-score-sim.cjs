// Current game-rule research, isolated from user saves/UI. No live game is changed.
// node tests/run-rebuild-score-sim.cjs [careers per policy=8] [seasons=50] [output.json]
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),crypto=require('node:crypto');
const {quota,points,recommended,candidates,search}=require('./rebuild-score-model.cjs');
function loadWorld(){
 const filename=path.join(__dirname,'facilities.test.cjs'),src=fs.readFileSync(filename,'utf8');
 const marker=src.indexOf("\ntest('next-game forecasts");if(marker<0)throw Error('Current game fixture marker changed');
 const mod=new Module(filename,module);mod.filename=filename;mod.paths=module.paths;
 mod._compile(src.slice(0,marker)+'\nmodule.exports={world};',filename);return mod.exports.world;
}
const world=loadWorld();
const DRIVER=String.raw`
var trial,policy,trace=[],rebuildTrace=[],roundCount=0;
var successful=()=>mlbSuccessRecords(team()).length;
function settlePending(){
 for(let g=0;g<20;g++){
  const t=team(),reward=pendingMlbReward(t);
  if(reward){chooseMlbReward(t,reward.id,policy==='youth'?'ability':'loyalty');continue;}
  if(t.mlbSupport?.pending){resolveRevival(t,true);continue;}return;
 }
 throw Error('Pending decision loop');
}
function snapshotTrial(){const t=team();return {...trial,mlb:successful()-trial.mlbStart,wins:t.w-trial.winsStart,eligible:t.players.filter(p=>p.loyalty>=70).length,roster:t.players.length};}
leagueAddStep(LEAGUE_SEASON_END_STEPS,{id:'trial-performance',run(t,ctx){trial.peak=Math.max(trial.peak,ctx.tier);if(ctx.tier===3&&ctx.rank===1)trial.titles++;}},{after:'rank'});
rebuildKeepers=function(players){
 const s=snapshotTrial();trial.preRebuild=s;trial.lastScore=scoreOf(s);trial.lastQuota=trialMode==='current'?3:quotaOf(trial.lastScore);
 return players.filter(p=>p.loyalty>=70).sort((a,b)=>b.loyalty-a.loyalty||leagueMean(b)-leagueMean(a)).slice(0,trial.lastQuota);
};
OPINION_REBUILD_HOOKS.push((t,r)=>{
 const s=trial.preRebuild;let young=0;if(trialMode==='recommended')for(const p of t.players.filter(p=>r.kept.some(k=>k.id===p.id)))if(!p.rejuvenatedTrial){p.age=19;p.rejuvenatedTrial=true;young++;}
 rebuildTrace.push({...s,score:trial.lastScore,quota:trial.lastQuota,kept:r.kept.length,rejuvenated:young,funds:t.funds,wages:t.players.reduce((n,p)=>n+p.salary,0)});
 trial={peak:0,titles:0,winsStart:t.w,mlbStart:successful(),startSeason:t.league.season+1};
});
function reserve(t){return operatingBudget(t).total*(policy==='thrifty'?4:policy==='aggressive'?1:2);}
function selectLineup(t){t.lineup=GameAutoLineup.choose(t.players,(p,k)=>p.a[k]);delete t.battingDraft;}
function hire(t,target){
 if(t.marketRound!==t.w+t.l+t.d){t.market=createMarketCandidates(t);t.marketRound=t.w+t.l+t.d;}
 for(let n=0;n<3&&t.players.length<target;n++){
  const cand=t.market.filter(p=>p.price<=t.funds-(t.players.length<10?0:reserve(t))).sort((a,b)=>t.players.length<10?a.price-b.price:(leagueMean(b)+28-b.age)-(leagueMean(a)+28-a.age))[0];
  if(!cand)break;if(!spend(t,cand.price,'시뮬 영입'))throw Error('Hire spending failed');
  cand.contract=leagueContractGames(t);t.players.push(cand);t.market=t.market.filter(p=>p.id!==cand.id);selectLineup(t);
 }
}
function manage(){
 const t=team();settlePending();
 for(const p of t.players.slice())if(p.contract===0&&t.league.phase==='offseason')negotiate(p,salaryAsk(p));
 // Match the page playtest's paid training rule, spending actual game costs.
 const prospect=t.facilityData?.academy?.prospect;if(prospect&&t.players.length<14&&!academyHireBlock(t))hireAcademyProspect(t);
 hire(t,12);selectLineup(t);
 if(t.players.length<10){takeEmergencyLoan(t);hire(t,10);}
 const plan=policy==='thrifty'?['bat','pitch','locker']:policy==='youth'?['academy','bat','pitch','field','food','conditioning','locker']:['bat','pitch','field','conditioning','bus','uniform','locker','billboard','food'];
 for(const id of plan){if(facilityHas(t,id))continue;const def=facilityDef(id);if(t.funds-facilityPrice(def)>=reserve(t)&&t.facilities.length<facilitySlots(t))buildFacility(t,id);else break;}
 if(t.league.phase==='offseason'){
  if((t.league.pendingPromotion||t.facilities.length>=facilitySlots(t))&&t.stadium<3&&t.funds-stadiumUpgradeCost(t)>=reserve(t))expandStadium(t);
 }
 // Current crowd estimate; tune only at management time (same as earlier best-price policy).
 let best=0,price=t.ticket;for(let p=1;p<=50;p++){t.ticket=p;const inc=attendance(t)*(p*(1+busShare(t))+(facilityHas(t,'restaurant')?1:0));if(inc>best){best=inc;price=p;}}t.ticket=price;
 for(let n=0;n<(t.league.phase==='offseason'?40:6);n++){
  let best=null;
  for(const slot of t.lineup){const p=ply(t,slot.id);if(!p||p.age>32)continue;const keys=slot.pos==='P'?['velocity','control','stamina']:['contact','power','eye','catch','throw'];
   for(const k of keys){if(!facilityTrainLevel(t,k)||p.a[k]>=100)continue;const cost=costGrowth(p,k);if(cost&&(!best||p.a[k]<best.p.a[best.k]))best={p,k,cost};}}
  if(!best||t.funds-best.cost<reserve(t))break;spend(t,best.cost,'시뮬 훈련');best.p.a[best.k]++;if(best.k==='stamina')best.p.energy=best.p.a.stamina;
 }
 if(policy!=='star')for(let n=0;n<6;n++){
  const cand=t.players.map(p=>mlbQuote(t,p.id)).filter(q=>q?.eligible).sort((a,b)=>b.score-a.score)[0];if(!cand)break;
  const r=completeMlbAttempt(t,cand);if(!r.ok)throw Error(r.message);settlePending();hire(t,12);selectLineup(t);
 }
 selectLineup(t);
}
function oneSeason(){
 const t=team();if(t.league.phase==='offseason'){manage();settlePending();const err=startNextSeason(t);if(err)throw Error(err);}
 const season=t.league.season;
 for(let g=0;g<10&&t.league.phase==='season';g++){
  manage();settlePending();
  if(t.players.length<10){const e=forfeitRemainingGames(t);if(typeof e==='string'&&e)throw Error(e);settlePending();break;}
  const fx=leagueFixture(t.league),rec=leagueTeam(t.league,fx.oppId),opp=newTeam(rec.name,8,4,true);
  opp.players=clone(rec.players).map(p=>Object.assign(p,{stats:freshStats(),energy:p.a.stamina}));opp.lineup=dhLineup(opp.players);opp.setupStage='complete';
  const m=startGame(t,opp,fx.usHome?0:1,randomInt(1,2147483646));
  m.league={season:t.league.season,tier:t.league.tier,round:fx.round,oppId:fx.oppId};
  for(let p=0;p<4000&&!m.done;p++){const e=resolvePitch(m);m.events=m.events.slice(-50);}
  if(!m.done)throw Error('Pitch limit');reward(m);roundCount++;settlePending();
 }
 const last=t.league.history.find(x=>x.season===season);trace.push({season,tier:last?.tier,rank:last?.rank,move:last?.move,...snapshotTrial(),cash:t.funds,debt:t.debt,disbands:t.opinion.disbands,mlbTotal:successful()});
 // Keep simulation memory bounded, preserving MLB and current players used by actual rules.
 t.ledger=t.ledger.slice(-30);t.news=t.news.slice(-30);t.history=t.history.slice(0,2);t.match=null;
}
function initTrial(p){policy=p;var t=newTeam('시뮬레이션',11,5);data.slots=[t,null];data.current=0;ensureClub(t);selectLineup(t);t.setupStage='complete';trial={peak:0,titles:0,winsStart:0,mlbStart:successful(),startSeason:1};return {funds:t.funds,players:t.players.length};}
`;
function createTrialWorld(seed,mode='recommended'){
 const w=world({seed});
 const events=fs.readFileSync(path.join(__dirname,'../src/club-events.js'),'utf8');
 w.exec(events.slice(events.indexOf('function clubEventCast'),events.indexOf('function clubEventActorPortrait')));
 w.exec(`var trialMode=${JSON.stringify(mode)};var pointsRaw=${points.toString()};var quotaRaw=${quota.toString()};var quotaModel=${JSON.stringify(recommended)};var scoreOf=s=>pointsRaw(s,quotaModel);var quotaOf=s=>quotaRaw(s,quotaModel);`);
 w.exec(DRIVER);return w;
}
function runCareer(seed,policy,seasons,mode='recommended'){
 const w=createTrialWorld(seed,mode);const start=w.run(`initTrial(${JSON.stringify(policy)})`);
 for(let s=0;s<seasons;s++)w.exec('oneSeason()');
 return {seed,policy,mode,start,...w.run('({trace,rebuildTrace,roundCount})')};
}
function main(){
 const n=Number(process.argv[2]||8),seasons=Number(process.argv[3]||50),out=process.argv[4],mode=process.argv[5]||'recommended';
 const files=['game.js','extensions.js','auto-lineup.js','club-events.js','mlb.js','league.js','growth.js','opinion.js','mlb-support.js','facilities.js'];
 const hashes=Object.fromEntries(files.map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../src',name))).digest('hex')]));
 const report={version:'20261113-v03-flat-cost',source:'current game rules; deterministic AI policy, no UI or user saves',hashes,rules:recommended,candidates,search:search(),mode,n,seasons,careers:[],started:new Date().toISOString()};
 for(const policy of ['thrifty','normal','youth'])for(let i=0;i<n;i++){
  const run=runCareer(20261113+i*1009,policy,seasons,mode);report.careers.push(run);console.log(JSON.stringify({mode,policy,i,games:run.roundCount,rebuilds:run.rebuildTrace.length,mlb:run.trace.at(-1).mlbTotal,peak:Math.max(...run.trace.map(s=>s.tier||0))}));
 }
 report.finished=new Date().toISOString();if(out)fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');return report;
}
if(require.main===module)main();module.exports={runCareer,createTrialWorld,main};

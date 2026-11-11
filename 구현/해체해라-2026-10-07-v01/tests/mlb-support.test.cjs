// MLB departure reward, revival tickets and support from former MLB players (build step ④): the three rewards (youngest and
// ability ties, caps), one reward per departure and reload safety, tickets at 1 · 5 · 10 departures (not retroactive), the pending
// season-end decisions for a disband and a relegation (use a ticket or proceed, two tickets, prize and promotion as in ③),
// tickets surviving a rebuild, support requests (tiers, refusal, memory −10, once per season, opinion −5), regular support,
// old saves and validation.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8');
const game=read('game.js'),ext=read('extensions.js'),league=read('league.js'),growth=read('growth.js'),opinion=read('opinion.js'),events=read('club-events.js'),auto=read('auto-lineup.js');
const mlb=read('mlb.js'),support=read('mlb-support.js');
const S_HOOKS=support.indexOf('// Game hooks.'),S_UI=support.indexOf('// UI integration.');
assert.ok(S_HOOKS>0&&S_UI>S_HOOKS&&support.indexOf('// Game hooks.',S_HOOKS+1)<0&&support.indexOf('// UI integration.',S_UI+1)<0,'mlb-support.js markers');
const line=(src,re)=>{const m=src.match(re);assert.ok(m,'missing source line '+re);return m[0];};
function seeded(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}

const helpers=`
 var club=(name='우리')=>{const t=newTeam(name,11,5);data.slots=[t,null];data.current=0;ensureClub(t);t.players.forEach(p=>{p.age=20;});return t;};
 var forceRank=null;(()=>{const step=LEAGUE_SEASON_END_STEPS.find(s=>s.id==='rank'),real=step.run;step.run=(t,ctx)=>{real(t,ctx);if(forceRank)ctx.rank=forceRank;};})();
 var endSeason=(t,rank,value=null)=>{if(value!==null)t.opinion.value=value;forceRank=rank;t.league.round=LEAGUE.seasonGames;try{return runSeasonEnd(t);}finally{forceRank=null;}};
 var tryValidate=t=>{try{validateTeam(JSON.parse(JSON.stringify(t)));return 'ok';}catch(e){return e.message;}};
 var seq=(...v)=>{let i=0;return ()=>v[Math.min(i++,v.length-1)];};
 var mlbN=0;
 // A real MLB departure through mlb.js: a strong new player (main three 90 → fee 11,000) is added, then succeeds (roll 0).
 var send=(t,loyalty=60,o={})=>{
  const p=enrich(player(true,t.players.map(x=>x.number)));p.name='빅리거'+(++mlbN);p.age=o.age??24;p.contract=10;p.loyalty=loyalty;p.stats.games=10;
  for(const k of ['contact','power','eye'])p.a[k]=90;for(const k of ['velocity','control'])p.a[k]=Math.min(p.a[k],70);p.a.stamina=Math.min(p.a.stamina,60);if(o.a)Object.assign(p.a,o.a);p.energy=p.a.stamina;
  t.players.push(p);const r=completeMlbAttempt(t,mlbQuote(t,p.id),o.rnd||(()=>0));if(!r.ok)throw Error(r.message);
  if(o.choose)chooseMlbReward(t,r.result.id,o.choose,()=>0);return r.result;};
 var tickets=t=>t.mlbSupport.tickets;
 var setTickets=(t,n)=>{t.mlbSupport.tickets=n;t.mlbSupport.earned=MLB_TICKET_MILESTONES.slice(0,n).map(m=>({count:m.count,season:1,at:0}));};
 (()=>{const before=validateTeam;validateTeam=function(t){before(t);validateMlbState(t);};})();
`;
// Real game code like tests/opinion.test.cjs, plus mlb.js and mlb-support.js up to their UI sections (in the game's load order).
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
 vm.runInContext(mlb.split('// UI integration.')[0],ctx);
 vm.runInContext(league.slice(0,league.indexOf('// UI integration.')),ctx);
 vm.runInContext(growth.slice(0,growth.indexOf('// UI integration.')),ctx);
 vm.runInContext(opinion.slice(0,opinion.indexOf('// UI integration.')),ctx);
 vm.runInContext(support.slice(0,S_UI),ctx);
 vm.runInContext(helpers,ctx);
 const run=code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
 return {run,exec:code=>vm.runInContext(code,ctx)};
}

test('numbers, the season-end order and a new club',()=>{
 const {run}=world();
 const S=run('MLB_SUPPORT');
 assert.deepEqual([S.rewardOpinion,S.rewardLoyalty,S.rewardPlayers,S.rewardAbility],[-15,20,5,15]);
 assert.deepEqual(S.tiers,[[90,.4],[70,.3],[50,.2],[30,.1]]);
 assert.deepEqual([S.memoryDrop,S.requestOpinion,S.regularLoyalty,S.regularShare,S.troubleOpinion,S.ticketOpinion],[10,-5,90,.05,90,70]);
 assert.deepEqual(run('MLB_TICKET_MILESTONES.map(m=>m.count)'),[1,5,10]);
 assert.deepEqual(run('LEAGUE_SEASON_END_STEPS.map(s=>s.id)'),['rank','prize','opinion','revival-disband','disband','revival-relegation','promotion','aging','rebuild','offseason','opinion-record','revival-record']);
 assert.deepEqual(run('(()=>{const t=club();return [t.mlbSupport,tryValidate(t)];})()'),[{v:1,tickets:0,base:0,earned:[],used:[],pending:null,regular:false},'ok']);
});

test('reward: opinion −15%p, once per departure, only the players on the roster at the departure are eligible',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club(),ids=t.players.map(p=>p.id);const h=send(t,60);const R=JSON.parse(JSON.stringify(h.reward));
  const blocked=mlbQuote(t,t.players[0].id).reasons.at(-1),pending=pendingMlbReward(t).id===h.id;
  const first=chooseMlbReward(t,h.id,'opinion'),again=chooseMlbReward(t,h.id,'loyalty');
  t.opinion.value=10;const h2=send(t,60);const low=chooseMlbReward(t,h2.id,'opinion');
  return {R,ids,departed:h.player.id,first,again,v:t.opinion.value,low:low.result,status:h.reward.status,choice:h.reward.choice,pending,blocked,after:pendingMlbReward(t),news:t.news.map(x=>x.title),log:t.opinion.log.filter(e=>e.kind==='mlb').length,valid:tryValidate(t)};})()`);
 assert.equal(r.R.status,'pending');assert.deepEqual(r.R.eligible,r.ids,'the twelve who stayed (the departed player was added and left)');
 assert.ok(!r.R.eligible.includes(r.departed));assert.equal(r.R.loyalty.length,5);assert.ok(r.R.youngest);assert.ok(r.R.key);
 assert.equal(r.pending,true);assert.match(r.blocked,/보상을 먼저/);
 assert.deepEqual(r.first,{ok:true,kind:'opinion',result:{from:30,to:15}});
 assert.match(r.again.error,/이미 받았습니다/);
 assert.deepEqual(r.low,{from:10,to:0},'clamped at 0');
 assert.equal(r.status,'done');assert.equal(r.choice,'opinion');assert.equal(r.after,null);assert.equal(r.log,2);
 assert.ok(r.news.some(x=>/^MLB 진출 보상 · /.test(x)));assert.equal(r.valid,'ok');
 // a failed attempt gives no reward, support record or ticket
 const f=run(`(()=>{const t=club();const p=t.players[0];for(const k of ['contact','power','eye'])p.a[k]=90;p.stats.games=10;const r=completeMlbAttempt(t,mlbQuote(t,p.id),()=>.99);return [r.result.success,r.result.reward===undefined,r.result.support===undefined,t.mlbSupport.tickets,pendingMlbReward(t)];})()`);
 assert.deepEqual(f,[false,true,true,0,null]);
});

test('reward: five random remaining players +20 loyalty (cap 100); a hire after the departure gets nothing',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club();[90,85,50,81,100].forEach((v,i)=>{t.players[i].loyalty=v;});const ids=t.players.map(p=>p.id);
  const h=send(t,60);const drawn=h.reward.loyalty.slice();
  const hire=enrich(player(true,t.players.map(x=>x.number)));hire.loyalty=40;t.players.push(hire);
  const gone=t.players.splice(1,1)[0];t.departed.push(gone);repairRoster26(t);// one drawn player left before the choice
  const c=chooseMlbReward(t,h.id,'loyalty',()=>0);
  return {drawn,ids,gone:gone.id,got:c.result.players.map(p=>[p.id,p.from,p.to]),hire:hire.loyalty,stored:h.reward.loyalty,valid:tryValidate(t)};})()`);
 assert.deepEqual(r.drawn,r.ids.slice(0,5),'random 0 draws the first five');
 assert.deepEqual(r.got,[[r.ids[0],90,100],[r.ids[2],50,70],[r.ids[3],81,100],[r.ids[4],100,100],[r.ids[5],r.got[4][1],r.got[4][1]+20]]);
 assert.ok(!r.got.some(g=>g[0]===r.gone||g[0]===r.hire),'the player who left and the new hire get nothing');
 assert.equal(r.hire,40);assert.deepEqual(r.stored,r.got.map(g=>g[0]));assert.equal(r.valid,'ok');
 // random draws: a different stream picks other players
 const other=run(`(()=>{const t=club(),ids=t.players.map(p=>p.id);const h=send(t,60,{rnd:seq(0,.99,.99,.99,.99,.99,0,0)});return [h.reward.loyalty,ids.slice(-5).reverse()];})()`);
 assert.deepEqual(other[0],other[1]);
});

test('reward: the youngest gets +15 on the senior\'s highest of the 10 abilities (cap 100, random among ties)',()=>{
 const {run}=world();
 const one=(setup,rnd,senior='{}')=>run(`(()=>{const t=club();${setup};const ids=t.players.map(p=>p.id);const h=send(t,60,{a:${senior},rnd:${rnd}});
  const R=JSON.parse(JSON.stringify(h.reward)),young=t.players.find(p=>p.id===R.youngest),before=young.a[R.key];const c=chooseMlbReward(t,h.id,'ability',()=>0);
  return {i:ids.indexOf(R.youngest),key:R.key,before,res:c.result,energy:young.energy<=young.a.stamina,valid:tryValidate(t)};})()`);
 // stamina counts: a senior with stamina 95 hands it down; the only 19-year-old receives it
 const a=one("t.players[5].age=19;t.players[5].a.stamina=40;t.players[5].energy=40",'seq(0)','{stamina:95}');
 assert.equal(a.i,5);assert.equal(a.key,'stamina');assert.deepEqual([a.res.from,a.res.to,a.res.age,a.res.key],[40,55,19,'stamina']);assert.equal(a.energy,true);assert.equal(a.valid,'ok');
 // cap 100
 const b=one("t.players[5].age=19;t.players[5].a.stamina=92;t.players[5].energy=50",'seq(0)','{stamina:95}');
 assert.deepEqual([b.res.from,b.res.to],[92,100]);
 // ability tie (contact = power = eye = 90): random among them (0 → contact, .99 → eye)
 assert.equal(one('','seq(0,0,0,0,0,0,0,0)').key,'contact');
 assert.equal(one('','seq(0,0,0,0,0,0,0,.99)').key,'eye');
 // youngest tie (two 19-year-olds): random among them
 assert.equal(one('t.players[2].age=19;t.players[7].age=19','seq(0,0,0,0,0,0,0,0)').i,2);
 assert.equal(one('t.players[2].age=19;t.players[7].age=19','seq(0,0,0,0,0,0,.99,0)').i,7);
 // the drawn youngest left before the choice: the youngest of the others who were there gets it
 const c=run(`(()=>{const t=club();t.players[3].age=19;t.players[8].age=21;t.players.forEach((p,i)=>{if(i!==3&&i!==8)p.age=23;});const ids=t.players.map(p=>p.id);const h=send(t,60);t.players.splice(3,1);
  const hire=enrich(player(true,t.players.map(x=>x.number)));hire.age=19;t.players.push(hire);const r=chooseMlbReward(t,h.id,'ability',()=>0);return [ids.indexOf(r.result.id),r.result.age];})()`);
 assert.deepEqual(c,[8,21]);
});

test('reload safety: the pending reward and its draws are saved, cannot be re-rolled or skipped, and give one reward',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club();const h=send(t,60);const preview=mlbRewardPreview(t,h);
  const saved=JSON.parse(JSON.stringify(t)),valid=tryValidate(saved);data.slots=[saved,null];ensureClub(saved);
  const h2=saved.mlbHistory.find(x=>x.id===h.id);const again=mlbRewardPreview(saved,h2),pending=pendingMlbReward(saved)?.id===h.id,block=mlbSupportBlock(saved);
  const c=chooseMlbReward(saved,h.id,'ability');const reload=JSON.parse(JSON.stringify(saved));data.slots=[reload,null];ensureClub(reload);
  const second=chooseMlbReward(reload,h.id,'opinion');
  return {preview,again,valid,pending,block,ok:c.ok,second,left:pendingMlbReward(reload),status:reload.mlbHistory.at(-1).reward.status,quote:mlbQuote(reload,reload.players[0].id).reasons.some(x=>/보상/.test(x)),valid2:tryValidate(reload)};})()`);
 assert.equal(r.valid,'ok');assert.deepEqual(r.again,r.preview,'the same options after a reload');
 assert.equal(r.pending,true);assert.match(r.block,/보상을 먼저/);
 assert.equal(r.ok,true);assert.match(r.second.error,/이미 받았습니다/);assert.equal(r.left,null);assert.equal(r.status,'done');
 assert.equal(r.quote,false,'the next MLB attempt is open again');assert.equal(r.valid2,'ok');
});

test('tickets at 1, 5 and 10 MLB departures; existing clubs are not paid for milestones they already passed',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club(),out=[];for(let i=0;i<11;i++){send(t,60,{choose:'opinion'});out.push(t.mlbSupport.tickets);}
  return {out,earned:t.mlbSupport.earned.map(e=>e.count),news:t.news.filter(x=>/^구단 회생권 1장/.test(x.title)).map(x=>x.title),valid:tryValidate(t)};})()`);
 assert.deepEqual(r.out,[1,1,1,1,2,2,2,2,2,3,3]);assert.deepEqual(r.earned,[1,5,10]);
 assert.deepEqual(r.news.reverse(),['구단 회생권 1장 · MLB 진출 1명','구단 회생권 1장 · MLB 진출 5명','구단 회생권 1장 · MLB 진출 10명']);assert.equal(r.valid,'ok');
 // an existing club with 3 (or 5) departures before the update: no ticket for the past, the next one at 5 (or 10)
 const old=n=>run(`(()=>{const t=club();for(let i=0;i<${n};i++)send(t,60,{choose:'opinion'});
  delete t.mlbSupport;for(const h of t.mlbHistory){delete h.support;delete h.reward;}t.news=[];
  const raw=JSON.parse(JSON.stringify(t)),valid=tryValidate(raw);data.slots=[raw,null];ensureClub(raw);
  const base={tickets:raw.mlbSupport.tickets,base:raw.mlbSupport.base,news:raw.news.map(x=>x.title)},out=[];
  for(let i=${n};i<10;i++){send(raw,60,{choose:'opinion'});out.push(raw.mlbSupport.tickets);}return {valid,base,out,earned:raw.mlbSupport.earned.map(e=>e.count)};})()`);
 const three=old(3);
 assert.equal(three.valid,'ok');assert.deepEqual([three.base.tickets,three.base.base],[0,3]);assert.equal(three.base.news[0],'구단 회생권 · MLB 진출 3명부터 셈');
 assert.deepEqual(three.out,[0,1,1,1,1,1,2],'departures 4 … 10');assert.deepEqual(three.earned,[5,10]);
 const five=old(5);assert.deepEqual(five.out,[0,0,0,0,1]);assert.deepEqual(five.earned,[10]);
 // an old club without MLB departures gets the first ticket as usual and no extra news
 const none=run(`(()=>{const t=club();delete t.mlbSupport;t.news=[];data.slots=[t,null];ensureClub(t);const n=t.news.length;send(t,60);return [t.mlbSupport.base,n,t.mlbSupport.tickets];})()`);
 assert.deepEqual(none,[0,0,1]);
});

test('pending disband: the season end waits; using a ticket sets 70%, keeps the prize and promotes or relegates by rank',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club();t.league.tier=1;setTickets(t,1);const ids=t.players.map(p=>p.id);
  const s=endSeason(t,4,100);const L=t.league,entry=L.history.at(-1);
  const wait={move:s.move,pending:s.revivalPending,summaryOpinion:!!s.opinion,phase:L.phase,tier:L.tier,players:t.players.map(p=>p.id),aged:t.aging.season,disbands:t.opinion.disbands,
   P:t.mlbSupport.pending,entry:{move:entry.move,revivalPending:entry.revivalPending,opinion:!!entry.opinion,disband:entry.disband},
   next:startNextSeason(t),stadium:stadiumUpgradeBlock(t),retire:retirementBlock(t,t.players[0]),text:leagueMoveText(entry,L),valid:tryValidate(t)};
  t.news=[];const res=resolveRevival(t,true);
  return {ids,wait,res,after:{tickets:tickets(t),used:t.mlbSupport.used.map(u=>u.kind),v:t.opinion.value,tier:L.tier,entry:{move:entry.move,nextTier:entry.nextTier,prize:entry.prize,disband:entry.disband,prevented:entry.disbandPrevented,pending:entry.revivalPending},
   pending:t.mlbSupport.pending,players:t.players.map(p=>p.id),news:t.news.map(x=>x.title),log:t.opinion.log.at(-1).parts.map(p=>[p.key,p.delta])},valid:tryValidate(t),start:startNextSeason(t),season:L.season};})()`);
 const w=r.wait;
 assert.equal(w.move,'pending');assert.equal(w.pending,'disband');assert.equal(w.summaryOpinion,true);assert.equal(w.phase,'offseason');assert.equal(w.tier,1);
 assert.deepEqual(w.players,r.ids,'no rebuild while waiting');assert.equal(w.aged,1,'aging ran');assert.equal(w.disbands,0);
 assert.deepEqual([w.P.kind,w.P.season,w.P.tier,w.P.rank,w.P.prize,w.P.recorded],['disband',1,1,4,0,false]);assert.equal(w.P.opinion.to,100);
 assert.deepEqual(w.entry,{move:'pending',revivalPending:'disband',opinion:true},'no disband fields while waiting');
 assert.match(w.next,/회생권/);assert.match(w.stadium,/회생권/);assert.match(w.retire,/회생권/);assert.equal(w.text,'구단 회생권 결정 대기');assert.equal(w.valid,'ok');
 assert.deepEqual(r.res,{ok:true,kind:'disband',use:true,move:'stay',tier:1});
 const a=r.after;
 assert.deepEqual([a.tickets,a.used,a.v,a.tier],[0,['disband'],70,1]);
 assert.deepEqual(a.entry,{move:'stay',nextTier:1,prize:0,disband:false,prevented:'ticket'});
 assert.equal(a.pending,null);assert.deepEqual(a.players,r.ids);assert.deepEqual(a.log,[['ticket',-30]]);
 assert.ok(a.news.includes('구단 회생권 사용 · 해체를 막았습니다'));assert.ok(!a.news.some(x=>/^기사회생/.test(x)),'기사회생 is for surviving without a ticket');
 assert.equal(r.valid,'ok');assert.equal(r.start,'');assert.equal(r.season,2);
 // 동네 3rd at 100%: the 1,000,000 won prize stays when the ticket is used
 const p=run(`(()=>{const t=club();setTickets(t,1);t.funds=1000;endSeason(t,3,100);const before=t.funds;resolveRevival(t,true);return [before,t.funds,t.league.history.at(-1).prize];})()`);
 assert.deepEqual(p,[1100,1100,100]);
});

test('pending disband: proceeding gives exactly ③\'s disband and rebuild, and the unused tickets stay',()=>{
 const {run}=world();
 const go=withTicket=>run(`(()=>{const t=club();t.funds=1234;const loy=[90,85,85,80,72,70,69,50,40,30,20,10];t.players.forEach((p,i)=>{p.loyalty=loy[i];});const ids=t.players.map(p=>p.id);
  if(${withTicket})setTickets(t,2);const s=endSeason(t,3,100);
  let res=null;if(${withTicket}){res=resolveRevival(t,false);}
  const e=t.league.history.at(-1),pick=x=>({move:x.move,nextTier:x.nextTier,prize:x.prize,disband:x.disband,lostPrize:x.lostPrize,rebuild:x.rebuild&&{kept:x.rebuild.kept,added:x.rebuild.added,left:x.rebuild.left},pending:x.revivalPending});
  return {res,entry:pick(e),kept:t.players.slice(0,3).map(p=>ids.indexOf(p.id)),n:t.players.length,funds:t.funds,tier:t.league.tier,v:t.opinion.value,disbands:t.opinion.disbands,
   ledger:t.ledger.filter(x=>/해체|재창단/.test(x.label)).map(x=>[x.label,x.amount]),tickets:t.mlbSupport.tickets,news:t.news.map(x=>x.title),valid:tryValidate(t),start:startNextSeason(t)};})()`);
 const plain=go(false),ticket=go(true);
 assert.deepEqual(ticket.res,{ok:true,kind:'disband',use:false,move:'disband',tier:0});
 for(const k of ['entry','kept','n','funds','tier','v','disbands','ledger'])assert.deepEqual(ticket[k],plain[k],k);
 assert.deepEqual(ticket.entry.move,'disband');assert.equal(ticket.entry.prize,0);assert.equal(ticket.entry.lostPrize,100);assert.equal(ticket.entry.disband,true);
 assert.deepEqual([ticket.funds,ticket.tier,ticket.v,ticket.n],[3000,0,20,12]);assert.deepEqual(ticket.kept,[0,1,2]);
 assert.ok(ticket.ledger.some(x=>x[0]==='해체 · 시즌 상금 취소'&&x[1]===-100));
 assert.equal(ticket.tickets,2,'unused tickets survive the rebuild');assert.equal(plain.tickets,0);
 assert.ok(ticket.news.some(x=>/구단 해체 발표/.test(x))&&ticket.news.some(x=>/재창단/.test(x)));
 assert.equal(ticket.valid,'ok');assert.equal(ticket.start,'');
});

test('pending relegation: use keeps the league, proceed relegates; a 1st place, 동네 6th and no ticket never ask',()=>{
 const {run}=world();
 const one=use=>run(`(()=>{const t=club();t.league.tier=2;t.stadium=2;setTickets(t,1);t.market=createMarketCandidates(t).slice(0,1);t.marketRound=3;const s=endSeason(t,6,40);const e=t.league.history.at(-1);
  const wait={move:s.move,P:t.mlbSupport.pending,tier:t.league.tier,entry:{move:e.move,pending:e.revivalPending,opinion:!!e.opinion},next:leagueNextSeasonBlock(t)};
  const res=resolveRevival(t,${use});return {wait,res,tier:t.league.tier,entry:{move:e.move,nextTier:e.nextTier,pending:e.revivalPending},tickets:tickets(t),market:t.market.length,v:t.opinion.value,text:leagueMoveText(e,t.league),valid:tryValidate(t),start:startNextSeason(t),tierNext:t.league.tier};})()`);
 const u=one(true),p=one(false);
 assert.equal(u.wait.move,'pending');assert.deepEqual([u.wait.P.kind,u.wait.P.rank,u.wait.P.tier,u.wait.P.recorded],['relegation',6,2,true]);
 assert.equal(u.wait.tier,2);assert.deepEqual(u.wait.entry,{move:'pending',pending:'relegation',opinion:true});assert.match(u.wait.next,/회생권/);
 assert.deepEqual(u.res,{ok:true,kind:'relegation',use:true,move:'saved',tier:2});
 assert.deepEqual([u.tier,u.entry.move,u.entry.nextTier,u.tickets,u.v,u.text],[2,'saved',2,0,60,'강등을 막았습니다']);
 assert.equal(u.market,1,'no tier change, the recruit list stays');assert.equal(u.valid,'ok');assert.equal(u.start,'');assert.equal(u.tierNext,2);
 assert.deepEqual(p.res,{ok:true,kind:'relegation',use:false,move:'down',tier:1});
 assert.deepEqual([p.tier,p.entry.move,p.entry.nextTier,p.tickets,p.market,p.text],[1,'down',1,1,0,'지역 리그 강등']);
 assert.equal(p.valid,'ok');assert.equal(p.start,'');assert.equal(p.tierNext,1);
 // no question: 1st place (promotion as usual), 동네 6th, 2부 6th without a ticket, 2부 5th
 const none=run(`(()=>{const out=[];for(const [tier,rank,n] of [[1,1,2],[0,6,2],[2,6,0],[2,5,3]]){const t=club();t.league.tier=tier;t.stadium=3;setTickets(t,n);const s=endSeason(t,rank,40);out.push([s.move,t.league.tier,t.mlbSupport.pending]);}return out;})()`);
 assert.deepEqual(none,[['up',2,null],['stay',0,null],['down',1,null],['stay',2,null]]);
});

test('disband and relegation in one season: the disband first, then the relegation with a second ticket',()=>{
 const {run}=world();
 // 2부 6th at 85% (+20 → 100) with two tickets: disband question → use → relegation question → use / proceed
 const two=last=>run(`(()=>{const t=club();t.league.tier=2;t.stadium=2;setTickets(t,2);const s=endSeason(t,6,85);const e=t.league.history.at(-1);const first=t.mlbSupport.pending.kind;
  const a=resolveRevival(t,true);const mid={P:t.mlbSupport.pending,entry:{pending:e.revivalPending,prevented:e.disbandPrevented,disband:e.disband,move:e.move},tier:t.league.tier,v:t.opinion.value,next:leagueNextSeasonBlock(t),valid:tryValidate(t)};
  t.news=[];const b=resolveRevival(t,${last});
  return {move:s.move,first,a,mid,b,tier:t.league.tier,tickets:tickets(t),used:t.mlbSupport.used.map(u=>u.kind),entry:{move:e.move,pending:e.revivalPending,prevented:e.disbandPrevented,disband:e.disband,opinion:e.opinion.to},news:t.news.map(x=>x.title),valid:tryValidate(t)};})()`);
 const keep=two(true),down=two(false);
 assert.equal(keep.move,'pending');assert.equal(keep.first,'disband');
 assert.deepEqual(keep.a,{ok:true,kind:'disband',use:true,next:'relegation'});
 assert.deepEqual([keep.mid.P.kind,keep.mid.P.recorded,keep.mid.P.disband.by,keep.mid.tier,keep.mid.v],['relegation',false,'ticket',2,70]);
 assert.deepEqual(keep.mid.entry,{pending:'relegation',prevented:'ticket',disband:false,move:'pending'});assert.match(keep.mid.next,/강등 판정/);assert.equal(keep.mid.valid,'ok');
 assert.deepEqual([keep.tier,keep.tickets,keep.used],[2,0,['disband','relegation']]);
 assert.deepEqual(keep.entry,{move:'saved',prevented:'ticket',disband:false,opinion:100},'the waiting mark is gone');
 assert.ok(!keep.news.some(x=>/^기사회생/.test(x)));assert.equal(keep.valid,'ok');
 assert.deepEqual([down.tier,down.tickets,down.entry.move,down.entry.prevented],[1,1,'down','ticket']);assert.equal(down.valid,'ok');
 // with one ticket the disband question comes alone and the relegation follows the rank
 const one=run(`(()=>{const t=club();t.league.tier=2;t.stadium=2;setTickets(t,1);endSeason(t,6,85);const r=resolveRevival(t,true);return [r.move,t.league.tier,t.mlbSupport.pending,tickets(t)];})()`);
 assert.deepEqual(one,['down',1,null,0]);
 // proceeding with the disband: 동네 리그, no relegation question, both tickets stay
 const dis=run(`(()=>{const t=club();t.league.tier=2;t.stadium=2;setTickets(t,2);endSeason(t,6,85);const r=resolveRevival(t,false);return [r.move,t.league.tier,t.mlbSupport.pending,tickets(t),t.league.history.at(-1).disband,t.players.length];})()`);
 assert.deepEqual(dis,['disband',0,null,2,true,12]);
});

test('the last game\'s season summary follows the decision; a broken pending decision is dropped, never stuck',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club();t.league.tier=1;setTickets(t,1);const s=endSeason(t,6,40);t.match={id:'last',done:true,league:{season:1,tier:1,round:9,oppId:'x',seasonEnd:s}};
  const before={move:t.match.league.seasonEnd.move,pending:t.match.league.seasonEnd.revivalPending};resolveRevival(t,false);
  const end=t.match.league.seasonEnd;return {before,after:{move:end.move,nextTier:end.nextTier,pending:end.revivalPending,table:end.table}};})()`);
 assert.deepEqual(r.before,{move:'pending',pending:'relegation'});
 assert.deepEqual(r.after,{move:'down',nextTier:0},'no waiting mark and no table in the summary');
 const broken=run(`(()=>{const t=club();setTickets(t,1);t.mlbSupport.pending={kind:'disband',season:1,tier:0,rank:5,prize:0,opinion:null,disband:null,recorded:false,at:0};
  const v=tryValidate(t);data.slots=[t,null];ensureClub(t);return [v,t.mlbSupport.pending,leagueNextSeasonBlock(t)];})()`);
 assert.match(broken[0],/판정 대기/);assert.equal(broken[1],null);assert.match(broken[2],/진행 중/);
});

test('support requests: share by remembered loyalty, refusal under 30, memory −10 per request, once per season, opinion −5',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club(),hs=[95,75,55,35,20].map(l=>send(t,l,{choose:'loyalty'}));t.opinion.value=50;
  const fees=hs.map(h=>h.fee),out=[];
  for(const h of hs){const f=t.funds,v=t.opinion.value;const q=mlbSupportQuote(t,h);const res=requestMlbSupport(t,h.id);out.push({rate:q.rate,amount:res.amount,refused:res.refused,funds:t.funds-f,dv:t.opinion.value-v,memory:h.support.memory,requests:h.support.requests,news:t.news[0].title});}
  const again=requestMlbSupport(t,hs[0].id),quote=mlbSupportQuote(t,hs[0]);
  return {fees,out,again,quote:quote.reasons,valid:tryValidate(t)};})()`);
 assert.deepEqual(r.fees,[11000,11000,11000,11000,11000]);
 assert.deepEqual(r.out.map(x=>[x.rate,x.amount,x.refused,x.funds,x.dv,x.memory,x.requests]),[
  [.4,4400,false,4400,-5,85,1],[.3,3300,false,3300,-5,65,1],[.2,2200,false,2200,-5,45,1],[.1,1100,false,1100,-5,25,1],[0,0,true,0,0,10,1]]);
 assert.match(r.out[0].news,/친정에 4400만원 후원/);assert.match(r.out[4].news,/후원 요청 거절/);
 assert.match(r.again.error,/이미 요청/);assert.equal(r.quote.length,1);assert.equal(r.valid,'ok');
 // the remembered loyalty keeps falling (95 → 85 → 75 …), one request per season; a request in the offseason counts for the coming season
 const s=run(`(()=>{const t=club(),h=send(t,95,{choose:'opinion'}),out=[];
  const ask=()=>{const r=requestMlbSupport(t,h.id);out.push(r.error?'blocked':(r.refused?'refused':r.amount)+'/'+h.support.memory);};
  ask();ask();                       // season 1: 95 → 40%, then blocked
  endSeason(t,3,30);ask();           // offseason after season 1 = season 2: 85 → 30%
  startNextSeason(t);ask();          // season 2: already asked
  for(let i=0;i<5;i++){endSeason(t,3,30);ask();startNextSeason(t);}// offseasons for seasons 3 … 7
  return {out,received:h.support.received,requests:h.support.requests,season:t.league.season};})()`);
 assert.deepEqual(s.out,['4400/85','blocked','3300/75','blocked','3300/65','2200/55','2200/45','1100/35','1100/25']);
 assert.equal(s.received,4400+3300*2+2200*2+1100*2);assert.equal(s.requests,7);assert.equal(s.season,7);
 // tier boundaries, the ⑤ hook (hall of fame −5) and blocked moments
 assert.deepEqual(run('[90,89.99,70,69,50,49,30,29.9,0].map(mlbSupportRate)'),[.4,.3,.3,.2,.2,.1,.1,0,0]);
 const hook=run(`(()=>{const t=club(),h=send(t,95,{choose:'opinion'});MLB_SUPPORT_HOOKS.memoryDrop.push(()=>5);try{requestMlbSupport(t,h.id);}finally{MLB_SUPPORT_HOOKS.memoryDrop.pop();}
  t.match={done:false};const live=mlbSupportQuote(t,h).reasons;t.match=null;return [h.support.memory,live];})()`);
 assert.equal(hook[0],90);assert.match(hook[1][0],/경기가 끝난 뒤/);
 const pend=run(`(()=>{const t=club(),h=send(t,95,{choose:'opinion'});t.league.tier=1;endSeason(t,6,40);return [t.mlbSupport.pending.kind,requestMlbSupport(t,h.id).error];})()`);
 assert.equal(pend[0],'relegation');assert.match(pend[1],/회생권/);
});

test('regular support: 5% of the fee per game from players who left with loyalty ≥ 90, while opinion ≥ 90 or a loan is repaid',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club(),a=send(t,95,{choose:'loyalty'}),b=send(t,89,{choose:'loyalty'}),c=send(t,90,{choose:'loyalty'});t.news=[];const out=[];
  const game=(id,v,loan)=>{t.opinion.value=v;t.loan=loan?{v:1,amount:100,repay:110,left:110,repaid:0,season:1,at:0}:null;const f=t.funds,m={id};const s=payRegularSupport(t,m);return [s?s.total:0,t.funds-f,t.mlbSupport.regular,s?s.rows.map(x=>x.name):[]];};
  out.push(game('g1',89,false));out.push(game('g2',90,false));out.push(game('g3',95,false));out.push(game('g4',20,true));out.push(game('g5',20,false));out.push(game('g6',92,false));
  const m={id:'g7'};t.opinion.value=95;payRegularSupport(t,m);const twice=payRegularSupport(t,m);
  m.finance={reward:500,ticket:0,stores:0,net:120};t.history.unshift({id:'g7',finance:{...m.finance}});recordRegularSupport(t,m);recordRegularSupport(t,m);
  requestMlbSupport(t,a.id);requestMlbSupport(t,c.id);const after=game('g8',95,false);
  return {names:[a.player.name,c.player.name],out,twice,finance:m.finance,hist:{finance:t.history[0].finance,support:t.history[0].mlbSupport.total},regular:[a.support.regular,b.support.regular,c.support.regular],
   news:t.news.filter(x=>/정기 후원 시작/.test(x.title)).length,after,memory:[a.support.memory,c.support.memory],ledger:t.ledger.filter(x=>/정기 후원/.test(x.label)).length,valid:tryValidate(t)};})()`);
 assert.deepEqual(r.out.map(x=>x.slice(0,3)),[[0,0,false],[1100,1100,true],[1100,1100,true],[1100,1100,true],[0,0,false],[1100,1100,true]]);
 assert.deepEqual(r.out[1][3],r.names,'loyalty 95 and 90 qualify, 89 does not');
 assert.equal(r.twice,null,'once per game');
 assert.deepEqual([r.finance.support,r.finance.net],[1100,1220]);assert.deepEqual([r.hist.finance.support,r.hist.support],[1100,1100]);
 assert.equal(r.news,2,'a news item when it starts (twice: it stopped at game 5)');
 assert.deepEqual(r.memory,[85,80]);assert.equal(r.after[0],1100,'still paid after requests lowered the remembered loyalty');
 assert.deepEqual(r.regular,[3300,0,3300],'six paying games × 550');assert.equal(r.ledger,12);assert.equal(r.valid,'ok');
});

test('tickets survive a rebuild and the MLB records keep their support data',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club(),h=send(t,95,{choose:'opinion'});requestMlbSupport(t,h.id);const before=JSON.parse(JSON.stringify(t.mlbSupport));t.mlbSupport.tickets=1;
  rebuildClub(t,{season:1,tier:0,rank:6});return {tickets:t.mlbSupport.tickets,earned:t.mlbSupport.earned.length,support:t.mlbHistory[0].support,base:before.base,valid:tryValidate(t)};})()`);
 assert.equal(r.tickets,1);assert.equal(r.earned,1);assert.equal(r.support.memory,85);assert.equal(r.support.received,4400);assert.equal(r.valid,'ok');
});

test('old saves: records get departure and remembered loyalty from loyaltyBefore, validation passes first, once',()=>{
 const {run}=world();
 const r=run(`(()=>{const t=club();const h1=send(t,77,{choose:'opinion'}),h2=send(t,33,{choose:'opinion'});
  delete t.mlbSupport;for(const h of t.mlbHistory){delete h.support;delete h.reward;}t.news=[];
  const raw=JSON.parse(JSON.stringify(t)),valid=tryValidate(raw);data.slots=[raw,null];ensureClub(raw);const first=JSON.parse(JSON.stringify([raw.mlbSupport,raw.mlbHistory.map(h=>h.support)]));ensureClub(raw);
  return {valid,first,second:[raw.mlbSupport,raw.mlbHistory.map(h=>h.support)],news:raw.news.length,valid2:tryValidate(raw)};})()`);
 assert.equal(r.valid,'ok');
 assert.deepEqual(r.first[0],{v:1,tickets:0,base:2,earned:[],used:[],pending:null,regular:false});
 assert.deepEqual(r.first[1],[{loyalty:77,memory:77,requests:0,lastSeason:null,received:0,regular:0},{loyalty:33,memory:33,requests:0,lastSeason:null,received:0,regular:0}]);
 assert.deepEqual(r.second,r.first);assert.equal(r.news,1);assert.equal(r.valid2,'ok');
 // the fallback when a record has no usable loyalty (mlb.js records always have one)
 assert.deepEqual(run("[mlbSupportRecord({player:{loyalty:64}}).loyalty,mlbSupportRecord({}).loyalty,mlbSupportRecord({loyaltyBefore:'x',player:{}}).memory]"),[64,50,50]);
});

test('validation: missing data is fine, malformed tickets, decisions, rewards and support records are rejected',()=>{
 const {run}=world();
 const check=mutate=>run(`(()=>{const t=club();const h=send(t,80);const c=JSON.parse(JSON.stringify(t));const r=c.mlbHistory[0];${mutate};try{validateTeam(c);return 'ok';}catch(e){return e.message;}})()`);
 for(const ok of ['','delete c.mlbSupport','delete r.support;delete r.reward','c.mlbSupport.pending=null',"r.reward.status='done';r.reward.choice='opinion';r.reward.result={from:30,to:15}",
  "c.history=[{id:'g',mlbSupport:{total:550,rows:[{id:'x',name:'a',amount:550}]},finance:{support:550}}]","c.mlbSupport.used=[{kind:'relegation',season:2,at:0}]"])assert.equal(check(ok),'ok',ok);
 for(const bad of ['c.mlbSupport=[]','c.mlbSupport.v=2','c.mlbSupport.tickets=4','c.mlbSupport.tickets=-1',"c.mlbSupport.tickets='1'",'c.mlbSupport.base=1.5',
  "c.mlbSupport.earned.push({count:1,season:1,at:0})","c.mlbSupport.earned=[{count:3,season:1,at:0}]","c.mlbSupport.used=[{kind:'x',season:1}]","c.mlbSupport.regular='yes'",
  "c.mlbSupport.pending={kind:'x',season:1,tier:0,rank:5,prize:0,recorded:false}","c.mlbSupport.pending={kind:'disband',season:1,tier:0,rank:5,prize:0,recorded:false}",
  "c.league.phase='offseason';c.league.history=[{season:1,tier:1,rank:5,nextTier:1,prize:0}];c.mlbSupport.pending={kind:'relegation',season:1,tier:1,rank:5,prize:0,recorded:true}",
  'r.support.memory=120',"r.support.requests=-1","r.support.lastSeason='1'",'c.mlbHistory.push({...r,id:"f",success:false,fee:0,left:false,support:r.support,reward:undefined,player:{...r.player,id:"pf"}})',
  "r.reward.status='x'","r.reward.loyalty=['nobody']","r.reward.key='luck'","r.reward.youngest='nobody'","r.reward.status='done'",
  "c.history=[{id:'g',mlbSupport:{total:-1,rows:[]}}]","c.history=[{id:'g',finance:{support:'550'}}]","c.league.history=[{season:1,tier:0,rank:3,nextTier:0,prize:0,revivalPending:'x'}]"])
  assert.match(check(bad),/MLB 후원·회생권 자료 오류/,bad);
 // a valid waiting decision passes
 assert.equal(run(`(()=>{const t=club();t.league.tier=1;setTickets(t,1);endSeason(t,6,40);return tryValidate(t);})()`),'ok');
});

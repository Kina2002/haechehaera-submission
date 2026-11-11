// Match-experience growth, age, aging and retirement, build step ② (2026-11-11).
// P10 경기 경험 성장: 사건별 경험치(v02p × 1.2), +1에 훈련비 구간 배수 × K(10), 리그 배수, 젊은 선수 보너스, 경기 성장 한도.
// P21 선수 나이와 노화: 입단 19~26세(서로 다른 능력 3개 +(나이−19)), 시즌 끝 나이 +1과 노화 감소, 예전 저장의 나이 추정.
// 은퇴(P10·P21): 시즌 끝 선수 희망, 오프시즌 감독 지시. 은퇴한 선수는 t.departed에 남고 기록실에 보입니다.
// Layout like src/league.js: pure rules first, then the game-hook marker comment, then the UI marker comment.
// Tests slice the source at those two marker comments, so keep them unique.
// Extension points for later steps (do not rewrite this file for them):
//  - ⑤ 시설(P17): GROWTH_EXP_MULTIPLIERS.push((t,p,k)=>factor) multiplies match experience (선수 식당 ×1.1, 훈련 시설 단계 ×1.2·×1.4).
//    growthCap(t,p,k) may be replaced to raise the match-growth cap (훈련 시설 3단계 한도).
//  - ③ 재창단 · ⑤ 유소년 아카데미: enterPlayerAge(p) gives a new entrant an age of 19~26 and the entry bonus;
//    enterPlayerAge(p,Math.random,19) makes a 19-year-old prospect.

const GROWTH_KEYS=['contact','power','eye','speed','sense','catch','throw','velocity','control','stamina'];
const GROWTH={
 K:10,                                  // P10: +1 needs the training cost tier × K (1~49 ×1 · 50~64 ×2 · 65~79 ×3 · 80~89 ×4 · 90~94 ×6 · 95~99 ×8)
 matchCap:85,                           // Temporary (②, Claude): match growth stops at 85 (P10 youth-bonus draft; the participant decided only "raise the cap"). Training keeps its own limit.
 league:[1,1.2,1.4,1.6],                // P10: 동네·지역·2부·1부 experience multiplier
 youth:[[21,1.5],[25,1.3],[999,1]],     // Temporary (②): youth bonus without the 30+ slowdown (the table used in the recent simulations)
 // P10 participant decision 2026-11-11: v02p × 1.2 (= tests/exp-events.cjs EXP_PRESETS.decided), before the league/age/facility multipliers.
 events:{
  bat:{hit:1.92,pa:.48,xbh:2.88,hr:4.8,rbi:.96,sf:.96,bb:2.88,noWhiffPA:.36,sb:2.88,run:1.92,play:.96,bh:1.92},
  field:{catchOut:.72,error:.96,throwOut:.72,ofAssistThrow:2.88,ofAssistVelocity:1.92,caughtStealing:1.92,rangePos:.6,dpTurn:1.44,cleanThrow:.36,fullGame:.96,extraInnings:.96},
  pitch:{k:.96,out:.24,cleanInning:.24,fivePlus:3.6,play:.96,escape:.36,fieldCatch:.36,fieldThrow:.36,cover1B:.96,whiffInduced:.12},
 },
 regularInnings:5,                      // a game that goes past the 5th inning counts as 연장전 (the simulator's rule)
 fivePlusOuts:15,                       // 5 innings pitched
 entry:{min:19,max:26,count:3,cap:100}, // P21: new entrants 19~26, three distinct abilities +(age−19), cap 100
 aging:[[30,3,2],[36,5,3],[41,10,5]],   // P21: [from age, distinct abilities, decrease]
 floor:1,
 retireWish:[[35,.1],[36,.2],[37,.35],[38,.5],[39,.65],[40,.8]],// Temporary (P10, Claude): chance that a player asks to retire at season end
 logSeasons:20,                         // aging/retirement results kept in the save
};
const GROWTH_OF=['LF','CF','RF'],GROWTH_RANGE=['LF','CF','RF','SS'];
const GROWTH_RETIRE_REASONS=['wish','order'],GROWTH_RETIRE_LABELS={wish:'선수 희망',order:'감독 지시'};
// ⑤ facility hook: each function returns a factor for (club, player, ability). Empty in ② (no facility effect yet).
const GROWTH_EXP_MULTIPLIERS=[];

// ---- multipliers, needs and caps ----
function growthLeagueMultiplier(tier){return GROWTH.league[tier]??1;}
function growthYouthMultiplier(age){return Number.isInteger(age)?GROWTH.youth.find(([max])=>age<=max)[1]:1;}
function growthExpMultiplier(t,p,k,tier){
 let x=growthLeagueMultiplier(tier)*growthYouthMultiplier(p.age);
 for(const f of GROWTH_EXP_MULTIPLIERS){const v=Number(f(t,p,k));if(Number.isFinite(v)&&v>=0)x*=v;}
 return x;
}
function growthNeed(v){return cost(v)*GROWTH.K;}
function growthCap(t,p,k){return k==='stamina'?Math.min(GROWTH.matchCap,balance(t).staminaCap):GROWTH.matchCap;}
const growthRound=v=>Math.round(v*1e4)/1e4;

// ---- age (P21) ----
// Existing saves (participant decision 2026-11-10): 19 + floor(games this player played for the club ÷ 10).
// p.stats.games counts every game the player appeared in for this club (starts and substitutions).
function migratedAge(p){return GROWTH.entry.min+Math.floor((Number(p?.stats?.games)||0)/10);}
// Distinct abilities by a partial Fisher–Yates shuffle (same draws as entryP21/ageP21 in tests/run-economy-sim.cjs).
function growthPickKeys(rnd,count){const keys=[...GROWTH_KEYS];for(let i=0;i<count;i++){const j=i+Math.floor(rnd()*(keys.length-i));[keys[i],keys[j]]=[keys[j],keys[i]];}return keys.slice(0,count);}
function enterPlayerAge(p,rnd=Math.random,age=null){
 const E=GROWTH.entry;p.age=Number.isInteger(age)?age:E.min+Math.floor(rnd()*(E.max-E.min+1));
 const bonus=p.age-E.min,raised={};
 if(bonus>0)for(const k of growthPickKeys(rnd,E.count)){const before=p.a[k];p.a[k]=Math.min(E.cap,before+bonus);if(p.a[k]!==before)raised[k]=p.a[k]-before;}
 if(Number.isFinite(p.a.stamina))p.energy=p.a.stamina;// a new entrant arrives rested
 return raised;
}
// Season end: +1 age, then the new age's decline (never below 1). Energy never stays above a lowered stamina.
function agePlayerSeason(p,rnd=Math.random){
 p.age=(Number.isInteger(p.age)?p.age:migratedAge(p))+1;
 const band=GROWTH.aging.filter(([from])=>p.age>=from).at(-1),drop={};
 if(band)for(const k of growthPickKeys(rnd,band[1])){const before=p.a[k];p.a[k]=Math.max(GROWTH.floor,before-band[2]);if(p.a[k]!==before)drop[k]=before-p.a[k];}
 if(Number.isFinite(p.energy)&&p.energy>p.a.stamina)p.energy=p.a.stamina;
 return {age:p.age,drop,planned:band?band[1]*band[2]:0};
}
function retirementWishChance(age){return Number.isInteger(age)?(GROWTH.retireWish.filter(([from])=>age>=from).at(-1)?.[1]||0):0;}

// ---- per-pitch tracker (port of tests/exp-events.cjs makeTracker; side 0 is always our club in the real game) ----
// Everything lives in the saved match (m.growth.track), so a reload in the middle of a game keeps the counts.
function newGrowthTrack(){return {by:{},whiff:{},halves:[],n:0,last:null};}
function growthInc(tr,id,key,n=1){if(!id||!n)return;const s=tr.by[id]??={};s[key]=(s[key]||0)+n;}
function trackGrowthEvent(tr,e){
 if(!tr||!e||(e.id&&e.id===tr.last))return false;
 tr.last=e.id||null;tr.n++;
 if(e.attack===0){
  // our batting: did this plate appearance have a swing and miss?
  if(e.type==='swing'||e.type==='ks')tr.whiff[e.batter]=true;
  if(e.pa){growthInc(tr,e.batter,'pa');if(!tr.whiff[e.batter])growthInc(tr,e.batter,'noWhiffPA');delete tr.whiff[e.batter];}
  return true;
 }
 // our defense
 const key=e.inning+':'+e.half;let cur=tr.halves.at(-1);
 if(!cur||cur.k!==key){cur={k:key,p:null,o:0,r:0,w:0,rn:false};tr.halves.push(cur);}
 cur.p=e.pitcher||null;cur.o+=e.outsAdded||0;cur.r+=e.runs?.length||0;
 if(e.before?.bases?.some(Boolean))cur.rn=true;
 if(e.pa&&!e.ab&&!e.hit&&e.type!=='sf')cur.w++;
 if(e.pitcher){const ps=tr.by[e.pitcher]??={};ps.pitched=1;growthInc(tr,e.pitcher,'outs',e.outsAdded||0);if(e.type==='swing'||e.type==='ks')growthInc(tr,e.pitcher,'whiffInd');}
 const fid=e.fielderId,pos=e.fieldPos,outs=e.outsAdded||0;
 if(!fid)return true;
 if(e.type==='cs'){growthInc(tr,fid,'cs');return true;}
 if((e.type==='ground'||e.type==='dp')&&outs>0){
  if(pos==='P'){growthInc(tr,fid,'pCatch');growthInc(tr,fid,'pThrow');}
  else if(pos==='1B'){growthInc(tr,fid,'catchOut');growthInc(tr,e.pitcher,'cover1B');}
  else{growthInc(tr,fid,'catchOut');growthInc(tr,fid,'throwOut');if(!e.errors?.length)growthInc(tr,fid,'cleanThrow');}
  if(e.type==='dp')growthInc(tr,fid,'dpTurn');
 }else if(['fly','line','sf','flydp'].includes(e.type)&&outs>0){
  growthInc(tr,fid,pos==='P'?'pCatch':'catchOut');
  if(e.type==='flydp')growthInc(tr,fid,GROWTH_OF.includes(pos)?'ofAssist':'throwOut');
 }
 if(e.tag&&outs>0&&GROWTH_OF.includes(pos)&&e.type!=='flydp')growthInc(tr,fid,'ofAssist');
 return true;
}
// Completed defensive half-innings credit the last pitcher with a walk-free inning and a scoreless escape with runners on.
function growthTrackTotals(tr){
 const by=JSON.parse(JSON.stringify(tr?.by||{}));
 for(const h of tr?.halves||[])if(h.o>=3&&h.p){const s=by[h.p]??={};if(!h.w)s.cleanInn=(s.cleanInn||0)+1;if(h.rn&&!h.r)s.escape=(s.escape||0)+1;}
 return by;
}

// ---- experience of one game (port of eventExp; pos is the one lineup slot the player held in this game) ----
// opt.full: started and was never substituted · opt.extra: on the field at the end of a game that went past the 5th inning
function matchEventExp(pos,s,tk={},opt={}){
 const E=GROWTH.events,e=Object.fromEntries(GROWTH_KEYS.map(k=>[k,0])),n=k=>Number(s?.[k])||0,c=k=>Number(tk?.[k])||0;
 const batted=c('pa')>0||(!!pos&&pos!=='P');
 if(batted){
  const b=E.bat;
  e.contact+=n('h')*b.hit+c('pa')*b.pa;
  e.power+=(n('doubles')+n('triples'))*b.xbh+n('hr')*b.hr+n('rbi')*b.rbi+n('sf')*b.sf;
  e.eye+=(n('bb')+n('hbp'))*b.bb+c('noWhiffPA')*b.noWhiffPA;
  e.speed+=n('sb')*b.sb+n('r')*b.run;
  e.sense+=b.play+n('bh')*b.bh;
 }
 if(pos&&pos!=='P'){
  const f=E.field;
  e.stamina+=(opt.full?f.fullGame:0)+(opt.extra?f.extraInnings:0);
  if(pos!=='DH'){
   e.catch+=c('catchOut')*f.catchOut+n('e')*f.error;
   e.throw+=c('throwOut')*f.throwOut+c('ofAssist')*f.ofAssistThrow+c('cs')*f.caughtStealing;
   e.speed+=GROWTH_RANGE.includes(pos)?f.rangePos:0;
   e.sense+=c('dpTurn')*f.dpTurn;
   e.velocity+=c('ofAssist')*f.ofAssistVelocity;
   e.control+=c('cleanThrow')*f.cleanThrow;
  }
 }
 if(c('pitched')){
  const p=E.pitch;
  e.velocity+=n('pk')*p.k;
  e.control+=n('pout')*p.out+c('cleanInn')*p.cleanInning;
  e.stamina+=c('outs')>=GROWTH.fivePlusOuts?p.fivePlus:0;
  e.sense+=(batted?0:p.play)+c('escape')*p.escape;
  e.catch+=c('pCatch')*p.fieldCatch+(pos==='P'?n('e')*E.field.error:0);
  e.throw+=c('pThrow')*p.fieldThrow;
  e.speed+=c('cover1B')*p.cover1B;
  e.eye+=c('whiffInd')*p.whiffInduced;
 }
 return e;
}

// ---- match start snapshot and settlement ----
// recap.box keeps only a few stats, so the cumulative stats of every player are saved at the first pitch and the
// difference at the end is this game's record (survives a reload because it is part of the saved match).
function growthStatsCopy(stats){return Object.fromEntries(Object.keys(freshStats()).map(k=>[k,Number.isInteger(stats?.[k])&&stats[k]>=0?stats[k]:0]));}
function growthStatDiff(stats,base){const d={};for(const k of Object.keys(freshStats()))d[k]=Math.max(0,(Number(stats?.[k])||0)-(Number(base?.[k])||0));return d;}
function beginMatchGrowth(t,m){
 if(!t||!m||m.done)return null;if(m.growth)return m.growth;
 const base={};for(const p of t.players)base[p.id]=growthStatsCopy(p.stats);
 m.growth={v:1,base,start:t.lineup.filter(x=>x.id).map(x=>({id:x.id,pos:x.pos})),track:newGrowthTrack(),done:false};
 return m.growth;
}
// Who played, in which slot, and the raw experience (before multipliers). Only players who played get experience.
function matchGrowthPlan(t,m){
 const g=m?.growth;if(!g)return [];
 const subs=(m.subs||[]).filter(s=>s&&s.side!==1&&s.inId),posOf=new Map(g.start.map(x=>[x.id,x.pos]));
 for(const s of subs)if(!posOf.has(s.inId))posOf.set(s.inId,s.pos);
 const out=new Set(subs.map(s=>s.outId)),started=new Set(g.start.map(x=>x.id)),finish=new Set((t.lineup||[]).map(x=>x.id));
 const by=growthTrackTotals(g.track),extraGame=m.inning>GROWTH.regularInnings,rows=[];
 for(const p of t.players){
  const pos=posOf.get(p.id)||null,tk=by[p.id];if(!pos&&!tk)continue;
  const base=g.base[p.id];if(!base)continue;
  const s=growthStatDiff(p.stats,base);
  rows.push({p,pos,stats:s,raw:matchEventExp(pos,s,tk||{},{full:started.has(p.id)&&!out.has(p.id),extra:extraGame&&finish.has(p.id)})});
 }
 return rows;
}
// Adds experience and raises abilities while it covers cost tier × K, up to the match-growth cap (experience past the cap is dropped).
function addMatchExp(t,p,raw,mult=()=>1){
 const e=p.exp??={},ups=[];
 for(const k of GROWTH_KEYS){const v=(Number(raw[k])||0)*mult(k);if(v>0)e[k]=growthRound((e[k]||0)+v);}
 for(const k of GROWTH_KEYS){
  if(!(k in e))continue;const from=p.a[k];
  for(let guard=0;guard<20;guard++){
   if(p.a[k]>=growthCap(t,p,k)){e[k]=0;break;}
   const need=growthNeed(p.a[k]);if(!(need>0)||e[k]<need)break;
   e[k]=growthRound(e[k]-need);p.a[k]++;
  }
  if(p.a[k]!==from)ups.push({k,from,to:p.a[k]});
 }
 return ups;
}
function settleMatchGrowth(t,m){
 const g=m?.growth;if(!t||!g||g.done)return null;
 const tier=Number.isInteger(m.league?.tier)?m.league.tier:(t.league?.tier??0),notes=[],gain={};
 for(const row of matchGrowthPlan(t,m)){
  const p=row.p,mult=k=>growthExpMultiplier(t,p,k,tier),got={};
  for(const k of GROWTH_KEYS){const v=(row.raw[k]||0)*mult(k);if(v>0)got[k]=Math.round(v*100)/100;}
  gain[p.id]=got;
  for(const u of addMatchExp(t,p,row.raw,mult))notes.push({id:p.id,name:p.name,k:u.k,from:u.from,to:u.to});
 }
 Object.assign(g,{done:true,tier,notes,gain});
 return notes;
}

// ---- retirement ----
function retirePlayer(t,p,reason,season){
 if(!t||!p||!t.players.some(x=>x.id===p.id))return null;
 const at=Date.now();
 if(typeof snapshotRoster26==='function')snapshotRoster26(t);// the finished game keeps its roster on the result screen
 p.departureKind='retired';p.departedAt26=at;delete p.exitPending26;
 p.retired={reason,season,age:Number.isInteger(p.age)?p.age:null,tier:t.league?.tier??0,games:p.stats?.games||0,at};
 t.departed??=[];if(!t.departed.some(x=>x.id===p.id))t.departed.push(p);
 t.players=t.players.filter(x=>x.id!==p.id);repairRoster26(t);// the bench fills the lineup; a short roster becomes a vacancy (P26 flow)
 news(t,p.name+' 은퇴',(Number.isInteger(p.age)?p.age+'세 · ':'')+GROWTH_RETIRE_LABELS[reason]+' · 함께한 '+(p.stats?.games||0)+'경기의 기록은 기록실 은퇴 선수 명단에 남습니다.'+(t.players.length<10?' 선수가 '+t.players.length+'명입니다. 다음 시즌 전에 영입해 주세요.':''));
 return p.retired;
}
function retirementBlock(t,p){
 if(!t||!p||!t.players.some(x=>x.id===p.id))return '이미 팀을 떠난 선수입니다.';
 if(live(t))return '경기가 끝난 뒤 은퇴를 지시할 수 있습니다.';
 if(t.league?.phase!=='offseason')return '은퇴 지시는 오프시즌(시즌과 시즌 사이)에만 할 수 있습니다.';
 return '';
}
// Manager order, offseason only (temporary choice for ②). Returns '' on success or the reason it was refused.
function orderRetirement(t,id){
 const p=t?.players.find(x=>x.id===id),block=retirementBlock(t,p);if(block)return block;
 const season=t.league.season;retirePlayer(t,p,'order',season);
 const last=t.aging?.log?.at(-1);if(last&&last.season===season)last.retired.push({id:p.id,name:p.name,age:p.retired.age,reason:'order'});
 return '';
}

// ---- season end (P09 order: … → 승강 → 나이·은퇴 → 오프시즌) ----
function agingSeasonEndStep(t,ctx,rnd=Math.random){
 const A=t.aging??={season:0,log:[]};
 if(A.season>=ctx.season)return null;// never twice for the same season (retry or reload)
 const entry={season:ctx.season,tier:ctx.tier??t.league?.tier??0,aged:0,rows:[],retired:[]};
 for(const p of t.players){const r=agePlayerSeason(p,rnd);entry.aged++;if(r.planned)entry.rows.push({id:p.id,name:p.name,age:r.age,drop:r.drop});}
 for(const p of t.players.slice()){
  const chance=retirementWishChance(p.age);
  if(chance&&rnd()<chance){retirePlayer(t,p,'wish',ctx.season);entry.retired.push({id:p.id,name:p.name,age:p.age,reason:'wish'});}
 }
 A.season=ctx.season;A.log.push(entry);if(A.log.length>GROWTH.logSeasons)A.log.splice(0,A.log.length-GROWTH.logSeasons);
 ctx.aging={aged:entry.aged,declined:entry.rows.filter(r=>Object.keys(r.drop).length).length,retired:entry.retired.map(r=>r.name)};
 news(t,'시즌 '+ctx.season+' 끝 · 선수 나이 +1',entry.aged+'명이 한 살 많아졌습니다.'+(entry.rows.length?' 노화 감소 '+entry.rows.length+'명.':'')+(entry.retired.length?' 은퇴 희망: '+entry.retired.map(r=>r.name+'('+r.age+'세)').join(', ')+'.':''));
 return entry;
}

// ---- old saves and validation ----
function ensureGrowthState(t){
 if(!t||!Array.isArray(t.players))return;
 const fresh=!t.aging;let estimated=0;
 for(const p of t.players)if(!Number.isInteger(p.age)){p.age=migratedAge(p);estimated++;}
 for(const p of Array.isArray(t.market)?t.market:[])if(p&&!Number.isInteger(p.age))p.age=migratedAge(p);
 if(fresh){
  // Seasons that ended before this update already show in the estimated age, so they are not aged again.
  const L=t.league;t.aging={season:L?Math.max(0,L.phase==='offseason'?L.season:L.season-1):0,log:[]};
  if(estimated&&(t.w+t.l+t.d>0||t.history?.length)&&Array.isArray(t.news))news(t,'선수 나이 추정','나이 기록이 없던 선수 '+estimated+'명의 나이를 19세 + 출전 경기 수 ÷ 10으로 정했습니다. 30세부터 시즌 끝마다 능력이 줄어듭니다.');
 }
}
function validateGrowthState(t){
 const fail=msg=>{throw Error('성장·나이 자료 오류 · '+msg);};
 const int=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b,num=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0,obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
 const checkPlayer=p=>{
  if(p.age!==undefined&&!int(p.age,15,150))fail('선수 나이');
  if(p.exp!==undefined){if(!obj(p.exp))fail('경기 경험치');for(const [k,v] of Object.entries(p.exp))if(!GROWTH_KEYS.includes(k)||!num(v)||v>1e4)fail('경기 경험치');}
 };
 for(const p of t.players||[])checkPlayer(p);
 for(const p of Array.isArray(t.market)?t.market:[])if(p)checkPlayer(p);
 for(const p of Array.isArray(t.departed)?t.departed:[]){
  if(!p)continue;checkPlayer(p);
  if(p.departureKind==='retired'){const r=p.retired;if(!obj(r)||!GROWTH_RETIRE_REASONS.includes(r.reason)||!int(r.season,1,1e6)||(r.age!=null&&!int(r.age,15,150)))fail('은퇴 기록');}
 }
 if(t.aging!==undefined){
  const A=t.aging;if(!obj(A)||!int(A.season,0,1e6)||!Array.isArray(A.log)||A.log.length>200)fail('나이 기록');
  for(const x of A.log){
   if(!obj(x)||!int(x.season,1,1e6)||!int(x.aged??0,0,1000)||!Array.isArray(x.rows)||!Array.isArray(x.retired))fail('나이 기록');
   if(x.rows.some(r=>!obj(r)||typeof r.id!=='string'||!int(r.age,15,150)||!obj(r.drop)||Object.entries(r.drop).some(([k,v])=>!GROWTH_KEYS.includes(k)||!int(v,0,100))))fail('노화 기록');
   if(x.retired.some(r=>!obj(r)||typeof r.id!=='string'||!GROWTH_RETIRE_REASONS.includes(r.reason)))fail('은퇴 기록');
  }
 }
 const g=t.match?.growth;if(g===undefined)return;
 if(!obj(g)||g.v!==1||!obj(g.base)||!Array.isArray(g.start)||!obj(g.track)||typeof g.done!=='boolean')fail('경기 성장 기록');
 for(const s of Object.values(g.base))if(!obj(s)||Object.values(s).some(v=>!Number.isInteger(v)||v<0))fail('경기 시작 기록');
 if(g.start.some(x=>!obj(x)||typeof x.id!=='string'||typeof x.pos!=='string'))fail('경기 시작 타순');
 const tr=g.track;
 if(!obj(tr.by)||!obj(tr.whiff)||!Array.isArray(tr.halves)||!int(tr.n,0,1e7)||(tr.last!==null&&typeof tr.last!=='string'))fail('경기 사건 기록');
 if(Object.values(tr.by).some(s=>!obj(s)||Object.values(s).some(v=>!num(v)))||Object.values(tr.whiff).some(v=>typeof v!=='boolean'))fail('경기 사건 기록');
 if(tr.halves.some(h=>!obj(h)||typeof h.k!=='string'||!int(h.o,0,99)||!int(h.r,0,999)||!int(h.w,0,999)||typeof h.rn!=='boolean'||(h.p!==null&&typeof h.p!=='string')))fail('경기 사건 기록');
 if(g.notes!==undefined&&(!Array.isArray(g.notes)||g.notes.some(x=>!obj(x)||typeof x.id!=='string'||!GROWTH_KEYS.includes(x.k)||!int(x.from,1,100)||!int(x.to,1,100)||x.to<=x.from)))fail('성장 알림');
}

// Game hooks.
// ② 나이·은퇴 runs after promotion and before the offseason entry (P09 season-end order).
addLeagueSeasonEndStep({id:'aging',run:(t,ctx)=>agingSeasonEndStep(t,ctx)},{after:'promotion'});
// recordRecap runs inside resolvePitch for every pitch, before reward(), so the last pitch is counted before the settlement.
const recordRecapBeforeGrowth=recordRecap;
recordRecap=function(m,e){const result=recordRecapBeforeGrowth(m,e);if(m?.growth&&!m.growth.done)trackGrowthEvent(m.growth.track,e);return result;};
// Experience is settled first: before wages, the league result and the season end (where aging and retirement run).
const rewardBeforeGrowth=reward;
reward=function(m){
 const t=team();
 if(!m.rewarded&&t&&t.match===m&&m.growth&&!m.growth.done){restoreAbilities();settleMatchGrowth(t,m);}
 const result=rewardBeforeGrowth(m);
 if(m.rewarded&&m.growth?.done&&t){const h=t.history?.find(x=>x.id===m.id);if(h&&!h.growth)h.growth=clone(m.growth.notes||[]);}
 return result;
};
// New entrants (P21): recruit candidates and the first twelve players get an age of 19~26 and the entry bonus;
// price and wage follow the raised abilities with the existing formula.
function growthRecomputePay(t,p,hire){const b=balance(t);p.salary=Math.max(3,Math.round(abilityPrice(p)*b.salaryFactor));if(hire)p.price=Math.round(abilityPrice(p)*b.hireFactor);}
const createMarketCandidatesBeforeGrowth=createMarketCandidates;
createMarketCandidates=function(t){return createMarketCandidatesBeforeGrowth(t).map(p=>{enterPlayerAge(p);growthRecomputePay(t,p,true);return p;});};
const ensureInitialRosterBeforeGrowth=ensureInitialRoster;
ensureInitialRoster=function(t){
 const empty=!t.players.length,result=ensureInitialRosterBeforeGrowth(t);
 // The wage ask was set from the abilities before the entry bonus, so it is drawn again.
 if(empty)for(const p of t.players){enterPlayerAge(p);growthRecomputePay(t,p,false);if(typeof wageState26==='function'){delete p.wage26;wageState26(p,t);}}
 return result;
};
const ensureClubBeforeGrowth=ensureClub;
ensureClub=function(t){ensureClubBeforeGrowth(t);if(t&&typeof data!=='undefined'&&data?.slots?.includes(t))ensureGrowthState(t);};
const validateTeamBeforeGrowth=validateTeam;
validateTeam=function(t){validateTeamBeforeGrowth(t);validateGrowthState(t);};
// A retirement can leave fewer than ten players; the next season waits until the roster is refilled.
const leagueNextSeasonBlockBeforeGrowth=leagueNextSeasonBlock;
leagueNextSeasonBlock=function(t){const block=leagueNextSeasonBlockBeforeGrowth(t);if(block)return block;if(t.players.length<10)return '선수가 '+t.players.length+'명입니다. 지명타자를 포함해 10명이 되도록 영입한 뒤 시작해 주세요.';return '';};

// UI integration.
const startMatchBeforeGrowth=startMatch;
startMatch=function(){
 const t=team(),before=t?.match?.id;startMatchBeforeGrowth();
 const m=t?.match;if(m&&m.id!==before&&!m.done&&!m.growth){beginMatchGrowth(t,m);save();}
};
function growthAgeText(p){return Number.isInteger(p?.age)?p.age+'세':'-';}
function growthExpHTML(t,p){
 const tier=t.league?.tier??0,rows=GROWTH_KEYS.map(k=>{const v=p.a[k],cap=growthCap(t,p,k),e=p.exp?.[k]||0;
  return '<div class="row between"><span>'+STATS[k]+' '+v+'</span><small>'+(v>=cap?'경기 성장 한도 '+cap:e.toFixed(1)+' / '+growthNeed(v))+'</small></div>';}).join('');
 return '<details class="growth-exp"><summary>경기 경험치 · '+growthAgeText(p)+' ×'+growthYouthMultiplier(p.age)+' · '+leagueTierName(tier)+' ×'+growthLeagueMultiplier(tier)+'</summary>'+rows+
  '<p class="tiny muted">경기에서 맡은 일을 할 때마다 그 능력의 경험치가 쌓이고, 필요한 만큼 모이면 +1입니다. 경기 성장은 '+GROWTH.matchCap+'까지(훈련은 따로). 출전한 선수만 받습니다.</p></details>';
}
function retireProfileHTML(t,p){
 const block=retirementBlock(t,p),next=Number.isInteger(p.age)?p.age+1:null,wish=retirementWishChance(next);
 return '<section class="growth-retire"><div class="row between"><h3>은퇴</h3><span class="pill">'+growthAgeText(p)+'</span></div>'+
  '<p class="tiny muted">'+(block?esc(block)+' ':'')+(wish?'다가오는 시즌 끝에 '+next+'세가 되며 '+Math.round(wish*100)+'% 확률로 은퇴를 원합니다. ':'')+'은퇴한 선수의 기록은 기록실에 남습니다.</p>'+
  '<button class="small" data-growth-retire="'+esc(p.id)+'" '+(block?'disabled':'')+'>은퇴시키기</button></section>';
}
function agingSummaryHTML(t,season=null){
 const last=t.aging?.log?.at(-1);if(!last||(season!==null&&last.season!==season))return '';
 const declined=last.rows.filter(r=>Object.keys(r.drop).length);
 return '<div class="stack growth-aging"><p><b>시즌 '+last.season+' 끝 · 나이 +1</b> ('+last.aged+'명)</p>'+
  (declined.length?'<p class="tiny">노화 감소: '+declined.map(r=>esc(r.name)+'('+r.age+'세) '+Object.entries(r.drop).map(([k,v])=>STATS[k]+' −'+v).join('·')).join(' / ')+'</p>':'<p class="tiny muted">노화로 능력이 줄어든 선수는 없습니다.</p>')+
  (last.retired.length?'<p class="tiny">은퇴: '+last.retired.map(r=>esc(r.name)+'('+(r.age??'-')+'세 · '+GROWTH_RETIRE_LABELS[r.reason]+')').join(', ')+'</p>':'')+
  '<p class="tiny muted">오프시즌에는 선수 화면에서 은퇴를 지시할 수 있습니다. 은퇴한 선수의 기록은 기록실에 남습니다.</p></div>';
}
function growthResultHTML(t,m){
 const g=m.growth,notes=g.notes||[],ids=Object.keys(g.gain||{});
 const detail=ids.map(id=>{const p=ply(t,id),got=g.gain[id]||{},parts=Object.entries(got).sort((a,b)=>b[1]-a[1]).map(([k,v])=>STATS[k]+' '+v.toFixed(2));
  return '<div class="row between"><span>'+esc(p?.name||'?')+'</span><small>'+(parts.join(' · ')||'-')+'</small></div>';}).join('');
 return '<section class="panel stack growth-result"><h3>경기 성장</h3>'+
  (notes.length?'<p class="gold">'+notes.map(n=>esc(n.name)+' '+STATS[n.k]+' +'+(n.to-n.from)).join(' · ')+'</p>':'<p class="muted">이번 경기에서 오른 능력은 없습니다. 출전한 '+ids.length+'명이 경험치를 쌓았습니다.</p>')+
  '<details><summary>선수별 경험치 · '+ids.length+'명 · '+leagueTierName(g.tier??0)+' ×'+growthLeagueMultiplier(g.tier??0)+'</summary>'+detail+'<p class="tiny muted">리그 배수와 젊은 선수 보너스(21세까지 ×1.5 · 25세까지 ×1.3)를 곱한 값입니다.</p></details>'+
  (m.league?.seasonEnd?agingSummaryHTML(t,m.league.season):'')+'</section>';
}
function retiredPlayersHTML(t){
 const list=(t.departed||[]).filter(p=>p?.departureKind==='retired'&&p.retired).slice().reverse();
 return '<section class="panel stack growth-retired"><h2>은퇴 선수</h2>'+(list.length?list.map(p=>'<details><summary>#'+p.number+' '+esc(p.name)+' · '+(p.retired.age??'-')+'세 은퇴 · 시즌 '+p.retired.season+' · '+GROWTH_RETIRE_LABELS[p.retired.reason]+' · 출전 '+(p.stats?.games||0)+'경기</summary>'+statBars(p)+playerRecords(p)+'</details>').join(''):'<p class="muted">아직 은퇴한 선수가 없습니다.</p>')+'</section>';
}
const playerListBeforeGrowth=playerListHTML;
playerListHTML=function(t){
 const root=document.createElement('div');root.innerHTML=playerListBeforeGrowth(t);
 for(const b of root.querySelectorAll('[data-action="select-player"][data-id]')){const p=t.players.find(x=>x.id===b.dataset.id),last=b.lastElementChild;if(p&&Number.isInteger(p.age)&&last)last.textContent+=' · '+p.age+'세';}
 return root.innerHTML;
};
const playersBeforeGrowth=playersArtworkHTML;
playersArtworkHTML=function(t){
 const html=playersBeforeGrowth(t),p=t.players.find(x=>x.id===selection)||t.players[0];if(!p)return html;
 const root=document.createElement('div');root.innerHTML=html;
 root.querySelector('.meta26')?.insertAdjacentHTML('beforeend','<div><small>나이</small><b>'+growthAgeText(p)+'</b></div>');
 const records=root.querySelector('.abilities26 .personal-records26');if(records)records.insertAdjacentHTML('beforebegin',growthExpHTML(t,p));else root.querySelector('.abilities26')?.insertAdjacentHTML('beforeend',growthExpHTML(t,p));
 root.querySelector('.profile26')?.insertAdjacentHTML('beforeend',retireProfileHTML(t,p));
 return root.innerHTML;
};
const marketBeforeGrowth=marketHTML;
marketHTML=function(t){
 const root=document.createElement('div');root.innerHTML=marketBeforeGrowth(t);
 for(const b of root.querySelectorAll('[data-v8="hire"][data-id]')){const p=t.market.find(x=>x.id===b.dataset.id);if(p&&Number.isInteger(p.age))b.closest('section')?.querySelector('h2')?.insertAdjacentHTML('afterend','<p class="gold">'+p.age+'세 입단</p>');}
 return root.innerHTML;
};
const leagueOffseasonBeforeGrowth=leagueOffseasonHTML;
leagueOffseasonHTML=function(t){const html=leagueOffseasonBeforeGrowth(t),at=html.indexOf('>')+1;return html.slice(0,at)+agingSummaryHTML(t)+html.slice(at);};
const renderBeforeGrowth=render;
render=function(){
 renderBeforeGrowth();const t=activeGame?team():null;if(!t)return;
 if(screen==='result'&&t.match?.done&&t.match.growth?.done){const html=growthResultHTML(t,t.match),anchor=$('#app .league-result')||$('#app .pagehead');if(anchor)anchor.insertAdjacentHTML('afterend',html);else $('#app').insertAdjacentHTML('afterbegin',html);}
 if(screen==='records'){const anchor=$('#app .league-records');if(anchor)anchor.insertAdjacentHTML('afterend',retiredPlayersHTML(t));else $('#app').insertAdjacentHTML('afterbegin',retiredPlayersHTML(t));}
};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-growth-retire]');if(!b||b.disabled||!activeGame)return;
 const t=team(),p=t?.players.find(x=>x.id===b.dataset.growthRetire),block=retirementBlock(t,p);if(block){toast(block);return;}
 const left=t.players.length-1;
 confirmBox(p.name+' 은퇴','#'+p.number+' '+p.name+'('+growthAgeText(p)+')을 은퇴시킵니다. 되돌릴 수 없습니다. 개인 기록은 기록실 은퇴 선수 명단에 남습니다.'+(left<10?' 은퇴 뒤 선수가 '+left+'명이라 다음 시즌 전에 영입해야 합니다.':''),()=>{
  const error=orderRetirement(team(),p.id);if(error){toast(error);return;}
  if(selection===p.id)selection=team().players[0]?.id||null;save();render();toast(p.name+' 선수가 은퇴했습니다.');
 },'은퇴시키기');
});
const growthStyle=document.createElement('style');growthStyle.textContent='.growth-exp{margin-top:14px}.growth-exp summary,.growth-retired summary{cursor:pointer;color:#ffe29b;padding:6px 0}.growth-exp .row{padding:3px 0;font-size:13px}.growth-retire{margin-top:12px;text-align:left}.growth-retire h3{font-size:16px}.growth-result{margin:12px 0}.growth-result .row{font-size:13px;padding:2px 0}.growth-aging{margin:6px 0}';
document.head.append(growthStyle);

;document.currentScript?.remove();

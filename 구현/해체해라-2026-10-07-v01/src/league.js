// League and season, build step ① (2026-11-11).
// P09 리그 구성·순위·승강, P12 시즌 단위 계약, P19 리그별 수입, P20 리그별 영입 시장, P17 경기장 부분(승격 조건·오프시즌 확장·새 확장비).
// Layout: pure rules first, then the "Game hooks" marker (wrappers of game functions), then the "UI integration"
// marker (screens and buttons). Tests slice the source at those two marker comments, so keep them unique.
// Extension points for later steps (do not rewrite this file for them):
//  - Season end order (P09): LEAGUE_SEASON_END_STEPS runs rank → prize → promotion → offseason.
//    ③ 여론 정산·해체 판정: addLeagueSeasonEndStep({id:'opinion',run(t,ctx){...}},{after:'prize'}) then {id:'disband'} after 'opinion'.
//      A disband step can push 'promotion' into ctx.skip and undo ctx.prize (해체되면 상금도 사라짐).
//    ④ 회생권 강등 막기: set ctx.relegationBlocked=true in a step before 'promotion'.
//    ② 나이·은퇴: addLeagueSeasonEndStep({id:'aging',run(t,ctx){...}},{after:'promotion'}).
//  - Every league game: LEAGUE_MATCH_HOOKS.push((t,m,info)=>{...}) runs after the result is in the table (③ 경기별 여론).
//  - New season: addLeagueSeasonStartStep(step,{before:'teams'}).

const LEAGUE={
 names:['동네 리그','지역 리그','2부 리그','1부 리그'],
 seasonGames:10,teams:6,
 mids:[39,51,63,75],              // P09: tier mid-table strength (mean of the 9 non-stamina abilities)
 offsets:[6,3,0,-3,-6],           // P09: the five AI clubs around the mid
 points:{w:2,d:1,l:0},            // P09
 payout:[0,300,800,1500],         // P19: per game, home and away (만원)
 prize:[[500,200,100],[2000,1000,500],[5000,2500,1000],[10000,5000,2500]],// P19: 1st/2nd/3rd
 crowd:[1,1.1,1.25,1.4],          // P19: crowd demand, still capped by seats
 marketOffset:[0,5,10,15],        // P20: recruit candidates, 9 abilities, cap 100
 stadiumNeed:[1,1,2,3],           // P17: grade needed to play in each tier (2부 2등급 · 1부 3등급)
 stadiumCost:[0,8000,10000,15000,20000],// P17: grade n → n+1 costs stadiumCost[n]
 maxStadium:5,
 // Temporary (①, Claude): AI-vs-AI light model. Runs ~ Poisson(2.3 × e^(±0.023 × strength gap)), about the
 // real engine's 2.3 runs per side at equal strength; a tie goes to extra innings 70% of the time (one run,
 // side weighted by expected runs), otherwise a draw (about 5% draws, like the real engine).
 aiRuns:2.3,aiSlope:.023,aiExtra:.7,aiMaxRuns:20,
 styleBonus:4,                     // Temporary (①): team style +4 on its abilities, the rest lowered to keep the mean
};
const LEAGUE_NINE=['contact','power','eye','speed','sense','catch','throw','velocity','control'];
const LEAGUE_STYLES={batting:{label:'타격형',keys:['contact','power','eye']},pitching:{label:'투수형',keys:['velocity','control']},defense:{label:'수비형',keys:['sense','catch','throw']},running:{label:'주루형',keys:['speed','sense']},balanced:{label:'균형형',keys:[]}};
const LEAGUE_TIE_LABELS={h2h:'맞대결 승점',diff:'득실점 차',rf:'득점',lot:'추첨'};
// Temporary (①, Claude): seven resident clubs per tier; five are drawn each season. Colors are COLORS indexes.
const LEAGUE_POOL=[
 [{id:'n1',name:'골목 고양이즈',primary:8,secondary:0,style:'running'},{id:'n2',name:'약수터 레인저스',primary:11,secondary:5,style:'balanced'},{id:'n3',name:'반찬가게 파이터즈',primary:2,secondary:3,style:'batting'},{id:'n4',name:'놀이터 유니콘즈',primary:12,secondary:13,style:'defense'},{id:'n5',name:'빌라 비둘기즈',primary:4,secondary:3,style:'pitching'},{id:'n6',name:'새벽 조기회',primary:10,secondary:4,style:'balanced'},{id:'n7',name:'동네 히어로즈',primary:6,secondary:3,style:'batting'}],
 [{id:'r1',name:'강변 수달즈',primary:9,secondary:5,style:'defense'},{id:'r2',name:'시장통 상인회',primary:7,secondary:0,style:'batting'},{id:'r3',name:'터미널 익스프레스',primary:6,secondary:10,style:'running'},{id:'r4',name:'철길 기관차',primary:0,secondary:8,style:'pitching'},{id:'r5',name:'산골 멧돼지즈',primary:11,secondary:7,style:'batting'},{id:'r6',name:'항구 갈매기즈',primary:3,secondary:4,style:'balanced'},{id:'r7',name:'불꽃 나인',primary:2,secondary:10,style:'pitching'}],
 [{id:'b1',name:'낭만 유니온',primary:13,secondary:5,style:'balanced'},{id:'b2',name:'철벽 스타즈',primary:4,secondary:7,style:'defense'},{id:'b3',name:'남부 타이탄즈',primary:1,secondary:3,style:'batting'},{id:'b4',name:'북부 블리자드',primary:6,secondary:3,style:'pitching'},{id:'b5',name:'서해 샤크스',primary:0,secondary:6,style:'running'},{id:'b6',name:'동해 돌핀스',primary:11,secondary:3,style:'running'},{id:'b7',name:'중앙 코메츠',primary:8,secondary:4,style:'batting'}],
 [{id:'a1',name:'막강 베어즈',primary:9,secondary:7,style:'batting'},{id:'a2',name:'수도 킹스',primary:13,secondary:7,style:'balanced'},{id:'a3',name:'황금 이글스',primary:7,secondary:0,style:'pitching'},{id:'a4',name:'은하 갤럭시',primary:4,secondary:12,style:'running'},{id:'a5',name:'천둥 썬더스',primary:10,secondary:0,style:'batting'},{id:'a6',name:'제국 엠퍼러즈',primary:1,secondary:5,style:'defense'},{id:'a7',name:'전설 레전즈',primary:0,secondary:7,style:'pitching'}],
];

// ---- small helpers ----
function leagueTierName(tier){return LEAGUE.names[tier]||LEAGUE.names[0];}
function leagueTarget(tier,offset=0){return LEAGUE.mids[tier]+offset;}
// P09 (simulator): level = (target − 43.5) ÷ 4 in opponentAbility(raw + 6 + level × 4), raw 20~55.
function leagueLevel(target){return (target-43.5)/4;}
function leaguePayout(tier){return LEAGUE.payout[tier]||0;}
function leaguePrize(tier,rank){return LEAGUE.prize[tier]?.[rank-1]||0;}
function leagueCrowd(tier){return LEAGUE.crowd[tier]||1;}
function leagueMarketOffset(tier){return LEAGUE.marketOffset[tier]||0;}
function leagueMean(p){return LEAGUE_NINE.reduce((s,k)=>s+p.a[k],0)/9;}
function leagueSigned(n){return n>0?'+'+n:String(n);}

// Seeded random numbers (mulberry32) kept in the save, so AI results and draws can be replayed in tests.
function leagueSeed(){try{const n=crypto.getRandomValues(new Uint32Array(1))[0]>>>0;if(n)return n;}catch(e){}return (Math.floor(Math.random()*4294967295)>>>0)||1;}
function leagueRandom(L){let a=L.rng=(L.rng+0x6D2B79F5)>>>0;a=Math.imul(a^(a>>>15),a|1);a^=a+Math.imul(a^(a>>>7),a|61);return ((a^(a>>>14))>>>0)/4294967296;}
function leagueShuffle(L,list){const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(leagueRandom(L)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function leaguePoisson(L,lambda){const limit=Math.exp(-lambda);let k=0,p=leagueRandom(L);while(p>limit&&k<LEAGUE.aiMaxRuns){k++;p*=leagueRandom(L);}return k;}

// ---- AI clubs ----
function applyLeagueStyle(p,style){
 const keys=LEAGUE_STYLES[style]?.keys||[];if(!keys.length)return p;
 const rest=LEAGUE_NINE.filter(k=>!keys.includes(k)),minus=Math.round(LEAGUE.styleBonus*keys.length/rest.length);
 for(const k of LEAGUE_NINE)p.a[k]=clamp(p.a[k]+(keys.includes(k)?LEAGUE.styleBonus:-minus),1,k==='sense'?70:100);
 return p;
}
// Ten starters (eight fielders, DH, pitcher in generation order like the old opponent) and three relief pitchers.
function buildLeagueTeam(def,tier,offset){
 const target=leagueTarget(tier,offset),level=leagueLevel(target),players=[];
 for(let i=0;i<13;i++){
  const p=player(false,players.map(x=>x.number),true,level);
  p.name=i<10?NAMES[13+i%11]:(NAMES.find(n=>!players.some(x=>x.name===n))||p.name);
  for(const k of LEAGUE_NINE)p.a[k]=Math.round(p.a[k]);
  applyLeagueStyle(p,def.style);p.energy=p.a.stamina;players.push(p);
 }
 const strength=Math.round(players.slice(0,10).reduce((s,p)=>s+leagueMean(p),0))/10;
 return {id:def.id,name:def.name,primary:def.primary,secondary:def.secondary,style:def.style,offset,target,level,strength,players};
}
function drawLeagueTeams(L){
 const chosen=leagueShuffle(L,LEAGUE_POOL[L.tier]).slice(0,LEAGUE.teams-1),offsets=leagueShuffle(L,LEAGUE.offsets);
 return chosen.map((def,i)=>buildLeagueTeam(def,L.tier,offsets[i]));
}
// Circle method: our club stays fixed, the five AI clubs rotate. Rounds 6~10 repeat rounds 1~5 with home and away
// swapped, so our club alternates home, away, home … over all ten rounds and meets every club once at home and once away.
function buildLeagueSchedule(ids){
 let ring=['us',...ids];const first=[];
 for(let r=0;r<5;r++){
  first.push([[ring[0],ring[5]],[ring[1],ring[4]],[ring[2],ring[3]]].map(([x,y],k)=>(r+k)%2===0?{home:x,away:y}:{home:y,away:x}));
  ring=[ring[0],ring[5],ring[1],ring[2],ring[3],ring[4]];
 }
 return [...first,...first.map(round=>round.map(g=>({home:g.away,away:g.home})))];
}
function leagueSetupSeason(L){
 L.teams=drawLeagueTeams(L);
 L.schedule=buildLeagueSchedule(L.teams.map(x=>x.id));
 L.results=[];L.round=0;L.phase='season';
 // ④ 추첨 is drawn once per season and kept, so the table never reshuffles between screens.
 L.lots=Object.fromEntries(['us',...L.teams.map(x=>x.id)].map(id=>[id,leagueRandom(L)]));
}
function newLeagueState(tier=0,season=1,seed=leagueSeed()){
 const L={version:1,tier,season,phase:'season',round:0,rng:(seed>>>0)||1,teams:[],schedule:[],results:[],lots:{},history:[],pendingPromotion:null};
 leagueSetupSeason(L);return L;
}
function leagueTeam(L,id){return L?.teams.find(x=>x.id===id)||null;}
function leagueTeamName(t,id){return id==='us'?t.name:leagueTeam(t.league,id)?.name||'?';}
function leagueFixture(L,round=L.round){
 const g=L.schedule[round]?.find(x=>x.home==='us'||x.away==='us');if(!g)return null;
 const usHome=g.home==='us';return {round,usHome,oppId:usHome?g.away:g.home,home:g.home,away:g.away};
}

// ---- results and table ----
function recordLeagueResult(L,round,home,away,homeRuns,awayRuns){
 if(L.results.some(g=>g.round===round&&g.home===home&&g.away===away))return false;
 L.results.push({round,home,away,score:[homeRuns,awayRuns]});return true;
}
function simulateLeagueGame(L,home,away){
 const gap=home.strength-away.strength,lh=LEAGUE.aiRuns*Math.exp(LEAGUE.aiSlope*gap),la=LEAGUE.aiRuns*Math.exp(-LEAGUE.aiSlope*gap);
 let h=leaguePoisson(L,lh),a=leaguePoisson(L,la);
 if(h===a&&leagueRandom(L)<LEAGUE.aiExtra){if(leagueRandom(L)<lh/(lh+la))h++;else a++;}
 return [h,a];
}
function playOtherLeagueGames(L,round){
 for(const g of L.schedule[round]||[]){
  if(g.home==='us'||g.away==='us')continue;
  const [h,a]=simulateLeagueGame(L,leagueTeam(L,g.home),leagueTeam(L,g.away));recordLeagueResult(L,round,g.home,g.away,h,a);
 }
}
function leaguePointsFor(rf,ra){return rf>ra?LEAGUE.points.w:rf<ra?LEAGUE.points.l:LEAGUE.points.d;}
// P09: points (W2 D1 L0); equal points → head-to-head points among the tied clubs → run difference → runs scored → lottery.
function leagueStandings(L){
 const ids=['us',...L.teams.map(x=>x.id)],rows=new Map(ids.map(id=>[id,{id,gp:0,w:0,d:0,l:0,pts:0,rf:0,ra:0,diff:0,h2h:0}]));
 const add=(id,rf,ra)=>{const r=rows.get(id);if(!r)return;r.gp++;r.rf+=rf;r.ra+=ra;r.pts+=leaguePointsFor(rf,ra);if(rf>ra)r.w++;else if(rf<ra)r.l++;else r.d++;};
 for(const g of L.results){add(g.home,g.score[0],g.score[1]);add(g.away,g.score[1],g.score[0]);}
 const list=[...rows.values()];for(const r of list)r.diff=r.rf-r.ra;
 const groups=new Map();for(const r of list){if(!groups.has(r.pts))groups.set(r.pts,[]);groups.get(r.pts).push(r);}
 for(const group of groups.values()){
  if(group.length<2)continue;const set=new Set(group.map(r=>r.id));
  for(const g of L.results)if(set.has(g.home)&&set.has(g.away)){rows.get(g.home).h2h+=leaguePointsFor(g.score[0],g.score[1]);rows.get(g.away).h2h+=leaguePointsFor(g.score[1],g.score[0]);}
 }
 const lot=id=>Number(L.lots?.[id])||0;
 list.sort((a,b)=>b.pts-a.pts||b.h2h-a.h2h||b.diff-a.diff||b.rf-a.rf||lot(b.id)-lot(a.id)||(a.id<b.id?-1:a.id>b.id?1:0));
 list.forEach((r,i)=>{r.rank=i+1;const n=list[i+1];r.tieBreak=n&&n.pts===r.pts?(r.h2h!==n.h2h?'h2h':r.diff!==n.diff?'diff':r.rf!==n.rf?'rf':'lot'):null;});
 return list;
}

// ---- contracts (P12) ----
function leagueGamesLeft(L){return Math.max(0,LEAGUE.seasonGames-L.round);}
// A contract signed now runs to the end of this season, or of the next season when signed in the offseason.
function leagueContractGames(t){const L=t?.league;if(!L||L.phase!=='season')return LEAGUE.seasonGames;return Math.max(1,leagueGamesLeft(L));}
// Every running contract ends with the season: its remaining games always equal the games left in the season.
function syncSeasonContracts(t){
 const L=t?.league;if(!L||L.phase!=='season')return;
 const left=leagueGamesLeft(L);
 for(const p of t.players){
  if(!(p.contract>0))continue;
  if(left>0){p.contract=left;continue;}
  p.contract=0;if(!wageState26(p,t).expired)renewAsk26(t,p);
 }
}
// Existing saves (P12 2026-11-11): every current contract runs to the end of the first season.
function migrateLeagueContracts(t){for(const p of t.players){p.contract=LEAGUE.seasonGames;if(p.wage26)p.wage26.expired=false;}}
function ensureLeague(t,seed){
 if(!t)return null;
 if(t.balance&&Object.prototype.hasOwnProperty.call(t.balance,'contractGames'))delete t.balance.contractGames;
 if(!t.league){
  // Existing saves and new clubs start in 동네 리그 season 1 with an empty season record; cumulative w/l/d stay.
  t.league=newLeagueState(0,1,seed);migrateLeagueContracts(t);
  if(Array.isArray(t.news))news(t,leagueTierName(0)+' 시즌 1 개막','한 시즌 10경기 · 1위 승격, 6위 강등. 모든 계약은 시즌 끝까지입니다. 상대: '+t.league.teams.map(x=>x.name).join(' · '));
 }
 if(!(t.match&&!t.match.done))syncSeasonContracts(t);
 return t.league;
}

// ---- per-game settlement ----
const LEAGUE_MATCH_HOOKS=[];
function leagueMatchCounts(t,m){const L=t?.league,x=m?.league;return !!(L&&x&&!x.recorded&&L.phase==='season'&&x.season===L.season&&x.round===L.round);}
function payLeaguePayout(t,m){
 if(!leagueMatchCounts(t,m)||Number.isFinite(m.league.payout))return 0;
 const amount=leaguePayout(t.league.tier);m.league.payout=amount;
 if(amount)gain(t,amount,'리그 배당금 · '+leagueTierName(t.league.tier));
 return amount;
}
function settleLeagueMatch(t,m){
 if(!leagueMatchCounts(t,m))return null;
 const L=t.league,x=m.league,fx=leagueFixture(L,x.round);if(!fx||fx.oppId!==x.oppId)return null;
 const us=m.score[0],them=m.score[1];
 recordLeagueResult(L,x.round,fx.home,fx.away,fx.usHome?us:them,fx.usHome?them:us);
 playOtherLeagueGames(L,x.round);
 L.round++;x.recorded=true;
 syncSeasonContracts(t);
 const info={season:L.season,tier:L.tier,round:x.round,result:us>them?'W':us<them?'L':'D',payout:x.payout||0,last:L.round>=LEAGUE.seasonGames};
 for(const hook of LEAGUE_MATCH_HOOKS)hook(t,m,info);
 if(info.last)x.seasonEnd=runSeasonEnd(t);
 return info;
}

// ---- season end (P09 order; ① implements steps 1, 2, 5 and 7) ----
function leagueAddStep(list,step,{before,after}={}){const anchor=before||after,i=anchor?list.findIndex(s=>s.id===anchor):-1;if(i<0)list.push(step);else list.splice(before?i:i+1,0,step);return step;}
function leagueRankStep(t,ctx){
 const rows=leagueStandings(t.league),us=rows.find(r=>r.id==='us');
 ctx.table=rows.map(r=>({id:r.id,name:leagueTeamName(t,r.id),gp:r.gp,pts:r.pts,w:r.w,d:r.d,l:r.l,rf:r.rf,ra:r.ra,tieBreak:r.tieBreak}));
 Object.assign(ctx,{rank:us.rank,pts:us.pts,w:us.w,d:us.d,l:us.l,rf:us.rf,ra:us.ra});
}
function leaguePrizeStep(t,ctx){ctx.prize=leaguePrize(ctx.tier,ctx.rank);if(ctx.prize)gain(t,ctx.prize,leagueTierName(ctx.tier)+' '+ctx.rank+'위 상금');}
function leagueMoveStep(t,ctx){
 const L=t.league,top=LEAGUE.names.length-1;
 if(ctx.rank===1&&ctx.tier===top)ctx.move='champion';
 else if(ctx.rank===1){
  const need=LEAGUE.stadiumNeed[ctx.tier+1];
  if(t.stadium>=need){L.tier=ctx.tier+1;ctx.move='up';}
  else{L.pendingPromotion={to:ctx.tier+1,need,season:ctx.season};ctx.move='blocked';}// expand in this offseason or stay
 }
 else if(ctx.rank===LEAGUE.teams&&ctx.tier>0){if(ctx.relegationBlocked)ctx.move='saved';else{L.tier=ctx.tier-1;ctx.move='down';}}
 else ctx.move='stay';// 동네 리그 6위 stays (③ adds the opinion penalty)
 ctx.nextTier=L.tier;
}
function leagueMoveText(entry,L){
 const next=leagueTierName(entry.nextTier);
 return {up:next+' 승격',down:next+' 강등',champion:'1부 리그 우승!',saved:'강등을 막았습니다',stay:'잔류',
  blocked:'1위 · 경기장 '+(L?.pendingPromotion?.need||LEAGUE.stadiumNeed[entry.tier+1])+'등급이 없어 승격 보류'}[entry.move]||'잔류';
}
function leagueOffseasonStep(t,ctx){
 const L=t.league;L.phase='offseason';
 const entry={season:ctx.season,tier:ctx.tier,rank:ctx.rank,pts:ctx.pts,w:ctx.w,d:ctx.d,l:ctx.l,rf:ctx.rf,ra:ctx.ra,prize:ctx.prize||0,move:ctx.move,nextTier:L.tier,at:Date.now(),table:ctx.table};
 L.history.push(entry);ctx.summary={...entry};delete ctx.summary.table;
 news(t,'시즌 '+ctx.season+' 종료 · '+leagueTierName(ctx.tier)+' '+ctx.rank+'위',leagueMoveText(entry,L)+(entry.prize?' · 상금 '+money(entry.prize):'')+'. 오프시즌에 재계약을 마치고 "다음 시즌 시작"을 눌러 주세요.');
}
const LEAGUE_SEASON_END_STEPS=[
 {id:'rank',run:leagueRankStep},
 {id:'prize',run:leaguePrizeStep},
 // ③ 'opinion' and 'disband' go here.
 {id:'promotion',run:leagueMoveStep},
 // ② 'aging' goes here.
 {id:'offseason',run:leagueOffseasonStep},
];
function addLeagueSeasonEndStep(step,where){return leagueAddStep(LEAGUE_SEASON_END_STEPS,step,where);}
function runSeasonEnd(t){
 const L=t.league,ctx={season:L.season,tier:L.tier,skip:[]};
 for(const step of LEAGUE_SEASON_END_STEPS.slice())if(!ctx.skip.includes(step.id))step.run(t,ctx);
 return ctx.summary||null;
}
// 1st place without the stadium grade: promotion waits for an expansion in this offseason; otherwise the club stays.
function resolvePendingPromotion(t,final=false){
 const L=t.league,p=L?.pendingPromotion;if(!p)return false;
 const last=L.history.at(-1),mine=last&&last.season===p.season;
 if(t.stadium>=p.need){
  L.tier=p.to;L.pendingPromotion=null;if(mine){last.move='up';last.nextTier=p.to;}
  news(t,leagueTierName(p.to)+' 승격 확정','경기장 '+t.stadium+'등급 조건을 채웠습니다. 다음 시즌은 '+leagueTierName(p.to)+'에서 뜁니다.');
  return true;
 }
 if(final){L.pendingPromotion=null;news(t,'승격 보류 · '+leagueTierName(L.tier)+' 잔류','경기장 '+p.need+'등급이 필요합니다. 다음 시즌에 다시 1위를 하면 승격합니다.');}
 return false;
}

// ---- stadium (P17 section 1) ----
function stadiumUpgradeCost(t){return LEAGUE.stadiumCost[t.stadium]||0;}
function stadiumUpgradeBlock(t){
 if(t.match&&!t.match.done)return '경기가 끝난 뒤 확장할 수 있습니다.';
 if(t.stadium>=LEAGUE.maxStadium)return '경기장이 최대 등급입니다.';
 if(t.league&&t.league.phase!=='offseason')return '경기장 확장은 오프시즌(시즌과 시즌 사이)에만 할 수 있습니다.';
 if(!(t.funds>=stadiumUpgradeCost(t)))return '확장 자금이 부족합니다. '+money(stadiumUpgradeCost(t))+'이 필요합니다.';
 return '';
}
function expandStadium(t){
 const block=stadiumUpgradeBlock(t);if(block)return block;
 const cost=stadiumUpgradeCost(t);if(!spend(t,cost,'경기장 확장 · '+t.stadium+'→'+(t.stadium+1)+'등급'))return '확장 자금이 부족합니다.';
 t.stadium++;news(t,'경기장 '+t.stadium+'등급 확장','좌석 '+(t.stadium*2000).toLocaleString('ko-KR')+'석 · 건물 자리 '+(5+(t.stadium-1)*3)+'칸. 다음 시즌 홈경기부터 늘어난 좌석을 씁니다.');
 resolvePendingPromotion(t);return '';
}

// ---- new season (P09 step 8) ----
function leagueNextSeasonBlock(t){
 const L=t?.league;if(!L)return '리그 자료가 없습니다.';
 if(L.phase!=='offseason')return '시즌이 아직 진행 중입니다.';
 if(t.match&&!t.match.done)return '경기가 끝난 뒤 시작할 수 있습니다.';
 const unsigned=t.players.filter(p=>!(p.contract>0)).length;
 if(unsigned)return '재계약하지 않은 선수가 '+unsigned+'명 있습니다. 재정 화면에서 재계약해 주세요.';
 return '';
}
const LEAGUE_SEASON_START_STEPS=[
 {id:'promotion',run:t=>resolvePendingPromotion(t,true)},
 // ② aging at season start (the simulator's order) would go here.
 {id:'teams',run:t=>{const L=t.league;L.season++;leagueSetupSeason(L);t.marketRound=null;}},// recruit list follows the new tier
 {id:'contracts',run:t=>syncSeasonContracts(t)},
 {id:'news',run:t=>{const L=t.league;news(t,leagueTierName(L.tier)+' 시즌 '+L.season+' 개막','상대: '+L.teams.map(x=>x.name).join(' · ')+' · 10경기, 홈과 원정을 번갈아 치릅니다.');}},
];
function addLeagueSeasonStartStep(step,where){return leagueAddStep(LEAGUE_SEASON_START_STEPS,step,where);}
function startNextSeason(t){const block=leagueNextSeasonBlock(t);if(block)return block;for(const step of LEAGUE_SEASON_START_STEPS.slice())step.run(t);return '';}

// ---- match opponent and market ----
function leagueOpponentTeam(t,id){
 const rec=leagueTeam(t.league,id);if(!rec)return null;
 let primary=rec.primary,secondary=rec.secondary;
 const ours=COLORS[t.primary][1],far=i=>colorDistance(COLORS[i][1],ours);
 // Temporary (①): a resident club whose color is too close to ours wears the farthest color for that game.
 if(far(primary)<=125){primary=COLORS.map((c,i)=>i).reduce((a,b)=>far(b)>far(a)?b:a);secondary=primary===5?4:5;}
 const o=newTeam(rec.name,primary,secondary,true);
 o.players=clone(rec.players).map(p=>Object.assign(p,{stats:freshStats(),energy:p.a.stamina}));
 o.lineup=dhLineup(o.players);o.setupStage='complete';o.reliefRoster23=true;
 o.leagueTeamId=rec.id;o.leagueLevel=rec.level;o.leagueStyle=rec.style;
 return o;
}
function applyMarketOffset(p,tier,t){
 const add=leagueMarketOffset(tier);
 if(add)for(const k of LEAGUE_NINE)p.a[k]=Math.min(100,p.a[k]+add);
 const b=balance(t);p.salary=Math.max(3,Math.round(abilityPrice(p)*b.salaryFactor));p.price=Math.round(abilityPrice(p)*b.hireFactor);
 return p;
}

// ---- save validation: a missing league is fine (old saves get defaults in ensureClub) ----
function validateLeagueState(t){
 const fail=msg=>{throw Error('리그 자료 오류 · '+msg);},int=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b,top=LEAGUE.names.length-1;
 const x=t.match?.league;
 if(x!==undefined&&(!x||typeof x!=='object'||!int(x.season,1,1e6)||!int(x.tier,0,top)||!int(x.round,0,LEAGUE.seasonGames-1)||typeof x.oppId!=='string'||(x.payout!==undefined&&!Number.isFinite(x.payout))))fail('경기 정보');
 const L=t.league;if(L===undefined)return;
 if(!L||typeof L!=='object')fail('형식');
 if(!int(L.tier,0,top)||!int(L.season,1,1e6)||!['season','offseason'].includes(L.phase)||!int(L.round,0,LEAGUE.seasonGames)||!int(L.rng,0,4294967295))fail('시즌 상태');
 if(!Array.isArray(L.teams)||L.teams.length!==LEAGUE.teams-1)fail('상대 팀 수');
 const ids=new Set(['us']);
 for(const o of L.teams){
  if(!o||typeof o.id!=='string'||!o.id||ids.has(o.id)||typeof o.name!=='string'||!o.name||o.name.length>12||!int(o.primary,0,COLORS.length-1)||!int(o.secondary,0,COLORS.length-1)||!(o.style in LEAGUE_STYLES)||![o.offset,o.target,o.level,o.strength].every(Number.isFinite)||!Array.isArray(o.players)||o.players.length<10||o.players.length>35)fail('상대 팀');
  try{o.players.forEach(validatePlayer);}catch(e){fail('상대 선수 · '+e.message);}
  if(new Set(o.players.map(p=>p.id)).size!==o.players.length||new Set(o.players.map(p=>p.number)).size!==o.players.length)fail('상대 선수 중복');
  ids.add(o.id);
 }
 if(!Array.isArray(L.schedule)||L.schedule.length!==LEAGUE.seasonGames)fail('일정');
 for(const round of L.schedule){if(!Array.isArray(round)||round.length!==LEAGUE.teams/2)fail('일정');const seen=new Set();for(const g of round){if(!g||!ids.has(g.home)||!ids.has(g.away)||g.home===g.away||seen.has(g.home)||seen.has(g.away))fail('일정');seen.add(g.home);seen.add(g.away);}}
 if(!Array.isArray(L.results))fail('경기 결과');
 for(const g of L.results)if(!g||!int(g.round,0,LEAGUE.seasonGames-1)||!ids.has(g.home)||!ids.has(g.away)||!Array.isArray(g.score)||g.score.length!==2||!g.score.every(n=>int(n,0,999)))fail('경기 결과');
 if(L.lots!==undefined&&(!L.lots||typeof L.lots!=='object'||Object.values(L.lots).some(v=>!Number.isFinite(v))))fail('추첨');
 if(!Array.isArray(L.history))fail('시즌 기록');
 for(const h of L.history)if(!h||!int(h.season,1,1e6)||!int(h.tier,0,top)||!int(h.rank,1,LEAGUE.teams)||!int(h.nextTier,0,top)||!Number.isFinite(h.prize))fail('시즌 기록');
 if(L.pendingPromotion!=null&&(!int(L.pendingPromotion.to,1,top)||!int(L.pendingPromotion.need,1,LEAGUE.maxStadium)))fail('승격 보류');
}

// Game hooks.
// Opponent and relief-pitcher strength follow the league tier instead of cumulative wins (P09).
opponentLevel=function(t){return leagueLevel(leagueTarget(t?.league?.tier??0));};
crowdDemand=function(t){return leagueCrowd(t?.league?.tier??0);};
contractGamesFor26=function(t){return leagueContractGames(t);};
let leagueStartFixture=null;// set only while startMatch builds a league game
const matchHomeSideBeforeLeague=matchHomeSide;
matchHomeSide=function(t){return leagueStartFixture&&t===leagueStartFixture.team?(leagueStartFixture.usHome?0:1):matchHomeSideBeforeLeague(t);};
const opponentBeforeLeague=opponent;
opponent=function(t){const o=leagueStartFixture&&t===leagueStartFixture.team?leagueOpponentTeam(t,leagueStartFixture.oppId):null;return o||opponentBeforeLeague(t);};
const createMarketCandidatesBeforeLeague=createMarketCandidates;
createMarketCandidates=function(t){return createMarketCandidatesBeforeLeague(t).map(p=>applyMarketOffset(p,t?.league?.tier??0,t));};
const ensureClubBeforeLeague=ensureClub;
ensureClub=function(t){ensureClubBeforeLeague(t);if(t&&typeof data!=='undefined'&&data?.slots?.includes(t))ensureLeague(t);};
const validateTeamBeforeLeague=validateTeam;
validateTeam=function(t){validateTeamBeforeLeague(t);validateLeagueState(t);};
// The league payout is credited before wages are paid, so it can cover the same game's salary.
const rewardBeforeLeague=reward;
reward=function(m){
 if(m.rewarded)return rewardBeforeLeague(m);
 const t=team();payLeaguePayout(t,m);
 const result=rewardBeforeLeague(m);
 if(m.rewarded&&m.league&&t){
  if(m.finance&&Number.isFinite(m.league.payout)){m.finance.league=m.league.payout;m.finance.net+=m.league.payout;}
  const h=t.history?.find(x=>x.id===m.id);
  if(h){h.league={season:m.league.season,tier:m.league.tier,round:m.league.round};if(h.finance&&m.finance)h.finance=clone(m.finance);}
  settleLeagueMatch(t,m);
 }
 return result;
};

// UI integration.
const startMatchBeforeLeague=startMatch;
startMatch=function(){
 const t=team();if(!t||live(t)||t.offer)return startMatchBeforeLeague();
 ensureClub(t);const L=t.league;
 if(L?.phase==='offseason'){toast('오프시즌입니다. 재계약을 마치고 "다음 시즌 시작"을 눌러 주세요.');go('league');return;}
 const fx=L?leagueFixture(L):null,before=t.match?.id;
 leagueStartFixture=fx?{...fx,team:t}:null;
 try{startMatchBeforeLeague();}finally{leagueStartFixture=null;}
 const m=t.match;
 if(fx&&m&&m.id!==before&&!m.done&&!m.league&&m.opp?.leagueTeamId===fx.oppId){m.league={season:L.season,tier:L.tier,round:fx.round,oppId:fx.oppId};save();}
};
const financeResultBeforeLeague=financeResult;
financeResult=function(m){
 const html=financeResultBeforeLeague(m);if(!m?.finance||!Number.isFinite(m.finance.league))return html;
 const row='<div class="row between"><span>리그 배당금 ('+leagueTierName(m.league?.tier??0)+')</span><b class="good">+'+money(m.finance.league)+'</b></div>',at=html.indexOf('<div class="row between"><span>이번 자금 변화');
 return at<0?html+row:html.slice(0,at)+row+html.slice(at);
};
function leagueTableHTML(t,rows,compact){
 const L=t.league;
 return '<table class="economy-table league-table"><thead><tr><th>#</th><th>팀</th>'+(compact?'':'<th>경기</th>')+'<th>승점</th><th>승-무-패</th>'+(compact?'':'<th>득점</th><th>실점</th>')+'<th>득실</th>'+(compact?'':'<th>전력</th><th>팀 색깔</th>')+'</tr></thead><tbody>'+
  rows.map(r=>{const o=leagueTeam(L,r.id);return '<tr class="'+(r.id==='us'?'league-us':'')+'"><td>'+r.rank+'</td><td>'+esc(leagueTeamName(t,r.id))+(r.tieBreak&&!compact?' <small class="muted">('+LEAGUE_TIE_LABELS[r.tieBreak]+')</small>':'')+'</td>'+(compact?'':'<td>'+r.gp+'</td>')+'<td><b>'+r.pts+'</b></td><td>'+r.w+'-'+r.d+'-'+r.l+'</td>'+(compact?'':'<td>'+r.rf+'</td><td>'+r.ra+'</td>')+'<td>'+leagueSigned(r.diff)+'</td>'+(compact?'':'<td>'+(o?o.strength.toFixed(1):'-')+'</td><td>'+(o?LEAGUE_STYLES[o.style].label:'우리 팀')+'</td>')+'</tr>';}).join('')+'</tbody></table>';
}
function leagueOffseasonHTML(t){
 const L=t.league,last=L.history.at(-1),p=L.pendingPromotion,unsigned=t.players.filter(x=>!(x.contract>0)).length,block=leagueNextSeasonBlock(t),expand=stadiumUpgradeBlock(t);
 return '<div class="stack league-offseason">'+
  (last?'<p><b>지난 시즌 '+last.rank+'위</b> · 승점 '+last.pts+' · '+esc(leagueMoveText(last,L))+(last.prize?' · 상금 '+money(last.prize):'')+'</p>':'')+
  (p?'<p class="gold">승격 조건 · 경기장 '+p.need+'등급 이상 (지금 '+t.stadium+'등급)</p><button class="primary small" data-league-expand '+(expand?'disabled':'')+'>경기장 확장하고 승격 · '+money(stadiumUpgradeCost(t))+'</button><p class="tiny muted">'+(expand?esc(expand)+' ':'')+'확장하지 않고 다음 시즌을 시작하면 '+leagueTierName(L.tier)+'에 남고, 다음 시즌에 다시 1위를 해야 합니다.</p>':'')+
  '<div class="row between"><span>재계약이 필요한 선수</span><b class="'+(unsigned?'bad':'good')+'">'+unsigned+'명</b></div>'+(unsigned?'<button class="small" data-go="finance">재정 · 재계약</button>':'')+
  '<p class="tiny muted">오프시즌: 재계약, 영입, 경기장 확장, 시설 짓기를 할 수 있습니다. 경기장 확장은 오프시즌에만 됩니다.</p>'+
  '<button class="primary" data-league-next '+(block?'disabled':'')+'>다음 시즌 시작</button>'+(block?'<p class="tiny muted">'+esc(block)+'</p>':'')+'</div>';
}
function leagueHomeHTML(t){
 const L=t.league,rows=leagueStandings(L),fx=L.phase==='season'?leagueFixture(L):null;
 return '<section class="panel stack league-home" data-league-home><h3>'+leagueTierName(L.tier)+' · 시즌 '+L.season+'</h3>'+
  '<div class="row between"><span>경기</span><b>'+(L.phase==='season'?L.round+' / '+LEAGUE.seasonGames:'시즌 종료 · 오프시즌')+'</b></div>'+
  (fx?'<div class="row between"><span>다음 경기</span><b>'+(fx.round+1)+'R '+(fx.usHome?'홈':'원정')+' · '+esc(leagueTeamName(t,fx.oppId))+'</b></div>':'')+
  leagueTableHTML(t,rows,true)+(L.phase==='offseason'?leagueOffseasonHTML(t):'')+
  '<button class="small" data-go="league">리그 · 순위표 보기</button></section>';
}
function leagueScheduleHTML(t){
 const L=t.league,name=id=>esc(leagueTeamName(t,id)),score=(r,g)=>{const x=L.results.find(y=>y.round===r&&y.home===g.home&&y.away===g.away);return x?x.score.join(' : '):'-';};
 return '<table class="economy-table league-table"><thead><tr><th>라운드</th><th>우리 경기</th><th>결과</th><th>같은 라운드 다른 경기</th></tr></thead><tbody>'+L.schedule.map((round,r)=>{
  const ours=round.find(g=>g.home==='us'||g.away==='us'),home=ours.home==='us',res=L.results.find(y=>y.round===r&&y.home===ours.home&&y.away===ours.away);
  const mine=res?(home?res.score:res.score.slice().reverse()):null,label=mine?(mine[0]>mine[1]?'승':mine[0]<mine[1]?'패':'무')+' '+mine.join(' : '):(r===L.round&&L.phase==='season'?'다음 경기':'-');
  return '<tr class="'+(r===L.round&&L.phase==='season'?'league-us':'')+'"><td>'+(r+1)+'</td><td>'+(home?'홈':'원정')+' · '+name(home?ours.away:ours.home)+'</td><td>'+label+'</td><td class="tiny">'+round.filter(g=>g!==ours).map(g=>name(g.home)+' '+score(r,g)+' '+name(g.away)).join('<br>')+'</td></tr>';
 }).join('')+'</tbody></table>';
}
function leagueInfoHTML(t){
 const L=t.league,next=Math.min(LEAGUE.names.length-1,L.tier+1);
 return '<div class="row between"><span>경기당 리그 배당금</span><b>'+money(leaguePayout(L.tier))+'</b></div>'+
  '<div class="row between"><span>시즌 상금 1·2·3위</span><b>'+LEAGUE.prize[L.tier].map(money).join(' / ')+'</b></div>'+
  '<div class="row between"><span>관객 수요</span><b>×'+leagueCrowd(L.tier)+' (좌석 '+(t.stadium*2000).toLocaleString('ko-KR')+'석 상한)</b></div>'+
  '<div class="row between"><span>영입 후보 능력</span><b>+'+leagueMarketOffset(L.tier)+'</b></div>'+
  '<div class="row between"><span>상대 중위권 평균 능력</span><b>'+LEAGUE.mids[L.tier]+'</b></div>'+
  (L.tier<LEAGUE.names.length-1?'<div class="row between"><span>'+leagueTierName(next)+' 승격 조건</span><b>1위 · 경기장 '+LEAGUE.stadiumNeed[next]+'등급 이상 (지금 '+t.stadium+'등급)</b></div>':'<div class="row between"><span>1부 리그</span><b>1위는 우승</b></div>')+
  '<p class="tiny muted">1위 승격 · 6위 강등(동네 리그는 더 내려가지 않음). 경기장 확장은 오프시즌에만 할 수 있습니다.</p>';
}
function leagueHistoryHTML(t){
 const list=t.league.history.slice().reverse();
 if(!list.length)return '<p class="muted">아직 끝난 시즌이 없습니다.</p>';
 return '<table class="economy-table league-table"><thead><tr><th>시즌</th><th>리그</th><th>순위</th><th>승점</th><th>승-무-패</th><th>득실</th><th>상금</th><th>결과</th></tr></thead><tbody>'+list.map(h=>'<tr><td>'+h.season+'</td><td>'+leagueTierName(h.tier)+'</td><td>'+h.rank+'위</td><td>'+h.pts+'</td><td>'+h.w+'-'+h.d+'-'+h.l+'</td><td>'+leagueSigned(h.rf-h.ra)+'</td><td>'+money(h.prize)+'</td><td>'+esc(leagueMoveText(h,t.league))+'</td></tr>').join('')+'</tbody></table>';
}
function leagueScreenHTML(t){
 const L=t.league,rows=leagueStandings(L),last=L.history.at(-1);
 return head('리그 · '+leagueTierName(L.tier),'시즌 '+L.season+' · '+(L.phase==='season'?L.round+' / '+LEAGUE.seasonGames+'경기 진행':'오프시즌'))+
  (L.phase==='offseason'&&last?'<section class="panel stack league-season-end"><p class="eyebrow">SEASON RESULT</p><h2>시즌 '+last.season+' 결과 · '+leagueTierName(last.tier)+' '+last.rank+'위</h2>'+leagueOffseasonHTML(t)+'</section>':'')+
  '<section class="panel stack"><h3>'+(L.phase==='offseason'?'최종 순위표':'순위표')+'</h3>'+leagueTableHTML(t,rows,false)+'<p class="tiny muted">승 2점 · 무 1점 · 패 0점. 승점이 같으면 맞대결 승점 → 득실점 차 → 득점 → 추첨 순서로 가릅니다.</p></section>'+
  '<section class="panel stack"><h3>경기 일정</h3>'+leagueScheduleHTML(t)+'</section>'+
  '<section class="panel stack"><h3>리그 정보</h3>'+leagueInfoHTML(t)+'</section>'+
  '<section class="panel stack"><h3>시즌 기록</h3>'+leagueHistoryHTML(t)+'</section>';
}
function leagueResultHTML(t,m){
 const L=t.league,x=m.league,same=x.season===L.season&&L.phase==='season'||x.seasonEnd,end=x.seasonEnd;
 const others=x.season===L.season?L.results.filter(g=>g.round===x.round&&g.home!=='us'&&g.away!=='us'):[];
 const us=leagueStandings(L).find(r=>r.id==='us');
 return '<section class="panel stack league-result"><h3>'+leagueTierName(x.tier)+' 시즌 '+x.season+' · '+(x.round+1)+'라운드</h3>'+
  (x.recorded?'':'<p class="muted">이 경기는 리그 순위에 들어가지 않았습니다.</p>')+
  (others.length?'<p>같은 라운드: '+others.map(g=>esc(leagueTeamName(t,g.home))+' '+g.score.join(' : ')+' '+esc(leagueTeamName(t,g.away))).join(' · ')+'</p>':'')+
  (end?'<p class="gold"><b>시즌 종료 · 최종 '+end.rank+'위</b> · 승점 '+end.pts+(end.prize?' · 상금 '+money(end.prize):'')+' · '+esc(leagueMoveText(end,L))+'</p><button class="primary" data-go="league">시즌 결과 보기</button>':
   (x.recorded&&same?'<p>현재 '+us.rank+'위 · 승점 '+us.pts+' · '+us.w+'승 '+us.d+'무 '+us.l+'패 · 득실 '+leagueSigned(us.diff)+'</p>':''))+'</section>';
}
function leagueStadiumNoteHTML(t){
 const L=t.league,next=Math.min(LEAGUE.names.length-1,L.tier+1),block=stadiumUpgradeBlock(t);
 return '<section class="panel stack league-stadium"><div class="row between"><span>경기장 확장</span><b>'+(t.stadium>=LEAGUE.maxStadium?'최대 등급':t.stadium+'→'+(t.stadium+1)+'등급 · '+money(stadiumUpgradeCost(t)))+'</b></div><p class="tiny muted">'+(block?esc(block)+' ':'')+'좌석은 등급 × 2,000석. '+(L.tier<LEAGUE.names.length-1?leagueTierName(next)+' 승격에는 경기장 '+LEAGUE.stadiumNeed[next]+'등급 이상이 필요합니다.':'')+'</p></section>';
}
const navBeforeLeague=buttonsNav;
buttonsNav=function(){
 navBeforeLeague();const t=activeGame?team():null;if(!t)return;
 const nav=$('#header nav');if(!nav||nav.querySelector('[data-go="league"]'))return;
 const b=document.createElement('button');b.dataset.go='league';b.className=screen==='league'?'active':'';b.textContent='리그';b.disabled=screen==='match'&&!t.match?.paused&&!t.match?.done;
 const records=nav.querySelector('[data-go="records"]');records?nav.insertBefore(b,records):nav.append(b);
};
const renderBeforeLeague=render;
render=function(){
 const t=activeGame?team():null;
 if(screen==='league'&&t){
  ensureClub(t);document.body.classList.remove('in-game');document.body.dataset.screen=screen;buttonsNav();
  $('#app').innerHTML=t.league?leagueScreenHTML(t):head('리그','저장칸을 불러온 뒤 확인할 수 있습니다.');
  if(lastScreen!==screen)window.scrollTo(0,0);lastScreen=screen;
  if(saveError)$('#app').insertAdjacentHTML('afterbegin','<div class="error-banner">'+esc(saveError)+'</div>');
  return;
 }
 renderBeforeLeague();
 if(!t?.league)return;
 if(screen==='home'&&!needsSetup(t)){
  const report=$('.club-report'),anchor=report?.querySelector('.home-achievements')||report?.firstElementChild;
  if(anchor)anchor.insertAdjacentHTML('afterend',leagueHomeHTML(t));else $('#app').insertAdjacentHTML('beforeend',leagueHomeHTML(t));
  if(t.league.phase==='offseason'){const b=$('.club-menu [data-action="start"]');if(b)b.textContent='⚾ 오프시즌 · 다음 시즌 준비';}
 }
 if(screen==='records')$('#app').insertAdjacentHTML('afterbegin','<section class="panel stack league-records"><h2>시즌 기록 · '+leagueTierName(t.league.tier)+' 시즌 '+t.league.season+'</h2>'+leagueHistoryHTML(t)+'</section>');
 if(screen==='result'&&t.match?.done&&t.match.league){const html=leagueResultHTML(t,t.match),h=$('#app .pagehead');if(h)h.insertAdjacentHTML('afterend',html);else $('#app').insertAdjacentHTML('afterbegin',html);}
 if(screen==='facilities')$('#app .ops-banner')?.insertAdjacentHTML('afterend',leagueStadiumNoteHTML(t));
};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-league-next],[data-league-expand]');if(!b||b.disabled||!activeGame)return;
 const t=team();if(!t?.league)return;
 if(b.hasAttribute('data-league-expand')){const error=expandStadium(t);toast(error||('경기장을 '+t.stadium+'등급으로 확장했습니다.'+(t.league.pendingPromotion?'':' 다음 시즌은 '+leagueTierName(t.league.tier)+'입니다.')));save();render();return;}
 const block=leagueNextSeasonBlock(t);if(block){toast(block);return;}
 const begin=()=>{const error=startNextSeason(t);if(error){toast(error);return;}save();toast(leagueTierName(t.league.tier)+' 시즌 '+t.league.season+' 시작');render();};
 const p=t.league.pendingPromotion;
 if(p&&t.stadium<p.need)confirmBox('승격 없이 다음 시즌 시작','경기장 '+p.need+'등급이 없어 이번에는 승격하지 못하고 '+leagueTierName(t.league.tier)+'에 남습니다. 다음 시즌에 다시 1위를 하면 승격할 수 있습니다.',begin,'다음 시즌 시작');
 else begin();
});
const leagueStyle=document.createElement('style');leagueStyle.textContent='.league-table th,.league-table td{padding:5px 7px;font-size:13px}.league-table .league-us td{color:#ffe29b;font-weight:bold}.league-home .league-table{margin:4px 0}.league-result{margin:12px 0}.league-offseason{margin-top:8px}';
document.head.append(leagueStyle);

;document.currentScript?.remove();

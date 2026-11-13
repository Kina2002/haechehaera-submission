// Disband opinion, emergency loan, forfeits, disband and rebuild, build step ③ (2026-11-11).
// P09 해체 여론(0~100%, 4단계, 경기마다·시즌 끝 변화, 해체와 재창단) · P14 운영 불가와 긴급 대출(금액·이자·상환·시즌당 1번·부전패 0:9).
// Layout like src/league.js and src/growth.js: pure rules first, then the game-hook marker comment, then the UI marker comment.
// Tests slice the source at those two marker comments, so keep them unique.
// Season end order after this file: rank → prize → opinion → disband → promotion → aging → rebuild → offseason → opinion-record.
// Extension points for later steps (do not rewrite this file for them):
//  - ④ MLB 진출 보상 −15%p · MLB 출신 후원 −5%p: changeOpinion(t,-15,'MLB 진출 보상','mlb') applies a change right away (clamped, logged, stage news).
//  - ④ 구단 회생권: OPINION_DISBAND_GUARDS.push((t,ctx)=>{...; setOpinion(t,70,'구단 회생권',{kind:'ticket'}); return {by:'ticket'};})
//    runs when the season-end opinion is 100%; a truthy result prevents the disband (promotion then runs as usual).
//    ④ 강등 막기 stays on league.js: set ctx.relegationBlocked=true in a step before 'promotion'.
//  - ⑤ 명예의 전당 −5%p: OPINION_SEASON_END_PARTS.push((t,ctx)=>({key:'hall',label:'명예의 전당',delta:-5})); it is summed with
//    the rank modifier, the 동네 6th streak and the loan left before the one clamp (P09 step 3).
//  - Per-game extras: OPINION_MATCH_PARTS.push((t,m,result)=>part|null). P27 (해체를 성장의 기회로): OPINION_REBUILD_HOOKS.push((t,record)=>{...}).

const OPINION={
 start:30,restart:20,disbandAt:100,     // P09: new club 30%, after a rebuild 20%, disband at 100% (season end only)
 win:-5,loss:5,draw:0,                  // P09 base setting (participant decision 2026-11-10)
 coldWin:-5,coldLoss:5,                 // P09 (2026-11-11, numbers Claude draft): cold win/loss on top of the result
 streakFrom:3,streakExtra:2,            // P09: from the 3rd straight loss +2 more per loss (draws neither break nor extend)
 unpaid:5,                              // P09: a game whose wages were not fully paid
 loanTaken:15,loanAtSeasonEnd:10,       // P09 · P14
 rank:[-30,-15,0,0,10,20],              // P09: season-end rank 1~6
 last6:10,last6From:2,                  // P09 (2026-11-11): 동네 리그 6th for the 2nd straight season and every one after, +10 more
 fanUp:-2,fanDown:2,                    // P09: fan-gaining event −2, fan-losing event +2, no fan change 0
 logSize:40,                            // Temporary (③, Claude): opinion changes kept in the save
};
// These deltas are not BALANCE values on purpose: BALANCE validation accepts only 0..100000 (향후 구상 · 만들 때 조심할 것).
const OPINION_STAGES=['평온','술렁임','분노','해체 직전'],OPINION_STAGE_FROM=[0,30,60,90];
const EMERGENCY_LOAN={interest:.1,repayShare:.3,margin:1.2,players:10,marketSize:3};// P14 (test values decided 2026-11-11)
const REBUILD={keepMax:3,keepLoyalty:70,roster:12,ticket:10,stadium:1};// P09 해체와 재창단 (participant decision 2026-11-10)
// Draft lines from 문서/관객-반응/해체-여론-문구-2026-11-10-v01.md (A 현수막 · C 기사 · D 안도 · E 시즌 끝 · F 긴급 대출).
const OPINION_TEXTS={
 banner:[['오늘도 직관 성공','하고 싶은 야구 다 해','이기면 치킨, 지면 치맥','해체는 다음 생에'],
  ['이번 시즌 지켜본다','응원은 공짜가 아니다','팬도 사람이다','연패 그만, 진심으로','해체? 아직은 아니다'],
  ['해체해라','감독 나와','입장료 환불해 줘','이게 야구냐','야, 나와봐! 내가 할게','해체 서명 받습니다'],
  ['해체해라!!','오늘이 마지막 직관','유니폼 팝니다','구단주님 보고 계세요?','해체 카운트다운','그래도 왔다']],
 up:[null,
  [['팬 게시판이 술렁인다','최근 경기 결과를 두고 팬 게시판에 걱정 섞인 글이 늘고 있습니다.'],['응원석에 빈자리, 하나둘','관중석 곳곳에 빈자리가 보이기 시작했습니다. 아직 응원가는 크게 들립니다.'],['"이번 시즌 지켜본다" 현수막 등장','응원석에 첫 경고성 현수막이 걸렸습니다.']],
  [['구단주 "이대로는 곤란하다"','구단주가 시즌 끝 성적을 지켜보겠다고 밝혔습니다.'],['관중석에 "해체해라" 현수막','경기 내내 해체를 요구하는 현수막이 내려가지 않았습니다.'],['팬들, 해체 서명 시작','일부 팬이 해체 서명을 받기 시작했습니다. 이기면 서명지를 찢겠다고 합니다.']],
  [['구단주 최후통첩','시즌이 끝날 때 해체 여론이 100%면 구단을 해체하겠다는 발표가 나왔습니다.'],['"마지막 직관" 인증 행렬','팬들 사이에서 마지막 직관 인증 사진이 퍼지고 있습니다.'],['선수단, 짐 싸는 모습 포착?','구단은 평범한 원정 준비라고 해명했습니다.']]],
 down:[
  ['중계진: “관중석 분위기가 다시 밝아졌습니다.”','우리 치어리더: “이 분위기 그대로 쭉 가요!”','상대 치어리더: “요즘 응원 소리가 커졌네요. 부러워요!”','우리 관객: “봐라, 내가 끝까지 믿었다니까.”'],
  ['중계진: “관중석 현수막이 조금 줄었습니다.”','우리 치어리더: “야유가 응원으로 바뀌고 있어요!”','상대 관객: “뭐야, 저 팀 살아나는 거야?”','우리 관객: “해체는 보류. 보류다.”'],
  ['중계진: “한숨 돌렸습니다. 아직 숨만 돌렸습니다.”','우리 치어리더: “살았다! 아직 응원할 수 있어요!”','상대 치어리더: “어머, 아직 계시는 거죠? 다행이에요!”','우리 관객: “서명지는 일단 접어둔다.”']],
 disband:['중계진: “구단이 해체를 발표했습니다. 이름은 남습니다.”','우리 치어리더: “여기서 끝 아니에요. 다시 모여요!”','상대 관객: “진짜 해체했네… 막상 하니까 섭섭하다.”','우리 관객: “해체하라고 했지 진짜 하라고 했냐!”'],
 survive:['중계진: “벼랑 끝에서 시즌을 마쳤습니다. 다음 시즌이 있습니다.”','우리 치어리더: “살았어요! 다음 시즌에도 여기서 만나요!”','상대 치어리더: “대단해요! 끝까지 버티셨네요!”','우리 관객: “심장 떨어질 뻔했다. 내년엔 이러지 마라.”'],
 rebuild:['중계진: “다시 동네 리그입니다. 이름은 그대로, 선수는 새롭게.”','우리 치어리더: “새 출발이에요! 처음부터 다시 응원해요!”','상대 치어리더: “동네 리그에 다시 오신 걸 환영해요!”','우리 관객: “해체하라고 할 땐 언제고, 또 왔다.”'],
 loan:['중계진: “구단이 긴급 대출을 받았습니다. 일단 경기는 계속됩니다.”','우리 치어리더: “일단 경기는 해요! 이기면 갚을 수 있어요!”','상대 관객: “선수 데려오려고 빚냈대!”','우리 관객: “빚까지 냈으면 이겨라, 진짜로.”'],
};
// Extension hooks (see the header).
const OPINION_MATCH_PARTS=[],OPINION_SEASON_END_PARTS=[],OPINION_DISBAND_GUARDS=[],OPINION_REBUILD_HOOKS=[];

// ---- small helpers ----
function opinionStage(v){let s=0;for(let i=0;i<OPINION_STAGE_FROM.length;i++)if(v>=OPINION_STAGE_FROM[i])s=i;return s;}
function opinionStageName(v){return OPINION_STAGES[opinionStage(v)];}
function clampOpinion(v){return Math.min(100,Math.max(0,Math.round((Number(v)||0)*100)/100));}
function opinionPart(key,label,delta){return {key,label,delta};}
function opinionSum(parts){return Math.round(parts.reduce((s,p)=>s+(Number(p.delta)||0),0)*100)/100;}
function newOpinionState(value=OPINION.start,extra={}){return {v:1,value,lossStreak:0,last6:0,disbands:0,loans:0,forfeits:0,settled:0,log:[],rebuilds:[],...extra};}
function opinionState(t){return t.opinion??=newOpinionState();}
function opinionPick(t,list){
 if(!list?.length)return '';const O=opinionState(t),key=x=>Array.isArray(x)?x[0]:x;
 const pool=list.length>1?list.filter(x=>key(x)!==O.lastNews):list,choice=pool[Math.floor(Math.random()*pool.length)]||list[0];
 O.lastNews=key(choice);return choice;
}

// ---- applying changes (all changes go through here: clamp 0~100, log, stage news) ----
function opinionStageNews(t,from,to){
 const a=opinionStage(from),b=opinionStage(to);if(a===b)return;
 if(b>a){const [title,text]=opinionPick(t,OPINION_TEXTS.up[b]);news(t,'해체 여론 '+OPINION_STAGES[b]+' · '+title,text+' (해체 여론 '+Math.round(from)+'% → '+Math.round(to)+'%)');}
 else news(t,'해체 여론 '+OPINION_STAGES[a]+' → '+OPINION_STAGES[b],opinionPick(t,OPINION_TEXTS.down[b])+' (해체 여론 '+Math.round(from)+'% → '+Math.round(to)+'%)');
}
// P09: the parts of one moment are summed first and the result is clamped once.
function applyOpinion(t,parts,meta={}){
 const O=opinionState(t),from=O.value,to=clampOpinion(from+opinionSum(parts));
 O.value=to;
 const entry={kind:meta.kind||'other',season:Number.isInteger(meta.season)?meta.season:(t.league?.season??null),round:Number.isInteger(meta.round)?meta.round:null,from,to,
  parts:parts.map(p=>({key:String(p.key),label:String(p.label),delta:Number(p.delta)||0})),at:Date.now()};
 O.log.push(entry);if(O.log.length>OPINION.logSize)O.log.splice(0,O.log.length-OPINION.logSize);
 if(!meta.quiet)opinionStageNews(t,from,to);
 return entry;
}
// For later steps (④ MLB reward −15, support −5) and anything else that moves the opinion outside a game or the season end.
function changeOpinion(t,delta,label,kind='other'){return applyOpinion(t,[opinionPart(kind,label,delta)],{kind});}
function setOpinion(t,value,label,meta={}){const O=opinionState(t);return applyOpinion(t,[opinionPart(meta.kind||'set',label,clampOpinion(value)-O.value)],{kind:'other',...meta});}

// ---- per game (P09 numbers) ----
function opinionFanDirection(ev){
 if(!ev)return 0;
 // Temporary (③, Claude): the event's own direction (its definition), not the clamped change of that one player.
 const def=typeof CLUB_EVENT_TYPES!=='undefined'?CLUB_EVENT_TYPES.find(d=>d.id===ev.kind):null;
 return Math.sign(def?def.fans:(Number(ev.fans)||0));
}
function matchOpinionParts(t,m,result){
 const O=opinionState(t),parts=[];
 if(result==='W'){parts.push(opinionPart('win','승리',OPINION.win));if(m.mercy)parts.push(opinionPart('coldWin','콜드승',OPINION.coldWin));O.lossStreak=0;}
 else if(result==='L'){
  parts.push(m.forfeit?opinionPart('forfeit','부전패',OPINION.loss):opinionPart('loss','패배',OPINION.loss));
  if(m.mercy&&!m.forfeit)parts.push(opinionPart('coldLoss','콜드패',OPINION.coldLoss));
  O.lossStreak++;if(O.lossStreak>=OPINION.streakFrom)parts.push(opinionPart('streak',O.lossStreak+'연패째',OPINION.streakExtra));
 }else parts.push(opinionPart('draw','무승부',OPINION.draw));// a draw neither breaks nor extends the losing streak
 if(!m.forfeit&&Number(m.finance?.debt)>0)parts.push(opinionPart('unpaid','급여 미지급',OPINION.unpaid));
 if(!m.forfeit&&m.clubEvent){
  const dir=opinionFanDirection(m.clubEvent),label='팬 사건 · '+(m.clubEvent.text||'');
  parts.push(dir>0?opinionPart('fanUp',label,OPINION.fanUp):dir<0?opinionPart('fanDown',label,OPINION.fanDown):opinionPart('fanNone',label,0));
 }
 for(const f of OPINION_MATCH_PARTS){const p=f(t,m,result);if(p&&Number.isFinite(Number(p.delta)))parts.push(p);}
 return parts;
}
// Runs from LEAGUE_MATCH_HOOKS: after the league result is in the table, before the season end of the last game.
function settleMatchOpinion(t,m,info){
 if(!t||!m||m.opinion)return m?.opinion||null;
 const result=info?.result||(m.score[0]>m.score[1]?'W':m.score[0]<m.score[1]?'L':'D');
 const e=applyOpinion(t,matchOpinionParts(t,m,result),{kind:m.forfeit?'forfeit':'match',season:info?.season,round:info?.round});
 m.opinion={from:e.from,to:e.to,parts:e.parts};
 const h=t.history?.find(x=>x.id===m.id);if(h)h.opinion=JSON.parse(JSON.stringify(m.opinion));
 if(m.forfeit&&t.league){const g=t.league.results.find(r=>r.round===info?.round&&(r.home==='us'||r.away==='us'));if(g)g.forfeit=true;}
 return m.opinion;
}

// ---- emergency loan (P14) ----
// Once per season; a loan taken in the offseason counts for the coming season (the simulator's order).
function loanSeasonKey(t){const L=t?.league;return L?(L.phase==='offseason'?L.season+1:L.season):0;}
function loanLeft(t){return Number(t?.loan?.left)>0?t.loan.left:0;}
// The cheapest recruit candidate. An empty list (it is cleared after every game) is drawn the way the market screen draws it.
function cheapestRecruitPrice(t){
 if(!Array.isArray(t.market)||!t.market.length){
  if(live(t))return Infinity;
  t.market=createMarketCandidates(t);t.marketRound=t.w+t.l+t.d;
  if(typeof wageState26==='function')t.market.forEach(p=>wageState26(p,t));
 }
 const prices=t.market.map(p=>p.price).filter(Number.isFinite);return prices.length?Math.min(...prices):Infinity;
}
// P14: unpaid wages + missing players × cheapest candidate × 1.2, plus one candidate refresh for every three players past the list.
function loanOffer(t){
 const need=Math.max(0,EMERGENCY_LOAN.players-t.players.length),cheapest=cheapestRecruitPrice(t),debt=Math.max(0,Number(t.debt)||0);
 const refreshes=Math.max(0,Math.ceil(need/EMERGENCY_LOAN.marketSize)-1),refresh=refreshes*MARKET_REFRESH_COST;
 const amount=Math.round(debt+need*cheapest*EMERGENCY_LOAN.margin+refresh);
 return {need,cheapest,debt,refreshes,refresh,amount,repay:Math.round(amount*(1+EMERGENCY_LOAN.interest))};
}
function emergencyLoanBlock(t){
 if(!t?.league)return '리그 자료가 없습니다.';
 if(live(t))return '경기가 끝난 뒤 받을 수 있습니다.';
 if(t.players.length>=EMERGENCY_LOAN.players)return '선수가 10명 이상이면 긴급 대출을 받을 수 없습니다.';
 if(t.funds>=cheapestRecruitPrice(t))return '지금 자금으로 영입할 수 있습니다.';
 if(loanLeft(t))return '갚지 못한 긴급 대출이 남아 있어 새로 빌릴 수 없습니다.';
 if(t.loan&&t.loan.season===loanSeasonKey(t))return '긴급 대출은 시즌당 한 번만 받을 수 있습니다.';
 return '';
}
// Can the club field ten players? ok · hire (money enough) · loan (P14 loan available) · forfeit (no way left: forfeit the rest).
function operationState(t){
 if(!t||live(t)||!Array.isArray(t.players)||t.players.length>=EMERGENCY_LOAN.players)return {kind:'ok'};
 const need=EMERGENCY_LOAN.players-t.players.length,cheapest=cheapestRecruitPrice(t);
 if(t.funds>=cheapest)return {kind:'hire',need,cheapest};
 const block=emergencyLoanBlock(t);
 return block?{kind:'forfeit',need,cheapest,reason:block}:{kind:'loan',need,cheapest,offer:loanOffer(t)};
}
function takeEmergencyLoan(t){
 const block=emergencyLoanBlock(t);if(block)return block;
 const o=loanOffer(t);if(!Number.isFinite(o.amount)||!(o.amount>0))return '빌릴 금액을 정할 수 없습니다. 영입 화면에서 후보를 확인해 주세요.';
 gain(t,o.amount,'긴급 대출');
 // The unpaid-wage part is paid at once, otherwise the loyalty −8 keeps driving players away (P14).
 const paid=Math.min(t.funds,Math.max(0,Number(t.debt)||0));if(paid>0){spend(t,paid,'긴급 대출 · 미지급금 상환');t.debt=Math.round((t.debt-paid)*100)/100;}
 t.loan={v:1,amount:o.amount,repay:o.repay,left:o.repay,repaid:0,season:loanSeasonKey(t),at:Date.now()};
 const O=opinionState(t);O.loans++;
 applyOpinion(t,[opinionPart('loan','긴급 대출',OPINION.loanTaken)],{kind:'loan'});
 news(t,'긴급 대출 '+money(o.amount),opinionPick(t,OPINION_TEXTS.loan)+' 갚을 금액 '+money(o.repay)+'(이자 10%) · 경기마다 경기 수입의 30%까지 갚습니다.'+(paid?' 미지급금 '+money(paid)+'을 먼저 갚았습니다.':'')+' 해체 여론 +'+OPINION.loanTaken+'%p.');
 return '';
}
// P14: after wages and upkeep, up to 30% of this game's settlement income (fees, gate, shops, league payout; no prizes).
function loanRepaymentQuote(t,income,funds=t?.funds??0){return loanLeft(t)?Math.max(0,Math.min(t.loan.left,Math.max(0,funds),Math.round(income*EMERGENCY_LOAN.repayShare))):0;}
function repayLoanFromMatch(t,m){
 const f=m?.finance;if(!t||!f||f.loanRepay!==undefined||!loanLeft(t))return 0;
 const income=(Number(f.reward)||0)+(Number(f.ticket)||0)+(Number(f.stores)||0)+(Number(f.league)||0);
 const pay=loanRepaymentQuote(t,income);
 if(pay>0&&spend(t,pay,'긴급 대출 상환')){t.loan.left=Math.round((t.loan.left-pay)*100)/100;t.loan.repaid=Math.round((t.loan.repaid+pay)*100)/100;}
 f.loanRepay=pay>0?pay:0;f.loanLeft=t.loan.left;if(Number.isFinite(f.net))f.net-=f.loanRepay;
 const h=t.history?.find(x=>x.id===m.id);if(h?.finance)h.finance=JSON.parse(JSON.stringify(f));
 if(f.loanRepay&&!t.loan.left)news(t,'긴급 대출 상환 완료','빌린 '+money(t.loan.amount)+'에 이자를 더한 '+money(t.loan.repay)+'을 모두 갚았습니다.');
 return f.loanRepay;
}

// ---- forfeits (P14: 0:9, counted as losses; no wages, payout, gate or fan change) ----
function forfeitBlock(t){
 const L=t?.league;if(!L)return '리그 자료가 없습니다.';
 if(live(t))return '경기가 끝난 뒤 처리할 수 있습니다.';
 if(L.phase!=='season'||L.round>=LEAGUE.seasonGames)return '시즌 중에만 부전패를 처리할 수 있습니다.';
 const s=operationState(t);
 return s.kind==='forfeit'?'':s.kind==='ok'?'경기를 치를 수 있습니다.':s.kind==='hire'?'지금 자금으로 선수를 영입할 수 있습니다.':'긴급 대출을 받을 수 있습니다.';
}
function forfeitRemainingGames(t){
 const block=forfeitBlock(t);if(block)return {error:block};
 const L=t.league,season=L.season,before=opinionState(t).value,players=t.players.length;let count=0,end=null;
 while(L.phase==='season'&&L.season===season&&L.round<LEAGUE.seasonGames){
  const fx=leagueFixture(L);if(!fx)break;
  const m={id:'forfeit-'+season+'-'+fx.round,forfeit:true,score:[0,9],league:{season,tier:L.tier,round:fx.round,oppId:fx.oppId}};
  const streak=typeof achievementStreaks==='function'?achievementStreaks(t):null;
  t.l++;// counted as a loss in the cumulative record (before the league result, like a played game) and in the losing-streak achievements (P14)
  const info=settleLeagueMatch(t,m);if(!info){t.l--;break;}count++;
  if(streak){streak.loss++;streak.win=0;streak.bestLoss=Math.max(streak.bestLoss,streak.loss);streak.lastGame=m.id;t.achievementStreaks=streak;}
  if(m.league.seasonEnd)end=m.league.seasonEnd;
 }
 opinionState(t).forfeits+=count;
 if(typeof syncAchievements==='function')syncAchievements(t);
 news(t,'부전패 '+count+'경기 · 시즌 '+season,'선수가 '+players+'명이라 경기를 치르지 못해 남은 경기를 0:9 부전패로 처리했습니다. 급여·배당금·관중 수입은 없습니다.');
 return {count,season,from:before,to:opinionState(t).value,seasonEnd:end};
}

// ---- season end (P09 steps 3, 4 and the rebuild) ----
function opinionSeasonParts(t,ctx){
 const O=opinionState(t),parts=[opinionPart('rank','시즌 '+ctx.rank+'위',OPINION.rank[ctx.rank-1]||0)];
 // 동네 6th streak: only seasons played in 동네 count; anything else (or a rebuild) starts over.
 O.last6=ctx.tier===0&&ctx.rank===LEAGUE.teams?O.last6+1:0;
 if(O.last6>=OPINION.last6From)parts.push(opinionPart('last6','동네 리그 '+O.last6+'시즌 연속 6위',OPINION.last6));
 if(loanLeft(t))parts.push(opinionPart('loanLeft','시즌 끝 남은 대출',OPINION.loanAtSeasonEnd));
 for(const f of OPINION_SEASON_END_PARTS){const p=f(t,ctx);if(p&&Number.isFinite(Number(p.delta)))parts.push(p);}// ⑤ hall of fame −5
 return parts;
}
function opinionSeasonEndStep(t,ctx){
 const O=opinionState(t);
 if(O.settled>=ctx.season)return null;// never twice for the same season
 const e=applyOpinion(t,opinionSeasonParts(t,ctx),{kind:'season',season:ctx.season});
 O.settled=ctx.season;ctx.opinion={from:e.from,to:e.to,parts:e.parts};
 news(t,'시즌 '+ctx.season+' 끝 · 해체 여론 정산',e.parts.map(p=>p.label+' '+(p.delta>0?'+':'')+p.delta+'%p').join(' · ')+' → '+Math.round(e.from)+'% → '+Math.round(e.to)+'%'+(e.to>=OPINION.disbandAt?' · 해체 판정':''));
 return ctx.opinion;
}
// P09 step 4: checked before promotion. A disband removes the prize of step 2 and skips promotion.
function disbandSeasonEndStep(t,ctx){
 const O=opinionState(t);if(O.value<OPINION.disbandAt)return null;
 for(const guard of OPINION_DISBAND_GUARDS){const r=guard(t,ctx);if(r){ctx.disband={prevented:true,by:typeof r==='object'&&typeof r.by==='string'?r.by:'guard',opinion:O.value};return ctx.disband;}}// ④ revival ticket
 const lost=ctx.prize||0;
 if(lost>0){const take=Math.min(Math.max(0,t.funds),lost);t.funds-=take;ledger(t,'해체 · 시즌 상금 취소',-take);}
 ctx.disband={season:ctx.season,tier:ctx.tier,rank:ctx.rank,opinion:O.value,lostPrize:lost};
 ctx.prize=0;ctx.move='disband';ctx.nextTier=0;if(!ctx.skip.includes('promotion'))ctx.skip.push('promotion');
 if(t.league)t.league.pendingPromotion=null;
 news(t,'구단 해체 발표 · 시즌 '+ctx.season,opinionPick(t,OPINION_TEXTS.disband)+' 해체 여론 100%. '+(lost?'시즌 상금 '+money(lost)+'도 사라졌습니다. ':'')+'동네 리그에서 재창단합니다.');
 return ctx.disband;
}
// P09 해체와 재창단. Runs after aging, so everyone who played this season ages first and the newcomers enter at 19~26.
function rebuildKeepers(players){
 // Up to three players with loyalty ≥ 70, highest first; equal loyalty keeps the roster order (Temporary ③).
 return players.map((p,i)=>({p,i})).filter(x=>x.p.loyalty>=REBUILD.keepLoyalty).sort((a,b)=>b.p.loyalty-a.p.loyalty||a.i-b.i).slice(0,REBUILD.keepMax).map(x=>x.p);
}
function rebuildClub(t,d={},rnd=Math.random){
 const at=Date.now(),L=t.league,season=Number.isInteger(d.season)?d.season:(L?.season??0),O=opinionState(t);
 if(typeof snapshotRoster26==='function')snapshotRoster26(t);// the last game's result screen keeps the old roster
 const keep=rebuildKeepers(t.players),keepIds=new Set(keep.map(p=>p.id)),leaving=t.players.filter(p=>!keepIds.has(p.id));
 t.departed??=[];
 for(const p of leaving){p.departureKind='disband';p.departedAt26=at;delete p.exitPending26;p.disband={season,tier:d.tier??0,loyalty:p.loyalty,at};if(!t.departed.some(x=>x.id===p.id))t.departed.push(p);}
 t.players=keep.slice();
 // Kept players: same abilities, a new contract to the end of the next season at their current ask (Temporary ③).
 for(const p of keep){
  const w=typeof wageState26==='function'?wageState26(p,t):null;
  if(w){p.salary=Math.min(10000,Math.max(3,Math.round(w.ask)));Object.assign(w,{baseline:clone(p.stats),clubGames:t.w+t.l+t.d,expired:false});}
  p.contract=LEAGUE.seasonGames;p.lowOffers=0;p.energy=p.a.stamina;
 }
 // New starting players by F03 (player(true)) with the ② entry age; wage and ask from the raised abilities.
 const added=[];
 while(t.players.length<REBUILD.roster){
  const p=player(true,t.players.map(x=>x.number),false,0,t.players.map(x=>x.name));
  if(typeof enterPlayerAge==='function')enterPlayerAge(p,rnd);
  p.salary=Math.max(3,Math.round(abilityPrice(p)*balance(t).salaryFactor));delete p.wage26;if(typeof wageState26==='function')wageState26(p,t);
  p.contract=LEAGUE.seasonGames;p.energy=p.a.stamina;t.players.push(p);added.push(p);
 }
 t.lineup=(typeof GameAutoLineup!=='undefined'&&GameAutoLineup.choose(t.players,(p,k)=>p.a[k]))||dhLineup(t.players);
 t.rosterVacancy26=false;delete t.battingDraft;
 // Club reset: 동네 리그, start funds, no unpaid wages or loan, every facility removed, stadium grade 1, default ticket price.
 const start=balance(t).startFunds,oldFunds=t.funds;
 t.funds=start;ledger(t,'재창단 · 시작 자금',Math.round((start-oldFunds)*100)/100);
 t.debt=0;t.loan=null;t.facilities=[];t.stadium=REBUILD.stadium;t.ticket=REBUILD.ticket;t.market=[];t.marketRound=null;t.offer=null;
 if(L){L.tier=0;L.pendingPromotion=null;}
 O.last6=0;O.disbands++;
 setOpinion(t,OPINION.restart,'재창단 · 여론 재시작',{kind:'rebuild',season,quiet:true});
 const record={season,tier:d.tier??0,rank:d.rank??null,opinion:d.opinion??OPINION.disbandAt,lostPrize:d.lostPrize||0,
  kept:keep.map(p=>({id:p.id,name:p.name,loyalty:p.loyalty})),left:leaving.length,added:added.length,funds:start,at};
 O.rebuilds.push(record);if(O.rebuilds.length>100)O.rebuilds.splice(0,O.rebuilds.length-100);
 news(t,'재창단 · 동네 리그에서 다시 시작',opinionPick(t,OPINION_TEXTS.rebuild)+' '+(keep.length?'남은 선수: '+keep.map(p=>p.name+'(애정도 '+p.loyalty+')').join(', ')+'. ':'애정도 70 이상인 선수가 없어 모두 떠났습니다. ')+'새 선수 '+added.length+'명 · 자금 '+money(start)+' · 경기장 1등급 · 시설 없음 · 해체 여론 '+OPINION.restart+'%. 떠난 '+leaving.length+'명의 기록은 이적 명단에 남습니다.');
 for(const f of OPINION_REBUILD_HOOKS)f(t,record);// P27 can add owner experience here
 return record;
}
function rebuildSeasonEndStep(t,ctx){if(!ctx.disband||ctx.disband.prevented)return null;ctx.rebuild=rebuildClub(t,ctx.disband);return ctx.rebuild;}
// After the offseason entry exists: the season record and the season-end summary carry the settlement and the disband.
function opinionRecordStep(t,ctx){
 const L=t.league,entry=L?.history?.at(-1);if(!entry||entry.season!==ctx.season)return;
 const O=opinionState(t),extra={},forfeits=O.log.filter(e=>e.kind==='forfeit'&&e.season===ctx.season).length;
 if(ctx.opinion)extra.opinion=ctx.opinion;
 if(forfeits)extra.forfeits=forfeits;
 if(ctx.disband){extra.disband=!ctx.disband.prevented;if(ctx.disband.prevented)extra.disbandPrevented=ctx.disband.by;if(ctx.disband.lostPrize)extra.lostPrize=ctx.disband.lostPrize;}
 if(ctx.rebuild)extra.rebuild={kept:ctx.rebuild.kept.map(k=>k.name),added:ctx.rebuild.added,left:ctx.rebuild.left};
 Object.assign(entry,extra);if(ctx.summary)Object.assign(ctx.summary,extra);
 // 기사회생: 90% or more during this season and still here.
 if(!extra.disband){const peak=Math.max(0,...O.log.filter(e=>e.season===ctx.season&&e.kind!=='rebuild').flatMap(e=>[e.from,e.to]));
  if(peak>=OPINION_STAGE_FROM[3])news(t,'기사회생 · 시즌 '+ctx.season,opinionPick(t,OPINION_TEXTS.survive)+' (시즌 중 최고 해체 여론 '+Math.round(peak)+'%)');}
}

// ---- old saves and validation ----
function ensureOpinionState(t){
 if(!t||!Array.isArray(t.players))return null;
 if(!t.opinion){
  // Existing clubs (P09 · ③): 30%, no loan. The 동네 6th streak and the losing streak follow the saved records.
  const L=t.league,hist=Array.isArray(L?.history)?L.history:[];let last6=0;
  for(let i=hist.length-1;i>=0&&hist[i]?.tier===0&&hist[i]?.rank===LEAGUE.teams;i--)last6++;
  let streak=0;try{if(typeof achievementStreaks==='function')streak=achievementStreaks(t).loss||0;}catch(e){streak=0;}
  t.opinion=newOpinionState(OPINION.start,{lossStreak:streak,last6,settled:L?Math.max(0,L.phase==='offseason'?L.season:L.season-1):0});
  if(t.w+t.l+t.d>0&&Array.isArray(t.news))news(t,'해체 여론 '+OPINION.start+'%에서 시작','지면 오르고 이기면 내려갑니다. 시즌 끝 순위 보정까지 더해 100%면 구단이 해체되고 동네 리그에서 재창단합니다.');
 }
 const O=t.opinion;O.log??=[];O.rebuilds??=[];for(const k of ['lossStreak','last6','disbands','loans','forfeits','settled'])O[k]??=0;
 return O;
}
function validateOpinionState(t){
 const fail=msg=>{throw Error('해체 여론 자료 오류 · '+msg);};
 const int=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b,num=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b,obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
 const parts=list=>Array.isArray(list)&&list.length<=50&&list.every(p=>obj(p)&&typeof p.key==='string'&&p.key.length<=40&&typeof p.label==='string'&&p.label.length<=120&&num(p.delta,-100,100));
 const change=c=>obj(c)&&num(c.from,0,100)&&num(c.to,0,100)&&parts(c.parts);
 const O=t.opinion;
 if(O!==undefined){
  if(!obj(O)||O.v!==1)fail('형식');
  if(!num(O.value,0,100))fail('여론 값');
  for(const k of ['lossStreak','last6','disbands','loans','forfeits','settled'])if(O[k]!==undefined&&!int(O[k],0,1e6))fail('숫자 · '+k);
  if(!Array.isArray(O.log)||O.log.length>200||O.log.some(e=>!change(e)||typeof e.kind!=='string'||e.kind.length>20||(e.season!=null&&!int(e.season,0,1e6))||(e.round!=null&&!int(e.round,0,LEAGUE.seasonGames))))fail('변화 기록');
  if(!Array.isArray(O.rebuilds)||O.rebuilds.length>1000||O.rebuilds.some(r=>!obj(r)||!int(r.season,0,1e6)||!Array.isArray(r.kept)||r.kept.length>REBUILD.keepMax))fail('재창단 기록');
  if(O.lastNews!==undefined&&typeof O.lastNews!=='string')fail('소식');
 }
 const loan=t.loan;
 if(loan!==undefined&&loan!==null&&(!obj(loan)||!num(loan.amount,0,1e7)||!num(loan.repay,0,1e7)||!num(loan.left,0,1e7)||!num(loan.repaid??0,0,1e7)||loan.left>loan.repay||!int(loan.season,0,1e6)))fail('긴급 대출');
 for(const m of [t.match,...(Array.isArray(t.history)?t.history:[])].filter(Boolean)){
  if(m.opinion!==undefined&&!change(m.opinion))fail('경기 여론 변화');
  if(m.finance?.loanRepay!==undefined&&!num(m.finance.loanRepay,0,1e7))fail('대출 상환 기록');
 }
 for(const p of Array.isArray(t.departed)?t.departed:[])if(p?.departureKind==='disband'&&(!obj(p.disband)||!int(p.disband.season,0,1e6)))fail('해체 이적 기록');
 for(const h of Array.isArray(t.league?.history)?t.league.history:[])if(h&&h.opinion!==undefined&&!change(h.opinion))fail('시즌 여론 정산');
}

// Game hooks.
// P09 season-end order: rank → prize → opinion → disband → promotion → aging → rebuild → offseason (+ the record step).
addLeagueSeasonEndStep({id:'opinion',run:opinionSeasonEndStep},{after:'prize'});
addLeagueSeasonEndStep({id:'disband',run:disbandSeasonEndStep},{after:'opinion'});
addLeagueSeasonEndStep({id:'rebuild',run:rebuildSeasonEndStep},{after:LEAGUE_SEASON_END_STEPS.some(s=>s.id==='aging')?'aging':'promotion'});
addLeagueSeasonEndStep({id:'opinion-record',run:opinionRecordStep},{after:'offseason'});
// Every league game (forfeits too): loan repayment from this game's income, then the per-game opinion.
LEAGUE_MATCH_HOOKS.push((t,m,info)=>{repayLoanFromMatch(t,m);settleMatchOpinion(t,m,info);});
const leagueMoveTextBeforeOpinion=leagueMoveText;
leagueMoveText=function(entry,L){return entry?.move==='disband'?'구단 해체 · 동네 리그에서 재창단':leagueMoveTextBeforeOpinion(entry,L);};
// A game outside the league (one in progress when the update arrived) still repays the loan.
const rewardBeforeOpinion=reward;
reward=function(m){
 if(m.rewarded)return rewardBeforeOpinion(m);
 const t=team(),result=rewardBeforeOpinion(m);
 if(m.rewarded&&t&&t.match===m)repayLoanFromMatch(t,m);
 return result;
};
const ensureClubBeforeOpinion=ensureClub;
ensureClub=function(t){ensureClubBeforeOpinion(t);if(t&&typeof data!=='undefined'&&data?.slots?.includes(t))ensureOpinionState(t);};
const validateTeamBeforeOpinion=validateTeam;
validateTeam=function(t){validateTeamBeforeOpinion(t);validateOpinionState(t);};
// "다음 시즌 시작" never stays blocked by a short roster: with no money and no loan left the season starts and its games are forfeited.
const leagueNextSeasonBlockBeforeOpinion=leagueNextSeasonBlock;
leagueNextSeasonBlock=function(t){
 const block=leagueNextSeasonBlockBeforeOpinion(t);if(!block)return '';
 const L=t?.league;
 if(L?.phase==='offseason'&&!live(t)&&t.players.length<EMERGENCY_LOAN.players&&!t.players.some(p=>!(p.contract>0))){
  const s=operationState(t);
  if(s.kind==='forfeit')return '';
  if(s.kind==='loan')return '선수가 '+t.players.length+'명이고 영입할 자금이 없습니다. 긴급 대출을 받아 영입한 뒤 시작해 주세요.';
 }
 return block;
};

// UI integration.
function opinionPct(v){return Math.round(v)+'%';}
function opinionDelta(d){d=Math.round(d*100)/100;return (d>0?'+':d<0?'−':'±')+Math.abs(d)+'%p';}
function opinionPartsText(parts){return (parts||[]).map(p=>esc(p.label)+' '+opinionDelta(p.delta)).join(' · ');}
function opinionChangeHTML(c,title){return '<p><b>'+title+'</b> '+opinionPct(c.from)+' → <b class="opinion-s'+opinionStage(c.to)+'">'+opinionPct(c.to)+' · '+opinionStageName(c.to)+'</b></p><p class="tiny">'+opinionPartsText(c.parts)+'</p>';}
function loanLineHTML(t){
 if(!loanLeft(t))return '';
 return '<div class="row between"><span>남은 긴급 대출</span><b class="bad">'+money(t.loan.left)+' / '+money(t.loan.repay)+'</b></div><p class="tiny muted">경기마다 급여·유지비를 낸 뒤 경기 수입의 30%까지 갚습니다. 시즌 끝에 남아 있으면 해체 여론 +'+OPINION.loanAtSeasonEnd+'%p.</p>';
}
function operationHTML(t){
 const s=operationState(t);if(s.kind==='ok')return '';
 const n=t.players.length,L=t.league;
 if(s.kind==='hire')return '<div class="stack opinion-operation"><p class="bad">선수가 '+n+'명입니다. 지명타자를 포함해 10명이 되도록 영입해 주세요. 가장 싼 후보 '+money(s.cheapest)+'.</p><button class="small" data-go="market">선수 영입</button></div>';
 if(s.kind==='loan'){const o=s.offer;
  return '<div class="stack opinion-operation opinion-loan"><p class="bad"><b>운영 불가</b> · 선수 '+n+'명, 자금 '+money(t.funds)+'으로는 가장 싼 후보('+money(o.cheapest)+')도 데려올 수 없습니다.</p>'+
   '<div class="row between"><span>빌릴 금액</span><b>'+money(o.amount)+'</b></div><p class="tiny muted">'+(o.debt?'미지급금 '+money(o.debt)+' + ':'')+'모자란 '+o.need+'명 × '+money(o.cheapest)+' × 1.2'+(o.refresh?' + 후보 새로 찾기 '+money(o.refresh):'')+'</p>'+
   '<div class="row between"><span>갚을 금액 (이자 10%)</span><b>'+money(o.repay)+'</b></div>'+
   '<p class="tiny muted">미지급금은 받는 즉시 갚습니다. 경기마다 급여·유지비를 낸 뒤 경기 수입의 30%까지 갚습니다. 받는 순간 해체 여론 +'+OPINION.loanTaken+'%p, 시즌 끝에 남아 있으면 +'+OPINION.loanAtSeasonEnd+'%p. 시즌당 한 번입니다.</p>'+
   '<button class="primary small" data-opinion-loan>긴급 대출 받기</button></div>';}
 return '<div class="stack opinion-operation opinion-forfeit"><p class="bad"><b>운영 불가</b> · 선수 '+n+'명 · '+esc(s.reason)+'</p>'+
  (L?.phase==='season'?'<p class="tiny muted">남은 '+(LEAGUE.seasonGames-L.round)+'경기를 0:9 부전패로 처리하고 시즌 끝 판정으로 넘어갑니다. 부전패는 패배로 세고 해체 여론 +'+OPINION.loss+'%p(3연패째부터 +'+OPINION.streakExtra+'%p 더)입니다. 급여·배당금·관중 수입은 없습니다.</p><button class="small" data-opinion-forfeit>남은 경기 부전패 처리</button>':
   '<p class="tiny muted">긴급 대출도 받을 수 없어 이대로 다음 시즌을 시작할 수 있습니다. 시즌이 시작되면 남은 경기를 부전패로 처리합니다.</p>')+'</div>';
}
function opinionGaugeHTML(t){
 const O=opinionState(t),v=O.value,s=opinionStage(v),last=O.log.at(-1),list=OPINION_TEXTS.banner[s],banner=list[Math.floor(v)%list.length];
 return '<section class="panel stack opinion-home" data-opinion-home><div class="row between"><h3>해체 여론</h3><b class="opinion-s'+s+'">'+opinionPct(v)+' · '+OPINION_STAGES[s]+'</b></div>'+
  '<div class="opinion-bar" role="meter" aria-label="해체 여론" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(v)+'"><i class="opinion-fill'+s+'" style="width:'+clamp(v,0,100)+'%"></i></div>'+
  '<p class="tiny">관중석 현수막: “'+esc(banner)+'”</p>'+
  (last?'<p class="tiny muted">최근 변화 · '+opinionPartsText(last.parts)+' ('+opinionPct(last.from)+' → '+opinionPct(last.to)+')</p>':'')+
  (O.lossStreak>=2?'<p class="tiny bad">'+O.lossStreak+'연패 중 · 3연패째부터 패배마다 +'+OPINION.streakExtra+'%p 더</p>':'')+
  loanLineHTML(t)+(t.league?.phase==='season'?operationHTML(t):'')+
  '<p class="tiny muted">평온 0~29 · 술렁임 30~59 · 분노 60~89 · 해체 직전 90~. 시즌 끝 순위 보정까지 더해 100%면 구단이 해체되고 동네 리그에서 재창단합니다.'+(O.disbands?' 해체 '+O.disbands+'회.':'')+'</p></section>';
}
function opinionSeasonHTML(t,entry){
 if(!entry)return '';
 let html='';
 if(entry.opinion)html+=opinionChangeHTML(entry.opinion,'시즌 '+entry.season+' 해체 여론 정산');
 if(entry.forfeits)html+='<p class="tiny bad">부전패 '+entry.forfeits+'경기(0:9)</p>';
 if(entry.disband)html+='<p class="bad"><b>구단 해체</b>'+(entry.lostPrize?' · 시즌 상금 '+money(entry.lostPrize)+' 취소':'')+'</p>'+
  (entry.rebuild?'<p class="tiny">재창단 · 남은 선수 '+(entry.rebuild.kept.length?entry.rebuild.kept.map(esc).join(', '):'없음')+' · 새 선수 '+entry.rebuild.added+'명 · 떠난 선수 '+entry.rebuild.left+'명 · 동네 리그 · 자금 '+money(balance(t).startFunds)+' · 경기장 1등급 · 시설 없음 · 해체 여론 '+OPINION.restart+'%</p>':'');
 else if(entry.disbandPrevented)html+='<p class="gold">해체를 막았습니다 ('+esc(entry.disbandPrevented)+')</p>';
 return html?'<div class="stack opinion-season">'+html+'</div>':'';
}
function opinionResultHTML(t,m){
 const end=m.league?.seasonEnd;if(!m.opinion&&!end?.opinion)return '';
 return '<section class="panel stack opinion-result"><h3>해체 여론</h3>'+(m.opinion?opinionChangeHTML(m.opinion,'이번 경기'):'')+
  (m.finance?.loanRepay?'<p class="tiny">긴급 대출 상환 '+money(m.finance.loanRepay)+' · 남은 대출 '+money(m.finance.loanLeft||0)+'</p>':'')+
  (end?opinionSeasonHTML(t,end):'')+'</section>';
}
function disbandRecordsHTML(t){
 const O=opinionState(t),list=O.rebuilds.slice().reverse();
 return '<section class="panel stack opinion-records"><h2>해체 기록 · '+O.disbands+'회</h2>'+(list.length?'<table class="economy-table"><thead><tr><th>시즌</th><th>리그 · 순위</th><th>남은 선수</th><th>떠난 선수</th><th>새 선수</th></tr></thead><tbody>'+
  list.map(r=>'<tr><td>'+r.season+'</td><td>'+leagueTierName(r.tier)+(r.rank?' '+r.rank+'위':'')+'</td><td>'+(r.kept.length?r.kept.map(k=>esc(k.name)).join(', '):'없음')+'</td><td>'+r.left+'명</td><td>'+r.added+'명</td></tr>').join('')+'</tbody></table>':'<p class="muted">아직 해체된 적이 없습니다.</p>')+
  '<p class="tiny muted">해체되어도 구단 이름·색·유니폼, 업적, 기록실(경기 기록·MLB 진출 명단·이적 명단), 누적 승패는 남습니다. 지금 해체 여론 '+opinionPct(O.value)+'.</p></section>';
}
function showForfeitConfirm(t){
 const block=forfeitBlock(t);if(block){toast(block);return;}
 const left=LEAGUE.seasonGames-t.league.round;
 confirmBox('남은 경기 부전패','선수가 '+t.players.length+'명이라 경기를 시작할 수 없고, 영입할 자금도 긴급 대출도 없습니다. 남은 '+left+'경기를 0:9 부전패로 처리하고 시즌 끝 판정(순위·해체 여론·해체)으로 넘어갑니다. 되돌릴 수 없습니다.',()=>{
  const r=forfeitRemainingGames(team());if(r.error){toast(r.error);return;}
  save();toast('부전패 '+r.count+'경기를 처리했습니다. 해체 여론 '+opinionPct(r.from)+' → '+opinionPct(opinionState(team()).value));go('league');
 },'부전패 처리');
}
// The match start check: a short roster with no money opens the loan, or the forfeit when no loan is left.
const preGameBeforeOpinion=preGameEconomy;
preGameEconomy=function(t){
 if(t&&!live(t)&&Array.isArray(t.players)&&t.players.length<EMERGENCY_LOAN.players&&t.league?.phase==='season'){
  const s=operationState(t);
  if(s.kind==='loan'){toast('선수가 '+t.players.length+'명이고 영입할 자금이 없습니다. 긴급 대출을 받아 영입해 주세요.');go('market');return false;}
  if(s.kind==='forfeit'){showForfeitConfirm(t);return false;}
 }
 return preGameBeforeOpinion(t);
};
const financeResultBeforeOpinion=financeResult;
financeResult=function(m){
 const html=financeResultBeforeOpinion(m),f=m?.finance;if(!f||f.loanRepay===undefined||!(f.loanRepay>0||f.loanLeft>0))return html;
 const row='<div class="row between"><span>긴급 대출 상환 (남은 '+money(f.loanLeft||0)+(f.loanRepay?'':' · 급여·유지비를 내고 남은 돈이 없어 이번 경기는 상환 없음')+')</span><b class="bad">-'+money(f.loanRepay)+'</b></div>',at=html.indexOf('<div class="row between"><span>이번 자금 변화');
 return at<0?html+row:html.slice(0,at)+row+html.slice(at);
};
const leagueOffseasonBeforeOpinion=leagueOffseasonHTML;
leagueOffseasonHTML=function(t){
 const html=leagueOffseasonBeforeOpinion(t),at=html.indexOf('>')+1,last=t.league?.history?.at(-1);
 return html.slice(0,at)+opinionSeasonHTML(t,last)+loanLineHTML(t)+operationHTML(t)+html.slice(at);
};
function opinionInsertTop(html){const h=$('#app .pagehead');if(h)h.insertAdjacentHTML('afterend',html);else $('#app')?.insertAdjacentHTML('afterbegin',html);}
const renderBeforeOpinion=render;
render=function(){
 renderBeforeOpinion();const t=activeGame?team():null;if(!t||needsSetup(t))return;
 ensureOpinionState(t);
 if(screen==='home'){const anchor=$('#app .league-home');if(anchor)anchor.insertAdjacentHTML('beforebegin',opinionGaugeHTML(t));else{const report=$('.club-report');if(report)report.insertAdjacentHTML('afterbegin',opinionGaugeHTML(t));else opinionInsertTop(opinionGaugeHTML(t));}}
 if(screen==='result'&&t.match?.done){const html=opinionResultHTML(t,t.match);if(html){const anchor=$('#app .league-result');if(anchor)anchor.insertAdjacentHTML('afterend',html);else opinionInsertTop(html);}}
 if(screen==='records'){const anchor=$('#app .growth-retired')||$('#app .league-records');if(anchor)anchor.insertAdjacentHTML('afterend',disbandRecordsHTML(t));else $('#app').insertAdjacentHTML('afterbegin',disbandRecordsHTML(t));}
 if(['market','finance'].includes(screen)||(screen==='league'&&t.league?.phase==='season')){
  const op=operationHTML(t),loan=loanLineHTML(t),gauge=screen==='finance'?'<div class="row between"><span>해체 여론</span><b class="opinion-s'+opinionStage(t.opinion.value)+'">'+opinionPct(t.opinion.value)+' · '+opinionStageName(t.opinion.value)+'</b></div>':'';
  if(op||loan||gauge)opinionInsertTop('<section class="panel stack opinion-panel">'+gauge+loan+op+'</section>');
 }
};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-opinion-loan],[data-opinion-forfeit]');if(!b||b.disabled||!activeGame)return;
 const t=team();if(!t)return;
 if(b.hasAttribute('data-opinion-forfeit')){showForfeitConfirm(t);return;}
 const block=emergencyLoanBlock(t);if(block){toast(block);return;}
 const o=loanOffer(t),now=opinionState(t).value;
 confirmBox('긴급 대출','빌릴 금액 '+money(o.amount)+(o.debt?'(미지급금 '+money(o.debt)+'은 바로 갚음)':'')+' · 갚을 금액 '+money(o.repay)+'(이자 10%) · 경기마다 경기 수입의 30%까지 상환 · 해체 여론 +'+OPINION.loanTaken+'%p('+opinionPct(now)+' → '+opinionPct(clampOpinion(now+OPINION.loanTaken))+'). 시즌 끝에 대출이 남아 있으면 해체 여론 +'+OPINION.loanAtSeasonEnd+'%p. 시즌당 한 번만 받을 수 있습니다.',()=>{
  const error=takeEmergencyLoan(team());if(error){toast(error);return;}
  save();toast('긴급 대출 '+money(o.amount)+'을 받았습니다. 선수를 영입해 주세요.');go('market');
 },'대출 받기');
});
const opinionStyle=document.createElement('style');opinionStyle.textContent='.opinion-bar{height:12px;background:#0c2233;border:1px solid #3d6680;border-radius:6px;overflow:hidden}.opinion-bar i{display:block;height:100%}.opinion-fill0{background:#68d2a4}.opinion-fill1{background:#ffd36b}.opinion-fill2{background:#ff9a4d}.opinion-fill3{background:#ff5d5d}.opinion-s0{color:#68d2a4}.opinion-s1{color:#ffd36b}.opinion-s2{color:#ff9a4d}.opinion-s3{color:#ff6b6b}.opinion-home,.opinion-result,.opinion-panel{margin:12px 0}.opinion-operation{margin-top:8px;padding-top:8px;border-top:1px solid #294c66}.opinion-season{margin:6px 0}';
document.head.append(opinionStyle);

;document.currentScript?.remove();

// MLB departure reward, club revival tickets and support from former MLB players, build step ④ (2026-11-11).
// P15 MLB 출신 후원과 구단 회생권: 진출 보상(셋 중 하나) · 회생권(진출 1·5·10명, 시즌 끝 해체·강등 막기) · 후원 요청 · 정기 후원.
// Layout like src/league.js, src/growth.js and src/opinion.js: pure rules first, then the game-hook marker comment, then the UI marker comment.
// Tests slice the source at those two marker comments, so keep them unique.
// Season end order after this file:
//  rank → prize → opinion → revival-disband → disband → revival-relegation → promotion → aging → rebuild → offseason → opinion-record → revival-record.
// The season end runs synchronously inside the last game's settlement, so a ticket question becomes a pending decision
// (t.mlbSupport.pending). The steps it waits for (disband, promotion, rebuild, opinion-record) are skipped at the season end and run
// later by resolveRevival() with the same ③/① functions once the user decides. The next season, the stadium, MLB attempts and
// support requests wait until then, and the game shows the question (a dialog that cannot be closed without an answer).
// Extension points for later steps (do not rewrite this file for them):
//  - ⑤ 명예의 전당 (기억 애정도 −5 instead of −10): MLB_SUPPORT_HOOKS.memoryDrop.push((t,h,drop)=>newDrop).
//  - ⑥ 업적 (no achievement is added here; tickets come from the MLB count itself):
//    MLB_SUPPORT_HOOKS.ticket.push((t,milestone,entry)=>{...}) when a ticket is earned. MLB_TICKET_MILESTONES keeps the achievement ids
//    ('mlb-1' 더 큰 무대로, 'mlb-10' 세계로 보내는 구단; the 5-player achievement has no name yet, P07).
//    MLB_SUPPORT_HOOKS.revival.push((t,use)=>{...}) when a ticket blocks a disband ("구단주님, 한 번만요") or a relegation
//    ("한 시즌만 더 있게 해 주세요", 가칭). MLB_SUPPORT_HOOKS.support.push((t,h,result)=>{...}) after a support request ("잊지 않았습니다").

const MLB_SUPPORT={
 rewardOpinion:-15,                       // P15 (participant decision 2026-11-11): 해체 여론 −15%p
 rewardLoyalty:20,rewardPlayers:5,        // P15: 무작위 선수 5명 애정도 +20 (100 상한)
 rewardAbility:15,                        // P15: 가장 어린 선수가 떠난 선배의 가장 높은 능력 +15 (100 상한)
 tiers:[[90,.4],[70,.3],[50,.2],[30,.1]], // P15 Claude draft: remembered loyalty → share of his MLB fee; below 30 he refuses
 memoryDrop:10,requestOpinion:-5,         // P15 Claude draft: each request −10 remembered loyalty; support received −5%p
 regularLoyalty:90,regularShare:.05,      // P15: players who left with loyalty ≥ 90 give 5% of their fee per game …
 troubleOpinion:90,                       // … while the opinion is ≥ 90% or an emergency loan is being repaid
 ticketOpinion:70,                        // P15 · P09: a ticket used against a disband sets the opinion to 70%
 defaultLoyalty:50,                       // Temporary (④): an old record without any loyalty (mlb.js records always have one)
};
// These deltas are not BALANCE values on purpose: BALANCE validation accepts only 0..100000 (향후 구상 · 만들 때 조심할 것).
const MLB_REWARD_KEYS=['contact','power','eye','speed','sense','catch','throw','velocity','control','stamina'];// the 10 abilities (P09 note)
const MLB_REWARD_KINDS=['opinion','loyalty','ability'];
const MLB_REVIVAL_KINDS=['disband','relegation'];
const MLB_TICKET_MILESTONES=[{count:1,achievement:'mlb-1'},{count:5,achievement:null},{count:10,achievement:'mlb-10'}];// P15 (2026-11-11)
const MLB_SUPPORT_HOOKS={memoryDrop:[],ticket:[],revival:[],support:[]};
// E 묶음 "구단 회생권 사용" from 문서/관객-반응/해체-여론-문구-2026-11-10-v01.md; support lines are Claude drafts (P15: 문구 미정).
const MLB_SUPPORT_TEXTS={
 ticket:['중계진: “구단 회생권이 사용됐습니다. 빅리거들에게 고마워해야겠네요.”','우리 치어리더: “메이저리그 간 선배님들, 고마워요!”','상대 관객: “저건 반칙 아니냐? 회생권이 뭔데!”','우리 관객: “보낸 선수들이 우리를 살렸다…”'],
 thanks:['“어려울 때 키워 준 구단입니다. 이번에는 제가 돕겠습니다.”','“유니폼은 바뀌어도 마음은 그대로입니다.”','“팬들께 안부 전해 주세요. 늘 응원합니다.”'],
 refuse:['“미안합니다. 지금은 도와드리기 어렵습니다.”','“이번에는 힘들 것 같습니다.”'],
};

// ---- small helpers ----
function mlbSuccessRecords(t){return Array.isArray(t?.mlbHistory)?t.mlbHistory.filter(h=>h&&h.success):[];}
function newMlbSupportState(base=0){return {v:1,tickets:0,base,earned:[],used:[],pending:null,regular:false};}
// Not retroactive (P15 2026-11-11): a club gets its baseline the first time it is seen, so milestones up to its current MLB count are not paid.
function mlbSupportState(t){return t.mlbSupport??=newMlbSupportState(mlbSuccessRecords(t).length);}
function mlbRound(v){return Math.round(v*100)/100;}
function mlbPct(d){return (d<0?'−':'+')+Math.abs(d)+'%p';}
function mlbPick(list,n,rnd=Math.random){const a=list.slice(),out=[];while(a.length&&out.length<n){const r=Number(rnd()),i=Math.min(a.length-1,Math.max(0,Math.floor((Number.isFinite(r)?r:0)*a.length)));out.push(a.splice(i,1)[0]);}return out;}
// The youngest player; several of the same age → one of them at random (P15).
function mlbYoungest(players,rnd=Math.random){
 if(!players.length)return null;const age=p=>Number.isInteger(p.age)?p.age:Infinity,min=Math.min(...players.map(age));
 return mlbPick(players.filter(p=>age(p)===min),1,rnd)[0]||null;
}
// The departing player's highest of the 10 abilities; equal values → one of them at random (P15).
function mlbTopAbility(p,rnd=Math.random){
 const keys=MLB_REWARD_KEYS.filter(k=>Number.isFinite(p?.a?.[k]));if(!keys.length)return null;
 const max=Math.max(...keys.map(k=>p.a[k]));return mlbPick(keys.filter(k=>p.a[k]===max),1,rnd)[0]||null;
}
// Departure loyalty and remembered loyalty (P15). mlb.js keeps the loyalty at the attempt in loyaltyBefore (equal to loyaltyAfter on a success).
function mlbSupportRecord(h){
 const l=[h?.loyaltyBefore,h?.player?.loyalty].find(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100);
 const loyalty=l??MLB_SUPPORT.defaultLoyalty;
 return {loyalty,memory:loyalty,requests:0,lastSeason:null,received:0,regular:0};
}

// ---- revival tickets (MLB departures 1 · 5 · 10) ----
function nextMlbTicket(t){const S=mlbSupportState(t);return MLB_TICKET_MILESTONES.find(m=>m.count>S.base&&!S.earned.some(e=>e.count===m.count))||null;}
function grantMlbTickets(t){
 const S=mlbSupportState(t),n=mlbSuccessRecords(t).length,got=[];
 for(const m of MLB_TICKET_MILESTONES){
  if(m.count<=S.base||n<m.count||S.earned.some(e=>e.count===m.count))continue;
  S.tickets++;const e={count:m.count,season:t.league?.season??null,at:Date.now()};S.earned.push(e);got.push(e);
  news(t,'구단 회생권 1장 · MLB 진출 '+m.count+'명','MLB에 보낸 선수가 '+m.count+'명이 되었습니다. 시즌 끝 해체 판정이나 강등 판정에서 한 장으로 한 번 막을 수 있습니다. 지금 '+S.tickets+'장.');
  for(const f of MLB_SUPPORT_HOOKS.ticket)f(t,m,e);// ⑥ achievements
 }
 return got;
}

// ---- departure reward (one per successful departure, chosen by the user) ----
// Drawn at the departure and kept in the record, so a reload shows the same options and cannot re-roll them.
// Only the players on the roster at that moment can receive it (not the ones hired afterwards).
function prepareMlbReward(t,h,rnd=Math.random){
 const ids=t.players.map(p=>p.id);
 h.reward={v:1,status:'pending',eligible:ids,loyalty:mlbPick(ids,MLB_SUPPORT.rewardPlayers,rnd),youngest:mlbYoungest(t.players,rnd)?.id||null,key:mlbTopAbility(h.player,rnd),at:Date.now()};
 return h.reward;
}
function settleMlbDeparture(t,h,rnd=Math.random){
 h.support=mlbSupportRecord(h);
 prepareMlbReward(t,h,rnd);
 return grantMlbTickets(t);
}
function pendingMlbReward(t){return mlbSuccessRecords(t).find(h=>h.reward?.status==='pending')||null;}
// A drawn player who left before the choice is replaced by another player who was on the roster at the departure.
function refreshMlbReward(t,h,rnd=Math.random){
 const R=h.reward,stay=t.players.filter(p=>R.eligible.includes(p.id)),here=id=>stay.some(p=>p.id===id);
 const keep=R.loyalty.filter(here),want=Math.min(MLB_SUPPORT.rewardPlayers,stay.length);
 if(keep.length<want)R.loyalty=keep.concat(mlbPick(stay.filter(p=>!keep.includes(p.id)).map(p=>p.id),want-keep.length,rnd));
 else if(keep.length!==R.loyalty.length)R.loyalty=keep;
 if(!R.youngest||!here(R.youngest))R.youngest=mlbYoungest(stay,rnd)?.id||null;
 return stay;
}
function mlbRewardPreview(t,h){
 const R=h?.reward;if(!R)return null;
 const stay=t.players.filter(p=>R.eligible.includes(p.id)),value=Number(t.opinion?.value)||0,young=stay.find(p=>p.id===R.youngest)||null;
 return {stay:stay.length,
  opinion:{from:value,to:clampOpinion(value+MLB_SUPPORT.rewardOpinion)},
  loyalty:R.loyalty.map(id=>stay.find(p=>p.id===id)).filter(Boolean).map(p=>({id:p.id,name:p.name,from:p.loyalty,to:Math.min(100,p.loyalty+MLB_SUPPORT.rewardLoyalty)})),
  ability:young&&R.key?{id:young.id,name:young.name,age:young.age??null,key:R.key,from:young.a[R.key],to:Math.min(100,young.a[R.key]+MLB_SUPPORT.rewardAbility),senior:h.player.a[R.key]}:null};
}
function mlbRewardText(kind,result){
 if(kind==='opinion')return '해체 여론 '+Math.round(result.from)+'% → '+Math.round(result.to)+'%';
 if(kind==='loyalty')return '애정도 +'+MLB_SUPPORT.rewardLoyalty+' · '+result.players.map(p=>p.name+' '+p.from+'→'+p.to).join(', ');
 return result.name+(result.age!=null?'('+result.age+'세)':'')+' '+(typeof STATS!=='undefined'&&STATS[result.key]||result.key)+' '+result.from+' → '+result.to;
}
function chooseMlbReward(t,id,kind,rnd=Math.random){
 const h=mlbSuccessRecords(t).find(x=>x.id===id);
 if(!h?.reward)return {error:'고를 MLB 진출 보상이 없습니다.'};
 if(h.reward.status!=='pending')return {error:'이 선수의 진출 보상은 이미 받았습니다.'};
 if(!MLB_REWARD_KINDS.includes(kind))return {error:'보상 종류를 골라 주세요.'};
 const R=h.reward,stay=refreshMlbReward(t,h,rnd),name=h.player.name;let result;
 if(kind==='opinion'){const e=changeOpinion(t,MLB_SUPPORT.rewardOpinion,'MLB 진출 보상 · '+name,'mlb');result={from:e.from,to:e.to};}
 else if(kind==='loyalty'){
  const players=R.loyalty.map(x=>stay.find(p=>p.id===x)).filter(Boolean);if(!players.length)return {error:'애정도를 받을 선수가 남아 있지 않습니다.'};
  result={players:players.map(p=>{const from=p.loyalty;p.loyalty=Math.min(100,from+MLB_SUPPORT.rewardLoyalty);return {id:p.id,name:p.name,from,to:p.loyalty};})};
 }else{
  const p=stay.find(x=>x.id===R.youngest);if(!p||!R.key)return {error:'능력을 물려받을 선수가 남아 있지 않습니다.'};
  const from=p.a[R.key];p.a[R.key]=Math.min(100,from+MLB_SUPPORT.rewardAbility);
  result={id:p.id,name:p.name,age:Number.isInteger(p.age)?p.age:null,key:R.key,from,to:p.a[R.key]};
 }
 Object.assign(R,{status:'done',choice:kind,result,doneAt:Date.now()});
 news(t,'MLB 진출 보상 · '+name,{opinion:'떠나는 선배의 응원에 팬들의 마음이 조금 풀렸습니다. ',loyalty:'선배의 작별 인사에 남은 선수들이 구단에 더 정을 붙였습니다. ',ability:'선배의 주특기를 막내가 물려받았습니다. '}[kind]+mlbRewardText(kind,result)+'.');
 return {ok:true,kind,result};
}

// ---- pending season-end decisions (P09 step 4 and 5 with P15 tickets) ----
function revivalPendingRecord(kind,ctx,recorded){
 return {kind,season:ctx.season,tier:ctx.tier,rank:ctx.rank,prize:ctx.prize||0,opinion:ctx.opinion?clone(ctx.opinion):null,disband:ctx.disband?clone(ctx.disband):null,recorded,at:Date.now()};
}
function revivalAsksRelegation(t,ctx){return ctx.rank===LEAGUE.teams&&ctx.tier>0&&!ctx.relegationBlocked&&(t.mlbSupport?.tickets||0)>0;}
// Before ③'s disband step: at 100% with a ticket left the decision waits for the user (disband, promotion, rebuild and the record wait too).
function revivalDisbandStep(t,ctx){
 const S=mlbSupportState(t);
 if(opinionState(t).value<OPINION.disbandAt||!(S.tickets>0))return null;
 S.pending=revivalPendingRecord('disband',ctx,false);
 ctx.revivalPending='disband';ctx.move='pending';ctx.nextTier=ctx.tier;
 for(const id of ['disband','promotion','rebuild','opinion-record'])if(!ctx.skip.includes(id))ctx.skip.push(id);
 news(t,'시즌 '+ctx.season+' 해체 판정 · 구단 회생권을 쓸까요?','해체 여론 100%. 구단 회생권 '+S.tickets+'장으로 해체를 막을 수 있습니다. 쓰면 해체 여론 '+MLB_SUPPORT.ticketOpinion+'%로 구단이 이어지고, 쓰지 않으면 해체 후 동네 리그에서 재창단합니다.');
 return S.pending;
}
// Before ①'s promotion step: a 6th place above 동네 리그 with a ticket left waits for the user.
function revivalRelegationStep(t,ctx){
 if(ctx.skip.includes('promotion')||!revivalAsksRelegation(t,ctx))return null;
 const S=mlbSupportState(t);
 S.pending=revivalPendingRecord('relegation',ctx,true);// 'opinion-record' runs as usual at the season end
 ctx.revivalPending='relegation';ctx.move='pending';ctx.nextTier=ctx.tier;ctx.skip.push('promotion');
 news(t,'시즌 '+ctx.season+' 강등 판정 · 구단 회생권을 쓸까요?',leagueTierName(ctx.tier)+' 6위. 구단 회생권 '+S.tickets+'장으로 강등을 막고 '+leagueTierName(ctx.tier)+'에 한 시즌 더 남을 수 있습니다. 쓰지 않으면 '+leagueTierName(ctx.tier-1)+'로 내려갑니다.');
 return S.pending;
}
// After the offseason entry exists: mark it while the decision waits.
function revivalRecordStep(t,ctx){
 if(!ctx.revivalPending)return null;
 const entry=t.league?.history?.at(-1);if(!entry||entry.season!==ctx.season)return null;
 const extra={revivalPending:ctx.revivalPending};if(ctx.opinion&&!entry.opinion)extra.opinion=clone(ctx.opinion);
 Object.assign(entry,extra);if(ctx.summary)Object.assign(ctx.summary,clone(extra));
 return extra;
}
// The last game's result screen keeps a copy of the season summary; it follows the decision.
function syncSeasonSummary(t,entry){
 const end=t.match?.league?.seasonEnd;if(!end||end.season!==entry.season)return;
 const copy=clone(entry);delete copy.table;
 for(const k of Object.keys(end))if(!(k in copy))delete end[k];
 Object.assign(end,copy);
}
function useRevivalTicket(t,kind,season){
 const S=mlbSupportState(t);S.tickets=Math.max(0,S.tickets-1);
 const u={kind,season,at:Date.now()};S.used.push(u);if(S.used.length>100)S.used.splice(0,S.used.length-100);
 for(const f of MLB_SUPPORT_HOOKS.revival)f(t,u);// ⑥ achievements
 return u;
}
// use=true spends a ticket; use=false lets the disband or the relegation happen exactly as ③ / ① would have.
function resolveRevival(t,use){
 const S=mlbSupportState(t),P=S.pending;
 if(!P)return {error:'결정할 회생권 판정이 없습니다.'};
 if(live(t))return {error:'경기가 끝난 뒤 정할 수 있습니다.'};
 const L=t.league,entry=L?.history?.at(-1);
 if(!L||L.phase!=='offseason'||!entry||entry.season!==P.season){S.pending=null;return {error:'시즌 기록이 맞지 않아 판정을 지웠습니다.'};}
 if(use&&!(S.tickets>0))return {error:'남은 구단 회생권이 없습니다.'};
 const ctx={season:P.season,tier:P.tier,rank:P.rank,prize:P.prize,skip:[]};
 if(P.opinion)ctx.opinion=clone(P.opinion);
 if(P.disband)ctx.disband=clone(P.disband);
 S.pending=null;
 if(P.kind==='disband'){
  if(use){
   useRevivalTicket(t,'disband',P.season);
   const before=opinionState(t).value;
   setOpinion(t,MLB_SUPPORT.ticketOpinion,'구단 회생권',{kind:'ticket',season:P.season});
   ctx.disband={prevented:true,by:'ticket',opinion:before};
   news(t,'구단 회생권 사용 · 해체를 막았습니다',opinionPick(t,MLB_SUPPORT_TEXTS.ticket)+' 해체 여론 '+Math.round(before)+'% → '+MLB_SUPPORT.ticketOpinion+'%. 구단은 그대로 이어지고 승강은 순위대로 합니다. 남은 회생권 '+S.tickets+'장.');
   // P09: promotion and relegation still follow the rank; a ticket left can block the relegation (asked separately).
   if(revivalAsksRelegation(t,ctx)){
    S.pending={...revivalPendingRecord('relegation',ctx,P.recorded),opinion:P.opinion?clone(P.opinion):null};
    Object.assign(entry,{revivalPending:'relegation',disband:false,disbandPrevented:'ticket'});syncSeasonSummary(t,entry);
    news(t,'시즌 '+P.season+' 강등 판정 · 구단 회생권을 쓸까요?',leagueTierName(P.tier)+' 6위. 남은 회생권 '+S.tickets+'장으로 강등도 막을 수 있습니다.');
    return {ok:true,kind:'disband',use:true,next:'relegation'};
   }
  }else disbandSeasonEndStep(t,ctx);// ③: the prize goes, promotion is skipped (nothing happens if the opinion fell below 100 meanwhile)
 }else if(use){
  useRevivalTicket(t,'relegation',P.season);ctx.relegationBlocked=true;
  news(t,'구단 회생권 사용 · 강등을 막았습니다','한 시즌만 더 있게 해 주세요. '+opinionPick(t,MLB_SUPPORT_TEXTS.ticket)+' '+leagueTierName(P.tier)+'에 한 시즌 더 남습니다. 남은 회생권 '+S.tickets+'장.');
 }
 if(!ctx.skip.includes('promotion')){
  const before=L.tier;leagueMoveStep(t,ctx);
  if(L.tier!==before){t.market=[];t.marketRound=null;}// the recruit list follows the new tier (①)
  if(P.kind==='relegation'&&!use)news(t,leagueTierName(L.tier)+' 강등 · 시즌 '+P.season,'구단 회생권을 쓰지 않았습니다. 다음 시즌은 '+leagueTierName(L.tier)+'에서 뜁니다.');
 }
 if(ctx.disband&&!ctx.disband.prevented)rebuildSeasonEndStep(t,ctx);
 entry.move=ctx.move;entry.nextTier=L.tier;entry.prize=ctx.prize||0;delete entry.revivalPending;
 if(!P.recorded){
  const top=t.news[0];opinionRecordStep(t,ctx);
  // 기사회생 is a survival without a ticket (문구 v01 E · P07); the ticket news above replaces it.
  if(ctx.disband?.by==='ticket'&&t.news[0]!==top&&/^기사회생/.test(t.news[0]?.title||''))t.news.shift();
 }
 syncSeasonSummary(t,entry);
 return {ok:true,kind:P.kind,use:!!use,move:ctx.move,tier:L.tier};
}
function revivalBlock(t){return t?.mlbSupport?.pending?'시즌 '+t.mlbSupport.pending.season+' '+(t.mlbSupport.pending.kind==='disband'?'해체':'강등')+' 판정에서 구단 회생권을 쓸지 먼저 정해 주세요.':'';}

// ---- support requests (P15: from the MLB list, once per player per season) ----
function mlbSupportRate(loyalty){for(const [min,rate] of MLB_SUPPORT.tiers)if(loyalty>=min)return rate;return 0;}
// A request in the offseason counts for the coming season (like the emergency loan, ③).
function mlbSupportSeason(t){return typeof loanSeasonKey==='function'?loanSeasonKey(t):(t?.league?.season??0);}
function mlbSupportMemoryDrop(t,h){let d=MLB_SUPPORT.memoryDrop;for(const f of MLB_SUPPORT_HOOKS.memoryDrop){const v=Number(f(t,h,d));if(Number.isFinite(v)&&v>=0)d=v;}return d;}
function mlbSupportQuote(t,h){
 const s=h?.support;if(!h?.success||!s)return null;
 const rate=mlbSupportRate(s.memory),drop=mlbSupportMemoryDrop(t,h),season=mlbSupportSeason(t),reasons=[];
 if(live(t))reasons.push('경기가 끝난 뒤 요청할 수 있습니다.');
 const block=revivalBlock(t);if(block)reasons.push(block);
 if(s.lastSeason===season)reasons.push('이번 시즌에는 이미 요청했습니다. 다음 시즌에 다시 요청할 수 있습니다.');
 return {rate,amount:Math.round((Number(h.fee)||0)*rate),refuse:rate===0,memory:s.memory,after:Math.max(0,mlbRound(s.memory-drop)),drop,season,reasons,ok:!reasons.length};
}
function requestMlbSupport(t,id){
 const h=mlbSuccessRecords(t).find(x=>x.id===id),q=mlbSupportQuote(t,h);
 if(!q)return {error:'MLB 진출 선수의 기록이 아닙니다.'};
 if(!q.ok)return {error:q.reasons[0]};
 const s=h.support,name=h.player.name;
 s.memory=q.after;s.requests++;s.lastSeason=q.season;
 let result;
 if(q.refuse){
  result={refused:true,amount:0,rate:0,from:q.memory,to:q.after};
  news(t,'MLB 출신 '+name+' · 후원 요청 거절',name+' 선수가 답했습니다. '+opinionPick(t,MLB_SUPPORT_TEXTS.refuse)+' 기억하는 애정도 '+Math.round(q.memory)+' → '+Math.round(q.after)+'.');
 }else{
  if(q.amount>0)gain(t,q.amount,'MLB 출신 후원 · '+name);
  s.received=mlbRound(s.received+q.amount);
  const e=changeOpinion(t,MLB_SUPPORT.requestOpinion,'MLB 출신 후원 · '+name,'mlb-support');
  result={refused:false,amount:q.amount,rate:q.rate,from:q.memory,to:q.after,opinion:{from:e.from,to:e.to}};
  news(t,'MLB 출신 '+name+' · 친정에 '+money(q.amount)+' 후원',name+' 선수가 후원 요청에 응했습니다. '+opinionPick(t,MLB_SUPPORT_TEXTS.thanks)+' 이적료 '+money(h.fee)+'의 '+Math.round(q.rate*100)+'% · 해체 여론 '+mlbPct(MLB_SUPPORT.requestOpinion)+' · 기억하는 애정도 '+Math.round(q.memory)+' → '+Math.round(q.after)+'.');
 }
 for(const f of MLB_SUPPORT_HOOKS.support)f(t,h,result);// ⑥ "잊지 않았습니다"
 return {ok:true,...result};
}

// ---- regular support (P15: every game while the club is in deep trouble) ----
function mlbClubInTrouble(t){return (Number(t?.opinion?.value)||0)>=MLB_SUPPORT.troubleOpinion||(typeof loanLeft==='function'&&loanLeft(t)>0);}
// Qualifies by the loyalty he left with, even after requests lowered the remembered loyalty (Temporary ④, P15 미정).
function mlbRegularSupporters(t){return mlbSuccessRecords(t).filter(h=>h.support&&h.support.loyalty>=MLB_SUPPORT.regularLoyalty);}
// Checked with the club's state entering the game (before its opinion change and loan repayment), paid before the wages.
function regularSupportQuote(t){const rows=(mlbClubInTrouble(t)?mlbRegularSupporters(t):[]).map(h=>({id:h.id,name:h.player.name,amount:Math.round((Number(h.fee)||0)*MLB_SUPPORT.regularShare)})).filter(r=>r.amount>0);return {rows,total:rows.reduce((sum,r)=>sum+r.amount,0)};}
function payRegularSupport(t,m){
 if(!t||!m||m.mlbSupport!==undefined)return null;
 const S=mlbSupportState(t),quote=regularSupportQuote(t),rows=quote.rows,total=quote.total;
 for(const row of rows){
  const h=mlbSuccessRecords(t).find(h=>h.id===row.id);
  gain(t,row.amount,'MLB 출신 정기 후원 · '+row.name);h.support.regular=mlbRound(h.support.regular+row.amount);
 }
 if(!rows.length){S.regular=false;return null;}
 if(!S.regular)news(t,'MLB 출신 정기 후원 시작','구단이 어렵다는 소식에 '+rows.map(r=>r.name).join(', ')+' 선수가 경기마다 이적료의 5%를 보내기로 했습니다. 해체 여론이 '+MLB_SUPPORT.troubleOpinion+'% 아래로 내려가고 긴급 대출을 다 갚으면 멈춥니다.');
 S.regular=true;
 m.mlbSupport={total,rows,opinion:Number(t.opinion?.value)||0,loan:typeof loanLeft==='function'?loanLeft(t):0};
 return m.mlbSupport;
}
// After the settlement exists: the result screen and the saved history show the support with the other income.
function recordRegularSupport(t,m){
 const s=m?.mlbSupport,f=m?.finance;if(!s||!f||f.support!==undefined)return;
 f.support=s.total;if(Number.isFinite(f.net))f.net+=s.total;
 const h=t.history?.find(x=>x.id===m.id);if(h){if(h.finance)h.finance=clone(f);h.mlbSupport=clone(s);}
}

// ---- old saves and validation ----
function ensureMlbSupportState(t){
 if(!t||!Array.isArray(t.players))return null;
 const fresh=!t.mlbSupport,S=mlbSupportState(t);
 S.earned??=[];S.used??=[];S.tickets??=0;S.base??=0;S.regular??=false;if(S.pending===undefined)S.pending=null;
 for(const h of mlbSuccessRecords(t))if(!h.support)h.support=mlbSupportRecord(h);
 // A decision whose season record is gone could never be answered: drop it so the club never stays stuck.
 const P=S.pending,L=t.league;if(P&&(!L||L.phase!=='offseason'||L.history?.at(-1)?.season!==P.season))S.pending=null;
 if(fresh&&S.base>0&&Array.isArray(t.news)){const next=nextMlbTicket(t);news(t,'구단 회생권 · MLB 진출 '+S.base+'명부터 셈','이미 MLB에 보낸 '+S.base+'명의 회생권은 소급하지 않습니다.'+(next?' 다음 회생권은 MLB 진출 '+next.count+'명 때 받습니다.':''));}
 return S;
}
function validateMlbSupportState(t){
 const fail=msg=>{throw Error('MLB 후원·회생권 자료 오류 · '+msg);};
 const int=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b,num=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b,obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v),id=v=>typeof v==='string'&&v.length>0&&v.length<=80;
 const change=c=>obj(c)&&num(c.from,0,100)&&num(c.to,0,100)&&Array.isArray(c.parts);
 const S=t.mlbSupport;
 if(S!==undefined){
  if(!obj(S)||S.v!==1)fail('형식');
  if(!int(S.tickets,0,MLB_TICKET_MILESTONES.length))fail('회생권 수');
  if(!int(S.base,0,1e6))fail('소급 기준');
  if(!Array.isArray(S.earned)||S.earned.length>MLB_TICKET_MILESTONES.length||S.earned.some(e=>!obj(e)||!MLB_TICKET_MILESTONES.some(m=>m.count===e.count))||new Set(S.earned.map(e=>e.count)).size!==S.earned.length)fail('받은 회생권');
  if(!Array.isArray(S.used)||S.used.length>100||S.used.some(u=>!obj(u)||!MLB_REVIVAL_KINDS.includes(u.kind)||!int(u.season,0,1e6)))fail('쓴 회생권');
  if(S.regular!==undefined&&typeof S.regular!=='boolean')fail('정기 후원');
  const P=S.pending;
  if(P!=null){
   if(!obj(P)||!MLB_REVIVAL_KINDS.includes(P.kind)||!int(P.season,1,1e6)||!int(P.tier,0,LEAGUE.names.length-1)||!int(P.rank,1,LEAGUE.teams)||!num(P.prize,0,1e7)||typeof P.recorded!=='boolean')fail('판정 대기');
   if(P.kind==='relegation'&&(P.rank!==LEAGUE.teams||P.tier<1))fail('판정 대기 · 강등');
   if(P.opinion!=null&&!change(P.opinion))fail('판정 대기 · 여론');
   if(P.disband!=null&&(!obj(P.disband)||P.disband.prevented!==true))fail('판정 대기 · 해체');
   const L=t.league,last=Array.isArray(L?.history)?L.history.at(-1):null;
   if(!L||L.phase!=='offseason'||!last||last.season!==P.season)fail('판정 대기 · 시즌');
  }
 }
 for(const h of Array.isArray(t.mlbHistory)?t.mlbHistory:[]){
  if(!h)continue;
  const s=h.support;
  if(s!==undefined&&(!h.success||!obj(s)||!num(s.loyalty,0,100)||!num(s.memory,0,100)||!int(s.requests,0,1e6)||(s.lastSeason!==null&&!int(s.lastSeason,0,1e6))||!num(s.received,0,1e9)||!num(s.regular,0,1e9)))fail('후원 기록');
  const R=h.reward;
  if(R!==undefined){
   if(!h.success||!obj(R)||R.v!==1||!['pending','done'].includes(R.status)||!Array.isArray(R.eligible)||R.eligible.length>35||!R.eligible.every(id)||
    !Array.isArray(R.loyalty)||R.loyalty.length>MLB_SUPPORT.rewardPlayers||!R.loyalty.every(x=>R.eligible.includes(x))||(R.youngest!=null&&!R.eligible.includes(R.youngest))||(R.key!=null&&!MLB_REWARD_KEYS.includes(R.key)))fail('진출 보상');
   if(R.status==='done'&&(!MLB_REWARD_KINDS.includes(R.choice)||!obj(R.result)))fail('진출 보상 결과');
  }
 }
 for(const m of [t.match,...(Array.isArray(t.history)?t.history:[])].filter(Boolean)){
  const s=m.mlbSupport;
  if(s!==undefined&&(!obj(s)||!num(s.total,0,1e7)||!Array.isArray(s.rows)||s.rows.length>50||s.rows.some(r=>!obj(r)||!num(r.amount,0,1e7))))fail('정기 후원 기록');
  if(m.finance?.support!==undefined&&!num(m.finance.support,0,1e7))fail('정기 후원 기록');
 }
 for(const e of Array.isArray(t.league?.history)?t.league.history:[])if(e?.revivalPending!==undefined&&!MLB_REVIVAL_KINDS.includes(e.revivalPending))fail('시즌 기록');
}

// Game hooks.
// Season end (P09 order with P15 tickets): the disband question before ③'s disband, the relegation question before ①'s promotion.
addLeagueSeasonEndStep({id:'revival-disband',run:revivalDisbandStep},{before:'disband'});
addLeagueSeasonEndStep({id:'revival-relegation',run:revivalRelegationStep},{before:'promotion'});
addLeagueSeasonEndStep({id:'revival-record',run:revivalRecordStep},{after:'opinion-record'});
// A successful departure: departure and remembered loyalty, the pending reward and the milestone tickets.
const completeMlbAttemptBeforeSupport=completeMlbAttempt;
completeMlbAttempt=function(t,quote,random=Math.random){
 if(t&&!t.mlbSupport)mlbSupportState(t);// an old club gets its baseline before this departure counts
 const r=completeMlbAttemptBeforeSupport(t,quote,random);
 if(r?.ok&&r.result?.success)settleMlbDeparture(t,r.result,random);
 return r;
};
// The next MLB attempt waits for the last reward and for a season-end decision. Read only: never creates state.
function mlbSupportBlock(t){const b=revivalBlock(t);if(b)return b;return pendingMlbReward(t)?'지난 MLB 진출 보상을 먼저 골라 주세요.':'';}
const mlbQuoteBeforeSupport=mlbQuote;
mlbQuote=function(t,id){const q=mlbQuoteBeforeSupport(t,id);if(!q)return q;const block=mlbSupportBlock(t);if(block){q.reasons.push(block);q.eligible=false;}return q;};
const leagueNextSeasonBlockBeforeSupport=leagueNextSeasonBlock;
leagueNextSeasonBlock=function(t){return revivalBlock(t)||leagueNextSeasonBlockBeforeSupport(t);};
const stadiumUpgradeBlockBeforeSupport=stadiumUpgradeBlock;
stadiumUpgradeBlock=function(t){return revivalBlock(t)||stadiumUpgradeBlockBeforeSupport(t);};
const retirementBlockBeforeSupport=retirementBlock;
retirementBlock=function(t,p){return revivalBlock(t)||retirementBlockBeforeSupport(t,p);};
const leagueMoveTextBeforeSupport=leagueMoveText;
leagueMoveText=function(entry,L){return entry?.move==='pending'?'구단 회생권 결정 대기':leagueMoveTextBeforeSupport(entry,L);};
// Regular support: checked entering the game, paid before the wages (like the league payout), shown in the settlement.
const rewardBeforeSupport=reward;
reward=function(m){
 if(m.rewarded)return rewardBeforeSupport(m);
 const t=team(),ours=!!t&&t.match===m;
 if(ours)payRegularSupport(t,m);
 const result=rewardBeforeSupport(m);
 if(ours&&m.rewarded)recordRegularSupport(t,m);
 return result;
};
const ensureClubBeforeSupport=ensureClub;
ensureClub=function(t){ensureClubBeforeSupport(t);if(t&&typeof data!=='undefined'&&data?.slots?.includes(t))ensureMlbSupportState(t);};
const validateTeamBeforeSupport=validateTeam;
validateTeam=function(t){validateTeamBeforeSupport(t);validateMlbSupportState(t);};

// UI integration.
let mlbRewardDialog=null,revivalDialog=null;
function mlbStat(k){return (typeof STATS!=='undefined'&&STATS[k])||k;}
function mlbSupportDialog(cls,html){
 const el=document.createElement('dialog');el.className='mlb-dialog '+cls;el.innerHTML=html;document.body.append(el);el.showModal();
 el.addEventListener('cancel',e=>e.preventDefault());// an answer is required (P15: the reward cannot be skipped)
 // If the browser still closes it (repeated Esc), forget it and ask again: nothing moves on without an answer.
 el.addEventListener('close',()=>{
  if(mlbRewardDialog?.el===el)mlbRewardDialog=null;else if(revivalDialog?.el===el)revivalDialog=null;else return;
  el.remove();setTimeout(()=>{if(activeGame)mlbSupportPrompt(team());},0);
 });
 return el;
}
function closeSupportDialog(state){if(!state)return;state.el.close();state.el.remove();}
function showMlbRewardDialog(){
 const t=activeGame?team():null,h=t&&pendingMlbReward(t);
 if(!h||mlbRewardDialog||revivalDialog||mlbDialog)return;
 const before=JSON.stringify(h.reward);refreshMlbReward(t,h);if(JSON.stringify(h.reward)!==before)save();
 const v=mlbRewardPreview(t,h),a=v.ability;
 const option=(kind,title,detail,ok)=>'<div class="mlb-reward-option"><h3>'+title+'</h3><p class="tiny">'+detail+'</p><button class="primary small" data-mlb-reward="'+kind+'" '+(ok?'':'disabled')+'>이것으로 받기</button></div>';
 const el=mlbSupportDialog('mlb-reward-dialog','<article class="mlb-dialog-card success"><p class="eyebrow">MLB DEPARTURE REWARD</p><h2>'+esc(h.player.name)+' · MLB 진출 보상</h2>'+
  '<p class="mlb-notice">떠나는 선배가 남긴 선물입니다. 셋 중 하나를 고르세요. 진출할 때 구단에 있던 선수 '+v.stay+'명만 받을 수 있습니다. 고르기 전에는 다음 경기와 MLB 도전을 시작할 수 없습니다.</p>'+
  '<div class="mlb-reward-options">'+
  option('opinion','해체 여론 '+mlbPct(MLB_SUPPORT.rewardOpinion),'지금 '+Math.round(v.opinion.from)+'% → '+Math.round(v.opinion.to)+'%',true)+
  option('loyalty','선수 '+MLB_SUPPORT.rewardPlayers+'명 애정도 +'+MLB_SUPPORT.rewardLoyalty,v.loyalty.length?v.loyalty.map(p=>esc(p.name)+' '+p.from+' → '+p.to).join(' · ')+' (100 상한)':'받을 선수가 남아 있지 않습니다.',v.loyalty.length>0)+
  option('ability','막내가 선배의 주특기 물려받기 +'+MLB_SUPPORT.rewardAbility,a?esc(a.name)+(a.age!=null?'('+a.age+'세)':'')+' '+mlbStat(a.key)+' '+a.from+' → '+a.to+' · 선배 '+esc(h.player.name)+'의 '+mlbStat(a.key)+' '+a.senior+(a.to===100?' (100 상한)':''):'받을 선수가 남아 있지 않습니다.',!!a)+
  '</div><p class="mlb-error" role="status"></p></article>');
 const state=mlbRewardDialog={el,id:h.id,teamId:t.id};
 el.addEventListener('click',e=>{
  const b=e.target.closest('[data-mlb-reward]');if(!b||b.disabled||mlbRewardDialog!==state||team()?.id!==state.teamId)return;
  const r=chooseMlbReward(team(),state.id,b.dataset.mlbReward);
  if(r.error){el.querySelector('.mlb-error').textContent=r.error;return;}
  mlbRewardDialog=null;closeSupportDialog(state);save();toast('MLB 진출 보상 · '+mlbRewardText(r.kind,r.result));render();
 });
}
function revivalDialogHTML(t,P,confirming){
 const S=t.mlbSupport,tier=leagueTierName(P.tier),down=P.tier>0?leagueTierName(P.tier-1):tier,o=P.opinion;
 const choice=(kind,label,title,detail,button,primary)=>'<div><span>'+label+'</span><strong>'+title+'</strong><p class="tiny">'+detail+'</p><button class="'+(primary?'primary':'')+'" data-revival-choice="'+kind+'">'+button+'</button></div>';
 let html='<article class="mlb-dialog-card '+(P.kind==='disband'?'failure':'success')+'"><p class="eyebrow">CLUB REVIVAL TICKET</p>';
 if(P.kind==='disband'){
  const keep=rebuildKeepers(t.players),relegate=P.rank===LEAGUE.teams&&P.tier>0;
  html+='<h2>시즌 '+P.season+' 해체 판정</h2><p>'+tier+' '+P.rank+'위'+(o?' · 해체 여론 정산 '+Math.round(o.from)+'% → '+Math.round(o.to)+'%':'')+' · 해체 판정. 구단 회생권 <b class="gold">'+S.tickets+'장</b>이 있습니다.</p><div class="mlb-offer-terms">'+
   choice('use','회생권 1장 사용','해체 막기','해체 여론 '+MLB_SUPPORT.ticketOpinion+'%로 내려가고 선수·자금·시설·경기장이 그대로 이어집니다'+(P.prize?' (시즌 상금 '+money(P.prize)+' 유지)':'')+'. 승강은 순위대로: '+(relegate?(S.tickets>=2?'6위라 강등 판정이 이어지고, 남은 회생권으로 강등도 막을지 한 번 더 묻습니다.':'6위라 '+down+'로 강등됩니다.'):tier+'에 남습니다.'),'회생권 쓰기',true)+
   choice('proceed','그대로 진행','해체 · 재창단',(P.prize?'시즌 상금 '+money(P.prize)+' 취소. ':'')+'동네 리그, 자금 '+money(balance(t).startFunds)+', 시설 없음, 경기장 1등급, 해체 여론 '+OPINION.restart+'%. 남는 선수: '+(keep.length?keep.map(p=>esc(p.name)+'(애정도 '+p.loyalty+')').join(', '):'없음')+'. 쓰지 않은 회생권 '+S.tickets+'장은 새 구단에 남습니다.',confirming?'정말 해체하기':'해체하기',false)+'</div>';
 }else{
  const L=t.league;
  html+='<h2>시즌 '+P.season+' 강등 판정</h2><p>'+tier+' 6위 · 강등 판정. 구단 회생권 <b class="gold">'+S.tickets+'장</b>이 있습니다.'+(L.history.at(-1)?.disbandPrevented==='ticket'?' 해체는 회생권으로 막았습니다.':'')+'</p><div class="mlb-offer-terms">'+
   choice('use','회생권 1장 사용','강등 막기',tier+'에 한 시즌 더 남아 리그 배당금 '+money(leaguePayout(P.tier))+', 영입 후보 능력 +'+leagueMarketOffset(P.tier)+(typeof growthLeagueMultiplier==='function'?', 경기 경험치 ×'+growthLeagueMultiplier(P.tier):'')+' 혜택을 유지합니다.','회생권 쓰기',true)+
   choice('proceed','그대로 진행',down+' 강등','다음 시즌은 '+down+'(배당금 '+money(leaguePayout(P.tier-1))+')에서 뜁니다. 회생권 '+S.tickets+'장은 그대로 남습니다.','강등 받아들이기',false)+'</div>';
 }
 return html+'<p class="mlb-error" role="status">'+(confirming?'한 번 더 누르면 해체합니다. 되돌릴 수 없습니다.':'')+'</p></article>';
}
function showRevivalDialog(){
 const t=activeGame?team():null,P=t?.mlbSupport?.pending;
 if(!P||revivalDialog||mlbRewardDialog||mlbDialog)return;
 const el=mlbSupportDialog('revival-dialog',revivalDialogHTML(t,P,false));
 const state=revivalDialog={el,teamId:t.id,confirming:false};
 el.addEventListener('click',e=>{
  const b=e.target.closest('[data-revival-choice]');if(!b||b.disabled||revivalDialog!==state||team()?.id!==state.teamId)return;
  const now=team(),use=b.dataset.revivalChoice==='use';
  if(!use&&now.mlbSupport?.pending?.kind==='disband'&&!state.confirming){state.confirming=true;el.innerHTML=revivalDialogHTML(now,now.mlbSupport.pending,true);return;}
  const r=resolveRevival(now,use);
  if(r.error){el.querySelector('.mlb-error').textContent=r.error;return;}
  revivalDialog=null;closeSupportDialog(state);save();
  toast(r.next==='relegation'?'회생권으로 해체를 막았습니다. 이어서 강등 판정입니다.':r.kind==='disband'?(r.use?'회생권으로 해체를 막았습니다.':(r.move==='disband'?'구단이 해체되어 동네 리그에서 재창단합니다.':'해체되지 않았습니다.')):(r.use?'회생권으로 강등을 막았습니다.':leagueTierName(r.tier)+'로 강등됩니다.'));
  render();
 });
}
// The questions appear on any screen except a running game, after the other result dialogs and scenes.
// Closes a question without asking again (another team is shown, it was answered elsewhere, or an MLB result comes first).
function dropSupportDialog(kind){
 const s=kind==='reward'?mlbRewardDialog:revivalDialog;if(!s)return;
 if(kind==='reward')mlbRewardDialog=null;else revivalDialog=null;
 s.el.close();s.el.remove();
}
function mlbSupportPrompt(t){
 const own=activeGame&&t?t:null;
 if(mlbRewardDialog&&(!own||mlbRewardDialog.teamId!==own.id||!pendingMlbReward(own)))dropSupportDialog('reward');
 if(revivalDialog&&(!own||revivalDialog.teamId!==own.id||!own.mlbSupport?.pending))dropSupportDialog('revival');
 if(!own||['match','slots','create','setup'].includes(screen)||live(t))return;
 if(mlbRewardDialog||revivalDialog||mlbDialog||document.querySelector('dialog[open]'))return;// one dialog at a time
 if((typeof clubEventView!=='undefined'&&clubEventView)||(typeof entrance!=='undefined'&&entrance))return;
 if(t.mlbSupport?.pending)showRevivalDialog();else if(pendingMlbReward(t))showMlbRewardDialog();
}
const closeMlbDialogBeforeSupport=closeMlbDialog;
closeMlbDialog=function(){const result=!!mlbDialog?.result;closeMlbDialogBeforeSupport();if(result&&activeGame)mlbSupportPrompt(team());};
const showMlbResultBeforeSupport=showMlbResult;
// The MLB result comes first; a question already open steps aside and comes back when the result is closed.
showMlbResult=function(h){if(!mlbDialog&&h){dropSupportDialog('reward');dropSupportDialog('revival');}return showMlbResultBeforeSupport(h);};
const preGameBeforeSupport=preGameEconomy;
preGameEconomy=function(t){
 if(t&&!live(t)){
  if(t.mlbSupport?.pending){toast(revivalBlock(t));showRevivalDialog();return false;}
  if(pendingMlbReward(t)){toast('MLB 진출 보상을 먼저 골라 주세요.');showMlbRewardDialog();return false;}
 }
 return preGameBeforeSupport(t);
};
function mlbTicketLineHTML(t){
 const S=mlbSupportState(t),n=mlbSuccessRecords(t).length,next=nextMlbTicket(t);
 return '<p class="tiny mlb-ticket-line">구단 회생권 <b class="gold">'+S.tickets+'장</b> · MLB 진출 '+n+'명 · '+(next?'다음 회생권: 진출 '+next.count+'명':'진출 회생권을 모두 받았습니다')+(S.base?' (업데이트 전 진출 '+S.base+'명은 소급하지 않음)':'')+(S.used.length?' · 쓴 회생권 '+S.used.length+'장':'')+'. 시즌 끝 해체 판정이나 강등 판정에서 한 장으로 한 번 막습니다.</p>';
}
function mlbSupportHomeHTML(t){
 const S=mlbSupportState(t),reward=pendingMlbReward(t),sup=mlbRegularSupporters(t),trouble=mlbClubInTrouble(t);
 return '<section class="panel stack mlb-support-home" data-mlb-support-home><div class="row between"><h3>구단 회생권</h3><b class="gold">'+S.tickets+'장</b></div>'+mlbTicketLineHTML(t)+
  (S.pending?'<p class="bad"><b>'+esc(revivalBlock(t))+'</b></p><button class="primary small" data-revival-open>회생권 판정</button>':'')+
  (reward?'<p class="gold">'+esc(reward.player.name)+' MLB 진출 보상을 아직 고르지 않았습니다.</p><button class="primary small" data-mlb-reward-open>진출 보상 고르기</button>':'')+
  (sup.length?'<p class="tiny">'+(trouble?'<b class="gold">정기 후원 중</b>':'정기 후원 대기')+' · 애정도 '+MLB_SUPPORT.regularLoyalty+' 이상으로 떠난 '+sup.map(h=>esc(h.player.name)).join(', ')+' · 해체 여론 '+MLB_SUPPORT.troubleOpinion+'% 이상이거나 긴급 대출을 갚는 동안 경기마다 이적료의 5%</p>':'')+
  '<p class="tiny muted">MLB 출신 선수에게는 기록실의 MLB 진출 명단에서 시즌마다 한 번 후원을 요청할 수 있습니다.</p></section>';
}
function mlbRewardDoneText(h){const R=h.reward;return R?.status==='done'?{opinion:'해체 여론 '+mlbPct(MLB_SUPPORT.rewardOpinion),loyalty:'선수 '+(R.result?.players?.length||0)+'명 애정도 +'+MLB_SUPPORT.rewardLoyalty,ability:esc(R.result?.name||'')+' '+mlbStat(R.key)+' +'+((R.result?.to??0)-(R.result?.from??0))}[R.choice]:'';}
function mlbSupportCardHTML(t,h){
 const s=h.support;if(!s)return '';const q=mlbSupportQuote(t,h);
 return '<div class="mlb-support-card"><p>떠날 때 애정도 <b>'+Math.round(s.loyalty)+'</b> · 기억하는 애정도 <b>'+Math.round(s.memory)+'</b>'+(s.loyalty>=MLB_SUPPORT.regularLoyalty?' · <span class="gold">정기 후원 대상</span>':'')+'</p>'+
  (s.requests||s.regular?'<p>받은 후원 '+money(s.received)+(s.regular?' · 정기 후원 '+money(s.regular):'')+' · 요청 '+s.requests+'번</p>':'')+
  (h.reward?'<p>'+(h.reward.status==='done'?'진출 보상: '+mlbRewardDoneText(h):'<span class="gold">진출 보상을 아직 고르지 않았습니다.</span>')+'</p>':'')+
  '<button class="small" data-mlb-support="'+esc(h.id)+'" '+(q.ok?'':'disabled')+'>후원 요청 · '+(q.refuse?'거절 예상':money(q.amount)+' (이적료의 '+Math.round(q.rate*100)+'%)')+'</button>'+
  (q.ok?'':'<p class="tiny muted">'+esc(q.reasons[0])+'</p>')+'</div>';
}
const mlbHistoryBeforeSupport=mlbHistoryHTML;
mlbHistoryHTML=function(t){
 const root=document.createElement('div');root.innerHTML=mlbHistoryBeforeSupport(t);
 root.querySelector('.mlb-history > .row')?.insertAdjacentHTML('afterend',mlbTicketLineHTML(t)+'<p class="tiny muted">후원 요청: 선수마다 시즌에 한 번. 기억하는 애정도 90 이상 이적료의 40% · 70~89 30% · 50~69 20% · 30~49 10% · 30 미만 거절. 요청할 때마다 기억하는 애정도 −'+MLB_SUPPORT.memoryDrop+', 후원을 받으면 해체 여론 '+mlbPct(MLB_SUPPORT.requestOpinion)+'.</p>');
 for(const art of root.querySelectorAll('.mlb-graduate')){
  const id=art.querySelector('canvas[data-mlb-portrait]')?.dataset.mlbPortrait,h=mlbSuccessRecords(t).find(x=>x.id===id);if(!h)continue;
  const details=art.querySelector('details');if(details)details.insertAdjacentHTML('beforebegin',mlbSupportCardHTML(t,h));else art.lastElementChild?.insertAdjacentHTML('beforeend',mlbSupportCardHTML(t,h));
 }
 return root.innerHTML;
};
function revivalPanelHTML(t){
 const S=t.mlbSupport;if(!S)return '';
 if(S.pending)return '<div class="stack revival-pending"><p class="bad"><b>구단 회생권 판정 대기</b> · '+esc(revivalBlock(t))+' 결정하기 전에는 다음 시즌을 시작할 수 없습니다.</p><button class="primary small" data-revival-open>회생권 판정</button></div>';
 return S.tickets?'<p class="tiny gold">구단 회생권 '+S.tickets+'장 · 시즌 끝 해체 판정이나 강등 판정에서 씁니다.</p>':'';
}
const leagueOffseasonBeforeSupport=leagueOffseasonHTML;
leagueOffseasonHTML=function(t){const html=leagueOffseasonBeforeSupport(t),at=html.indexOf('>')+1;return html.slice(0,at)+revivalPanelHTML(t)+html.slice(at);};
const opinionSeasonBeforeSupport=opinionSeasonHTML;
opinionSeasonHTML=function(t,entry){
 let html=opinionSeasonBeforeSupport(t,entry);if(!entry)return html;
 html=html.replace('해체를 막았습니다 (ticket)','해체를 막았습니다 (구단 회생권 사용)');
 if(!entry.revivalPending)return html;
 const line='<p class="gold">구단 회생권 판정 대기 · '+(entry.revivalPending==='disband'?'해체':'강등')+'를 막을지 정해 주세요.</p>',at=html.lastIndexOf('</div>');
 return at<0?'<div class="stack opinion-season">'+line+'</div>':html.slice(0,at)+line+html.slice(at);
};
const financeResultBeforeSupport=financeResult;
financeResult=function(m){
 const html=financeResultBeforeSupport(m),s=m?.mlbSupport;if(!s?.total||m.finance?.support===undefined)return html;
 const row='<div class="row between"><span>MLB 출신 정기 후원 ('+s.rows.map(r=>esc(r.name)).join(', ')+')</span><b class="good">+'+money(s.total)+'</b></div>',at=html.indexOf('<div class="row between"><span>이번 자금 변화');
 return at<0?html+row:html.slice(0,at)+row+html.slice(at);
};
const renderBeforeSupport=render;
render=function(){
 renderBeforeSupport();const t=activeGame?team():null;if(!t||needsSetup(t)){mlbSupportPrompt(null);return;}
 ensureMlbSupportState(t);
 if(screen==='home'){const html=mlbSupportHomeHTML(t),gauge=$('#app [data-opinion-home]'),league=$('#app .league-home');
  if(gauge)gauge.insertAdjacentHTML('afterend',html);else if(league)league.insertAdjacentHTML('beforebegin',html);else $('#app')?.insertAdjacentHTML('beforeend',html);}
 mlbSupportPrompt(t);
};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-mlb-support],[data-mlb-reward-open],[data-revival-open]');if(!b||b.disabled||!activeGame||b.closest('dialog'))return;
 const t=team();if(!t)return;
 if(b.hasAttribute('data-mlb-reward-open')){showMlbRewardDialog();return;}
 if(b.hasAttribute('data-revival-open')){showRevivalDialog();return;}
 const h=mlbSuccessRecords(t).find(x=>x.id===b.dataset.mlbSupport),q=mlbSupportQuote(t,h);
 if(!q){toast('MLB 진출 선수의 기록이 아닙니다.');return;}
 if(!q.ok){toast(q.reasons[0]);return;}
 confirmBox('MLB 출신 후원 요청',h.player.name+' 선수에게 후원을 요청합니다. 기억하는 애정도 '+Math.round(q.memory)+(q.refuse?' · 30 미만이라 거절할 것 같습니다.':' · 예상 금액 '+money(q.amount)+'(이적료의 '+Math.round(q.rate*100)+'%) · 해체 여론 '+mlbPct(MLB_SUPPORT.requestOpinion)+'.')+' 요청 후 기억하는 애정도: '+Math.round(q.memory)+' → '+Math.round(q.after)+'. 이 선수에게는 다음 시즌에 다시 요청할 수 있습니다.',()=>{
  const r=requestMlbSupport(team(),h.id);if(r.error){toast(r.error);return;}
  save();toast(r.refused?h.player.name+' 선수가 후원 요청을 거절했습니다.':h.player.name+' 선수가 '+money(r.amount)+'을 후원했습니다.');render();
 },'후원 요청');
});
const mlbSupportStyle=document.createElement('style');mlbSupportStyle.textContent='.mlb-reward-options{display:grid;gap:12px;margin:18px 0}.mlb-reward-option{display:grid;gap:8px;background:#123650;border:1px solid #497385;padding:14px;border-radius:7px}.mlb-reward-option h3{color:#f3d178;font-size:16px}.mlb-support-card{margin-top:12px;padding-top:10px;border-top:1px solid #426478;font-size:12px;display:grid;gap:6px}.mlb-support-card p{margin:0}.mlb-support-home{margin:12px 0}.mlb-ticket-line{margin-top:8px}.revival-pending{margin:8px 0}.revival-dialog .mlb-offer-terms button{margin-top:8px}';
document.head.append(mlbSupportStyle);

;document.currentScript?.remove();

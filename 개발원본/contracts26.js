// Trial wage model. All cash values remain in the game's existing 10,000-won units.
BALANCE.salaryBonusChance=.3;BALANCE.salaryBonusLoyalty=1;
BALANCE_LABELS.salaryBonusChance='고급여 애정도 상승 확률';BALANCE_LABELS.salaryBonusLoyalty='고급여 애정도 상승량';
const legacyAsk26=salaryAsk;
function wageState26(p,t=team()){
 if(!p.wage26)p.wage26={ask:Math.min(10000,legacyAsk26(p)),baseline:clone(p.stats),clubGames:(t?.w||0)+(t?.l||0)+(t?.d||0),expired:p.contract===0,lastChange:null};
 return p.wage26;
}
salaryAsk=function(p){return wageState26(p).ask;};
function wageEffect26(p){const ask=salaryAsk(p);return p.salary*100<=ask*90?'low':p.salary*100>=ask*120?'high':'normal';}
function renewAsk26(t,p){
 const w=wageState26(p,t),elapsed=Math.max(1,t.w+t.l+t.d-w.clubGames),d={};
 for(const k of Object.keys(freshStats()))d[k]=Math.max(0,(p.stats[k]||0)-(w.baseline[k]||0));
 const usage=clamp(d.games/elapsed,0,1);
 const bat=d.pa?clamp(((d.h+d.bb+d.hbp)/d.pa-.3)*.6+((d.ab?(d.h+d.doubles+2*d.triples+3*d.hr)/d.ab:0)-.4)*.2,-.15,.2):null;
 const pitch=d.pout>=3?clamp((4.5-d.ra*27/d.pout)*.02+(d.pk/(d.pout/3)-.7)*.03,-.15,.2):null;
 const parts=[bat,pitch].filter(x=>x!==null),impact=(parts.length?parts.reduce((a,b)=>a+b,0)/parts.length:0)-Math.min(.1,(d.e+d.bh)*.015/Math.max(1,d.games));
 const base=Math.max(3,abilityPrice(p)*balance(t).salaryFactor),target=Math.round(base*(.85+.3*usage+impact));
 const old=w.ask;w.ask=clamp(target,Math.max(3,Math.ceil(old*.8)),Math.min(10000,Math.floor(old*1.2)));
 w.expired=true;w.lastChange={from:old,to:w.ask,games:d.games,clubGames:elapsed,at:Date.now()};
 news(t,p.name+' 계약 종료','출전 '+d.games+'/'+elapsed+'경기 · 희망급여 '+money(old)+' → '+money(w.ask)+'. 재협상해 주세요.');
}
function settleContract26(t,p,m,welfare){
 const w=wageState26(p,t),before=p.loyalty,effect=wageEffect26(p),b=balance(t);let wageDelta=0;
 if(before<=0){p.loyalty=0;p.exitPending26=true;return;}
 if(effect==='low')wageDelta=-3;
 else if(effect==='high'&&r(m)<clamp(b.salaryBonusChance,0,1))wageDelta=Math.max(0,Math.round(b.salaryBonusLoyalty));
 // Underpaid players do not have the wage penalty cancelled by passive welfare.
 p.loyalty=clamp(p.loyalty+wageDelta+(effect==='low'?0:welfare)-(t.debt?8:0),0,100);
 if(p.loyalty===0)p.exitPending26=true;
 m.wageEffects26??=[];m.wageEffects26.push({id:p.id,name:p.name,salary:p.salary,ask:w.ask,wageDelta,before,after:p.loyalty});
 const remaining=p.contract;p.contract=Math.max(0,p.contract-1);
 if(remaining>0&&p.contract===0&&!w.expired)renewAsk26(t,p);
}
function snapshotRoster26(t){const m=t.match;if(m?.done&&!m.completedRoster26){m.completedRoster26=clone(t.players);m.completedLineup26=clone(t.lineup);}}
function repairRoster26(t){
 const used=new Set();t.lineup=POS.map((pos,i)=>{const old=t.lineup?.[i];const id=old?.id&&t.players.some(p=>p.id===old.id)&&!used.has(old.id)?old.id:null;if(id)used.add(id);return {id,pos:old?.pos||pos};});
 for(const x of t.lineup)if(!x.id){const p=t.players.find(p=>!used.has(p.id));if(p){x.id=p.id;used.add(p.id);}}
 t.rosterVacancy26=t.lineup.some(x=>!x.id);delete t.battingDraft;
}
function departUnhappy26(t){
 if(!t||live(t))return [];
 const leaving=t.players.filter(p=>p.loyalty<=0||p.exitPending26);if(!leaving.length)return [];
 snapshotRoster26(t);const ids=new Set(leaving.map(p=>p.id));t.departed??=[];
 for(const p of leaving){p.loyalty=0;delete p.exitPending26;p.departedAt26=Date.now();if(!t.departed.some(x=>x.id===p.id))t.departed.push(p);news(t,p.name+' 이적','구단 애정도가 0이 되어 팀을 떠났습니다. 개인 누적 기록은 보존됩니다.');}
 t.players=t.players.filter(p=>!ids.has(p.id));repairRoster26(t);
 if(!t.players.some(p=>p.id===selection))selection=t.players[0]?.id||null;
 if(t.match?.done){t.match.departures26??=[];t.match.departures26.push(...leaving.map(p=>({id:p.id,name:p.name,number:p.number})));}
 return leaving;
}
function validVacancy26(t){return !!t.rosterVacancy26&&!live(t)&&validBattingDraft(t,t.lineup);}
const ensureBefore26=ensureClub;
ensureClub=function(t){ensureBefore26(t);if(!t)return;for(const p of t.players)wageState26(p,t);if(!live(t)&&(!t.match||t.match.rewarded))departUnhappy26(t);};
const rewardBefore26=reward;
reward=function(m){if(m.rewarded)return;restoreAbilities();const t=team();t.players.forEach(p=>wageState26(p,t));snapshotRoster26(t);rewardBefore26(m);};
const plyBefore26=ply;
ply=function(t,id){return plyBefore26(t,id)||(id?t?.departed?.find(p=>p.id===id):null);};
const sideBefore26=tside;
tside=function(m,side){const t=sideBefore26(m,side);return side===0&&m.done&&m.completedRoster26?{...t,players:m.completedRoster26,lineup:m.completedLineup26}:t;};
const decorBefore26=drawDecorations;
drawDecorations=function(time,force=false){const t=team(),m=t?.match;if($('#resultCast')&&m?.completedRoster26){const ps=t.players,ln=t.lineup;t.players=m.completedRoster26;t.lineup=m.completedLineup26;try{return decorBefore26(time,force);}finally{t.players=ps;t.lineup=ln;}}return decorBefore26(time,force);};
const preGameBefore26=preGameEconomy;
preGameEconomy=function(t){ensureClub(t);if(t.players.length<9){toast('출전 선수 9명이 필요합니다. 선수를 영입해 주세요.');go('market');return false;}return preGameBefore26(t);};
const marketBefore26=refreshMarket;
refreshMarket=function(t){if(t.players.length<9&&t.market?.length===0)t.marketRound=null;marketBefore26(t);t.market.forEach(p=>wageState26(p,t));};
negotiate=function(p,amount){
 const t=team();if(!p||!t.players.some(x=>x.id===p.id))return '이미 팀을 떠난 선수입니다.';
 if(p.loyalty<=0){departUnhappy26(t);return p.name+' 선수가 팀을 떠났습니다.';}
 const ask=salaryAsk(p);if(!Number.isInteger(amount)||amount<1||amount>10000)return '제안 급여는 1만~1억 원, 1만 원 단위입니다.';
 if(amount*100>=ask*80){p.salary=amount;p.contract=Math.max(1,Math.round(balance(t).contractGames));p.lowOffers=0;Object.assign(wageState26(p,t),{baseline:clone(p.stats),clubGames:t.w+t.l+t.d,expired:false});news(t,p.name+' 재계약','경기 급여 '+money(amount)+' · 희망급여 '+money(ask)+' · '+p.contract+'경기 계약');return '재계약했습니다.';}
 p.lowOffers++;p.loyalty=Math.max(0,p.loyalty-15);const left=departUnhappy26(t);return left.some(x=>x.id===p.id)?p.name+' 선수가 애정도 0으로 팀을 떠났습니다.':'제안을 거절했습니다. 애정도 -15.';
};
const commitBefore26=commitBattingDraft;
commitBattingDraft=function(t){const error=commitBefore26(t);if(!error)t.rosterVacancy26=false;return error;};

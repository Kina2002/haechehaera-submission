// Opponent substitutions share batting slots, but never reuse a removed player.
const RELIEF_THRESHOLD23=.30;
function ensureReliefRoster23(o,level=0){
 if(o.reliefRoster23)return;
 while(o.players.length<12){const p=player(false,o.players.map(x=>x.number),true,level);p.name=NAMES.find(n=>!o.players.some(x=>x.name===n))||p.name;o.players.push(p);}
 o.reliefRoster23=true;
}
const opponentBefore23=opponent;
opponent=function(t){const o=opponentBefore23(t);ensureReliefRoster23(o,Math.floor(t.w/5));return o;};
function reliefState23(m){
 ensureReliefRoster23(m.opp,Math.floor((team()?.w||0)/5));
 m.oppUsed23??=[...new Set([...m.opp.lineup.map(x=>x.id),...(m.events||[]).filter(e=>e.attack===0).map(e=>e.pitcher).filter(Boolean)])];
 m.oppChanges23??=[];
}
function autoRelief23(m){
 if(!m||m.done||attack(m)!==0||m.paPitches!==0)return null;
 reliefState23(m);
 const o=m.opp,slot=o.lineup.find(x=>x.pos==='P'),old=ply(o,slot.id);
 if(old.energy/old.a.stamina>RELIEF_THRESHOLD23)return null;
 const candidates=o.players.filter(p=>!m.oppUsed23.includes(p.id)&&!o.lineup.some(x=>x.id===p.id)&&p.energy/p.a.stamina>RELIEF_THRESHOLD23);
 const score=p=>effective(p,'control')*.45+effective(p,'velocity')*.35+effective(p,'sense')*.10+(p.energy/p.a.stamina)*10;
 candidates.sort((a,b)=>score(b)-score(a)||b.energy-a.energy);
 const next=candidates[0];if(!next)return null;
 const record={id:m.id+':pitcher-change-'+m.oppChanges23.length,side:1,outId:old.id,inId:next.id,out:old.name,in:next.name,pos:'P',inning:m.inning,half:m.half,pitches:m.pitches,afterEvent:m.events?.at(-1)?.id||null,energy:old.energy,maxEnergy:old.a.stamina};
 slot.id=next.id;m.oppUsed23.push(next.id);m.oppChanges23.push(record);(m.subs??=[]).push(record);
 next.stats.games++;next.stats.appearances++;
 // Fresh mound location; never inherit a previous inning's baserunner position.
 (m.formation??={})[next.id]=FIELD.P.slice();delete m.formation[old.id];
 return record;
}
// Ordinary play changes the pitcher between animations, before the next instruction.
const tickBefore23=tick;
tick=function(now){
 const m=team()?.match;
 if(screen==='match'&&m&&!m.paused&&!m.pendingEntrance&&!anim&&!reaction&&!shiftLead&&!skipJob){
  const changed=autoRelief23(m);if(changed){waitMs=Math.max(waitMs,2000);save();render();}
 }
 tickBefore23(now);
};
// The same rule applies to skipped/simulated games and a button pressed before the next frame.
const resolveBefore23=resolvePitch;
resolvePitch=function(m){autoRelief23(m);return resolveBefore23(m);};
const historyBefore23=visibleHistory21;
visibleHistory21=function(m,current=anim){
 const rows=historyBefore23(m,current),changes=m.oppChanges23||[],result=[];
 const asEvent=s=>({id:s.id,inning:s.inning,half:s.half,attack:1,type:'pitcher-change',text:'상대 투수 교체 · '+s.out+' → '+s.in+' (체력 저하)',bh:0});
 const ids=new Set(rows.map(x=>x.id));for(const s of changes)if(!s.afterEvent||!ids.has(s.afterEvent))result.push(asEvent(s));
 for(const e of rows){result.push(e);for(const s of changes)if(s.afterEvent===e.id)result.push(asEvent(s));}return result;
};
const matchBefore23=matchHTML;
matchHTML=function(){const m=team()?.match,last=m?.oppChanges23?.at(-1),show=last&&last.pitches===m.pitches&&!anim;return matchBefore23().replace('<div class="controls">',(show?'<div class="relief-notice23" role="status">상대 투수 교체 · <b>'+esc(last.out)+' → '+esc(last.in)+'</b><small>체력 저하로 마운드를 넘깁니다.</small></div>':'')+'<div class="controls">');};
const reliefCSS23=document.createElement('style');reliefCSS23.textContent='.relief-notice23{padding:10px 14px;background:#153247;border:1px solid #72a5bd;color:#fff0bc;font-size:14px}.relief-notice23 small{display:block;color:#c1d4df;margin-top:4px;font-size:12px}';document.head.append(reliefCSS23);

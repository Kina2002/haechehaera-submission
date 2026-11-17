/* Visual phases follow the existing ball plan; scoring and arrival times stay unchanged. */
(()=>{'use strict';
const views=['F','FR','R','BR','B','BL','L','FL'];
function facing(from,to,fallback='F'){const dx=to[0]-from[0],dy=to[1]-from[1];if(Math.hypot(dx,dy)<.01)return fallback;return views[(Math.round(Math.atan2(dx,dy)/(Math.PI/4))+8)%8];}
function positionAt(e,tm,id,t){const mv=e?.fieldMoves?.find(v=>v.id===id);if(mv)return fieldPoint19(mv,t);const pos=tm.lineup?.find(v=>v.id===id)?.pos;return (e?.before?.fieldStarts?.[id]||fieldPosition(pos||'C',e?.inputDefense||team()?.match?.defense)).slice();}
function action(p,tm,position,pose,x,y,tick,e,t,distance=0){
 const here=[x,y],plan=e?.motion19,isCatcher=position==='C',atPlate=isCatcher&&Math.hypot(x-FIELD.C[0],y-FIELD.C[1])<15;
 const result=(phase,view,extra={})=>({phase,view,catcher:isCatcher,...extra});
 const outgoing=plan?.throws.filter(s=>s.thrower===p.id&&t>=s.start-.03&&t<s.start+.105).at(-1);
 if(outgoing){const to=outgoing.receiver?positionAt(e,tm,outgoing.receiver,outgoing.end):BASES[outgoing.base]||outgoing.to,view=facing(here,to);return result(t<outgoing.start?'load':t<outgoing.start+.024?'release':'follow',view,{releaseAt:outgoing.start});}
 const incoming=plan?.throws.filter(s=>s.receiver===p.id&&t>=s.end-.04).at(-1);
 const primary=plan&&(e.contact||plan.steal||['wp','pb'].includes(e.type))&&p.id===e.fielderId&&t>=plan.pickup-.035;
 if(pose==='run'&&!(incoming&&t>=incoming.end-.04)&&!primary){
  let from=here,to=here;
  const mv=e?.fieldMoves?.find(v=>v.id===p.id);
  if(mv){from=fieldPoint19(mv,Math.max(0,t-.004));to=fieldPoint19(mv,Math.min(1,t+.004));}
  else if(shiftLead){from=shiftLead.from[p.id]||here;to=shiftLead.to[p.id]||here;}
  else to=fieldPosition(position,team()?.match?.defense);
  return result('run'+(Math.floor(distance/5)%2),facing(from,to,x>BASES[0][0]?'FL':'FR'));
 }
 const sent=plan?.throws.filter(s=>s.thrower===p.id&&t>=s.start+.105).at(-1);if(sent&&(!incoming||incoming.end<sent.start)){if(atPlate)return result('crouch','B');const dx=BASES[0][0]-x,dy=BASES[0][1]-y;return result('ready',Math.abs(dx)<=Math.abs(dy)*.3?'F':dx<0?'FL':'FR');}
 if(incoming){const from=positionAt(e,tm,incoming.thrower,incoming.start),view=facing(here,from);return result(t<incoming.end?'receive':'secure',view,{base:incoming.base,holdBase:Math.hypot(x-BASES[incoming.base][0],y-BASES[incoming.base][1])<4});}
 if(primary){const view=facing(here,e.ball?.[1]||BASES[0]);if(atPlate&&plan.steal)return result('crouchReceive','B');if(e.carry&&pose==='run')return result('run'+(Math.floor(distance/5)%2),view);return result(t<plan.pickup?(plan.caught?'receive':'ground'):t<plan.pickup+.01?'receive':'secure',view);}
 if(atPlate&&(!e||!e.contact||t<.3))return result(e&&t>=.245&&t<.40?'crouchReceive':'crouch','B');
 if(atPlate&&['idle','ready','catcher','glove'].includes(pose))return result('crouch','B');
 if(pose==='catch'||pose==='glove')return result(pose==='catch'?'receive':'secure',facing(here,BASES[0]));
 return null;
}
function retime(e){
 const plan=e.motion19;if(!plan||!plan.throws.length||plan.pickup>=.82)return;
 // Reserve a visible catch/transfer before the windup. Keep the final arrival and result order.
 let cursor=plan.steal?.36:plan.pickup+.07;const finish=plan.throws.at(-1).end,gap=.075;
 plan.throws.forEach((s,index)=>{const receiver=e.fieldMoves.find(v=>v.id===s.receiver),remain=plan.throws.length-index;s.start=cursor;s.end=Math.min(.98,Math.max(cursor+.018,cursor+(finish-cursor-gap*(remain-1))/remain,receiver?.end||0));cursor=s.end+gap;});
 for(const mv of e.moves){const base=e.type==='flydp'&&mv.out?mv.from:mv.to,seg=plan.throws.find(s=>s.base===base);if(seg)mv.until=mv.out?Math.min(.992,seg.end+.05):e.bh===9?Math.min(.97,seg.end+.015):Math.max(mv.delay+.06,seg.end-.06);if(mv.delay>=mv.until)mv.until=Math.min(.995,mv.delay+.04);}
 plan.visualVersion=22;
}
const beforeBuild=buildMotion;buildMotion=function(m,e){beforeBuild(m,e);retime(e);};
window.DefenseMotionV22={facing,positionAt,action,retime,views};
})();

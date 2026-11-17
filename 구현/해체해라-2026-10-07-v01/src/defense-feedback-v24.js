/* Visible feedback uses only the recorded fair-ball calculation. Legacy replays keep their old plan. */
(()=>{'use strict';
 const previous=popup19;
 popup19=function(e,t,result=false){
  const p=previous(e,t,result),d=e?.defense24;
  if(!p||!d||t<d.land)return p;
  if(p.key==='field'||p.key==='result')return {...p,detail:d.note};
  // Keep tag-up scoring, extra-base outs and double-play explanations visible.
  if(p.key.startsWith('call-')&&!e.runs?.length&&!e.tag&&e.type!=='dp')return {...p,detail:d.note};
  return p;
 };
})();

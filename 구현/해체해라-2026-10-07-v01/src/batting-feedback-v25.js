/* Batting feedback appears at contact/plate decisions; later fielding reasons remain visible. */
(()=>{'use strict';const previous=popup19;
popup19=function(e,t,result=false){const p=previous(e,t,result),d=e?.batting25;if(!p||!d||t<.22)return p;
 if(p.key==='contact'||!e.defense24&&(p.key==='result'||p.key.startsWith('call-')))return {...p,detail:d.note};
 return p;
};})();

(function(root){
'use strict';
const scenarios={
 safe:{id:'safe',name:'주자가 먼저 도착',runnerAt:8.2,pickupAt:7.65,throwAt:7.95,ballAt:8.6,footOnBase:true,hasPossession:true},
 out:{id:'out',name:'송구가 먼저 도착',runnerAt:8.2,pickupAt:6.65,throwAt:6.95,ballAt:7.6,footOnBase:true,hasPossession:true}
};
function at(t,event){
 const e=event||scenarios.safe,ballCaught=t>=e.ballAt&&e.hasPossession!==false;
 const foot=e.footOnBase!==false;
 const tie=e.hasPossession!==false&&foot&&Math.abs(e.runnerAt-e.ballAt)<1e-6;
 if(tie&&t>=e.runnerAt)return {result:'review',call:null,runnerOnBase:false,ballCaught,receiverFootOnBase:foot,decidedAt:null};
 const forced=e.hasPossession!==false&&foot&&e.ballAt<e.runnerAt;
 const out=forced&&t>=e.ballAt;
 const runnerOnBase=!out&&t>=e.runnerAt;
 const result=out?'out':runnerOnBase?'safe':null;
 const decidedAt=result==='out'?e.ballAt:result==='safe'?e.runnerAt:null;
 return {result,call:decidedAt!==null&&t>=decidedAt+.12?result:null,runnerOnBase,ballCaught,receiverFootOnBase:foot,decidedAt};
}
const api={scenarios,at};root.FirstBaseRace=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

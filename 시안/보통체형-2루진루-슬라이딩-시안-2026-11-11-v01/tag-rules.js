/* Independent non-force extra-base attempt. */
(function(root){'use strict';
const fixtures={safe:{catchAt:4.8,tagAt:6,baseAt:5.7,secure:true},out:{catchAt:4.8,tagAt:5.15,baseAt:5.7,secure:true}};
function taggedOut({hasBall,secure,touchesRunner,onBase}){return Boolean(hasBall&&secure&&touchesRunner&&!onBase);}
function at(t,e=fixtures.safe){const hasBall=t>=e.catchAt,tagHappened=t>=e.tagAt,baseBeforeTag=e.baseAt<=e.tagAt;
 const out=tagHappened&&taggedOut({hasBall:e.catchAt<=e.tagAt,secure:e.secure,touchesRunner:e.touchesRunner!==false,onBase:baseBeforeTag});
 return {hasBall,tagHappened,out,runnerOnBase:!out&&t>=e.baseAt,call:out?'out':t>=e.baseAt?'safe':null,forcePlay:false};}
const api={fixtures,taggedOut,at};if(typeof module==='object'&&module.exports)module.exports=api;else root.SecondBaseTag=api;
})(typeof window==='object'?window:globalThis);

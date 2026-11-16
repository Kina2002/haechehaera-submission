// P27 research model only; not loaded by the game. Scores remain proposals.
const assert=require('node:assert/strict');
function quota(score,rule){return Math.floor(score/rule.perPlayer);}
function points(s,r){return (s.peak||0)*r.leagueStep+(s.titles||0)*r.title+Math.floor(s.mlb/r.mlbEvery)*r.mlb+Math.floor((s.wins||0)/r.winEvery)*r.win;}
const recommended={id:'balanced',leagueStep:10,title:20,mlbEvery:1,mlb:2,winEvery:30,win:1,perPlayer:10};
const candidates=[
 {...recommended,id:'fast-mlb',mlb:3},
 {...recommended,id:'title-heavy',title:40,mlb:1},
 recommended,
 {...recommended,id:'slow-mlb',mlb:1},
];
function rejuvenate(p){if(p.rejuvenated)return false;assert.ok(p.age>=19);p.age=19;p.rejuvenated=true;return true;}
function search(){
 const rows=[];
 for(const leagueStep of [5,10,15])for(const title of [10,20,30,40])for(const mlbEvery of [1,5,10])for(const mlb of [1,2,3,5,10])for(const winEvery of [20,30,50,100])for(const win of [1,2,3])for(const perPlayer of [5,10,15]){
  const r={leagueStep,title,mlbEvery,mlb,winEvery,win,perPlayer};
  const n=(peak,titles,m,wins)=>quota(points({peak,titles,mlb:m,wins},r),r);
  // User: a comparable difficulty, NOT mandatory title/MLB gates. 300 wins is a research reference.
  const anchorPenalty=100*Math.abs(n(3,1,30,300)-12)+50*Math.max(0,n(3,1,29,300)-11);
  // Intermediate progression preferences are analyst assumptions, explicitly recorded in the report.
  const preferencePenalty=Math.abs(n(1,0,0,30)-1)+Math.abs(n(2,0,0,80)-2)+Math.abs(n(3,0,0,150)-3)+Math.abs(n(3,1,0,200)-5)+Math.abs(n(3,1,10,200)-7)+Math.abs(n(3,0,30,300)-10)+Math.abs(n(0,0,0,300)-1);
  const simplicity=(perPlayer!==10?1:0)+(mlbEvery!==1?1:0)+(winEvery!==30?1:0);
  rows.push({...r,anchorPenalty,preferencePenalty,simplicity});
 }
 rows.sort((a,b)=>a.anchorPenalty-b.anchorPenalty||a.preferencePenalty-b.preferencePenalty||a.simplicity-b.simplicity);
 const same=r=>Object.keys(recommended).filter(k=>k!=='id').every(k=>r[k]===recommended[k]);
 return {count:rows.length,anchorPass:rows.filter(r=>r.anchorPenalty===0).length,best:rows[0],top:rows.slice(0,10),recommendedLoss:rows.find(same)};
}
module.exports={quota,points,recommended,candidates,rejuvenate,search};

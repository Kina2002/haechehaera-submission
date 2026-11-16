// Inspectable P27 score calibration. Run after run-rebuild-score-sim.cjs.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {points,quota,recommended,candidates,search}=require('./rebuild-score-model.cjs');
const rawFile=process.argv[2]||path.join(__dirname,'rebuild-score-careers-20261113-v03.json');
const out=process.argv[3]||path.join(__dirname,'rebuild-score-analysis-20261113-v03.json');
const raw=JSON.parse(fs.readFileSync(rawFile,'utf8'));
assert.deepEqual(raw.rules,recommended);
for(const c of raw.careers)assert.deepEqual(c.start,{funds:3000,players:12},'real starting balance and roster');
for(const [name,hash] of Object.entries(raw.hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../src',name))).digest('hex'),hash,'game source changed: '+name);
const policies=[...new Set(raw.careers.map(c=>c.policy))];
const rows=candidates.map(r=>({id:r.id,rule:r,atReference:quota(points({peak:3,titles:1,mlb:30,wins:300},r),r),
  firstFullAt300Wins:Array.from({length:121},(_,mlb)=>mlb).find(mlb=>quota(points({peak:3,titles:1,mlb,wins:300},r),r)>=12),
  atTenMlb:quota(points({peak:3,titles:1,mlb:10,wins:300},r),r),
  atTwentyMlb:quota(points({peak:3,titles:1,mlb:20,wins:300},r),r)}));
let scenarios=0;
for(let peak=0;peak<4;peak++)for(let titles=0;titles<6;titles++)for(let mlb=0;mlb<=80;mlb++)for(let wins=0;wins<=1200;wins+=30){
 if(titles&&peak!==3)continue;const state={peak,titles,mlb,wins},score=points(state,recommended),n=quota(score,recommended);
 assert.ok(n*10<=score&&score<(n+1)*10);
 assert.ok(points({...state,wins:wins+30},recommended)>=score);
 assert.ok(points({...state,mlb:mlb+1},recommended)>=score);scenarios++;
}
const milestones=[
 {label:'지역 도달',peak:1,titles:0,mlb:0,wins:30},
 {label:'2부 도달',peak:2,titles:0,mlb:0,wins:80},
 {label:'1부 도달',peak:3,titles:0,mlb:0,wins:150},
 {label:'1부 우승 1회·MLB 10명',peak:3,titles:1,mlb:10,wins:300},
 {label:'1부 우승 1회·MLB 20명',peak:3,titles:1,mlb:20,wins:300},
 {label:'1부 우승 1회·MLB 30명',peak:3,titles:1,mlb:30,wins:300},
 {label:'1부 우승 3회·MLB 10명',peak:3,titles:3,mlb:10,wins:300},
 {label:'1부 도달·우승 없이 MLB 40명',peak:3,titles:0,mlb:40,wins:300},
].map(s=>({...s,score:points(s,recommended),quota:quota(points(s,recommended),recommended)}));
const summary=policies.map(policy=>{
 const cs=raw.careers.filter(c=>c.policy===policy),end=cs.map(c=>c.trace.at(-1)),rs=cs.flatMap(c=>c.rebuildTrace);
 for(const r of rs){assert.ok(r.kept<=r.quota&&r.kept<=r.eligible);assert.equal(r.quota,quota(r.score,recommended));}
 return {policy,careers:cs.length,seasons:cs.reduce((n,c)=>n+c.trace.length,0),games:cs.reduce((n,c)=>n+c.roundCount,0),
  mlbTotal:end.reduce((n,c)=>n+c.mlbTotal,0),maxCareerMlb:Math.max(...end.map(c=>c.mlbTotal)),
  topTitles:cs.flatMap(c=>c.trace).filter(s=>s.tier===3&&s.rank===1).length,
  maxTier:Math.max(...cs.flatMap(c=>c.trace).map(s=>s.tier||0)),rebuilds:rs.length,kept:rs.map(s=>s.kept),quota:rs.map(s=>s.quota),
  achievedReference:cs.some(c=>c.trace.some(s=>s.titles>=1&&s.mlb>=30))};
});
const report={version:'20261113-v03',rule:recommended,reference:{peak:3,titles:1,mlb:30,wins:300},
 assumptions:['The user selected a comparable difficulty, not mandatory title/MLB gates.','300 wins is an analyst reference, not an observed requirement or user decision.','Points are evaluated within the immediately previous club; no score carryover or free baseline companion is assumed.','AI management is a limited policy, not a human optimum; no probability of human success is inferred.','Age 19 once per player is user-confirmed; numerical score weights are proposals.'],
 search:search(),comparison:rows,milestones,scenarioCount:scenarios,summary,
 raw:{path:path.basename(rawFile),sha256:crypto.createHash('sha256').update(fs.readFileSync(rawFile)).digest('hex')},
 sourceHashes:raw.hashes,simulatorHashes:Object.fromEntries(['run-rebuild-score-sim.cjs','rebuild-score-model.cjs','facilities.test.cjs'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,f))).digest('hex')])),
 chart:Array.from({length:61},(_,mlb)=>[mlb,quota(points({peak:3,titles:1,mlb,wins:300},recommended),recommended)])};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({search:report.search.count,anchorPass:report.search.anchorPass,scenarioCount:scenarios,summary,comparison:rows.map(({rule,...r})=>r)},null,2));

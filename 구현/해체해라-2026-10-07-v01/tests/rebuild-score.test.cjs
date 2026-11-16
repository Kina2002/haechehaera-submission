const {test}=require('node:test'),assert=require('node:assert/strict');
const {points,quota,recommended:r,search}=require('./rebuild-score-model.cjs');
const {createTrialWorld}=require('./run-rebuild-score-sim.cjs');
test('fixed ten points per companion reaches twelve at the reference achievement',()=>{
 assert.equal(quota(119,r),11);assert.equal(quota(120,r),12);assert.equal(quota(130,r),13);
 assert.equal(quota(points({peak:3,titles:1,mlb:30,wins:300},r),r),12);
 assert.equal(quota(points({peak:3,titles:1,mlb:29,wins:300},r),r),11);
 assert.equal(quota(points({peak:3,titles:0,mlb:30,wins:300},r),r),10);
 assert.equal(quota(points({peak:3,titles:0,mlb:40,wins:300},r),r),12);
});
test('waiting, losses and lifetime MLB history do not create points for this club',()=>{
 assert.equal(points({peak:0,mlb:0,wins:0,seasons:1000,losses:900},r),0);
 assert.equal(points({peak:0,titles:0,mlb:0,wins:300},r),10);
 const w=createTrialWorld(141);w.exec('initTrial("normal");mlbSuccessRecords=()=>Array.from({length:30},()=>({success:true}));trial.mlbStart=30;');
 assert.equal(w.run('snapshotTrial().mlb'),0);
});
test('actual rebuilding retains current abilities, rejuvenates to 19 once, and still requires loyalty',()=>{
 const w=createTrialWorld(142);w.exec(`initTrial('normal');var t=team();t.players.forEach((p,i)=>{p.age=34;p.loyalty=i<8?80:60;});var ids=t.players.slice(0,8).map(p=>p.id);var abilityBefore=JSON.stringify(t.players[0].a);t.w=300;trial.peak=3;trial.titles=1;mlbSuccessRecords=()=>Array.from({length:30},()=>({success:true}));`);
 const first=w.run(`(()=>{rebuildClub(t,{season:1});return {kept:t.opinion.rebuilds.at(-1).kept.length,ages:t.players.filter(p=>ids.includes(p.id)).map(p=>p.age),abilities:JSON.stringify(t.players.find(p=>p.id===ids[0]).a)===abilityBefore,quota:rebuildTrace.at(-1).quota,eligible:rebuildTrace.at(-1).eligible};})()`);
 assert.deepEqual(first,{kept:8,ages:Array(8).fill(19),abilities:true,quota:12,eligible:8});
 const second=w.run(`(()=>{t.players.filter(p=>ids.includes(p.id)).forEach(p=>p.age=27);t.w+=150;trial.peak=3;trial.titles=1;rebuildClub(t,{season:2});return t.players.filter(p=>ids.includes(p.id)).map(p=>p.age);})()`);
 assert.equal(second.length,5);assert.ok(second.every(age=>age===27));
});
test('no new score survives a failed attempt merely because a previous club had reached 1부',()=>{
 const w=createTrialWorld(143);w.exec(`initTrial('normal');var t=team();t.players.forEach(p=>p.loyalty=90);trial.peak=3;trial.titles=1;rebuildClub(t,{season:1});`);
 assert.equal(w.run('rebuildTrace[0].quota'),5);
 w.exec('rebuildClub(t,{season:2})');assert.equal(w.run('rebuildTrace[1].quota'),0);
});
test('search prefers the proposed progression but does not claim a unique optimum',()=>{
 const s=search();assert.equal(s.count,6480);assert.ok(s.anchorPass>1);assert.equal(s.recommendedLoss.anchorPenalty,0);assert.equal(s.recommendedLoss.preferencePenalty,0);
});
test('quota uses the same ten-point cost for every player and has no fixed count cap',()=>{
 for(let score=0;score<100000;score+=7){const n=quota(score,r);assert.ok(10*n<=score);assert.ok(10*(n+1)>score);}
});
test('actual rebuilding can retain thirteen qualified players when there are thirteen and enough points',()=>{
 const w=createTrialWorld(144);
 const result=w.run(`(()=>{initTrial('normal');const t=team();t.players.push(enrich(player(true,t.players.map(p=>p.number))));t.players.forEach(p=>{p.loyalty=90;p.age=34;});t.w=600;trial.peak=3;trial.titles=1;mlbSuccessRecords=()=>Array.from({length:30},()=>({success:true}));rebuildClub(t,{season:1});return {roster:t.players.length,kept:t.opinion.rebuilds.at(-1).kept.length,ages:t.players.map(p=>p.age)};})()`);
 assert.deepEqual(result,{roster:13,kept:13,ages:Array(13).fill(19)});
});

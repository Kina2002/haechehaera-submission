const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createSimulation}=require('./batting-simulation.cjs');

test('batting averages reward contact training without the old .400 floor or 85/100 plateau',()=>{
  const run=createSimulation();
  const rows=[30,50,80,85,100].map(contact=>run({contact,count:12000}));
  const targets=[[.18,.22],[.23,.27],[.31,.35],[.32,.37],[.36,.40]];
  for(let i=0;i<rows.length;i++){
    const r=rows[i];assert.ok(r.average>=targets[i][0]&&r.average<=targets[i][1],JSON.stringify(r));
    if(i){
      assert.ok(r.average>rows[i-1].average);
      assert.ok(r.ordinaryFairHitRate>rows[i-1].ordinaryFairHitRate,'contact must also improve fair balls');
    }
  }
  assert.ok(rows[4].average-rows[0].average>.14);
  assert.ok(rows[4].average-rows[3].average>.02,'training past 85 must still help');
  assert.ok(rows[0].strikeouts/rows[0].plateAppearances<.25,'low contact is not constant strikeouts');
});

test('pitcher velocity and fielding remain meaningful against the same batter',()=>{
  const run=createSimulation();
  const slow=run({velocity:20,count:8000}),fast=run({velocity:80,count:8000});
  assert.ok(fast.strikeouts>slow.strikeouts*1.4);
  assert.ok(fast.average<slow.average&&fast.swingContactRate<slow.swingContactRate);
  const weak=run({fielding:20,count:8000}),strong=run({fielding:80,count:8000});
  assert.ok(strong.average<weak.average-.05);
});

test('power, patient and contact instructions keep their distinct tradeoffs',()=>{
  const run=createSimulation();
  const contact=run({count:8000}),power=run({command:'power',count:8000}),take=run({command:'take',count:8000});
  assert.ok(contact.average>power.average&&contact.strikeouts<power.strikeouts);
  assert.ok(power.homeRuns>contact.homeRuns);
  assert.ok(take.walks>contact.walks);
  assert.ok(run({power:80,count:8000}).homeRuns>run({power:20,count:8000}).homeRuns*1.5);
});

test('the existing fatigue wrapper reduces batting without changing permanent abilities',()=>{
  const run=createSimulation({fatigue:true});
  const rested=run({contact:80,count:6000}),tired=run({contact:80,energy:0,count:6000});
  assert.ok(tired.average<rested.average-.07);
  assert.ok(tired.swingContactRate<rested.swingContactRate);
});

test('edge abilities, both handednesses, spray directions and shifts retain valid baseball outcomes',()=>{
  const run=createSimulation();
  for(const contact of [0,100])for(const hand of ['우타','좌타'])for(const tendency of ['중앙','당겨치기','밀어치기']){
    const r=run({contact,hand,tendency,velocity:100-contact,fielding:100-contact,count:500,
      defense:{side:contact?2:0,depth:contact?0:2}});
    assert.ok(Number.isFinite(r.average)&&r.average>=0&&r.average<=1);
    assert.equal(r.violations,0);
  }
});

test('complete games with fatigue, runners and comedy events finish with valid scoring and motion',()=>{
  const run=createSimulation({fatigue:true,boneheads:true});
  for(let i=0;i<20;i++){
    const r=run({fullGame:true,seed:20261008+i,contact:i<10?30:100,command:['contact','power','take'][i%3]});
    assert.equal(r.done,true);assert.equal(r.violations,0);
    assert.ok(r.eventsChecked>0&&r.pitches<1000);
  }
});

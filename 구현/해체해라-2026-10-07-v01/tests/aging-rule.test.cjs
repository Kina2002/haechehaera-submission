const assert=require('node:assert/strict');
const test=require('node:test');
const {agePlayer,TEN,CONFIRMED_AGING_RULE,ORIGINAL_AGING_RULE}=require('./run-economy-legacy-20261109.cjs');

function makePlayer(age,value=60){return {age,a:Object.fromEntries(TEN.map(k=>[k,value]))};}
function changed(p,value=60){return TEN.filter(k=>p.a[k]!==value);}

test('confirmed season boundaries apply 3, 5, then all 10 distinct declines',()=>{
  assert.deepEqual(CONFIRMED_AGING_RULE,{young:2,mid:3,late:5});
  for(const [before,expectedCount,expectedDrop] of [[18,0,0],[28,0,0],[29,3,2],[35,5,3],[40,10,5]]){
    const p=makePlayer(before),loss=agePlayer(p,()=>0);
    assert.equal(p.age,before+1);
    assert.equal(changed(p).length,expectedCount);
    assert.equal(loss,expectedCount*expectedDrop);
    for(const k of changed(p))assert.equal(p.a[k],60-expectedDrop);
  }
});

test('no ability falls below the current save floor of 1',()=>{
  const p=makePlayer(40,4);agePlayer(p,()=>.5);
  assert.equal(p.age,41);
  assert.ok(TEN.every(k=>p.a[k]===1));
});

test('historical original remains available for comparison',()=>{
  const p=makePlayer(40);agePlayer(p,()=>.5,true,ORIGINAL_AGING_RULE);
  assert.ok(TEN.every(k=>p.a[k]===50));
});

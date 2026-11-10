// P21 확정 나이 규칙이 현재 자금 시뮬레이터(run-economy-sim.cjs)에 이전 시뮬레이터와 같게 들어갔는지 확인합니다.
const assert=require('node:assert/strict');
const test=require('node:test');
const {ageP21,P21_AGING,TEN,career,REFORM_POLICIES,DISBAND,LEAGUE_MONEY,MARKET,entryP21,P21_ENTRY}=require('./run-economy-sim.cjs');
const legacy=require('./run-economy-legacy-20261109.cjs');
const {createWorld}=require('./run-season-sim.cjs');

function makePlayer(age,value=60){return {age,a:Object.fromEntries(TEN.map(k=>[k,value]))};}
function changed(p,value=60){return TEN.filter(k=>p.a[k]!==value);}
function seeded(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}

test('P21 boundaries: 19~29 none, 30~35 three −2, 36~40 five −3, 41+ all ten −5',()=>{
  assert.equal(P21_AGING.entryAge,19);
  for(const [before,count,drop] of [[18,0,0],[28,0,0],[29,3,2],[34,3,2],[35,5,3],[39,5,3],[40,10,5],[45,10,5]]){
    const p=makePlayer(before),loss=ageP21(p,()=>0);
    assert.equal(p.age,before+1);
    assert.equal(changed(p).length,count,`age ${before+1}`);
    assert.equal(loss,count*drop);
    for(const k of changed(p))assert.equal(p.a[k],60-drop);
  }
});

test('P21 picks distinct abilities and never goes below 1',()=>{
  const rnd=seeded(7);
  for(let i=0;i<200;i++){const p=makePlayer(35);ageP21(p,rnd);assert.equal(changed(p).length,5);}
  const low=makePlayer(40,4);ageP21(low,()=>.5);
  assert.ok(TEN.every(k=>low.a[k]===1));
});

test('same draws as the legacy simulator that produced the P21 numbers',()=>{
  const r1=seeded(20261110),r2=seeded(20261110),vals=seeded(99);
  for(let age=18;age<=48;age++)for(let rep=0;rep<5;rep++){
    const a=Object.fromEntries(TEN.map(k=>[k,1+Math.floor(vals()*100)]));
    const p={age,a:{...a}},q={age,a:{...a}};
    assert.equal(ageP21(p,r1),legacy.agePlayer(q,r2,true,legacy.CONFIRMED_AGING_RULE));
    assert.deepEqual(p,q);
  }
});

test('entry rule: age 19~26 and three distinct abilities each +(age−19), capped at 100',()=>{
  assert.deepEqual({...P21_ENTRY},{min:19,max:26,count:3});
  const seen=new Set(),rnd=seeded(5);
  for(let i=0;i<400;i++){
    const p=makePlayer(null,50);delete p.age;const bonus=entryP21(p,rnd);
    assert.ok(p.age>=19&&p.age<=26);assert.equal(bonus,p.age-19);seen.add(p.age);
    const up=TEN.filter(k=>p.a[k]!==50);
    assert.equal(up.length,bonus?3:0);for(const k of up)assert.equal(p.a[k],50+bonus);
  }
  assert.equal(seen.size,8);
  const top=makePlayer(null,98);entryP21(top,()=>.99);
  assert.equal(top.age,26);assert.equal(TEN.filter(k=>top.a[k]===100).length,3);
});

test('entry rule with count 5 (issue #46-14 candidate) raises five distinct abilities',()=>{
  const p=makePlayer(null,50);delete p.age;const bonus=entryP21(p,()=>.99,{...P21_ENTRY,count:5});
  assert.equal(p.age,26);assert.equal(bonus,7);
  assert.equal(TEN.filter(k=>p.a[k]===57).length,5);
});

test('career with ages.p21 + entry: starting roster ages spread over 19~26',()=>{
  const ages={bonus:false,capUp:false,aware:true,p21:true,entry:true,retireAt:null,retireWish:[[35,.1]],managerRetire:true};
  const r=career(createWorld(20261115),REFORM_POLICIES.normal,{league:true,contractGames:10,seasons:1,growth:{K:10,cap:80},
    disband:DISBAND.base,reform:true,invest:true,seed:16000,leagueMoney:LEAGUE_MONEY,ages,market:MARKET});
  const l=r.log[0];
  assert.ok(l.oldest<=26&&l.oldest>19);assert.ok(l.ageMean>19&&l.ageMean<26);
});

test('career with ages.p21: every new player starts at 19 and ages one year per season',()=>{
  const ages={bonus:false,capUp:false,aware:true,p21:true,retireAt:null,retireWish:[[35,.1]],managerRetire:true};
  const r=career(createWorld(20261115),REFORM_POLICIES.normal,{league:true,contractGames:10,seasons:3,growth:{K:10,cap:80},
    disband:DISBAND.base,mlb:{request:true,regular:true,ticket:true,ticketAt:[1]},reform:true,invest:true,seed:16000,
    leagueMoney:LEAGUE_MONEY,ages,market:MARKET});
  assert.equal(r.log.length,3);
  r.log.forEach((l,i)=>{assert.equal(l.oldest,19+i);assert.ok(l.ageMean<=19+i);assert.equal(l.ageLoss,0);assert.equal(l.retired,0);});
});

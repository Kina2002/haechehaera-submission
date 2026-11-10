// 애정도 수단 시험용 loyalty 옵션(2026-11-10)이 옵션 없이는 결과를 바꾸지 않고, 켠 수단만 적용되는지 확인합니다.
const assert=require('node:assert/strict');
const test=require('node:test');
const {career,REFORM_POLICIES,DISBAND}=require('./run-economy-sim.cjs');
const {createWorld}=require('./run-season-sim.cjs');

const run=(loyalty,seasons=2,policy='normal')=>career(createWorld(20261120),REFORM_POLICIES[policy],{league:true,contractGames:10,seasons,
  growth:{K:10,cap:80},disband:DISBAND.base,reform:true,invest:true,seed:16000,loyalty});
const strip=log=>log.map(({loyMean,loy70,loy50,...e})=>e);

test('loyalty {} adds only the loyalty stats',()=>{
  const a=run(null),b=run({});
  assert.deepEqual(strip(b.log),a.log);
  assert.ok(b.log.every(e=>Number.isFinite(e.loyMean)&&e.loy70>=0&&e.loy50>=e.loy70));
});

test('lockerFirst and lounge put the loyalty facilities first in the build order',()=>{
  const locker=run({lockerFirst:true},2,'aggressive').log.at(-1).fac,lounge=run({lockerFirst:true,lounge:true},2,'aggressive').log.at(-1).fac;
  assert.ok(locker.includes('locker'));
  assert.ok(lounge.includes('locker')&&lounge.includes('lounge'));
  assert.ok(!run(null,2,'aggressive').log.at(-1).fac.includes('lounge'));
});

test('tenure bonus raises loyalty at season end',()=>{
  const base=run({},3),bonus=run({tenure:[1,5]},3);
  assert.ok(bonus.log[2].loyMean>base.log[2].loyMean);
});

// 재창단 세부 비교용 rebuildRule(이슈 #46-4)이 기존 재창단 초안을 바꾸지 않고, 바꾼 값만 적용되는지 확인합니다.
const assert=require('node:assert/strict');
const test=require('node:test');
const {career,REFORM_POLICIES}=require('./run-economy-sim.cjs');
const {createWorld}=require('./run-season-sim.cjs');

// 첫 시즌 끝에 반드시 해체되고, 그 뒤로는 여론이 움직이지 않는 시험용 설정입니다.
const FORCED={name:'시험',start:100,win:0,loss:0,unpaid:0,loan:0,loanAtSeasonEnd:0,rank:[0,0,0,0,0,0],restart:20};
const run=(rebuildRule,seasons=2)=>career(createWorld(20261115),REFORM_POLICIES.aggressive,{league:true,contractGames:10,seasons,
  growth:{K:10,cap:80},disband:FORCED,reform:true,invest:true,seed:16000,rebuildRule});
const strip=log=>log.map(({rebuild,...e})=>e);

test('rebuildRule {} keeps the P09 draft exactly and only adds the rebuild record',()=>{
  const a=run(null),b=run({});
  assert.equal(a.log[0].disbanded,true);
  assert.deepEqual(strip(b.log),a.log);
  const r=b.log[0].rebuild;
  assert.equal(r.season,1);
  assert.equal(r.kept,Math.min(3,r.loy70));
});

test('changed values apply: keep count and loyalty bar, stadium grade, restart opinion',()=>{
  assert.equal(run({keepMax:0}).log[0].rebuild.kept,0);
  const five=run({keepMax:5,keepLoyalty:50}).log[0].rebuild;
  assert.equal(five.kept,Math.min(5,five.loy50));
  const kept=run({keepStadium:true}),reset=run({});
  assert.ok(kept.log[1].stadium>=kept.log[0].rebuild.stadium);
  assert.equal(reset.log[0].stadium,1);
  assert.equal(run({restart:30}).log[1].pressureEnd,30);
  assert.equal(run({}).log[1].pressureEnd,20);
});

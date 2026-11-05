const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const game=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8');

// Top of the first, our team batting; every ability is 50 so the odds below are exact.
function fixture(options={}){
 const ctx=vm.createContext({Math,crypto:{randomUUID},location:{hash:''},performance:{now:()=>0},
  document:{documentElement:{hasAttribute:()=>true}},window:{addEventListener:()=>{}},
  GameStorage:{create:()=>({})},recordRecap:()=>{},restoreAbilities:()=>{},options});
 vm.runInContext(game.slice(0,game.indexOf('\nfunction rect(')),ctx);
 vm.runInContext(game.match(/^function opponentAbility\(.*$/m)[0],ctx);
 vm.runInContext(`
 const t=newTeam('우리',11,5),o=newTeam('상대',8,4);
 for(const tm of [t,o])for(const p of tm.players)p.a=Object.fromEntries(KEYS.map(k=>[k,50]));
 data.slots=[t,null];data.current=0;
 const m={id:'ground-check',opp:o,home:1,inning:1,half:0,outs:0,balls:0,strikes:0,
  bases:[null,null,null],score:[0,0],hits:[0,0],errors:[0,0],order:[0,0],last:[null,null],
  innings:[Array(7).fill(null),Array(7).fill(null)],paPitches:0,pitches:0,bh:[0,0],
  bhBase:[0,0],bhBaseUsed:[0,0],opportunities:[0,0],events:[],rng:20261105,
  done:false,rewarded:false,lastLines:{},reactionCount:0,recap:{},
  checks:{events:0,violations:[],motions:0,reactions:0},defense:{side:1,depth:1},...options};
 t.match=m;chooseBH=()=>null;
 const runner=i=>t.players[i+1].id;
 const runners=(...slots)=>{m.bases=[0,1,2].map(i=>slots.includes(i)?runner(i):null);return m.bases.slice();};
 const seq=(...v)=>{let i=0;r=()=>v[Math.min(i++,v.length-1)];};
 const ground=(pos='SS',bh=0)=>{const e=emptyEvent(m);e.bh=bh;e.fieldPos=pos;e.fielder=fielder(o,pos);groundOut(m,e);return e;};
 const state=e=>({bases:m.bases.slice(),outs:m.outs,score:m.score[0],outIds:e.outIds,throwBases:e.throwBases,text:e.text,fc:!!e.fc,runs:e.runs.length});
 `,ctx);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
}

test('a forced runner on first always moves up when the batter is thrown out',()=>{
 const r=fixture()(`(()=>{runners(0);seq(.99);const b=batter(m).id,e=ground();return {...state(e),batter:b,r0:runner(0)};})()`);
 assert.deepEqual(r.bases,[null,r.r0,null]);assert.equal(r.outs,1);
 assert.deepEqual(r.outIds,[r.batter]);assert.deepEqual(r.throwBases,[1]);assert.equal(r.text,'땅볼 아웃');
});

test('an unforced runner on second holds on a ball to the left side and advances on a ball to the right side',()=>{
 const left=fixture()(`(()=>{runners(1);seq(.99);const e=ground('SS');return {...state(e),r1:runner(1)};})()`);
 assert.deepEqual(left.bases,[null,left.r1,null]);
 const right=fixture()(`(()=>{runners(1);seq(.99);const e=ground('2B');return {...state(e),r1:runner(1)};})()`);
 assert.deepEqual(right.bases,[null,null,right.r1]);
});

test('an unforced runner on third reads the infield depth: in holds, back scores',()=>{
 const run=(depth,roll)=>fixture({defense:{side:1,depth}})(`(()=>{runners(2);seq(${roll});const e=ground();return state(e);})()`);
 // Go chances are 20% (infield in), 60% (normal) and 90% (infield back) for an average runner.
 assert.deepEqual([0,1,2].map(d=>run(d,.5).score),[0,1,1]);
 assert.deepEqual([0,1,2].map(d=>run(d,.7).score),[0,0,1]);
 const held=run(0,.5);assert.equal(held.bases[2]!==null,true);assert.equal(held.outs,1);
 const rbi=fixture({defense:{side:1,depth:2}})(`(()=>{runners(2);seq(.5);const b=batter(m);ground();return [b.stats.rbi,b.stats.ab,b.stats.h];})()`);
 assert.deepEqual(rbi,[1,1,0]);
});

test("a fielder's choice retires the lead forced runner and leaves the batter on first",()=>{
 const r=fixture()(`(()=>{runners(0);seq(0);const b=batter(m),e=ground();return {...state(e),batter:b.id,r0:runner(0),ab:b.stats.ab,h:b.stats.h,pa:b.stats.pa};})()`);
 assert.equal(r.fc,true);assert.equal(r.text,'야수선택 · 2루 포스 아웃');assert.deepEqual(r.throwBases,[2]);
 assert.deepEqual(r.outIds,[r.r0]);assert.deepEqual(r.bases,[r.batter,null,null]);assert.equal(r.outs,1);
 assert.deepEqual([r.pa,r.ab,r.h],[1,1,0]);
});

test('bases loaded: the infield playing in forces the runner at home, otherwise the forced run scores',()=>{
 const home=fixture({defense:{side:1,depth:0}})(`(()=>{runners(0,1,2);seq(0);const b=batter(m).id,e=ground();return {...state(e),batter:b,ids:[0,1,2].map(runner)};})()`);
 assert.equal(home.text,'야수선택 · 홈 포스 아웃');assert.deepEqual(home.throwBases,[4]);
 assert.deepEqual(home.outIds,[home.ids[2]]);assert.equal(home.score,0);
 assert.deepEqual(home.bases,[home.batter,home.ids[0],home.ids[1]]);
 const second=fixture()(`(()=>{runners(0,1,2);seq(0);const b=batter(m),e=ground();return {...state(e),batter:b.id,rbi:b.stats.rbi,ids:[0,1,2].map(runner)};})()`);
 assert.equal(second.text,'야수선택 · 2루 포스 아웃');assert.equal(second.score,1);assert.equal(second.rbi,1);
 assert.deepEqual(second.outIds,[second.ids[0]]);assert.deepEqual(second.bases,[second.batter,null,second.ids[1]]);
 const batterOut=fixture()(`(()=>{runners(0,1,2);seq(.99);const e=ground();return {...state(e),ids:[0,1,2].map(runner)};})()`);
 assert.equal(batterOut.score,1);assert.deepEqual(batterOut.bases,[null,batterOut.ids[0],batterOut.ids[1]]);
});

test('with two outs the batter is retired at first and nobody scores',()=>{
 const r=fixture({outs:2})(`(()=>{runners(0,2);seq(0);const e=ground();return state(e);})()`);
 assert.equal(r.outs,3);assert.equal(r.score,0);assert.equal(r.fc,false);assert.equal(r.runs,0);
});

test("a batter who misread the ball is never saved by a fielder's choice",()=>{
 const r=fixture()(`(()=>{runners(0);seq(0);const b=batter(m).id,e=ground('SS',2);return {...state(e),batter:b};})()`);
 assert.equal(r.fc,false);assert.deepEqual(r.outIds,[r.batter]);
});

test('across many ground balls, playing the infield in lets fewer runners score from third',()=>{
 const rate=depth=>fixture({defense:{side:1,depth}})(`(()=>{let s=7,scored=0;r=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
   for(let i=0;i<2000;i++){m.outs=0;m.score=[0,0];m.order=[0,0];runners(2);ground();scored+=m.score[0];}return scored/2000;})()`);
 const [inField,normal,back]=[0,1,2].map(rate);
 assert.ok(inField<.3&&normal>.5&&normal<.7&&back>.85,JSON.stringify([inField,normal,back]));
});

test('full games keep runners, outs and scores consistent under the new ground-ball rules',()=>{
 for(const seed of [3,1105,4242,99991]){
  const r=fixture({inning:1,half:0,rng:seed})(`(()=>{r=function(m){m.rng^=m.rng<<13;m.rng^=m.rng>>>17;m.rng^=m.rng<<5;return (m.rng>>>0)/4294967296};
    m.innings[attack(m)][0]=0;prepare(m);let guard=0;while(!m.done&&guard++<3000)resolvePitch(m);
    return {done:m.done,violations:m.checks.violations,grounds:m.events.filter(e=>e.type==='ground').length,fc:m.events.filter(e=>e.fc).length};})()`);
  assert.equal(r.done,true,'seed '+seed);assert.deepEqual(r.violations,[]);assert.ok(r.grounds>0);
 }
});

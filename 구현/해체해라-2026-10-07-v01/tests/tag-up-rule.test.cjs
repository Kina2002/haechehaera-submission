const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const game=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8');

// Top of the first, our team batting; every ability is 50 unless a case changes it.
// Average runner go chances: third→home 75% (line drive 35%), second→third 35% (RF 60%, LF 20%). Thrown out: 6% at home.
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
 const m={id:'tag-check',opp:o,home:1,inning:1,half:0,outs:0,balls:0,strikes:0,
  bases:[null,null,null],score:[0,0],hits:[0,0],errors:[0,0],order:[0,0],last:[null,null],
  innings:[Array(7).fill(null),Array(7).fill(null)],paPitches:0,pitches:0,bh:[0,0],
  bhBase:[0,0],bhBaseUsed:[0,0],opportunities:[0,0],events:[],rng:20261105,
  done:false,rewarded:false,lastLines:{},reactionCount:0,recap:{},
  checks:{events:0,violations:[],motions:0,reactions:0},defense:{side:1,depth:1},...options};
 t.match=m;chooseBH=()=>null;
 const runner=i=>t.players[i+1];
 const runners=(...slots)=>{m.bases=[0,1,2].map(i=>slots.includes(i)?runner(i).id:null);return m.bases.slice();};
 const seq=(...v)=>{let i=0;r=()=>v[Math.min(i++,v.length-1)];};
 const fly=(pos='CF',line=false)=>{const e=emptyEvent(m);e.fieldPos=pos;e.fielder=fielder(o,pos);e.line=line;flyOut(m,e);return e;};
 const state=e=>({bases:m.bases.slice(),outs:m.outs,score:m.score[0],type:e.type,text:e.text,throwBases:e.throwBases??null,tag:!!e.tag,sf:batter0.stats.sf,ab:batter0.stats.ab,rbi:batter0.stats.rbi});
 let batter0=null;const atBat=()=>{batter0=batter(m);};
 `,ctx);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
}

test('a runner on third tags and scores on a caught fly ball, credited as a sacrifice fly',()=>{
 const r=fixture()(`(()=>{runners(2);seq(.5,.99);atBat();const e=fly();return state(e);})()`);
 assert.equal(r.score,1);assert.equal(r.outs,1);assert.equal(r.type,'sf');assert.equal(r.text,'희생플라이 · 태그업 득점');
 assert.deepEqual([r.sf,r.ab,r.rbi],[1,0,1]);assert.deepEqual(r.bases,[null,null,null]);
});

test('running ability (speed and baseball sense) decides whether to tag up',()=>{
 const run=(speed,sense,roll)=>fixture()(`(()=>{runners(2);runner(2).a.speed=${speed};runner(2).a.sense=${sense};seq(${roll},.99);atBat();const e=fly();return state(e).score;})()`);
 assert.equal(run(50,50,.8),0,'average runner holds on a high roll');
 assert.equal(run(90,70,.8),1,'fast, smart runner goes');
 assert.equal(run(10,30,.5),0,'slow runner holds even on a middling roll');
 assert.equal(run(50,50,.5),1);
});

test('outfield line drives allow tag-ups too, but less often than fly balls',()=>{
 const go=fixture()(`(()=>{runners(2);seq(.3,.99);atBat();const e=fly('CF',true);return state(e);})()`);
 assert.equal(go.score,1);assert.equal(go.type,'sf');assert.equal(go.text,'직선타 희생플라이 · 태그업 득점');assert.equal(go.sf,1);
 const hold=fixture()(`(()=>{runners(2);seq(.5,.99);atBat();const e=fly('CF',true);return state(e);})()`);
 assert.equal(hold.score,0);assert.equal(hold.type,'line');assert.equal(hold.text,'직선타 아웃');assert.notEqual(hold.bases[2],null);
});

test('a runner on second tags more easily on a ball caught in right field than in left field',()=>{
 const run=pos=>fixture()(`(()=>{runners(1);seq(.5,.99);atBat();const e=fly('${pos}');return {...state(e),r1:runner(1).id};})()`);
 const rf=run('RF');assert.deepEqual(rf.bases,[null,null,rf.r1]);assert.equal(rf.text,'플라이 아웃 · 3루 태그업 진루');assert.equal(rf.ab,1);
 for(const pos of ['LF','CF']){const s=run(pos);assert.deepEqual(s.bases,[null,s.r1,null],pos);}
});

test("the catching outfielder's arm can throw out a tagging runner",()=>{
 const out=fixture()(`(()=>{runners(2);seq(0,0);atBat();const e=fly();return state(e);})()`);
 assert.equal(out.outs,2);assert.equal(out.score,0);assert.equal(out.tag,true);assert.deepEqual(out.throwBases,[4]);
 assert.equal(out.text,'플라이 아웃 · 홈 태그 아웃');assert.deepEqual([out.sf,out.ab],[0,1]);
 const strong=(arm,speed)=>fixture()(`(()=>{runners(2);o.players.forEach(p=>p.a.throw=${arm});runner(2).a.speed=${speed};runner(2).a.sense=100;seq(0,.2);atBat();const e=fly();return state(e).outs;})()`);
 assert.equal(strong(50,50),1,'average arm: safe on a .2 roll');
 assert.equal(strong(100,10),2,'strong arm against a slow runner: out on the same roll');
});

test('runners tag lead first; a trailing runner never runs into an occupied base',()=>{
 const both=fixture()(`(()=>{runners(1,2);seq(.5,.99,.3,.99);atBat();const e=fly();return {...state(e),r1:runner(1).id};})()`);
 assert.equal(both.score,1);assert.deepEqual(both.bases,[null,null,both.r1]);
 assert.equal(both.text,'희생플라이 · 태그업 득점 · 3루 태그업 진루');
 const blocked=fixture()(`(()=>{runners(1,2);seq(.99,0,0);atBat();const e=fly('RF');return {...state(e),ids:[runner(1).id,runner(2).id]};})()`);
 assert.deepEqual(blocked.bases,[null,...blocked.ids]);assert.equal(blocked.score,0);
});

test('nobody tags up after the third out',()=>{
 const r=fixture({outs:2})(`(()=>{runners(1,2);seq(0,.99);atBat();const e=fly();return state(e);})()`);
 assert.equal(r.outs,3);assert.equal(r.score,0);assert.equal(r.type,'fly');
});

test('over many flies, fast runners score more often than slow ones and fly balls more than line drives',()=>{
 const rate=(speed,line)=>fixture()(`(()=>{let s=11,scored=0;r=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
   for(let i=0;i<2000;i++){m.outs=0;m.score=[0,0];m.order=[0,0];runners(2);runner(2).a.speed=${speed};fly('CF',${line});scored+=m.score[0];}return scored/2000;})()`);
 const fast=rate(85,false),slow=rate(20,false),line=rate(50,true),flyBall=rate(50,false);
 assert.ok(fast>slow+.3,JSON.stringify({fast,slow}));assert.ok(flyBall>line+.25,JSON.stringify({flyBall,line}));
});

test('full games keep runners, outs and scores consistent with tag-ups',()=>{
 for(const seed of [8,1105,31337,70707]){
  const r=fixture({rng:seed})(`(()=>{m.innings[attack(m)][0]=0;prepare(m);let guard=0;while(!m.done&&guard++<3000)resolvePitch(m);
    return {done:m.done,violations:m.checks.violations,flies:m.events.filter(e=>['fly','line','sf'].includes(e.type)).length};})()`);
  assert.equal(r.done,true,'seed '+seed);assert.deepEqual(r.violations,[]);assert.ok(r.flies>0);
 }
});

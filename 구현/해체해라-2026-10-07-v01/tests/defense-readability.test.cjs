const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {randomUUID}=require('node:crypto');

function fixture(){
 const ctx=vm.createContext({Math,crypto:{randomUUID},location:{hash:''},performance:{now:()=>0},
  document:{documentElement:{hasAttribute:()=>true}},window:{addEventListener:()=>{}},GameStorage:{create:()=>({})}});
 const src=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8');
 vm.runInContext(src.slice(0,src.indexOf('\nfunction rect(')),ctx);
 vm.runInContext(`
 function trial({side=1,depth=1,speed=50,sense=50,hands=50,roll=.760526315789,glove=.5,deep=true}={}){
  const t=newTeam('우리',11,5),o=newTeam('상대',8,4);data.slots=[t,null];data.current=0;
  for(const tm of[t,o])for(const p of tm.players){p.a=Object.fromEntries(KEYS.map(k=>[k,50]));p.tendency='중앙';}
  for(const p of o.players)Object.assign(p.a,{speed,sense,catch:hands});
  const m={id:'defense',opp:o,home:1,inning:1,half:0,outs:0,balls:0,strikes:0,bases:[null,null,null],score:[0,0],hits:[0,0],errors:[0,0],order:[0,0],last:[null,null],innings:[Array(7).fill(0),Array(7).fill(0)],events:[],pitches:0,paPitches:0,defense:{side,depth},command:'contact'};
  t.match=m;const original=r;let i=0;
  // Identical hit, pace and glove roll for each paired comparison.
  const seq=deep?[.742424242424,.2,.5,.5,.99,roll,glove,.8]:[.848484848485,.8,.5,roll,glove,.8];
  r=()=>seq[Math.min(i++,seq.length-1)];
  try{const e=emptyEvent(m);ballInPlay(m,e,null);e.after=snap(m);buildMotion(m,e);return e;}finally{r=original;}
 }
 `,ctx);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
}

test('the same fly is caught from a matching shift and lands before the opposite shift arrives',()=>{
 const run=fixture(),good=run('trial({side:2})'),bad=run('trial({side:0})');
 assert.deepEqual(good.target,bad.target);assert.equal(good.defense24.deadline,bad.defense24.deadline);
 assert.equal(good.type,'fly');assert.ok(bad.hit>0);
 assert.ok(good.defense24.arrival<bad.defense24.arrival);
 assert.match(good.reason,/배치 덕분/);assert.equal(bad.errors.length,0);
});

test('speed changes the real travel time and the outcome without changing the hit',()=>{
 const run=fixture(),slow=run('trial({speed:20})'),fast=run('trial({speed:80})');
 assert.deepEqual(slow.target,fast.target);assert.equal(slow.defense24.deadline,fast.defense24.deadline);
 assert.ok(slow.hit>0);assert.equal(fast.type,'fly');assert.match(fast.reason,/빠른 발/);
 const moves=[slow,fast].map(e=>e.fieldMoves[0]);
 assert.ok(moves[0].end>moves[1].end);
 assert.ok(slow.defense24.pickup>slow.defense24.land);
 assert.ok(fast.defense24.moveArrival<=fast.defense24.land);
});

test('baseball sense changes reaction, while catching changes the drop after arrival',()=>{
 const run=fixture(),early=run('trial({sense:90,roll:.74})'),late=run('trial({sense:10,roll:.74})');
 assert.ok(early.defense24.reaction<late.defense24.reaction);
 assert.equal(early.type,'fly');assert.ok(late.hit>0);
 const clean=run('trial({hands:95,roll:.68,glove:.02})'),drop=run('trial({hands:5,roll:.68,glove:.02})');
 assert.equal(clean.defense24.arrival,drop.defense24.arrival);
 assert.equal(clean.type,'fly');assert.equal(drop.type,'error');assert.match(drop.reason,/도착했지만 포구 실패/);
 assert.equal(drop.errors.length,1);assert.equal(drop.defense24.reached,true);
 assert.ok(drop.defense24.pickup>drop.defense24.land);
});

test('the fastest arriving eligible fielder takes the ball, instead of always the closest',()=>{
 const run=fixture();
 const result=run(`(()=>{const e=trial({roll:.5});const o=team().match.opp;
  e.before.fieldStarts={[fielder(o,'LF').id]:[400,216],[fielder(o,'CF').id]:[435,216],[fielder(o,'RF').id]:[750,216]};
  fielder(o,'LF').a.speed=100;fielder(o,'CF').a.speed=0;
  return defenseAttempt24(e,o,['LF','CF','RF'],true,50,'contact',.5);})()`);
 assert.equal(result.pos,'LF');
});

test('a reached ground ball becomes an out; a ball past the same infielder stays a hit',()=>{
 const run=fixture(),good=run('trial({deep:false,side:2,roll:.76})'),bad=run('trial({deep:false,side:0,roll:.76})');
 assert.deepEqual(good.target,bad.target);
 assert.equal(good.type,'ground');assert.ok(bad.hit>0);assert.equal(bad.errors.length,0);
});

test('edge abilities and all nine shifts keep finite chronological pursuit paths',()=>{
 const run=fixture();
 for(const speed of[0,50,100])for(const sense of[0,100])for(const side of[0,1,2])for(const depth of[0,1,2])for(const deep of[false,true]){
  const e=run(`trial(${JSON.stringify({speed,sense,side,depth,deep,roll:.9})})`),d=e.defense24;
  assert.ok(d.moveStart<d.pickup&&d.pickup<=.860001);
  for(const mv of e.fieldMoves)if(mv.knots){let last=-1;for(const[time,pt]of mv.knots){assert.ok(time>=last);assert.ok(pt.every(Number.isFinite));last=time;}}
  assert.equal(d.reached,d.arrival<=d.deadline);
  assert.equal(d.land,d.deadline,'the ball clock must never wait for a slow fielder');
 }
});

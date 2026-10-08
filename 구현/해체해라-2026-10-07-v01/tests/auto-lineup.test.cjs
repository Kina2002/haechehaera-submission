const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const GameAutoLineup=require('../src/auto-lineup.js');
const POS=['P','C','1B','2B','3B','SS','LF','CF','RF'];
const keys=['contact','power','eye','speed','sense','catch','throw','velocity','control','stamina'];
const game=readFileSync(join(__dirname,'../src/game.js'),'utf8');
const extensions=readFileSync(join(__dirname,'../src/extensions.js'),'utf8');
const ctx=vm.createContext({GameAutoLineup,POS,clone:structuredClone,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),balance:()=>({fatigueFloor:.35}),lineupError:()=>null});
vm.runInContext(extensions.match(/^function effective\(.*$/m)[0],ctx);
vm.runInContext(game.slice(game.indexOf('function validBattingDraft('),game.indexOf('function boneheadOwner(')),ctx);
const value=vm.runInContext('effective',ctx);
const assign=vm.runInContext('autoAssignLineup',ctx);
function player(id,level=40,extra={}){return {id,a:{...Object.fromEntries(keys.map(k=>[k,level])),...extra},energy:extra.stamina??level};}
const choose=players=>GameAutoLineup.choose(players,value);

test('12 and 35 player clubs get nine distinct players and positions without modifying roster',()=>{
  for(const n of [12,35]){
    const players=Array.from({length:n},(_,i)=>player('p'+i,20+i));
    const before=structuredClone(players),a=choose(players);
    assert.equal(a.length,9);assert.equal(new Set(a.map(x=>x.id)).size,9);
    assert.deepEqual(a.map(x=>x.pos).sort(),[...POS].sort());
    assert.ok(a.every(x=>players.some(p=>p.id===x.id)));
    assert.deepEqual(players,before);assert.deepEqual(choose(players),a);
  }
});
test('pitching specialist wins the mound; weak bench players are left out',()=>{
  const players=Array.from({length:8},(_,i)=>player('fielder'+i,60));
  players.push(player('ace',20,{velocity:100,control:100,sense:80}),player('bench1',10),player('bench2',10),player('bench3',10));
  const a=choose(players);
  assert.equal(a.find(x=>x.pos==='P').id,'ace');
  assert.ok(a.every(x=>!x.id.startsWith('bench')));
});
test('fatigue changes selection, while recovered and trained players return',()=>{
  const players=Array.from({length:9},(_,i)=>player('rested'+i,60));
  const star=player('star',100);star.energy=0;players.push(star);
  assert.ok(!choose(players).some(x=>x.id==='star'));
  star.energy=100;assert.ok(choose(players).some(x=>x.id==='star'));
});
test('strong bats take middle order and all ties produce a stable order',()=>{
  const players=Array.from({length:7},(_,i)=>player('normal'+i,40));
  players.push(player('hitter',40,{contact:100,power:100,eye:100}),player('slugger',40,{power:100,contact:70}));
  const a=choose(players);assert.equal(a[2].id,'hitter');assert.equal(a[3].id,'slugger');
  assert.deepEqual(choose(players),a);
});
test('auto assignment saves both draft and lineup; running matches stay unchanged',()=>{
  const t={players:Array.from({length:12},(_,i)=>player('p'+i,30+i)),lineup:[],battingDraft:[],match:null};
  assert.equal(assign(t),null);assert.deepEqual(t.lineup,t.battingDraft);
  assert.notEqual(t.lineup,t.battingDraft);
  const before=JSON.stringify(t);t.match={done:false,paused:true};
  assert.match(assign(t),/경기 중/);
  t.match=null;assert.equal(JSON.stringify(t),before);
  t.match={done:true};assert.equal(assign(t),null);
});
test('insufficient or duplicate roster cannot overwrite a saved lineup',()=>{
  const players=Array.from({length:8},(_,i)=>player('p'+i));players.push(players[0]);
  assert.equal(choose(players),null);
  const t={players,lineup:[{id:'original',pos:'P'}],match:null};
  assert.match(assign(t),/9명/);assert.equal(t.lineup[0].id,'original');
});

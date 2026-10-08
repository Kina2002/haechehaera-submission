const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const game=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8');

function fixture(options={}){
 const ctx=vm.createContext({Math,crypto:{randomUUID},location:{hash:''},performance:{now:()=>0},
  document:{documentElement:{hasAttribute:()=>true}},window:{addEventListener:()=>{}},
  GameStorage:{create:()=>({})},recordRecap:()=>{},restoreAbilities:()=>{},options});
 vm.runInContext(game.slice(0,game.indexOf('\nfunction rect(')),ctx);
 vm.runInContext(`
 const t=newTeam('우리',11,5),o=newTeam('상대',8,4);
 for(const tm of [t,o])for(const p of tm.players)p.a=Object.fromEntries(KEYS.map(k=>[k,50]));
 data.slots=[t,null];data.current=0;
 const m={id:'mercy-check',opp:o,home:0,inning:3,half:1,outs:2,balls:0,strikes:2,
  bases:[null,null,null],score:[12,2],hits:[0,0],errors:[0,0],order:[0,0],last:[null,null],
  innings:[Array(7).fill(null),Array(7).fill(null)],paPitches:0,pitches:0,bh:[0,0],
  bhBase:[0,0],bhBaseUsed:[0,0],opportunities:[0,0],events:[],rng:20261008,
  done:false,rewarded:false,lastLines:{},reactionCount:0,recap:{},
  checks:{events:0,violations:[],motions:0,reactions:0},defense:{side:1,depth:1},...options};
 t.match=m;chooseBH=()=>null;r=()=>.5;m.command='take';
 `,ctx);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
}

test('10+ run mercy wins and losses end only at a completed bottom inning from inning 3',()=>{
 for(const home of [0,1])for(const score of [[12,2],[2,12],[18,2],[2,18]])for(const inning of [3,4,5,6,7]){
  const run=fixture({home,score,inning});
  const result=run(`(()=>{const e=resolvePitch(m);return {done:m.done,mercy:m.mercy,group:e.group,
    history:t.history[0].mercy,record:t.history[0].result,checks:m.checks.violations,label:gameResultLabel(m)};})()`);
  assert.equal(result.done,true);assert.deepEqual(result.mercy,{inning,margin:Math.abs(score[0]-score[1])});
  assert.deepEqual(result.history,result.mercy);assert.deepEqual(result.checks,[]);
  assert.equal(result.group,score[0]>score[1]?'g29':'g30');
  assert.equal(result.record,score[0]>score[1]?'승리':'패배');
  assert.equal(result.label,score[0]>score[1]?'콜드승':'콜드패');
 }
});

test('early innings, the top half and a 9-run margin do not trigger mercy',()=>{
 for(const options of [{inning:1},{inning:2},{half:0},{score:[11,2]},{score:[2,11]}]){
  const r=fixture(options)('(()=>{resolvePitch(m);return {done:m.done,mercy:m.mercy??null,inning:m.inning,half:m.half};})()');
  assert.equal(r.done,false);assert.equal(r.mercy,null);
 }
});

test('a mid-inning 10-run margin keeps going and a comeback below 10 prevents mercy',()=>{
 const run=fixture({outs:1});
 assert.equal(run('(()=>{resolvePitch(m);return m.done;})()'),false);
 const r=run('(()=>{m.score=[12,3];m.strikes=2;m.command="take";resolvePitch(m);return [m.done,m.mercy??null,m.inning,m.half];})()');
 assert.deepEqual(r,[false,null,4,0]);
});

test('home team go-ahead runs in innings 5 through 7 never end the game immediately',()=>{
 for(const inning of [5,6,7])for(const home of [0,1]){
  const run=fixture({inning,home,score:[2,2],outs:1});
  const r=run(`(()=>{const at=tside(m,${home});m.bases=at.players.slice(1,4).map(p=>p.id);r=()=>0;
    const e=resolvePitch(m);return {done:m.done,score:m.score,type:e.type,walkoff:!!m.walkoff};})()`);
  assert.equal(r.type,'hbp');assert.equal(r.done,false);assert.equal(r.walkoff,false);
  assert.equal(r.score[home],3);assert.equal(r.score[1-home],2);
 }
});

test('go-ahead hits count every legal run instead of stopping at a one-run lead',()=>{
 for(const bases of [2,4]){
  const run=fixture({inning:5,score:[2,2],outs:0});
  const r=run(`(()=>{m.bases=t.players.slice(1,4).map(p=>p.id);r=()=>.99;const e=emptyEvent(m);
    reachHit(m,e,${bases});resolveInningEnd(m,e);return [m.score[0],e.runs.length,m.done];})()`);
  assert.deepEqual(r,bases===2?[4,2,false]:[6,4,false]);
 }
});

test('normal fifth-inning endings, tied extra innings and seventh-inning draws still work',()=>{
 const cases=[
  [{inning:5,half:0,score:[3,2]},[true,5,0]],
  [{inning:5,half:1,score:[3,2]},[true,5,1]],
  [{inning:5,half:1,score:[2,3]},[true,5,1]],
  [{inning:5,half:1,score:[2,2]},[false,6,0]],
  [{inning:6,half:1,score:[2,2]},[false,7,0]],
  [{inning:7,half:1,score:[2,2]},[true,7,1]]
 ];
 for(const [options,want] of cases){
  const run=fixture(options);
  assert.deepEqual(run('(()=>{resolvePitch(m);return [m.done,m.inning,m.half];})()'),want);
  assert.equal(run('m.mercy??null'),null);
 }
});

test('mercy records survive save roundtrip and repeated settlement cannot grant rewards twice',()=>{
 const r=fixture()('(()=>{resolvePitch(m);const before=[t.w,t.l,t.coins,t.history.length];reward(m);const h=JSON.parse(JSON.stringify(t.history[0]));return {before,after:[t.w,t.l,t.coins,t.history.length],label:gameResultLabel(h),note:gameEndDetails(h)};})()');
 assert.deepEqual(r.before,r.after);assert.equal(r.label,'콜드승');assert.equal(r.note,'3회 종료 · 10점 차 콜드게임');
});

test('legacy records retain normal results and generated dialogue no longer mentions walk-offs',()=>{
 const run=fixture();
 assert.equal(run('gameResultLabel({result:"승리",score:[3,2],walkoff:true})'),'승리');
 assert.equal(run('gameEndDetails({result:"승리",score:[12,2]})'),'');
 assert.equal(run('JSON.stringify(DIALOGUES).includes("끝내기")'),false);
 assert.ok(!game.includes('m.walkoff'));
});

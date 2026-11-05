const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const game=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8');

// Bottom of the fifth, tied 2:2, our team at home unless a case says otherwise.
function fixture(options={}){
 const ctx=vm.createContext({Math,crypto:{randomUUID},location:{hash:''},performance:{now:()=>0},
  document:{documentElement:{hasAttribute:()=>true}},window:{addEventListener:()=>{}},
  GameStorage:{create:()=>({})},recordRecap:()=>{},restoreAbilities:()=>{},options});
 vm.runInContext(game.slice(0,game.indexOf('\nfunction rect(')),ctx);
 vm.runInContext(`
 const t=newTeam('우리',11,5),o=newTeam('상대',8,4);
 for(const tm of [t,o])for(const p of tm.players)p.a=Object.fromEntries(KEYS.map(k=>[k,50]));
 data.slots=[t,null];data.current=0;
 const m={id:'walkoff-check',opp:o,home:0,inning:5,half:1,outs:0,balls:0,strikes:0,
  bases:[null,null,null],score:[2,2],hits:[0,0],errors:[0,0],order:[0,0],last:[null,null],
  innings:[Array(7).fill(null),Array(7).fill(null)],paPitches:0,pitches:0,bh:[0,0],
  bhBase:[0,0],bhBaseUsed:[0,0],opportunities:[0,0],events:[],rng:20261105,
  done:false,rewarded:false,lastLines:{},reactionCount:0,recap:{},
  checks:{events:0,violations:[],motions:0,reactions:0},defense:{side:1,depth:1},...options};
 t.match=m;chooseBH=()=>null;r=()=>.5;m.command='take';
 const runners=(...slots)=>{const at=tside(m,attack(m)).players.slice(1,4);m.bases=[0,1,2].map(i=>slots.includes(i)?at[i].id:null);return m.bases.slice();};
 `,ctx);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
}

test('a go-ahead run in the bottom of innings 5 through 7 ends the game at once for either home team',()=>{
 for(const inning of [5,6,7])for(const home of [0,1]){
  const run=fixture({inning,home});
  const r=run(`(()=>{runners(0,1,2);r=()=>0;const e=resolvePitch(m);
    return {type:e.type,text:e.text,runs:e.runs.length,done:m.done,score:m.score,inning:m.inning,half:m.half,walkoff:m.walkoff,
     group:e.group,details:gameEndDetails(m),history:t.history[0].walkoff,result:t.history[0].result,checks:m.checks.violations};})()`);
  assert.equal(r.type,'hbp');assert.equal(r.runs,1);assert.equal(r.done,true);
  assert.equal(r.score[home],3);assert.equal(r.score[1-home],2);
  assert.deepEqual([r.inning,r.half],[inning,1]);
  assert.deepEqual(r.walkoff,{inning,side:home,kind:'hbp'});assert.deepEqual(r.history,r.walkoff);
  assert.ok(r.text.endsWith(' · 끝내기'),r.text);
  assert.equal(r.group,home===0?'g33':'g35');
  assert.equal(r.result,home===0?'승리':'패배');
  assert.equal(r.details,inning+'회 말 '+(home===0?'우리 팀':'상대 팀')+' 끝내기');
  assert.deepEqual(r.checks,[]);
 }
});

test('walk-off hits count only the winning run and credit the bases that runner advanced',()=>{
 const cases=[
  [[0,1,2],1,'single'],[[0,1,2],2,'single'],[[0,1,2],3,'single'],
  [[1],2,'double'],[[1],3,'double'],[[0],3,'triple']
 ];
 for(const [slots,hit,want] of cases){
  const r=fixture()(`(()=>{const before=runners(${slots});r=()=>.99;const b=batter(m),e=emptyEvent(m);
    reachHit(m,e,${hit});resolveInningEnd(m,e);
    return {score:m.score,runs:e.runs.length,type:e.type,hit:e.hit,text:e.text,done:m.done,rbi:b.stats.rbi,
     doubles:b.stats.doubles,triples:b.stats.triples,ab:b.stats.ab,h:b.stats.h,batterBase:m.bases.indexOf(b.id),
     onBase:m.bases.filter(Boolean),scored:e.runs};})()`);
  const credit={single:1,double:2,triple:3}[want];
  assert.deepEqual(r.score,[3,2],String(slots)+' '+hit);assert.equal(r.runs,1);assert.equal(r.done,true);
  assert.equal(r.type,want);assert.equal(r.hit,credit);assert.equal(r.text,{1:'안타!',2:'2루타!',3:'3루타!'}[credit]);
  assert.equal(r.rbi,1);assert.equal(r.ab,1);assert.equal(r.h,1);
  assert.equal(r.doubles,credit===2?1:0);assert.equal(r.triples,credit===3?1:0);
  assert.equal(r.batterBase,credit-1);
  assert.equal(r.onBase.length,slots.length,'batter and trailing runners stay on base');
  assert.equal(new Set(r.onBase).size,r.onBase.length);assert.ok(!r.onBase.some(id=>r.scored.includes(id)));
 }
});

test('a walk-off home run counts every runner and the batter',()=>{
 for(const home of [0,1]){
  const r=fixture({home})(`(()=>{runners(0,1,2);const b=batter(m),e=emptyEvent(m);reachHit(m,e,4);resolveInningEnd(m,e);
    return {score:m.score,runs:e.runs.length,rbi:b.stats.rbi,hr:b.stats.hr,done:m.done,group:chooseGroup(m,e)};})()`);
  assert.equal(r.score[home],6);assert.equal(r.score[1-home],2);assert.equal(r.runs,4);
  assert.equal(r.rbi,4);assert.equal(r.hr,1);assert.equal(r.done,true);
  assert.equal(r.group,home===0?'g34':'g35');
 }
});

test('tying runs, top-half leads and leads before the fifth inning do not end the game early',()=>{
 const tie=fixture({score:[2,3]})(`(()=>{runners(0,1,2);r=()=>.99;const e=emptyEvent(m);reachHit(m,e,1);resolveInningEnd(m,e);return [m.score,m.done,m.walkoff??null];})()`);
 assert.deepEqual(tie,[[3,3],false,null]);
 for(const options of [{half:0},{inning:4},{inning:1}]){
  const r=fixture(options)(`(()=>{runners(0,1,2);const e=emptyEvent(m);reachHit(m,e,4);resolveInningEnd(m,e);return [m.score[attack(m)],m.done,m.walkoff??null];})()`);
  assert.deepEqual(r,[6,false,null],JSON.stringify(options));
 }
});

test('a run crossing on the third out never creates a walk-off',()=>{
 const r=fixture({outs:2})(`(()=>{runners(2);const e=emptyEvent(m);groundOut(m,e);resolveInningEnd(m,e);return [m.score,m.done,m.inning,m.half,m.walkoff??null];})()`);
 assert.deepEqual(r,[[2,2],false,6,0,null]);
});

test('sacrifice flies, wild pitches and ground-ball double plays can end the game',()=>{
 const sf=fixture({outs:1})(`(()=>{runners(2);const rolls=[0,.99];r=()=>rolls.length>1?rolls.shift():rolls[0];const b=batter(m),e=emptyEvent(m);flyOut(m,e);resolveInningEnd(m,e);return [m.score,m.done,e.type,b.stats.sf,b.stats.rbi,b.stats.ab];})()`);
 assert.deepEqual(sf,[[3,2],true,'sf',1,1,0]);
 const wp=fixture()(`(()=>{runners(0,2);const b=batter(m),e=emptyEvent(m);advanceLoose(m,e);resolveInningEnd(m,e);return [m.score,m.done,b.stats.rbi,e.runs.length];})()`);
 assert.deepEqual(wp,[[3,2],true,0,1]);
 const dp=fixture()(`(()=>{runners(0,2);const b=batter(m),e=emptyEvent(m);groundOut(m,e,true);resolveInningEnd(m,e);return [m.score,m.done,m.outs,b.stats.rbi];})()`);
 assert.deepEqual(dp,[[3,2],true,2,0]);
});

test('walk-off records survive a save roundtrip and legacy walk-off flags stay readable',()=>{
 const r=fixture()(`(()=>{runners(0,1,2);r=()=>0;resolvePitch(m);const h=JSON.parse(JSON.stringify(t.history[0]));
   return {label:gameResultLabel(h),note:gameEndDetails(h),legacyLabel:gameResultLabel({result:'승리',score:[3,2],walkoff:true}),
    legacyNote:gameEndDetails({result:'승리',score:[3,2],walkoff:true}),mercyNote:gameEndDetails({mercy:{inning:3,margin:10}})};})()`);
 assert.equal(r.label,'승리');assert.equal(r.note,'5회 말 우리 팀 끝내기');
 assert.equal(r.legacyLabel,'승리');assert.equal(r.legacyNote,'');
 assert.equal(r.mercyNote,'3회 종료 · 10점 차 콜드게임');
});

test('walk-off reactions have four lines each and the losing side keeps an own-fan line',()=>{
 const groups=fixture()(`['g33','g34','g35'].map(id=>DIALOGUES.find(g=>g[0]===id))`);
 for(const g of groups){assert.ok(g);assert.equal(g[4].length,4);assert.ok(g[4].every(([s,l])=>s&&l.length));}
 assert.ok(groups[2][4].some(([speaker])=>speaker==='우리 관객'));
});

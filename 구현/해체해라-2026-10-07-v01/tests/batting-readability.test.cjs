const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{randomUUID}=require('node:crypto');
function fixture(){
 const c=vm.createContext({Math,crypto:{randomUUID},location:{hash:''},performance:{now:()=>0},document:{documentElement:{hasAttribute:()=>true}},window:{addEventListener:()=>{}},GameStorage:{create:()=>({})},recordRecap:()=>{},restoreAbilities:()=>{}});
 const src=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8');vm.runInContext(src.slice(0,src.indexOf('\nfunction rect(')),c);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/batting-motion-v25.js'),'utf8'),c);
 vm.runInContext(`chooseBH=()=>null;chooseGroup=()=>null;
 function trial({contact=50,power=50,eye=50,command='contact',roll=.2,decision=0,zone=true,hr=.99,foul=.9}={}){
  const t=newTeam('우리',11,5),o=newTeam('상대',8,4);data.slots=[t,null];data.current=0;
  for(const tm of[t,o])for(const p of tm.players){p.a=Object.fromEntries(KEYS.map(k=>[k,50]));p.tendency='중앙';p.hand='우타';}
  for(const p of t.players)Object.assign(p.a,{contact,power,eye});
  const m={id:'batting',opp:o,home:1,inning:1,half:0,outs:0,balls:0,strikes:0,bases:[null,null,null],score:[0,0],hits:[0,0],errors:[0,0],order:[0,0],last:[null,null],innings:[Array(7).fill(0),Array(7).fill(0)],events:[],pitches:0,paPitches:0,defense:{side:1,depth:1},command,bh:[0,0],checks:{events:0,violations:[],motions:0,reactions:0},recap:{},lastLines:{},rng:1};t.match=m;
  const seq=[zone?0:.99,.9,decision,roll,foul,.7,.2,.5,.5,hr,.5,.5,.8];let i=0;r=()=>seq[Math.min(i++,seq.length-1)];return resolvePitch(m);
 }`,c);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',c));
}
test('the same difficult pitch is contacted by a contact hitter and missed by a low-contact hitter',()=>{
 const run=fixture(),high=run('trial({contact:80,roll:.78})'),low=run('trial({contact:30,roll:.78})');
 assert.equal(high.contact,true);assert.equal(!!low.contact,false);assert.equal(low.type,'swing');
 assert.equal(high.batting25.roll,low.batting25.roll);assert.match(high.batting25.note,/컨택 능력/);
});
test('contact instruction saves the same borderline swing that power instruction misses',()=>{
 const run=fixture(),contact=run("trial({command:'contact',roll:.74})"),power=run("trial({command:'power',roll:.65})");
 assert.equal(contact.contact,true);assert.match(contact.batting25.note,/컨택 지시/);
 assert.equal(!!power.contact,false);assert.match(power.batting25.note,/풀스윙 부담/);
 const same=run("trial({command:'contact',roll:.65})");assert.equal(same.contact,true);
});
test('power and a power swing change hit strength, flight and extra-base outcome on the same pitch',()=>{
 const run=fixture(),weak=run("trial({contact:80,power:30,command:'contact',hr:.08})"),strong=run("trial({contact:80,power:80,command:'power',hr:.08})");
 assert.ok(strong.batting25.exit>weak.batting25.exit+25);assert.equal(strong.type,'hr');assert.notEqual(weak.type,'hr');
 assert.ok(strong.batting25.pace>weak.batting25.pace);
});
test('a better contact margin produces more solid contact instead of relabeling the same hit',()=>{
 const run=fixture(),solid=run('trial({contact:80,roll:.2})'),edge=run('trial({contact:80,roll:.8})');
 assert.equal(solid.contact,true);assert.equal(edge.contact,true);
 assert.ok(solid.batting25.quality>edge.batting25.quality);assert.ok(solid.batting25.exit>edge.batting25.exit);
 assert.notDeepEqual(solid.target,edge.target);assert.match(edge.batting25.note,/간신히|빗맞아/);
});
test('eye ability chooses the same outside pitch, while watching a strike stays a strike',()=>{
 const run=fixture(),good=run("trial({eye:90,command:'take',zone:false,decision:.07})"),bad=run("trial({eye:20,command:'take',zone:false,decision:.07})");
 assert.equal(good.swing,false);assert.equal(good.type,'ball');assert.equal(bad.swing,true);assert.match(good.batting25.note,/선구안/);
 const strike=run("trial({command:'take',decision:.9})");assert.equal(strike.type,'strike');assert.match(strike.batting25.note,/스트라이크/);
});
test('power has a longer visible preparation and follow-through; contact and no-swing poses stay honest',()=>{
 const run=fixture();
 const result=run(`(()=>{const a=trial({command:'contact',hr:0}),b=trial({command:'power',hr:0}),watch=trial({command:'take',decision:.9});const M=window.BattingMotionV25;
 return {a15:M.frame(a,.15,1),b15:M.frame(b,.15,1),a22:M.frame(a,.22,1),b22:M.frame(b,.22,1),a31:M.frame(a,.31,1),b31:M.frame(b,.31,1),watch:[.15,.22,.31].map(t=>M.frame(watch,t,1)),aRelease:a.moves[0].delay,bRelease:b.moves[0].delay};})()`);
 assert.equal(result.a15,48);assert.equal(result.b15,51);assert.equal(result.a22,54);assert.equal(result.b22,54);
 assert.equal(result.b31,57);assert.notEqual(result.a31,57);assert.deepEqual(result.watch,[48,48,48]);
 assert.ok(result.bRelease>result.aRelease&&result.aRelease>.22);
});
test('the miss timing is recorded, and serialized replay preserves both timing and the verdict',()=>{
 const run=fixture(),e=run('trial({contact:30,roll:.95})');
 assert.equal(!!e.contact,false);assert.ok(Math.abs(e.batting25.center-.22)>=.035);
 const copy=JSON.parse(JSON.stringify(e));assert.deepEqual(copy,e);
});

test('the swing sound follows early and late misses at every playback speed',()=>{
 const run=fixture(),rules=require('../src/audio-rules.js'),e=run('trial({contact:30,roll:.95})');
 for(const duration of[1400,3200,5000]){
  const plan=rules.eventPlan(e,duration);
  assert.equal(plan.find(c=>c.id==='miss').at,rules.inverse(e.batting25.center)*duration);
  assert.ok(!plan.some(c=>c.id==='bat'||c.id==='bat-hr'));
 }
});

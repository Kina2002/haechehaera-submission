const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const game=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8');

// Top of the first, our team batting, runner on second. The defense has a strong left fielder (throw 100)
// and weak right and centre fielders (throw 0); every other ability is 50.
// A runner trying for an extra base is out at .26+(arm-speed)/230: 48% against the left fielder, 5% against the others.
function fixture(){
 const ctx=vm.createContext({Math,crypto:{randomUUID},location:{hash:''},performance:{now:()=>0},
  document:{documentElement:{hasAttribute:()=>true}},window:{addEventListener:()=>{}},
  GameStorage:{create:()=>({})},recordRecap:()=>{},restoreAbilities:()=>{}});
 vm.runInContext(game.slice(0,game.indexOf('\nfunction rect(')),ctx);
 vm.runInContext(game.match(/^function opponentAbility\(.*$/m)[0],ctx);
 vm.runInContext(`
 const t=newTeam('우리',11,5),o=newTeam('상대',8,4);
 for(const tm of [t,o])for(const p of tm.players)p.a=Object.fromEntries(KEYS.map(k=>[k,50]));
 fielder(o,'LF').a.throw=100;fielder(o,'CF').a.throw=0;fielder(o,'RF').a.throw=0;
 data.slots=[t,null];data.current=0;
 const m={id:'arm-check',opp:o,home:1,inning:1,half:0,outs:0,balls:0,strikes:0,
  bases:[null,null,null],score:[0,0],hits:[0,0],errors:[0,0],order:[0,0],last:[null,null],
  innings:[Array(7).fill(null),Array(7).fill(null)],paPitches:0,pitches:0,bh:[0,0],
  bhBase:[0,0],bhBaseUsed:[0,0],opportunities:[0,0],events:[],rng:20261105,
  done:false,rewarded:false,lastLines:{},reactionCount:0,recap:{},
  checks:{events:0,violations:[],motions:0,reactions:0},defense:{side:1,depth:1}};
 t.match=m;
 const seq=(...v)=>{let i=0;r=()=>v[Math.min(i++,v.length-1)];};
 const single=pos=>{m.outs=0;m.score=[0,0];m.order=[0,0];m.bases=[null,t.players[2].id,null];const e=emptyEvent(m);if(pos){e.fieldPos=pos;e.fielder=fielder(o,pos);}reachHit(m,e,1);return {outs:m.outs,score:m.score[0],throwBase:e.throwBase??null,tag:!!e.tag};};
 `,ctx);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
}

test('a strong-armed left fielder throws out the runner trying to score on a single to left',()=>{
 const r=fixture()(`(()=>{seq(0,.3);return single('LF');})()`);
 assert.deepEqual(r,{outs:1,score:0,throwBase:4,tag:true});
});

test('the same roll on a ball to right or centre uses that weak arm and the runner scores',()=>{
 for(const pos of ['RF','CF']){
  const r=fixture()(`(()=>{seq(0,.3);return single('${pos}');})()`);
  assert.deepEqual(r,{outs:0,score:1,throwBase:null,tag:false},pos);
 }
});

test('an event with no recorded fielder falls back to the right fielder',()=>{
 const r=fixture()(`(()=>{seq(0,.3);return single(null);})()`);
 assert.equal(r.score,1);
});

test('over many singles, runners are thrown out far more often against the strong arm',()=>{
 const rate=pos=>fixture()(`(()=>{let s=5,outs=0;r=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
   for(let i=0;i<2000;i++)outs+=single('${pos}').outs;return outs/2000;})()`);
 const left=rate('LF'),right=rate('RF');
 assert.ok(left>right*3&&left-right>.08,JSON.stringify({left,right}));
});

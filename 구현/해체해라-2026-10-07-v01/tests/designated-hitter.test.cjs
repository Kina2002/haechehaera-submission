const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const game=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8');

function fixture(){
 const ctx=vm.createContext({Math,crypto:{randomUUID},location:{hash:''},performance:{now:()=>0},
  document:{documentElement:{hasAttribute:()=>true}},window:{addEventListener:()=>{}},
  GameStorage:{create:()=>({})},recordRecap:()=>{},restoreAbilities:()=>{},validVacancy26:()=>false});
 vm.runInContext(game.slice(0,game.indexOf('\nfunction rect(')),ctx);
 vm.runInContext(game.match(/^function opponentAbility\(.*$/m)[0],ctx);
 vm.runInContext(game.slice(game.indexOf('function validBattingDraft('),game.indexOf('function boneheadOwner(')),ctx);
 vm.runInContext(`
 const t=newTeam('우리',11,5),o=opponent(t);data.slots=[t,null];data.current=0;chooseBH=()=>null;
 const legacy=tm=>{tm.lineup=[tm.players[0],...tm.players.slice(1,9)].map((p,i)=>({id:p.id,pos:POS[i]}));delete tm.battingDraft;};
 const startAt=(seed)=>{const m={id:'dh-'+seed,opp:o,home:seed%2,inning:1,half:0,outs:0,balls:0,strikes:0,bases:[null,null,null],score:[0,0],hits:[0,0],errors:[0,0],order:[0,0],last:[null,null],
  innings:[Array(7).fill(null),Array(7).fill(null)],paPitches:0,pitches:0,bh:[0,0],bhBase:[0,0],bhBaseUsed:[0,0],opportunities:[0,0],events:[],rng:seed,
  done:false,rewarded:false,lastLines:{},reactionCount:0,recap:{},checks:{events:0,violations:[],motions:0,reactions:0},defense:{side:1,depth:1}};
  m.innings[attack(m)][0]=0;t.match=m;prepare(m);return m;};
 `,ctx);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
}

test('new clubs and opponents field eight fielders plus a DH in the order and a non-batting pitcher',()=>{
 const run=fixture();
 for(const side of ['t','o']){
  const l=run(side+'.lineup');
  assert.equal(l.length,10);assert.equal(l[9].pos,'P');
  assert.deepEqual(l.slice(0,9).map(x=>x.pos).sort(),['1B','2B','3B','C','CF','DH','LF','RF','SS']);
  assert.equal(run('lineupError('+side+')'),'');
 }
 assert.ok(run('o.players.length')>=10);
});

test('the pitcher never comes to bat and the DH does, across full games',()=>{
 for(const seed of [11,2026,90210,777]){
  const r=fixture()(`(()=>{const m=startAt(${seed});const batters=[new Set(),new Set()];let guard=0;
    while(!m.done&&guard++<3000){const before=attack(m),b=batter(m).id;batters[before].add(b);resolvePitch(m);}
    return {done:m.done,guard,violations:m.checks.violations,
     own:{pitcher:pitcher(t).id,dh:t.lineup.find(x=>x.pos==='DH').id,batted:[...batters[0]]},
     opp:{pitcher:pitcher(o).id,dh:o.lineup.find(x=>x.pos==='DH').id,batted:[...batters[1]]}};})()`);
  assert.equal(r.done,true,'seed '+seed);assert.deepEqual(r.violations,[]);
  for(const side of [r.own,r.opp]){
   assert.ok(!side.batted.includes(side.pitcher),'pitcher batted with seed '+seed);
   assert.ok(side.batted.includes(side.dh),'DH never batted with seed '+seed);
   assert.ok(side.batted.length<=9);
  }
 }
});

test('legacy nine-man lineups move the pitcher out of the order and add the best bench bat as DH',()=>{
 const r=fixture()(`(()=>{legacy(t);const before=t.lineup.map(x=>x.id);const bench=t.players.filter(p=>!before.includes(p.id));
   bench[0].a.contact=100;bench[0].a.power=100;bench[0].a.eye=100;t.battingDraft=[{id:null,pos:'P'}];
   const legacyOk=lineupError(t,true),strict=lineupError(t),changed=adoptDH(t);
   return {legacyOk,strict,changed,lineup:t.lineup,before,dh:bench[0].id,draft:t.battingDraft??null,error:lineupError(t),again:adoptDH(t)};})()`);
 assert.equal(r.legacyOk,'');assert.notEqual(r.strict,'');assert.equal(r.changed,true);
 assert.deepEqual(r.lineup[0],{id:r.dh,pos:'DH'},'DH takes the pitcher\'s old first slot');
 assert.deepEqual(r.lineup.slice(1,9).map(x=>x.id),r.before.slice(1));
 assert.deepEqual(r.lineup[9],{id:r.before[0],pos:'P'});
 assert.equal(r.draft,null);assert.equal(r.error,'');assert.equal(r.again,false);
});

test('legacy lineups stay untouched during a live match or with no bench player',()=>{
 const live=fixture()(`(()=>{legacy(t);t.match={done:false};const before=JSON.stringify(t.lineup);return [adoptDH(t),JSON.stringify(t.lineup)===before];})()`);
 assert.deepEqual(live,[false,true]);
 const thin=fixture()(`(()=>{legacy(t);t.players=t.players.filter(p=>t.lineup.some(x=>x.id===p.id));return [adoptDH(t),lineupError(t,true),lineupError(t).includes('10명'),battingDraft(t).length,battingDraft(t)[9].pos];})()`);
 assert.deepEqual(thin,[false,'',true,10,'P']);
});

test('drafts keep the pitcher out of the batting slots and the DH off the mound',()=>{
 const r=fixture()(`(()=>{t.match=null;const d=battingDraft(t);const ok=validBattingDraft(t,d);
   const pBat=clone(d);[pBat[0].pos,pBat[9].pos]=[pBat[9].pos,pBat[0].pos];
   const twoDH=clone(d);twoDH[1].pos='DH';
   const pitcherInOrder=assignBattingSlot(t,0,d[9].id);
   return [ok,validBattingDraft(t,pBat),validBattingDraft(t,twoDH),pitcherInOrder,d.length];})()`);
 assert.deepEqual(r,[true,false,false,false,10]);
});

test('a substitute for the DH bats in the DH slot and a relief pitcher stays out of the order',()=>{
 const r=fixture()(`(()=>{const m=startAt(5);const dhIndex=t.lineup.findIndex(x=>x.pos==='DH'),bench=t.players.filter(p=>!t.lineup.some(x=>x.id===p.id));
   t.lineup[dhIndex].id=bench[0].id;t.lineup[9].id=bench[1].id;
   return [lineupError(t),t.lineup[dhIndex].pos,t.lineup.slice(0,9).some(x=>x.id===bench[1].id),pitcher(t).id===bench[1].id];})()`);
 assert.deepEqual(r,['','DH',false,true]);
});

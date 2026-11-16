const assert=require('node:assert/strict');
const M=require('../src/player-motion-v13.js');
const base={id:'same-player',hand:'우타',personality:'소심',appearance:{body:2},a:{speed:30}};
assert.deepEqual(M.identity(base),M.identity(JSON.parse(JSON.stringify(base))));
assert.equal(M.identity({...base,a:{speed:99}}).bat,M.identity(base).bat);
assert.equal(M.identity({...base,personality:'열혈'}).run,M.identity(base).run);
assert.equal(M.identity({...base,appearance:{body:5}}).bat,M.identity(base).bat);
const poses=new Set();let cases=0;
const route=[[0,0],[100,100],[0,200],[-100,100],[0,0]];for(let i=0;i<route.length;i++){const p=M.routePoint(route,i/4);assert(Math.hypot(p[0]-route[i][0],p[1]-route[i][1])<1e-8,'base contact on curve');}
for(const [action]of M.scenarios)for(const body of [0,1,2,3,4,5])for(const hand of ['우타','좌타'])for(let i=0;i<=100;i++){
 const p={...base,hand,appearance:{body}},before=JSON.stringify(p),a=M.sample(action,i/100,p);assert.equal(JSON.stringify(p),before);assert(Number.isInteger(a.pose)&&a.pose>=0&&a.pose<77);assert(['foot','hand',null].includes(a.contact));poses.add(a.pose);cases++;
}
for(const action of ['single','second','headSlide','third','return','walk','hbp'])assert.equal(M.sample(action,1,base).contact,'foot',action);
for(const action of ['tagout','forceout','lookingK','swingingK'])assert.equal(M.sample(action,1,base).contact,null,action);
assert.equal(M.sample('entry',.2,base,{home:true}).flip,true);
assert.equal(M.sample('entry',.2,{...base,hand:'좌타'},{home:false}).flip,false);
assert.equal(M.sample('bat',.2,{...base,hand:'좌타'}).flip,true);
const ids=Array.from({length:60},(_,i)=>M.identity({...base,id:'player-'+i}));assert.equal(new Set(ids.map(x=>x.bat)).size,3);assert.equal(new Set(ids.map(x=>x.run)).size,2);
console.log(JSON.stringify({cases,scenarios:M.scenarios.length,usedPoses:poses.size,stableIdentity:true,abilityIndependent:true,verdictContactChecks:true}));

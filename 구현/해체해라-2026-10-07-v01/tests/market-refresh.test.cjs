const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/extensions.js'),'utf8');
function fixture(){
 const ctx=vm.createContext({});
 vm.runInContext(`let saves=0,generated=0,blocked=false;
 const live=t=>!!(t.match&&!t.match.done),balance=()=>({hireFactor:35}),save=()=>saves++;
 const player=(initial,numbers)=>{if(blocked)throw Error('generation failed');return {id:'new-'+(++generated),number:numbers.includes(9)?10:9,a:{contact:50}};};
 const abilityPrice=()=>50;
 const t={funds:300,w:2,l:1,d:0,players:[{id:'owned',number:9}],market:[{id:'old'}],marketRound:3,ledger:[]};
 `,ctx);
 for(const name of ['ledger','spend','createMarketCandidates','refreshMarket','rerollMarket']){
  if(name==='createMarketCandidates')vm.runInContext(source.match(/^const MARKET_REFRESH_COST=.*$/m)[0],ctx);
  vm.runInContext(source.match(new RegExp('^function '+name+'\\(.*$','m'))[0],ctx);
 }
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
}
test('paid refresh replaces all candidates with three new players and charges exactly one million won',()=>{
 const r=fixture()('(()=>{const owned=JSON.stringify(t.players);const ok=rerollMarket(t);return {ok,funds:t.funds,ids:t.market.map(p=>p.id),prices:t.market.map(p=>p.price),roster:JSON.stringify(t.players)===owned,round:t.marketRound,ledger:t.ledger};})()');
 assert.equal(r.ok,true);assert.equal(r.funds,200);assert.deepEqual(r.ids,['new-1','new-2','new-3']);
 assert.deepEqual(r.prices,[1750,1750,1750]);assert.equal(r.roster,true);assert.equal(r.round,3);
 assert.equal(r.ledger.length,1);assert.equal(r.ledger[0].amount,-100);
});
test('exact funds succeed; insufficient funds and live matches preserve candidates and funds',()=>{
 for(const extra of ['t.funds=99','t.match={done:false,paused:true}','t.funds=NaN']){
  const run=fixture();assert.equal(run(`(()=>{${extra};const before=JSON.stringify(t);return !rerollMarket(t)&&before===JSON.stringify(t)&&generated===0;})()`),true);
 }
 assert.deepEqual(fixture()('(()=>{t.funds=100;return [rerollMarket(t),t.funds,t.market.length];})()'),[true,0,3]);
});
test('reopening and save roundtrip preserve paid candidates; next completed game refreshes for free',()=>{
 const r=fixture()('(()=>{rerollMarket(t);const ids=t.market.map(p=>p.id);Object.assign(t,JSON.parse(JSON.stringify(t)));refreshMarket(t);const same=JSON.stringify(ids)===JSON.stringify(t.market.map(p=>p.id));t.w++;refreshMarket(t);return [same,t.funds,t.market.map(p=>p.id),t.ledger.length,saves];})()');
 assert.deepEqual(r,[true,200,['new-4','new-5','new-6'],1,1]);
});
test('partial or empty candidate lists can refresh and every paid action charges once',()=>{
 const run=fixture();assert.deepEqual(run('(()=>{t.market=[];rerollMarket(t);rerollMarket(t);return [t.funds,t.market.map(p=>p.id),t.ledger.length];})()'),[100,['new-4','new-5','new-6'],2]);
});
test('candidate generation failure leaves the old list and funds intact',()=>{
 assert.equal(fixture()('(()=>{blocked=true;const before=JSON.stringify(t);try{rerollMarket(t);}catch{return before===JSON.stringify(t);}return false;})()'),true);
});

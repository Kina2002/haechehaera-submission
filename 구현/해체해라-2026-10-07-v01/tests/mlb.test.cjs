const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const game=readFileSync(join(__dirname,'../src/game.js'),'utf8');
const extensions=readFileSync(join(__dirname,'../src/extensions.js'),'utf8');
const source=readFileSync(join(__dirname,'../src/mlb.js'),'utf8').split('// UI integration.')[0];
function fixture(){
 let next=0;
 const ctx=vm.createContext({BALANCE:{},BALANCE_LABELS:{},COLORS:Array(14).fill(['color','#000']),CharacterRenderer:{variants:{hair:Array(7)}},
  KEYS:['contact','power','eye','speed','sense','catch','throw','velocity','control','stamina'],POS:['P','C','1B','2B','3B','SS','LF','CF','RF'],
  clone:x=>JSON.parse(JSON.stringify(x)),clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),uid:()=>`attempt-${++next}`,money:n=>n+'만원',
  selection:'p0',live:t=>!!(t.match&&!t.match.done),needsSetup:t=>t.setupStage!=='complete'});
 vm.runInContext('function balance(t){return {...BALANCE,...t?.balance};}',ctx);
 vm.runInContext(game.match(/const freshStats=\(\)=>\([^\n]+/)[0],ctx);
 vm.runInContext(game.slice(game.indexOf('function validatePlayer('),game.indexOf('\nfunction validateTeam(')),ctx);
 for(const name of ['ledger','gain','news'])vm.runInContext(extensions.match(new RegExp('function '+name+'\\([^\\n]+'))[0],ctx);
 vm.runInContext(extensions.slice(extensions.indexOf('function snapshotRoster26('),extensions.indexOf('function validVacancy26(')),ctx);
 vm.runInContext(source,ctx);
 vm.runInContext(`const t={id:'team',name:'해체',primary:11,secondary:5,setupStage:'complete',w:8,l:2,d:0,funds:3000,balance:{},players:[],lineup:[],ledger:[],news:[],departed:[]};
 for(let i=0;i<12;i++)t.players.push({id:'p'+i,name:'선수'+i,number:i,a:Object.fromEntries(KEYS.map(k=>[k,75])),appearance:{body:i%6,parts:{hair:0}},stats:{...freshStats(),games:5,h:3,ab:12},hand:'우타',tendency:'중앙',loyalty:60,contract:4,salary:100});
 t.lineup=POS.map((pos,i)=>({pos,id:'p'+i}));t.match={done:true,id:'match',result:'승리'};const p=t.players[0];`,ctx);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
}
test('MLB criteria include exact 75 / 5 boundaries and choose the stronger role',()=>{
 const run=fixture();assert.equal(run('mlbQuote(t,p.id).eligible'),true);
 assert.deepEqual(run('(()=>{p.a.velocity=90;p.a.control=90;p.a.stamina=90;return [mlbQuote(t,p.id).role,mlbQuote(t,p.id).score];})()'),['투수',90]);
 assert.equal(run('(()=>{p.stats.games=4;return mlbQuote(t,p.id).eligible;})()'),false);
 const low=fixture();assert.equal(low('(()=>{KEYS.forEach(k=>p.a[k]=74);return mlbQuote(t,p.id).eligible;})()'),false);
});
test('chance and fee scale from 35% / 5000 to 85% / 15000',()=>{
 const run=fixture();assert.deepEqual(run('[mlbQuote(t,p.id).chance,mlbQuote(t,p.id).fee]'),[.35,5000]);
 assert.deepEqual(run('(()=>{KEYS.forEach(k=>p.a[k]=100);return [mlbQuote(t,p.id).chance,mlbQuote(t,p.id).fee];})()'),[.85,15000]);
});
test('opening a quote is read only; no random draw or mutation happens',()=>{
 assert.equal(fixture()('(()=>{const before=JSON.stringify(t);mlbQuote(t,p.id);mlbQuote(t,p.id);return before===JSON.stringify(t);})()'),true);
});
test('success pays once, frees the roster slot, repairs lineup and preserves match/graduate records',()=>{
 const out=fixture()(`(()=>{const q=mlbQuote(t,p.id),result=completeMlbAttempt(t,q,()=>0);const again=completeMlbAttempt(t,q,()=>0);validateMlbState(t);return {ok:result.ok,success:result.result.success,again:again.ok,funds:t.funds,count:t.players.length,lineup:t.lineup,archive:t.mlbHistory,departed:t.departed,match:t.match,selection};})()`);
 assert.equal(out.success,true);assert.equal(out.again,false);assert.equal(out.funds,8000);assert.equal(out.count,11);
 assert.equal(new Set(out.lineup.map(x=>x.id)).size,9);assert.equal(out.lineup[0].id,'p9');assert.equal(out.lineup[0].pos,'P');
 assert.equal(out.archive.length,1);assert.equal(out.archive[0].player.stats.h,3);assert.equal(out.archive[0].seen,false);
 assert.equal(out.departed[0].departureKind,'mlb');assert.equal(out.match.completedLineup26[0].id,'p0');assert.equal(out.match.completedRoster26.length,12);assert.equal(out.selection,'p1');
});
test('ten players may transfer down to nine; nine cannot submit or roll',()=>{
 const out=fixture()(`(()=>{t.players=t.players.slice(0,10);const a=completeMlbAttempt(t,mlbQuote(t,p.id),()=>0);let draws=0;const b=completeMlbAttempt(t,mlbQuote(t,'p1'),()=>{draws++;return 0;});return [a.ok,t.players.length,b.ok,draws,t.funds];})()`);
 assert.deepEqual(out,[true,9,false,0,8000]);
});
test('failure lowers only loyalty, gives no money and refuses repeated or early attempts',()=>{
 const out=fixture()(`(()=>{const original=clone(p),q=mlbQuote(t,p.id),a=completeMlbAttempt(t,q,()=>.35);const b=completeMlbAttempt(t,q,()=>0);t.w+=2;const early=mlbQuote(t,p.id);t.w++;const ready=mlbQuote(t,p.id);validateMlbState(t);return {success:a.result.success,again:b.ok,loyalty:p.loyalty,funds:t.funds,roster:t.players.length,early:early.remaining,ready:ready.eligible,stats:p.stats,a:p.a,original};})()`);
 assert.equal(out.success,false);assert.equal(out.again,false);assert.equal(out.loyalty,40);assert.equal(out.funds,3000);assert.equal(out.roster,12);assert.equal(out.early,1);assert.equal(out.ready,true);assert.deepEqual(out.a,out.original.a);assert.deepEqual(out.stats,out.original.stats);
});
test('failure at low loyalty uses actual delta, leaves the team at zero and preserves records',()=>{
 const out=fixture()(`(()=>{p.loyalty=8;const a=completeMlbAttempt(t,mlbQuote(t,p.id),()=>.999);validateMlbState(t);return {h:a.result,count:t.players.length,funds:t.funds,left:t.departed[0],lineup:t.lineup};})()`);
 assert.equal(out.h.loyaltyBefore,8);assert.equal(out.h.loyaltyAfter,0);assert.equal(out.h.left,true);assert.equal(out.h.fee,0);assert.equal(out.count,11);assert.equal(out.funds,3000);assert.equal(out.left.stats.h,3);assert.ok(out.lineup.every(x=>x.id!=='p0'));
});
test('live, paused, expired, setup and departing players are blocked without drawing',()=>{
 for(const change of ['t.match.done=false','t.match.done=false;t.match.paused=true','p.contract=0','t.setupStage="identity"','p.exitPending26=true']){
  const out=fixture()(`(()=>{const quote=mlbQuote(t,p.id);${change};let draws=0;const result=completeMlbAttempt(t,quote,()=>{draws++;return 0;});return [result.ok,draws,t.funds,t.players.length];})()`);
  assert.deepEqual(out,[false,0,3000,12]);
 }
});
test('changed abilities, roster or settings invalidate a previously reviewed quote',()=>{
 for(const change of ['p.a.contact++','t.players.pop()','t.balance.mlbBaseFee=6000','p.loyalty--','p.name="변경"']){
  const out=fixture()(`(()=>{const quote=mlbQuote(t,p.id);${change};let draws=0;const result=completeMlbAttempt(t,quote,()=>{draws++;return 0;});return [result.ok,draws,t.funds];})()`);
  assert.deepEqual(out,[false,0,3000]);
 }
});
test('serialization preserves cooldown, unread notice and an immutable success snapshot',()=>{
 const out=fixture()(`(()=>{completeMlbAttempt(t,mlbQuote(t,p.id),()=>.99);const restored=clone(t);validateMlbState(restored);const cooldown=mlbQuote(restored,p.id).remaining;t.w+=3;const h=completeMlbAttempt(t,mlbQuote(t,p.id),()=>0).result;p.name='변경';p.a.contact=1;p.stats.h=99;const copy=clone(t);validateMlbState(copy);return {cooldown,history:copy.mlbHistory,unread:copy.mlbHistory.filter(x=>!x.seen).length};})()`);
 assert.equal(out.cooldown,3);assert.equal(out.history.length,2);assert.equal(out.history[1].player.name,'선수0');assert.equal(out.history[1].player.a.contact,75);assert.equal(out.history[1].player.stats.h,3);assert.equal(out.unread,2);
});
test('old saves without MLB fields validate without creating history',()=>{
 assert.equal(fixture()('(()=>{const before=JSON.stringify(t);validateMlbState(t);return before===JSON.stringify(t);})()'),true);
});
test('malformed archive money, duplicate graduates and invalid settings are rejected',()=>{
 for(const change of ['t.mlbHistory[0].fee=-1','t.mlbHistory.push(clone(t.mlbHistory[0]))','t.mlbHistory[0].player.appearance.parts.hair=99','t.mlbHistory[0].chance=2','t.balance.mlbRetryGames=0','t.balance.mlbBaseChance=2']){
  const out=fixture()(`(()=>{completeMlbAttempt(t,mlbQuote(t,p.id),()=>0);${change};try{validateMlbState(t);return false;}catch{return true;}})()`);assert.equal(out,true,change);
 }
});
test('invalid randomness does not partly settle an attempt',()=>{
 for(const value of ['NaN','1','-1'])assert.equal(fixture()(`(()=>{const before=JSON.stringify(t);const result=completeMlbAttempt(t,mlbQuote(t,p.id),()=>${value});return !result.ok&&before===JSON.stringify(t);})()`),true);
});
test('other save slot and already completed match snapshots stay intact',()=>{
 const out=fixture()(`(()=>{const other=clone(t);t.match.completedRoster26=[{id:'previous'}];t.match.completedLineup26=[{id:'previous',pos:'P'}];const before=JSON.stringify(other);completeMlbAttempt(t,mlbQuote(t,p.id),()=>0);return [JSON.stringify(other)===before,t.match.completedRoster26[0].id,t.match.completedLineup26[0].id,t.w,t.l,t.d];})()`);
 assert.deepEqual(out,[true,'previous','previous',8,2,0]);
});

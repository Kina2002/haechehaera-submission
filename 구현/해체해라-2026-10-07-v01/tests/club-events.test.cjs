const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');
const source=readFileSync(join(__dirname,'../src/club-events.js'),'utf8');
const end=source.indexOf('\nconst newsBeforeClubEvents=');
assert.ok(end>0);

function fixture(draws=[]){
 const context=vm.createContext({
  clone:x=>JSON.parse(JSON.stringify(x)),clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
  pick:(_,values)=>values[Math.min(draws.shift()||0,values.length-1)],
  news:(t,title,text)=>{t.news.unshift({title,text});t.news=t.news.slice(0,50);}
 });
 vm.runInContext(source.slice(0,end),context);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',context));
}
const setup=`const p={id:'player-1',name:'김해체',number:7,fans:50,loyalty:50,a:{contact:42},appearance:{body:2}};
const m={id:'match-1',done:true,score:[1,3],used:['starter']},t={primary:11,secondary:5,news:[],match:m,players:[p]};`;

test('all ten events apply the specified fan/loyalty change once and retain their actor',()=>{
 for(const [index,kind,fans,loyalty] of [[0,'autograph',18,2],[1,'litter',-22,-2],[2,'donation',25,3],[3,'ignore',-18,-3],[4,'gift',20,2],[5,'bench-song',0,3],[6,'lost-child',20,0],[7,'flat-interview',-12,0],[8,'youth-lesson',18,0],[9,'concession-cut',-15,0]]){
  const result=fixture()(`(()=>{${setup}if(${index}===7)m.used.push(p.id);const event=applyClubEvent(t,m,p,${index});const again=applyClubEvent(t,m,p,${index});return {p,t,event,same:event===again};})()`);
  assert.equal(result.event.kind,kind);assert.equal(result.event.fans,fans);assert.equal(result.event.loyalty,loyalty);
  assert.equal(result.p.fans,50+fans);assert.equal(result.p.loyalty,50+loyalty);
  assert.equal(result.event.actor.id,'player-1');assert.equal(result.event.primary,11);assert.equal(result.event.secondary,5);
  assert.equal(result.t.news.length,1);assert.equal(result.event.seen,false);assert.equal(result.same,true);
 }
});
test('displayed losses use actual clamped deltas and preserve the departure flag',()=>{
 const result=fixture()(`(()=>{${setup}p.fans=3;p.loyalty=1;return {event:applyClubEvent(t,m,p,1),p};})()`);
 assert.equal(result.event.fans,-3);assert.equal(result.event.loyalty,-1);
 assert.deepEqual(result.event.before,{fans:3,loyalty:1});assert.deepEqual(result.event.after,{fans:0,loyalty:0});
 assert.equal(result.p.exitPending26,true);
});
test('displayed gains stop at loyalty 100',()=>{
 const event=fixture()(`(()=>{${setup}p.loyalty=99;return applyClubEvent(t,m,p,2);})()`);
 assert.equal(event.loyalty,1);assert.equal(event.after.loyalty,100);
});
test('save/load retains unread events and acknowledging marks both deserialized copies',()=>{
 const result=fixture()(`(()=>{${setup}applyClubEvent(t,m,p,0);const saved=clone(t),pending=pendingClubEvent(saved);markClubEventSeen(saved,pending);return {before:!!pending,after:pendingClubEvent(saved)||null,match:saved.match.clubEvent,news:saved.news[0].clubEvent};})()`);
 assert.equal(result.before,true);assert.equal(result.after,null);
 assert.equal(result.match.seen,true);assert.equal(result.news.seen,true);
});
test('actor snapshot survives renaming/departure and replay cannot reapply changes',()=>{
 const result=fixture()(`(()=>{${setup}const event=applyClubEvent(t,m,p,4);const before=[p.fans,p.loyalty];p.name='변경';p.appearance.body=5;markClubEventSeen(t,event);markClubEventSeen(t,event);return {event,before,after:[p.fans,p.loyalty]};})()`);
 assert.equal(result.event.actor.name,'김해체');assert.equal(result.event.actor.appearance.body,2);
 assert.deepEqual(result.before,result.after);
});
test('legacy news without animation data stays readable and does not create phantom notifications',()=>{
 const result=fixture()(`(()=>{${setup}t.news=[{title:'이전 소식',text:'팬 +18'},{clubEvent:{kind:'unknown',seen:false}}];return pendingClubEvent(t)||null;})()`);
 assert.equal(result,null);
});
test('event phases advance from arrival to action to response at fixed boundaries',()=>{
 const result=fixture()('[0,1499,1500,4399,4400,6600].map(clubEventScenePhase)');
 assert.deepEqual(result,[0,0,1,1,2,2]);
});

test('bench song excludes starters and every substitute, including players already taken out',()=>{
 const result=fixture()(`(()=>{${setup}
 const sub={...p,id:'sub'},bench={...p,id:'bench'};m.used=[p.id,sub.id];t.lineup=[{id:sub.id}];
 return [p,sub,bench].map(x=>clubEventEligible(x,m,CLUB_EVENT_TYPES[5]));})()`);
 assert.deepEqual(result,[false,false,true]);
});
test('interview needs a completed loss and actual participation',()=>{
 const result=fixture()(`(()=>{${setup}m.used=[p.id];return [[2,1],[2,2],[1,2]].map(score=>{m.score=score;return clubEventEligible(p,m,CLUB_EVENT_TYPES[7]);}).concat((m.done=false,clubEventEligible(p,m,CLUB_EVENT_TYPES[7])),(m.done=true,m.used=[],clubEventEligible(p,m,CLUB_EVENT_TYPES[7])));})()`);
 assert.deepEqual(result,[false,false,true,false,false]);
});
test('missing participation data never invents a bench or interview story',()=>{
 for(const used of ['undefined','[]']){
  const result=fixture()(`(()=>{${setup}m.used=${used};return [5,7].map(i=>applyClubEvent(t,m,p,i)).concat([t.news.length,p.fans,p.loyalty]);})()`);
  assert.deepEqual(result,[null,null,0,50,50]);
 }
});
test('random selection draws only eligible stories and eligible players',()=>{
 const bench=fixture([5,0])(`(()=>{${setup}const starter={...p,id:'starter'};t.players=[starter,p];return rollClubEvent(t,m);})()`);
 assert.equal(bench.kind,'bench-song');assert.equal(bench.playerId,'player-1');
 const interview=fixture([7,0])(`(()=>{${setup}t.players.push({...p,id:'starter'});return rollClubEvent(t,m);})()`);
 assert.equal(interview.kind,'flat-interview');assert.equal(interview.playerId,'starter');
 const win=fixture([99,0])(`(()=>{${setup}m.score=[3,1];return rollClubEvent(t,m);})()`);
 assert.equal(win.kind,'concession-cut');
 const noBench=fixture([99,0])(`(()=>{${setup}m.used=[p.id];m.score=[3,1];return rollClubEvent(t,m);})()`);
 assert.equal(noBench.kind,'concession-cut');
});
test('departing or unavailable players cannot receive a new event and an empty pool is safe',()=>{
 const result=fixture()(`(()=>{${setup}p.exitPending26=true;const first=rollClubEvent(t,m);delete p.exitPending26;p.loyalty=0;const second=rollClubEvent(t,m);t.players=[];return [first,second,rollClubEvent(t,m),t.news.length];})()`);
 assert.deepEqual(result,[null,null,null,0]);
});

test('five story events have four timed shots; original five keep their timing',()=>{
 const run=fixture();
 for(const kind of ['bench-song','lost-child','flat-interview','youth-lesson','concession-cut']){
  const result=run(`(()=>{const e={kind:'${kind}'};return [clubEventDuration(e),clubEventSceneEnd(e),[0,2199,2200,4799,4800,7399,7400,10000].map(ms=>clubEventScenePhase(ms,e)),clubEventDefinition(e).shots.length];})()`);
  assert.deepEqual(result,[10000,7400,[0,0,1,1,2,2,3,3],4]);
 }
 assert.deepEqual(run("[clubEventDuration({kind:'autograph'}),clubEventPhaseCount({kind:'autograph'}),clubEventSceneEnd({kind:'autograph'})]"),[6600,3,4400]);
});

test('companions preserve the actual teammates without aliasing saved players',()=>{
 const result=fixture()(`(()=>{${setup}t.players.push({...clone(p),id:'friend',name:'동료'});const e=applyClubEvent(t,m,p,5);t.players[1].name='변경';return [e.companions.length,e.companions[0].name,e.companions.some(x=>x.id===p.id)];})()`);
 assert.deepEqual(result,[1,'동료',false]);
});

test('only selected candidates exist; rejected cup, rhythm and photo stories are absent',()=>{
 const kinds=fixture()('CLUB_EVENT_TYPES.map(x=>x.id)');
 assert.equal(kinds.length,10);assert.equal(new Set(kinds).size,10);
 assert.ok(kinds.includes('youth-lesson')&&kinds.includes('concession-cut'));
 assert.ok(!kinds.some(x=>/cup|rhythm|photo/.test(x)));
});

const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');
const source=readFileSync(join(__dirname,'../src/club-events.js'),'utf8');
const end=source.indexOf('\nconst newsBeforeClubEvents=');
assert.ok(end>0);

function fixture(){
 const context=vm.createContext({
  clone:x=>JSON.parse(JSON.stringify(x)),clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
  news:(t,title,text)=>{t.news.unshift({title,text});t.news=t.news.slice(0,50);}
 });
 vm.runInContext(source.slice(0,end),context);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',context));
}
const setup=`const p={id:'player-1',name:'김해체',number:7,fans:50,loyalty:50,a:{contact:42},appearance:{body:2}};
const m={id:'match-1'},t={primary:11,secondary:5,news:[],match:m};`;

test('all five events apply the specified fan/loyalty change once and retain their actor',()=>{
 for(const [index,kind,fans,loyalty] of [[0,'autograph',18,2],[1,'litter',-22,-2],[2,'donation',25,3],[3,'ignore',-18,-3],[4,'gift',20,2]]){
  const result=fixture()(`(()=>{${setup}const event=applyClubEvent(t,m,p,${index});const again=applyClubEvent(t,m,p,${index});return {p,t,event,same:event===again};})()`);
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

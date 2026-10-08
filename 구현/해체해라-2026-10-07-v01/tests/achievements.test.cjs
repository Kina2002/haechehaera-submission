const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const source=readFileSync(join(__dirname,'../src/achievements.js'),'utf8').split('// UI integration.')[0];
function fixture(){
 const ctx=vm.createContext({live:t=>!!(t.match&&!t.match.done),FACILITIES:Array.from({length:14},(_,i)=>['f'+i])});
 vm.runInContext(source,ctx);
 vm.runInContext("let t={id:'club',w:0,l:0,d:0,funds:3000,trophies:0,players:[{id:'p1',stats:{h:0,hr:0}}],departed:[],facilities:[],mlbHistory:[]};",ctx);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
}
test('new club has 42 goals and no instant achievements',()=>{
 assert.deepEqual(fixture()('(()=>{const a=syncAchievements(t,100);return [ACHIEVEMENTS.length,a.changed,a.added.length,t.achievements.version];})()'),[42,true,0,1]);
});
test('every goal unlocks at its threshold, not one below',()=>{
 const defs=fixture()('ACHIEVEMENTS.filter(d=>ORIGINAL_ACHIEVEMENT_IDS.has(d.id))');
 for(const d of defs){
  const set=n=>d.metric==='games'?`t.l=${n}`:d.metric==='wins'?`t.w=${n}`:d.metric==='hits'?`t.players[0].stats.h=${n}`:d.metric==='homers'?`t.players[0].stats.hr=${n}`:d.metric==='facilities'?`t.facilities=Array.from({length:${n}},(_,i)=>'f'+i)`:`t.mlbHistory=Array.from({length:${n}},(_,i)=>({success:true,player:{id:'m'+i,stats:{h:0,hr:0}}}))`;
  const run=fixture();
  assert.equal(run(`(()=>{${set(d.target-1)};syncAchievements(t,100);return t.achievements.unlocked.some(x=>x.id==='${d.id}');})()`),false,d.id+' below');
  assert.equal(run(`(()=>{${set(d.target)};syncAchievements(t,101);return t.achievements.unlocked.some(x=>x.id==='${d.id}');})()`),true,d.id+' exact');
 }
});
test('draws and losses count for participation but never wins',()=>{
 assert.deepEqual(fixture()('(()=>{t.l=5;t.d=5;syncAchievements(t,100);return t.achievements.unlocked.map(x=>x.id);})()'),['games-1','games-10','losses-1']);
});
test('first victory unlocks both badges in one batch without changing resources',()=>{
 const out=fixture()('(()=>{syncAchievements(t,90);t.w=1;t.trophies=1;const before=JSON.stringify(t);const a=syncAchievements(t,100);const after={...t};delete after.achievements;const original=JSON.parse(before);delete original.achievements;return [a.added.map(x=>x.id),JSON.stringify(after)===JSON.stringify(original),a.added.every(x=>!x.retroactive)];})()');
 assert.deepEqual(out,[['games-1','wins-1'],true,true]);
});
test('old saves backfill with recognition date and no guessed historical date',()=>{
 const out=fixture()('(()=>{t.w=100;const a=syncAchievements(t,12345);validateAchievementState(t);return [a.added.length,a.added.every(x=>x.retroactive&&x.at===12345&&x.atGame===100&&!x.seen)];})()');
 assert.deepEqual(out,[7,true]);
});
test('personal goals use one player, not club sums',()=>{
 assert.deepEqual(fixture()('(()=>{t.players=[{id:"a",stats:{h:60,hr:6}},{id:"b",stats:{h:60,hr:6}}];syncAchievements(t,100);return t.achievements.unlocked;})()'),[]);
});
test('departed players and MLB snapshots keep personal goals available',()=>{
 assert.deepEqual(fixture()('(()=>{t.departed=[{id:"left",stats:{h:100,hr:0}}];t.mlbHistory=[{success:true,player:{id:"mlb",stats:{h:10,hr:10}}}];syncAchievements(t,100);return t.achievements.unlocked.map(x=>x.id);})()'),['hits-100','homers-10','mlb-1']);
});
test('MLB failures and duplicate graduates do not inflate progress',()=>{
 assert.equal(fixture()('(()=>{t.mlbHistory=[{success:false,player:{id:"a"}},{success:true,player:{id:"b"}},{success:true,player:{id:"b"}}];return achievementMetrics(t).mlb;})()'),1);
});
test('facilities count only distinct supported buildings',()=>{
 assert.equal(fixture()('(()=>{t.facilities=["f0","f0","unknown"];return achievementMetrics(t).facilities;})()'),1);
});
test('unfinished and paused games cannot unlock achievements from live stats',()=>{
 const run=fixture();assert.equal(run('(()=>{t.match={done:false,paused:true};t.players[0].stats.hr=10;syncAchievements(t,100);return t.achievements===undefined;})()'),true);
 assert.deepEqual(run('(()=>{t.match.done=true;t.l=1;syncAchievements(t,101);return t.achievements.unlocked.map(x=>x.id);})()'),['games-1','homers-10','losses-1']);
});
test('repeat scans preserve dates and acknowledged status; new badges stay unread',()=>{
 const out=fixture()('(()=>{t.w=1;syncAchievements(t,100);acknowledgeAchievements(t,["games-1"]);t.w=10;syncAchievements(t,200);syncAchievements(t,300);return [t.achievements.unlocked.length,t.achievements.unlocked[0].at,pendingAchievements(t).map(x=>x.id)];})()');
 assert.deepEqual(out,[4,100,['wins-1','games-10','wins-10']]);
});
test('unlocked badges persist even if the source record is later unavailable',()=>{
 const out=fixture()('(()=>{t.players[0].stats.h=100;syncAchievements(t,100);t.players=[];syncAchievements(t,200);return t.achievements.unlocked.map(x=>x.id);})()');assert.deepEqual(out,['hits-100']);
});
test('JSON roundtrip preserves unread status, recognition metadata and no extra unlocks',()=>{
 assert.deepEqual(fixture()('(()=>{t.w=10;syncAchievements(t,100);acknowledgeAchievements(t,["games-1"]);t=JSON.parse(JSON.stringify(t));validateAchievementState(t);return [syncAchievements(t,200).changed,pendingAchievements(t).length,t.achievements.unlocked[0].seen];})()'),[false,3,true]);
});
test('other save slot is untouched',()=>{
 assert.equal(fixture()('(()=>{const other=JSON.parse(JSON.stringify(t)),before=JSON.stringify(other);t.w=100;syncAchievements(t,100);return before===JSON.stringify(other);})()'),true);
});
test('legacy validation is read only and invalid achievements are rejected',()=>{
 assert.equal(fixture()('(()=>{const before=JSON.stringify(t);validateAchievementState(t);return before===JSON.stringify(t);})()'),true);
 for(const change of ['t.achievements=null','t.achievements.version=2','t.achievements.unlocked={}','t.achievements.unlocked.push(t.achievements.unlocked[0])','t.achievements.unlocked[0].id="unknown"','t.achievements.unlocked[0].at=-1','t.achievements.unlocked[0].at=9000000000000000','t.achievements.unlocked[0].atGame=1.5','t.achievements.unlocked[0].seen="yes"','t.achievements.unlocked[0].retroactive=0']){
  assert.equal(fixture()(`(()=>{t.w=1;syncAchievements(t,100);${change};try{validateAchievementState(t);return false;}catch{return true;}})()`),true,change);
 }
});

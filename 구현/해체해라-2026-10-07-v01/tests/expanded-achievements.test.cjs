const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const game=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8');
const ext=fs.readFileSync(path.join(__dirname,'../src/extensions.js'),'utf8');
const achievements=fs.readFileSync(path.join(__dirname,'../src/achievements.js'),'utf8');
function fixture(){
 const ctx=vm.createContext({Math,crypto:{randomUUID},location:{hash:''},performance:{now:()=>0},document:{documentElement:{hasAttribute:()=>true}},window:{addEventListener:()=>{}},GameStorage:{create:()=>({})},restoreAbilities:()=>{},shiftLead:null,FACILITIES:[]});
 vm.runInContext(game.slice(0,game.indexOf('\nfunction rect(')),ctx);
 vm.runInContext(game.match(/^function recordRecap\(.*$/m)[0],ctx);
 vm.runInContext(`const t=newTeam('우리',11,5),o=newTeam('상대',8,4);data.slots=[t,null];data.current=0;activeGame=true;let serial=0;
 for(const tm of [t,o])for(const p of tm.players){p.a=Object.fromEntries([...KEYS,'stamina'].map(k=>[k,50]));p.name='선수'+p.number;}
 function match(){const m={id:'badge-match-'+(++serial),opp:o,home:1,inning:1,half:0,outs:0,balls:0,strikes:0,bases:[null,null,null],score:[0,0],hits:[0,0],errors:[0,0],order:[0,0],last:[null,null],innings:[Array(7).fill(0),Array(7).fill(0)],paPitches:0,pitches:0,bh:[0,0],bhBase:[0,0],bhBaseUsed:[0,0],opportunities:[0,0],events:[],rng:20261008,done:false,rewarded:false,lastLines:{},reactionCount:0,recap:{box:{},highlights:[],events:0},used:t.lineup.map(x=>x.id),subs:[],checks:{events:0,violations:[],motions:0,reactions:0},defense:{side:1,depth:1}};t.match=m;return m;}
 function event(m,opts={}){const p=t.players[0],e={id:m.id+':'+m.events.length,inning:1,half:0,attack:0,batter:p.id,batterName:p.name,batterNumber:p.number,bh:0,bhSide:null,bhActors:[],runs:[],hit:0,pa:false,ab:false,type:'single',text:'검사',before:{score:m.score.slice()},after:{score:m.score.slice()},...opts};recordRecap(m,e);m.events.push(e);m.score=e.after.score.slice();return e;}
 function finish(m,score=m.score){m.score=score;m.done=true;reward(m);save();return t.achievements.unlocked.map(x=>x.id);}
 function has(id){return !!t.achievements?.unlocked.some(x=>x.id===id);}
 `,ctx);
 vm.runInContext(ext.match(/^function substitute\(.*$/m)[0],ctx);
 vm.runInContext(ext.match(/^const live=.*$/m)[0],ctx);
 vm.runInContext(achievements.slice(0,achievements.indexOf('const navBeforeAchievements')),ctx);
 vm.runInContext('syncAchievements(t,100);',ctx);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
}
test('catalog has 42 unique badges and excludes mercy victory and unrequested relief badge',()=>{
 const r=fixture()('ACHIEVEMENTS');assert.equal(r.length,42);assert.equal(new Set(r.map(d=>d.id)).size,42);
 assert.equal(r.some(d=>['퇴근시켜 드립니다','불 끄러 왔습니다','내가 키웠다'].includes(d.title)),false);
});
test('each of ten abilities needs actual owned permanent 100, not 99 or a market preview',()=>{
 for(const key of ['contact','power','eye','speed','sense','catch','throw','velocity','control','stamina']){
  const run=fixture();assert.deepEqual(run(`(()=>{t.market=[{a:{${key}:100}}];t.players[0].a.${key}=99;syncAchievements(t);const below=has('stat-${key}-100');t.players[0].a.${key}=100;t.players[0].energy=0;syncAchievements(t);const h=t.achievements.unlocked.find(x=>x.id==='stat-${key}-100');return [below,!!h,h.proof.playerName===t.players[0].name];})()`),[false,true,true]);
 }
 const run=fixture();assert.deepEqual(run("(()=>{const p={id:'signed',name:'영입 선수',number:77,a:{power:100},stats:{}};t.players.push(p);syncAchievements(t);t.players.pop();syncAchievements(t);return [has('stat-power-100'),t.achievements.unlocked.find(h=>h.id==='stat-power-100').proof.playerName];})()"),[true,'영입 선수']);
});
test('single-game three hits count HR and a losing/drawn/mercy match, never combine players',()=>{
 for(const score of [[3,4],[3,3],[1,11]]){
  const r=fixture()(`(()=>{const m=match();m.mercy=${score[1]===11?'{inning:3,margin:10}':'null'};for(let i=0;i<3;i++)event(m,{hit:i===2?4:1,pa:true,ab:true});finish(m,${JSON.stringify(score)});return t.achievements.unlocked.find(x=>x.id==='game-hits-3').proof;})()`);assert.equal(r.detail,'3안타');assert.deepEqual(r.score,score);
 }
 assert.equal(fixture()("(()=>{const m=match();event(m,{hit:1,pa:true});event(m,{hit:1,pa:true});event(m,{hit:1,pa:true,batter:t.players[1].id});event(m,{pa:true,type:'bb'});finish(m,[2,1]);return has('game-hits-3');})()"),false);
});
test('three-hit badge waits for complete game and survives detailed event trimming',()=>{
 assert.deepEqual(fixture()("(()=>{const m=match();for(let i=0;i<3;i++)event(m,{hit:1,pa:true});save();const live=has('game-hits-3');m.events=[];finish(m,[2,1]);return [live,has('game-hits-3')];})()"),[false,true]);
});
test('comeback requires recorded three-run deficit and a final win',()=>{
 for(const [gap,win,expected]of [[2,true,false],[3,true,true],[6,true,true],[3,false,false]]){
  assert.equal(fixture()(`(()=>{const m=match();event(m,{attack:1,after:{score:[0,${gap}]},runs:['r']});event(m,{before:{score:[0,${gap}]},after:{score:[${gap+1},${gap}]},hit:4,runs:['r']});finish(m,${win?`[${gap+1},${gap}]`:`[${gap+1},${gap+2}]`});return has('comeback-3');})()`),expected);
 }
});
test('bonehead victory counts our own three mistakes and still requires a win',()=>{
 for(const [counts,score,expected]of [[[2,9],[4,1],false],[[3,0],[4,1],true],[[4,0],[1,4],false]])assert.equal(fixture()(`(()=>{const m=match();m.bh=${JSON.stringify(counts)};finish(m,${JSON.stringify(score)});return has('bonehead-win-3');})()`),expected);
});
test('redemption matches the earlier actor, accepts HR, rejects other actor and same-play mistake',()=>{
 for(const [same,expected]of [[true,true],[false,false]])assert.equal(fixture()(`(()=>{const m=match();event(m,{bh:8,bhSide:0,bhActors:[${same?'t.players[0].id':'t.players[1].id'}]});event(m,{hit:4,pa:true,runs:['r'],after:{score:[1,0]}});finish(m);return has('bonehead-redemption');})()`),expected);
 assert.equal(fixture()("(()=>{const m=match();event(m,{bh:1,bhSide:0,bhActors:[t.players[0].id],hit:1,pa:true,runs:['r'],after:{score:[1,0]}});finish(m);return has('bonehead-redemption');})()"),false);
});
test('go-ahead hit loses decisive status on a later tie; walk or another player does not redeem',()=>{
 for(const mode of ['tie','walk','later'])assert.equal(fixture()(`(()=>{const m=match();${mode==='later'?'':'event(m,{bh:8,bhSide:0,bhActors:[t.players[0].id]});'}event(m,{hit:${mode==='walk'?0:1},pa:true,runs:['r'],after:{score:[1,0]}});${mode==='tie'?'event(m,{attack:1,before:{score:[1,0]},after:{score:[1,1]},runs:["r"]});event(m,{batter:t.players[1].id,hit:1,pa:true,before:{score:[1,1]},after:{score:[2,1]},runs:["r"]});':''}${mode==='later'?'event(m,{bh:8,bhSide:0,bhActors:[t.players[0].id]});':''}finish(m);return has('bonehead-redemption');})()`),false);
});
test('real substitute metadata recognizes only pinch hitter first plate appearance',()=>{
 for(const [mode,expected]of [['hit',true],['hr',true],['second',false],['defense',false],['runner',false]]){
  assert.equal(fixture()(`(()=>{const m=match(),out=batter(m).id,p=t.players.find(p=>!m.used.includes(p.id));${mode==='defense'?'m.half=1;':''}${mode==='runner'?'m.bases[0]=out;':''}const error=substitute(t,out,p.id);if(error)throw Error(error);${mode==='second'?'event(m,{batter:p.id,pa:true,type:"bb"});':''}event(m,{batter:p.id,batterName:p.name,batterNumber:p.number,hit:${mode==='hr'?4:1},pa:true,runs:['r'],after:{score:[1,0]}});finish(m);return has('pinch-winner');})()`),expected,mode);
 }
});
test('draws preserve three/five/ten streaks; opposite results reset current streak',()=>{
 const r=fixture()("(()=>{for(let i=0;i<10;i++){finish(match(),[1,0]);if(i===1)finish(match(),[0,0]);}const a=[3,5,10].map(n=>has('winStreak-'+n));finish(match(),[0,1]);for(let i=0;i<9;i++){if(i===1)finish(match(),[0,0]);finish(match(),[0,1]);}const b=[3,5,10].map(n=>has('lossStreak-'+n));finish(match(),[1,0]);return [a,b,t.achievementStreaks.win,t.achievementStreaks.loss,has('break-losses-3')];})()");assert.deepEqual(r,[[true,true,true],[true,true,true],1,0,true]);
});
test('persistent streak survives shortened history and JSON roundtrip; reward is idempotent',()=>{
 assert.deepEqual(fixture()("(()=>{for(let i=0;i<10;i++){const m=match();finish(m,[1,0]);const before=[t.w,t.coins,t.achievements.unlocked.length];reward(m);if(before.join()!==[t.w,t.coins,t.achievements.unlocked.length].join())throw Error('duplicate reward');t.history=t.history.slice(0,1);Object.assign(t,JSON.parse(JSON.stringify(t)));validateAchievementState(t);}return [t.achievementStreaks.bestWin,has('winStreak-10')];})()"),[10,true]);
});
test('loss streak break needs three defeats; ties and two defeats are insufficient',()=>{
 for(const [n,expected]of [[2,false],[3,true]])assert.equal(fixture()(`(()=>{for(let i=0;i<${n};i++)finish(match(),[0,1]);finish(match(),[0,0]);finish(match(),[1,0]);return has('break-losses-3');})()`),expected);
});
test('mercy-loss badge needs the actual recorded mercy ending, not a large normal loss',()=>{
 for(const [score,mercy,expected]of [[[0,10],null,false],[[0,10],{inning:3,margin:10},true],[[10,0],{inning:3,margin:10},false]])assert.equal(fixture()(`(()=>{const m=match();m.mercy=${JSON.stringify(mercy)};finish(m,${JSON.stringify(score)});return has('mercy-loss-1');})()`),expected);
});
test('old v1 badges remain seen with their date; only provable new facts are recognized',()=>{
 assert.deepEqual(fixture()("(()=>{t.achievements={version:1,unlocked:[{id:'wins-1',at:12,atGame:1,seen:true,retroactive:false}]};t.l=10;t.history=[];syncAchievements(t,999);validateAchievementState(t);return [t.achievements.unlocked[0].at,t.achievements.unlocked[0].seen,has('losses-10'),has('lossStreak-10'),t.achievements.unlocked.find(h=>h.id==='losses-10').retroactive];})()"),[12,true,true,false,true]);
});
test('locked cards hide conditions/progress/tier and earned evidence escapes player text',()=>{
 const r=fixture()("(()=>{const def=ACHIEVEMENTS.find(d=>d.id==='stat-contact-100'),locked=achievementCard(def,t,achievementMetrics(t));t.players[0].a.contact=100;t.players[0].name='<img onerror=bad>';syncAchievements(t);const earned=achievementCard(def,t,achievementMetrics(t));return [locked.includes(def.title),locked.includes(def.goal),locked.includes('<progress'),locked.includes('<small>I</small>'),earned.includes(def.goal),earned.includes('&lt;img'),earned.includes('<img')];})()");assert.deepEqual(r,[true,false,false,false,true,true,false]);
});
test('invalid streak/evidence/match records fail backup validation',()=>{
 for(const edit of ["t.achievementStreaks.win=-1","t.achievementStreaks.loss=1","t.achievements.unlocked[0].proof={score:[-1,0]}","t.history[0].achievementStats.failedIds=[7]","t.history[0].achievementStats.leadHit={eventId:'x'}"]){assert.equal(fixture()(`(()=>{finish(match(),[1,0]);${edit};try{validateAchievementState(t);return false;}catch{return true;}})()`),true,edit);}
});

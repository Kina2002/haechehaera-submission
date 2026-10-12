const {test}=require('node:test');
const assert=require('node:assert/strict');
const rules=require('../src/tutorial.js');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

test('tutorial progress is versioned, portable and rejects invalid optional state',()=>{
 const s=rules.create();assert.deepEqual(rules.normalize(JSON.parse(JSON.stringify(s))),s);
 for(const change of [{version:2},{status:'yes'},{step:'random'},{matchId:99},{defenseSeen:1}])assert.equal(rules.normalize({...s,...change}),null);
 assert.equal(rules.normalize(null),null);
});
test('new team preparation needs real lineup action before match start',()=>{
 const c={active:true,screen:'setup',live:false,blocked:false},s=rules.create();
 assert.equal(rules.scene(s,c),null);c.screen='lineup';assert.equal(rules.scene(s,c),'lineup');
 s.step='start';assert.equal(rules.scene(s,c),'start');c.screen='home';assert.equal(rules.scene(s,c),'start');
 s.step='lineup-manual';c.screen='lineup';assert.equal(rules.scene(s,c),'manual');c.done=true;assert.equal(rules.scene(s,c),'manual');c.screen='home';assert.equal(rules.scene(s,c),null);
});
test('a defensive opening waits for our offense after one defensive instruction',()=>{
 const s=rules.create('batting'),c={active:true,screen:'match',live:true,ready:true,attack:1};
 assert.equal(rules.scene(s,c),'defense');s.defenseSeen=true;assert.equal(rules.scene(s,c),null);
 c.attack=0;assert.equal(rules.scene(s,c),'batting');
 c.auto=true;assert.equal(rules.scene(s,c),null);c.auto=false;assert.equal(rules.scene(s,c),'batting');
});
test('entrance, live animation, dialogs and inactive saves never show a coach card',()=>{
 const s=rules.create('mode'),c={active:true,screen:'match',live:true,ready:true,attack:0};
 assert.equal(rules.scene(s,c),'mode');
 for(const change of [{blocked:true},{ready:false},{active:false},{screen:'slots'}])assert.equal(rules.scene(s,{...c,...change}),null);
});
test('skipping a match before batting guidance still leads to post-match operations',()=>{
 const s=rules.create('batting'),c={active:true,screen:'result',done:true,live:false};
 assert.equal(rules.scene(s,c),'result');c.screen='home';assert.equal(rules.scene(s,c),'home');
 for(const status of ['completed','skipped'])assert.equal(rules.scene({...s,status},c),null);
});

// Load the actual browser integration with a small DOM, then exercise its real wrappers.
function integration(){
 const nodes={},events={},winEvents={},created=[];
 const element=()=>({style:{},innerHTML:'',remove(){},contains:()=>false,focus(){},scrollIntoView(){},insertAdjacentHTML(){},matches:()=>false,querySelectorAll:()=>[],getBoundingClientRect:()=>({left:100,top:100,right:300,bottom:160,width:200,height:260})});
 const doc={hidden:false,documentElement:{clientWidth:1200},activeElement:null,body:{append:()=>{}},
  createElement:()=>{const e={...element(),querySelector:()=>element()};created.push(e);return e;},querySelector:s=>nodes[s]||null,querySelectorAll:()=>[],addEventListener:(type,fn)=>{(events[type]??=[]).push(fn);}};
 const ctx=vm.createContext({Math,performance:{now:()=>123},document:doc,module:undefined});
 ctx.window=ctx;ctx.globalThis=ctx;ctx.innerHeight=900;ctx.addEventListener=(type,fn)=>{(winEvents[type]??=[]).push(fn);};
 vm.runInContext(`let data={slots:[]},activeGame=false,screen='slots',lastFrame=0,anim=null,reaction=null,shiftLead=null,waitMs=0,entrance=null,clubEventView=null,mlbDialog=null,achievementNotice=null,skipJob=null,t=null,saves=0,ticks=0;
  const $=s=>document.querySelector(s),team=()=>t,attack=m=>m.side,esc=s=>s,clone=x=>JSON.parse(JSON.stringify(x));
  const POS=['P','C','1B','2B','3B','SS','LF','CF','RF'],STATS={contact:'컨택',power:'파워',eye:'선구안',velocity:'구속',control:'제구'};
  const needsSetup=x=>x.setupStage!=='complete',lineupError=x=>new Set(x.lineup.map(s=>s.id)).size===9?'':'invalid';
  const pitcher=x=>x.pitcher,batter=m=>m.side===0?t.currentBatter:m.opp.batter;
  function save(){saves++}function render(){}function tick(){ticks++;if(t?.match&&!t.match.paused){t.match.inputLeft--;t.match.rng++;t.match.pitches++;}}function go(s){screen=s;render()}
  function newTeam(name,a,b,defer){const players=Array.from({length:12},(_,i)=>({id:'p'+i,name:'선수'+i,number:i,a:{contact:20+i,power:40+i,eye:50+i,velocity:60+i,control:70+i,stamina:50},energy:50}));return {name,match:null,defer,players,lineup:players.slice(0,9).map((p,i)=>({id:p.id,pos:POS[i]})),setupStage:'lineup',pitcher:players[0],currentBatter:players[1]}}
  function validateTeam(){}function autoAssignLineup(x){return x.invalid?'invalid':''}
  function startMatch(){}function subDialog(){}
  function commitInstruction(m,kind,value,fn){if(m.paused||m.auto)return false;if(kind==='attack'&&m.side!==0||kind==='defense'&&m.side!==1)return false;fn();return true}
 `,ctx);
 const game=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8');
 vm.runInContext(game.split('\n').filter(line=>/^function (validBattingDraft|battingDraft|assignBattingSlot|commitBattingDraft)\(/.test(line)).join('\n'),ctx);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/tutorial.js'),'utf8'),ctx);
 const run=code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
 const click=a=>winEvents.click[0]({target:{closest:()=>({dataset:{tutorial:a}})},preventDefault(){},stopImmediatePropagation(){}});
 const gameClick=action=>{let stopped=false;winEvents.click[0]({target:{closest:()=>({dataset:{action},disabled:false,matches:s=>s.includes('"'+action+'"')})},preventDefault(){},stopImmediatePropagation(){stopped=true;}});return stopped;};
 return {run,click,gameClick,target:s=>nodes[s]=element(),html:()=>created.at(-1)?.innerHTML};
}
test('automatic activation only belongs to newly created player saves',()=>{
 const {run}=integration();assert.equal(run('newTeam("new",1,2,true).tutorial28.status'),'active');
 assert.equal(run('Boolean(newTeam("bot",1,2,false).tutorial28)'),false);
 assert.equal(run('(t={name:"old"},validateTeam(t),Boolean(t.tutorial28))'),false);
 assert.equal(run('(t.tutorial28={version:99},validateTeam(t),Boolean(t.tutorial28))'),false);
});
test('failed auto assignment does not advance; successful assignment does',()=>{
 const {run}=integration();run('(t=newTeam("test",1,2,true),true)');
 assert.equal(run('(t.invalid=true,autoAssignLineup(t),t.tutorial28.step)'),'lineup');
 assert.equal(run('(t.invalid=false,autoAssignLineup(t),t.tutorial28.step)'),'start');
});
test('successful real commands advance and failed commands leave the lesson pending',()=>{
 const {run,click}=integration();run('(t=newTeam("test",1,2,true),t.tutorial28.step="batting",t.tutorial28.matchId="m",t.match={id:"m",side:1,paused:false,auto:false},true)');
 assert.equal(run('(commitInstruction(t.match,"attack","contact",()=>{}),t.tutorial28.defenseSeen)'),false);
 assert.equal(run('(commitInstruction(t.match,"defense",{},()=>{}),t.tutorial28.defenseSeen)'),true);
 assert.equal(run('t.tutorial28.step'),'player-info');click('choose');
 assert.equal(run('(t.match.side=0,commitInstruction(t.match,"attack","contact",()=>{}),t.tutorial28.step)'),'substitution');
});
test('direct selection keeps nine-player draft controls free until the user starts the game',()=>{
 const {run,click,gameClick}=integration();run('(t=newTeam("manual",1,2,true),activeGame=true,screen="lineup",true)');
 click('manual');assert.equal(run('t.tutorial28.step'),'lineup-manual');assert.equal(gameClick('lineup-assign'),false);
 run('(()=>{for(let i=0;i<8;i++)assignBattingSlot(t,i,t.players[11-i].id);return true;})()');
 assert.notEqual(run('commitBattingDraft(t)'),'');assert.equal(run('t.tutorial28.step'),'lineup-manual');
 run('(assignBattingSlot(t,8,t.players[0].id),true)');assert.equal(run('commitBattingDraft(t)'),'');
 run('(t.battingDraft[0].pos="C",t.battingDraft[1].pos="P",true)');assert.equal(run('commitBattingDraft(t)'),'');
 assert.equal(run('t.lineup[0].id'),'p11');assert.equal(run('t.lineup[0].pos'),'C');assert.equal(run('t.tutorial28.step'),'lineup-manual');
 assert.equal(gameClick('lineup-start'),false);
});
test('mode coach permits actual automatic and skip buttons and releases its pause',()=>{
 for(const action of ['auto','skip-match']){
  const {run,target,gameClick}=integration();target('.match-top .row');
  run(`(t=newTeam('mode',1,2,true),t.tutorial28.matchId='m',t.tutorial28.step='mode',t.match={id:'m',done:false,paused:false,auto:false,side:0},activeGame=true,screen='match',HaecheTutorial28.refresh(),true)`);
  assert.equal(gameClick(action),false);assert.equal(run('t.match.paused'),false);
  if(action==='auto')assert.equal(run('t.tutorial28.step'),'player-info');
 }
});
test('player info waits for manual play and the first own attack after a defensive lesson',()=>{
 const s=rules.create('player-info'),c={active:true,screen:'match',live:true,ready:true,attack:1,auto:false};
 assert.equal(rules.scene(s,c),'info');s.defenseSeen=true;assert.equal(rules.scene(s,c),null);c.attack=0;assert.equal(rules.scene(s,c),'info');
 c.auto=true;assert.equal(rules.scene(s,c),null);c.auto=false;c.ready=false;assert.equal(rules.scene(s,c),null);
});
test('replaying after a finished match preserves lineup and recommendation steps',()=>{
 const {run,click}=integration();
 run('(t=newTeam("old",1,2,true),t.match={id:"old-match",done:true,paused:true,side:0},t.tutorial28.status="completed",activeGame=true,screen="settings",true)');
 click('replay');assert.equal(run('t.tutorial28.step'),'lineup');
 run('(autoAssignLineup(t),render(),true)');assert.equal(run('t.tutorial28.step'),'start');
 click('manual');assert.equal(run('t.tutorial28.step'),'lineup-manual');
});
test('player info coach shows current named players, their actual abilities and energy without changes',()=>{
 const {run,target,html}=integration();target('.match-layout > .dugout .current-card');
 run(`(t=newTeam('info',1,2,true),t.tutorial28.matchId='m',t.tutorial28.step='player-info',t.currentBatter.name='김강타',t.currentBatter.a.power=88,t.currentBatter.energy=22,t.match={id:'m',done:false,paused:false,auto:false,side:0,opp:{pitcher:{name:'박직구',number:33,a:{velocity:91,control:72,stamina:60},energy:35}}},activeGame=true,screen='match',HaecheTutorial28.refresh(),true)`);
 assert.match(html(),/김강타 #1/);assert.match(html(),/파워 88/);assert.match(html(),/체력 22 \/ 50/);assert.match(html(),/박직구 #33/);assert.match(html(),/구속 91 · 제구 72/);
 assert.equal(run('t.currentBatter.energy'),22);assert.equal(run('t.currentBatter.a.power'),88);assert.equal(run('t.match.paused'),true);
});
test('skip persists per-save and replay starts from current match without resetting data',()=>{
 const {run,click}=integration();run('(t={name:"old",funds:3000,w:9,match:{id:"live",done:false,paused:true,side:0}},true)');
 click('replay');assert.equal(run('t.tutorial28.step'),'mode');assert.equal(run('t.tutorial28.matchId'),'live');
 click('skip');assert.equal(run('t.tutorial28.status'),'skipped');assert.equal(run('t.match.paused'),true);
 assert.deepEqual(run('[t.funds,t.w]'),[3000,9]);
 run('(t.match.done=true,true)');click('replay');assert.equal(run('t.tutorial28.step'),'lineup');
});
test('real coach holds the match clock and RNG, then skip restores its previous pause state',()=>{
 for(const paused of [false,true]){
  const {run,click,target}=integration();target('.match-top .row');
  run(`(t=newTeam('test',1,2,true),t.tutorial28.step='mode',t.tutorial28.matchId='m',t.match={id:'m',done:false,paused:${paused},side:0,inputLeft:10,rng:123,pitches:0},activeGame=true,screen='match',HaecheTutorial28.refresh(),true)`);
  assert.equal(run('HaecheTutorial28.snapshot().held'),true);
  run('(()=>{for(let i=0;i<100;i++)tick(i);return true;})()');
  assert.deepEqual(run('[t.match.inputLeft,t.match.rng,t.match.pitches]'),[10,123,0]);
  click('skip');assert.equal(run('t.match.paused'),paused);
 }
});
test('each save retains its own lesson progress in serialized backups',()=>{
 const a=rules.create('batting'),b=rules.create('lineup');a.matchId='first';a.defenseSeen=true;
 const slots=JSON.parse(JSON.stringify([{tutorial28:a},{tutorial28:b}]));slots[0].tutorial28.status='skipped';
 assert.equal(rules.normalize(slots[0].tutorial28).status,'skipped');assert.equal(rules.normalize(slots[1].tutorial28).status,'active');
 assert.equal(slots[0].tutorial28.matchId,'first');assert.equal(slots[0].tutorial28.defenseSeen,true);
});

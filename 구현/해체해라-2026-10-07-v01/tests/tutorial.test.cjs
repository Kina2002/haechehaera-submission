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
 const nodes={},events={},winEvents={};
 const element=()=>({style:{},innerHTML:'',remove(){},contains:()=>false,focus(){},scrollIntoView(){},matches:()=>false,querySelectorAll:()=>[],getBoundingClientRect:()=>({left:100,top:100,right:300,bottom:160,height:260})});
 const doc={hidden:false,documentElement:{clientWidth:1200},activeElement:null,body:{append:()=>{}},
  createElement:()=>({...element(),querySelector:()=>element()}),querySelector:s=>nodes[s]||null,querySelectorAll:()=>[],addEventListener:(type,fn)=>{(events[type]??=[]).push(fn);}};
 const ctx=vm.createContext({Math,performance:{now:()=>123},document:doc,module:undefined});
 ctx.window=ctx;ctx.globalThis=ctx;ctx.innerHeight=900;ctx.addEventListener=(type,fn)=>{(winEvents[type]??=[]).push(fn);};
 vm.runInContext(`let data={slots:[]},activeGame=false,screen='slots',lastFrame=0,anim=null,reaction=null,shiftLead=null,waitMs=0,entrance=null,clubEventView=null,mlbDialog=null,achievementNotice=null,skipJob=null,t=null,saves=0,ticks=0;
  const $=s=>document.querySelector(s),team=()=>t,attack=m=>m.side,esc=s=>s;
  function save(){saves++}function render(){}function tick(){ticks++;if(t?.match&&!t.match.paused){t.match.inputLeft--;t.match.rng++;t.match.pitches++;}}function go(s){screen=s;render()}
  function newTeam(name,a,b,defer){return {name,match:null,defer}}
  function validateTeam(){}function autoAssignLineup(x){return x.invalid?'invalid':''}
  function startMatch(){}function subDialog(){}
  function commitInstruction(m,kind,value,fn){if(m.paused||m.auto)return false;if(kind==='attack'&&m.side!==0||kind==='defense'&&m.side!==1)return false;fn();return true}
 `,ctx);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/tutorial.js'),'utf8'),ctx);
 const run=code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
 const click=a=>winEvents.click[0]({target:{closest:()=>({dataset:{tutorial:a}})},preventDefault(){},stopImmediatePropagation(){}});
 return {run,click,target:s=>nodes[s]=element()};
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
 const {run}=integration();run('(t=newTeam("test",1,2,true),t.tutorial28.step="batting",t.match={id:"m",side:1,paused:false,auto:false},true)');
 assert.equal(run('(commitInstruction(t.match,"attack","contact",()=>{}),t.tutorial28.defenseSeen)'),false);
 assert.equal(run('(commitInstruction(t.match,"defense",{},()=>{}),t.tutorial28.defenseSeen)'),true);
 assert.equal(run('(t.match.side=0,commitInstruction(t.match,"attack","contact",()=>{}),t.tutorial28.step)'),'substitution');
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

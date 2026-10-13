const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const game=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8').replace(/\r\n/g,'\n');
const transition=fs.readFileSync(path.join(__dirname,'../src/side-switch.js'),'utf8');

function fixture(options={}){
 const nodes={};for(const k of ['#countdown','#commandHint','#fieldStatus','#sideSwitchHost'])nodes[k]={textContent:'',style:{}};
 const buttons=Array.from({length:3},()=>({disabled:false}));
 const context=vm.createContext({Math,crypto:{randomUUID},location:{hash:''},performance:{now:()=>0},
  document:{documentElement:{hasAttribute:()=>true},querySelector:k=>nodes[k]||null,querySelectorAll:()=>buttons},
  window:{addEventListener(){},matchMedia:()=>({matches:!!options.reduced}),GameAudio:{update(){}}},
  GameStorage:{create:()=>({})},recordRecap:()=>{},restoreAbilities:()=>{},options});
 vm.runInContext(game.slice(0,game.indexOf('\nfunction rect(')),context);
 vm.runInContext(`
 const t=newTeam('우리',11,5),o=newTeam('상대',8,4);
 for(const tm of [t,o])for(const p of tm.players)p.a=Object.fromEntries(KEYS.map(k=>[k,50]));
 data.slots=[t,null];data.current=0;data.settings.speed=options.rate||1;
 const m={id:'switch-check',opp:o,home:0,inning:3,half:0,outs:2,balls:0,strikes:2,
  bases:[null,null,null],score:[2,1],hits:[0,0],errors:[0,0],order:[0,0],last:[null,null],
  innings:[Array(7).fill(null),Array(7).fill(null)],paPitches:0,pitches:0,bh:[0,0],
  bhBase:[0,0],bhBaseUsed:[0,0],opportunities:[0,0],events:[],rng:20261013,
  done:false,rewarded:false,paused:false,auto:false,lastLines:{},reactionCount:0,recap:{},
  checks:{events:0,violations:[],motions:0,reactions:0},defense:{side:1,depth:1},...options};
 t.match=m;chooseBH=()=>null;pickReaction=()=>null;r=x=>{x.rng++;return .5;};m.command='take';
 let shiftLead=null,renders=0,skips=0,drawn=[];screen='match';lastFrame=0;
 function render(){renders++}function drawField(){}function updateControls(){}function paintOutcome(){}
 function renderReaction(){}function drawDecorations(){}function requestAnimationFrame(){}
 function go(where){screen=where}function subDialog(){}function skipRemainingMatch(){skips++}
 function matchHTML(){return '<div id="bigPlay"></div>'}function toast(){}
 function smoothProgress(u){u=clamp(u,0,1);return u*u*(3-2*u)}
 function fieldScale(){return 1}function rect(){}
 function sprite(c,x,y,scale,tm,number,role,pose,time,id,flip){drawn.push({x,y,id,number,side:tm===t?0:1,pose,flip});}
 `,context);
 vm.runInContext(game.slice(game.indexOf('function matchPlaybackRate('),game.indexOf('function matchHTML(')),context);
 vm.runInContext(game.slice(game.indexOf('function canInstruct('),game.indexOf('function fieldScale(')),context);
 vm.runInContext(game.slice(game.indexOf('function resultHoldMs('),game.indexOf('function outcomeCard(')),context);
 vm.runInContext(game.slice(game.indexOf('function launchPitch('),game.indexOf('\ndocument.addEventListener("click"')),context);
 vm.runInContext(transition,context);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',context));
}
const enter=`(()=>{launchPitch();let time=0;while(!sideSwitch&&time<15000){time+=100;tick(time);}return {time,started:!!sideSwitch,events:m.events.length,pitches:m.pitches};})()`;

test('both home assignments and both halves keep three outs visible before announcing the new role',()=>{
 for(const home of [0,1])for(const half of [0,1]){
  const run=fixture({home,half});assert.equal(run(enter).started,true);
  assert.deepEqual(run('[visibleMatchState(m).inning,visibleMatchState(m).half,visibleMatchState(m).outs]'),[3,half,3]);
  assert.equal(run('visibleMatchState(m).attack'),half===0?1-home:home);
  assert.equal(run('(advanceSideSwitch(m,1600),visibleMatchState(m).attack)'),half===0?home:1-home);
  assert.deepEqual(run('[visibleMatchState(m).inning,visibleMatchState(m).half,visibleMatchState(m).outs]'),[half===0?3:4,half===0?1:0,0]);
 }
});

test('next pitch, direct instructions, and visible controls are blocked throughout the transition',()=>{
 const run=fixture();run(enter);const before=run('[m.rng,m.pitches,m.events.length,m.command]');
 assert.equal(run('canInstruct(m)'),false);
 assert.equal(run('commitInstruction(m,"attack","power",launchPitch)'),false);
 run('(launchPitch(),updateControls(),true)');assert.deepEqual(run('[m.rng,m.pitches,m.events.length,m.command]'),before);
 assert.equal(run('$("#countdown").textContent'),'—');assert.ok(run('$$("buttons").every(b=>b.disabled)'));
});

test('transition leaves RNG, statistics and records untouched and restarts the manual ten second clock afterwards',()=>{
 const run=fixture();const entered=run(enter);assert.equal(entered.events,1);
 const before=run('[m.rng,m.pitches,m.events.length,m.score,t.players.map(p=>p.stats)]');
 assert.equal(run('m.inputLeft'),10);
 run('(tick(lastFrame+100),true)');assert.equal(run('m.inputLeft'),10);
 run('(advanceSideSwitch(m,2800),true)');assert.equal(run('sideSwitch'),null);
 assert.deepEqual(run('[m.rng,m.pitches,m.events.length,m.score,t.players.map(p=>p.stats)]'),before);
 assert.equal(run('m.inputLeft'),10);
 run('(tick(lastFrame+100),tick(lastFrame+100),tick(lastFrame+100),true)');assert.equal(run('m.inputLeft'),10);
 run('(tick(lastFrame+100),true)');assert.equal(run('m.inputLeft'),9.9);
 assert.equal(run('m.events.length'),1);
});

test('pause and remaining-game skip freeze elapsed time and the selected next inning',()=>{
 for(const condition of ['m.paused=true','skipJob={}']){
  const run=fixture();run(enter);const before=run('[sideSwitch.elapsed,m.rng,m.pitches]');
  run(`(${condition},tick(lastFrame+100),true)`);assert.deepEqual(run('[sideSwitch.elapsed,m.rng,m.pitches]'),before);
 }
});

test('automatic 2x and 3x accelerate the transition without another pitch during it',()=>{
 for(const rate of [1,2,3]){
  const run=fixture({rate,auto:true});run(enter);
  const result=run('(()=>{const before=m.pitches;let wall=0;while(sideSwitch&&wall<4000){wall+=100;tick(lastFrame+100);}return {wall,before,after:m.pitches};})()');
  assert.equal(result.after,result.before);assert.equal(result.wall,Math.ceil(2800/rate/100)*100);
 }
});

test('only a completed half starts the effect; final, mercy and skipped results bypass it',()=>{
 const run=fixture();run('(launchPitch(),true)');
 assert.equal(run('(anim.e.inningChange=false,beginSideSwitch(m,anim.e))'),false);
 assert.equal(run('(anim.e.inningChange=true,m.done=true,beginSideSwitch(m,anim.e))'),false);
 assert.equal(run('(m.mercy={inning:3,margin:10},beginSideSwitch(m,anim.e))'),false);
 assert.equal(run('(m.done=false,skipJob={},beginSideSwitch(m,anim.e))'),false);
 assert.equal(run('sideSwitch'),null);
});

test('skip and leaving the match clear the effect and settle the actual next defensive lineup',()=>{
 for(const action of ['skipRemainingMatch()','go("home")']){
  const run=fixture();run(enter);run('('+action+',true)');assert.equal(run('sideSwitch'),null);
  assert.equal(run('Object.keys(m.formation).length'),9);
  assert.ok(run('tside(m,1-attack(m)).lineup.every(item=>m.formation[item.id])'));
 }
});

test('moving actors retain actual player identities and use the match run poses',()=>{
 const run=fixture();run(enter);
 run('(advanceSideSwitch(m,1500),drawSideSwitch({save(){},restore(){}},m,1500),true)');
 const actors=run('drawn');assert.ok(actors.some(a=>a.pose==='run'));
 for(const a of actors){assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y));assert.ok(a.x>=0&&a.x<=900&&a.y>=0&&a.y<=530);assert.equal(run(`ply(tside(m,${a.side}),${JSON.stringify(a.id)}).number`),a.number);}
});

test('reduced motion keeps actors still and replaces the long movement with a short announcement',()=>{
 const run=fixture({reduced:true});run(enter);assert.equal(run('sideSwitch.total'),900);
 run('(advanceSideSwitch(m,600),drawSideSwitch({save(){},restore(){}},m,600),true)');
 assert.ok(run('drawn.every(a=>a.pose!=="run")'));run('(advanceSideSwitch(m,300),true)');assert.equal(run('sideSwitch'),null);
});

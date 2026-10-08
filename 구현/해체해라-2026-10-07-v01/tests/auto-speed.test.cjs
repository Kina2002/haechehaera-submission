const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8').replace(/\r\n/g,'\n');
function fixture(rate=1,auto=true){
 const context=vm.createContext({Math});
 vm.runInContext(`
  let data={settings:{speed:${rate}}},m={auto:${auto},paused:false,done:false,inputLeft:10,command:'contact',defense:{side:1,depth:1},score:[0,0],rng:123};
  let anim=null,reaction=null,shiftLead=null,waitMs=0,lastFrame=0,screen='match',skipJob=null;
  let draws=0,renders=0,audioUpdates=0;
  const team=()=>({match:m}),attack=()=>0,clone=x=>JSON.parse(JSON.stringify(x));
  const render=()=>renders++,drawField=()=>{},paintOutcome=()=>{},renderReaction=()=>{},updateControls=()=>{},drawDecorations=()=>{},requestAnimationFrame=()=>{};
  const go=s=>screen=s,showReaction=()=>{},TUNE={reactionMs:5000};
  const window={GameAudio:{update:()=>audioUpdates++}};
  let event={id:'e1',type:'single',pa:true,outsAdded:0,reaction:{speaker:0,line:'안타!',group:'g1'}};
  const resolvePitch=()=>{draws++;return event;};
 `,context);
 vm.runInContext(source.slice(source.indexOf('function matchPlaybackRate('),source.indexOf('function matchHTML(')),context);
 vm.runInContext(source.slice(source.indexOf('function resultHoldMs('),source.indexOf('function visibleMatchState(')),context);
 vm.runInContext(source.slice(source.indexOf('function launchPitch('),source.indexOf('\ndocument.addEventListener("click"')),context);
 return code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',context));
}

test('match controls expose saved 2x and only automatic play uses its rate',()=>{
 const run=fixture(2);assert.equal(run('matchPlaybackRate(m)'),2);
 assert.match(run('matchSpeedHTML(m)'),/aria-label="자동 경기 배속"/);
 assert.match(run('matchSpeedHTML(m)'),/value="2" selected>2배속/);
 assert.doesNotMatch(run('matchSpeedHTML(m)'),/disabled/);
 assert.equal(run('(m.auto=false,matchPlaybackRate(m))'),1);
 assert.match(run('matchSpeedHTML(m)'),/disabled/);
 for(const speed of [0,4,NaN])assert.equal(run(`(m.auto=true,data.settings.speed=${speed},matchPlaybackRate(m))`),1);
});

test('2x speeds animation once and resolves each pitch only once',()=>{
 for(const [type,bh,duration] of [['single',0,1600],['hr',0,2500],['error',8,2100]]){
  const run=fixture(2);run(`(event.type='${type}',event.bh=${bh},launchPitch(),true)`);
  assert.equal(run('anim.duration'),duration);run('(tick(100),true)');
  assert.deepEqual(run('[anim.elapsed,anim.judgeClock18,draws]'),[100,100,1]);
 }
});

test('full automatic pitch with result and commentary takes half the wall time',()=>{
 function duration(rate){const run=fixture(rate);return run('(()=>{launchPitch();let ms=0;while(anim&&ms<20000){ms+=100;tick(ms);}return {ms,draws,audioUpdates};})()');}
 const normal=duration(1),fast=duration(2);
 assert.equal(normal.draws,1);assert.equal(fast.draws,1);
 assert.ok(Math.abs(normal.ms-fast.ms*2)<=100,JSON.stringify({normal,fast}));
 assert.ok(fast.audioUpdates<normal.audioUpdates);
});

test('result waits accelerate while umpire voice cue clock stays in real milliseconds',()=>{
 const run=fixture(2);run('(launchPitch(),anim.resultShown=true,anim.elapsed=1600,anim.judgeClock18=1600,anim.holdLeft=3000,true)');
 run('(()=>{for(let ms=100;ms<=500;ms+=100)tick(ms);return true;})()');
 assert.deepEqual(run('[anim.holdLeft,anim.judgeClock18,draws]'),[2000,2100,1]);
});

test('automatic gaps and defensive movement accelerate; manual instruction stays ten seconds',()=>{
 const run=fixture(2);run('(waitMs=300,tick(100),true)');assert.equal(run('waitMs'),100);
 run('(waitMs=0,shiftLead={left:550,total:550,from:{},to:{}},tick(200),true)');assert.equal(run('shiftLead.left'),350);
 const manual=fixture(2,false);manual('(tick(100),true)');assert.equal(manual('m.inputLeft'),9.9);assert.equal(manual('draws'),0);
});

test('pause and skip freeze both animation and accelerated result timers',()=>{
 for(const condition of ['m.paused=true','skipJob={}']){
  const run=fixture(2);run(`(launchPitch(),anim.resultShown=true,reaction={left:5000},${condition},tick(100),true)`);
  assert.deepEqual(run('[anim.elapsed,anim.holdLeft,reaction.left,anim.judgeClock18]'),[0,3000,5000,0]);
 }
});

test('switching speed preserves in-flight animation, pitch result and RNG',()=>{
 const run=fixture(1);run('(launchPitch(),tick(100),true)');const before=run('m');
 run('(data.settings.speed=2,tick(200),true)');
 assert.deepEqual(run('[anim.duration,anim.elapsed,draws]'),[3200,200,1]);
 assert.deepEqual(run('m'),before);
 run('(anim=null,reaction=null,waitMs=0,launchPitch(),true)');assert.equal(run('anim.duration'),1600);
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const rules=require('../src/audio-rules.js');
const Engine=require('../src/audio-engine.js');
const Driver=require('../src/audio-driver.js');
const turn=()=>new Promise(resolve=>setImmediate(resolve));

test('pitch, contact and swing follow the visual clock at every game speed',()=>{
 for(const duration of [1400,1600,3200,5000]){
  const contact=rules.eventPlan({pitchThrown:true,swing:true,contact:true},duration);
  assert.equal(contact.find(c=>c.id==='pitch').at,rules.inverse(.13)*duration);
  assert.equal(contact.find(c=>c.id==='bat').at,rules.inverse(.22)*duration);
  assert.ok(!contact.some(c=>c.id==='miss'));
  const miss=rules.eventPlan({pitchThrown:true,swing:true,contact:false},duration);
  assert.ok(miss.some(c=>c.id==='miss'));assert.ok(!miss.some(c=>c.id==='bat'));
  assert.ok(contact[0].maxDuration<1.071);
 }
 assert.ok(!rules.eventPlan({pitchThrown:false},3200).some(c=>['pitch','miss','bat','glove'].includes(c.id)));
});
test('strikeout separates strike and out, simultaneous base calls have one voice',()=>{
 const p=rules.eventPlan({pitchThrown:true},3200,[{kind:'k',at:.32}]).filter(c=>c.judge);
 assert.deepEqual(p.map(c=>c.id),['strike','out']);assert.equal(p[1].at-p[0].at,820);
 const dp=rules.eventPlan({pitchThrown:false},1600,[{kind:'safe',at:.7},{kind:'out',at:.71},{kind:'out',at:.8}]);
 assert.deepEqual(dp.map(c=>c.id),['out']);
 assert.equal(rules.eventPlan({pitchThrown:false},3200,[]).length,0);
});
test('home run cheer is for our team and uses the separate bat impact',()=>{
 for(const attack of [0,1]){
  const p=rules.eventPlan({type:'hr',attack,contact:true},5000);
  assert.ok(p.some(c=>c.id==='bat-hr'));assert.equal(p.some(c=>c.id==='crowd-hr'),attack===0);
 }
});
test('reaction roles and dialogue meaning select appropriate music',()=>{
 const pick=(speaker,group)=>rules.reactionTrack({speaker,group},{g27:true});
 assert.equal(pick('중계진','g27'),'commentary');
 assert.equal(pick('우리 관객','g27'),'sad-fans');
 assert.equal(pick('우리 관객','g26'),null);
 assert.equal(pick('우리 치어리더','g29'),'home-cheer');
 assert.equal(pick('우리 치어리더','g18'),null);
 assert.equal(pick('상대 관객','g27'),'rival-fans');
 assert.equal(pick('상대 치어리더','g27'),'rival-cheer');
 assert.equal(pick('상대 관객','g03'),null);
 assert.equal(pick('상대 관객','g26'),null);
});
test('music uses visible state, pauses, and respects positive/negative event scenes',()=>{
 assert.equal(rules.musicFor({screen:'result',club:{positive:true}}),'bgm-club');
 assert.equal(rules.musicFor({screen:'result',club:{positive:false}}),null);
 assert.equal(rules.musicFor({screen:'match',blocked:true}),null);
 assert.equal(rules.musicFor({screen:'match',match:{inning:5,score:[3,2]},visible:{inning:1,score:[0,0],bases:[]}}),'bgm-main');
 assert.equal(rules.musicFor({screen:'match',match:{inning:5,score:[3,2]}}),'bgm-tense');
});
function fakeDriver(){
 const events=[],s={enabled:true},engine={mix(){},stopEffects(){},stopChannel(){},stopAll(){events.push('stop');},music(){},isPlaying:()=>false,play(id){events.push(id);return Promise.resolve(true);}};
 return {events,s,d:Driver.create({engine,rules,settings:()=>s,sadGroups:{g27:true}})};
}
test('redraws never repeat cues; muted cues never queue for later',()=>{
 const {d,events,s}=fakeDriver(),anim={e:{id:1,pitchThrown:true},duration:3200};
 const snap={screen:'match',anim,clock:0,judges:[]};d.update(snap);
 snap.clock=rules.inverse(.13)*3200;d.update(snap);d.update(snap);assert.equal(events.filter(x=>x==='pitch').length,1);
 s.enabled=false;snap.clock=rules.inverse(.29)*3200;d.update(snap);s.enabled=true;d.update(snap);assert.ok(!events.includes('glove'));
 snap.reaction={matchId:'m1',eventId:1,speaker:'우리 관객',group:'g27'};d.update(snap);d.update({...snap,reaction:{...snap.reaction}});
 assert.equal(events.filter(x=>x==='sad-fans').length,1);
 snap.blocked=true;d.update(snap);assert.equal(events.at(-1),'stop');
});
test('event replay receives a new conclusion cue and result reward waits for dialog',()=>{
 const {d,events}=fakeDriver(),view={},s={screen:'result',match:{id:'m',done:true,score:[2,1]},club:{view,id:'e',positive:true,elapsed:0,resultAt:4000}};
 d.update(s);assert.ok(!events.includes('win'));s.club.elapsed=4000;d.update(s);d.update(s);
 assert.equal(events.filter(x=>x==='warm-event').length,1);
 s.club.elapsed=0;d.update(s);s.club.elapsed=4000;d.update(s);assert.equal(events.filter(x=>x==='warm-event').length,2);
 s.club=null;d.update(s);d.update(s);assert.equal(events.filter(x=>x==='win').length,1);
});
function fakeAudio(fetchFile){
 const params=()=>({value:0,setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},cancelScheduledValues(){}});
 const nodes=[],starts=[],logs=[],settings={enabled:true,music:.3,effects:.85};let permitted=true;
 class Context{
  constructor(){this.state='running';this.currentTime=0;this.destination={};}
  createGain(){const n={gain:params(),connect(){},disconnect(){}};nodes.push(n);return n;}
  createBufferSource(){const s={connect(){},disconnect(){},start(){starts.push(s);},stop(){}};return s;}
  decodeAudioData(){return Promise.resolve({duration:2});}
 }
 const e=Engine.create({Context,assets:{music:{src:'music',channel:'bgm',gain:.6},strike:{src:'strike',channel:'judge',gain:.8}},settings:()=>settings,allowed:()=>permitted,fetchFile:fetchFile||(()=>Promise.resolve({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(4))})),trace:x=>logs.push(x)});
 return {e,settings,starts,logs,nodes,block:()=>{permitted=false;}};
}
test('audio waits for gesture; loops; ducks under judge and stops on mute',async()=>{
 const {e,settings,starts,nodes}=fakeAudio();assert.equal(await e.play('strike'),false);assert.equal(starts.length,0);
 await e.unlock();await e.preload();e.music('music');await turn();assert.equal(starts[0].loop,true);assert.equal(starts[0].loopEnd,2);
 await e.play('strike');assert.equal(nodes[1].gain.value,.3*.24);assert.equal(e.isPlaying('judge'),true);
 settings.enabled=false;e.stopAll();assert.equal(e.snapshot().voices.length,0);assert.equal(await e.play('strike'),false);
});
test('decode completing after a pause, scene change or channel cancellation is discarded',async()=>{
 for(const cancel of [e=>e.stopAll(),e=>e.stopChannel('judge'),(e,block)=>block()]){
  let release;const wait=new Promise(r=>{release=r;});const {e,starts,block}=fakeAudio(()=>wait);
  await e.unlock();const pending=e.play('strike');cancel(e,block);release({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(4))});
  assert.equal(await pending,false);assert.equal(starts.length,0);
 }
});
test('decode failure leaves gameplay available and produces a diagnostic',async()=>{
 const {e}=fakeAudio(()=>Promise.resolve({ok:false,status:404}));await e.unlock();assert.equal(await e.play('strike'),false);assert.ok(e.snapshot().errors.some(x=>x.id==='strike'));
});

test('entrance murmur plays once, resumes at scene time and cancels on skip',async()=>{
 const calls=[],playing=new Set(),settings={enabled:true};
 const engine={mix(){},music(){},stopEffects(){playing.clear();},stopAll(){playing.clear();},stopChannel(c){playing.delete(c);},isPlaying:c=>playing.has(c),play(id,options){calls.push({id,options});playing.add('ambience');return Promise.resolve(true);}};
 const d=Driver.create({engine,rules,settings:()=>settings,sadGroups:{}}),view={};
 const s={screen:'match',entrance:{view,elapsed:0,duration:5400}};
 d.update(s);await turn();s.entrance.elapsed=1000;d.update(s);await turn();assert.equal(calls.length,1);
 playing.clear();d.update(s);await turn();assert.equal(calls.length,1,'a finished clip never restarts in the same entrance');
 s.blocked=true;d.update(s);assert.equal(playing.size,0);
 s.blocked=false;s.entrance.elapsed=2400;d.update(s);await turn();assert.equal(calls.length,2);assert.equal(calls[1].options.offset(),2.4);
 s.entrance=null;d.update(s);assert.equal(playing.size,0);assert.equal(calls[1].options.valid(),false);
 s.entrance={view:{},elapsed:0,duration:5400,preview:true};d.update(s);await turn();assert.equal(calls.length,3);
 settings.enabled=false;d.update(s);assert.equal(playing.size,0);
});

test('delayed entrance decoding uses the latest animation position',async()=>{
 let release,elapsed=.25;const pending=new Promise(r=>{release=r;});const {e,logs}=fakeAudio(()=>pending);
 await e.unlock();const cue=e.play('strike',{offset:()=>elapsed,fadeIn:.1});elapsed=1.2;
 release({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(4))});assert.equal(await cue,true);
 assert.equal(logs.find(x=>x.type==='play').offsetSeconds,1.2);
 assert.equal(await e.play('strike',{offset:2.1}),false);
});

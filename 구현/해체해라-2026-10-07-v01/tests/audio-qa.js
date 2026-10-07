if(TEST_ONLY){
 const panel=document.createElement('section');panel.className='panel';
 panel.innerHTML='<h3>게임 사운드 확인</h3><p>실제 저장칸을 사용하지 않습니다.</p><button data-audio-qa>음원·상황 자동 검사</button> <button data-audio-live>소리 있는 시험 경기</button> <button data-audio-hr>우리 팀 홈런 재생</button> <button data-audio-status>재생 기록 확인</button><pre data-audio-report style="white-space:pre-wrap;max-height:350px;overflow:auto"></pre>';
 document.body.append(panel);
 const report=panel.querySelector('[data-audio-report]'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
 panel.querySelector('[data-audio-status]').onclick=()=>{report.textContent=JSON.stringify({runtimeErrors,audio:GameAudio.inspect()},null,2);};
 panel.querySelector('[data-audio-hr]').onclick=async()=>{
  const {m}=fixture23();m.id='audio-hr-'+Date.now();m.home=1;m.half=0;prepare(m);
  const e=emptyEvent(m);e.swing=true;e.contact=true;e.fielder=fielder(m.opp,'CF');e.fieldPos='CF';e.target=[780,115];reachHit(m,e,4);e.after=snap(m);buildMotion(m,e);m.events.push(e);
  data.settings={sound:true,speed:1,musicVolume:.3,effectsVolume:.85};activeGame=true;screen='match';reaction=null;shiftLead=null;
  anim={e,elapsed:0,duration:5000,resultShown:false,holdLeft:4500};GameAudio.testMode(false);GameAudio.clearTrace();render();await GameAudio.unlock();window.scrollTo(0,0);
 };
 panel.querySelector('[data-audio-live]').onclick=async()=>{
  const {m}=fixture23();m.id='audio-live-'+Date.now();m.auto=true;data.settings={sound:true,speed:1,musicVolume:.3,effectsVolume:.85};
  activeGame=true;screen='match';anim=null;reaction=null;shiftLead=null;waitMs=300;GameAudio.testMode(false);render();await GameAudio.unlock();report.textContent='시험 경기 진행 중 · 재생 기록 확인으로 소리 시점 보기';window.scrollTo(0,0);
 };
 panel.querySelector('[data-audio-qa]').onclick=async()=>{
  const keep={data,screen,activeGame,anim,reaction,shiftLead},before=JSON.stringify(data),rows=[];
  const check=(name,ok)=>{rows.push({name,ok:!!ok});if(!ok)throw Error(name);};
  const state=s=>({screen:'match',active:true,match:{id:'audio-qa',score:[0,0],inning:1,bases:[]},clock:0,...s});
  const playIds=()=>GameAudio.inspect().traces.filter(x=>x.type==='play').map(x=>x.id);
  report.textContent='음원 해독 및 실제 경기 판정 연결 검사 중…';suppressPersist++;
  try{
   const {m}=fixture23();m.paused=true;activeGame=true;screen='slots';anim=null;reaction=null;data.settings={sound:true,speed:1,musicVolume:0,effectsVolume:0};
   await GameAudio.unlock();GameAudio.testMode(true);GameAudio.testUpdate(state());await GameAudio.preload();
   check('전체 음원 브라우저 해독',GameAudio.inspect().engine.loaded.length===Object.keys(HAECHE_AUDIO_ASSETS).length);
   check('음원 로딩 오류 없음',GameAudio.inspect().engine.errors.length===0);
   const types=new Set(),calls=new Set();let pitches=0;
   for(let game=0;game<3;game++){
    const fixture=fixture23();fixture.m.rng=15151+game*12345;
    while(!fixture.m.done&&pitches<1500){
     const e=resolvePitch(fixture.m),j=judgePlan18(e),duration=e.type==='hr'?5000:3200,p=HaecheAudioRules.eventPlan(e,duration,j);types.add(e.type);j.forEach(x=>calls.add(x.kind));pitches++;
     if(e.swing&&!e.contact)check('헛스윙에 타격음 없음 '+pitches,!p.some(x=>x.id==='bat'||x.id==='bat-hr'));
     if(e.pitchThrown===false)check('주루 단독 사건에 투구음 없음 '+pitches,!p.some(x=>x.id==='pitch'));
     for(const c of j){const kind=c.kind==='k'?'strike':c.kind;check('심판 신호와 음성 시각 일치 '+pitches+' '+kind,p.some(x=>x.id===kind&&Math.abs(x.at-HaecheAudioRules.inverse(c.at)*duration)<.001)||p.some(x=>x.judge&&Math.abs(x.at-HaecheAudioRules.inverse(c.at)*duration)<760));}
    }
   }
   data.settings={sound:true,speed:1,musicVolume:0,effectsVolume:0};GameAudio.clearTrace();
   for(const e of [{id:'hit',contact:true,swing:true},{id:'miss',swing:true},{id:'hr-home',type:'hr',attack:0,contact:true},{id:'hr-away',type:'hr',attack:1,contact:true}]){
    const a={e,duration:5000},s=state({anim:a,clock:0});GameAudio.testUpdate(s);await sleep(15);
    for(const cue of HaecheAudioRules.eventPlan(e,5000,[])){s.clock=cue.at;GameAudio.testUpdate(s);await sleep(15);GameAudio.testUpdate(s);}
   }
   check('상대 홈런에 우리 환호 없음',GameAudio.inspect().traces.filter(x=>x.type==='play'&&x.id==='crowd-hr').length===1);
   for(const id of ['pitch','bat','bat-hr','miss','glove','crowd-hr'])check(id+' 실제 재생',playIds().includes(id));
   for(const [id,positive] of [['positive',true],['negative',false]]){
    const s=state({screen:'result',club:{view:{},id,positive,elapsed:5000,resultAt:4400}});GameAudio.testUpdate(s);await sleep(15);GameAudio.testUpdate(s);
   }
   for(const [speaker,group] of [['중계진','g27'],['우리 관객','g27'],['상대 관객','g27'],['우리 치어리더','g29'],['상대 치어리더','g27']]){
    const s=state({reaction:{matchId:'qa',eventId:speaker,speaker,group}});GameAudio.testUpdate(s);await sleep(15);GameAudio.testUpdate(s);
   }
   for(const kind of ['strike','out','safe','k']){
    const a={e:{id:'call-'+kind,pitchThrown:false},duration:3200};let s=state({anim:a,judges:[{kind,at:.32}],clock:0});GameAudio.testUpdate(s);
    s.clock=HaecheAudioRules.inverse(.32)*3200;GameAudio.testUpdate(s);await sleep(15);
    if(kind==='k'){s.clock+=820;GameAudio.testUpdate(s);await sleep(15);}
   }
   for(const id of ['warm-event','bad-event','commentary','sad-fans','rival-fans','home-cheer','rival-cheer','strike','out','safe'])check(id+' 실제 재생',playIds().includes(id));
   check('인물 반응 중복 재생 없음',['commentary','sad-fans','rival-fans','home-cheer','rival-cheer'].every(id=>playIds().filter(x=>x===id).length===1));
   GameAudio.testUpdate(state({blocked:true}));check('일시정지 시 모든 소리 정지',GameAudio.inspect().engine.voices.length===0);
   const count=playIds().length;GameAudio.testUpdate(state({blocked:true,reaction:{eventId:'hidden',speaker:'중계진',group:'g27'}}));await sleep(15);check('중단 중 신규 소리 없음',playIds().length===count);
   window.audioQA={passed:true,pitches,eventTypes:[...types],judgeKinds:[...calls],checks:rows.length,rows,decoded:GameAudio.inspect().engine.loaded,traces:GameAudio.inspect().traces};
  }catch(e){rows.push({name:e.message,ok:false});window.audioQA={passed:false,rows,stack:e.stack};}
  finally{GameAudio.stop();data=keep.data;screen=keep.screen;activeGame=keep.activeGame;anim=keep.anim;reaction=keep.reaction;shiftLead=keep.shiftLead;suppressPersist--;GameAudio.testMode(false);render();}
  window.audioQA.originalStatePreserved=JSON.stringify(data)===before;window.audioQA.runtimeErrors=runtimeErrors.slice();report.textContent=JSON.stringify(window.audioQA,null,2);
 };
}

if(TEST_ONLY){
 const homeCheck=document.createElement('button');homeCheck.textContent='홈 배치·입장 소리 확인';document.body.append(homeCheck);
 homeCheck.onclick=async()=>{
  const {t}=fixture23();t.name='해체 드림즈';t.match=null;t.funds=4942;t.w=0;t.l=2;t.d=0;t.facilities=[];t.debt=0;
  t.players.forEach(p=>{p.salary=121;p.contract=100;});t.balance.fanEventChance=0;
  activeGame=true;screen='home';anim=null;reaction=null;shiftLead=null;
  data.settings={sound:true,speed:1,musicVolume:.3,effectsVolume:.85};syncAchievements(t);acknowledgeAchievements(t,pendingAchievements(t).map(x=>x.id));removeAchievementNotice();
  for(const section of document.querySelectorAll('body > section'))section.style.display='none';homeCheck.remove();
  GameAudio.testMode(false);GameAudio.clearTrace();render();await GameAudio.unlock();
  setInterval(()=>{const status=document.querySelector('#saveStatus');if(status)status.dataset.audioQa=JSON.stringify({audio:GameAudio.inspect(),runtimeErrors,entrance:entrance?{elapsed:entrance.elapsed,preview:entrance.preview}:null,paused:!!team()?.match?.paused});},200);
 };
}

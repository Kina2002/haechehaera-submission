/* Browser adapter. Sound state never changes the match or consumes its RNG. */
(function(){
 'use strict';
 const traces=[],volume=(x,fallback)=>Number.isFinite(x)?clamp(x,0,1):fallback;
 const settings=()=>({enabled:data.settings.sound!==false,music:volume(data.settings.musicVolume,.30),effects:volume(data.settings.effectsVolume,.85)});
 let driver,testing=false;
 const engine=HaecheAudioEngine.create({assets:HAECHE_AUDIO_ASSETS,settings,
  allowed:()=>!!driver?.allowed(),Context:window.AudioContext||window.webkitAudioContext,
  fetchFile:url=>fetch(url),trace:row=>{traces.push({...row,at:Math.round(performance.now())});if(traces.length>400)traces.shift();}});
 driver=HaecheAudioDriver.create({engine,rules:HaecheAudioRules,settings,sadGroups:SAD_FAN_GROUPS});
 function snapshot(){
  const t=team(),m=t?.match,club=clubEventView;
  return {screen,active:activeGame,match:m,
   blocked:document.hidden||!!skipJob||screen==='match'&&!!m?.paused,
   anim:screen==='match'?anim:null,clock:screen==='match'&&anim?umpireClock18():0,
   judges:screen==='match'&&anim?judgePlan18(anim.e):[],visible:screen==='match'&&m?visibleMatchState(m):null,
   reaction:screen==='match'&&reaction?{...reaction,matchId:m?.id}:null,
   club:club?{view:club,id:club.event.id||club.event.kind,positive:clubEventDefinition(club.event)?.positive,
    elapsed:club.elapsed,resultAt:clubEventSceneEnd(club.event)}:null,
   mlb:mlbDialog?.result||null,achievement:achievementNotice?.key||null};
 }
 function update(){if(testing)return;driver.update(snapshot());updateToggle();}
 async function unlock(){driver.update(snapshot());await engine.unlock();update();}
 function toggle(){data.settings.sound=!settings().enabled;save();update();if(settings().enabled)void unlock();render();}
 function updateToggle(){
  const on=settings().enabled,label=on?'소리 켜짐':'소리 꺼짐';
  for(const b of document.querySelectorAll('[data-audio-toggle]')){if(b.textContent!==label)b.textContent=label;b.setAttribute('aria-pressed',String(on));}
 }
 const footer=document.querySelector('body > footer');
 if(footer){const b=document.createElement('button');b.type='button';b.className='small ghost';b.dataset.audioToggle='';b.setAttribute('aria-label','전체 소리 켜기 또는 끄기');footer.append(b);b.onclick=toggle;updateToggle();}
 const renderBeforeAudio=render;
 render=function(){
  renderBeforeAudio();
  if(screen==='match'){
   const row=document.querySelector('.match-top .row');
   if(row){const b=document.createElement('button');b.className='small ghost';b.dataset.audioToggle='';b.setAttribute('aria-label','경기 소리 켜기 또는 끄기');b.onclick=toggle;row.prepend(b);}
  }
  if(screen==='settings'){
   const s=settings();document.querySelector('[data-action="sound"]').insertAdjacentHTML('afterend','<div class="audio-settings"><h3>소리 크기</h3><div class="grid2">'+
    [['musicVolume','배경음악',s.music],['effectsVolume','효과음·목소리',s.effects]].map(([key,title,value])=>'<label>'+title+' <output data-audio-value="'+key+'">'+Math.round(value*100)+'%</output><input style="display:block;width:100%;margin:12px 0" type="range" min="0" max="100" value="'+Math.round(value*100)+'" data-audio-volume="'+key+'" aria-label="'+title+' 음량"></label>').join('')+'</div><p class="tiny muted">판정과 인물 반응이 나올 때 배경음악은 작아집니다. 일시정지하거나 다른 탭을 보면 소리도 멈춥니다.</p></div>');
  }
  updateToggle();
 };
 document.addEventListener('pointerdown',e=>{if(e.isTrusted)void unlock();},{capture:true});
 document.addEventListener('keydown',e=>{if(e.isTrusted&&!e.repeat)void unlock();},{capture:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)engine.stopAll('hidden');update();});
 document.addEventListener('input',e=>{
  const key=e.target.dataset.audioVolume;if(!['musicVolume','effectsVolume'].includes(key))return;
  data.settings[key]=Number(e.target.value)/100;document.querySelector('[data-audio-value="'+key+'"]').textContent=e.target.value+'%';engine.mix();
 });
 document.addEventListener('change',e=>{if(e.target.dataset.audioVolume)save();});
 document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled||b.hasAttribute('data-audio-toggle')||b.dataset.action==='sound')return;
  if(b.dataset.action!=='train')void engine.play('click');
 });
 window.GameAudio={update,unlock,playUI:id=>engine.play(id),inspect:()=>({engine:engine.snapshot(),driver:driver.snapshot(),traces:[...traces]})};
 if(TEST_ONLY)Object.assign(window.GameAudio,{testMode:value=>{testing=value;engine.stopAll('test-mode');},testUpdate:s=>driver.update(s),preload:engine.preload,clearTrace:()=>{traces.length=0;},stop:()=>engine.stopAll('test-stop')});
 update();
})();

if(TEST_ONLY)(()=>{
 let run=null;
 const panel=document.createElement('section');panel.className='panel';panel.id='tutorialQA';
 panel.innerHTML='<h3>튜토리얼 검사 · 실제 저장과 분리</h3><button data-tutorial-qa-new>튜토리얼 새 팀 시작</button> <button data-tutorial-qa-report>튜토리얼 진행 검사</button> <button data-tutorial-qa-tools>검사 도구 다시 보기</button><pre data-tutorial-qa-output hidden></pre>';
 const style=document.createElement('style');style.textContent='body[data-tutorial-qa-play]>section:not(.tutorial-layer){display:none!important}body[data-tutorial-qa-play]>#tutorialQA{display:block!important;position:fixed;bottom:3px;left:3px;z-index:95;padding:5px}body[data-tutorial-qa-play] #tutorialQA h3,body[data-tutorial-qa-play] [data-tutorial-qa-new]{display:none}body[data-tutorial-qa-play] #tutorialQA button{font-size:11px;padding:4px}';document.head.append(style);
 document.body.append(panel);
 panel.querySelector('[data-tutorial-qa-new]').onclick=()=>{
  data={saveVersion:1,slots:[newTeam('첫 경기 검사',11,5,true),null],current:0,settings:{sound:false,speed:1}};
  activeGame=true;anim=null;reaction=null;shiftLead=null;waitMs=0;selection=null;
  document.body.dataset.tutorialQaPlay='';
  run={seen:[],freezeChecks:0,failures:[],before:null,errors:runtimeErrors.length};go('home');
 };
 panel.querySelector('[data-tutorial-qa-tools]').onclick=()=>{delete document.body.dataset.tutorialQaPlay;go('settings');};
 function collect(){
  if(!run)return;const snap=HaecheTutorial28.snapshot(),m=team()?.match;
  panel.dataset.tutorialQaState=JSON.stringify({snapshot:snap,screen,setup:team()?.setupStage,activeGame,errors:runtimeErrors,match:!!m});
  if(snap.scene&&!run.seen.includes(snap.scene))run.seen.push(snap.scene);
  if(snap.held&&m){const value=JSON.stringify([m.rng,m.inputLeft,m.pitches,m.events.length,team().players.map(p=>p.energy)]);
   if(run.before?.scene===snap.scene&&run.before.match===m.id){run.freezeChecks++;if(value!==run.before.value)run.failures.push('안내 중 경기 상태 변경');}
   run.before={scene:snap.scene,match:m.id,value};
  }else run.before=null;
 }
 const before=render;render=function(){before();collect();};setInterval(collect,200);
 panel.querySelector('[data-tutorial-qa-report]').onclick=()=>{
  collect();const s=HaecheTutorial28.snapshot(),checks=[
   ['자동 배치 안내',run?.seen.includes('lineup')],['경기 시작 안내',run?.seen.includes('start')],['진행 방식 안내',run?.seen.includes('mode')],
   ['공격 지시 안내',run?.seen.includes('batting')],['교체 창 안내',run?.seen.includes('substitution')],['결과·운영비 안내',run?.seen.includes('result')&&run?.seen.includes('home')],
   ['실제 안내 완료',s.state?.status==='completed'],['선수 교체 강요 없음',team()?.match?.subs.filter(x=>x.side!==1).length===0],
   ['안내 중 경기 정지',run?.freezeChecks>=3&&run.failures.length===0],['화면 오류 없음',run&&runtimeErrors.length===run.errors]
  ].map(([name,ok])=>({name,ok:!!ok}));
  panel.querySelector('pre').textContent=JSON.stringify({passed:checks.every(x=>x.ok),checks,seen:run?.seen,freezeChecks:run?.freezeChecks,failures:run?.failures,errors:runtimeErrors.slice(run?.errors||0)});
 };
})();

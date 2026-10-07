// Runs only in tests.html, whose TEST_ONLY flag disables real save reads and writes.
if(TEST_ONLY){
 const panel=document.createElement('section');panel.className='panel';panel.id='clubEventQA';
 panel.innerHTML='<h3>구단 사건 검사</h3><button data-club-qa-run>구단 사건 8종 검사</button> <button data-club-qa-preview>사건 미리보기용 테스트 구단</button><pre data-club-qa-report style="white-space:pre-wrap"></pre>';
 document.body.append(panel);
 const assert=(value,message)=>{if(!value)throw Error(message);};
 const setup=()=>{const {t,m}=fixture23();t.name='해체 드림즈';t.funds=1000000;t.balance.fanEventChance=0;t.players.forEach(p=>{p.fans=50;p.loyalty=60;p.contract=20;});m.done=true;m.score=[1,3];activeGame=true;selection=t.players[0].id;return {t,m};};
 panel.querySelector('[data-club-qa-preview]').onclick=()=>{const {t}=setup();t.match=null;screen='settings';render();previewClubEvent('bench-song');};
 panel.querySelector('[data-club-qa-run]').onclick=async()=>{
  const report={events:[],rewardKinds:[],errors:[]},original=clone(data),oldScreen=screen,oldActive=activeGame,oldSelection=selection;
  await new Promise(resolve=>setTimeout(resolve,0));
  try{
   assert(charsReady&&ART.ready,'그림을 아직 읽는 중입니다.');
   assert(!clubEventView,'미리보기를 닫은 뒤 검사하세요.');
   report.rules=ruleChecks();report.contracts=checks26();
   assert(report.rules.every(x=>x.ok),'기존 경기 규칙 실패');assert(report.contracts.passed===report.contracts.total,'기존 계약 규칙 실패');
   for(let index=0;index<CLUB_EVENT_TYPES.length;index++){
    await new Promise(requestAnimationFrame);
    const {t,m}=setup();reward(m);
    const p=t.players[index===5?9:0],event=applyClubEvent(t,m,p,index),before=JSON.stringify(t.players);
    screen='result';render();assert(clubEventView?.event.id===event.id,'사건 자동 알림 누락');
    cancelAnimationFrame(clubEventView.raf);
    const frames=[0,2900,6600].map(ms=>{clubEventView.elapsed=ms;paintClubEventView(clubEventView);return clubEventView.el.querySelector('canvas').toDataURL();});
    assert(new Set(frames).size===3,'단계별 그림이 같습니다: '+event.kind);
    closeClubEvent();assert(!pendingClubEvent(t),'확인한 사건이 남았습니다.');
    showClubEvent(event);finishClubEventScene();closeClubEvent();
    assert(JSON.stringify(t.players)===before,'다시 보기에서 수치 변경');
    data=clone(data);const restored=team();restored.match.clubEvent.seen=false;restored.news.find(x=>x.clubEvent).clubEvent.seen=false;
    screen='home';render();assert(clubEventView,'복원 후 알림 누락');finishClubEventScene();closeClubEvent();
    render();assert(!clubEventView,'확인 후 자동 재등장');
    const previewBefore=JSON.stringify(team());previewClubEvent(event.kind);finishClubEventScene();closeClubEvent();assert(JSON.stringify(team())===previewBefore,'미리보기에서 수치 변경');
    report.events.push({kind:event.kind,autoOpen:true,distinctFrames:3,restore:true,seenPersisted:true,replayAndPreviewPreservePlayers:true});
   }
   // Exercise the real reward path, not just direct event application.
   const found=new Set();
   for(let seed=1;seed<=120;seed++){
    const {t,m}=setup();m.rng=seed*7919;t.balance.fanEventChance=1;if(seed%2===0)m.score=[3,1];
    reward(m);const event=m.clubEvent;assert(event,'사건 확률 100%인데 사건이 없습니다.');found.add(event.kind);
    if(event.kind==='bench-song')assert(!m.used.includes(event.playerId),'출전한 선수에게 후보 응원가');
    if(event.kind==='flat-interview')assert(m.score[0]<m.score[1]&&m.used.includes(event.playerId),'인터뷰 발생 조건 위반');
    const settled=JSON.stringify(t);reward(m);assert(JSON.stringify(t)===settled,'보상 중복 반영');
   }
   report.rewardKinds=[...found];
   assert(found.size===8,'실제 보상 경로에서 일부 사건이 나오지 않습니다.');report.rewardKinds=[...found];
   const {m}=setup();reward(m);assert(!m.clubEvent,'확률 0%인데 사건 발생');
   report.runtimeErrors=runtimeErrors.slice();assert(!report.runtimeErrors.length,'화면 오류 발생');
   report.passed=true;
  }catch(e){report.errors.push(e.message);report.passed=false;}
  finally{if(clubEventView)closeClubEvent();data=original;screen=oldScreen;activeGame=oldActive;selection=oldSelection;render();}
  window.clubEventQAReport=report;panel.querySelector('[data-club-qa-report]').textContent=JSON.stringify(report,null,2);
 };
}

// Runs only in tests.html, whose TEST_ONLY flag disables real save reads and writes.
if(TEST_ONLY){
 const panel=document.createElement('section');panel.className='panel';panel.id='clubEventQA';
 panel.innerHTML='<h3>구단 사건 검사</h3><button data-club-qa-run>구단 사건 10종 검사</button> <button data-club-qa-preview>사건 미리보기용 테스트 구단</button><pre data-club-qa-report style="white-space:pre-wrap"></pre>';
 document.body.append(panel);
 const assert=(value,message)=>{if(!value)throw Error(message);};
 const setup=()=>{const {t,m}=fixture23();t.name='해체 드림즈';t.funds=1000000;t.balance.fanEventChance=0;t.players.forEach(p=>{p.fans=50;p.loyalty=60;p.contract=20;});m.done=true;m.score=[1,3];activeGame=true;selection=t.players[0].id;return {t,m};};
 panel.querySelector('[data-club-qa-preview]').onclick=()=>{const {t}=setup();t.match=null;screen='settings';render();previewClubEvent('bench-song');};
 panel.querySelector('[data-club-qa-run]').onclick=async()=>{
  const originalPlayer=clubStoryPlayer;
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
    const sampleTimes=CLUB_EVENT_TYPES[index].shots?[0,3000,5900,10000]:[0,2900,6600];
    const frames=sampleTimes.map(ms=>{clubEventView.elapsed=ms;paintClubEventView(clubEventView);return clubEventView.el.querySelector('canvas').toDataURL();});
    assert(new Set(frames).size===sampleTimes.length,'단계별 그림이 같습니다: '+event.kind);
    closeClubEvent();assert(!pendingClubEvent(t),'확인한 사건이 남았습니다.');
    showClubEvent(event);finishClubEventScene();closeClubEvent();
    assert(JSON.stringify(t.players)===before,'다시 보기에서 수치 변경');
    data=clone(data);const restored=team();restored.match.clubEvent.seen=false;restored.news.find(x=>x.clubEvent).clubEvent.seen=false;
    screen='home';render();assert(clubEventView,'복원 후 알림 누락');finishClubEventScene();closeClubEvent();
    render();assert(!clubEventView,'확인 후 자동 재등장');
    const previewBefore=JSON.stringify(team());previewClubEvent(event.kind);
    if(CLUB_EVENT_TYPES[index].shots){
     for(let phase=0;phase<4;phase++){
      clubEventView.el.querySelector('[data-club-scene-beat="'+phase+'"]').click();
      assert(clubEventView.phase===phase&&clubEventView.raf===0,'장면별 정지 실패: '+event.kind);
      assert(clubEventView.el.querySelector('#club-event-caption').textContent===CLUB_EVENT_TYPES[index].shots[phase][1],'장면 설명 불일치');
     }
     clubEventView.el.querySelector('[data-club-event-replay]').click();await new Promise(requestAnimationFrame);
     assert(clubEventView.phase===0&&clubEventView.elapsed<1000&&clubEventView.raf,'정지 후 처음부터 재생 실패');
    }
    finishClubEventScene();closeClubEvent();assert(JSON.stringify(team())===previewBefore,'미리보기에서 수치 변경');
    report.events.push({kind:event.kind,autoOpen:true,distinctFrames:sampleTimes.length,restore:true,seenPersisted:true,replayAndPreviewPreservePlayers:true,storyboardControls:!!CLUB_EVENT_TYPES[index].shots});
   }
   // All six actual body assets must render every cut, including old saves without companions.
   let storyBodyFrames=0,playerTransforms=0;
   clubStoryPlayer=function(c,...args){
    const tr=c.getTransform(),sx=Math.hypot(tr.a,tr.b),sy=Math.hypot(tr.c,tr.d);
    assert(Math.abs(sx-sy)<.00001,'선수 신체 비율 왜곡');playerTransforms++;
    const out=originalPlayer(c,...args);assert(Number.isFinite(out.hand.x)&&Number.isFinite(out.hand.y),'손 위치 누락');return out;
   };
   for(const def of CLUB_EVENT_TYPES.filter(x=>x.shots))for(let body=0;body<6;body++){
    const {t}=setup(),p=t.players[0];p.appearance.body=body;p.appearance.skin=body;p.appearance.parts={hair:6,beard:3,wear:1,black:1};
    const event={kind:def.id,actor:clone(p),player:p.name,primary:t.primary,secondary:t.secondary};
    const cv=canvasNew(900,460),ctx=cv.getContext('2d');
    for(const ms of [900,3100,5700,10000]){drawClubEventScene(ctx,event,ms);assert(cv.toDataURL().length>1000,'체형 장면 누락');storyBodyFrames++;}
   }
   report.storyBodyFrames=storyBodyFrames;report.playerTransforms=playerTransforms;
   clubStoryPlayer=originalPlayer;
   // One visible eye is a profile, not a missing face. Adjacent walking frames
   // and the teaching pose must keep the selected glasses, beard and eye black.
   let accessoryFrames=0;
   for(let body=0;body<6;body++)for(const [row,col] of [[3,2],[3,3],[2,4],[2,1],[5,3]]){
    const {t}=setup(),p=t.players[0];p.appearance.body=body;p.appearance.parts={hair:6,beard:3,wear:1,black:1};
    const a=charFrame(p,t,'motion',row,col);
    for(const kind of ['beard','wear','black'])assert(a.rects[kind]?.every(Number.isFinite),'동작 중 얼굴 장식 사라짐: '+[body,row,col,kind]);
    assert(a.eye.box[2]>a.face[2]*.2,'한쪽 눈 안경 너비 압축');accessoryFrames++;
    const cv=a.canvas,pixels=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
    for(let x=0;x<cv.width;x++)assert(!pixels[x*4+3]&&!pixels[((cv.height-1)*cv.width+x)*4+3],'선수 상하 잘림');
    for(let y=0;y<cv.height;y++)assert(!pixels[(y*cv.width)*4+3]&&!pixels[(y*cv.width+cv.width-1)*4+3],'선수 좌우 잘림');
   }
   report.accessoryFrames=accessoryFrames;
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
   assert(found.size===CLUB_EVENT_TYPES.length,'실제 보상 경로에서 일부 사건이 나오지 않습니다.');report.rewardKinds=[...found];
   const {m}=setup();reward(m);assert(!m.clubEvent,'확률 0%인데 사건 발생');
   report.runtimeErrors=runtimeErrors.slice();assert(!report.runtimeErrors.length,'화면 오류 발생');
   report.passed=true;
  }catch(e){report.errors.push(e.message);report.passed=false;}
  finally{clubStoryPlayer=originalPlayer;if(clubEventView)closeClubEvent();data=original;screen=oldScreen;activeGame=oldActive;selection=oldSelection;render();}
  window.clubEventQAReport=report;panel.querySelector('[data-club-qa-report]').textContent=JSON.stringify(report,null,2);
 };
}

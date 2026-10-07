if(TEST_ONLY){
 const panel=document.createElement('section');panel.className='panel';panel.id='mlbQA';
 panel.innerHTML='<h3>MLB 진출 검사 · 실제 저장과 분리</h3><button data-mlb-qa-run>MLB 전체 흐름 검사</button> <button data-mlb-qa-demo="normal">MLB 일반 조건 테스트 구단</button> <button data-mlb-qa-demo="success">MLB 성공 테스트 구단</button> <button data-mlb-qa-demo="failure">MLB 실패 테스트 구단</button><pre data-mlb-qa-report style="white-space:pre-wrap"></pre>';
 document.body.append(panel);
 function setupMlbQA(mode='normal'){
  if(mlbDialog)closeMlbDialog();if(clubEventView)closeClubEvent();$('#dialog')?.close();
  const {t,m}=fixture23();t.name='MLB 테스트 구단';t.funds=10000;t.w=12;t.l=0;t.d=0;t.balance.fanEventChance=0;
  for(const p of t.players){p.contract=8;p.loyalty=60;p.stats.games=12;}
  const p=t.players[0];for(const k of ['contact','power','eye'])p.a[k]=90;p.stats.h=18;p.stats.ab=60;p.stats.hr=4;
  if(mode==='success')t.balance.mlbBaseChance=t.balance.mlbMaxChance=1;
  if(mode==='failure')t.balance.mlbBaseChance=t.balance.mlbMaxChance=0;
  m.done=true;m.rewarded=true;m.result='승리';m.score=[3,1];snapshotRoster26(t);
  activeGame=true;selection=p.id;screen='players';render();return {t,m,p};
 }
 panel.querySelectorAll('[data-mlb-qa-demo]').forEach(b=>b.onclick=()=>setupMlbQA(b.dataset.mlbQaDemo));
 panel.querySelector('[data-mlb-qa-run]').onclick=async()=>{
  const report={checks:[],errors:[]},keep={data:clone(data),screen,activeGame,selection};
  const check=(name,fn)=>{try{if(!fn())throw Error(name);report.checks.push({name,ok:true});}catch(e){report.checks.push({name,ok:false});throw e;}};
  await new Promise(resolve=>setTimeout(resolve,0));
  try{
   if(!charsReady||!ART.ready)throw Error('그림 로딩이 끝난 뒤 검사하세요.');
   report.rules=ruleChecks();report.contracts=checks26();
   check('기존 경기52·계약15 규칙',()=>report.rules.every(x=>x.ok)&&report.contracts.passed===report.contracts.total);
   let {t,m,p}=setupMlbQA('success');
   const initial=JSON.stringify(t),funds=t.funds;
   check('선수 관리에 MLB 도전 제안 표시',()=>!!$('[data-mlb-offer]'));
   $('[data-mlb-offer]').click();
   check('제안에 성공 확률·이적료·실패 애정도 안내',()=>mlbDialog.el.textContent.includes('100%')&&mlbDialog.el.textContent.includes('애정도 60 → 40'));
   mlbDialog.el.querySelector('[data-mlb-dismiss]').click();
   check('취소 시 선수·자금·기록 그대로',()=>JSON.stringify(t)===initial);
   $('[data-mlb-offer]').click();mlbDialog.el.querySelector('[data-mlb-confirm]').click();
   check('성공 결과 자동 표시·11명·이적료 한 번 지급',()=>mlbDialog.result.success&&t.players.length===11&&t.funds===funds+11000&&t.mlbHistory.length===1);
   check('선발 자리 보충·지난 경기 선수 보존',()=>t.lineup.length===9&&new Set(t.lineup.map(x=>x.id)).size===9&&t.lineup.every(x=>x.id!==p.id)&&m.completedRoster26.some(x=>x.id===p.id));
   mlbDialog.el.querySelector('[data-mlb-records]').click();
   check('진출 명단에 당시 능력·개인 기록 표시',()=>screen==='records'&&$('#mlbHistory').textContent.includes(p.name)&&$('#mlbHistory').textContent.includes('진출 당시 능력·기록'));
   check('확인 후 같은 결과 자동 반복 안 함',()=>!mlbDialog&&t.mlbHistory[0].seen);
   await new Promise(requestAnimationFrame);
   // Exercise production serialization and validation with an isolated memory store.
   t.mlbHistory[0].seen=false;const memory=new Map(),store=GameStorage.create({key:'mlb-test',storage:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},validate:validateRoot});
   check('새 MLB 자료가 실제 저장 검증을 통과',()=>store.write(data).ok);
   data=store.load().value;screen='home';render();
   check('불러온 미확인 결과 자동 표시',()=>!!mlbDialog?.result.success);
   mlbDialog.el.querySelector('[data-mlb-dismiss]').click();
   check('진출 수익과 누적 기록이 저장 후 유지',()=>team().funds===21000&&team().mlbHistory[0].player.stats.hr===4&&team().players.length===11);
   ({t,m,p}=setupMlbQA('failure'));
   $('[data-mlb-offer]').click();mlbDialog.el.querySelector('[data-mlb-confirm]').click();
   check('실패 안내·수입0·애정도 감소·선수 유지',()=>!mlbDialog.result.success&&p.loyalty===40&&t.funds===10000&&t.players.length===12);
   mlbDialog.el.querySelector('[data-mlb-dismiss]').click();
   $('[data-mlb-offer]').click();check('같은 경기 재도전 버튼 차단',()=>mlbDialog.el.querySelector('[data-mlb-confirm]').disabled);closeMlbDialog();
   data=clone(data);validateRoot(data);check('저장 복원 후에도 3경기 대기 유지',()=>mlbQuote(team(),p.id).remaining===3);
   ({t,m,p}=setupMlbQA('failure'));p.loyalty=10;render();$('[data-mlb-offer]').click();
   check('도전 전 애정도0 이적 경고',()=>mlbDialog.el.textContent.includes('0이 되어 팀을 떠납니다.'));
   mlbDialog.el.querySelector('[data-mlb-confirm]').click();
   check('실패로 애정도0이면 기존 이적 처리·기록 보존',()=>!t.players.some(x=>x.id===p.id)&&t.departed.some(x=>x.id===p.id)&&mlbDialog.result.left&&t.funds===10000);
   closeMlbDialog();
   ({t,m,p}=setupMlbQA());t.players=t.players.slice(0,9);render();$('[data-mlb-offer]').click();
   check('9명 이하 도전 차단',()=>mlbDialog.el.querySelector('[data-mlb-confirm]').disabled);closeMlbDialog();
   ({t,m,p}=setupMlbQA());m.done=false;m.paused=true;render();$('[data-mlb-offer]').click();
   check('일시정지한 경기 중에도 도전 차단',()=>mlbDialog.el.querySelector('[data-mlb-confirm]').disabled);closeMlbDialog();
   check('화면 오류 없음',()=>runtimeErrors.length===0);report.runtimeErrors=runtimeErrors.slice();report.passed=true;
  }catch(e){report.errors.push(e.message);report.passed=false;}
  finally{if(mlbDialog)closeMlbDialog();data=keep.data;screen=keep.screen;activeGame=keep.activeGame;selection=keep.selection;render();}
  panel.querySelector('[data-mlb-qa-report]').textContent=JSON.stringify(report,null,2);
 };
}

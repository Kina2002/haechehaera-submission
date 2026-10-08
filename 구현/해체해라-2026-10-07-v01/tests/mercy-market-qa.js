if(TEST_ONLY){
 const panel=document.createElement('section');panel.className='panel';panel.id='mercyMarketQA';
 panel.innerHTML='<h3>콜드게임·후보 갱신 검사 · 실제 저장과 분리</h3><button data-mm-run>변경 기능 통합 검사</button> <button data-mm-demo="win">콜드승 화면 확인</button> <button data-mm-demo="loss">콜드패 화면 확인</button> <button data-mm-demo="market">후보 갱신 화면 확인</button><pre data-mm-report style="white-space:pre-wrap"></pre>';
 document.body.append(panel);
 function setupMercyMarketQA(mode){
  if(mlbDialog)closeMlbDialog();if(clubEventView)closeClubEvent();$('#dialog')?.close();removeAchievementNotice();
  const {t,m,o}=fixture23();t.name='해체는 아직';t.setupStage='complete';t.funds=300;t.history=[];t.market=[];delete t.marketRound;
  t.balance.fanEventChance=0;t.facilities=[];t.debt=0;t.news=[];t.ledger=[];t.w=0;t.l=0;t.d=0;t.trophies=0;
  for(const tm of [t,o])for(const p of tm.players){p.a=Object.fromEntries(KEYS.map(k=>[k,50]));p.energy=50;p.contract=100;p.loyalty=70;}
  activeGame=true;anim=null;reaction=null;shiftLead=null;selection=t.players[0].id;
  if(mode==='market'){t.match=null;screen='market';render();return t;}
  const score=mode==='win'?[12,2]:[2,12];
  Object.assign(m,{home:0,inning:3,half:1,outs:2,strikes:2,score,command:'take',
   innings:[[score[0],0,0,null,null,null,null],[score[1],0,0,null,null,null,null]]});
  const originalR=r,originalBH=chooseBH;
  try{r=()=>.5;chooseBH=()=>null;resolvePitch(m);}finally{r=originalR;chooseBH=originalBH;}
  screen='result';render();return t;
 }
 panel.querySelectorAll('[data-mm-demo]').forEach(button=>button.onclick=()=>setupMercyMarketQA(button.dataset.mmDemo));
 panel.querySelector('[data-mm-run]').onclick=()=>{
  const keep={data,screen,activeGame,selection,anim,reaction,shiftLead},report={checks:[],errors:[]};
  const check=(name,ok)=>{if(!ok)throw Error(name);report.checks.push({name,ok:true});};
  try{
   let t=setupMercyMarketQA('win');
   check('콜드승 결과·종료 회차 표시',t.match.done&&t.match.mercy.margin===10&&$('#app').textContent.includes('콜드승')&&$('#app').textContent.includes('3회 종료'));
   check('일반 승리와 같은 승리 횟수 반영',t.w===1&&t.l===0);
   const record=JSON.parse(JSON.stringify(t.history[0]));check('기록에 콜드 종료 사유 보존',record.mercy.inning===3&&record.mercy.margin===10);
   screen='records';render();check('기록실 콜드승 표시',$('#app').textContent.includes('콜드승'));
   t=setupMercyMarketQA('loss');check('콜드패 결과·패배 횟수 반영',t.l===1&&t.w===0&&$('#app').textContent.includes('콜드패'));
   t=setupMercyMarketQA('market');const before=t.market.map(p=>p.id),roster=JSON.stringify(t.players);
   $('[data-v8="market-refresh"]').click();
   check('실제 버튼으로 100만원 차감·새 후보3명',t.funds===200&&t.market.length===3&&t.market.every(p=>!before.includes(p.id)));
   check('보유 선수 유지·재정 지출 기록',JSON.stringify(t.players)===roster&&t.ledger[0].amount===-100);
   const paid=t.market.map(p=>p.id);render();check('화면 재진입에 비용·후보 유지',t.funds===200&&JSON.stringify(paid)===JSON.stringify(t.market.map(p=>p.id)));
   validateRoot(JSON.parse(JSON.stringify(data)));check('새 후보 포함 저장·복원 형식 검사',true);
   t.funds=99;render();check('자금 부족 버튼 비활성',$('[data-v8="market-refresh"]').disabled);
   t.funds=300;t.match={done:false,paused:true};render();check('경기 일시정지 중 버튼 비활성',$('[data-v8="market-refresh"]').disabled);
   report.runtimeErrors=runtimeErrors.slice();
  }catch(error){report.errors.push(error.message);}
  finally{data=keep.data;screen=keep.screen;activeGame=keep.activeGame;selection=keep.selection;anim=keep.anim;reaction=keep.reaction;shiftLead=keep.shiftLead;render();}
  panel.querySelector('[data-mm-report]').textContent=JSON.stringify(report,null,2);
 };
}

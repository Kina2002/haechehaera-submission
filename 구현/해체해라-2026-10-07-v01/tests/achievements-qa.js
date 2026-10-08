if(TEST_ONLY){
 const panel=document.createElement('section');panel.className='panel';panel.id='achievementsQA';
 panel.innerHTML='<h3>업적 검사 · 실제 저장과 분리</h3><button data-ach-qa-run>업적 전체 흐름 검사</button> <button data-ach-qa-demo="empty">새 구단 업적 보기</button> <button data-ach-qa-demo="legacy">진행 구단 업적 보기</button> <button data-ach-qa-demo="notice">업적 달성 알림 보기</button> <button data-ach-qa-demo="expanded">새 업적 달성 화면 보기</button><pre data-ach-qa-report style="white-space:pre-wrap"></pre>';
 document.body.append(panel);let achievementQaMatch=null;
 function setupAchievementsQA(mode='empty'){
  if(mlbDialog)closeMlbDialog();if(clubEventView)closeClubEvent();$('#dialog')?.close();removeAchievementNotice();
  const {t,m}=fixture23();achievementQaMatch=m;t.name='해체는 없다';t.match=null;t.w=0;t.l=0;t.d=0;t.trophies=0;t.history=[];t.news=[];t.mlbHistory=[];t.departed=[];t.facilities=[];t.funds=100000;delete t.achievements;delete t.achievementStreaks;
  for(const p of t.players){p.a=Object.fromEntries(KEYS.map(k=>[k,50]));p.energy=50;p.stats=freshStats();p.contract=100;p.loyalty=70;}
  t.balance.fanEventChance=0;activeGame=true;screen='achievements';selection=t.players[0].id;
  if(['notice','legacy'].includes(mode)){
   if(mode==='notice')syncAchievements(t);
   t.w=12;t.l=8;t.d=1;t.trophies=12;t.facilities=['bat','field','pitch','shower','fans'];t.players[0].stats={...freshStats(),games:21,h:72,ab:160,hr:10};
  }
  if(mode==='expanded'){
   t.players[0].name='박끝까지';t.players[0].a.contact=100;
   t.history=[{id:'badge-demo',opp:'매운 공 야구단',score:[2,12],bh:0,mercy:{inning:3,margin:10},recap:{box:{[t.players[0].id]:{id:t.players[0].id,name:t.players[0].name,number:t.players[0].number,h:3}},highlights:[]}}];t.l=1;
  }
  render();return t;
 }
 panel.querySelectorAll('[data-ach-qa-demo]').forEach(b=>b.onclick=()=>{setupAchievementsQA(b.dataset.achQaDemo);if(b.dataset.achQaDemo==='legacy'){acknowledgeAchievements(team(),pendingAchievements(team()).map(x=>x.id));render();}});
 panel.querySelector('[data-ach-qa-run]').onclick=async()=>{
  const keep={data:clone(data),screen,activeGame,selection},report={checks:[],errors:[]};
  const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
  const check=(name,fn)=>{if(!fn())throw Error(name);report.checks.push({name,ok:true});};
  try{
   let t=setupAchievementsQA();await tick();
   check('새 구단 업적42개·달성0·불필요한 알림 없음',()=>$$('[data-achievement]').length===42&&t.achievements.unlocked.length===0&&!achievementNotice);
   check('미달성 이름만 공개·조건과 진행도 숨김',()=>$$('.ach-card.locked').every(el=>el.querySelector('h3')&&!el.querySelector('progress,.ach-date,.ach-proof')&&el.querySelector('p').textContent==='달성하면 조건이 공개됩니다.'));
   $('#header [data-go="home"]').click();check('구단 홈에서 업적 바로가기',()=>!!$('.ach-summary [data-go="achievements"]'));
   $('.ach-summary [data-go="achievements"]').click();check('상단·홈 업적 화면 연결',()=>screen==='achievements'&&$('#header [data-go="achievements"]').classList.contains('active'));
   $('[data-ach-filter="earned"]').click();check('달성 목록의 빈 상태',()=>!!$('.ach-empty'));
   $('[data-ach-filter="all"]').click();
   const p=t.players[0];p.a.contact=p.a.power=p.a.eye=90;p.stats.games=5;t.balance.mlbBaseChance=t.balance.mlbMaxChance=1;
   const funds=t.funds,result=completeMlbAttempt(t,mlbQuote(t,p.id),()=>0);save();render();await tick();
   check('MLB 성공 경로에서 업적1개와 이적료만 반영',()=>result.ok&&t.achievements.unlocked.length===1&&t.achievements.unlocked[0].id==='mlb-1'&&t.funds===funds+11000&&t.trophies===0);
   showMlbResult(result.result);updateAchievementNotice();
   check('MLB 결과를 볼 때 업적 알림 숨김',()=>getComputedStyle(achievementNotice.el).display==='none');
   closeMlbDialog();await tick();check('MLB 결과 확인 후 업적 알림 표시',()=>getComputedStyle(achievementNotice.el).display!=='none');
   achievementNotice.el.querySelector('[data-ach-open]').click();await tick();
   check('업적 보기로 확인·재표시 방지',()=>screen==='achievements'&&pendingAchievements(t).length===0&&!achievementNotice);
   $('[data-ach-group]').value='MLB 진출';$('[data-ach-group]').dispatchEvent(new Event('change',{bubbles:true}));
   check('분야 필터는 MLB3개만 표시',()=>$$('[data-achievement]').length===3);
   $('[data-ach-filter="earned"]').click();check('분야·달성 필터 조합',()=>$$('[data-achievement]').length===1);
   t=setupAchievementsQA('legacy');await tick();
   check('기존 기록8개 인정·날짜 구분·알림 하나',()=>t.achievements.unlocked.length===8&&t.achievements.unlocked.every(x=>x.retroactive)&&$$('.achievement-notice').length===1&&$('.ach-date').textContent.includes('기존 기록 인정'));
   const before=clone(data),memory=new Map(),store=GameStorage.create({key:'achievement-test',storage:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},validate:validateRoot});
   validateRoot(JSON.parse(JSON.stringify(data)));check('실제 저장 검사·두 저장칸 유지',()=>store.write(data).ok);
   removeAchievementNotice();data=store.load().value;t=team();render();await tick();
   check('불러오기 후 미확인 업적8개 복원',()=>pendingAchievements(t).length===8&&achievementNotice.ids.length===8&&t.funds===before.slots[before.current].funds);
   $('[data-ach-read-all]').click();await tick();render();await tick();
   check('모두 확인 후 재등장 없음·수치 그대로',()=>!achievementNotice&&!pendingAchievements(t).length&&t.w===12&&t.trophies===12&&t.funds===100000);
   store.write(data);data=store.load().value;render();await tick();check('확인 상태도 저장 후 유지',()=>!achievementNotice&&!pendingAchievements(team()).length);
   const firstSlot=JSON.stringify(data.slots[0]);data.slots[1]=newTeam('두 번째 구단',4,5);data.current=1;screen='achievements';render();await tick();
   check('다른 구단은 업적0개·첫 구단 기록 불변',()=>team().achievements.unlocked.length===0&&JSON.stringify(data.slots[0])===firstSlot&&!achievementNotice);
   data.current=0;render();await tick();check('저장칸 전환 후 원래 업적8개 복원',()=>team().achievements.unlocked.length===8&&$('.ach-total strong').textContent==='8 / 42');
   const raw=JSON.stringify(data);data.slots[data.current].achievements.unlocked.push(clone(data.slots[data.current].achievements.unlocked[0]));
   check('중복 업적 불러오기 거부·정상본 복구',()=>{store.write(data);const loaded=store.load();return loaded.status==='recovered'&&loaded.value.slots[loaded.value.current].achievements.unlocked.length===8;});data=JSON.parse(raw);
   t=setupAchievementsQA();let m=t.match=achievementQaMatch;
   if(!m)throw Error('검사 경기 생성 실패');
   m.score=[2,1];m.done=true;m.balls=m.strikes=0;m.outs=0;reward(m);save();screen='result';render();await tick();
   check('실제 경기 결산 첫 경기·첫 승 동시 달성',()=>t.achievements.unlocked.some(x=>x.id==='games-1')&&t.achievements.unlocked.some(x=>x.id==='wins-1')&&t.w===1&&t.trophies===1);
   const won=JSON.stringify(t.achievements),cash=t.funds;reward(m);save();render();await tick();
   check('결산 재호출에도 업적·자금 중복 없음',()=>JSON.stringify(t.achievements)===won&&cash===t.funds);
   acknowledgeAchievements(t,pendingAchievements(t).map(x=>x.id));removeAchievementNotice();
   t=setupAchievementsQA();m=t.match=achievementQaMatch;m.paused=true;t.players[0].stats.hr=10;save();screen='home';render();await tick();
   check('진행·일시정지 경기 활약은 종료까지 알림 보류',()=>!t.achievements.unlocked.length&&!achievementNotice);
   m.done=true;m.score=[0,1];reward(m);save();screen='result';render();await tick();
   check('경기 종료 후 선수 활약 달성',()=>t.achievements.unlocked.some(x=>x.id==='homers-10'));
   acknowledgeAchievements(t,pendingAchievements(t).map(x=>x.id));removeAchievementNotice();
   t=setupAchievementsQA();go('facilities');
   const build=$('[data-v8="build"]');if(!build)throw Error('시설 건설 버튼 없음');build.click();
   check('실제 시설 건설에서 첫 시설 업적 달성',()=>t.facilities.length===1&&t.achievements.unlocked.some(x=>x.id==='facilities-1'));
   t=setupAchievementsQA();t.players[0].a.contact=99;t.facilities=['bat'];go('growth');
   $('[data-v8="train"][data-stat="contact"]').click();
   check('실제 훈련 버튼으로 컨택100 업적 달성',()=>t.players[0].a.contact===100&&t.achievements.unlocked.some(x=>x.id==='stat-contact-100'));
   const hire=player(false,t.players.map(p=>p.number));hire.a.power=100;hire.price=100;t.market=[hire];t.marketRound=t.w+t.l+t.d;go('market');
   check('영입 후보의100은 미달성',()=>!t.achievements.unlocked.some(x=>x.id==='stat-power-100'));
   $('[data-v8="hire"][data-id="'+hire.id+'"]').click();
   check('실제 영입 버튼으로 파워100 업적 달성',()=>t.players.some(p=>p.id===hire.id)&&t.achievements.unlocked.some(x=>x.id==='stat-power-100'));
   go('achievements');await tick();
   check('달성 뒤 조건·선수 증거 공개',()=>$('[data-achievement="stat-contact-100"]').textContent.includes('컨택 100')&&$('[data-achievement="stat-power-100"] .ach-proof').textContent.includes(hire.name));
   t=setupAchievementsQA();m=t.match=achievementQaMatch;t.setupStage='complete';
   Object.assign(m,{home:0,inning:3,half:1,outs:2,strikes:2,score:[2,12],command:'take',innings:[[2,0,0,null,null,null,null],[12,0,0,null,null,null,null]]});
   const oldR=r,oldBH=chooseBH;try{r=()=>.5;chooseBH=()=>null;resolvePitch(m);}finally{r=oldR;chooseBH=oldBH;}
   save();screen='achievements';render();await tick();
   check('실제 투구로 콜드패 종료·새 업적 동시 판정',()=>m.done&&m.mercy&&t.l===1&&t.achievements.unlocked.some(x=>x.id==='mercy-loss-1'));
   validateRoot(JSON.parse(JSON.stringify(data)));const persisted=clone(data);store.write(data);data=store.load().value;t=team();
   check('실제 결산의 경기 업적·연패·알림 저장 복원',()=>!!data&&t.achievementStreaks.loss===1&&t.history[0].achievementStats.version===1&&JSON.stringify(t.achievements)===JSON.stringify(persisted.slots[0].achievements));
   screen='achievements';render();await tick();
   check('콜드패 카드에 조건·상대·점수 공개',()=>$('[data-achievement="mercy-loss-1"] .ach-proof').textContent.includes('2 : 12')&&$('[data-achievement="mercy-loss-1"]').textContent.includes('우리 팀의 첫 콜드패'));
   screen='slots';activeGame=false;render();await tick();check('저장칸 선택 화면에서 업적 알림 숨김',()=>!achievementNotice);
   report.rules=ruleChecks();report.contracts=checks26();
   check('기존 경기52·계약15 검사',()=>report.rules.every(x=>x.ok)&&report.contracts.passed===report.contracts.total);
   report.runtimeErrors=runtimeErrors.slice();check('화면 오류 없음',()=>!report.runtimeErrors.length);report.passed=true;
  }catch(e){report.passed=false;report.errors.push(e.message);}
  finally{if(mlbDialog)closeMlbDialog();if(clubEventView)closeClubEvent();$('#dialog')?.close();removeAchievementNotice();data=keep.data;screen=keep.screen;activeGame=keep.activeGame;selection=keep.selection;render();}
  panel.querySelector('[data-ach-qa-report]').textContent=JSON.stringify(report,null,2);
 };
}

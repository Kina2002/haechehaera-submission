// Game balance only: these are fictional scouting rules, not real MLB requirements.
Object.assign(BALANCE,{mlbMinAbility:75,mlbMinGames:5,mlbBaseChance:.35,mlbChancePerPoint:.02,mlbMaxChance:.85,mlbBaseFee:5000,mlbFeePerPoint:400,mlbFailureLoyalty:20,mlbRetryGames:3});
Object.assign(BALANCE_LABELS,{mlbMinAbility:'MLB · 주요 3능력 평균 조건',mlbMinGames:'MLB · 최소 출전 경기',mlbBaseChance:'MLB · 기본 성공 확률',mlbChancePerPoint:'MLB · 평균 1점당 성공 확률 증가',mlbMaxChance:'MLB · 최대 성공 확률',mlbBaseFee:'MLB · 기본 이적료',mlbFeePerPoint:'MLB · 평균 1점당 추가 이적료',mlbFailureLoyalty:'MLB · 실패 애정도 감소',mlbRetryGames:'MLB · 재도전까지 구단 경기 수'});
function mlbSettingsError(b={}){
 const v={...BALANCE,...b};
 if(!Number.isFinite(v.mlbMinAbility)||v.mlbMinAbility<1||v.mlbMinAbility>100)return 'MLB 능력 조건은 1~100입니다.';
 if(['mlbMinGames','mlbRetryGames'].some(k=>!Number.isInteger(v[k])||v[k]<1))return 'MLB 출전·재도전 경기 수는 1 이상 정수입니다.';
 if(['mlbBaseChance','mlbChancePerPoint','mlbMaxChance'].some(k=>!Number.isFinite(v[k])||v[k]<0||v[k]>1)||v.mlbBaseChance>v.mlbMaxChance)return 'MLB 확률은 0~1이며 기본 확률은 최대 확률 이하여야 합니다.';
 if(!Number.isInteger(v.mlbFailureLoyalty)||v.mlbFailureLoyalty<0||v.mlbFailureLoyalty>100)return 'MLB 실패 애정도 감소는 0~100 정수입니다.';
 if(['mlbBaseFee','mlbFeePerPoint'].some(k=>!Number.isSafeInteger(v[k])||v[k]<0))return 'MLB 이적료는 0 이상, 1만 원 단위입니다.';
 return '';
}
function mlbRules(t){
 const b=balance(t);
 return {minAbility:clamp(b.mlbMinAbility,1,100),minGames:Math.max(1,Math.round(b.mlbMinGames)),
  baseChance:clamp(b.mlbBaseChance,0,1),chancePerPoint:clamp(b.mlbChancePerPoint,0,1),maxChance:clamp(b.mlbMaxChance,0,1),
  baseFee:Math.max(0,Math.round(b.mlbBaseFee)),feePerPoint:Math.max(0,Math.round(b.mlbFeePerPoint)),
  failureLoyalty:clamp(Math.round(b.mlbFailureLoyalty),0,100),retryGames:Math.max(1,Math.round(b.mlbRetryGames))};
}
function mlbClubGames(t){return t.w+t.l+t.d;}
function mlbAssessment(p){
 const batting=(p.a.contact+p.a.power+p.a.eye)/3,pitching=(p.a.velocity+p.a.control+p.a.stamina)/3;
 return {batting,pitching,role:batting>=pitching?'타자':'투수',score:Math.max(batting,pitching)};
}
function mlbQuote(t,id){
 const p=t?.players.find(x=>x.id===id);if(!p)return null;
 const rules=mlbRules(t),assessment=mlbAssessment(p),games=mlbClubGames(t),reasons=[];
 const remaining=Math.max(0,(p.mlbAttempt?.nextGame||0)-games);
 if(live(t))reasons.push('경기가 끝난 뒤 도전할 수 있습니다.');
 if(needsSetup(t))reasons.push('첫 선수 준비와 라인업 편성을 마쳐 주세요.');
 if(t.players.length<=9)reasons.push('진출 뒤에도 9명이 남도록 선수를 먼저 영입해 주세요.');
 if(p.loyalty<=0||p.exitPending26)reasons.push('팀을 떠날 예정인 선수는 도전할 수 없습니다.');
 if(p.contract<=0)reasons.push('계약이 만료되었습니다. 먼저 재계약해 주세요.');
 if(p.stats.games<rules.minGames)reasons.push('출전 '+p.stats.games+'/'+rules.minGames+'경기 · 경기 경험이 더 필요합니다.');
 if(assessment.score<rules.minAbility)reasons.push('주요 3능력 평균 '+rules.minAbility+' 이상이 필요합니다.');
 if(remaining)reasons.push('구단이 '+remaining+'경기를 더 마친 뒤 재도전할 수 있습니다.');
 const excess=Math.max(0,assessment.score-rules.minAbility);
 const chance=Math.round(clamp(rules.baseChance+excess*rules.chancePerPoint,0,rules.maxChance)*100)/100;
 const fee=Math.round(rules.baseFee+excess*rules.feePerPoint);
 const quote={teamId:t.id,playerId:id,playerName:p.name,rules,...assessment,chance,fee,games,remaining,reasons,eligible:!reasons.length,loyalty:p.loyalty,roster:t.players.length};
 // A quote is only valid for the exact terms and roster that the user reviewed.
 quote.stamp=JSON.stringify([t.id,id,p.name,p.number,p.a,p.stats,p.loyalty,p.contract,p.mlbAttempt||null,t.players.map(x=>x.id),t.lineup,games,rules]);
 return quote;
}
function completeMlbAttempt(t,quote,random=Math.random){
 if(!quote||quote.teamId!==t?.id)return {ok:false,message:'현재 구단에서 다시 확인해 주세요.'};
 const current=mlbQuote(t,quote.playerId);
 if(!current)return {ok:false,message:'이미 팀을 떠난 선수입니다.'};
 if(!current.eligible)return {ok:false,message:current.reasons[0]};
 if(current.stamp!==quote.stamp)return {ok:false,message:'선수나 구단 조건이 바뀌었습니다. 다시 확인해 주세요.'};
 const roll=random();if(!Number.isFinite(roll)||roll<0||roll>=1)return {ok:false,message:'도전 결과를 정하지 못했습니다. 다시 확인해 주세요.'};
 const p=t.players.find(x=>x.id===current.playerId),success=roll<current.chance;
 const at=Date.now(),id=uid(),before=p.loyalty,after=success?before:Math.max(0,before-current.rules.failureLoyalty);
 const result={id,player:clone(p),primary:t.primary,secondary:t.secondary,role:current.role,score:current.score,chance:current.chance,
  success,offeredFee:current.fee,fee:success?current.fee:0,at,atGame:current.games,nextGame:current.games+current.rules.retryGames,
  loyaltyBefore:before,loyaltyAfter:after,left:success||after===0,seen:false};
 t.mlbHistory??=[];t.mlbHistory.push(result);
 p.mlbAttempt={id,nextGame:result.nextGame};
 if(success){
  snapshotRoster26(t);
  p.departureKind='mlb';p.departedAt26=at;t.departed??=[];t.departed.push(p);
  t.players=t.players.filter(x=>x.id!==p.id);repairRoster26(t);
  gain(t,result.fee,p.name+' MLB 진출 이적료');
  news(t,p.name+' MLB 진출 확정',money(result.fee)+' 수령 · 함께한 '+p.stats.games+'경기의 기록은 MLB 진출 명단에 남습니다.');
 }else{
  p.loyalty=after;
  news(t,p.name+' MLB 진출 협상 불발','계약으로 이어지지 않아 선수의 구단 애정도가 '+(before-after)+' 감소했습니다. '+before+' → '+after+'.');
  if(after===0)departUnhappy26(t);
 }
 if(!t.players.some(x=>x.id===selection))selection=t.players[0]?.id||null;
 return {ok:true,result};
}
function validateMlbState(t){
 const error=mlbSettingsError(t.balance);if(error)throw Error(error);
 const validInt=x=>Number.isSafeInteger(x)&&x>=0;
 for(const p of t.players)if(p.mlbAttempt&&(!p.mlbAttempt.id||typeof p.mlbAttempt.id!=='string'||!validInt(p.mlbAttempt.nextGame)))throw Error('MLB 재도전 기록 오류');
 if(t.mlbHistory===undefined)return;
 if(!Array.isArray(t.mlbHistory))throw Error('MLB 기록 형식 오류');
 const ids=new Set(),graduates=new Set();
 for(const h of t.mlbHistory){
  if(!h||typeof h.id!=='string'||!h.id||ids.has(h.id)||!['타자','투수'].includes(h.role)||typeof h.success!=='boolean'||typeof h.seen!=='boolean'||typeof h.left!=='boolean'||
   !Number.isFinite(h.score)||h.score<1||h.score>100||!Number.isFinite(h.chance)||h.chance<0||h.chance>1||
   ![h.fee,h.offeredFee,h.at,h.atGame,h.nextGame].every(validInt)||h.nextGame<=h.atGame||
   ![h.loyaltyBefore,h.loyaltyAfter].every(x=>Number.isFinite(x)&&x>=0&&x<=100)||h.loyaltyAfter>h.loyaltyBefore||
   !Number.isInteger(h.primary)||!COLORS[h.primary]||!Number.isInteger(h.secondary)||!COLORS[h.secondary])throw Error('MLB 기록 값 오류');
  validatePlayer(h.player);
  if(!h.player.appearance||!Number.isInteger(h.player.appearance.body)||h.player.appearance.body<0||h.player.appearance.body>5)throw Error('MLB 선수 외형 오류');
  for(const key of Object.keys(CharacterRenderer.variants)){const part=h.player.appearance.parts?.[key];if(!Number.isInteger(part)||part< -1||part>=CharacterRenderer.variants[key].length)throw Error('MLB 선수 파츠 오류');}
  if(h.success){
   if(h.fee!==h.offeredFee||!h.left||h.loyaltyAfter!==h.loyaltyBefore||graduates.has(h.player.id)||t.players.some(p=>p.id===h.player.id))throw Error('MLB 진출 선수 중복 또는 이적료 오류');
   graduates.add(h.player.id);
  }else if(h.fee!==0||h.left!==(h.loyaltyAfter===0))throw Error('MLB 실패 기록 오류');
  ids.add(h.id);
 }
}

// UI integration. Reading an offer, cancelling or replaying results never rolls a result.
const balanceUnitBeforeMlb=balanceUnit;
balanceUnit=function(key){return ['mlbBaseFee','mlbFeePerPoint'].includes(key)?WON_PER_UNIT:balanceUnitBeforeMlb(key);};
const validateTeamBeforeMlb=validateTeam;
validateTeam=function(t){validateTeamBeforeMlb(t);validateMlbState(t);};
let mlbDialog=null;
function mlbNumber(n){return n.toFixed(1);}
function mlbConditionsHTML(q){
 return '<div class="mlb-conditions"><div><span>타격 · 컨택 / 파워 / 선구안</span><b>'+mlbNumber(q.batting)+'</b></div><div><span>투구 · 구속 / 제구 / 스태미나</span><b>'+mlbNumber(q.pitching)+'</b></div></div>'+
  '<p class="tiny muted">둘 중 높은 평균 '+q.rules.minAbility+' 이상 · '+q.rules.minGames+'경기 이상 출전 · 진출 후 최소 9명 유지</p>';
}
function mlbProfileHTML(t,p){
 const q=mlbQuote(t,p.id);
 return '<section class="mlb-profile"><div class="row between wrap"><h3>MLB 진출</h3><span class="pill">'+(q.eligible?'도전 가능':'준비 중')+'</span></div>'+mlbConditionsHTML(q)+
  (q.eligible?'<p>성공률 <b class="gold">'+Math.round(q.chance*100)+'%</b> · 이적료 <b>'+money(q.fee)+'</b></p>':'<p class="mlb-reason">'+esc(q.reasons[0])+'</p>')+
  '<button class="'+(q.eligible?'primary':'small')+'" data-mlb-offer="'+esc(p.id)+'">'+(q.eligible?'MLB 진출 제안 보기':'MLB 진출 조건 보기')+'</button><button class="small ghost" data-mlb-records>진출 명단 보기</button></section>';
}
const playersBeforeMlb=playersArtworkHTML;
playersArtworkHTML=function(t){
 const html=playersBeforeMlb(t),p=t.players.find(x=>x.id===selection)||t.players[0];if(!p)return html;
 const root=document.createElement('div');root.innerHTML=html;
 root.querySelector('.pagehead')?.insertAdjacentHTML('beforeend','<div class="row wrap mlb-shortcuts"><button class="primary" data-mlb-offer="'+esc(p.id)+'">MLB 진출</button><button data-mlb-records>진출 명단</button></div>');
 root.querySelector('.profile26')?.insertAdjacentHTML('beforeend',mlbProfileHTML(t,p));return root.innerHTML;
};
function mlbPortraitHTML(entry){return '<canvas data-mlb-portrait="'+esc(entry.id)+'" width="240" height="320" role="img" aria-label="'+esc(entry.player.name)+(entry.success?' 진출 당시 모습':' 도전 당시 모습')+'"></canvas>';}
function paintMlbPortraits(){
 for(const cv of $$('canvas[data-mlb-portrait]')){
  const h=team()?.mlbHistory?.find(x=>x.id===cv.dataset.mlbPortrait)||mlbDialog?.portrait;
  if(h&&charsReady&&ART.ready)paintDetail(cv,h.player,{primary:h.primary,secondary:h.secondary,players:[h.player]});
 }
}
function mlbHistoryHTML(t){
 const all=t.mlbHistory||[],successes=all.filter(x=>x.success),total=successes.reduce((sum,x)=>sum+x.fee,0);
 return '<section class="panel mlb-history" id="mlbHistory"><div class="row between wrap"><div><p class="eyebrow">OUR PLAYERS, A BIGGER STAGE</p><h2>MLB 진출 명단</h2></div><p><b class="gold">'+successes.length+'명</b> · 누적 이적료 '+money(total)+'</p></div>'+
  (successes.length?'<div class="mlb-hall">'+successes.slice().reverse().map(h=>'<article class="mlb-graduate">'+mlbPortraitHTML(h)+'<div><span class="mlb-tag">MLB 진출 · '+h.role+'</span><h3>#'+h.player.number+' '+esc(h.player.name)+'</h3><p>구단 '+h.atGame+'경기째 · 개인 출전 '+h.player.stats.games+'경기</p><strong class="gold">'+money(h.fee)+'</strong><details><summary>진출 당시 능력·기록</summary>'+statBars(h.player)+playerRecords(h.player)+'</details></div></article>').join('')+'</div>':'<p class="muted mlb-empty">아직 MLB로 진출한 선수가 없습니다. 선수 관리에서 도전 조건을 확인하세요.</p><button class="small" data-go="players">선수 관리</button>')+
  (all.length?'<details class="mlb-attempt-log"><summary>최근 MLB 도전 기록</summary>'+all.slice(-20).reverse().map(h=>'<p><b>'+esc(h.player.name)+'</b> · 구단 '+h.atGame+'경기째 · '+(h.success?'진출 성공 · '+money(h.fee):'협상 불발 · 애정도 '+h.loyaltyBefore+' → '+h.loyaltyAfter+(h.left?' · 팀을 떠남':''))+'</p>').join('')+'</details>':'')+'</section>';
}
function closeMlbDialog(){
 const state=mlbDialog;if(!state)return;mlbDialog=null;
 if(state.result){state.result.seen=true;save();}
 state.el.close();state.el.remove();
 state.focus?.isConnected&&state.focus.focus({preventScroll:true});
}
function createMlbDialog(title,body,kind){
 if(mlbDialog)return null;
 const el=document.createElement('dialog');el.className='mlb-dialog';el.setAttribute('aria-labelledby','mlbDialogTitle');
 el.innerHTML='<article class="mlb-dialog-card '+kind+'"><p class="eyebrow">NEXT CHAPTER</p><h2 id="mlbDialogTitle">'+esc(title)+'</h2>'+body+'</article>';
 const state=mlbDialog={el,focus:document.activeElement,teamId:team().id};document.body.append(el);el.showModal();
 el.addEventListener('cancel',e=>{e.preventDefault();closeMlbDialog();});
 el.addEventListener('click',e=>{const b=e.target.closest('[data-mlb-dismiss],[data-mlb-records]');if(!b)return;const records=b.hasAttribute('data-mlb-records');closeMlbDialog();if(records)go('records');});
 return state;
}
function showMlbOffer(id){
 const t=team(),p=t?.players.find(x=>x.id===id),q=mlbQuote(t,id);if(!p||!q)return;
 const after=Math.max(0,p.loyalty-q.rules.failureLoyalty);
 const state=createMlbDialog(p.name+' · MLB 진출 제안',
  '<div class="mlb-offer-player"><canvas data-mlb-portrait="offer" width="240" height="320" role="img" aria-label="'+esc(p.name)+' 선수"></canvas><div><span class="mlb-tag">'+q.role+' 평가</span><h3>주요 능력 평균 '+mlbNumber(q.score)+'</h3>'+mlbConditionsHTML(q)+'<p>현재 출전 '+p.stats.games+'경기 · 구단 선수 '+t.players.length+'명 → 성공 후 '+(t.players.length-1)+'명</p></div></div>'+
  '<div class="mlb-offer-terms"><div><span>성공 확률</span><strong>'+Math.round(q.chance*100)+'%</strong></div><div><span>성공 시 구단 수입</span><strong>'+money(q.fee)+'</strong></div></div>'+
  '<p class="mlb-notice">성공하면 이 선수는 구단을 떠납니다. 능력과 누적 기록은 진출 명단에 보관하고, 빈 선발 자리는 후보 선수로 채웁니다.</p>'+
  '<p class="mlb-risk">실패하면 자금 수입 없이 애정도 '+p.loyalty+' → '+after+' ('+(after-p.loyalty)+'). '+(after===0?'애정도가 0이 되어 팀을 떠납니다.':q.rules.retryGames+'경기 뒤 재도전할 수 있습니다.')+'</p>'+
  (q.reasons.length?'<ul class="mlb-reasons">'+q.reasons.map(x=>'<li>'+esc(x)+'</li>').join(''):'')+
  '<p class="mlb-error" role="status"></p><div class="mlb-buttons"><button data-mlb-dismiss>취소</button><button class="primary" data-mlb-confirm '+(q.eligible?'':'disabled')+'>MLB 진출 도전</button></div>','offer');
 if(!state)return;state.portrait={player:p,primary:t.primary,secondary:t.secondary};paintMlbPortraits();state.el.querySelector('[data-mlb-dismiss]').focus();
 state.el.querySelector('[data-mlb-confirm]').onclick=e=>{
  if(mlbDialog!==state||team()?.id!==state.teamId)return;
  e.currentTarget.disabled=true;const attempt=completeMlbAttempt(team(),q);
  if(!attempt.ok){state.el.querySelector('.mlb-error').textContent=attempt.message;return;}
  closeMlbDialog();save();render();showMlbResult(attempt.result);
 };
}
function showMlbResult(h){
 if(mlbDialog||!h)return;
 const state=createMlbDialog(h.success?'MLB 진출 확정!':'MLB 진출 협상 불발',
  '<div class="mlb-result-player">'+mlbPortraitHTML(h)+'<div><span class="mlb-tag">'+(h.success?'우리 구단이 키운 선수':'다음 도전을 준비하며')+'</span><h3>#'+h.player.number+' '+esc(h.player.name)+'</h3><p>'+(h.success?'함께한 '+h.player.stats.games+'경기, 이제 더 큰 무대로.':'관심을 보였던 구단과 최종 계약으로 이어지지 않았습니다.')+'</p><strong class="mlb-result-value">'+(h.success?'+'+money(h.fee):'애정도 '+h.loyaltyBefore+' → '+h.loyaltyAfter)+'</strong></div></div>'+
  '<p class="mlb-notice">'+(h.success?'이적료를 받았습니다. 선수의 모습·능력·누적 기록은 기록실의 MLB 진출 명단에서 다시 볼 수 있습니다.':h.left?'실패로 애정도가 0이 되어 팀을 떠났습니다. 이전 기록은 보존됩니다.':'선수는 구단에 남습니다. 구단이 '+Math.max(0,h.nextGame-mlbClubGames(team()))+'경기를 더 마친 뒤 재도전할 수 있습니다.')+'</p>'+
  '<div class="mlb-buttons">'+(h.success?'<button data-mlb-records>진출 명단 보기</button>':'')+'<button class="primary" data-mlb-dismiss>확인</button></div>',h.success?'success':'failure');
 if(!state)return;state.result=h;paintMlbPortraits();state.el.querySelector('[data-mlb-dismiss]').focus();
}
const renderBeforeMlb=render;
render=function(){
 renderBeforeMlb();const t=activeGame?team():null;if(!t)return;
 if(screen==='records')$('#app').insertAdjacentHTML('afterbegin',mlbHistoryHTML(t));
 paintMlbPortraits();
 if(!mlbDialog&&!$('#dialog')?.open&&!clubEventView&&!entrance&&['home','players','records','news','result'].includes(screen)){
  const pending=t.mlbHistory?.find(h=>!h.seen);if(pending)showMlbResult(pending);
 }
};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-mlb-offer],[data-mlb-records]');if(!b||b.disabled||b.closest('.mlb-dialog'))return;
 if(b.hasAttribute('data-mlb-offer'))showMlbOffer(b.dataset.mlbOffer);else go('records');
});

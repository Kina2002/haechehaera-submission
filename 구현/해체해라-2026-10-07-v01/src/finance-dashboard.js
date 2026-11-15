// A7: keep ticket changes and the club's money details in the existing finance tab.
// Game money and attendance use units of 10,000 won and 10 spectators respectively.
function financeTicketQuote(t,ticket=t.ticket){
 const b=balance(t),capacity=t.stadium*200;
 const fans=t.players.reduce((sum,p)=>sum+p.fans,0);
 const demand=Math.max(0,(fans*.3+80)*crowdDemand(t)*(b.ticketBase/ticket)**1.8);
 const crowd=Math.round(clamp(demand,0,capacity));
 return {demand:Math.round(demand),capacity,crowd,soldOut:crowd>=capacity,gate:crowd*ticket};
}
function financeTicketPanel(t){
 const q=financeTicketQuote(t),basis=budgetFixture(t),away=basis.available&&basis.home===1;
 return '<section class="panel finance-ticket" aria-labelledby="finance-ticket-title">'+
  '<div class="finance-section-head"><div><h3 id="finance-ticket-title">입장료와 관객 수요</h3><p class="muted">'+(away?'다음 홈경기 기준':'현재 선수단 기준 홈경기 예상')+' · 가격을 바꾸면 저장 전에 예상값이 달라집니다.</p></div></div>'+
  '<div class="finance-ticket-controls"><label for="ticketPrice">입장료 (원)<input id="ticketPrice" type="number" inputmode="numeric" min="1000" max="50000" step="1000" value="'+ticketInput(t.ticket)+'" '+(live(t)?'disabled':'')+'></label><button class="primary" data-v8="ticket" '+(live(t)?'disabled':'')+'>입장료 저장</button></div>'+
  '<p class="finance-ticket-state" data-finance-ticket="state" role="status" aria-live="polite">'+(live(t)?'경기가 끝나면 입장료를 바꿀 수 있습니다.':'현재 저장된 입장료 기준')+'</p>'+
  '<div class="finance-ticket-metrics"><div><small>관객 수요 · 좌석 제한 전</small><strong data-finance-ticket="demand">'+spectators(q.demand)+'명</strong></div><div><small>좌석</small><strong data-finance-ticket="capacity">'+spectators(q.capacity)+'석</strong></div><div><small>예상 홈 관중</small><strong data-finance-ticket="crowd">'+spectators(q.crowd)+'명</strong></div><div><small>매진 예상</small><strong data-finance-ticket="sold-out">'+(q.soldOut?'매진':'여유 좌석')+'</strong></div></div>'+
  '<div class="finance-ticket-gate"><span>예상 홈 입장 수입</span><strong data-finance-ticket="gate">'+money(q.gate)+'</strong></div>'+
  '<p class="tiny muted">입장 수입은 홈경기 기준입니다. 다음 경기 예상 손익에는 저장한 입장료만 반영됩니다. 실제 관중은 경기 전 팬 수에 따라 달라질 수 있습니다.</p></section>';
}
function financeFacilityCostsHTML(t){
 const rows=facilityUpkeepRows(t,null),away=facilityNextAway(t),total=facilityUpkeepTotal(t,null);
 const upkeep=rows.length?rows.map(({id,amount})=>{const def=facilityDef(id),level=facilityLevel(t,id);return '<div class="row between"><span>'+esc(def.name)+(level>1?' · '+level+'단계':'')+(def.awayOnly&&!away?' · 홈경기 0원':'')+'</span><b>'+money(amount)+'</b></div>';}).join(''):'<p class="muted">운영 중인 시설이 없습니다.</p>';
 const projects=[];
 for(const def of FACILITY_TABLE){
  if(!facilityHas(t,def.id))projects.push([def.name+' 건설',facilityPrice(def)]);
  else if(facilityLevel(t,def.id)<facilityMaxLevel(def))projects.push([def.name+' 다음 단계',facilityUpgradeCost(t,def.id)]);
 }
 if(t.stadium<LEAGUE.maxStadium)projects.push(['경기장 '+t.stadium+'→'+(t.stadium+1)+'등급',stadiumUpgradeCost(t)]);
 return '<section class="panel finance-facilities"><div class="finance-section-head"><div><h3>시설 비용</h3><p class="muted">다음 경기 '+(away?'원정':'홈')+' 기준 · 운영 중인 시설</p></div><b>'+money(total)+' / 경기</b></div>'+
  '<div class="finance-cost-rows">'+upkeep+'</div><details class="audit"><summary>건설·확장 비용 보기 · 일회성</summary><div class="finance-cost-rows">'+projects.map(([label,price])=>'<div class="row between"><span>'+esc(label)+'</span><b>'+money(price)+'</b></div>').join('')+(projects.length?'':'<p class="muted">추가로 건설·확장할 시설이 없습니다.</p>')+'</div></details><button class="small" data-go="facilities">시설 관리로 이동</button></section>';
}
function financeLedgerHTML(t){
 return '<h3>실제 수입 · 지출 내역</h3><p class="muted tiny">예상 금액과 구분한 최근 거래 30건</p>'+
  (t.ledger.length?t.ledger.slice(0,30).map(x=>{const date=new Date(x.at),label=esc(x.label);return '<div class="row between finance-ledger-row"><span>'+label+(Number.isFinite(date.getTime())?'<small>'+date.toLocaleDateString('ko-KR')+'</small>':'')+'</span><b class="'+(x.amount>=0?'good':'bad')+'">'+(x.amount>=0?'+':'')+money(x.amount)+'</b></div>';}).join(''):'<p class="muted-note">아직 거래가 없습니다. 시작 자금으로 운영을 준비하세요.</p>');
}
const financeBeforeDashboard=financeHTML;
financeHTML=function(t){
 const root=document.createElement('div');root.innerHTML=financeBeforeDashboard(t);
 const title=root.querySelector('.pagehead h2'),subtitle=root.querySelector('.pagehead p'),banner=root.querySelector('.ops-banner'),grid=root.querySelector('.finance26');
 if(title)title.textContent='재정';
 if(subtitle)subtitle.textContent='다음 경기의 돈 흐름과 입장료, 선수 급여, 시설 비용을 한곳에서 확인합니다.';
 if(!banner)return root.innerHTML;
 const o=operatingBudget(t);
 banner.classList.add('finance-summary');
 banner.innerHTML='<span>보유 자금 <strong>'+money(t.funds)+'</strong></span><span>미지급금 <strong>'+money(t.debt)+'</strong></span><span>선수 급여 · 경기당 <strong>'+money(o.salary)+'</strong></span><span>시설 유지비 · 다음 경기 <strong>'+money(o.maintenance)+'</strong></span><span class="finance-summary-crowd">예상 홈 관중 <strong>'+spectators(attendance(t))+'명</strong><small>현재 저장된 입장료 기준</small></span>';
 banner.insertAdjacentHTML('afterend',financeTicketPanel(t)+'<div class="finance-budget-slot"></div>'+financeFacilityCostsHTML(t));
 if(grid){
  const contracts=grid.querySelector('section:first-child'),ledger=grid.querySelector('section:last-child');
  grid.classList.add('finance-dashboard-grid');
  if(contracts){contracts.classList.add('finance-contracts');contracts.querySelector('h3')?.insertAdjacentHTML('afterend','<p class="finance-contract-total">선수 '+t.players.length+'명 · 경기당 급여 합계 <b>'+money(o.salary)+'</b></p>');}
  if(ledger){ledger.classList.add('finance-ledger');ledger.innerHTML=financeLedgerHTML(t);}
 }
 return root.innerHTML;
};
function updateFinanceTicketPreview(input){
 const t=team(),panel=input.closest('.finance-ticket'),button=panel?.querySelector('[data-v8="ticket"]');
 if(!t||!panel)return;
 const set=(name,value)=>{const el=panel.querySelector('[data-finance-ticket="'+name+'"]');if(el)el.textContent=value;};
 const ticket=ticketFromInput(input.value),valid=Number.isInteger(ticket)&&ticket>=1&&ticket<=50;
 if(button)button.disabled=!valid||live(t);
 if(!valid){
  for(const key of ['demand','capacity','crowd','sold-out','gate'])set(key,'—');
  set('state','입장료는 1,000~50,000원, 1,000원 단위로 입력해 주세요.');return;
 }
 const q=financeTicketQuote(t,ticket);
 set('demand',spectators(q.demand)+'명');set('capacity',spectators(q.capacity)+'석');
 set('crowd',spectators(q.crowd)+'명');set('sold-out',q.soldOut?'매진':'여유 좌석');set('gate',money(q.gate));
 set('state',ticket===t.ticket?'현재 저장된 입장료 기준':'미리보기 · 저장 전');
}
document.addEventListener('input',event=>{if(event.target?.id==='ticketPrice')updateFinanceTicketPreview(event.target);},true);
const renderBeforeFinanceDashboard=render;
render=function(){
 renderBeforeFinanceDashboard();
 if(screen!=='finance')return;
 const budget=$('#app > .operating-budget'),slot=$('#app .finance-budget-slot');
 if(budget&&slot){budget.classList.add('finance-budget');const details=budget.querySelector('.budget-details');if(details)details.open=false;slot.replaceWith(budget);}
};

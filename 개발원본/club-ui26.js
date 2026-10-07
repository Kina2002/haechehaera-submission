homeArtworkHTML=function(t){return homeBefore24(t)
 .replace('<canvas class="club-cast" id="clubCast" width="760" height="350"></canvas>','')
 .replace(/<section class="panel stack ace">[\s\S]*?<\/section>/,'');};
let financeFocus26=null;const openRecords26=new Set();
function emptyPlayers26(){return head('선수 관리','선수를 영입해 구단을 다시 꾸려보세요.')+'<section class="panel"><h2>현재 소속 선수가 없습니다.</h2><p>이적한 선수의 지난 경기 기록은 기록실에 남아 있습니다.</p><button class="primary" data-go="market">선수 영입</button></section>';}
playersArtworkHTML=function(t){
 const p=t.players.find(p=>p.id===selection)||t.players[0];if(!p)return emptyPlayers26();selection=p.id;
 return head('선수 관리','선수의 능력과 계약을 확인하세요.')+'<section class="scene-frame scene-locker management26">'+playerListHTML(t)+
 '<section class="panel profile26"><h2>'+esc(p.name)+' <span class="gold">#'+p.number+'</span></h2><p class="muted tiny">'+p.hand+' · '+p.tendency+' · '+LAB_DATA.bodies[p.appearance.body].name+'</p><canvas data-portrait="'+esc(p.id)+'" width="240" height="320" role="img" aria-label="'+esc(p.name)+' 관리용 전신 캐릭터"></canvas>'+
 '<div class="meta26"><div><small>개인 팬</small><b>'+p.fans+'명</b></div><div><small>구단 애정도</small><b>'+p.loyalty+' / 100</b></div><button data-contract-finance="'+p.id+'"><small>경기 급여 · 협상으로 ↗</small><b>'+money(p.salary)+'</b></button><div><small>계약 잔여 경기</small><b>'+(p.contract?p.contract+'경기':'계약 만료')+'</b></div></div>'+
 '<button class="small" data-action="edit-player" '+(live(t)?'disabled':'')+'>이름·등번호 수정</button></section>'+
 '<section class="panel abilities26"><h2>선수 능력</h2>'+statBars(p)+energyHTML(p)+'<details class="personal-records26" data-personal-records="'+p.id+'" '+(openRecords26.has(p.id)?'open':'')+'><summary>개인 누적 기록 <span>펼치기 / 접기</span></summary>'+playerRecords(p)+'</details></section></section>';
};
const growthBefore26=growthArtworkHTML;
growthArtworkHTML=function(t){return t.players.length?growthBefore26(t):emptyPlayers26();};
document.addEventListener('toggle',ev=>{const id=ev.target.dataset?.personalRecords;if(id){if(ev.target.open)openRecords26.add(id);else openRecords26.delete(id);}},true);
const financeBefore26=financeHTML;
function payMessage26(p){const mode=wageEffect26(p),b=balance();return mode==='low'?'매 경기 애정도 -3':mode==='high'?'매 경기 '+Math.round(clamp(b.salaryBonusChance,0,1)*100)+'% 확률로 애정도 +'+Math.round(b.salaryBonusLoyalty):'급여에 따른 애정도 변동 없음';}
financeHTML=function(t){
 t.players.forEach(p=>wageState26(p,t));const root=document.createElement('div');root.innerHTML=financeBefore26(t);
 const note=root.querySelector('.muted-note');if(note)note.textContent='희망급여는 계약 동안 고정됩니다. 120% 이상 지급하면 확률적으로 애정도가 오르고, 90% 이하 지급하면 매 경기 애정도 -3입니다. 애정도 0이면 인원수와 관계없이 이적합니다. 희망급여는 계약 종료 시 출전 비율·활약을 반영해 재산정됩니다.';
 const table=root.querySelector('.economy-table');table.classList.add('contracts26');table.querySelector('thead').innerHTML='<tr><th>선수</th><th>급여 / 남은 경기</th><th>희망급여 / 경기</th><th>애정도</th><th>협상</th></tr>';
 table.querySelector('tbody').innerHTML=t.players.map(p=>'<tr data-contract-row="'+p.id+'" tabindex="-1" class="'+(financeFocus26===p.id?'focused-contract26':'')+'"><td><button class="text-link26" data-contract-profile="'+p.id+'">'+esc(p.name)+' <small>#'+p.number+'</small></button></td><td>'+money(p.salary)+'<small class="contract-note26">'+(p.contract?'잔여 '+p.contract+'경기':'계약 만료')+'</small></td><td><b>'+money(salaryAsk(p))+'</b><small class="contract-note26">'+payMessage26(p)+'</small></td><td>'+p.loyalty+'</td><td><button class="small" data-contract-open="'+p.id+'" '+(live(t)?'disabled':'')+'>협상</button></td></tr>').join('');
 const pair=table.closest('.grid2');if(pair)pair.classList.add('finance26');
 return root.innerHTML;
};
function openContract26(p){const t=team();if(live(t))return toast('경기가 끝난 뒤 협상할 수 있습니다.');const w=wageState26(p,t);
 note(p.name+' · 연봉 협상','<button class="text-link26" data-contract-profile="'+p.id+'">'+esc(p.name)+' 선수 정보 보기 ↗</button><p>현재 급여 '+money(p.salary)+' · 잔여 '+p.contract+'경기<br><b class="gold">희망급여: 경기당 '+money(w.ask)+'</b> · 애정도 '+p.loyalty+'</p><p class="muted tiny">희망급여의 80% 미만 제안은 거절되며 애정도 -15입니다.<br>새 계약 기간 '+balance(t).contractGames+'경기 · 계약 중 희망급여는 고정됩니다.</p>'+(w.lastChange?'<p class="muted tiny">직전 계약 출전 '+w.lastChange.games+'/'+w.lastChange.clubGames+'경기<br>희망급여 '+money(w.lastChange.from)+' → '+money(w.lastChange.to)+'</p>':'')+'<label>제안 경기 급여 (원)<input id="salaryOffer26" type="number" min="10000" max="100000000" step="10000" value="'+wonValue(w.ask)+'"></label><p id="offerMessage26" class="bad" role="status"></p><button class="primary" data-contract-offer="'+p.id+'">제안하기</button>');
}
document.addEventListener('click',ev=>{
 const el=ev.target.closest('[data-contract-profile],[data-contract-finance],[data-contract-open],[data-contract-offer]');if(!el||el.disabled)return;
 ev.preventDefault();ev.stopImmediatePropagation();const t=team();if(!t)return;
 const id=el.dataset.contractProfile||el.dataset.contractFinance||el.dataset.contractOpen||el.dataset.contractOffer,p=t.players.find(x=>x.id===id);if(!p)return;
 if(el.dataset.contractProfile){$('#dialog')?.close();selection=id;go('players');return;}
 if(el.dataset.contractFinance){financeFocus26=id;go('finance');const row=document.querySelector('[data-contract-row="'+id+'"]');row?.scrollIntoView({block:'center'});row?.focus({preventScroll:true});return;}
 if(el.dataset.contractOpen)return openContract26(p);
 if(live(t))return toast('경기가 끝난 뒤 협상할 수 있습니다.');
 const n=salaryFromInput($('#salaryOffer26').value);if(!Number.isInteger(n)||n<1||n>10000){$('#offerMessage26').textContent='1만~1억 원 사이, 1만 원 단위로 입력해 주세요.';return;}
 const msg=negotiate(p,n);$('#dialog').close();save();render();toast(msg);
},true);
const uiStyle26=document.createElement('style');uiStyle26.textContent=`
.management26{display:grid;grid-template-columns:220px minmax(350px,1.05fr) minmax(370px,1fr);gap:18px;padding:20px;align-items:start;min-height:720px}
.management26>.panel{min-width:0;background:#05213bef}.management26 .playerlist{max-height:730px;overflow:auto;scrollbar-width:thin;overscroll-behavior:contain}
.profile26{text-align:center;display:flex;flex-direction:column;gap:13px}.profile26 h2{font-size:27px}.profile26 canvas{width:100%;height:420px;object-fit:contain;image-rendering:pixelated;border-bottom:1px solid #467082}
.meta26{display:grid;grid-template-columns:1fr 1fr;gap:10px;text-align:left}.meta26>div,.meta26>button{padding:12px;background:#0a314c;border:1px solid #416b80;min-width:0}.meta26 small{display:block;font-size:12px;color:#b4d0df;line-height:1.6}.meta26 b{font:20px NeoDunggeunmo;color:#ffe29b;display:block;margin-top:8px}.meta26>button{text-align:left;cursor:pointer;border-color:#d8b664}
.abilities26 h2{margin-bottom:22px}.abilities26 .statrow{font-size:15px;margin:17px 0;grid-template-columns:82px minmax(0,1fr) 38px}
.personal-records26{margin-top:24px;border-top:1px solid #416b80;padding-top:15px}.personal-records26 summary{cursor:pointer;padding:10px 0;color:#ffe29b}.personal-records26 summary span{font-size:11px;color:#b4d0df}.personal-records26 .records{margin-top:15px}
.finance26{grid-template-columns:minmax(730px,1.75fr) minmax(250px,.7fr)}.contracts26 th,.contracts26 td{padding:12px 7px;font-size:13px}.contract-note26{display:block;color:#b5cedd;font-size:11px;line-height:1.6;margin-top:5px}.text-link26{background:none;border:0;box-shadow:none;padding:6px 0;color:#9edaff;text-decoration:underline;cursor:pointer;font-size:14px}.text-link26 small{color:#c0cbd0}.focused-contract26{background:#22415b;outline:2px solid #f6d579;outline-offset:-2px}.contracts26 tr:focus{outline:2px solid #f6d579;outline-offset:-2px}
`;document.head.append(uiStyle26);

/* Stadium-contained UI. Reparents the existing live controls and portrait nodes. */
(()=>{'use strict';
let logOpen=false;
const put=(node,parent)=>{if(node&&node.parentNode!==parent)parent.appendChild(node);};
const html=(node,value)=>{if(node.dataset.content!==value){node.innerHTML=value;node.dataset.content=value;}};
function scoreHTML(m,st){
 // The game resolves a pitch before its animation ends. Hide that pending result
 // in the inning/hit/error cells, just as visibleMatchState does for the main score.
 const pending=anim&&!anim.resultShown?anim.e:null,innings=m.innings.map(a=>a.slice()),hits=m.hits.slice(),errors=m.errors.slice();
 if(pending){
  const side=pending.attack,delta=m.score[side]-st.score[side];
  if(delta&&innings[side][pending.inning-1]!=null)innings[side][pending.inning-1]-=delta;
  if(pending.hit)hits[side]--;
  errors[1-side]-=pending.errors?.length||0;
 }
 const n=Math.max(7,...innings.map(a=>a.length));
 return '<table class="bc-innings" aria-label="이닝별 점수와 안타·실책"><thead><tr><th>팀</th>'+Array.from({length:n},(_,i)=>'<th class="'+(i+1===st.inning?'inning-now':'')+'">'+(i+1)+'</th>').join('')+'<th class="total">R</th><th>H</th><th>E</th></tr></thead><tbody>'+[1-m.home,m.home].map(side=>{
  const tm=tside(m,side);return '<tr class="'+(side===st.attack?'batting':'')+'"><th scope="row">'+badge(tm)+'<span>'+esc(tm.name)+'</span>'+(side===st.attack?'<em>공격</em>':'')+'</th>'+Array.from({length:n},(_,i)=>'<td class="'+(i+1===st.inning?'inning-now':'')+'">'+(innings[side][i]??'–')+'</td>').join('')+'<td class="total">'+st.score[side]+'</td><td>'+hits[side]+'</td><td>'+errors[side]+'</td></tr>';
 }).join('')+'</tbody></table>';
}
function arrange(){
 if(screen!=='match')return;const layout=$('.match-layout'),m=team()?.match;if(!layout||!m)return;
 let shell=layout.querySelector('.stadium-v13');
 if(!shell){
  const source=layout.querySelector(':scope>section'),dug=[...layout.querySelectorAll(':scope>.dugout')];if(!source||dug.length!==2)return;
  shell=document.createElement('section');shell.className='stadium-v13';
  shell.innerHTML='<div class="stadium-canvas"></div><div class="stadium-toolbar"></div><div class="stadium-count"></div><div class="stadium-board"><div class="stadium-score"></div><div class="stadium-lineup"></div></div><div class="stadium-camera"></div><div class="stadium-batter"></div><div class="stadium-pitcher"></div><div class="stadium-command"></div><div class="stadium-recent"></div><section class="stadium-history" hidden><header><strong>경기 기록</strong><button type="button" data-stadium-log>닫기 ×</button></header></section>';
  layout.appendChild(shell);source.classList.add('stadium-source');dug.forEach(d=>d.classList.add('stadium-source'));
  put(source.querySelector('.field-wrap'),shell.querySelector('.stadium-canvas'));
  put($('.countboard'),shell.querySelector('.stadium-count'));put($('.match-top .row'),shell.querySelector('.stadium-toolbar'));
  put(source.querySelector('.controls'),shell.querySelector('.stadium-command'));
  put(source.querySelector('.play-history21'),shell.querySelector('.stadium-history'));
  shell._cards=dug.map(d=>d.querySelector('.current-card'));
 }
 const toolbar=shell.querySelector('.stadium-toolbar .row');if(toolbar&&!toolbar.querySelector('[data-audio-toggle]')){const source=document.querySelector('body>footer [data-audio-toggle]');if(source){const button=source.cloneNode(true);button.onclick=source.onclick;toolbar.prepend(button);}}
 shell.dataset.camera=window.StadiumViewV13?.low?'attack':'wide';
 const st=visibleMatchState(m),side=st.attack,at=tside(m,side);
 put(shell._cards[side],shell.querySelector('.stadium-batter'));put(shell._cards[1-side],shell.querySelector('.stadium-pitcher'));
 html(shell.querySelector('.stadium-score'),scoreHTML(m,st));
 const order=st.order?.[side]??m.order[side],lineup=at.lineup.slice(0,9).map((slot,i)=>{const p=ply(at,slot.id);return '<li class="'+(i===order?'current':'')+'"><span>'+(i+1)+'</span><strong>'+esc(p?.name||'선수')+'</strong><small>'+slot.pos+'</small></li>';}).join('');
 html(shell.querySelector('.stadium-lineup'),'<b>'+esc(at.name)+' · 공격</b><ol aria-label="공격 팀 타순">'+lineup+'</ol>');
 const events=typeof visibleHistory21==='function'?visibleHistory21(m):m.events;
 const recent=events.slice(-2).map(e=>'<span>'+e.inning+'회'+(e.half?'말':'초')+' · '+esc(e.batterName||'')+' · '+esc(eventCaption(e))+'</span>').join('');
 const outcome=anim?popup19(anim.e,playProgress(clamp(anim.elapsed/anim.duration,0,1)),anim.resultShown):null;
 html(shell.querySelector('.stadium-recent'),'<div>'+(outcome?popupMarkup19(outcome):recent||'<span>선수들이 첫 공을 준비합니다.</span>')+'</div><button type="button" data-stadium-log>경기 기록 +</button>');
 shell.querySelector('.stadium-history').hidden=!logOpen;
 const camera=window.StadiumViewV13?.low?'공격 · 포수 뒤 시점':side===0?'공격 · 타구와 주루':'수비 · 경기장 전체';
 const label=shell.querySelector('.stadium-camera');if(label.textContent!==camera)label.textContent=camera;
 layout.classList.add('stadium-layout-v13');document.body.classList.add('stadium-active-v13');
}
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;arrange();});}).observe($('#app'),{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target.closest('[data-stadium-log]')){e.stopPropagation();logOpen=!logOpen;arrange();}},true);
const before=render;render=function(){const value=before.apply(this,arguments);if(screen!=='match')document.body.classList.remove('stadium-active-v13');arrange();return value;};
window.StadiumLayoutV13={arrange};arrange();
})();

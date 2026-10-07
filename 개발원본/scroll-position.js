// Same-screen redraws must not discard either the page or nested list position.
let renderedView23=null;
function scrollPath23(el,root){
 if(el.id)return '#'+CSS.escape(el.id);
 const bits=[];while(el&&el!==root){const tag=el.tagName.toLowerCase(),siblings=[...el.parentElement.children].filter(x=>x.tagName===el.tagName);bits.unshift(tag+':nth-of-type('+(siblings.indexOf(el)+1)+')');el=el.parentElement;}return '#app > '+bits.join(' > ');
}
function rememberScroll23(){const root=$('#app');if(!root)return null;const nodes=[...root.querySelectorAll('*')].filter(el=>/(auto|scroll)/.test(getComputedStyle(el).overflowY+' '+getComputedStyle(el).overflowX));return {x:window.scrollX,y:window.scrollY,nodes:nodes.map(el=>({path:scrollPath23(el,root),x:el.scrollLeft,y:el.scrollTop}))};}
function restoreScroll23(state){if(!state)return;for(const n of state.nodes){const el=document.querySelector(n.path);if(el){el.scrollLeft=n.x;el.scrollTop=n.y;}}window.scrollTo({left:state.x,top:state.y,behavior:'instant'});}
const renderBeforeScroll23=render;
render=function(){
 const key=screen+':'+(team()?.id||''),same=renderedView23===key;
 // Match history has its own follow-latest behavior and is intentionally excluded.
 const state=same&&screen!=='match'?rememberScroll23():null;
 renderBeforeScroll23();renderedView23=screen+':'+(team()?.id||'');
 if(state&&renderedView23===key)restoreScroll23(state);
};
function scrollChecks23(){
 const keep={activeGame,selection,lineupFocus,lastScreen,view:renderedView23,x:window.scrollX,y:window.scrollY};let result;
 context23(()=>{try{
  const {t}=fixture23();t.match=null;while(t.players.length<35){const p=player(false,t.players.map(x=>x.number));p.name='선수'+t.players.length;t.players.push(p);}t.battingDraft=t.lineup.map(x=>({...x,id:null}));activeGame=true;screen='lineup';render();
  const list=$('.ability-table-wrap');list.scrollTop=360;list.scrollLeft=100;window.scrollTo(0,180);
  const before={page:window.scrollY,list:list.scrollTop,left:list.scrollLeft};
  $('.roster-choice:not(:disabled)').click();
  const after={page:window.scrollY,list:$('.ability-table-wrap').scrollTop,left:$('.ability-table-wrap').scrollLeft};
  screen='players';render();const pl=$('.playerlist');pl.scrollTop=300;window.scrollTo(0,160);const oldTop=pl.scrollTop,oldPage=window.scrollY;pl.querySelectorAll('button')[15].click();
  result={lineup:{before,after,passed:JSON.stringify(before)===JSON.stringify(after)&&before.list>0},players:{before:oldTop,after:$('.playerlist').scrollTop,pageBefore:oldPage,pageAfter:window.scrollY,passed:oldTop>0&&oldTop===$('.playerlist').scrollTop&&oldPage===window.scrollY},selectionApplied:selection===t.players[15].id};
 }finally{activeGame=keep.activeGame;selection=keep.selection;lineupFocus=keep.lineupFocus;lastScreen=keep.lastScreen;renderedView23=keep.view;}});
 render();window.scrollTo(keep.x,keep.y);return result;
}
if($('#qaTools')){const b=document.createElement('button');b.textContent='선택 후 스크롤 유지 검사';b.onclick=()=>note('스크롤 유지 검사','<pre id="scrollReport23">'+esc(JSON.stringify(scrollChecks23(),null,2))+'</pre>');$('#qaTools').append(b);}

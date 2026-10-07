// Club events use the game's own players, uniforms, scenery and pixel spectators.
const CLUB_EVENT_TYPES = [
 {id:'autograph', title:'팬 사인회에 끝까지 남음', fans:18, loyalty:2, place:'구장 앞 · 팬 사인회', action:'마지막 팬의 공에도 정성껏 사인합니다.', response:'끝까지 기다려 줘서 고마워요!', positive:true},
 {id:'litter', title:'구장 주변 쓰레기 무단 투기', fans:-22, loyalty:-2, place:'경기 후 · 구장 앞 광장', action:'쓰레기통을 두고, 빈 컵을 바닥에 버립니다.', response:'방금 쓰레기를 버린 거야…?', positive:false},
 {id:'donation', title:'기부 소식이 알려짐', fans:25, loyalty:3, place:'구장 앞 · 나눔 행사', action:'선수가 기부함에 봉투를 넣습니다.', response:'경기장 밖에서도 멋진 선수네요!', positive:true},
 {id:'ignore', title:'팬의 인사를 무시함', fans:-18, loyalty:-3, place:'경기 후 · 퇴근길', action:'팬이 인사를 건네지만 그대로 지나칩니다.', response:'인사 한 번 해 줬으면 좋았을 텐데…', positive:false},
 {id:'gift', title:'어린이 팬에게 공을 선물함', fans:20, loyalty:2, place:'구장 앞 · 어린이 팬과의 만남', action:'어린이 팬에게 야구공을 건넵니다.', response:'이 공, 평생 간직할게요!', positive:true}
];
const CLUB_EVENT_DURATION = 6600;
let clubEventView = null;

function applyClubEvent(t,m,p,typeIndex){
 if(m.clubEvent)return m.clubEvent;
 const def=CLUB_EVENT_TYPES[typeIndex];
 if(!def)return null;
 const before={fans:p.fans,loyalty:p.loyalty};
 p.fans=Math.max(0,p.fans+def.fans);
 p.loyalty=clamp(p.loyalty+def.loyalty,0,100);
 const event={id:m.id+':club',kind:def.id,playerId:p.id,player:p.name,text:def.title,
  fans:p.fans-before.fans,loyalty:p.loyalty-before.loyalty,before,
  after:{fans:p.fans,loyalty:p.loyalty},actor:clone(p),primary:t.primary,secondary:t.secondary,seen:false};
 m.clubEvent=event;
 news(t,p.name+' · '+def.title,'개인 팬 '+clubEventSigned(event.fans)+' · 애정도 '+clubEventSigned(event.loyalty));
 t.news[0].clubEvent=event;
 if(p.loyalty===0)p.exitPending26=true;
 return event;
}
function clubEventSigned(n){return (n>0?'+':'')+n;}
function clubEventDefinition(event){return CLUB_EVENT_TYPES.find(x=>x.id===event?.kind);}
function clubEventChanges(event){
 return [['개인 팬','fans','명'],['구단 애정도','loyalty','']].map(([label,key,unit])=>{
  const delta=event[key],before=event.before[key],after=event.after[key];
  return '<div class="club-change '+(delta<0?'loss':delta>0?'gain':'neutral')+'"><span>'+label+'</span><strong>'+clubEventSigned(delta)+unit+'</strong><small>'+before+unit+' → '+after+unit+'</small></div>';
 }).join('');
}
function pendingClubEvent(t){return t?.news?.find(x=>x.clubEvent?.seen===false&&clubEventDefinition(x.clubEvent))?.clubEvent;}
function markClubEventSeen(t,event){
 if(!t||!event)return;
 for(const item of [event,t.match?.clubEvent,...(t.news||[]).map(x=>x.clubEvent)])if(item?.id===event.id)item.seen=true;
}
function closeClubEvent(){
 const state=clubEventView;if(!state)return;
 clubEventView=null;cancelAnimationFrame(state.raf);
 if(!state.preview){markClubEventSeen(state.team,state.event);save();}
 state.el.close();state.el.remove();
 state.focus?.isConnected&&state.focus.focus({preventScroll:true});
 // Another unread event can remain after importing or returning from another screen.
 if(!state.preview&&team()===state.team)render();
}
function clubEventScenePhase(ms){return ms<1500?0:ms<4400?1:2;}
function finishClubEventScene(){
 if(!clubEventView)return;
 cancelAnimationFrame(clubEventView.raf);clubEventView.raf=0;
 clubEventView.elapsed=CLUB_EVENT_DURATION;
 paintClubEventView(clubEventView);
}
function showClubEvent(event,preview=false){
 const def=clubEventDefinition(event),t=team();
 if(clubEventView||!def||!t||!event.actor||!charsReady||!ART.ready)return false;
 const el=document.createElement('dialog');el.className='club-event-dialog';
 el.setAttribute('aria-labelledby','club-event-title');el.setAttribute('aria-describedby','club-event-caption');
 el.innerHTML='<article class="club-event-card '+(def.positive?'positive':'negative')+'">'+
  '<header class="club-event-top"><span>'+(preview?'구단 사건 미리보기':'경기장 밖 이야기')+'</span><span class="club-event-tone">'+(def.positive?'팬들의 응원':'팬들의 실망')+'</span></header>'+
  '<div class="club-event-heading"><p>#'+event.actor.number+' · '+esc(event.player)+'</p><h2 id="club-event-title">'+esc(event.text)+'</h2></div>'+
  (preview?'<label class="club-preview-label">사건 선택 <select data-club-event-select>'+CLUB_EVENT_TYPES.map(x=>'<option value="'+x.id+'" '+(x.id===def.id?'selected':'')+'>'+x.title+'</option>').join('')+'</select></label>':'')+
  '<div class="club-event-picture"><canvas width="900" height="460" role="img" aria-label="'+esc(event.player+' 선수가 '+def.title+' 사건에 등장하는 애니메이션')+'"></canvas><span class="club-event-place">'+esc(def.place)+'</span></div>'+
  '<div class="club-event-caption" aria-live="polite"><span class="club-event-step"></span><p id="club-event-caption"></p></div>'+
  '<div class="club-event-changes" hidden>'+clubEventChanges(event)+'</div>'+
  '<footer class="club-event-actions"><span class="club-event-help">'+(preview?'미리보기 · 선수 수치는 바뀌지 않습니다.':'사건에 따른 변화는 이미 반영되었습니다.')+'</span><div><button data-club-event-skip>결과 바로 보기</button><button data-club-event-replay hidden>다시 재생</button><button class="primary" data-club-event-close>'+(preview?'닫기':'확인하고 계속')+'</button></div></footer></article>';
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const state=clubEventView={el,event,team:t,preview,elapsed:reduced?CLUB_EVENT_DURATION:0,last:performance.now(),phase:-1,raf:0,focus:document.activeElement};
 document.body.append(el);el.showModal();el.querySelector('[data-club-event-close]').focus({preventScroll:true});
 const confirm=()=>{if(!state.preview&&state.phase<2)finishClubEventScene();else closeClubEvent();};
 el.addEventListener('cancel',e=>{e.preventDefault();confirm();});
 el.addEventListener('click',e=>{
  if(e.target.closest('[data-club-event-close]'))confirm();
  else if(e.target.closest('[data-club-event-skip]'))finishClubEventScene();
  else if(e.target.closest('[data-club-event-replay]')){cancelAnimationFrame(state.raf);state.elapsed=0;state.phase=-1;state.last=performance.now();state.raf=requestAnimationFrame(state.frame);}
 });
 el.querySelector('select')?.addEventListener('change',e=>{
  const kind=e.target.value;closeClubEvent();previewClubEvent(kind);
 });
 const frame=now=>{
  if(clubEventView!==state)return;
  if(!document.hidden)state.elapsed=Math.min(CLUB_EVENT_DURATION,state.elapsed+Math.min(100,now-state.last));
  state.last=now;paintClubEventView(state);state.raf=state.elapsed<CLUB_EVENT_DURATION?requestAnimationFrame(frame):0;
 };
 state.frame=frame;
 frame(state.last);return true;
}
function paintClubEventView(state){
 const phase=clubEventScenePhase(state.elapsed),def=clubEventDefinition(state.event),done=state.elapsed>=4400;
 if(phase!==state.phase){
  state.phase=phase;
  state.el.querySelector('.club-event-step').textContent=['01 만남','02 무슨 일이 있었을까','03 팬들의 반응'][phase];
  state.el.querySelector('#club-event-caption').textContent=[state.event.player+' 선수에게 팬들의 시선이 모입니다.',def.action,def.response][phase];
  state.el.querySelector('.club-event-changes').hidden=!done;
  state.el.querySelector('[data-club-event-skip]').hidden=done;
  state.el.querySelector('[data-club-event-replay]').hidden=!done;
  if(!state.preview)state.el.querySelector('[data-club-event-close]').textContent=done?'확인하고 계속':'결과 확인';
 }
 drawClubEventScene(state.el.querySelector('canvas').getContext('2d'),state.event,state.elapsed);
}
function previewClubEvent(kind='autograph'){
 const t=team(),p=t?.players?.find(x=>x.id===selection)||t?.players?.[0]||t?.departed?.[0];
 const def=CLUB_EVENT_TYPES.find(x=>x.id===kind);if(!p||!def)return;
 const before={fans:p.fans,loyalty:p.loyalty},after={fans:Math.max(0,p.fans+def.fans),loyalty:clamp(p.loyalty+def.loyalty,0,100)};
 showClubEvent({id:'preview-'+kind,kind,playerId:p.id,player:p.name,text:def.title,actor:clone(p),primary:t.primary,secondary:t.secondary,
  before,after,fans:after.fans-before.fans,loyalty:after.loyalty-before.loyalty},true);
}

function drawClubEventScene(c,event,ms){
 const def=clubEventDefinition(event),phase=clubEventScenePhase(ms),arrival=clamp(ms/1500,0,1),action=clamp((ms-1500)/2900,0,1);
 const tm={primary:event.primary,secondary:event.secondary,players:[event.actor]},actor=event.actor;
 const smooth=u=>u*u*(3-2*u),mix=(a,b,u)=>a+(b-a)*smooth(clamp(u,0,1));
 const box=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
 const label=(text,x,y,color='#fff4d4',size=21)=>{c.font=size+'px NeoDunggeunmo';c.textAlign='center';c.fillStyle=color;c.fillText(text,x,y);};
 const ball=(x,y)=>{box(x-7,y-7,14,14,'#fff6da');box(x-5,y-5,3,4,'#c94b48');box(x+2,y+1,3,4,'#c94b48');};
 const bubble=(text,x,y,negative=false)=>{c.font='21px NeoDunggeunmo';const w=c.measureText(text).width+30;box(x-w/2,y-30,w,42,negative?'#ffe1d8':'#fff7d8');box(x-3,y+12,8,9,negative?'#ffe1d8':'#fff7d8');label(text,x,y,negative?'#6f2e36':'#183956',21);};
 const fan=(x,y,scale,index,moving=false)=>entranceFan(c,x,y,scale,tm,moving?ms:0,index);
 const athlete=(x,y,pose='idle',flip=false)=>sprite(c,x,y,2.85,tm,actor.number,'player',pose,ms,actor.id,flip);
 c.save();c.imageSmoothingEnabled=false;c.clearRect(0,0,900,460);
 sceneImage(c,0,0,-190,900,675);
 box(0,0,900,460,'#061c3744');box(0,308,900,152,'#c9b894');
 for(let i=0;i<10;i++)box(i*110-40,365,85,2,'#ae9d7d');
 for(let i=0;i<11;i++)box(i*96,427,70,2,'#ae9d7d');
 box(0,442,900,18,'#183b4a');
 let x=mix(140,355,arrival);
 if(def.id==='ignore'){
  x=phase===0?mix(140,290,arrival):mix(290,760,action);
  fan(530,387,3.2,1);fan(607,381,2.8,2);
  athlete(x,405,phase<2?'run':'idle');
  if(phase===1){bubble('안녕하세요!',567,220);box(505,316+Math.sin(ms*.012)*7,9,28,'#eeb588');}
  if(phase===2)bubble('…',567,237,true);
 }else if(def.id==='autograph'){
  fan(mix(685,559,arrival),403,3.2,1,phase===0);fan(668,411,2.9,2);fan(754,399,2.6,3);
  athlete(x,395,phase===0?'run':'idle');
  box(301,333,226,14,'#704626');box(310,347,207,30,'#103f69');box(315,377,12,42,'#704626');box(500,377,12,42,'#704626');
  label('팬 사인회',416,367,'#ffdc78',23);
  const bx=phase===2?mix(430,530,clamp((ms-4400)/700,0,1)):432;
  ball(bx,phase===2?316:322);
  if(phase===1){const px=431+Math.sin(ms*.035)*8,py=310+Math.cos(ms*.025)*4;box(385,303,42,10,SKINS[actor.appearance.skin]||'#eeb588');box(px,py,4,15,'#182c4b');}
  if(phase===2){bubble('감사합니다!',610,233);label('끝까지 함께한 사인회',450,72,'#fff4d4',25);}
 }else if(def.id==='donation'){
  fan(620,405,3.2,1);fan(709,395,2.6,2);
  athlete(x,405,phase===0?'run':phase===1?'throw':'idle');
  box(467,322,87,79,'#ad703c');box(475,331,71,62,'#f4dca0');box(483,312,58,12,'#684928');box(493,316,36,4,'#112637');label('기부함',510,369,'#563a22',21);
  if(action<.75){const u=clamp(action/.75,0,1),ex=mix(400,510,u),ey=mix(282,311,u);box(ex-17,ey-10,34,22,'#fff5dc');box(ex-12,ey-4,24,3,'#cfab7e');}
  if(phase===2){bubble('함께 나눠요!',647,232);for(let i=0;i<4;i++)label('♥',430+i*38,245-((ms-4400)/24+i*14)%55,'#ffcd6e',21);}
 }else if(def.id==='litter'){
  fan(640,405,3.2,1);fan(730,395,2.7,2);
  box(517,317,67,85,'#215c61');box(509,310,83,14,'#31797c');box(530,332,42,8,'#102c36');label('휴지통',550,375,'#b6ddd8',17);
  athlete(x,405,phase===0?'run':phase===1?'throw':'confused');
  const u=clamp(action/.65,0,1),cx=mix(399,462,u),cy=295+u*112-Math.sin(u*Math.PI)*85;
  box(cx-8,cy-13,17,22,'#fff2cc');box(cx-10,cy-15,21,5,'#d5765b');box(cx-4,cy-25,3,12,'#dfb662');
  if(phase===2){bubble('쓰레기통이 바로 옆인데…',651,229,true);box(452,428,26,3,'#7f7768');}
 }else if(def.id==='gift'){
  fan(mix(668,558,arrival),405,2.1,1,phase===0);fan(651,398,3.25,2);athlete(x,405,phase===0?'run':phase===1?'throw':'idle');
  const u=clamp(action/.8,0,1);ball(mix(402,554,u),mix(294,358,u)-Math.sin(u*Math.PI)*30);
  if(phase===2){bubble('와! 내 야구공이다!',580,241);label('♥',600,318,'#d65762',28);}
 }
 if(phase===0)label(event.player+' 선수가 다가옵니다',450,85,'#fff4d4',25);
 const width=220+Math.min(180,event.player.length*13);box(450-width/2,420,width,30,'#092c46ec');label('#'+actor.number+' '+event.player,450,442,'#fff5d2',22);
 c.restore();
}

const newsBeforeClubEvents=newsHTML;
newsHTML=function(t){
 if(!t.news.length)return newsBeforeClubEvents(t);
 return head('구단 소식','선수들의 경기장 밖 이야기를 다시 만나보세요.')+t.news.map(x=>{
  const event=x.clubEvent,def=clubEventDefinition(event);
  if(!def)return '<article class="panel news-card"><h3>'+esc(x.title)+'</h3><p>'+esc(x.text)+'</p></article>';
  return '<article class="panel news-card club-news '+(def.positive?'positive':'negative')+'"><span class="club-news-tag">'+(event.seen?'경기장 밖 이야기':'새 소식')+'</span><h3>'+esc(x.title)+'</h3><div class="club-event-changes">'+clubEventChanges(event)+'</div><button data-club-event-open="'+esc(event.id)+'">▶ 사건 다시 보기</button></article>';
 }).join('');
};
const resultBeforeClubEvents=financeResult;
financeResult=function(m){
 const base=resultBeforeClubEvents(m),event=m.clubEvent;
 if(!clubEventDefinition(event))return base;
 return '<section class="panel club-result-event"><div><span>경기장 밖 이야기</span><h3>'+esc(event.player+' · '+event.text)+'</h3></div><button data-club-event-open="'+esc(event.id)+'">▶ 사건 다시 보기</button></section>'+base;
};
const renderBeforeClubEvents=render;
render=function(){
 renderBeforeClubEvents();
 const t=activeGame?team():null;
 if(screen==='settings'&&t?.players.length)$('#app').insertAdjacentHTML('beforeend','<section class="panel settings-extra"><h3>구단 사건 연출</h3><p>실제 선수 모습으로 경기장 밖의 다섯 가지 이야기를 봅니다.</p><button data-club-event-preview>구단 사건 연출 미리보기</button></section>');
 if(t&&['result','home','news'].includes(screen)&&!clubEventView&&!$('#dialog')?.open&&!entrance){const event=pendingClubEvent(t);if(event)showClubEvent(event);}
};
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-club-event-open],[data-club-event-preview]');
 if(!button||button.disabled)return;
 if(button.hasAttribute('data-club-event-preview')){previewClubEvent();return;}
 const t=team(),id=button.dataset.clubEventOpen,event=t?.news?.find(x=>x.clubEvent?.id===id)?.clubEvent||(t?.match?.clubEvent?.id===id?t.match.clubEvent:null);
 if(event)showClubEvent(event);
});
window.ClubEvents={preview:previewClubEvent,show:showClubEvent,close:closeClubEvent,finish:finishClubEventScene,types:CLUB_EVENT_TYPES,duration:CLUB_EVENT_DURATION};

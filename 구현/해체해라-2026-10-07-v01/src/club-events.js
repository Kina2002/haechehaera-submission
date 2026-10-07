// Club events use the game's own players, uniforms, scenery and pixel spectators.
const CLUB_EVENT_TYPES = [
 {id:'autograph', title:'팬 사인회에 끝까지 남음', fans:18, loyalty:2, place:"구장 앞 · 마지막 팬 사인회", positive:true,
  shots:[["마지막 팬","해가 진 사인회장에 마지막 팬이 기다리고 있습니다."],["정성스러운 사인","선수가 책상에 놓인 야구공에 정성껏 사인합니다."],["직접 건네는 공","사인한 공을 마지막 팬의 손에 직접 건넵니다."],["끝까지 함께","선수가 끝까지 자리를 지키자 팬이 공을 품에 안고 감사 인사를 합니다."]]},
 {id:'litter', title:'구장 주변 쓰레기 무단 투기', fans:-22, loyalty:-2, place:"경기 후 · 구장 출구", positive:false,
  shots:[["마신 음료","구장 출구를 지나던 선수가 음료를 마십니다."],["바닥에 툭","쓰레기통이 바로 옆인데 빈 컵을 바닥에 버립니다."],["굴러가는 컵","버린 컵이 구장 앞 바닥을 굴러갑니다."],["팬들의 실망","모습을 지켜본 팬들이 실망한 표정을 짓습니다."]]},
 {id:'donation', title:'기부 소식이 알려짐', fans:25, loyalty:3, place:"지역 유소년 야구 · 나눔 전달식", positive:true,
  shots:[["나눔 현장","선수가 지역 유소년 야구 지원 전달식을 찾아옵니다."],["마음을 전해요","담당자에게 기부 봉투를 직접 전달합니다."],["아이들의 감사","아이들이 앞으로의 연습을 기대하며 감사 인사를 합니다."],["알려진 소식","구단 게시판에 기부 소식이 올라오고 팬들이 따뜻하게 반응합니다."]]},
 {id:'ignore', title:'팬의 인사를 무시함', fans:-18, loyalty:-3, place:"경기 후 · 선수 버스 앞", positive:false,
  shots:[["기다리는 팬","팬들이 선수 출구 앞에서 퇴근하는 선수를 기다립니다."],["반가운 인사","선수를 알아본 팬이 손을 흔들며 인사합니다."],["그대로 지나감","선수는 팬에게 시선을 돌리지 않고 버스 쪽으로 지나갑니다."],["내려가는 손","답을 기다리던 팬이 조용히 손을 내립니다."]]},
 {id:'gift', title:'어린이 팬에게 공을 선물함', fans:20, loyalty:2, place:'구장 앞 · 어린이 팬과의 만남', action:'어린이 팬에게 야구공을 건넵니다.', response:'이 공, 평생 간직할게요!', positive:true},
 {id:'bench-song', title:'후보 선수에게도 응원가가', fans:0, loyalty:3, place:'경기 종료 후 · 관중석 앞 퇴장 통로', positive:true,
  shots:[['퇴장길','경기가 끝나고 선수들이 더그아웃으로 돌아갑니다.'],['갑작스러운 응원가','관중석에서 오늘 뛰지 못한 선수의 응원가가 들립니다.'],['멈춰 선 발걸음','자신의 이름을 들은 선수가 걸음을 멈추고 팬들을 바라봅니다.'],['눈물의 인사','눈물을 흘린 선수가 팬들에게 고개를 숙여 인사합니다.']]},
 {id:'lost-child', title:'길 잃은 어린이 돕기', fans:20, loyalty:0, place:'경기 후 · 구장 내부 관람 통로', positive:true,
  shots:[['혼자 남은 어린이','구장 안을 지나던 선수가 혼자 울먹이는 어린이를 발견합니다.'],['엄마를 찾아서','선수가 눈높이를 맞춰 말을 건네고, 함께 엄마를 찾습니다.'],['엄마 발견','어린이가 관중석 입구에서 자신을 찾던 엄마를 알아봅니다.'],['다시 만난 가족','선수가 어린이를 엄마에게 데려다줍니다. 아이가 엄마 품에 안깁니다.']]},
 {id:'flat-interview', title:'성의 없는 패배 인터뷰', fans:-12, loyalty:0, place:'패배 후 · 공식 인터뷰실', positive:false,
  shots:[['인터뷰 시작','기자와 카메라 앞에 앉은 선수에게 오늘 경기 소감을 묻습니다.'],['짧은 대답','선수는 시선을 돌리고 짧게 대답합니다.'],['이어지는 침묵','추가 질문에도 어깨만 으쓱하고 마이크에서 몸을 뺍니다.'],['어색한 마무리','선수가 먼저 일어나면서 인터뷰가 성의 없이 끝납니다.']]},
 {id:'youth-lesson', title:'유소년 원포인트 레슨', fans:18, loyalty:0, place:'경기 후 · 구장 보조 운동장', positive:true,
  shots:[['야구부와 만남','운동장에서 연습하던 야구부 아이들이 선수를 반깁니다.'],['자세를 배워요','선수가 방망이 잡는 법과 발의 위치를 직접 보여줍니다.'],['다시 한번!','아이가 배운 자세로 공을 치자 친구들이 타구를 따라봅니다.'],['함께한 하이파이브','공을 맞힌 아이와 선수가 하이파이브하고 친구들도 환호합니다.']]},
 {id:'concession-cut', title:'매점 새치기', fans:-15, loyalty:0, place:'경기 후 · 구장 매점 앞', positive:false,
  shots:[['매점 대기 줄','매점 앞에서 팬들이 차례를 기다리고 있습니다.'],['슬쩍 끼어들기','지나가던 선수가 줄 맨 앞으로 끼어듭니다.'],['먼저 주문','선수가 먼저 주문하자 기다리던 팬들이 놀라 쳐다봅니다.'],['팬들의 눈총','음료를 받은 선수가 돌아서는 동안 팬들의 표정이 굳습니다.']]}
];
const CLUB_EVENT_DURATION = 6600;
const CLUB_STORY_DURATION = 10000;
const CLUB_STORY_CUTS = [0,2200,4800,7400];
function clubEventDuration(event){return clubEventDefinition(event)?.shots?CLUB_STORY_DURATION:CLUB_EVENT_DURATION;}
function clubEventSceneEnd(event){return clubEventDefinition(event)?.shots?7400:4400;}
function clubEventPhaseCount(event){return clubEventDefinition(event)?.shots?4:3;}
function clubEventCast(t,p){return (t.players||[]).filter(x=>x.id!==p.id).slice(0,2).map(clone);}
let clubEventView = null;

function clubEventEligible(p,m,def){
 if(!p||!def||p.loyalty<=0||p.exitPending26)return false;
 // The complete used list includes starters, substitutes and players already taken out.
 if(def.id==='bench-song')return !!m.done&&Array.isArray(m.used)&&m.used.length>0&&!m.used.includes(p.id);
 if(def.id==='flat-interview')return !!m.done&&m.score?.[0]<m.score?.[1]&&Array.isArray(m.used)&&m.used.includes(p.id);
 return true;
}
function rollClubEvent(t,m){
 if(m.clubEvent)return m.clubEvent;
 const choices=CLUB_EVENT_TYPES.map((def,index)=>({index,players:t.players.filter(p=>clubEventEligible(p,m,def))})).filter(x=>x.players.length);
 if(!choices.length)return null;
 // Draw a valid story first so larger player pools do not make a story more common.
 const choice=pick(m,choices);
 return applyClubEvent(t,m,pick(m,choice.players),choice.index);
}
function applyClubEvent(t,m,p,typeIndex){
 if(m.clubEvent)return m.clubEvent;
 const def=CLUB_EVENT_TYPES[typeIndex];
 if(!clubEventEligible(p,m,def))return null;
 const before={fans:p.fans,loyalty:p.loyalty};
 p.fans=Math.max(0,p.fans+def.fans);
 p.loyalty=clamp(p.loyalty+def.loyalty,0,100);
 const event={id:m.id+':club',kind:def.id,playerId:p.id,player:p.name,text:def.title,
  fans:p.fans-before.fans,loyalty:p.loyalty-before.loyalty,before,
  after:{fans:p.fans,loyalty:p.loyalty},actor:clone(p),companions:clubEventCast(t,p),primary:t.primary,secondary:t.secondary,seen:false};
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
function clubEventScenePhase(ms,event){return clubEventDefinition(event)?.shots?(ms<2200?0:ms<4800?1:ms<7400?2:3):(ms<1500?0:ms<4400?1:2);}
function finishClubEventScene(){
 if(!clubEventView)return;
 cancelAnimationFrame(clubEventView.raf);clubEventView.raf=0;
 clubEventView.elapsed=clubEventDuration(clubEventView.event);
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
  (preview&&def.shots?'<div class="club-story-beats" aria-label="장면별로 보기">'+def.shots.map((s,i)=>'<button class="small ghost" data-club-scene-beat="'+i+'">'+(i+1)+'. '+esc(s[0])+'</button>').join('')+'</div>':'')+
  '<div class="club-event-caption" aria-live="polite"><span class="club-event-step"></span><p id="club-event-caption"></p></div>'+
  '<div class="club-event-changes" hidden>'+clubEventChanges(event)+'</div>'+
  '<footer class="club-event-actions"><span class="club-event-help">'+(preview?'미리보기 · 선수 수치는 바뀌지 않습니다.':'사건에 따른 변화는 이미 반영되었습니다.')+'</span><div><button data-club-event-skip>결과 바로 보기</button><button data-club-event-replay hidden>다시 재생</button><button class="primary" data-club-event-close>'+(preview?'닫기':'확인하고 계속')+'</button></div></footer></article>';
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const state=clubEventView={el,event,team:t,preview,elapsed:reduced?clubEventDuration(event):0,last:performance.now(),phase:-1,raf:0,focus:document.activeElement};
 document.body.append(el);el.showModal();el.querySelector('[data-club-event-close]').focus({preventScroll:true});
 const confirm=()=>{if(!state.preview&&state.phase<clubEventPhaseCount(state.event)-1)finishClubEventScene();else closeClubEvent();};
 el.addEventListener('cancel',e=>{e.preventDefault();confirm();});
 el.addEventListener('click',e=>{
  if(e.target.closest('[data-club-event-close]'))confirm();
  else if(e.target.closest('[data-club-event-skip]'))finishClubEventScene();
  else if(e.target.closest('[data-club-scene-beat]')){cancelAnimationFrame(state.raf);state.raf=0;state.elapsed=CLUB_STORY_CUTS[+e.target.closest('[data-club-scene-beat]').dataset.clubSceneBeat]+900;state.phase=-1;paintClubEventView(state);state.el.querySelector('[data-club-event-replay]').hidden=false;}
  else if(e.target.closest('[data-club-event-replay]')){cancelAnimationFrame(state.raf);state.elapsed=0;state.phase=-1;state.last=performance.now();state.raf=requestAnimationFrame(state.frame);}
 });
 el.querySelector('select')?.addEventListener('change',e=>{
  const kind=e.target.value;closeClubEvent();previewClubEvent(kind);
 });
 const frame=now=>{
  if(clubEventView!==state)return;
  if(!document.hidden)state.elapsed=Math.min(clubEventDuration(event),state.elapsed+Math.min(100,now-state.last));
  state.last=now;paintClubEventView(state);state.raf=state.elapsed<clubEventDuration(event)?requestAnimationFrame(frame):0;
 };
 state.frame=frame;
 frame(state.last);return true;
}
function paintClubEventView(state){
 const phase=clubEventScenePhase(state.elapsed,state.event),def=clubEventDefinition(state.event),done=state.elapsed>=clubEventSceneEnd(state.event);
 if(phase!==state.phase){
  state.phase=phase;
  state.el.querySelector('.club-event-step').textContent=def.shots?String(phase+1).padStart(2,'0')+' '+def.shots[phase][0]:['01 만남','02 무슨 일이 있었을까','03 팬들의 반응'][phase];
  state.el.querySelector('#club-event-caption').textContent=def.shots?def.shots[phase][1]:[state.event.player+' 선수에게 팬들의 시선이 모입니다.',def.action,def.response][phase];
  state.el.querySelectorAll('[data-club-scene-beat]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.clubSceneBeat===phase)));
  state.el.querySelector('canvas').setAttribute('aria-label',state.event.player+' · '+(def.shots?def.shots[phase][1]:[def.title,def.action,def.response][phase]));
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
 showClubEvent({id:'preview-'+kind,kind,playerId:p.id,player:p.name,text:def.title,actor:clone(p),companions:clubEventCast(t,p),primary:t.primary,secondary:t.secondary,
  before,after,fans:after.fans-before.fans,loyalty:after.loyalty-before.loyalty},true);
}

function drawClubEventScene(c,event,ms){
 if(typeof drawClubStoryScene==='function'&&drawClubStoryScene(c,event,ms))return;
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
 sceneImage(c,def.id==='bench-song'?3:0,0,-190,900,675);
 box(0,0,900,460,'#061c3744');box(0,308,900,152,'#c9b894');
 for(let i=0;i<10;i++)box(i*110-40,365,85,2,'#ae9d7d');
 for(let i=0;i<11;i++)box(i*96,427,70,2,'#ae9d7d');
 box(0,442,900,18,'#183b4a');
 let x=mix(140,355,arrival);
 if(def.id==='gift'){
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
 if(screen==='settings'&&t?.players.length)$('#app').insertAdjacentHTML('beforeend','<section class="panel settings-extra"><h3>구단 사건 연출</h3><p>실제 선수 모습으로 경기장 밖의 '+CLUB_EVENT_TYPES.length+'가지 이야기를 봅니다.</p><button data-club-event-preview>구단 사건 연출 미리보기</button></section>');
 if(t&&['result','home','news'].includes(screen)&&!clubEventView&&!$('#dialog')?.open&&!entrance){const event=pendingClubEvent(t);if(event)showClubEvent(event);}
};
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-club-event-open],[data-club-event-preview]');
 if(!button||button.disabled)return;
 if(button.hasAttribute('data-club-event-preview')){previewClubEvent();return;}
 const t=team(),id=button.dataset.clubEventOpen,event=t?.news?.find(x=>x.clubEvent?.id===id)?.clubEvent||(t?.match?.clubEvent?.id===id?t.match.clubEvent:null);
 if(event)showClubEvent(event);
});
window.ClubEvents={preview:previewClubEvent,show:showClubEvent,close:closeClubEvent,finish:finishClubEventScene,types:CLUB_EVENT_TYPES,duration:CLUB_EVENT_DURATION,durationFor:clubEventDuration};

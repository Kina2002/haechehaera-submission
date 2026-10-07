function lerp19(a,b,t){return a.map((v,i)=>v+(b[i]-v)*clamp(t,0,1));}
// Presentation follows the resolved play. This module never awards an out or a run.
const motionBuild19=buildMotion;
const caught19=e=>['fly','line','sf','flydp'].includes(e.type);
function glove19(point){return [point[0],point[1]-23*fieldScale(point[1])];}
function fieldPoint19(move,t){return move.knots?motionPoint(move.knots,t):lerp19(move.from,move.to,travelProgress15((t-move.start)/(move.end-move.start)));}
function planMotion19(m,e){
 e.fielderId=e.fielder?.id||e.fielderId;
 const df=tside(m,1-e.attack),primary=e.fieldMoves.find(x=>x.id===e.fielderId),steal=['sb','cs'].includes(e.type);
 const plan={land:.55,pickup:.55,throws:[],caught:caught19(e),steal};
 if(e.pitchThrown&&!e.contact)e.ball[1]=e.type==='hbp'?[ply(tside(m,e.attack),e.batter).hand==='좌타'?478:422,425]:[450,450];
 // Airborne catches wait for the fielder. Ground balls wait on the grass until pickup.
 if(primary&&plan.caught)plan.land=Math.max(.55,primary.end);
 plan.pickup=Math.max(plan.land,e.bh===7?.50:primary?.end||.55);
 if(steal){plan.land=.22;plan.pickup=.29;}
 if(['wp','pb'].includes(e.type)){plan.land=.43;plan.pickup=Math.max(.43,...e.fieldMoves.map(x=>x.end));}
 if(e.type==='sf')for(const mv of e.moves)mv.delay=Math.max(mv.delay,plan.land+.025);
 let bases=[...(e.throwBases||[])];
 // Covering an empty base was the mistake: no imaginary receiver or completed throw.
 if([7,10,12].includes(e.bh)||['hr','foul','wp','pb'].includes(e.type))bases=[];
 let from=steal?glove19(FIELD.C):glove19(e.target||FIELD.C),owner=steal?fielder(df,'C').id:e.fielderId;
 let cursor=steal?.36:plan.pickup+.025;
 const finish=.92,gap=.025;
 bases.forEach((base,index)=>{
  const receive=e.fieldMoves.find(x=>x.id!==owner&&Math.hypot(x.to[0]-BASES[base][0],x.to[1]-BASES[base][1])<1);
  const remain=bases.length-index;
  const end=Math.min(.98,Math.max(cursor+.018,cursor+(finish-cursor-gap*(remain-1))/remain,receive?.end||0));
  const to=e.badThrow&&index===bases.length-1?[742,374]:glove19(BASES[base]);
  const segment={base,from:from.slice(),to,start:cursor,end,thrower:owner,receiver:e.badThrow?null:receive?.id};
  plan.throws.push(segment);from=to;owner=segment.receiver;cursor=end+gap;
 });
 for(const mv of e.moves){
  const base=e.type==='flydp'&&mv.out?mv.from:mv.to,seg=plan.throws.find(x=>x.base===base);
  if(seg){
   // Force/tag outs: ball first. Safe plays: runner first. Missing-tag BH keeps the early throw.
   mv.until=mv.out?Math.min(.992,seg.end+.05):e.bh===9?Math.min(.97,seg.end+.015):Math.max(mv.delay+.06,seg.end-.06);
  }
  if(mv.delay>=mv.until)mv.until=Math.min(.995,mv.delay+.04);
 }
 e.motion19=plan;umpirePlans18.delete(e);return plan;
}
buildMotion=function(m,e){motionBuild19(m,e);planMotion19(m,e);};
function ballPoint19(e,t){
 const p=e.motion19;if(!p)return null;
 if(e.pitchThrown&&t<.22)return t<.13?null:lerp19(e.ball[0],e.ball[1],clamp((t-.13)/.09,0,1));
 if(e.type==='hbp')return t<.30?e.ball[1]:null;
 if(e.pitchThrown&&!e.contact&&!['wp','pb'].includes(e.type))return t<.29?lerp19(e.ball[1],glove19(FIELD.C),clamp((t-.22)/.07,0,1)):null;
 const pickup=e.fieldMoves.find(x=>x.id===e.fielderId),ground=e.target||[490,510];
 if(e.contact&&t<p.land){const u=clamp((t-.22)/(p.land-.22),0,1),end=p.caught?glove19(ground):ground,xy=lerp19(e.ball[1],end,u);xy[1]-=Math.sin(u*Math.PI)*(e.arc||0);return xy;}
 if(['hr','foul'].includes(e.type))return t<p.land+.06?ground:null;
 if(['wp','pb'].includes(e.type))return t<p.land?lerp19(e.ball[1],[490,510],clamp((t-.22)/(p.land-.22),0,1)):t<p.pickup?[490,510]:null;
 if(e.carry&&pickup&&t>=p.pickup)return glove19(fieldPoint19(pickup,t));
 if(!p.steal&&t<p.pickup)return ground;
 let held=p.steal?glove19(FIELD.C):glove19(ground);
 if(!p.caught&&!p.steal&&t<p.pickup+.025)return lerp19(ground,held,clamp((t-p.pickup)/.025,0,1));
 for(const segment of p.throws){if(t<segment.start)return held;if(t<=segment.end)return lerp19(segment.from,segment.to,(t-segment.start)/(segment.end-segment.start));held=segment.to;}
 return held;
}
const arrivalBefore19=throwArrival18;
throwArrival18=function(e,base){return e.motion19?.throws.find(x=>x.base===base)?.end??arrivalBefore19(e,base);};
const judgesBefore19=judgePlan18;
judgePlan18=function(e){const calls=judgesBefore19(e);if(e?.motion19)for(const c of calls){if(c.reason==='뜬공 포구'||c.reason==='직선타 포구')c.at=e.motion19.land;if(e.tag&&c.kind==='out'){const mv=e.moves.find(x=>x.out&&judgeBase18(x.to)===c.base);if(mv)c.at=Math.max(c.at,mv.until);}}return calls;};
function fieldPose19(e,id,t,pose){
 const p=e.motion19;if(!p)return pose;
 const throwing=p.throws.find(x=>x.thrower===id&&t>=x.start-.023&&t<x.start+.035);
 if(throwing)return 'throw';
 const catching=p.throws.find(x=>x.receiver===id&&t>=x.end&&t<x.end+.04);
 if(catching)return 'glove';
 if(id===e.fielderId&&p.caught&&t>=p.land&&t<p.land+.06)return 'catch';
 return pose;
}
const frameBefore19=actionFrame15;
actionFrame15=function(pose,t,p,distance){
 if(pose==='throw'&&anim?.e.motion19){const s=anim.e.motion19.throws.find(x=>x.thrower===p.id&&t>=x.start-.023&&t<x.start+.035);if(s)return[2,t<s.start-.007?2:t<s.start+.01?3:4];}
 return frameBefore19(pose,t,p,distance);
};
let field19=drawField.toString();
function replaceField19(a,b){if(!field19.includes(a))throw Error('v19 경기 연결 누락: '+a);field19=field19.replace(a,b);}
const ballBlock19=field19.slice(field19.indexOf('  let bp;'),field19.indexOf('  if(bp)'));
if(!ballBlock19||!ballBlock19.includes('e.ball'))throw Error('v19 공 경로 연결 누락');
replaceField19(ballBlock19,'  let bp=ballPoint19(e,t);\n');
replaceField19('if(actor.p.id===e.fielderId&&t>.55&&t<.7&&!e.bh)pose=["fly","line","sf"].includes(e.type)?"catch":"throw";','if(actor.fieldPos){pose=fieldPose19(e,actor.p.id,t,pose);const s=e.motion19?.throws.find(x=>x.thrower===actor.p.id&&t>=x.start-.023&&t<x.end);if(s)actor.flip=s.to[0]<s.from[0];}');
replaceField19('if(e.tag&&mt>.9)pose="slide";','if(e.tag&&move.out&&mt>.9&&mt<1)pose="slide";');
replaceField19('if(e.bh&&t>.4&&!anim.resultShown)','if(false)');
drawField=(0,eval)('('+field19+')');

// One clear lower-left popup. No duplicate command, out count, or next-batter text.
const BH_EXPLAIN19={1:'홈런인 줄 알고 타구를 구경하다 출발이 늦었습니다.',2:'페어 타구를 파울로 착각해 달리지 않았습니다.',3:'뜬공이 잡혔는데 계속 뛰어 귀루하지 못했습니다.',4:'베이스를 밟지 않고 지나쳐 다시 돌아갑니다.',5:'앞 주자를 보지 못해 한 베이스에 두 주자가 모였습니다.',6:'포수가 보고 있는데 무리하게 도루했습니다.',7:'아직 이닝이 끝나지 않았는데 공을 들고 더그아웃으로 갑니다.',8:'주자를 잡아야 할 곳 대신 엉뚱한 베이스로 던졌습니다.',9:'태그해야 하는데 베이스만 밟았습니다.',10:'다음 송구를 잊고 세리머니부터 합니다.',11:'서로 잡을 줄 알고 양보하다 공을 떨어뜨렸습니다.',12:'베이스를 커버하지 않아 공을 받을 선수가 없습니다.'};
function popup19(e,t,result=false){
 if(!e)return null;
 const plan=e.motion19,calls=judgePlan18(e).filter(c=>c.at<=t+.00001),last=calls.at(-1);
 const owner=e.attack===0?'우리 팀':'상대 팀';
 if(e.bh&&t>=.38){const tm=tside(team().match,e.bhSide??0),names=(e.bhActors||[]).map(id=>ply(tm,id)?.name).filter(Boolean).join(' · ');return {key:'bh',theme:'mistake',tag:(e.bhSide===1?'상대 팀':'우리 팀')+' · '+(names||'선수 실수'),title:'본헤드!',detail:BH_EXPLAIN19[e.bh]||e.reason};}
 if(last){let title=last.kind==='k'?(e.type==='ks'?'헛스윙 삼진!':'루킹 삼진!'):last.kind==='safe'?'세이프!':last.kind==='strike'?(e.type==='swing'?'헛스윙!':'스트라이크!'):'아웃!';
  if(e.type==='sb'&&last.kind==='safe')title='도루 성공!';if(e.type==='cs'&&last.kind==='out')title='도루 저지!';if(['dp','flydp'].includes(e.type)&&calls.filter(c=>c.kind==='out').length===2)title='병살!';
  if(last.reason==='뜬공 포구')title='플라이 아웃!';if(last.reason==='직선타 포구')title='직선타 아웃!';if(e.type==='sf'&&last.kind==='safe')title='희생플라이!';
  if(last.kind==='safe'&&['single','double','triple'].includes(e.type))title=({single:'안타 · 세이프!',double:'2루타!',triple:'3루타!'})[e.type];
  const detail=e.type==='sb'?'주자가 태그보다 먼저 베이스를 밟았습니다.':e.type==='cs'?'베이스에 닿기 전에 태그되었습니다.':title==='희생플라이!'?'뜬공 아웃 뒤 3루 주자가 홈으로 들어왔습니다.':title==='병살!'?'이어진 수비로 주자 두 명이 아웃됐습니다.':last.kind==='strike'?(e.swing?'배트가 공을 맞히지 못했습니다.':'공을 지켜봤습니다.'):last.kind==='k'?(e.swing?'마지막 공에 배트가 헛돌았습니다.':'마지막 스트라이크를 지켜봤습니다.'):last.reason==='베이스 아웃'?'송구가 주자보다 먼저 베이스에 도착했습니다.':last.kind==='safe'?'주자가 베이스에 안전하게 도착했습니다.':last.reason;
  const location=last.reason.includes('포구')?'포구':last.base===0?'홈':last.base+'루';
  return {key:'call-'+calls.length,theme:last.kind==='safe'?'safe':'out',tag:owner+' 공격 · '+location+' 판정',title,detail};
 }
 const resolved=result||(['ball','bb','hbp','wp','pb','foul'].includes(e.type)&&t>=(e.type==='foul'?.45:.30))||(e.type==='hr'&&t>=.55);
 if(resolved){const info=outcomeInfo(e);return{key:'result',theme:e.type==='hr'?'safe':'neutral',tag:owner,title:info.title,detail:info.description};}
 if(plan?.steal)return{key:'steal',theme:'neutral',tag:owner,title:'도루 시도!',detail:'주자가 출발하고 포수가 송구합니다.'};
 const flight=plan?.throws.find(s=>t>=s.start&&t<s.end);
 if(flight)return{key:'throw-'+flight.base,theme:'neutral',tag:(e.attack===0?'상대 팀':'우리 팀')+' 수비',title:'송구!',detail:(flight.base===4?'홈':flight.base+'루')+'로 공을 던집니다.'};
 if(e.contact&&t>=(plan?.land||.55)&&!['hr','foul'].includes(e.type))return{key:'field',theme:'neutral',tag:(e.attack===0?'상대 팀':'우리 팀')+' 수비',title:'수비 중',detail:t<(plan?.pickup||.55)?'공을 향해 움직입니다.':'공을 잡아 다음 플레이를 준비합니다.'};
 if(e.contact&&t>=.22)return{key:'contact',theme:'neutral',tag:owner,title:'타격!',detail:'공이 뻗어갑니다.'};
 return{key:'pitch',theme:'neutral',tag:owner,title:'투구!',detail:e.swing?'타자가 배트를 준비합니다.':'타자가 공을 기다립니다.'};
}
function popupMarkup19(p){return '<div class="event-popup19 '+p.theme+'" role="status"><small>'+esc(p.tag)+'</small><strong>'+esc(p.title)+'</strong><p>'+esc(p.detail)+'</p></div>';}
const matchBefore19=matchHTML;
matchHTML=function(){return matchBefore19().replace(/<div id="bigPlay" class="outcome-dock"[\s\S]*?<\/div><div class="controls">/,'<div class="controls">').replace('<div id="reactionHost"></div>','<div id="reactionHost"></div><div id="bigPlay" class="event-host19" aria-live="polite" aria-atomic="true"></div>');};
outcomeCard=function(e){return popupMarkup19(popup19(e,1,true));};
// A scoreboard render replaces DOM nodes, so presentation history must live outside the DOM.
const popupMemory20={event:null,seen:new Set(),hitCard:null};
function renderPopup20(host,e,p,state=popupMemory20){
 if(state.event!==e){state.event=e;state.seen=new Set();state.hitCard=null;}
 if(!p){if(host.firstChild)host.replaceChildren();delete host.dataset.shown;return;}
 // One hit can advance several runners. Show the hit once, not one hit card per safe call.
 if(['single','double','triple'].includes(e.type)&&p.key.startsWith('call-')&&p.theme==='safe'){
  if(!state.hitCard)state.hitCard={...p,tag:(e.attack===0?'우리 팀':'상대 팀')+' 공격',detail:'타구가 안타로 이어졌습니다.'};
  p=state.hitCard;
 }
 const semantic=p.theme+':'+p.title,signature=JSON.stringify([e.id,p.theme,p.tag,p.title,p.detail]);
 if(host.dataset.shown===signature)return;
 const first=!state.seen.has(semantic);state.seen.add(semantic);
 host.dataset.shown=signature;host.innerHTML=popupMarkup19(p);
 const card=host.firstElementChild;card.dataset.event=e.id;card.dataset.phase=semantic;card.dataset.enter=String(first);
 if(first)card.classList.add('popup-enter20');
}
paintOutcome=function(){if(screen!=='match')return;const host=$('#bigPlay');if(!host)return;const e=anim?.e,p=e?popup19(e,playProgress(clamp(anim.elapsed/anim.duration,0,1)),anim.resultShown):null;renderPopup20(host,e,p);};
effectsForEvent=function(c,e,t,time){paintScore15(e);paintOutcome();};
const holdBefore19=resultHoldMs;
resultHoldMs=function(e){return Math.max(2200,holdBefore19(e));};
const popupCSS19=document.createElement('style');popupCSS19.textContent=`
.in-game .field-wrap{position:relative}
.in-game #bigPlay.event-host19{position:absolute;left:12px;bottom:12px;width:clamp(210px,34%,310px);max-width:42%;height:auto;inset:auto auto 12px 12px;z-index:6;pointer-events:none;transform:none;display:block}
.event-popup19{--accent:#8cdafa;padding:12px 14px 13px;background:#071b30f5;border:2px solid var(--accent);border-left-width:6px;border-radius:7px;box-shadow:0 4px 0 #020d19,0 7px 18px #00152277;text-align:left;animation:none;color:#f4f7ed}
.event-popup19.popup-enter20{animation:popupIn19 .2s ease-out both}
.event-popup19.safe{--accent:#83f1b4}.event-popup19.out{--accent:#ffd177}.event-popup19.mistake{--accent:#ff998b;background:#321b2bf5}
.event-popup19 small{display:block;font-size:11px;line-height:1.5;color:var(--accent);overflow-wrap:anywhere}
.event-popup19 strong{display:block;font:clamp(23px,2.4vw,34px)/1.25 NeoDunggeunmo,monospace;color:var(--accent);margin:3px 0 5px;text-shadow:2px 2px #04111c}
.event-popup19 p{margin:0;font-size:12px;line-height:1.65;word-break:keep-all;overflow-wrap:anywhere;color:#eef4f5}
@keyframes popupIn19{from{opacity:0;transform:translateX(-12px) scale(.96)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.event-popup19.popup-enter20{animation:none}}
@media(max-width:650px){.in-game #bigPlay.event-host19{left:5px;bottom:5px;max-width:48%;width:210px}.event-popup19{padding:7px}.event-popup19 p{font-size:10px}.event-popup19 small{font-size:9px}.event-popup19 strong{font-size:22px}}
`;document.head.append(popupCSS19);

const seenScenes19=new Map();
function validateMotion19(e){
 const failures=[],p=e.motion19;if(!p)return ['missing plan'];
 const check=(ok,label)=>{if(!ok)failures.push(label);};
 let prevEnd=p.pickup;
 p.throws.forEach((s,i)=>{
  check(s.start>=prevEnd&&s.end>s.start&&s.end<=1,'포구 전 송구 / 순서 '+i);
  check(!!s.thrower,'송구 선수 없음 '+i);
  const receiver=e.fieldMoves.find(x=>x.id===s.receiver);
  if(receiver)check(receiver.end<=s.end+.00001,'수신 선수 늦음 '+i);
  if(i)check(p.throws[i-1].receiver===s.thrower,'중계 송구 주인 불일치');
  const at=ballPoint19(e,s.end);check(Math.hypot(at[0]-s.to[0],at[1]-s.to[1])<.001,'공 도착 위치 '+i);
  prevEnd=s.end;
 });
 for(const mv of e.moves){
  check(mv.until>mv.delay&&mv.until<=1,'주자 시간 순서');
  const base=e.type==='flydp'&&mv.out?mv.from:mv.to,s=p.throws.find(x=>x.base===base);
  if(s)check(mv.out?mv.until>s.end:e.bh===9||mv.until<s.end,'세이프/아웃 도착 순서');
  if(e.type==='sf')check(mv.delay>p.land,'태그업 조기 출발');
 }
 for(const call of judgePlan18(e)){
  if(call.kind==='out'&&call.reason==='베이스 아웃')check(call.at>=(p.throws.find(s=>judgeBase18(s.base)===call.base)?.end||0),'공 도착 전 아웃');
 }
 if([7,10,12].includes(e.bh))check(p.throws.length===0,'본헤드 가짜 송구');
 if(e.pitchThrown&&!e.contact&&e.type!=='hbp')check(e.ball[1][0]===450,'공을 고를 때 배트로 공 이동');
 return failures;
}
function rememberScene19(kind,m,e){seenScenes19.set(kind,{type:e.type,bh:e.bh||0,failures:validateMotion19(e),plan:e.motion19,runners:e.moves.map(x=>({from:x.from,to:x.to,out:x.out,delay:x.delay,until:x.until})),calls:judgePlan18(e)});}
function simulationChecks19(){
 const keep={data,anim,reaction,screen,shiftLead};suppressPersist++;const games=[],failures=[],types={};
 try{for(const seed of [1919,2020,2121]){
  const t=newTeam('동작 검증',11,5),o=newTeam('상대 검증',8,4);data={saveVersion:1,slots:[t,null],current:0,settings:{sound:false,speed:1}};anim=null;reaction=null;shiftLead=null;
  const m={id:'motion-'+seed,opp:o,home:1,inning:1,half:0,outs:0,balls:0,strikes:0,bases:[null,null,null],score:[0,0],order:[0,0],last:[null,null],hits:[0,0],errors:[0,0],innings:[Array(7).fill(0),Array(7).fill(0)],paPitches:0,events:[],rng:seed,pitches:0,bh:[0,0],bhBase:[0,0],bhBaseUsed:[0,0],opportunities:[0,0],defense:{side:1,depth:1},checks:{events:0,violations:[],motions:0,reactions:0},lastLines:{},reactionCount:0,used:t.lineup.map(x=>x.id),subs:[],done:false};t.match=m;prepare(m);
  let count=0;while(!m.done&&count<600){const e=resolvePitch(m);types[e.type]=(types[e.type]||0)+1;const bad=validateMotion19(e);if(bad.length)failures.push({seed,index:count,type:e.type,bh:e.bh,failures:bad,plan:e.motion19,runners:e.moves.map(x=>({id:x.id,from:x.from,to:x.to,out:x.out,delay:x.delay,until:x.until}))});count++;}
  games.push({seed,events:count,done:m.done,ruleViolations:m.checks.violations});
 }}finally{data=keep.data;anim=keep.anim;reaction=keep.reaction;screen=keep.screen;shiftLead=keep.shiftLead;suppressPersist--;}
 return {games,types,failures};
}
if($('#qaTools')){const b=document.createElement('button');b.id='qa19Check';b.textContent='팝업·움직임 3경기 검사';b.onclick=()=>{const simulation=simulationChecks19(),rules=ruleChecks(),judges=judgeChecks18();note('팝업·움직임 검사','<pre id="motionReport19">'+esc(JSON.stringify({simulation,scenes:Object.fromEntries(seenScenes19),rules,judges,runtimeErrors:runtimeErrors.slice()},null,2))+'</pre>');};$('#qaTools').append(b);}
document.addEventListener('click',ev=>{if(!ev.target.closest('#qa15Open'))return;const s=$('#qa15Scene');if(s)s.insertAdjacentHTML('beforeend','<option value="ball">볼 · 스윙 없음</option>'+[7,8,11,12].map(n=>'<option value="bh'+n+'">우리 팀 본헤드 · '+BH_LABELS[n]+'</option>').join(''));});

function popupChecks20(){
 const rows=[],check=(name,fn)=>{try{if(!fn())throw Error('expected one entrance');rows.push({name,ok:true});}catch(e){rows.push({name,ok:false,error:e.message});}};
 const state=()=>({event:null,seen:new Set(),hitCard:null}),host=()=>document.createElement('div');
 const e={id:'same-play',type:'ground'},p={key:'call-1',theme:'out',tag:'1루',title:'아웃!',detail:'송구 도착'};
 check('한 프레임에서 두 번 호출해도 DOM/등장 효과 유지',()=>{const h=host(),s=state();renderPopup20(h,e,p,s);const node=h.firstChild;renderPopup20(h,e,p,s);return h.firstChild===node&&h.children.length===1;});
 check('결과 확정으로 호스트를 다시 만들어도 재등장 없음',()=>{const h=host(),s=state();renderPopup20(h,e,p,s);const next=host();renderPopup20(next,e,p,s);return next.firstChild.dataset.enter==='false'&&next.firstChild.textContent.includes('아웃!');});
 check('일시정지/재개 화면 갱신 5회에도 같은 결과 재등장 없음',()=>{const s=state();renderPopup20(host(),e,p,s);return Array.from({length:5},()=>{const h=host();renderPopup20(h,e,p,s);return h.firstChild.dataset.enter==='false';}).every(Boolean);});
 check('다음 플레이의 동일한 아웃은 새로 표시',()=>{const h=host(),s=state();renderPopup20(h,e,p,s);renderPopup20(h,{...e,id:'next-play'},p,s);return h.firstChild.dataset.enter==='true';});
 check('실제 다중 주자 세이프 판정은 안타 카드 1회',()=>{const ev={id:'hit',type:'single',attack:0,moves:[{id:'r',from:1,to:2,until:.60},{id:'b',from:0,to:1,until:.9}],fieldMoves:[],runs:[],after:{bases:['b','r',null]}},h=host(),s=state();renderPopup20(h,ev,popup19(ev,.65),s);const node=h.firstChild;renderPopup20(h,ev,popup19(ev,.95),s);return h.firstChild===node&&s.seen.size===1;});
 check('병살의 첫 아웃과 최종 병살은 각각 보존',()=>{const ev={id:'dp',type:'dp',attack:0,moves:[{from:1,to:2,out:true},{from:0,to:1,out:true}],throwBases:[2,1],fieldMoves:[],after:{bases:[]}},calls=judgePlan18(ev),h=host(),s=state();renderPopup20(h,ev,popup19(ev,(calls[0].at+calls[1].at)/2),s);const first=h.textContent;renderPopup20(h,ev,popup19(ev,1,true),s);return first.includes('아웃!')&&h.textContent.includes('병살!')&&s.seen.size===2;});
 check('팝업을 지운 뒤 같은 결과 갱신도 재등장 없음',()=>{const h=host(),s=state();renderPopup20(h,e,p,s);h.replaceChildren();delete h.dataset.shown;renderPopup20(h,e,p,s);return h.firstChild.dataset.enter==='false';});
 return rows;
}
if($('#qaTools')){const b=document.createElement('button');b.id='qa20Check';b.textContent='팝업 중복 검사';b.onclick=()=>note('팝업 중복 검사','<pre id="popupReport20">'+esc(JSON.stringify({checks:popupChecks20(),runtimeErrors:runtimeErrors.slice()},null,2))+'</pre>');$('#qaTools').append(b);}

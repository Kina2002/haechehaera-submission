/* 승부처 개입 시안 · 2026-11-05 v01
   실제 게임 코드 위에 덧붙여 보여 주는 시안 전용 스크립트입니다.
   게임 원본 파일은 바꾸지 않고, data-test-session 모드라 실제 구단 저장을 읽거나 쓰지 않습니다. */
(function(){
'use strict';
const S={on:true,level:'sometimes'};                 // level: 'sometimes'(가끔) | 'often'(자주)
const asked=new Set();
let pending=null,timer=null,plan=null,forceSteal=false,started=false,sceneSeq=0;

const COMMANDS={power:['풀스윙','장타를 노립니다. 헛스윙이 조금 늘어요.'],contact:['컨택','맞히는 데 집중합니다. 장타는 줄어요.'],take:['참아','볼을 골라 출루를 노립니다. 루킹 삼진 위험이 있어요.']};
const DEPTHS=[['전진 수비','3루 주자의 홈 쇄도를 막습니다. 내야를 빠지는 타구는 늘어요.'],['기본 수비','평소 위치를 지킵니다.'],['후퇴 수비','장타를 막습니다. 대신 3루 주자는 쉽게 들어와요.']];
const busy=()=>anim||reaction||shiftLead||(typeof sideSwitch!=='undefined'&&sideSwitch)||(typeof entrance!=='undefined'&&entrance);
const paKey=m=>m.inning+'-'+m.half+'-'+m.order[attack(m)];
const diffOf=m=>m.score[0]-m.score[1];
const canSteal=m=>m.bases.some((id,i)=>id&&i<2&&!m.bases[i+1]);

function baseText(m){const b=m.bases.map((id,i)=>id?i+1:0).filter(Boolean);return b.length===3?'만루':b.length?b.join('·')+'루':'주자 없음';}
function scoreText(m){const d=diffOf(m);return m.score[0]+' : '+m.score[1]+' ('+(d>0?d+'점 앞섬':d<0?-d+'점 뒤짐':'동점')+')';}

// A clutch moment is judged once, right before a plate appearance starts.
function detect(m){
 if(m.done||m.paPitches!==0)return null;
 const often=S.level==='often',d=diffOf(m),close=Math.abs(d)<=(often?2:1),late=m.inning>=(often?3:4);
 const risp=!!(m.bases[1]||m.bases[2]),half=m.inning+'-'+m.half,own=attack(m)===0,key=paKey(m);
 if(!own){const p=pitcher(team());if(p.energy/p.a.stamina<=.3)return {kind:'tired',key:'tired-'+p.id};}
 const halfKey='half-'+half;if(!often&&asked.has(halfKey))return null;
 if(own&&m.half===1&&m.inning>=5&&(d===0||d===-1)&&m.bases.some(Boolean))return {kind:'walkoff',key,halfKey};
 if(own&&late&&close&&risp)return {kind:'attack',key,halfKey};
 if(!own&&late&&close&&risp)return {kind:'defense',key,halfKey};
 return null;
}

function card(id,title,body,suggested){return '<button class="clutch-option'+(suggested?' suggested':'')+'" data-clutch="'+id+'"><b>'+title+(suggested?' <em>자동 판단</em>':'')+'</b><small>'+body+'</small></button>';}

function open(m,c){
 pending=c;const t=team(),own=attack(m)===0,b=batter(m),p=pitcher(tside(m,1-attack(m))),ourP=pitcher(t);
 const head={attack:'득점 기회! 어떻게 칠까요?',walkoff:'끝내기 기회! 어떻게 칠까요?',defense:'실점 위기! 수비를 어떻게 할까요?',tired:'우리 투수 체력이 바닥났어요'}[c.kind];
 let options='';
 if(c.kind==='attack'||c.kind==='walkoff'){for(const [k,[n,d]] of Object.entries(COMMANDS))options+=card('cmd-'+k,n,d,k===defaultCommand(m));if(canSteal(m))options+=card('steal','도루','다음 공에 주자가 뜁니다. 포수 송구에 잡힐 수 있어요.');}
 else if(c.kind==='defense')DEPTHS.forEach(([n,d],i)=>{options+=card('depth-'+i,n,d,i===m.defense.depth);});
 else options=card('relieve','투수 교체','교체 창을 열어 후보 투수를 고릅니다.',true)+card('keep','계속 던지기','체력이 낮아 구위가 떨어진 채로 던집니다.');
 const who=c.kind==='tired'?'<p class="clutch-who">현재 투수 · '+esc(ourP.name)+' #'+ourP.number+' · 체력 '+Math.round(100*ourP.energy/ourP.a.stamina)+'%</p>'
  :'<p class="clutch-who">타자 · '+esc(b.name)+' #'+b.number+(own?' · 컨택 '+b.a.contact+' · 파워 '+b.a.power+' · 선구안 '+b.a.eye:' · '+b.hand+' · '+b.tendency+' · 파워 '+b.a.power)+'<br>투수 · '+esc(p.name)+' #'+p.number+' · 구속 '+p.a.velocity+' · 제구 '+p.a.control+'</p>';
 const el=document.createElement('section');el.className='clutch-panel';el.setAttribute('role','dialog');el.setAttribute('aria-label','승부처 감독 지시');
 el.innerHTML='<div class="clutch-badge">⚡ 승부처 · 자동 경기 일시 멈춤</div><h3>'+head+'</h3><p class="clutch-situation">'+situationText(m)+'</p>'+who+
  '<div class="clutch-options">'+options+'</div><div class="clutch-foot"><span>고르지 않으면 <b id="clutchLeft">10</b>초 뒤 자동 판단으로 계속합니다</span><button class="small" data-clutch="skip">그대로 진행</button></div>';
 document.body.appendChild(el);
 let left=10000;timer=setInterval(()=>{left-=100;const n=document.getElementById('clutchLeft');if(n)n.textContent=Math.ceil(left/1000);if(left<=0)choose('skip');},100);
}
function situationText(m){return m.inning+'회 '+(m.half?'말':'초')+' · '+m.outs+'아웃 · '+baseText(m)+' · '+scoreText(m);}

function close(){clearInterval(timer);timer=null;document.querySelector('.clutch-panel')?.remove();pending=null;}

function choose(id){
 const m=team()?.match,c=pending;if(!m||!c)return close();
 if(id.startsWith('cmd-')){plan={key:c.key,command:id.slice(4)};toast('감독 지시 · '+COMMANDS[plan.command][0]+' (이번 타석 동안)');}
 else if(id==='steal'){forceSteal=true;toast('감독 지시 · 도루');}
 else if(id.startsWith('depth-')){m.defense={...m.defense,depth:Number(id.slice(6))};m.defChosen=true;toast('감독 지시 · '+DEPTHS[m.defense.depth][0]);}
 else if(id==='relieve'){close();subDialog();const out=document.getElementById('subOut');if(out){out.value=pitcher(team()).id;out.dispatchEvent(new Event('change',{bubbles:true}));}return;}
 else if(id==='keep')toast('감독 지시 · 투수 유지');
 else if(c.kind==='tired')autoRelieve(m);
 else toast('자동 판단으로 계속합니다');
 close();updateControls();
}

// Left alone, a tired pitcher is replaced by the rested bench arm with the best velocity and control.
function autoRelieve(m){const t=team(),now=pitcher(t);
 const pick=t.players.filter(p=>!t.lineup.some(x=>x.id===p.id)&&!m.used.includes(p.id)).sort((a,b)=>(b.a.velocity+b.a.control)*b.energy/b.a.stamina-(a.a.velocity+a.a.control)*a.energy/a.a.stamina)[0];
 if(!pick)return toast('교체할 후보 투수가 없어 계속 던집니다');
 const err=substitute(t,now.id,pick.id);toast(err||'자동 판단 · 투수 교체: '+now.name+' → '+pick.name);render();}

const baseLaunch=launchPitch;
launchPitch=function(skipShift=false){
 const m=team()?.match;
 if(pending)return;
 if(m&&S.on&&m.auto&&!skipShift&&!m.done&&!m.paused&&!busy()&&waitMs<=0){
  const c=detect(m);
  if(c&&!asked.has(c.key)){asked.add(c.key);if(c.halfKey)asked.add(c.halfKey);open(m,c);return;}
 }
 if(m&&plan&&plan.key===paKey(m))m.command=plan.command;
 if(forceSteal){forceSteal=false;const steal=TUNE.steal;TUNE.steal=1;try{return baseLaunch(skipShift);}finally{TUNE.steal=steal;}}
 return baseLaunch(skipShift);
};

// Preview helpers: start a test match and jump straight to a clutch moment.
function startDemo(){
 let t=team();
 if(!t){t=newTeam('해체 드림즈',11,5);data.slots[0]=t;data.current=0;}
 activeGame=true;if(!t.match||t.match.done)startMatch();else go('match');
 if(t.match){t.match.auto=true;t.match.paused=false;}
 render();
}
// Only the latest request wins, so a waiting request never overwrites a newer one.
function scene(kind,seq=++sceneSeq){
 if(!started||seq!==sceneSeq)return;
 const t=team();if(!t?.match||t.match.done){startDemo();return setTimeout(()=>scene(kind,seq),300);}
 if(busy())return setTimeout(()=>scene(kind,seq),250);
 close();asked.clear();plan=null;forceSteal=false;
 const m=t.match;if(kind==='walkoff')m.home=0;
 const own=kind==='attack'||kind==='walkoff';
 const inn=kind==='walkoff'?5:4;m.half=own?(m.home===0?1:0):(m.home===0?0:1);m.inning=inn;m.outs=1;m.balls=0;m.strikes=0;m.paPitches=0;
 m.score={attack:[2,3],walkoff:[2,2],defense:[3,3],tired:[4,3]}[kind];
 const at=tside(m,attack(m)),now=m.order[attack(m)],ids=at.lineup.slice(0,9).map(x=>x.id).filter((id,i)=>i!==now);
 m.bases={attack:[null,ids[0],ids[1]],walkoff:[null,ids[0],null],defense:[null,ids[0],ids[1]],tired:[ids[0],null,null]}[kind];
 if(kind==='tired'){const p=pitcher(t);p.energy=Math.round(p.a.stamina*.25);}
 for(const s of [0,1]){m.innings[s]=Array(7).fill(null);for(let i=0;i<inn-1;i++)m.innings[s][i]=0;m.innings[s][1]=m.score[s];}
 m.innings[attack(m)][inn-1]=0;if(m.half===1)m.innings[1-attack(m)][inn-1]=0;
 m.formation=null;m.auto=true;m.paused=false;waitMs=0;prepare(m);go('match');render();
 toast({attack:'4회 · 1점 뒤진 1아웃 2·3루, 우리 공격',walkoff:'5회 말 동점 1아웃 2루, 우리 공격',defense:'4회 동점 1아웃 2·3루, 상대 공격',tired:'4회 · 우리 투수 체력 25%'}[kind]);
}

function dock(){
 const el=document.createElement('aside');el.className='clutch-dock';
 el.innerHTML='<b class="clutch-title" title="눌러서 접기·펼치기">⚡ 승부처 개입 시안 ▾</b><label><input type="checkbox" id="clutchOn" checked> 자동 경기 중 승부처에서 멈추기</label>'+
  '<div class="clutch-row"><span>빈도</span><button class="small active" data-level="sometimes" title="4회 이후 1점 차 이내 · 반 이닝에 한 번">가끔</button><button class="small" data-level="often" title="3회 이후 2점 차 이내 · 타석마다">자주</button></div>'+
  '<div class="clutch-row wrap"><span>바로 보기</span><button class="small" data-scene="attack">득점권 공격</button><button class="small" data-scene="defense">위기 수비</button><button class="small" data-scene="walkoff">끝내기 기회</button><button class="small" data-scene="tired">투수 체력 바닥</button></div>'+
  '<button class="small" data-scene="new">새 시험 경기</button><small>시험용 구단 · 실제 저장과 분리 · 게임 원본은 바꾸지 않음</small>';
 document.body.appendChild(el);
 el.querySelector('#clutchOn').addEventListener('change',ev=>{S.on=ev.target.checked;if(!S.on)close();toast(S.on?'승부처에서 멈춥니다':'기존 자동 경기처럼 멈추지 않습니다');});
 el.addEventListener('click',ev=>{if(ev.target.closest('.clutch-title')){el.classList.toggle('collapsed');return;}const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.level){S.level=b.dataset.level;el.querySelectorAll('[data-level]').forEach(x=>x.classList.toggle('active',x===b));toast(S.level==='often'?'자주: 3회 이후 2점 차 이내 · 타석마다':'가끔: 4회 이후 1점 차 이내 · 반 이닝에 한 번');}
  if(b.dataset.scene==='new'){sceneSeq++;close();asked.clear();plan=null;startDemo();}
  else if(b.dataset.scene)scene(b.dataset.scene);});
}
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-clutch]');if(b)choose(b.dataset.clutch);});

(function boot(){
 if(typeof ART==='undefined'||!ART.ready)return setTimeout(boot,200);
 started=true;dock();startDemo();
 setTimeout(()=>scene('attack'),400);
 window.ClutchPreview={detect,scene,settings:S,get pending(){return pending;}};
})();
})();

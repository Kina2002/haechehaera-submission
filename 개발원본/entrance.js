// The opening is presentation only: no pitch, revenue, stamina or RNG is consumed.
const ENTRANCE_MS=5400;
let entrance=null;
function entranceStage(ms){return ms<2100?0:ms<4100?1:2;}
function entranceOrder(m){return m?.home===0?{label:'우리 팀 후공 · 1회 말 공격',detail:'1회 초에는 수비부터 시작합니다.'}:{label:'우리 팀 선공 · 1회 초 공격',detail:'1회 초에 먼저 타석에 들어섭니다.'};}
function holdEntrance(m){m.pendingEntrance=true;m.paused=true;m.inputLeft=RULES.decisionSeconds;}
function releaseEntrance(m){if(!m.pendingEntrance)return false;delete m.pendingEntrance;m.paused=false;m.inputLeft=RULES.decisionSeconds;return true;}
const entranceStartBase=startMatch;
startMatch=function(){
 if(entrance)return;
 const t=team(),before=t?.match?.id;
 entranceStartBase();
 if(t?.match&&!t.match.done&&t.match.id!==before){
  anim=null;reaction=null;shiftLead=null;waitMs=0;
  holdEntrance(t.match);save();render();
 }
};
const entranceRenderBase=render;
render=function(){
 entranceRenderBase();
 if(screen==='settings'&&team())$('#app').insertAdjacentHTML('beforeend','<section class="panel settings-extra"><h3>경기 입장 연출</h3><p class="muted-note">관중 입장 → 선수 준비 → 경기 시작. 약 5초 동안 경기 시작을 기다립니다.</p><button data-entrance="preview">경기 입장 연출 미리보기</button><p class="tiny muted">미리보기는 경기 기록과 자금에 영향을 주지 않습니다.</p></section>');
 if(screen==='match'&&team()?.match?.pendingEntrance&&!entrance)showEntrance(false);
};
function finishEntrance(){
 const state=entrance;if(!state)return;
 entrance=null;cancelAnimationFrame(state.raf);state.el.remove();
 for(const [node,prior] of state.inert)node.inert=prior;
 if(!state.preview&&team()?.match===state.match){
  releaseEntrance(state.match);waitMs=0;lastFrame=performance.now();save();render();
 }else state.focus?.focus({preventScroll:true});
}
function showEntrance(preview=false){
 if(entrance||!team()||!ART.ready)return;
 const t=team(),m=t.match;
 if(!preview&&(!m||m.done))return;
 if(!preview)holdEntrance(m);
 const el=document.createElement('section');el.className='entrance-overlay';
 el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','entrance-title');
 const foe=m?.opp||artOpponent(t);
 el.innerHTML='<div class="entrance-card"><div class="entrance-top"><span>해체해라 · '+(preview?'경기 입장 미리보기':'오늘의 경기')+'</span><small>진지한 야구, 이상한 선수들.</small></div><div class="entrance-picture"><canvas width="900" height="530" aria-label="관중이 입장하고 선수들이 경기 준비를 하는 도트 애니메이션"></canvas><div class="entrance-vs">'+esc(t.name)+'<b>VS</b>'+esc(foe.name||'상대 구단')+'</div></div><div class="entrance-footer"><div class="entrance-steps"><span>01 관중 입장</span><span>02 선수 준비</span><span>03 경기 시작</span></div><div aria-live="polite"><h2 id="entrance-title"></h2><p class="entrance-caption"></p></div><button class="primary" data-entrance="skip">'+(preview?'미리보기 닫기':'바로 경기로 ▶')+'</button></div></div>';
 const blocked=[$('#app'),$('#header')].filter(Boolean),focus=document.activeElement;
 const order=entranceOrder(m);
 el.querySelector('.entrance-picture').insertAdjacentHTML('beforeend','<div class="entrance-order"><strong>'+order.label+'</strong><span>'+order.detail+(preview&&!m?' (선공 예시)':'')+'</span></div>');
 const state=entrance={el,preview,match:m,t,foe,elapsed:0,last:performance.now(),stage:-1,raf:0,focus,inert:blocked.map(n=>[n,n.inert])};
 blocked.forEach(n=>n.inert=true);document.body.append(el);el.querySelector('button').focus({preventScroll:true});
 const frame=now=>{
  if(entrance!==state)return;
  if(!document.hidden)state.elapsed+=Math.min(100,now-state.last);
  state.last=now;
  if(state.elapsed>=ENTRANCE_MS){finishEntrance();return;}
  const stage=entranceStage(state.elapsed);
  if(state.stage!==stage){
   state.stage=stage;
   el.querySelector('h2').textContent=['관중들이 들어오고 있습니다…','선수들이 경기를 준비하고 있습니다…','경기가 시작됩니다!'][stage];
   el.querySelector('.entrance-caption').textContent=['응원할 준비 되셨나요? 곧 선수들이 그라운드에 들어섭니다.','몸을 풀고, 글러브를 확인하고, 각자의 자리로!','오늘도 야구는 합니다. 감독님의 첫 지시를 기다립니다.'][stage];
   el.querySelectorAll('.entrance-steps span').forEach((n,i)=>n.className=i===stage?'current':i<stage?'done':'');
  }
  drawEntrance(el.querySelector('canvas').getContext('2d'),state);
  state.raf=requestAnimationFrame(frame);
 };
 frame(state.last);
}
// Tiny back-view spectators share the teams' colours, with grounded walking feet.
function entranceFan(c,x,y,size,tm,phase,index){
 c.save();c.translate(Math.round(x),Math.round(y));c.scale(size,size);
 const step=Math.sin(phase*.019+index)*2,primary=COLORS[tm.primary][1],trim=COLORS[tm.secondary][1];
 c.fillStyle='#06212b55';c.fillRect(-7,0,14,3);
 const box=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
 box(-5,-7,4,7+Math.round(step),'#14263b');box(1,-7,4,7-Math.round(step),'#14263b');
 box(-7,-19,14,13,'#101d2d');box(-5,-18,10,10,primary);
 box(-9,-17+step,3,8,'#eeb588');box(6,-17-step,3,8,'#eeb588');
 box(-6,-27,12,10,'#171c27');box(-7,-28,14,8,primary);box(-5,-29,10,3,primary);
 box(-2,-23,4,2,trim);box(-4,-20,8,3,'#714332');
 if(index%3===0){box(-10,-15+step,3,7,trim);box(-11,-17+step,5,3,trim);}
 c.restore();
}
function drawEntrance(c,state){
 const {elapsed:ms,stage,t,foe}=state;c.imageSmoothingEnabled=false;c.clearRect(0,0,900,530);
 if(stage===0){
  // Keep the original aspect ratio; the gate is at (450,365) after this crop.
  sceneImage(c,0,0,-45,900,675);
  const people=[];
  for(let i=0;i<24;i++){
   const u=(ms/3000+i/24)%1,startX=135+(i%8)*88,lane=i%3-1;
   people.push({i,u,x:startX+(450+lane*22-startX)*u,y:580-215*u});
  }
  people.sort((a,b)=>a.y-b.y);
  for(const p of people){c.globalAlpha=Math.min(1,(1-p.u)*14);entranceFan(c,p.x,p.y,1.35-(p.u*.55),p.i%3? t:foe,ms,p.i);}
  c.globalAlpha=1;
 }else{
  drawStadium(c,900,530,ms);
  const defense=state.match?tside(state.match,1-attack(state.match)):t;
  const offense=state.match?tside(state.match,attack(state.match)):foe;
  const warm=clamp((ms-2100)/2000,0,1),fielders=defense.lineup||[],oppPlayers=offense.players||[];
  for(let i=0;i<fielders.length;i++){
   const item=fielders[i],p=ply(defense,item.id);if(!p)continue;
   const dest=fieldPosition(item.pos),u=clamp(warm*1.4-i*.025,0,1);
   const x=(130+i*9)+(dest[0]-130-i*9)*u,y=445+(dest[1]-445)*u;
   sprite(c,x,y,.78,defense,p.number,'player',u<1?'run':i%2?'glove':'idle',ms,p.id);
  }
  // The visiting batter warms up beside the dugout, away from the live plate.
  const bat=oppPlayers[0]||t.players[0]||demoPlayer;
  sprite(c,795,455,.95,oppPlayers.length?offense:t,bat.number,'player',stage===1&&Math.floor(ms/420)%2?'swing':'bat',ms,bat.id);
  if(stage===1&&oppPlayers.length>2){
   const u=((ms-2100)%1000)/1000,pass=u<.5?u*2:2-u*2;
   sprite(c,671,419,.75,offense,oppPlayers[1].number,'player',u<.12?'throw':'glove',ms,oppPlayers[1].id);
   sprite(c,743,419,.75,offense,oppPlayers[2].number,'player',u>.5&&u<.62?'throw':'glove',ms,oppPlayers[2].id,true);
   c.fillStyle='#fff6df';c.fillRect(678+Math.round(pass*56),395-Math.round(Math.sin(pass*Math.PI)*12),5,5);
  }
  if(stage===2){
   c.fillStyle='#031c3bdc';c.fillRect(245,150,410,112);c.strokeStyle='#ffd66e';c.lineWidth=3;c.strokeRect(245,150,410,112);
   c.textAlign='center';c.fillStyle='#ffdb63';c.font='44px NeoDunggeunmo';c.fillText('PLAY BALL!',450,202);
   c.fillStyle='#dcecfb';c.font='18px Galmuri9';c.fillText('경기가 시작됩니다!',450,237);
  }
 }
}
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-entrance]');if(!b)return;ev.preventDefault();ev.stopImmediatePropagation();if(b.dataset.entrance==='preview')showEntrance(true);else finishEntrance();},true);

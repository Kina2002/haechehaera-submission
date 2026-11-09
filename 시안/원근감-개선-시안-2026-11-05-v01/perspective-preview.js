/* 원근감 개선 시안 · 2026-11-05 v01
   실제 게임 화면 위에 원근(크기)·발밑 그림자·심판 크기·먼 거리 색감만 덧붙여 "수정 전/후"를 비교합니다.
   게임 원본 파일은 바꾸지 않고, data-test-session 모드라 실제 구단 저장을 읽거나 쓰지 않습니다. */
(function(){
'use strict';
const P={on:true,scale:true,shadow:true,umpire:true,haze:true,strength:1};

// Perspective: near players keep today's size, far outfielders shrink to about 0.6x (today 0.79x).
const baseScale=fieldScale;
const strongScale=y=>.55+.95*Math.pow(clamp((y-190)/290,0,1),.85);
fieldScale=function(y){const old=baseScale(y);return P.on&&P.scale?old+(strongScale(y)-old)*P.strength:old;};
const ratio=y=>fieldScale(y)/baseScale(y);

// A soft wide shadow plus a darker contact patch right under the feet keeps players on the grass.
function groundShadow(c,x,y,scale){
 const rx=19*scale,ry=5.6*scale;c.save();c.translate(Math.round(x),Math.round(y)+1);c.scale(1,ry/rx);
 const g=c.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,'rgba(5,22,12,.66)');g.addColorStop(.45,'rgba(5,22,12,.42)');g.addColorStop(1,'rgba(5,22,12,0)');
 c.fillStyle=g;c.beginPath();c.arc(0,0,rx,0,Math.PI*2);c.fill();
 c.fillStyle='rgba(3,16,8,.45)';c.beginPath();c.arc(0,0,rx*.42,0,Math.PI*2);c.fill();c.restore();
}
const haze=y=>clamp((300-y)/110,0,1);

const baseSprite=sprite;
sprite=function(c,x,y,scale,tm,number,role,pose,tick,id,flip){
 if(!P.on||role!=='player'||c.canvas?.id!=='field')return baseSprite.apply(this,arguments);
 if(P.shadow)groundShadow(c,x,y,scale);
 const f=P.haze?haze(y):0;
 if(f<=0)return baseSprite.apply(this,arguments);
 c.save();c.filter='saturate('+(1-.3*f).toFixed(2)+') brightness('+(1+.05*f).toFixed(2)+')';
 try{return baseSprite.apply(this,arguments);}finally{c.restore();}
};

// Umpires were drawn at a fixed size; follow the same perspective ratio and ground shadow.
const umpireSource=drawUmpire15.toString();
const scaleExpr='scale=(base===0?62:base===2?44:52)/seq[0].rect[3]',shadowExpr="c.ellipse(0,2,base===2?12:16,3,0,0,7);c.fill();";
if(umpireSource.includes(scaleExpr)&&umpireSource.includes(shadowExpr)){
 window.__perspectiveUmpire={size:y=>P.on&&P.umpire?ratio(y):1,shadow:(c,s)=>{if(P.on&&P.shadow)groundShadow(c,0,0,s);}};
 drawUmpire15=(0,eval)('('+umpireSource
  .replace(scaleExpr,'scale=(base===0?62:base===2?44:52)*window.__perspectiveUmpire.size(xy[1])/seq[0].rect[3]')
  .replace(shadowExpr,shadowExpr+'window.__perspectiveUmpire.shadow(c,(base===2?.85:1.1)*window.__perspectiveUmpire.size(xy[1]));')+')');
}else console.warn('원근 시안: 심판 그리기 코드가 예상과 달라 심판 크기 맞춤을 건너뜁니다.');

const redraw=()=>{if(screen==='match')drawField(performance.now());};

// Preview helpers: a test match in auto play, plus a busy defensive scene for comparison.
let started=false;
function startDemo(){
 let t=team();if(!t){t=newTeam('해체 드림즈',11,5);data.slots[0]=t;data.current=0;}
 activeGame=true;if(!t.match||t.match.done)startMatch();else go('match');
 if(t.match){t.match.auto=true;t.match.paused=false;}render();
}
function busyScene(){
 const t=team(),m=t?.match;if(!m||m.done){startDemo();return setTimeout(busyScene,300);}
 if(anim||reaction||shiftLead||(typeof sideSwitch!=='undefined'&&sideSwitch)||(typeof entrance!=='undefined'&&entrance))return setTimeout(busyScene,250);
 m.half=m.home===0?0:1;m.outs=1;m.balls=0;m.strikes=0;m.paPitches=0;
 const at=tside(m,attack(m)),now=m.order[attack(m)],ids=at.lineup.slice(0,9).map(x=>x.id).filter((id,i)=>i!==now);
 m.bases=[ids[0],ids[1],ids[2]];m.formation=null;prepare(m);m.paused=true;document.body.classList.add('persp-frozen');go('match');render();redraw();
 toast('수비 장면 · 만루 · 일시정지 상태입니다. 수정 전/후를 바꿔 보세요');
}

function dock(){
 const el=document.createElement('aside');el.className='persp-dock';
 el.innerHTML='<b class="persp-title" title="눌러서 접기·펼치기">🏟 원근감 개선 시안 ▾</b>'+
  '<div class="persp-ab"><button data-ab="off">수정 전</button><button data-ab="on" class="active">수정 후</button></div>'+
  '<label><input type="checkbox" data-opt="scale" checked> 원근 강화 (먼 선수 더 작게)</label>'+
  '<label class="persp-range">강도 <input type="range" min="0" max="150" value="100" id="perspStrength"> <span id="perspStrengthText">100%</span></label>'+
  '<label><input type="checkbox" data-opt="shadow" checked> 발밑 그림자</label>'+
  '<label><input type="checkbox" data-opt="umpire" checked> 심판도 원근 맞춤</label>'+
  '<label><input type="checkbox" data-opt="haze" checked> 먼 거리 색감</label>'+
  '<div class="persp-row"><button data-act="scene">수비 장면 고정</button><button data-act="play">경기 재개</button></div>'+
  '<small>시험용 구단 · 실제 저장과 분리 · 게임 원본은 바꾸지 않음</small>';
 document.body.appendChild(el);
 const sync=()=>{el.querySelectorAll('[data-ab]').forEach(b=>b.classList.toggle('active',(b.dataset.ab==='on')===P.on));redraw();};
 el.addEventListener('click',ev=>{
  if(ev.target.closest('.persp-title')){el.classList.toggle('collapsed');return;}
  const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.ab){P.on=b.dataset.ab==='on';sync();toast(P.on?'수정 후 화면입니다':'수정 전(지금 게임) 화면입니다');}
  if(b.dataset.act==='scene')busyScene();
  if(b.dataset.act==='play'){document.body.classList.remove('persp-frozen');const m=team()?.match;if(m&&!m.done){m.paused=false;m.auto=true;render();}else startDemo();}
 });
 el.addEventListener('change',ev=>{const o=ev.target.dataset.opt;if(o){P[o]=ev.target.checked;redraw();}});
 el.querySelector('#perspStrength').addEventListener('input',ev=>{P.strength=ev.target.value/100;el.querySelector('#perspStrengthText').textContent=ev.target.value+'%';redraw();});
}

(function boot(){
 if(typeof ART==='undefined'||!ART.ready)return setTimeout(boot,200);
 started=true;dock();startDemo();
 window.PerspectivePreview={settings:P,scene:busyScene,strongScale,baseScale};
})();
})();

/* Visual placement only: render the unmodified six-body atlas on the v04 field. */
(function(){
'use strict';
const oldSprite=sprite;
const P={on:true,ready:false,scale:1,names:['보통형','단단한 중량형','날렵형','어깨 넓은형','키 큰형','작고 단정한형'],used:new Set()};
window.CharacterPlacement=P;
const rectangles=[[62,188,250,556],[348,169,316,575],[708,154,218,590],[968,159,324,585],[1331,117,228,627],[1634,230,226,514]];
const positions=['P','C','1B','2B','3B','SS','LF','CF','RF'];
const bodyForPosition=[4,1,3,5,0,2,0,1,2];
const atlas=new Image();
atlas.onload=()=>{P.ready=true;redraw();};
atlas.onerror=()=>{P.error='체형 그림을 불러오지 못했습니다.';};
atlas.src=window.PlacementAtlasURL||new URL('체형별-뼈대-원본-v01.png',document.currentScript.src).href;
function typeFor(tm,id){
 const position=tm?.lineup?.find(x=>x.id===id)?.pos,index=positions.indexOf(position);
 if(index>=0)return bodyForPosition[index];
 return Math.max(0,tm?.players?.findIndex(x=>x.id===id)??0)%6;
}
function redraw(){
 window.BroadcastPreview?.lowView?.cache.clear();
 if(typeof screen!=='undefined'&&screen==='match')drawField(performance.now());
}
sprite=function(c,x,y,scale,tm,number=0,role='player',pose='idle',tick=0,id='',flip=false){
 const field=c.canvas.id==='field'||c.canvas.id==='low-actor-buffer';
 if(!P.on||!P.ready||role!=='player'||!field)return oldSprite.apply(this,arguments);
 const type=typeFor(tm,id),r=rectangles[type],unit=56/552*scale*P.scale;
 const w=r[2]*unit,h=r[3]*unit;
 c.save();c.translate(Math.round(x),Math.round(y));c.imageSmoothingEnabled=false;
 c.fillStyle='#092f2355';c.beginPath();c.ellipse(0,1,Math.max(7,w*.38),Math.max(1.4,2.8*scale),0,0,Math.PI*2);c.fill();
 if(flip)c.scale(-1,1);
 // A single source-pixel scale preserves all six natural height differences.
 c.drawImage(atlas,...r,Math.round(-w/2),Math.round(-(r[3]-2)*unit),Math.round(w),Math.round(h));
 c.restore();c.canvas.dataset.placement='six-body-atlas';P.used.add(type);
};
P.setBodies=on=>{P.on=!!on;document.querySelectorAll('[data-body-mode]').forEach(b=>{const active=(b.dataset.bodyMode==='new')===P.on;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});annotate();redraw();};
P.setScale=value=>{P.scale=clamp(Number(value),.75,1.35);const out=document.querySelector('#placement-scale-value');if(out)out.textContent=Math.round(P.scale*100)+'%';redraw();};
P.typeFor=typeFor;P.rectangles=rectangles;
function annotate(){
 const note=document.querySelector('.bc-arena-bar>span:nth-child(2)'),label=P.on?'정면 뼈대 임시 배치 · 표정·동작 적용 전':'기존 선수와 크기 비교';
 if(note&&note.textContent!==label)note.textContent=label;
 const field=document.querySelector('#field'),alt=P.on?'새 체형별 정면 뼈대를 기존 경기장 위치에 배치한 크기 비교 시안':'기존 경기장 선수 표시';
 if(field&&field.getAttribute('aria-label')!==alt)field.setAttribute('aria-label',alt);
}
(function boot(){
 if(!P.ready||!window.BroadcastPreview?.ready)return setTimeout(boot,100);
 const dock=document.querySelector('.bc-dock');
 dock.innerHTML='<b>새 캐릭터 · 경기장 배치</b><span class="bc-dock-group"><button type="button" data-scene="attack" class="active">공격 보기</button><button type="button" data-scene="defense">수비 보기</button></span><span class="bc-dock-group"><button type="button" data-body-mode="new" class="active" aria-pressed="true">새 뼈대</button><button type="button" data-body-mode="old" aria-pressed="false">기존 선수</button></span><label>선수 크기 <input id="placement-scale" aria-label="선수 크기" type="range" min="75" max="135" value="100" step="5"><output id="placement-scale-value">100%</output></label>';
 dock.addEventListener('click',e=>{const b=e.target.closest('[data-body-mode]');if(b)P.setBodies(b.dataset.bodyMode==='new');});
 dock.querySelector('#placement-scale').addEventListener('input',e=>P.setScale(Number(e.target.value)/100));
 new MutationObserver(annotate).observe(document.querySelector('#app'),{childList:true,subtree:true});annotate();
 const style=document.createElement('style');style.textContent='.bc-dock{gap:16px}.bc-dock label{display:flex;align-items:center;gap:8px;font-size:11px;white-space:nowrap}.bc-dock input{width:95px;accent-color:#ffe05c}.bc-dock output{width:35px;font-variant-numeric:tabular-nums}.bc-arena-bar>span:nth-child(2){color:#a5c7cb}';document.head.appendChild(style);
 redraw();P.booted=true;
})();
})();

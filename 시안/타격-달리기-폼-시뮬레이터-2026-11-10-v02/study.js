(function(){
'use strict';
const $=s=>document.querySelector(s),D=FormCandidates,M=FormMotion;
const S={kind:'bat',selected:'B01',playing:true,speed:1,hand:'right',silhouette:false,personality:'all',clock:0,scrub:0};
let last=performance.now(),cardCanvases=[],stripCanvases=[];
function selected(){return D[S.kind].find(f=>f.id===S.selected)||D[S.kind][0];}
function poseTime(form){return S.kind==='bat'?(S.clock/2.6)%1:(S.clock*form.p.cadence)%1;}
function options(extra={}){return{left:S.kind==='bat'&&S.hand==='left',silhouette:S.silhouette,clock:S.clock,...extra};}
function paint(c,form,t,extra={}){M.render(c.getContext('2d'),c.width,c.height,form,S.kind,t,options(extra));}
function drawCards(){
 const recommended=S.personality==='all'?[]:D.personalities[S.personality][S.kind];
 $('#cards').innerHTML=D[S.kind].map(f=>'<button type="button" class="form-card '+(f.id===S.selected?'selected ':'')+(recommended.includes(f.id)?'recommended':'')+'" data-id="'+f.id+'" aria-pressed="'+(f.id===S.selected)+'"><div class="card-head"><span class="card-id">'+f.id+'</span><strong>'+f.name+'</strong><span class="card-hint">어울림 후보</span></div><canvas width="340" height="205" aria-label="'+f.name+' 동작"></canvas><div class="card-caption">'+f.features[0]+'</div>'+(f.id===S.selected?'<span class="selected-mark">선택한 폼</span>':'')+'</button>').join('');
 cardCanvases=D[S.kind].map(f=>({form:f,canvas:$('#cards [data-id="'+f.id+'"] canvas')}));
 $('#grid-title').textContent=S.kind==='bat'?'타격폼 후보':'달리기폼 후보';
 $('#grid-note').textContent=S.kind==='bat'?'같은 선수와 타격 시점으로 자세를 비교합니다.':'모든 폼의 이동 속도는 같습니다. 보폭과 발 교대 리듬을 비교합니다.';
 $('#hand-label').hidden=S.kind!=='bat';
}
function drawDetail(){
 const f=selected();$('#detail-id').textContent=f.id;$('#detail-title').textContent=f.name;$('#detail-description').textContent=f.description;
 $('#features').innerHTML=f.features.map(x=>'<li>'+x+'</li>').join('');$('#tags').innerHTML=f.tags.map(x=>'<span>'+x+'</span>').join('');
 $('#strip').innerHTML=D.phases[S.kind].map((x,i)=>'<button type="button" data-frame="'+i+'" aria-label="'+(i+1)+'번 '+x+'"><canvas width="180" height="160"></canvas><span>'+(i+1)+'. '+x+'</span></button>').join('');
 stripCanvases=[...$('#strip').querySelectorAll('canvas')];drawStrip();
}
function drawStrip(){const f=selected();stripCanvases.forEach((c,i)=>paint(c,f,D.sampleTimes[S.kind][i],{scale:1.32,clock:0}));}
function render(){
 const f=selected(),t=S.playing?poseTime(f):S.scrub;
 for(const item of cardCanvases)paint(item.canvas,item.form,S.playing?poseTime(item.form):S.scrub);
 paint($('#hero'),f,t,{scale:2.78});paint($('#small-preview'),f,t,{small:true});
 const phase=M.phase(S.kind,t);$('#phase-label').textContent=D.phases[S.kind][phase];$('#frame-label').textContent=(phase+1)+' / 6';
 $('#strip').querySelectorAll('button').forEach((b,i)=>b.classList.toggle('active',i===phase));
 if(S.playing)$('#scrub').value=Math.round(t*1000);
}
function setPlay(on){
 if(!on&&S.playing)S.scrub=poseTime(selected());
 if(on&&!S.playing){const f=selected();S.clock=S.kind==='bat'?S.scrub*2.6:S.scrub/f.p.cadence;}
 S.playing=on;$('#play').textContent=on?'Ⅱ 일시정지':'▶ 재생';$('#play').setAttribute('aria-pressed',String(on));render();
}
function changeKind(kind){if(!['bat','run'].includes(kind))return;S.kind=kind;S.selected=D[kind][0].id;S.clock=0;S.scrub=0;document.querySelectorAll('[data-kind]').forEach(b=>{b.classList.toggle('active',b.dataset.kind===kind);b.setAttribute('aria-pressed',String(b.dataset.kind===kind));});drawCards();drawDetail();render();}
function select(id){if(!D[S.kind].some(f=>f.id===id))return;S.selected=id;drawCards();drawDetail();render();}
document.querySelectorAll('[data-kind]').forEach(b=>b.addEventListener('click',()=>changeKind(b.dataset.kind)));
$('#cards').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)select(b.dataset.id);});
$('#personality').addEventListener('change',e=>{S.personality=e.target.value;drawCards();render();});
$('#silhouette').addEventListener('change',e=>{S.silhouette=e.target.checked;drawStrip();render();});
$('#hand').addEventListener('change',e=>{S.hand=e.target.value;drawStrip();render();});
$('#speed').addEventListener('change',e=>{S.speed=Number(e.target.value);});$('#play').addEventListener('click',()=>setPlay(!S.playing));
$('#scrub').addEventListener('input',e=>{setPlay(false);S.scrub=Number(e.target.value)/1000;render();});
$('#strip').addEventListener('click',e=>{const b=e.target.closest('[data-frame]');if(!b)return;setPlay(false);S.scrub=D.sampleTimes[S.kind][Number(b.dataset.frame)];$('#scrub').value=Math.round(S.scrub*1000);render();});
function contactSheet(kind){
 const v=document.createElement('canvas'),g=v.getContext('2d');v.width=1536;v.height=1130;g.fillStyle='#061b28';g.fillRect(0,0,v.width,v.height);g.fillStyle='#e8f1e9';g.font='bold 27px "Malgun Gothic",sans-serif';g.fillText(kind==='bat'?'타격폼 6종 · 기준 캐릭터 적용 v02':'달리기폼 6종 · 기준 캐릭터 적용 v02',28,41);g.fillStyle='#abc5c9';g.font='15px "Malgun Gothic",sans-serif';g.fillText('어제 만든 경기장용 선수의 외형 유지 · 성격과 실력은 별도 · 6칸 분할동작 검토본',28,70);
 const x0=224,cw=212,rowH=166,y0=115;
 D.phases[kind].forEach((label,i)=>{g.fillStyle='#c9e3dc';g.font='15px "Malgun Gothic",sans-serif';g.fillText((i+1)+'. '+label,x0+i*cw+15,101);});
 D[kind].forEach((f,row)=>{const y=y0+row*rowH;g.fillStyle=row%2?'#0b2937':'#0c2533';g.fillRect(16,y,v.width-32,rowH-8);g.fillStyle='#a6c6c9';g.font='13px "Malgun Gothic",sans-serif';g.fillText(f.id,30,y+49);g.fillStyle='#eef2e9';g.font='bold 20px "Malgun Gothic",sans-serif';g.fillText(f.name,30,y+79);for(let i=0;i<6;i++){const cell=document.createElement('canvas');cell.width=cw-6;cell.height=rowH-12;M.render(cell.getContext('2d'),cell.width,cell.height,f,kind,D.sampleTimes[kind][i],{scale:1.3,clock:0});g.drawImage(cell,x0+i*cw,y);}});
 return v;
}
$('#sheet-export').addEventListener('click',()=>{const a=document.createElement('a');a.download=(S.kind==='bat'?'타격폼':'달리기폼')+'-6종-분할동작-v02.png';a.href=contactSheet(S.kind).toDataURL('image/png');a.click();});
window.FormStudy={state:S,changeKind,select,setPlay,render,contactSheet,ready:false};
M.ready.then(()=>{drawCards();drawDetail();render();window.FormStudy.ready=true;last=performance.now();requestAnimationFrame(tick);}).catch(e=>{$('#grid-note').textContent=e.message;console.error(e);});
function tick(now){const dt=Math.min(.08,(now-last)/1000);last=now;if(S.playing)S.clock+=dt*S.speed;render();requestAnimationFrame(tick);}
})();

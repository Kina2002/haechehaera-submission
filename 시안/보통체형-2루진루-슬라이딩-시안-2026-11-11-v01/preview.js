/* Isolated visual prototype; no game data or original implementation is loaded. */
(function(){'use strict';
const W=1672,H=941,DURATION=10,$=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,u)=>a+(b-a)*u,smooth=u=>u*u*(3-2*u),lerp=(a,b,u)=>a.map((v,i)=>mix(v,b[i],u));
const FIRST=[1239,581],BASE=[838,480],EDGE=[848,482];
const state={time:0,playing:false,speed:1,scenario:'safe',style:'feet',zoom:true,loop:false,ready:false,recording:false,errors:[]};
const phases=[
{name:'1루 대기',start:0,end:.8,sample:.4},
{name:'출발',start:.8,end:1.6,sample:1.3},
{name:'2루 진루',start:1.6,end:4.2,sample:3.1},
{name:'슬라이딩 준비',start:4.2,end:4.7,sample:4.45},
{name:'슬라이딩·태그',start:4.7,end:5.7,sample:5.15},
{name:'베이스 접촉',start:5.7,end:6.5,sample:6.05},
{name:'일어나기',start:6.5,end:8.3,sample:7.65},
{name:'대기·종료',start:8.3,end:10,sample:9.3}];
const assets=window.SECOND_ASSETS||{runner:'보통형-2루동작24칸-v01.png',tagger:'2루수-포구태그8칸-v01.png',standing:'보통형-동작24칸-v02.png',thrower:'수비-포구송구6칸-v02.png',field:'경기장-2루주루-배경-v01.png'};
const imgs={},events=()=>SecondBaseTag.fixtures[state.scenario],race=t=>SecondBaseTag.at(t,events());
const anchors=[[140,237],[140,237],[140,237],[140,237],[140,237],[140,237],[108,229],[70,229],[43,229],[25,230],[28,230],[33,230],[98,221],[38,154],[17,173],[12,197],[18,207],[27,210],[58,225],[62,227],[85,230],[94,231],[61,223],[128,225]];
const phaseIndex=t=>{const i=phases.findIndex(p=>t<p.end);return i<0?phases.length-1:i;};
const phaseTitle=i=>state.scenario==='out'&&i>=5?['태그 아웃','몸 일으키기','진루 종료'][i-5]:phases[i].name;
let last=0,previous=-1;
function progress(t){
 let p=t<.8?0:t<1.6?.08*((t-.8)/.8)**2:t<4.2?mix(.08,.82,(t-1.6)/2.6):t<4.7?mix(.82,.88,(t-4.2)/.5):mix(.88,1,1-(1-clamp((t-4.7)))**2);
 if(state.scenario==='out')p=Math.min(p,.9637);
 return p;
}
function pose(t){
 if(t<.8)return -1;
 if(t<4.2)return Math.floor((t-.8)*10)%6;
 if(t<4.7)return state.style==='feet'?(t<4.45?6:7):12;
 const out=race(t).out;
 if(state.style==='feet'){
  if(t<5.05)return 8;if(t<5.5)return 9;if(t<6.35)return out?11:10;
  if(t<6.7)return 11;if(t<7.2)return 18;if(t<7.9)return 19;if(t<8.5)return 20;return 21;
 }
 if(t<5.05)return 14;if(t<5.55)return 15;if(t<6.5)return 16;
 if(t<6.9)return 17;if(t<7.35)return 22;if(t<8.05)return 23;return 21;
}
function runnerAt(t){
 const f=pose(t),p=progress(t),height=mix(82,73,p),s=height/218;
 let anchorWorld=lerp(FIRST,EDGE,p);
 if(race(t).runnerOnBase){
  anchorWorld=lerp(EDGE,BASE,smooth(clamp((t-5.7)/.25)));
  if(state.style==='head'&&f===23)anchorWorld=[848,480];
 }
 const a=f<0?[166,239]:anchors[f];
 // A torso point, rather than the head or a floating label, receives the tag.
 const hitLocal=state.style==='feet'?[135,186]:[132,184];
 const hit=f>=8&&f<=17?[anchorWorld[0]+(hitLocal[0]-a[0])*s,anchorWorld[1]+(hitLocal[1]-a[1])*s]:[anchorWorld[0]+18,anchorWorld[1]-18];
 return {frame:f,progress:p,height,scale:s,anchor:a,contact:anchorWorld,hit,runnerOnBase:race(t).runnerOnBase};
}
function sheetSprite(c,img,frame,cols,rows,ax,ay,x,y,scale,mirror=false){
 const cw=img.width/cols,ch=img.height/rows;
 c.save();c.translate(x,y);if(mirror)c.scale(-1,1);c.imageSmoothingEnabled=false;
 c.drawImage(img,(frame%cols)*cw,Math.floor(frame/cols)*ch,cw,ch,-ax*scale,-ay*scale,cw*scale,ch*scale);c.restore();
}
function runner(c,t){
 const r=runnerAt(t);
 if(r.frame<0)sheetSprite(c,imgs.standing,23,6,4,166,239,...r.contact,r.scale,true);
 else sheetSprite(c,imgs.runner,r.frame,6,4,...r.anchor,...r.contact,r.scale);
 return r;
}
function ball(c,p,size=5){c.fillStyle='#fffde9';c.fillRect(Math.round(p[0]-size/2),Math.round(p[1]-size/2),size,size);}
function badge(c,text,x,y,color='#ffe17b',width=106){
 c.fillStyle='#082a3af2';c.fillRect(x-width/2,y,width,24);c.strokeStyle=color;c.strokeRect(x-width/2,y,width,24);c.fillStyle=color;c.font='bold 13px "Malgun Gothic",sans-serif';c.textAlign='center';c.fillText(text,x,y+17);c.textAlign='left';
}
function bag(c,p,width=18,height=9){const[x,y]=p;c.beginPath();c.moveTo(x-width,y);c.lineTo(x,y-height);c.lineTo(x+width,y);c.lineTo(x,y+height);c.closePath();c.fillStyle='#fffdeb';c.fill();c.strokeStyle='#b7b8a0';c.lineWidth=1;c.stroke();}
function insideBase(p){return Math.abs(p[0]-BASE[0])/18+Math.abs(p[1]-BASE[1])/9<=1.02;}
const gloves=[[218,205],[312,103],[312,103],[344,241],[343,318],[344,318],[220,205],[220,205]];
function taggerAt(t){
 const e=events(),a=clamp((t-(e.tagAt-.5))/.5),returning=smooth(clamp((t-e.tagAt-.4)/1.1)),ready=[807,474],scale=73/330,cw=imgs.tagger.width/4;
 const unit=cw/384,anchor=[160*unit,360*unit],target=runnerAt(e.tagAt).hit;
 const g=gloves[4].map(v=>v*unit),targetRoot=[target[0]-(g[0]-anchor[0])*scale/unit,target[1]-(g[1]-anchor[1])*scale/unit];
 let root=lerp(ready,targetRoot,smooth(a));if(returning>0)root=lerp(targetRoot,ready,returning);
 let frame=t<e.catchAt-.22?0:t<e.catchAt?1:t<e.tagAt-.5?2:t<e.tagAt-.09?3:t<e.tagAt+.15?4:t<e.tagAt+.4?5:t<e.tagAt+1.5?6:7;
 const glove=[root[0]+(gloves[frame][0]-160)*scale,root[1]+(gloves[frame][1]-360)*scale];
 return {frame,root,glove,scale:scale/unit,anchor,target,tagDistance:Math.hypot(glove[0]-target[0],glove[1]-target[1])};
}
function header(c,t){
 const r=race(t);c.fillStyle='#082437';c.fillRect(539,65,591,43);c.font='bold 22px "Malgun Gothic",sans-serif';c.fillStyle='#ffdf43';c.fillText('우리 공격 · 3회 말',557,96);
 function light(x,on,color){c.beginPath();c.arc(x,88,7,0,7);c.fillStyle=on?color:'#18383b';c.fill();c.strokeStyle=on?color:'#5c746c';c.stroke();}
 c.font='bold 17px "Malgun Gothic",sans-serif';
 for(const [label,x,xs,color] of [['B',788,[818,840,862],'#49edb1'],['S',895,[924,946],'#ffe04e'],['O',977,[1006,1028],'#ff6659']]){
 c.fillStyle='#dcecf3';c.fillText(label,x,94);xs.forEach((v,i)=>light(v,label==='O'&&r.out&&i===0,color));}
 [[1108,94,1],[1092,78,2],[1076,94,3],[1092,110,0]].forEach(([x,y,b])=>{
 c.beginPath();c.moveTo(x,y-7);c.lineTo(x+7,y);c.lineTo(x,y+7);c.lineTo(x-7,y);c.closePath();
 c.fillStyle=(b===1&&t<.8||b===2&&r.runnerOnBase)?'#ffe56e':'#19364b';c.fill();c.strokeStyle='#a7cddd';c.stroke();});
}
function fieldScene(c,t){
 c.imageSmoothingEnabled=false;c.drawImage(imgs.field,0,0,W,H);header(c,t);bag(c,BASE);bag(c,FIRST,14,6);
 // Right fielder's temporary bare body is mirrored to throw toward second.
 const f=t<3.85?0:t<4.15?1:2;
 sheetSprite(c,imgs.thrower,f,3,2,275,448,1057,453,65/390,true);
 const tg=taggerAt(t),e=events();
 if(t<3.85){const u=clamp((t-2.5)/1.35);ball(c,lerp([1132,425],[1044,442],u),5);}
 if(t>=4.15&&t<e.catchAt){const u=(t-4.15)/(e.catchAt-4.15),dest=taggerAt(e.catchAt-.001).glove;const p=lerp([1032,416],dest,u);p[1]-=14*Math.sin(u*Math.PI);ball(c,p,6);}
 const r=runner(c,t);
 sheetSprite(c,imgs.tagger,tg.frame,4,2,...tg.anchor,...tg.root,tg.scale);
 if(t>=e.catchAt)ball(c,tg.glove,3);
 const result=race(t);
 if(t>=e.tagAt-.09&&t<=e.tagAt+.3){c.strokeStyle=result.out?'#ff8b78':'#a0f4d6';c.lineWidth=2;c.beginPath();c.arc(tg.glove[0],tg.glove[1],7,0,7);c.stroke();}
 if(result.runnerOnBase){c.strokeStyle='#92f4d6';c.lineWidth=2;c.beginPath();c.ellipse(BASE[0],BASE[1],22,11,0,0,7);c.stroke();}
 if(t>=.8&&t<4.7)badge(c,'주자 · 2루 진루',r.contact[0]+10,r.contact[1]+16,'#ffe17b',106);
 if(result.call)badge(c,result.out?'OUT · 베이스 전 태그':'SAFE · 베이스 접촉 유지',879,356,result.out?'#ff9a8c':'#92f4d6',236);
 else if(t>=e.catchAt)badge(c,'포구 완료 · 태그 대기',879,356,'#b8dcff',210);
 let rows=t<.8?['1루를 밟은 타자주자','2루까지 추가 진루']:t<3.85?['주자 · 2루 진루 중','우익수 · 타구 처리']:t<4.15?['우익수 · 포구 완료','2루 송구 준비']:t<e.catchAt?['송구 · 2루로 이동','슬라이딩 준비']:['2루수 · 공 확보','태그와 베이스 접촉 비교'];
 if(result.call)rows=result.out?['2루 태그 아웃','베이스 도착 전 태그']:['2루 세이프','손·발 접촉을 유지하며 대기'];
 c.fillStyle='#103d50';c.fillRect(691,851,310,47);c.fillStyle=result.out?'#ffb3a5':'#d9f3eb';c.font='bold 17px "Malgun Gothic",sans-serif';rows.forEach((v,i)=>c.fillText('• '+v,696,869+i*22));
}
const buffer=document.createElement('canvas');buffer.width=W;buffer.height=H;const bc=buffer.getContext('2d');
function render(t=state.time,target=ctx,zoom=state.zoom){
 if(!state.ready)return;fieldScene(bc,t);target.clearRect(0,0,W,H);target.imageSmoothingEnabled=false;target.drawImage(buffer,0,0);
 if(zoom&&t>=4.1){
  target.fillStyle='#092b3b';target.fillRect(26,578,466,198);target.strokeStyle='#8fae9b';target.strokeRect(26,578,466,198);
  target.fillStyle='#ffe17b';target.font='bold 13px "Malgun Gothic",sans-serif';target.fillText('접촉 확대 · '+(state.style==='feet'?'발 먼저':'머리 먼저'),38,598);
  target.drawImage(buffer,760,390,300,110,34,608,450,164);
 }
}
function refresh(){
 render();const i=phaseIndex(state.time),r=race(state.time);
 $('timeline').value=String(Math.round(state.time*100));$('clock').textContent=state.time.toFixed(1)+' / 10.0초';$('play').textContent=state.playing?'Ⅱ 일시정지':'▶ 재생';
 $('phaseName').textContent=phaseTitle(i)+(r.out?' · OUT':r.runnerOnBase?' · SAFE':'');
 $('detail').textContent=r.out?'공을 확보한 글러브가 베이스 접촉 전에 주자에게 닿아 태그 아웃입니다.':r.runnerOnBase?'세이프입니다. 손에서 발로 접촉을 이어 일어나고, 한 발을 베이스에 둔 채 기다립니다.':state.time>=4.8?'수비수가 공을 받았습니다. 아직 태그 전이므로 포구만으로 아웃이 되지 않습니다.':'1루를 밟은 타자주자가 2루까지 추가 진루합니다.';
 $('steps').querySelectorAll('button').forEach((b,j)=>{b.innerHTML='<small>'+String(j+1).padStart(2,'0')+'</small>'+phaseTitle(j);b.classList.toggle('active',i===j);b.setAttribute('aria-current',i===j?'step':'false');});previous=i;
}
function getState(){const r=runnerAt(state.time),tg=state.ready?taggerAt(state.time):null;
 return {...state,phase:phaseTitle(phaseIndex(state.time)),runner:r,race:race(state.time),events:events(),tagger:tg,contactInsideBase:insideBase(r.contact)};}
function seek(t){state.time=clamp(Number(t),0,DURATION);state.playing=false;refresh();return getState();}
function configure(scenario,style){state.scenario=scenario;state.style=style;$('scenario').value=scenario;$('style').value=style;return seek(0);}
function tick(now){if(last&&state.playing&&state.ready){state.time+=Math.min((now-last)/1000,.1)*state.speed;if(state.time>=DURATION){if(state.loop)state.time=0;else{state.time=DURATION;state.playing=false;}}refresh();}last=now;requestAnimationFrame(tick);}
function download(url,name){const a=document.createElement('a');a.href=url;a.download=name;a.click();}
async function exportVideo(){
 if(state.recording)return;const mime=['video/mp4;codecs=avc1.42001E','video/mp4','video/webm;codecs=vp9'].find(t=>MediaRecorder.isTypeSupported(t));if(!mime)throw Error('영상 저장을 지원하지 않습니다.');
 const saved={...state},controls=[...document.querySelectorAll('button,input,select')];controls.forEach(e=>e.disabled=true);state.recording=true;$('video').textContent='영상 만드는 중…';
 const v=document.createElement('canvas');v.width=1280;v.height=720;const vc=v.getContext('2d'),stream=v.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5000000}),chunks=[];
 const done=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>resolve(new Blob(chunks,{type:mime}));recorder.onerror=e=>reject(e.error);});
 let copying=true;function copy(){if(!copying)return;vc.imageSmoothingEnabled=false;vc.drawImage(canvas,0,0,1280,720);vc.fillStyle='#071d2de8';vc.fillRect(12,10,244,34);vc.fillStyle='#ffe17a';vc.font='bold 16px "Malgun Gothic",sans-serif';vc.fillText((state.style==='feet'?'발 먼저':'머리 먼저')+' · '+phaseTitle(phaseIndex(state.time)),24,33);requestAnimationFrame(copy);}
 try{state.time=0;state.speed=1;state.loop=false;state.playing=true;last=performance.now();refresh();copy();recorder.start();
 await new Promise((resolve,reject)=>{const began=performance.now();function poll(){if(state.time>=DURATION&&!state.playing)return resolve();if(performance.now()-began>25000)return reject(Error('영상 생성 시간 초과'));requestAnimationFrame(poll);}requestAnimationFrame(poll);});
 recorder.stop();const blob=await done;copying=false;stream.getTracks().forEach(v=>v.stop());const url=URL.createObjectURL(blob);download(url,'보통형-2루-'+state.style+'-'+state.scenario+'-v01.'+(mime.startsWith('video/mp4')?'mp4':'webm'));setTimeout(()=>URL.revokeObjectURL(url),60000);return {mime,bytes:blob.size};
 }finally{copying=false;stream.getTracks().forEach(v=>v.stop());Object.assign(state,saved);state.recording=false;controls.forEach(e=>e.disabled=false);$('video').textContent='영상 저장';refresh();}
}
function storyboard(){
 const out=document.createElement('canvas');out.width=1920;out.height=1040;const c=out.getContext('2d'),tile=document.createElement('canvas');tile.width=W;tile.height=H;const tc=tile.getContext('2d');
 c.fillStyle='#071c27';c.fillRect(0,0,1920,1040);
 phases.forEach((p,i)=>{const x=(i%4)*480,y=Math.floor(i/4)*520;render(p.sample,tc,false);c.drawImage(tile,x,y+36,480,270);c.fillStyle='#ffdf75';c.font='bold 17px "Malgun Gothic",sans-serif';c.fillText(String(i+1).padStart(2,'0')+' '+phaseTitle(i),x+12,y+24);
 c.fillStyle='#10383a';c.fillRect(x+8,y+316,464,194);
 const r=runnerAt(p.sample),cx=p.sample<4.2?r.contact[0]-60:775,cy=p.sample<4.2?r.contact[1]-100:393;
 c.drawImage(tile,cx,cy,p.sample<4.2?150:226,120,x+14,y+322,452,180);
 });return out.toDataURL('image/png');
}
$('steps').innerHTML=phases.map((p,i)=>'<button data-step="'+i+'"><small>'+String(i+1).padStart(2,'0')+'</small>'+p.name+'</button>').join('');
$('steps').addEventListener('click',e=>{const b=e.target.closest('button[data-step]');if(b)seek(phases[+b.dataset.step].sample);});
$('play').addEventListener('click',()=>{if(state.time>=DURATION)state.time=0;state.playing=!state.playing;last=performance.now();refresh();});
$('restart').addEventListener('click',()=>{seek(0);state.playing=true;last=performance.now();});
$('timeline').addEventListener('input',e=>seek(+e.target.value/100));$('speed').addEventListener('change',e=>state.speed=+e.target.value);
for(const id of ['scenario','style'])$(id).addEventListener('change',()=>configure($('scenario').value,$('style').value));
$('zoom').addEventListener('change',e=>{state.zoom=e.target.checked;refresh();});$('loop').addEventListener('change',e=>state.loop=e.target.checked);
$('sheet').addEventListener('click',()=>download(storyboard(),'보통형-2루-'+state.style+'-'+state.scenario+'-분할동작-v01.png'));
$('video').addEventListener('click',()=>exportVideo().catch(e=>{state.errors.push(e.message);$('detail').textContent=e.message;}));
document.addEventListener('visibilitychange',()=>last=performance.now());
window.SecondPreview={state,phases,seek,getState,configure,render,storyboard,exportVideo,duration:DURATION,play(){state.playing=true;last=performance.now();refresh();},pause(){state.playing=false;refresh();}};
Promise.all(Object.entries(assets).map(([k,url])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{imgs[k]=im;resolve();};im.onerror=()=>reject(Error(k+' 그림 로딩 실패'));im.src=url;}))).then(()=>{state.ready=true;$('loading').hidden=true;$('loading').style.display='none';refresh();requestAnimationFrame(tick);}).catch(e=>{state.errors.push(e.message);$('loading').textContent=e.message;});
})();

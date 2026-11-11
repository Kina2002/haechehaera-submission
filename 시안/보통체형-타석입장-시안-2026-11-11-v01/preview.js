/* Independent side-entry study; never loads game saves. */
(function(){'use strict';
const W=1672,H=941,TAIL_START=1.7,TAIL_LENGTH=9.9,$=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,u)=>a+(b-a)*u,smooth=u=>u*u*(3-2*u),lerp=(a,b,u)=>a.map((v,i)=>mix(v,b[i],u));
const routes={home:[[1740,716],[1160,732],[1080,850],[700,850],[660,797]],away:[[-65,716],[470,736],[610,790],[660,797]]};
const state={time:0,playing:false,speed:1,team:'home',mode:'full',loop:false,ready:false,recording:false,errors:[]};
const assets=window.ENTRY_ASSETS||{entrance:'보통형-타석입장24칸-v01.png',field:'경기장-낮은공격-배경-v01.png',existing:'보통형-동작24칸-v02.png'},imgs={};
let tail=null,last=0;
function routeInfo(){const points=routes[state.team],lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1])),length=lengths.reduce((a,b)=>a+b,0);return {points,lengths,length,walkEnd:length/220};}
function entryEnd(){return routeInfo().walkEnd+3.3;}
function duration(){return entryEnd()+(state.mode==='full'?TAIL_LENGTH:0);}
function pointOnRoute(u){
 const {points,lengths,length}=routeInfo();let distance=clamp(u)*length;
 for(let i=0;i<lengths.length;i++){if(distance<=lengths[i])return lerp(points[i],points[i+1],distance/lengths[i]);distance-=lengths[i];}
 return points.at(-1).slice();
}
function phases(){const w=routeInfo().walkEnd,e=entryEnd();const p=[
 {name:'등장',start:0,end:.6,sample:.5},
 {name:'타석으로 걷기',start:.6,end:w-.35,sample:w*.5},
 {name:'감속',start:w-.35,end:w,sample:w-.16},
 {name:'몸 돌리기',start:w,end:w+.45,sample:w+.25},
 {name:'발 위치 잡기',start:w+.45,end:w+1.15,sample:w+.85},
 {name:'짧은 루틴',start:w+1.15,end:w+2.05,sample:w+1.55},
 {name:'배트 들기',start:w+2.05,end:w+2.8,sample:w+2.55},
 {name:'준비 완료',start:w+2.8,end:e,sample:e-.15}];
 if(state.mode==='full')p.push({name:'타격·1루',start:e,end:duration(),sample:e+6.7});return p;
}
function phaseAt(t){if(t>=entryEnd()&&state.mode==='full'){const q=t-entryEnd()+TAIL_START;return q<2.5?'타격 준비':q<3.1?'타격':q<3.55?'배트 놓기':q<4.4?'출발':q<8.2?'1루 진루':'1루 베이스 대기';}
 const p=phases();return (p.find(p=>t<p.end)||p.at(-1)).name;}
function actorAt(t){
 const w=routeInfo().walkEnd,d=t-w,u=clamp(t/w);let frame,mirror=false;
 if(t<w-.35){frame=[4,5,6,7,8,9][Math.floor(t*8)%6];mirror=state.team==='home';}
 else if(t<w){frame=10;mirror=state.team==='home';}
 else if(d<.14){frame=10;mirror=state.team==='home';}
 else if(d<.3)frame=15;else if(d<.45)frame=11;
 else if(d<.68)frame=12;else if(d<.95)frame=13;else if(d<1.15)frame=14;
 else if(d<1.5)frame=15;else if(d<1.8)frame=16;else if(d<2.05)frame=17;
 else if(d<2.3)frame=19;else if(d<2.55)frame=20;else if(d<2.8)frame=21;else frame=23;
 const p=t<w?pointOnRoute(u):lerp([660,797],[636,782],smooth(clamp(d/1.15)));
 return {frame,mirror,position:p,height:mix(195,265,clamp(t/(w+.45))),heldBat:true};
}
function sprite(c,key,frame,x,y,height,mirror=false){
 const s=height/218;c.save();c.translate(x,y);if(mirror)c.scale(-1,1);c.imageSmoothingEnabled=false;
 const anchorX=key==='entrance'&&frame>=19?153:160;
 c.drawImage(imgs[key],(frame%6)*256,Math.floor(frame/6)*256,256,256,-anchorX*s,-245*s,256*s,256*s);c.restore();
}
function header(c){
 c.fillStyle='#082437';c.fillRect(539,65,591,43);c.font='bold 21px "Malgun Gothic",sans-serif';c.fillStyle='#ffdf43';c.fillText(state.team==='home'?'홈팀 타자 · 3회 말':'원정 타자 · 3회 초',557,96);
 const light=(x,color)=>{c.beginPath();c.arc(x,88,7,0,7);c.fillStyle='#18383b';c.fill();c.strokeStyle='#5c746c';c.stroke();};
 c.font='bold 17px "Malgun Gothic",sans-serif';
 for(const [letter,x,xs,color]of[['B',788,[818,840,862],'#49edb1'],['S',895,[924,946],'#ffe04e'],['O',977,[1006,1028],'#ff6659']]){c.fillStyle='#dcecf3';c.fillText(letter,x,94);xs.forEach(v=>light(v,color));}
 [[1108,94,1],[1092,78,2],[1076,94,3],[1092,110,0]].forEach(([x,y,b])=>{c.beginPath();c.moveTo(x,y-7);c.lineTo(x+7,y);c.lineTo(x,y+7);c.lineTo(x-7,y);c.closePath();c.fillStyle=b===1&&state.time>=entryEnd()+6.5?'#ffe56e':'#19364b';c.fill();c.strokeStyle='#a7cddd';c.stroke();});
}
function log(c,rows){c.fillStyle='#103d50';c.fillRect(699,876,312,43);c.fillStyle='#dcf0e5';c.font='bold 17px "Malgun Gothic",sans-serif';rows.forEach((v,i)=>c.fillText('• '+v,705,893+i*21));}
function render(t=state.time,target=ctx){
 if(!state.ready)return;target.imageSmoothingEnabled=false;target.clearRect(0,0,W,H);
 if(t>=entryEnd()&&state.mode==='full'){tail.render(clamp(t-entryEnd()+TAIL_START,0,11.6),target,'auto');header(target);return;}
 target.drawImage(imgs.field,0,0,W,H);header(target);
 // This is an entrance overlay in the existing instruction area, not a stadium structure.
 if(t<entryEnd()-.5){target.fillStyle='#082a3b';target.fillRect(104,611,342,121);target.strokeStyle='#6d9f99';target.strokeRect(104,611,342,121);target.fillStyle='#ffe071';target.font='bold 21px "Malgun Gothic",sans-serif';target.fillText(state.team==='home'?'홈팀 타자 입장':'원정팀 타자 입장',123,647);target.fillStyle='#bddbce';target.font='17px "Malgun Gothic",sans-serif';target.fillText('타석에 들어서는 중',123,680);target.font='14px "Malgun Gothic",sans-serif';target.fillText('이동 → 자리 잡기 → 준비',123,710);}
 const a=actorAt(t);target.fillStyle='#09252338';target.beginPath();target.ellipse(a.position[0]-20,a.position[1]+1,a.height*.19,a.height*.03,0,0,7);target.fill();
 if(t>=entryEnd()-.35)sprite(target,'existing',2,636,782,265,false);
 else sprite(target,'entrance',a.frame,...a.position,a.height,a.mirror);
 // HUD stays in front of walking players; no game or save state is involved.
 for(const[x,y,w,h]of[[40,759,426,129],[1204,759,460,129],[521,867,626,65]])target.drawImage(imgs.field,x,y,w,h,x,y,w,h);
 log(target,t<routeInfo().walkEnd?[state.team==='home'?'홈팀 · 오른쪽에서 입장':'원정팀 · 왼쪽에서 입장','타석으로 이동']:t<entryEnd()-.5?['발 위치와 자세 정렬','투수를 향해 준비']:['타격 준비 완료','기존 타격 동작으로 연결']);
}
function getState(){const t=state.time,e=entryEnd();return {...state,duration:duration(),entryEnd:e,walkEnd:routeInfo().walkEnd,phase:phaseAt(t),actor:t<e?actorAt(t):null,tailTime:t>=e?t-e+TAIL_START:null};}
function refresh(){
 render();$('timeline').max=String(Math.round(duration()*100));$('timeline').value=String(Math.round(state.time*100));$('clock').textContent=state.time.toFixed(1)+' / '+duration().toFixed(1)+'초';$('play').textContent=state.playing?'Ⅱ 일시정지':'▶ 재생';$('sideName').textContent=state.team==='home'?'홈팀 · 오른쪽 입장':'원정팀 · 왼쪽 입장';$('phaseName').textContent=phaseAt(state.time);
 $('detail').textContent=state.time>=entryEnd()?'새 입장 뒤에 기존 타격·1루 세이프 흐름을 이어 재생합니다.':state.time<routeInfo().walkEnd?'배트를 들고 걸어옵니다. 홈팀과 원정팀은 출발 쪽이 다르고, 걷는 속도는 같습니다.':'타석에서 몸을 돌리고 발을 고른 뒤, 어깨를 풀고 배트를 듭니다.';
 const p=phases(),found=p.findIndex(x=>state.time<x.end),index=found<0?p.length-1:found;
 $('steps').innerHTML=p.map((x,i)=>'<button data-step="'+i+'" class="'+(i===index?'active':'')+'"><small>'+String(i+1).padStart(2,'0')+'</small>'+x.name+'</button>').join('');
}
function seek(t){state.time=clamp(+t,0,duration());state.playing=false;refresh();return getState();}
function configure(team,mode){state.team=team;state.mode=mode;$('team').value=team;$('mode').value=mode;return seek(0);}
function tick(now){if(last&&state.playing&&state.ready){state.time+=Math.min((now-last)/1000,.1)*state.speed;if(state.time>=duration()){if(state.loop)state.time=0;else{state.time=duration();state.playing=false;}}refresh();}last=now;requestAnimationFrame(tick);}
function download(url,name){const a=document.createElement('a');a.href=url;a.download=name;a.click();}
function storyboard(){
 const out=document.createElement('canvas');out.width=1920;out.height=1040;const c=out.getContext('2d'),tile=document.createElement('canvas');tile.width=W;tile.height=H;const tc=tile.getContext('2d');c.fillStyle='#071c27';c.fillRect(0,0,1920,1040);c.imageSmoothingEnabled=false;
 phases().slice(0,8).forEach((p,i)=>{const x=i%4*480,y=Math.floor(i/4)*520;render(p.sample,tc);c.drawImage(tile,x,y+36,480,270);c.fillStyle='#ffe081';c.font='bold 16px "Malgun Gothic",sans-serif';c.fillText(String(i+1).padStart(2,'0')+' '+p.name,x+12,y+24);c.fillStyle='#0f353b';c.fillRect(x+8,y+316,464,194);const a=actorAt(p.sample);sprite(c,'entrance',a.frame,x+250,y+505,177,a.mirror);});return out.toDataURL('image/png');
}
async function exportVideo(){
 if(state.recording)return;const mime=['video/mp4;codecs=avc1.42001E','video/mp4','video/webm;codecs=vp9'].find(m=>MediaRecorder.isTypeSupported(m));if(!mime)throw Error('영상 저장 지원 안 됨');
 const saved={...state},controls=[...document.querySelectorAll('button,input,select')];state.recording=true;controls.forEach(e=>e.disabled=true);$('video').textContent='영상 만드는 중…';
 const v=document.createElement('canvas');v.width=1280;v.height=720;const vc=v.getContext('2d'),stream=v.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5000000}),chunks=[];let copying=true;
 const done=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>resolve(new Blob(chunks,{type:mime}));recorder.onerror=e=>reject(e.error);});
 function copy(){if(!copying)return;vc.imageSmoothingEnabled=false;vc.drawImage(canvas,0,0,1280,720);vc.fillStyle='#071d2dec';vc.fillRect(12,10,292,34);vc.fillStyle='#ffe17a';vc.font='bold 16px "Malgun Gothic",sans-serif';vc.fillText((state.team==='home'?'홈팀 · 오른쪽':'원정팀 · 왼쪽')+' / '+phaseAt(state.time),24,33);requestAnimationFrame(copy);}
 try{state.time=0;state.speed=1;state.loop=false;state.playing=true;last=performance.now();refresh();copy();recorder.start();
 await new Promise((resolve,reject)=>{const began=performance.now();function poll(){if(state.time>=duration()&&!state.playing)return resolve();if(performance.now()-began>40000)return reject(Error('영상 생성 시간 초과'));requestAnimationFrame(poll);}requestAnimationFrame(poll);});
 recorder.stop();const blob=await done;copying=false;const url=URL.createObjectURL(blob);download(url,'보통형-타석입장-'+state.team+'-'+state.mode+'-v01.'+(mime.startsWith('video/mp4')?'mp4':'webm'));setTimeout(()=>URL.revokeObjectURL(url),60000);
 return {mime,bytes:blob.size};}finally{copying=false;stream.getTracks().forEach(t=>t.stop());Object.assign(state,saved);state.recording=false;controls.forEach(e=>e.disabled=false);$('video').textContent='영상 저장';refresh();}
}
$('steps').addEventListener('click',e=>{const b=e.target.closest('button[data-step]');if(b)seek(phases()[+b.dataset.step].sample);});
$('play').addEventListener('click',()=>{if(state.time>=duration())state.time=0;state.playing=!state.playing;last=performance.now();refresh();});
$('restart').addEventListener('click',()=>{seek(0);state.playing=true;last=performance.now();});$('skip').addEventListener('click',()=>seek(entryEnd()-.1));
$('timeline').addEventListener('input',e=>seek(+e.target.value/100));$('speed').addEventListener('change',e=>state.speed=+e.target.value);$('loop').addEventListener('change',e=>state.loop=e.target.checked);
for(const id of ['team','mode'])$(id).addEventListener('change',()=>configure($('team').value,$('mode').value));
$('sheet').addEventListener('click',()=>download(storyboard(),'보통형-타석입장-'+state.team+'-분할-v01.png'));$('video').addEventListener('click',()=>exportVideo().catch(e=>{state.errors.push(e.message);$('detail').textContent=e.message;}));
document.addEventListener('visibilitychange',()=>last=performance.now());
const frame=document.createElement('iframe');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;frame.style.cssText='position:fixed;left:-9999px;top:0;width:1672px;height:1100px;pointer-events:none;visibility:hidden';document.body.appendChild(frame);
const childReady=new Promise((resolve,reject)=>{const began=performance.now(),timer=setInterval(()=>{try{if(frame.contentWindow?.FlowPreview?.state.ready){clearInterval(timer);tail=frame.contentWindow.FlowPreview;tail.pause();resolve();}else if(performance.now()-began>20000){clearInterval(timer);reject(Error('기존 타격 흐름 로딩 시간 초과'));}}catch(e){clearInterval(timer);reject(e);}},50);frame.srcdoc=window.CONTINUATION_HTML;});
const imageReady=Promise.all(Object.entries(assets).map(([k,url])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{imgs[k]=im;resolve();};im.onerror=()=>reject(Error(k+' 그림 로딩 실패'));im.src=url;})));
window.EntryPreview={state,getState,seek,configure,render,phases,storyboard,exportVideo,duration,entryEnd,play(){if(state.time>=duration())state.time=0;state.playing=true;last=performance.now();refresh();},pause(){state.playing=false;refresh();}};
Promise.all([childReady,imageReady]).then(()=>{state.ready=true;$('loading').hidden=true;$('loading').style.display='none';refresh();requestAnimationFrame(tick);}).catch(e=>{state.errors.push(e.message);$('loading').textContent=e.message;});
})();

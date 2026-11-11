/* Independent visual study. Does not load or mutate game state. */
(function(){
'use strict';
const W=1672,H=941,DURATION=11.6,canvas=document.getElementById('scene'),ctx=canvas.getContext('2d');
const phases=[
 {name:'서기',start:0,end:.9,sample:.45,detail:'새 보통 체형의 기본 비율과 서 있는 모습을 봅니다.'},
 {name:'타격 준비',start:.9,end:2.5,sample:1.7,detail:'배트를 들어 준비하고, 앞발에 힘을 모읍니다.'},
 {name:'스윙',start:2.5,end:3.1,sample:2.58,detail:'배트를 몸 앞쪽으로 돌린 뒤 마무리합니다.'},
 {name:'배트 놓기',start:3.1,end:3.55,sample:3.43,detail:'스윙을 마친 뒤 배트를 놓고 두 손을 비웁니다.'},
 {name:'출발',start:3.55,end:4.4,sample:4.15,detail:'첫발을 밀어 출발하며 높은 주루 시점으로 전환합니다.'},
 {name:'질주',start:4.4,end:8.2,sample:6.3,detail:'팔과 다리를 번갈아 움직이며 1루로 달립니다.'},
 {name:'1루 통과',start:8.2,end:8.85,sample:8.28,detail:'앞발로 1루를 밟고, 베이스를 지나 계속 달립니다.'},
 {name:'감속',start:8.85,end:DURATION,sample:9.65,detail:'보폭을 줄이고 파울 지역에서 멈춘 뒤 내야를 돌아봅니다.'}
];
const assets=window.FLOW_ASSETS||{atlas:'보통형-동작24칸-v02.png',low:'경기장-낮은공격-배경-v01.png',high:'경기장-높은주루-배경-v01.png'};
const state={time:0,playing:false,speed:1,camera:'auto',loop:false,ready:false,errors:[]};
const imgs={},clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,u)=>a+(b-a)*u,smooth=u=>u*u*(3-2*u);
const $=id=>document.getElementById(id);
let last=0,previousPhase=-1;
function phaseIndex(t){return Math.max(0,phases.findIndex((p,i)=>t<p.end||i===phases.length-1));}
function frameAt(t){
 if(t<.9)return 0;if(t<1.22)return 1;if(t<2.04)return 2;if(t<2.5)return 3;
 if(t<2.67)return 4;if(t<3.1)return 5;if(t<3.32)return 6;if(t<3.55)return 7;
 if(t<3.93)return 8;if(t<4.4)return 9;if(t<8.2)return 10+Math.floor((t-4.4)*10)%6;
 if(t<8.4)return 16;if(t<8.85)return 17;if(t<9.4)return 18;if(t<9.8)return 19;
 if(t<10.25)return 20;if(t<10.7)return 21;if(t<11.15)return 22;return 23;
}
function progressAt(t){
 if(t<3.55)return 0;
 if(t<4.4){const u=(t-3.55)/.85;return .1*u*u;}
 if(t<8.2)return .1+.9*(t-4.4)/3.8;
 if(t<8.85)return 1+.12*(t-8.2)/.65;
 const u=clamp((t-8.85)/1.85,0,1);return 1.12+.18*(2*u-u*u);
}
function cameraWeight(t){
 if(state.camera==='low')return 0;if(state.camera==='high')return 1;
 return smooth(clamp((t-3.55)/.42,0,1));
}
function groundFor(camera,t){
 const p=progressAt(t);
 const start=camera==='low'?[636,782]:[778,772];
 const base=camera==='low'?[1468,517]:[1239,581];
 if(p<=1.12)return [mix(start[0],base[0],p),mix(start[1],base[1],p)];
 const begin=[mix(start[0],base[0],1.12),mix(start[1],base[1],1.12)];
 const u=clamp((p-1.12)/.18,0,1);
 const end=camera==='low'?[1575,610]:[1400,639];
 const control=camera==='low'?[1580,470]:[1400,542];
 return [(1-u)*(1-u)*begin[0]+2*(1-u)*u*control[0]+u*u*end[0],(1-u)*(1-u)*begin[1]+2*(1-u)*u*control[1]+u*u*end[1]];
}
function bodyHeight(camera,t){const p=clamp(progressAt(t),0,1);return camera==='low'?mix(265,126,p):mix(108,79,p);}
function drawSprite(c,frame,x,y,height){
 const col=frame%6,row=Math.floor(frame/6),s=height/218;
 let left=0,width=256;
 // The contact bat extends a few pixels over its grid boundary; the next cell's
 // crop excludes that spill. Original generated atlas pixels stay unmodified.
 if(frame===4)width=268;if(frame===5){left=24;width=232;}
 const anchorX=frame===16?190:160,anchorY=245;
 c.save();c.translate(Math.round(x),Math.round(y));c.imageSmoothingEnabled=false;
 c.fillStyle='#0a211f45';c.beginPath();c.ellipse(0,1,height*.21,height*.035,0,0,Math.PI*2);c.fill();
 c.drawImage(imgs.atlas,col*256+left,row*256,width,256,Math.round((left-anchorX)*s),Math.round(-anchorY*s),Math.round(width*s),Math.round(256*s));
 c.restore();
}
function drawBat(c,x,y,length,angle,opacity=1){
 c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=opacity;c.fillStyle='#70401f';c.fillRect(-length*.5,-3,length,6);c.fillStyle='#bc8c45';c.fillRect(-length*.43,-2,length*.72,4);c.fillStyle='#deb66c';c.fillRect(-length*.37,-2,length*.56,2);c.restore();
}
function ball(c,x,y,r=5){c.fillStyle='#fff9de';c.fillRect(Math.round(x-r/2),Math.round(y-r/2),r,r);}
function renderCamera(c,camera,t){
 c.drawImage(imgs[camera],0,0,W,H);
 if(t>=3.34){
  const base=camera==='low'?[626,760]:[772,753];
  const u=clamp((t-3.34)/.28,0,1);
  drawBat(c,base[0]-18*u,base[1]-34*(1-u),camera==='low'?65:24,mix(.7,.12,u),1);
 }
 if(t>=2.06&&t<2.55){
  const u=clamp((t-2.06)/.49,0,1),a=camera==='low'?[835,475]:[835,550],b=camera==='low'?[756,607]:[827,699];
  ball(c,mix(a[0],b[0],u),mix(a[1],b[1],u),camera==='low'?7:4);
 } else if(t>=2.55&&t<3.2){
  const u=(t-2.55)/.65,a=camera==='low'?[756,607]:[827,699],b=camera==='low'?[593,394]:[565,423];
  ball(c,mix(a[0],b[0],u),mix(a[1],b[1],u)-45*Math.sin(u*Math.PI),camera==='low'?6:4);
 }
 const pos=groundFor(camera,t);
 drawSprite(c,frameAt(t),pos[0],pos[1],bodyHeight(camera,t));
}
const lowBuffer=document.createElement('canvas'),highBuffer=document.createElement('canvas');lowBuffer.width=highBuffer.width=W;lowBuffer.height=highBuffer.height=H;
const lc=lowBuffer.getContext('2d'),hc=highBuffer.getContext('2d');
function render(t=state.time,target=ctx,mode=state.camera){
 if(!state.ready)return;
 const oldCamera=state.camera;state.camera=mode;
 const w=cameraWeight(t);
 if(w<1)renderCamera(lc,'low',t);
 if(w>0)renderCamera(hc,'high',t);
 target.clearRect(0,0,W,H);target.globalAlpha=1;target.imageSmoothingEnabled=false;
 if(w<1)target.drawImage(lowBuffer,0,0);
 if(w>0){target.globalAlpha=w;target.drawImage(highBuffer,0,0);target.globalAlpha=1;}
 state.camera=oldCamera;
}
function refresh(){
 render();
 const index=phaseIndex(state.time);
 $('timeline').value=String(Math.round(state.time*100));
 $('clock').textContent=state.time.toFixed(1)+' / 11.6초';
 $('play').textContent=state.playing?'Ⅱ 일시정지':'▶ 재생';
 $('phaseName').textContent=phases[index].name;
 $('cameraName').textContent=cameraWeight(state.time)>.5?'높은 주루 시점':'낮은 공격 시점';
 $('detail').textContent=phases[index].detail;
 if(index!==previousPhase){$('steps').querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-current',i===index?'step':'false');});previousPhase=index;}
}
function seek(t){state.time=clamp(Number(t),0,DURATION);state.playing=false;refresh();return getState();}
function getState(){const p=groundFor(cameraWeight(state.time)>.5?'high':'low',state.time);return {...state,phase:phases[phaseIndex(state.time)].name,frame:frameAt(state.time),progress:progressAt(state.time),position:p,cameraWeight:cameraWeight(state.time)};}
function tick(now){
 if(last&&state.playing&&state.ready){state.time+=Math.min((now-last)/1000,.1)*state.speed;if(state.time>=DURATION){if(state.loop)state.time=0;else{state.time=DURATION;state.playing=false;}}refresh();}
 last=now;requestAnimationFrame(tick);
}
function download(data,name){const a=document.createElement('a');a.href=data;a.download=name;a.click();}
async function exportVideo(){
 if(state.recording)return;
 const mime=['video/mp4;codecs=avc1.42001E','video/mp4','video/webm;codecs=vp9'].find(type=>MediaRecorder.isTypeSupported(type));
 if(!mime)throw new Error('이 브라우저에서는 영상 저장을 지원하지 않습니다.');
 const saved={time:state.time,playing:state.playing,speed:state.speed,camera:state.camera,loop:state.loop};
 const controls=[...document.querySelectorAll('button,input,select')];controls.forEach(el=>el.disabled=true);state.recording=true;$('video').textContent='영상 만드는 중…';
 const videoCanvas=document.createElement('canvas');videoCanvas.width=1280;videoCanvas.height=720;const vc=videoCanvas.getContext('2d');
 const stream=videoCanvas.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5000000});
 const chunks=[];let copying=true;
 const done=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>resolve(new Blob(chunks,{type:mime}));recorder.onerror=e=>reject(e.error||new Error('영상 저장 오류'));});
 function copy(){if(!copying)return;vc.imageSmoothingEnabled=false;vc.drawImage(canvas,0,0,1280,720);vc.fillStyle='#071d2de8';vc.fillRect(12,10,174,34);vc.fillStyle='#ffe17a';vc.font='bold 17px "Malgun Gothic",sans-serif';vc.fillText(phases[phaseIndex(state.time)].name,24,33);requestAnimationFrame(copy);}
 try{
  state.time=0;state.camera='auto';state.speed=1;state.loop=false;state.playing=true;last=performance.now();$('camera').value='auto';$('speed').value='1';refresh();copy();recorder.start();
  await new Promise((resolve,reject)=>{const began=performance.now();function poll(){if(state.time>=DURATION&&!state.playing)return resolve();if(performance.now()-began>25000)return reject(new Error('영상 재생 시간이 초과됐습니다.'));requestAnimationFrame(poll);}requestAnimationFrame(poll);});
  recorder.stop();const blob=await done;copying=false;stream.getTracks().forEach(track=>track.stop());
  const url=URL.createObjectURL(blob);download(url,'보통체형-타격부터1루-미리보기-v01.'+(mime.startsWith('video/mp4')?'mp4':'webm'));setTimeout(()=>URL.revokeObjectURL(url),60000);
  return {type:mime,bytes:blob.size};
 }finally{copying=false;stream.getTracks().forEach(track=>track.stop());Object.assign(state,saved);state.recording=false;controls.forEach(el=>el.disabled=false);$('video').textContent='영상 저장';$('camera').value=state.camera;$('speed').value=String(state.speed);refresh();}
}
function storyboard(){
 const out=document.createElement('canvas');out.width=1672;out.height=1010;const c=out.getContext('2d');c.fillStyle='#071c27';c.fillRect(0,0,out.width,out.height);
 const tile=document.createElement('canvas');tile.width=W;tile.height=H;const tc=tile.getContext('2d');
 phases.forEach((p,i)=>{const x=(i%4)*418,y=Math.floor(i/4)*505;render(p.sample,tc,'auto');c.drawImage(tile,x,y+36,418,235);c.fillStyle='#ffdf75';c.font='bold 15px "Malgun Gothic",sans-serif';c.fillText(String(i+1).padStart(2,'0')+'  '+p.name,x+12,y+24);
  const pos=groundFor(p.sample>=3.97?'high':'low',p.sample),height=bodyHeight(p.sample>=3.97?'high':'low',p.sample);
  c.fillStyle='#0f3439';c.fillRect(x+8,y+280,402,208);const size=202/256*218;drawSprite(c,frameAt(p.sample),x+205,y+481,size);
  c.fillStyle='#92b4a6';c.font='11px "Malgun Gothic",sans-serif';c.fillText(p.sample<3.97?'낮은 공격 시점':'높은 주루 시점',x+12,y+300);
 });return out.toDataURL('image/png');
}
$('steps').innerHTML=phases.map((p,i)=>'<button type="button" data-step="'+i+'"><small>'+String(i+1).padStart(2,'0')+'</small>'+p.name+'</button>').join('');
$('steps').addEventListener('click',e=>{const b=e.target.closest('button[data-step]');if(b)seek(phases[Number(b.dataset.step)].sample);});
$('play').addEventListener('click',()=>{if(state.time>=DURATION)state.time=0;state.playing=!state.playing;last=performance.now();refresh();});
$('restart').addEventListener('click',()=>{state.time=0;state.playing=true;last=performance.now();refresh();});
$('timeline').addEventListener('input',e=>seek(Number(e.target.value)/100));
$('speed').addEventListener('change',e=>{state.speed=Number(e.target.value);});
$('camera').addEventListener('change',e=>{state.camera=e.target.value;refresh();});
$('loop').addEventListener('change',e=>{state.loop=e.target.checked;});
$('sheet').addEventListener('click',()=>download(storyboard(),'보통체형-경기장-8단계-v01.png'));
$('video').addEventListener('click',()=>exportVideo().catch(e=>{state.errors.push(e.message);$('detail').textContent=e.message;}));
document.addEventListener('visibilitychange',()=>{last=performance.now();});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','SELECT','BUTTON'].includes(document.activeElement.tagName)){e.preventDefault();$('play').click();}});
window.FlowPreview={state,phases,seek,getState,render,storyboard,exportVideo,duration:DURATION,play(){if(state.time>=DURATION)state.time=0;state.playing=true;last=performance.now();refresh();},pause(){state.playing=false;refresh();}};
Promise.all(Object.entries(assets).map(([key,url])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{imgs[key]=im;resolve();};im.onerror=()=>reject(new Error(key+' 그림을 불러오지 못했습니다.'));im.src=url;}))).then(()=>{state.ready=true;$('loading').hidden=true;$('loading').style.display='none';refresh();requestAnimationFrame(tick);}).catch(e=>{state.errors.push(e.message);$('loading').textContent=e.message;});
})();


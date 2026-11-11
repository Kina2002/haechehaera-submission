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
 {name:'진루·송구',start:4.4,end:7.7,sample:7.3,detail:'내야수의 포구·송구와 주자의 진루를 함께 봅니다.'},
 {name:'베이스 앞',start:7.7,end:8.55,sample:8.35,detail:'주자와 송구의 도착 순서를 확인합니다.'},
 {name:'결과·대기',start:8.55,end:DURATION,sample:10.2,detail:'세이프면 베이스를 밟고 대기하고, 아웃이면 진루를 끝냅니다.'}
];
const assets=window.FLOW_ASSETS||{atlas:'보통형-동작24칸-v02.png',defenders:'수비-포구송구6칸-v02.png',low:'경기장-낮은공격-배경-v01.png',high:'경기장-높은주루-배경-v02.png'};
const state={time:0,playing:false,speed:1,camera:'auto',scenario:'safe',loop:false,ready:false,errors:[]};
const scenario=()=>FirstBaseRace.scenarios[state.scenario],raceAt=t=>FirstBaseRace.at(t,scenario());
const imgs={},clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,u)=>a+(b-a)*u,smooth=u=>u*u*(3-2*u);
const $=id=>document.getElementById(id);
let last=0,previousPhase=-1;
function phaseIndex(t){return Math.max(0,phases.findIndex((p,i)=>t<p.end||i===phases.length-1));}
function frameAt(t){
 if(t<.9)return 0;if(t<1.22)return 1;if(t<2.04)return 2;if(t<2.5)return 3;
 if(t<2.67)return 4;if(t<3.1)return 5;if(t<3.32)return 6;if(t<3.55)return 7;
 if(t<3.93)return 8;if(t<4.4)return 9;
 if(state.scenario==='out'&&t>=scenario().ballAt+.12){const d=t-scenario().ballAt;return d<.4?18:d<.7?19:d<1?20:22;}
 if(t<7.7)return 10+Math.floor((t-4.4)*10)%6;
 if(t<7.86)return 18;if(t<8.03)return 19;if(t<8.2)return 20;if(t<8.45)return 16;return 23;
}
function progressAt(t){
 if(t<3.55)return 0;
 if(t<4.4){const u=(t-3.55)/.85;return .1*u*u;}
 let p;if(t<7.7)p=.1+.84*(t-4.4)/3.3;
 else {const u=clamp((t-7.7)/.5,0,1);p=.94+.06*(2*u-u*u);}
 return state.scenario==='out'?Math.min(p,.94):p;
}
function cameraWeight(t){
 if(state.camera==='low')return 0;if(state.camera==='high')return 1;
 return smooth(clamp((t-3.55)/.42,0,1));
}
function groundFor(camera,t){
 const p=progressAt(t);
 const start=camera==='low'?[636,782]:[778,772];
 const base=camera==='low'?[1468,517]:[1239,581];
 return [mix(start[0],base[0],p),mix(start[1],base[1],p)];
}
function bodyHeight(camera,t){const p=clamp(progressAt(t),0,1);return camera==='low'?mix(265,126,p):mix(108,79,p);}
function drawSprite(c,frame,x,y,height){
 const col=frame%6,row=Math.floor(frame/6),s=height/218;
 let left=0,width=256;
 // The contact bat extends a few pixels over its grid boundary; the next cell's
 // crop excludes that spill. Original generated atlas pixels stay unmodified.
 if(frame===4)width=268;if(frame===5){left=24;width=232;}
 const anchorX=frame===16?190:frame>=22?166:160,anchorY=frame===16?241:frame>=22?239:245;
 c.save();c.translate(Math.round(x),Math.round(y));c.imageSmoothingEnabled=false;
 c.fillStyle='#0a211f45';c.beginPath();c.ellipse(0,1,height*.21,height*.035,0,0,Math.PI*2);c.fill();
 c.drawImage(imgs.atlas,col*256+left,row*256,width,256,Math.round((left-anchorX)*s),Math.round(-anchorY*s),Math.round(width*s),Math.round(256*s));
 c.restore();
}
function drawBat(c,x,y,length,angle,opacity=1){
 c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=opacity;c.fillStyle='#70401f';c.fillRect(-length*.5,-3,length,6);c.fillStyle='#bc8c45';c.fillRect(-length*.43,-2,length*.72,4);c.fillStyle='#deb66c';c.fillRect(-length*.37,-2,length*.56,2);c.restore();
}
function ball(c,x,y,r=5){c.fillStyle='#fff9de';c.fillRect(Math.round(x-r/2),Math.round(y-r/2),r,r);}
function defender(c,frame,x,y,height){
 const s=height/390,col=frame%3,row=Math.floor(frame/3),ax=frame>=3?128:275,ay=frame>=3?464:448;
 c.save();c.translate(Math.round(x),Math.round(y));c.imageSmoothingEnabled=false;
 c.drawImage(imgs.defenders,col*512,row*512,512,512,Math.round(-ax*s),Math.round(-ay*s),Math.round(512*s),Math.round(512*s));c.restore();
}
function badge(c,text,x,y,color='#e9d47b',width=82){c.fillStyle='#082a3aec';c.fillRect(x-width/2,y,width,23);c.strokeStyle=color;c.strokeRect(x-width/2,y,width,23);c.fillStyle=color;c.font='bold 13px "Malgun Gothic",sans-serif';c.textAlign='center';c.fillText(text,x,y+16);c.textAlign='left';}
function header(c,t){
 const r=raceAt(t);c.fillStyle='#082437';c.fillRect(539,65,591,43);
 c.font='bold 22px "Malgun Gothic",sans-serif';c.fillStyle='#ffdf43';c.fillText('우리 공격 · 3회 말',557,96);
 function light(x,y,on,color){c.beginPath();c.arc(x,y,7,0,Math.PI*2);c.fillStyle=on?color:'#18383b';c.fill();c.strokeStyle=on?color:'#5c746c';c.stroke();}
 c.font='bold 17px "Malgun Gothic",sans-serif';c.fillStyle='#dcecf3';c.fillText('B',788,94);[818,840,862].forEach(x=>light(x,88,false,'#49edb1'));
 c.fillStyle='#dcecf3';c.fillText('S',895,94);[924,946].forEach(x=>light(x,88,false,'#ffe04e'));c.fillStyle='#dcecf3';c.fillText('O',977,94);[1006,1028].forEach((x,i)=>light(x,88,r.call==='out'&&i===0,'#ff6659'));
 [[1108,94,1],[1092,78,2],[1076,94,3],[1092,110,0]].forEach(([x,y,b])=>{c.beginPath();c.moveTo(x,y-7);c.lineTo(x+7,y);c.lineTo(x,y+7);c.lineTo(x-7,y);c.closePath();c.fillStyle=b===1&&r.runnerOnBase?'#ffe56e':'#19364b';c.fill();c.strokeStyle='#a7cddd';c.stroke();});
}
function firstBase(c,x,y){c.beginPath();c.moveTo(x-14,y);c.lineTo(x,y-6);c.lineTo(x+14,y);c.lineTo(x,y+6);c.closePath();c.fillStyle='#fffdec';c.fill();c.strokeStyle='#c6c5ad';c.stroke();}
function defensivePlay(c,camera,t){
 const e=scenario(),high=camera==='high',fielder=high?[1093,580]:[1190,537],receive=high?[1244,579]:[1472,515];
 const size=high?86:114;
 if(high){
  const pose=t<e.pickupAt?0:t<e.throwAt?1:2;defender(c,pose,...fielder,size);
  const receiving=t<e.ballAt?3:t<e.ballAt+.28?4:5;defender(c,receiving,...receive,size);
  badge(c,'1루수',receive[0]+76,receive[1]+17,'#acd6ff',62);
 }
 const glove=high?[1240,527]:[1464,464],release=high?[1126,531]:[1225,476],pickup=high?[1110,566]:[1210,519];
 if(t>=2.55&&t<e.pickupAt){
  const a=high?[827,699]:[756,607],bounce=high?[970,627]:[1040,550];
  const landAt=4.2;
  if(t<landAt){const u=(t-2.55)/(landAt-2.55);ball(c,mix(a[0],bounce[0],u),mix(a[1],bounce[1],u)-25*Math.sin(u*Math.PI),high?5:6);}
  else {const u=clamp((t-landAt)/(e.pickupAt-landAt),0,1);ball(c,mix(bounce[0],pickup[0],u),mix(bounce[1],pickup[1],u),high?5:6);}
 } else if(t>=e.throwAt&&t<e.ballAt){const u=(t-e.throwAt)/(e.ballAt-e.throwAt);ball(c,mix(release[0],glove[0],u),mix(release[1],glove[1],u)-12*Math.sin(u*Math.PI),high?6:7);}
 else if(t>=e.ballAt){const p=t<e.ballAt+.28?glove:high?[1266,531]:[1488,466];ball(c,...p,high?5:6);}
 const r=raceAt(t);
 if(high&&r.call){badge(c,r.call==='safe'?'SAFE · 베이스 대기':'OUT · 송구 먼저',1239,440,r.call==='safe'?'#8ff1d1':'#ff9a8c',210);}
}
function renderCamera(c,camera,t){
 c.drawImage(imgs[camera],0,0,W,H);
 header(c,t);
 if(camera==='high')firstBase(c,1239,581);
 defensivePlay(c,camera,t);
 if(t>=3.34){
  const base=camera==='low'?[626,760]:[772,753];
  const u=clamp((t-3.34)/.28,0,1);
  drawBat(c,base[0]-18*u,base[1]-34*(1-u),camera==='low'?65:24,mix(.7,.12,u),1);
 }
 if(t>=2.06&&t<2.55){
  const u=clamp((t-2.06)/.49,0,1),a=camera==='low'?[835,475]:[835,550],b=camera==='low'?[756,607]:[827,699];
  ball(c,mix(a[0],b[0],u),mix(a[1],b[1],u),camera==='low'?7:4);
 }
 const pos=groundFor(camera,t);
 drawSprite(c,frameAt(t),pos[0],pos[1],bodyHeight(camera,t));
 if(camera==='high'&&t>=3.55)badge(c,raceAt(t).runnerOnBase?'주자 · 발 고정':'주자',pos[0]-14,pos[1]+19,'#ffe37b',raceAt(t).runnerOnBase?105:56);
 const r=raceAt(t),event=scenario(),x=camera==='high'?691:700,y=camera==='high'?851:876;
 let rows=t<2.5?['타격 준비 · 최타돌','무주자 · 0아웃']:t<event.pickupAt?['타격 · 1루 진루 중','내야수 · 타구 처리 중']:t<event.throwAt?['내야수 · 포구 완료','1루 송구 준비']:t<event.ballAt?['송구 · 1루로 이동','주자 · 도착 순서 확인']:['1루수 · 포구 완료','판정 확인'];
 if(r.call)rows=r.call==='safe'?['1루 세이프','베이스를 밟고 대기']:['1루 포스 아웃','주자 진루 종료'];
 c.fillStyle='#103d50';c.fillRect(x,y,310,47);c.fillStyle=r.call==='out'?'#ffb3a5':'#d9f3eb';c.font='bold 17px "Malgun Gothic",sans-serif';c.fillText('• '+rows[0],x+5,y+18);c.fillText('• '+rows[1],x+5,y+40);
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
 const race=raceAt(state.time);$('phaseName').textContent=phases[index].name+(race.call==='safe'?' · SAFE':race.call==='out'?' · OUT':'');
 $('cameraName').textContent=cameraWeight(state.time)>.5?'높은 주루 시점':'낮은 공격 시점';
 $('detail').textContent=race.call==='safe'?'주자가 먼저 베이스를 밟았습니다. 뒤늦게 송구가 와도 발을 붙인 채 세이프를 유지합니다.':race.call==='out'?'1루수가 베이스를 밟고 공을 먼저 받았습니다. 주자는 아웃으로 진루를 끝냅니다.':phases[index].detail;
 if(index!==previousPhase){$('steps').querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-current',i===index?'step':'false');});previousPhase=index;}
}
function seek(t){state.time=clamp(Number(t),0,DURATION);state.playing=false;refresh();return getState();}
function getState(){const p=groundFor(cameraWeight(state.time)>.5?'high':'low',state.time);return {...state,phase:phases[phaseIndex(state.time)].name,frame:frameAt(state.time),progress:progressAt(state.time),position:p,cameraWeight:cameraWeight(state.time),race:raceAt(state.time),events:scenario()};}
function tick(now){
 if(last&&state.playing&&state.ready){state.time+=Math.min((now-last)/1000,.1)*state.speed;if(state.time>=DURATION){if(state.loop)state.time=0;else{state.time=DURATION;state.playing=false;}}refresh();}
 last=now;requestAnimationFrame(tick);
}
function download(data,name){const a=document.createElement('a');a.href=data;a.download=name;a.click();}
async function exportVideo(){
 if(state.recording)return;
 const mime=['video/mp4;codecs=avc1.42001E','video/mp4','video/webm;codecs=vp9'].find(type=>MediaRecorder.isTypeSupported(type));
 if(!mime)throw new Error('이 브라우저에서는 영상 저장을 지원하지 않습니다.');
 const saved={time:state.time,playing:state.playing,speed:state.speed,camera:state.camera,loop:state.loop,scenario:state.scenario};
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
  const url=URL.createObjectURL(blob);download(url,'보통체형-1루-'+state.scenario+'-v01.'+(mime.startsWith('video/mp4')?'mp4':'webm'));setTimeout(()=>URL.revokeObjectURL(url),60000);
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
$('scenario').addEventListener('change',e=>{state.scenario=e.target.value;state.time=0;state.playing=false;refresh();});
$('loop').addEventListener('change',e=>{state.loop=e.target.checked;});
$('sheet').addEventListener('click',()=>download(storyboard(),'보통체형-경기장-8단계-v01.png'));
$('video').addEventListener('click',()=>exportVideo().catch(e=>{state.errors.push(e.message);$('detail').textContent=e.message;}));
document.addEventListener('visibilitychange',()=>{last=performance.now();});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','SELECT','BUTTON'].includes(document.activeElement.tagName)){e.preventDefault();$('play').click();}});
window.FlowPreview={state,phases,seek,getState,render,storyboard,exportVideo,duration:DURATION,play(){if(state.time>=DURATION)state.time=0;state.playing=true;last=performance.now();refresh();},pause(){state.playing=false;refresh();}};
Promise.all(Object.entries(assets).map(([key,url])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{imgs[key]=im;resolve();};im.onerror=()=>reject(new Error(key+' 그림을 불러오지 못했습니다.'));im.src=url;}))).then(()=>{state.ready=true;$('loading').hidden=true;$('loading').style.display='none';refresh();requestAnimationFrame(tick);}).catch(e=>{state.errors.push(e.message);$('loading').textContent=e.message;});
})();


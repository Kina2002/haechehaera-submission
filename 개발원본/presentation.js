// v15: presentation only; outcomes, save format and match rules are unchanged.
const motionSamples=new Map();
const baseFrame15=charFrame;
charFrame=function(p,tm,mode='motion',row=1,col=0){
 const a=baseFrame15(p,tm,mode,row,col);if(mode!=='motion'||a.ground15)return a;
 // Anchor at the soles, not at the centre of a rectangle enlarged by the bat.
 const cv=a.baseCanvas,g=cv.getContext('2d'),px=g.getImageData(0,0,cv.width,cv.height).data;
 let sx=0,n=0,bottom=0;const low=a.anchorY-Math.max(8,a.standHeight*.11);
 for(let y=Math.max(0,Math.floor(low));y<Math.min(cv.height,a.anchorY+1);y++)for(let x=0;x<cv.width;x++){
  const i=(y*cv.width+x)*4;if(px[i+3]>170&&Math.max(px[i],px[i+1],px[i+2])<95){sx+=x;n++;bottom=Math.max(bottom,y);}
 }
 if(n){a.anchorX=sx/n;a.anchorY=bottom+1;}a.ground15=true;return a;
};
function actionFrame15(pose,t,p,distance=0){
 if(pose==='run'){const stride=22+effective(p,'speed')*.12;return[3,[1,2,3,4][Math.floor(distance/stride*4)%4]];}
 if(pose==='pitch')return[1,t<.035?0:t<.085?1:t<.13?2:t<.17?3:4];
 if(pose==='swing')return[0,t<.19?1:t<.22?2:t<.265?3:t<.33?4:5];
 if(pose==='bat')return[0,0];
 if(pose==='throw')return[2,t<.59?2:t<.64?3:4];
 if(pose==='glove'||pose==='catcher')return[2,1];
 if(pose==='catch'||pose==='celebrate')return[4,0];
 if(pose==='slide')return[4,3];
 if(pose==='sad')return[5,5];
 if(pose==='confused')return[5,3];
 return[1,0];
}
function drawCatcher15(c,x,y,scale,tm,p,t){
 const a=charFrame(p,tm,'motion',2,1),s=[45,57,50,52,49,57][a.body]*scale/a.standHeight;
 c.save();c.translate(Math.round(x),Math.round(y));c.scale(s,s);c.drawImage(a.canvas,-a.anchorX,-a.anchorY);
 // Equipment follows this body's face/chest landmarks; the catcher never signals a verdict.
 const [fx,fy,fw,fh]=a.face,xx=fx-a.anchorX,yy=fy-a.anchorY;
 c.fillStyle='#152538';c.fillRect(xx-fw*.03,yy+fh*.92,fw*1.05,fh*.58);
 c.strokeStyle='#7f98a8';c.lineWidth=Math.max(2,fw*.025);
 for(let i=0;i<3;i++){c.beginPath();c.moveTo(xx,yy+fh*(1+i*.19));c.lineTo(xx+fw,yy+fh*(1+i*.19));c.stroke();}
 c.strokeStyle='#bed0d5';c.lineWidth=Math.max(2,fw*.03);c.strokeRect(xx-fw*.04,yy-fh*.04,fw*1.08,fh*.96);
 for(let i=1;i<3;i++){c.beginPath();c.moveTo(xx,yy+fh*i*.30);c.lineTo(xx+fw,yy+fh*i*.30);c.stroke();}
 c.restore();
}
sprite=function(c,x,y,scale,tm,number=0,role='player',pose='idle',tick=0,id='',flip=false){
 if(role!=='player'||!charsReady)return oldSprite(c,x,y,scale,tm,number,role,pose,tick,id,flip);
 const p=tm.players?.find(v=>v.id===id)||tm.market?.find(v=>v.id===id)||tm.players?.find(v=>v.number===number)||demoPlayer;
 const e=anim?.e,t=anim?playProgress(anim.elapsed/anim.duration):0,key=c.canvas.id+':'+id,prior=motionSamples.get(key);
 let distance=0;if(pose==='run'){const step=prior?Math.hypot(x-prior.x,y-prior.y):0;distance=(prior?.pose==='run'?prior.distance:0)+(step<70?step:0);if(c.canvas.id!=='field'&&step===0)distance=tick*(.025+effective(p,'speed')*.00035);}
 motionSamples.set(key,{x,y,pose,distance});if(motionSamples.size>300)motionSamples.clear();
 if(pose==='catcher')return drawCatcher15(c,x,y,scale,tm,p,t);
 let [row,col]=actionFrame15(pose,t,p,distance);
 if(pose==='pitch')flip=true;if(['bat','swing'].includes(pose))flip=p.hand==='좌타';
 const a=charFrame(p,tm,'motion',row,col),height=[45,57,50,52,49,57][a.body]*scale,s=height/a.standHeight;
 c.save();c.translate(Math.round(x),Math.round(y));c.fillStyle='#06241f65';c.beginPath();c.ellipse(0,2,12*scale,3*scale,0,0,Math.PI*2);c.fill();
 if(flip)c.scale(-1,1);c.imageSmoothingEnabled=false;c.drawImage(a.canvas,Math.round(-a.anchorX*s),Math.round(-a.anchorY*s),Math.round(a.canvas.width*s),Math.round(a.canvas.height*s));c.restore();
};
function drawUmpire15(c,e,t){
 const signal=!!e&&t>.72&&['strike','ks','kl','ground','fly','line','dp','flydp','cs'].includes(e.type);
 // Neutral black cap, grey trousers, face mask; positioned behind and to the side of C.
 c.save();c.translate(502,516);c.scale(1.35,1.35);c.fillStyle='#09263060';c.beginPath();c.ellipse(0,1,11,3,0,0,Math.PI*2);c.fill();
 rect(c,-8,-14,6,13,'#6f7e89');rect(c,3,-14,6,13,'#6f7e89');rect(c,-10,-3,8,4,'#111d29');rect(c,3,-3,9,4,'#111d29');
 rect(c,-10,-28,21,16,'#151f2c');rect(c,-8,-27,17,2,'#c4d4dd');rect(c,-2,-26,2,12,'#4b606c');
 rect(c,-9,-41,18,14,'#d8a87f');rect(c,-10,-43,20,6,'#141f2d');rect(c,-11,-38,23,3,'#263547');
 rect(c,-9,-35,18,2,'#9aaebc');rect(c,-9,-30,18,2,'#9aaebc');rect(c,-9,-36,2,10,'#9aaebc');rect(c,7,-36,2,10,'#9aaebc');
 rect(c,-14,-25,5,13,'#18232f');rect(c,-14,-14,5,4,'#d8a87f');
 if(signal){rect(c,10,-27,9,5,'#18232f');rect(c,15,-38,5,15,'#18232f');rect(c,14,-42,7,6,'#d8a87f');}
 else{rect(c,10,-25,5,13,'#18232f');rect(c,10,-14,5,4,'#d8a87f');}c.restore();
}
// Feet accelerate gently, then keep a steady stride rather than gliding throughout the run.
function travelProgress15(u){u=clamp(u,0,1);const a=.12,n=1-a;return u<a?u*u/(2*a*n):u>1-a?1-(1-u)**2/(2*a*n):(u-a/2)/n;}
runnerPoint=function(move,u){const points=move.points.map(p=>p.slice());if(move.from===0&&Math.hypot(points[0][0]-450,points[0][1]-450)<30)points[0]=[ply(tside(team().match,anim?.e.attack??attack(team().match)),move.id)?.hand==='좌타'?478:422,455];return pointAlong(points,travelProgress15(u));};
let field15=drawField.toString();
function fieldReplace15(a,b){if(!field15.includes(a))throw Error('v15 경기 연결 누락: '+a);field15=field15.replace(a,b);}
// Keep camera scale constant throughout each pitch; the prior contact-based zoom jumped.
fieldReplace15('const zoom=a===0&&!e?.contact?1.16:1','const zoom=1');
fieldReplace15('t<.22?"pitch"','t<.29?"pitch"');
fieldReplace15('smoothProgress(mt)','travelProgress15(mt)');
fieldReplace15('pose=mt>0&&mt<1?"run":"glove"','pose=t<move.start?"idle":mt<1?"run":"glove"');
fieldReplace15('if(actor.fieldPos==="C"&&pose==="glove")pose="catcher";','if(actor.fieldPos==="C"&&!["run","throw","sad","confused"].includes(pose))pose="catcher";');
fieldReplace15('const actorLabels=[];','drawUmpire15(c,e,t);const actorLabels=[];');
fieldReplace15('bp=pointAlong(e.ball.slice(0,2),t/.22)','bp=t<.13?null:pointAlong(e.ball.slice(0,2),clamp((t-.13)/.09,0,1))');
fieldReplace15('else if(e.contact&&e.ball.length>2&&t<.55)','else if(e.pitchThrown&&!e.contact&&e.ball.length===2)bp=pointAlong([e.ball[1],[432,447]],clamp((t-.22)/.08,0,1));else if(e.contact&&e.ball.length>2&&t<.55)');
fieldReplace15('if(e.type==="hr"&&t>.37)for','if(false)for');
drawField=(0,eval)('('+field15+')');
const actorLabel15=drawActorLabel;
drawActorLabel=function(c,a,labels){
 if(['bat','swing'].includes(a.pose))return;
 // Keep the catcher identified, with the plate label below-left of the feet
 // so it does not cover either the catcher or the umpire standing behind-right.
 const atPlate=a.fieldPos==='C'&&Math.hypot(a.x-450,a.y-480)<60;
 actorLabel15(c,atPlate?{...a,x:a.x+45,y:a.y+10}:a,labels);
};
const motion15=buildMotion;
function battingPoint15(m,e){const tm=tside(m,e.attack),p=ply(tm,e.batter),left=p.hand==='좌타',a=charFrame(p,tm,'motion',0,3),s=[45,57,50,52,49,57][a.body]*fieldScale(455)/a.standHeight;
 if(!a.batPoint15){const cv=a.baseCanvas,d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,points=[];let edge=0;
  for(let y=0;y<cv.height;y++)for(let x=Math.ceil(a.face[0]+a.face[2]);x<cv.width;x++){const i=(y*cv.width+x)*4;if(d[i+3]>170&&d[i]>80&&d[i+1]>40&&d[i]>d[i+1]*1.12&&d[i+1]>d[i+2]*1.15&&d[i]>d[i+2]*1.7){points.push([x,y]);edge=Math.max(edge,x);}}
  const tip=points.filter(v=>v[0]>edge-a.face[2]*.25);a.batPoint15=tip.length?[tip.reduce((n,v)=>n+v[0],0)/tip.length,tip.reduce((n,v)=>n+v[1],0)/tip.length]:[a.face[0]+a.face[2]*1.4,a.face[1]+a.face[3]];
 }return[(left?478:422)+(left?-1:1)*(a.batPoint15[0]-a.anchorX)*s,455+(a.batPoint15[1]-a.anchorY)*s];}
buildMotion=function(m,e){motion15(m,e);if(!e.pitchThrown||e.ball.length<2)return;e.ball[0]=[430,310];e.ball[1]=battingPoint15(m,e);};
drawBatAction=function(c,e,t){if(!e?.swing||t<.19||t>.30)return;const [x,y]=e.ball[1],u=clamp((t-.19)/.11,0,1);c.save();c.globalAlpha=Math.sin(u*Math.PI)*.75;c.strokeStyle='#fff4c4';c.lineWidth=2;c.beginPath();c.ellipse(x,y,20,6,0,Math.PI*.8,Math.PI*(.8+u));c.stroke();if(e.contact&&t>=.22&&t<.26)for(let i=0;i<6;i++){const a=i*Math.PI/3;line(c,[[x+Math.cos(a)*5,y+Math.sin(a)*5],[x+Math.cos(a)*10,y+Math.sin(a)*10]],'#fff2a8',2);}c.restore();};
// One compact outcome below the field, at its left edge. Counts stay on the scoreboard.
const match15=matchHTML;
matchHTML=function(){return match15().replace('<div id="bigPlay"></div>','').replace('<div class="controls">','<div id="bigPlay" class="outcome-dock" aria-live="polite"><span class="outcome-wait">플레이를 기다립니다</span></div><div class="controls">');};
outcomeCard=function(e){const i=outcomeInfo(e);return '<div class="play-result '+i.mood+'"><strong>'+esc(i.title)+'</strong>'+(e.bh?'<span>'+esc(boneheadAttribution(e))+'</span>':'')+'</div>';};
paintOutcome=function(){if(screen!=='match')return;const host=$('#bigPlay');if(!host)return;const e=anim?.e,key=anim?.resultShown?e.id+':result':'';if(host.dataset.shown===key)return;host.dataset.shown=key;host.innerHTML=key?outcomeCard(e):'<span class="outcome-wait">'+(e?'플레이 중…':'플레이를 기다립니다')+'</span>';};
paintPitchAction=function(){};
// Single scoring event per resolved play. All runs in a multi-run play share one effect.
function scoreTheme15(e){return e?.runs?.length?e.attack===0?'joy':'despair':null;}
function paintScore15(e){
 const field=$('.field-wrap');if(!field)return;let fx=field.querySelector('.score-moment');const theme=scoreTheme15(e);
 if(!theme||!anim?.resultShown){fx?.remove();return;}
 if(fx?.dataset.event===e.id)return;fx?.remove();fx=document.createElement('div');fx.className='score-moment '+theme;fx.dataset.event=e.id;
 fx.setAttribute('aria-hidden','true');fx.innerHTML='<div class="score-ribbon"><b>'+(theme==='joy'?'좋았어!':'아… 뼈아프다')+'</b><span>'+(theme==='joy'?'우리 팀 득점':'상대 팀 득점')+' +'+e.runs.length+'</span></div>'+Array.from({length:theme==='joy'?18:9},(_,i)=>'<i style="--x:'+(4+(i*23)%92)+'%;--delay:'+(i%5)*.09+'s;--c:'+['#ffe475','#a7ffe0','#fff5c8'][i%3]+'"></i>').join('');field.append(fx);
}
effectsForEvent=function(c,e,t,time){paintScore15(e);};
// Match card uses an elastic text column and explicit portrait placement.
const css15=document.createElement('style');css15.textContent=`
.in-game .field-status,.in-game .match-log{display:none!important}
.in-game .outcome-dock{min-height:56px;padding:9px 14px;background:#061b30;border:1px solid #315c77;border-top:0;display:flex;align-items:center}
.in-game .outcome-dock .play-result{position:static;transform:none;animation:none;width:auto;max-width:100%;border:0;border-left:3px solid #83c8e3;border-radius:0;box-shadow:none;background:none;padding:0 10px;text-align:left;display:flex;align-items:center;gap:12px}
.in-game .outcome-dock .play-result strong{font-size:23px;line-height:1.3;text-shadow:none;white-space:nowrap}
.in-game .outcome-dock .play-result>span{font-size:12px;overflow-wrap:anywhere}
.outcome-wait{font-size:12px;color:#8aa8bb}
.in-game .reaction{display:grid!important;grid-template-columns:minmax(0,1fr) 94px!important;width:min(390px,66%);max-width:66%;height:auto;max-height:none;align-items:center;gap:8px;padding:10px;overflow:visible;right:10px;top:10px}
.in-game .reaction .bubble{grid-column:1;grid-row:1;width:auto;min-width:0;max-width:none;max-height:none;height:auto;overflow:visible;white-space:normal;word-break:keep-all;overflow-wrap:anywhere;font-size:13px;line-height:1.6;margin:0;padding:10px}
.in-game .reaction canvas,.in-game .reaction[data-bust="true"] canvas{grid-column:2;grid-row:1;width:94px;height:105px;min-width:0;max-width:100%;object-fit:contain;align-self:end}
.score-moment{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden;animation:scoreFade15 2.8s both}
.score-moment.joy{box-shadow:inset 0 0 48px #ffcf5570}.score-moment.despair{box-shadow:inset 0 0 70px #11102b9c}
.score-ribbon{position:absolute;top:16px;left:18px;padding:10px 16px;border-left:4px solid #ffd66c;background:#1d354ddd;max-width:29%;color:#fff0ac}
.score-ribbon b{font:26px NeoDunggeunmo;display:block}.score-ribbon span{font-size:13px;display:block;margin-top:4px}
.despair .score-ribbon{color:#d6d9ee;background:#171f3ce6;border-color:#8999cb}
.score-moment i{position:absolute;left:var(--x);top:-12px;background:var(--c);width:5px;height:9px;animation:confetti15 2.1s var(--delay) ease-out both}
.score-moment.despair i{width:2px;height:38px;background:#8291b870;animation:rain15 1.8s var(--delay) ease-out both}
@keyframes confetti15{from{transform:translateY(-15px) rotate(0);opacity:0}20%{opacity:1}to{transform:translateY(200px) rotate(260deg);opacity:0}}
@keyframes rain15{from{transform:translateY(0);opacity:0}20%{opacity:.6}to{transform:translateY(240px);opacity:0}}
@keyframes scoreFade15{0%{opacity:0}12%,70%{opacity:1}100%{opacity:0}}
@media(prefers-reduced-motion:reduce){.score-moment i{display:none}.score-moment{animation:none;opacity:.9}}
`;document.head.append(css15);

// Read-only QA scene uses actual field/card renderers; it never saves or advances a real club.
function presentationLab15(){
 if(!charsReady||screen==='match')return;
 const t=newTeam('움직임 점검',11,5),opp=newTeam('상대 점검',8,4),baseData={saveVersion:1,slots:[t,null],current:0,settings:{sound:false,speed:1}};
 let kind='ground',started=performance.now(),fixed=false,fixedMs=4200,e,m,token=0,resultRendered20=false;
 function context(fn){const keep={data,anim,reaction,screen,shiftLead};suppressPersist++;data=baseData;screen='match';shiftLead=null;try{return fn();}finally{data=keep.data;anim=keep.anim;reaction=keep.reaction;screen=keep.screen;shiftLead=keep.shiftLead;suppressPersist--;}}
 function make(){resultRendered20=false;context(()=>{
  const side=kind==='away'||kind.startsWith('bh')?1:0;m={id:'qa15-'+(++token),opp,home:1-side,inning:2,half:0,outs:0,balls:0,strikes:0,bases:[null,null,null],score:[1,1],order:[0,0],last:[null,null],hits:[0,0],errors:[0,0],innings:[Array(7).fill(0),Array(7).fill(0)],paPitches:0,pitches:0,bh:[0,0],bhBase:[0,0],bhBaseUsed:[0,0],opportunities:[0,0],defense:{side:1,depth:1},events:[],checks:{events:0,violations:[],motions:0,reactions:0},lastLines:{},reactionCount:0,rng:7891,used:t.lineup.map(x=>x.id),subs:[],paused:false,auto:false};t.match=m;prepare(m);
  const at=tside(m,side);if(['home','away'].includes(kind))m.bases[2]=at.lineup[3].id;if(['dp','sb','cs','flydp','hitout','hitoutend'].includes(kind))m.bases[0]=at.lineup[2].id;if(kind==='hitoutend')m.outs=2;e=emptyEvent(m);e.inputCommand='contact';e.fielder=fielder(tside(m,1-side),'CF');e.fielderId=e.fielder.id;e.fieldPos='CF';e.target=[535,242];
  if(kind.startsWith('bh')){e.bh=+kind.slice(2);e.bhSide=0;ballInPlay(m,e,{n:e.bh,side:0});registerBH(m,e);}
  else if(['home','away','hr'].includes(kind)){e.swing=true;e.contact=true;reachHit(m,e,kind==='hr'?4:1);if(kind==='hr')e.target=[780,115];}
  else if(['hitout','hitoutend'].includes(kind)){const id=m.bases[0];m.bases[0]=null;e.type='single';e.text='안타 · 선행주자 태그 아웃';e.hit=1;e.swing=true;e.contact=true;e.tag=true;e.throwBases=[3];moveTo(e,id,1,3,true,.28);addOut(m,e,id);moveTo(e,e.batter,0,1,false,.22);if(m.outs<3)m.bases[0]=e.batter;finishPA(m,e,'ab');}
  else if(['ks','kl'].includes(kind)){e.type=kind;e.text=kind==='ks'?'헛스윙 삼진':'루킹 삼진';e.swing=kind==='ks';e.contact=false;addOut(m,e,e.batter);finishPA(m,e,'ab');}
  else if(['sb','cs'].includes(kind)){const id=m.bases[0];m.bases[0]=null;e.type=kind;e.text=kind==='sb'?'도루 성공':'도루 실패';e.pitchThrown=false;e.tag=kind==='cs';e.actor=id;e.fielder=fielder(opp,'C');e.fielderId=e.fielder.id;e.fieldPos='C';e.target=null;e.throwBases=[2];moveTo(e,id,1,2,kind==='cs',.24);if(kind==='cs')addOut(m,e,id);else m.bases[1]=id;}
  else if(['fly','sf','flydp'].includes(kind)){e.swing=true;e.contact=true;if(kind==='sf')m.bases[2]=at.lineup[3].id;flyOut(m,e,kind==='flydp'?3:kind==='sf'?10:0);}
  else if(['ground','dp'].includes(kind)){e.swing=true;e.contact=true;e.fieldPos='SS';e.fielder=fielder(opp,'SS');e.fielderId=e.fielder.id;e.target=[375,343];groundOut(m,e,kind==='dp');}
  else if(['hbp','bb'].includes(kind)){e.contact=false;e.swing=false;e.target=null;walk(m,e,kind);}
  else if(kind==='ball'){e.type='ball';e.text='볼';m.balls=1;e.contact=false;e.swing=false;e.target=null;}
  else{e.type='strike';e.text='스트라이크';m.strikes=1;e.contact=false;e.swing=false;e.target=null;}
  if(!e.contact)e.target=null;
  e.after=snap(m);buildMotion(m,e);e.reaction=DIALOGUES.flatMap(g=>g[4]).filter(x=>x[0]==='중계진').sort((a,b)=>b[1].length-a[1].length)[0];
  if(['hitout','hitoutend'].includes(kind)){e.flowQA23=true;e.group=chooseGroup(m,e);const lines=DIALOGUES.find(g=>g[0]===e.group)?.[4];const line=lines?.find(x=>x[0]==='우리 관객');if(line)e.reaction=line;}
  if(typeof rememberScene19==='function')rememberScene19(kind,m,e); if(typeof seedHistory21==='function')seedHistory21(m,e);
  anim={e,elapsed:0,duration:4200,resultShown:false,holdLeft:3000};reaction=null;
  $('#qa15Stage').innerHTML=matchHTML();$('#qa15Stage').querySelectorAll('button').forEach(b=>b.disabled=true);portraitCanvases();
 });started=performance.now();}
 note('경기 연출 점검 · 저장되지 않는 미리보기','<div class="row wrap"><select id="qa15Scene" aria-label="장면"><option value="strike">스트라이크 · 포수와 심판</option><option value="ground" selected>타격 · 땅볼 아웃</option><option value="ks">헛스윙 삼진</option><option value="kl">루킹 삼진</option><option value="dp">땅볼 병살 · 2루 → 1루</option><option value="sb">2루 도루 · 세이프</option><option value="cs">2루 도루 저지 · 아웃</option><option value="hitout">안타 + 선행주자 아웃</option><option value="hitoutend">안타지만 주자 아웃으로 공격 종료</option><option value="fly">플라이 아웃</option><option value="hbp">몸에 맞는 공</option><option value="bb">볼넷</option><option value="sf">희생플라이 · 아웃과 홈인</option><option value="flydp">귀루 실패 병살</option><option value="home">우리 팀 안타 득점</option><option value="away">상대 팀 안타 득점</option><option value="hr">우리 팀 홈런</option></select><button id="qa15Replay">다시 재생</button><button id="qa15Result">결과에서 멈춤</button><button id="qa15Check">전체 멘트·연출 검사</button><label>동작 시점 <input id="qa15Time" aria-label="동작 시점" type="range" min="0" max="7200" step="10" value="0"></label></div><div id="qa15Stage" class="in-game"></div><pre id="qa15Report"></pre>');
 const dialog=$('#dialog');dialog.style.cssText='max-width:1420px;width:98vw';make();
 $('#qa15Scene').onchange=()=>{kind=$('#qa15Scene').value;fixed=false;make();};$('#qa15Replay').onclick=()=>{fixed=false;make();};$('#qa15Result').onclick=()=>{fixed=true;fixedMs=4800;started=performance.now()-4800;};
 $('#qa15Time').oninput=()=>{fixed=true;fixedMs=+$('#qa15Time').value;};
 $('#qa15Check').onclick=()=>context(()=>{
  const failures=[];let lines=0;anim={e,elapsed:4200,duration:4200,resultShown:true};
  for(const group of DIALOGUES)for(const [speaker,line]of group[4]){reaction={speaker,line:line.replaceAll('{N}','12'),group:group[0],eventId:'text-'+lines,left:5000};renderReaction();const b=$('.reaction .bubble'),card=$('.reaction'),stage=$('.field-wrap'),br=b.getBoundingClientRect(),cr=card.getBoundingClientRect(),sr=stage.getBoundingClientRect();const textRange=document.createRange();textRange.selectNodeContents(b);const textRects=[...textRange.getClientRects()];if(textRects.some(r=>r.right>br.right+1||r.left<br.left-1||r.bottom>br.bottom+1)||b.scrollHeight>b.clientHeight+1||br.right+16>cr.right+1||cr.bottom>sr.bottom+1||cr.left<sr.left-1)failures.push(speaker+': '+line);lines++;}
  const sample={...e,runs:['r'],attack:0},markup=outcomeCard(sample);if(/pitch-verdict|타석 계속|다음 타자|지시:|아웃 \+/.test(markup))failures.push('판정 정보 중복');
  if(scoreTheme15(sample)!=='joy'||scoreTheme15({...sample,attack:1})!=='despair'||scoreTheme15({...sample,runs:[]})!==null)failures.push('득점 구분');
  const [r,c]=actionFrame15('pitch',.135,t.players[0]);if(r!==1||c!==3)failures.push('투구 릴리스');
  for(let i=0;i<100;i++)if(travelProgress15(i/100)>travelProgress15((i+1)/100))failures.push('주루 역행');
  const report={reactionLines:lines,failures,runtimeErrors:runtimeErrors.slice(),notes:'실제 경기 렌더러로 격리 미리보기 검사. 저장·기록 변경 없음.'};$('#qa15Report').textContent=JSON.stringify(report,null,2);
 });
 function frame(now){if(!dialog.open||!$('#qa15Stage'))return;const ms=fixed?fixedMs:(now-started)%7800;context(()=>{anim={e,elapsed:Math.min(4200,ms),duration:4200,resultShown:ms>=4200,holdLeft:3000,judgeClock18:ms};reaction=ms>=4200?{speaker:e.reaction[0],line:e.reaction[1],group:'g01',eventId:e.id,left:5000}:null;if(ms>=4200&&!resultRendered20){resultRendered20=true;$('#qa15Stage').innerHTML=matchHTML();$('#qa15Stage').querySelectorAll('button').forEach(b=>b.disabled=true);portraitCanvases();}if(ms<4200)resultRendered20=false;drawField(now);renderReaction();paintOutcome();});requestAnimationFrame(frame);}requestAnimationFrame(frame);
}
if($('#qaTools'))$('#qaTools').insertAdjacentHTML('afterbegin','<button id="qa15Open">v15 경기 연출 점검</button> ');
if($('#qa15Open'))$('#qa15Open').onclick=presentationLab15;


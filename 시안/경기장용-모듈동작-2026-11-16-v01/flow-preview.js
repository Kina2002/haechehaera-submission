/* Isolated art review. This page never reads or writes club saves. */
(()=>{'use strict';
const F=FieldRendererV13,M=PlayerMotionV13,R=PortraitRendererV13,$=s=>document.getElementById(s),clamp=v=>Math.max(0,Math.min(1,v));
M.scenarios.forEach(([id,name])=>$('action').add(new Option(name,id)));for(const k of ['bat','run'])M.forms[k].forEach((name,i)=>$(k).add(new Option(name,i)));M.personalities.forEach((name,i)=>$('habit').add(new Option(name,i)));$('action').value='single';
const bodies=[2,5,4,3,1,0],bases=[[200,250],[335,192],[200,125],[65,192],[200,250]];
let u=0,playing=true,last=0;
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*clamp(t));
const along=(points,t)=>M.routePoint(points,t);
function config(body){const v=+$('identity').value;return{body,skin:[0,3,5][v],hairColor:[2,0,4][v],eyeColor:[2,3,4][v],parts:{hair:[1,4,6][v],beard:v===1?2:-1,wear:-1,black:-1,eyes:v,brows:v,nose:v,mouth:v}};}
function path(action,t){
 const H=bases[0],one=bases[1],two=bases[2],three=bases[3],lead=mix(one,two,.12);
 switch(action){
 case 'entry':return mix([$('home').value==='home'?390:10,250],H,t/.57);
 case 'single':return mix(H,one,(t-.26)/.66);
 case 'second':case 'headSlide':return mix(one,two,t/.80);
 case 'tagout':return t<.9?mix(one,two,Math.min(.90,t/.80*.90)):mix(mix(one,two,.90),[390,250],(t-.9)/.1);
 case 'third':return mix(two,three,t/.92);
 case 'home':return mix(three,H,t/.78);
 case 'round':return along([one,two,three,H],t);
 case 'lead':return mix(one,lead,t/.3);
 case 'return':return mix(lead,one,t/.75);
 case 'tagup':return mix(two,three,(t-.38)/.62);
 case 'overslide':return t<.58?mix(one,[190,115],t/.58):mix([190,115],two,(t-.58)/.09);
 case 'walk':case 'hbp':return mix(H,one,(t-.27)/.58);
 case 'homer':return t<.24?H:along([H,one,two,three,H],(t-.24)/.58);
 case 'bat':return mix(H,one,(t-.8)/.4);
 case 'lookingK':case 'swingingK':return mix(H,[$('home').value==='home'?390:10,250],(t-.78)/.22);
 case 'exit':return mix(H,[$('home').value==='home'?390:10,250],t);
 case 'fieldEntry':return mix([390,250],two,t/.88);
 case 'flyout':return t<.4?mix(H,one,t*.9):t<.84?mix(H,one,.36):mix(mix(H,one,.36),[390,250],(t-.84)/.16);
 case 'forceout':return t<.91?mix(H,one,t/.74):mix(one,[390,250],(t-.91)/.09);
 case 'earlyBall':return t<.78?mix(one,two,Math.min(.5,t/.9)):mix(mix(one,two,.5),one,(t-.78)/.22);
 case 'bh1':case 'bh2':return mix(H,one,(t-.52)/.48);
 case 'bh3':case 'bh4':return t<.68?mix(one,two,t/.5):mix(two,one,(t-.68)/.32);
 case 'bh5':return mix(one,two,t/.45);
 case 'bh6':return mix(one,two,Math.min(.8,t/.9));
 case 'bh7':return t<.7?mix(one,[390,250],t/.55):mix([390,250],one,(t-.7)/.3);
 default:return H;
 }
}
function sample(body,action,t){
 const xy=path(action,t),before=path(action,Math.max(0,t-.002)),after=path(action,Math.min(1,t+.002)),moving=Math.hypot(after[0]-before[0],after[1]-before[1])>.01;
 const p={id:'review-player-'+$('identity').value,hand:$('hand').value==='left'?'좌타':'우타',appearance:config(body)};
 const ctx={home:$('home').value==='home',left:$('hand').value==='left',flip:moving?after[0]<before[0]:false,rear:moving&&after[1]<before[1]&&Math.abs(after[1]-before[1])>Math.abs(after[0]-before[0])*.8,time:t*6500,forms:{bat:+$('bat').value,run:+$('run').value,habit:+$('habit').value}};
 const motion=M.sample(action,t,p,ctx),frame=F.render(p.appearance,motion.pose,{flip:motion.flip,direction:motion.direction,headwear:'helmet'});
 return{xy,motion,frame};
}
function character(g,result,scale=1.7,mark=true){
 const {xy,motion,frame}=result,anchor=motion.contact?frame.contacts[motion.contact]:frame.foot;
 g.fillStyle='#0b251c66';g.beginPath();g.ellipse(xy[0],xy[1]+2,13*scale,3*scale,0,0,Math.PI*2);g.fill();
 g.drawImage(frame.canvas,Math.round(xy[0]-anchor[0]*scale),Math.round(xy[1]-anchor[1]*scale),64*scale,64*scale);
 if(mark&&motion.contact){g.fillStyle='#ffe18b';g.fillRect(xy[0]-1,xy[1]-1,3,3);}
}
function background(g,body){
 g.fillStyle='#193d32';g.fillRect(0,0,400,300);g.fillStyle='#ddc48a';g.font='16px sans-serif';g.fillText(R.bodyNames[body],16,26);
 g.fillStyle='#b89160';g.beginPath();bases.slice(0,4).forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();
 g.fillStyle='#39774a';g.beginPath();[[200,226],[297,192],[200,148],[104,192]].forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();
 bases.slice(0,4).forEach(([x,y],i)=>{g.fillStyle='#fff5dc';g.fillRect(x-5,y-3,10,6);g.fillStyle='#c1d5b8';g.font='11px sans-serif';g.fillText(['홈','1루','2루','3루'][i],x+7,y+9);});
}
function draw(){
 const action=$('action').value,g=$('scene').getContext('2d');g.imageSmoothingEnabled=false;g.clearRect(0,0,1200,600);
 for(const [i,body]of bodies.entries()){g.save();g.translate((i%3)*400,Math.floor(i/3)*300);background(g,body);const result=sample(body,action,u);character(g,result);g.fillStyle='#b1c6b9';g.font='12px sans-serif';g.fillText(result.motion.phase,16,283);g.restore();}
 const result=sample(2,action,u);$('phase').textContent=result.motion.phase+' · '+F.names[result.motion.pose];$('time').textContent=(u*100).toFixed(0)+'%';$('seek').value=Math.round(u*1000);
}
function frames(){
 const g=$('frames').getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#e8e4d8';g.fillRect(0,0,1200,210);
 for(let i=0;i<12;i++){const t=i/11,r=sample(2,$('action').value,t);r.xy=[i*100+50,155];character(g,r,1.8,false);g.fillStyle='#345245';g.font='11px sans-serif';g.textAlign='center';g.fillText(Math.round(t*100)+'% · '+r.motion.pose,i*100+50,183);}g.textAlign='left';
}
function loop(now){if(last&&playing)u=(u+(now-last)/6500*+$('speed').value)%1;last=now;draw();requestAnimationFrame(loop);}
document.querySelectorAll('select').forEach(el=>el.onchange=()=>{u=0;frames();draw();});$('seek').oninput=()=>{u=+$('seek').value/1000;playing=false;$('play').textContent='재생';draw();};$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'일시정지':'재생';};$('restart').onclick=()=>{u=0;draw();};
F.init().then(()=>{frames();window.flowPreview={sample,path,draw,frames,setProgress:v=>{u=v;playing=false;draw();}};window.previewReady=true;requestAnimationFrame(loop);});
})();

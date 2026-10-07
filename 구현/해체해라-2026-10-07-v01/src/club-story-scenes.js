// Four-shot stories. All drawing is deterministic and never changes game state.
function clubStoryMoment(event,ms){
 const phase=clubEventScenePhase(ms,event),start=CLUB_STORY_CUTS[phase],end=CLUB_STORY_CUTS[phase+1]||CLUB_STORY_DURATION;
 return {phase,u:clamp((ms-start)/(end-start),0,1)};
}
// Find the exposed hand pixels in the actual recoloured pose, below the face.
// Props can then follow both walking frames and every body/skin choice.
function clubStoryHands(a,p){
 if(a.storyHands)return a.storyHands;
 const [fx,fy,fw,fh]=a.face,cv=a.baseCanvas,rgba=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
 const rgb=(SKINS[p.appearance.skin]||SKINS[0]).match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16)),points=[];
 for(let y=Math.ceil(fy+fh);y<Math.min(cv.height,a.anchorY-a.standHeight*.13);y++)for(let x=0;x<cv.width;x++){
  const i=(y*cv.width+x)*4;if(rgba[i+3]<200)continue;
  const shade=rgba[i]/rgb[0];if(shade<.65||shade>1.07)continue;
  if(Math.abs(rgba[i+1]-rgb[1]*shade)<4&&Math.abs(rgba[i+2]-rgb[2]*shade)<4)points.push([x,y]);
 }
 const centre=fx+fw/2;
 const tip=right=>{const half=points.filter(v=>right?v[0]>=centre:v[0]<centre);if(!half.length)return [centre+(right?1:-1)*fw*.55,fy+fh*1.5];const edge=(right?Math.max:Math.min)(...half.map(v=>v[0])),end=half.filter(v=>Math.abs(v[0]-edge)<5);return [end.reduce((n,v)=>n+v[0],0)/end.length,end.reduce((n,v)=>n+v[1],0)/end.length];};
 return a.storyHands={left:tip(false),right:tip(true)};
}
function clubStoryPlayer(c,p,tm,x,y,height,pose,ms,flip=false){
 const poses={idle:[1,0],crouch:[2,1],walk:[3,2+Math.floor(ms/190)%2],sad:[5,5],surprised:[5,3],teach:[2,4],bat:[0,0],swing:[0,3],cheer:[4,0]};
 const [row,col]=poses[pose]||poses.idle,a=charFrame(p,tm,'motion',row,col),s=height/a.standHeight;
 c.save();c.translate(Math.round(x),Math.round(y));if(flip)c.scale(-1,1);
 c.fillStyle='#061c3450';c.fillRect(-height*.19,-3,height*.38,7);
 c.drawImage(a.canvas,Math.round(-a.anchorX*s),Math.round(-a.anchorY*s),Math.round(a.canvas.width*s),Math.round(a.canvas.height*s));c.restore();
 const [fx,fy,fw,fh]=a.face,point=(px,py)=>({x:x+(px-a.anchorX)*s*(flip?-1:1),y:y+(py-a.anchorY)*s});
 const hands=clubStoryHands(a,p);
 return {...point(fx+fw/2,fy+fh*.48),width:fw*s,height:fh*s,eyes:a.eye.eyes.map(e=>point(e[0]+e[2]/2,e[1]+e[3])),hand:point(...hands[flip?'left':'right']),skin:SKINS[p.appearance.skin]||SKINS[0]};
}
function drawClubStoryScene(c,event,ms){
 const def=clubEventDefinition(event);if(!def?.shots)return false;
 const {phase,u}=clubStoryMoment(event,ms),actor=event.actor,tm={primary:event.primary,secondary:event.secondary,players:[actor]},colors=COLORS[event.primary][1];
 const lerp=(a,b,v)=>a+(b-a)*clamp(v,0,1),ease=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
 const box=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 const line=(x1,y1,x2,y2,color,width=4)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();};
 const text=(s,x,y,size=21,color='#fff0cf',align='center')=>{c.fillStyle=color;c.font=size+'px NeoDunggeunmo';c.textAlign=align;c.fillText(s,x,y);};
 const bubble=(s,x,y,bad=false)=>{c.font='21px NeoDunggeunmo';const w=Math.min(830,c.measureText(s).width+28);x=clamp(x,w/2+12,888-w/2);box(x-w/2,y-28,w,40,bad?'#ffe0d8':'#fff4d5');box(x-5,y+12,10,8,bad?'#ffe0d8':'#fff4d5');text(s,x,y,21,bad?'#723d40':'#203d4a');};
 const player=(x,y,pose='idle',height=178,flip=false,p=actor)=>clubStoryPlayer(c,p,tm,x,y,height,pose,ms,flip);
 const fan=(x,y,i,wave=false)=>entranceFan(c,x,y,3,tm,wave?ms:0,i);
 const ball=(x,y,r=5)=>{box(x-r,y-r,r*2,r*2,'#fff7df');box(x-1,y-r,2,r*2,'#d57868');};
 // Supporting cast has separate silhouettes: children with uniforms and a parent without a cap.
 const npc=(x,y,kind,pose='idle',number=1)=>{
  const scale=kind==='mother'?4:kind==='reporter'?3.6:2.7;
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
  const walk=pose==='walk'?Math.sin(ms*.014)*2:0,skin='#efc49f',hair='#54394b';
  box(-8,0,16,2,'#112c3744');box(-5,-9,4,9+walk,'#30495a');box(2,-9,4,9-walk,'#30495a');
  box(-7,-23,14,16,kind==='mother'?'#cf7580':kind==='reporter'?'#46596c':'#f2eedb');
  box(-6,-35,12,13,skin);box(-7,-36,14,5,hair);box(-7,-31,3,10,hair);box(4,-31,3,10,hair);
  box(-3,-28,2,2,'#26303d');box(2,-28,2,2,'#26303d');box(-1,-24,3,1,'#a46257');
  if(kind==='mother'){box(5,-38,5,8,hair);box(-7,-10,14,4,'#b65673');}
  else if(kind==='child'){box(6,-21,4,12,'#e5b749');box(-5,-20,10,9,'#edd777');}
  else if(kind==='youth'){
   box(-7,-38,14,6,'#326595');box(4,-34,6,2,'#24466f');box(-1,-21,2,14,'#b5c4c7');
   text(String(number),2,-12,6,'#326595');
  }
  const raised=pose==='cheer'||pose==='hug';
  box(-10,raised?-29:-21,3,raised?12:10+walk,skin);box(8,raised?-29:-21,3,raised?12:10-walk,skin);
  if(pose==='bat'||pose==='swing'){line(7,-19,pose==='swing'?24:14,pose==='swing'?-15:-42,'#bd854a',3);}
  if(pose==='sad'){box(-3,-25,2,4,'#81d4ec');box(3,-25,2,4,'#81d4ec');}
  c.restore();
 };
 const floor=(color)=>{box(0,292,900,168,color);for(let i=0;i<8;i++)box(i*140-25,354,95,2,'#ffffff14');};
 const plaque=(s,x,y,w=190)=>{box(x-w/2,y-24,w,36,'#123b50');box(x-w/2,y+12,w,3,'#d4b47b');text(s,x,y,20);};
 c.save();c.imageSmoothingEnabled=false;c.clearRect(0,0,900,460);
 const scene={phase,u,actor,tm,colors,lerp,ease,box,line,text,bubble,player,fan,npc,ball,floor,plaque};
 if(event.kind==='autograph')drawAutographStory(c,event,ms,scene);
 else if(event.kind==='litter')drawLitterStory(c,event,ms,scene);
 else if(event.kind==='ignore')drawIgnoreStory(c,event,ms,scene);
 else if(event.kind==='donation')drawDonationStory(c,event,ms,scene);
 else if(event.kind==='bench-song')drawBenchSongStory(c,event,ms,scene);
 else if(event.kind==='lost-child')drawLostChildStory(c,event,ms,scene);
 else if(event.kind==='flat-interview')drawFlatInterviewStory(c,event,ms,scene);
 else if(event.kind==='youth-lesson')drawYouthLessonStory(c,event,ms,scene);
 else if(event.kind==='concession-cut')drawConcessionCutStory(c,event,ms,scene);
 box(0,0,900,7,'#0a2639');box(0,453,900,7,'#0a2639');
 c.restore();return true;
}

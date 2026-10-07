// A player who stayed on the bench discovers that the stands remember them.
function drawBenchSongStory(c,event,ms,scene){
 const {phase,u,actor,colors,lerp,ease,box,line,text,bubble,player,fan,plaque}=scene;
 const name=String(event.player||actor.name||'선수'),friends=event.companions||[];
 const song=phase>0;

 // The railing separates the remaining spectators from the players' exit route.
 sceneImage(c,3,0,-144,900,675);
 box(0,0,900,460,'#143e4d44');
 box(0,120,478,164,'#516c77');
 for(let row=0;row<3;row++){
  box(0,136+row*43,469,9,'#a2a894');
  for(let col=0;col<8;col++){
   box(12+col*57,149+row*43,42,18,row%2?'#597d83':'#467184');
   box(14+col*57,149+row*43,38,3,'#aac0aa44');
  }
 }
 box(0,285,900,175,'#a99a73');
 box(0,285,900,15,'#7c8962');
 for(let i=0;i<8;i++)line(i*145-80,460,i*103+31,302,'#796e5e38',2);
 // The entrance remains visible in every shot, so the interrupted exit is clear.
 box(714,105,186,311,'#526a70');
 box(733,142,167,274,'#172e3d');
 box(747,161,153,255,'#071b2b');
 for(let i=0;i<4;i++)box(746+i*37,385-i*8,37,31+i*8,'#193442');
 box(703,105,197,20,'#b3b7a0');
 plaque('선수 퇴장로 →',798,120,192);
 box(23,28,172,35,'#12374ad9');text('경기 종료',109,53,23,'#efdfb2');

 // Even in old saves, two anonymous teammates establish a group leaving the field.
 const teammate=(x,y,index,walking)=>{
  if(friends[index])return player(x,y,walking?'walk':song?'cheer':'idle',135,song,friends[index]);
  const step=walking?Math.sin(ms*.015+index)*3:0;
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(3.5,3.5);
  box(-8,0,16,2,'#06212b44');
  box(-6,-14,5,14+step,'#ece9d6');box(1,-14,5,14-step,'#ece9d6');
  box(-7,-2+step,7,3,'#253447');box(1,-2-step,7,3,'#253447');
  box(-8,-28,16,16,colors);box(-2,-26,3,13,'#f7edd5');
  box(-6,-39,12,12,'#efc29e');box(-8,-41,16,7,colors);
  box(5,-36,7,3,colors);box(3,-32,2,2,'#293845');
  box(-11,song?-29:-27,3,song?11:13+step,'#efc29e');
  box(9,song?-31:-27,3,song?12:13-step,'#efc29e');
  c.restore();
 };
 teammate(phase===0?lerp(743,810,ease(u)):810,389,1,phase===0);
 teammate(phase===0?lerp(646,718,ease(u)):718,402,0,phase===0);

 // Front-row fans rise together at the first note; their arms keep the rhythm.
 for(let i=0;i<6;i++){
  const rise=song?Math.min((ms-2200)/260,1)*8:0;
  fan(48+i*74,278-rise,i,song);
 }
 box(0,282,488,12,'#d8caa0');box(0,294,488,5,'#566e70');
 for(let i=0;i<8;i++)box(14+i*66,298,6,29,'#617779');
 if(song){
  // A scarf and visible music notes convey a song even without audio.
  box(42,161,388,32,colors);box(42,161,388,3,'#f5df9c');
  text(name+'! 함께 기다릴게!',236,185,22,'#fff5d4');
  for(let i=0;i<5;i++){
   const bounce=Math.sin(ms*.004+i*.8)*8;
   text(i%2?'♫':'♪',56+i*83,139+bounce,27,'#ffe297');
  }
 }

 const x=phase===0?lerp(450,586,ease(u)):
  phase===1?lerp(586,605,ease(Math.min(u*3.3,1))):
  phase===2?lerp(605,568,ease(u)):lerp(568,543,ease(Math.min(u*2,1)));
 const feet=431;
 if(phase<3){
  const pose=phase===0?'walk':phase===1?'surprised':u<.3?'idle':'cheer';
  const face=player(x,feet,pose,185,phase===2);
  if(phase===0){
   bubble('수고했어. 들어가자!',667,207);
   // The actor trails the group: there was no turn at bat today.
   text('터벅…',x-29,451,17,'#514e45');
  }else if(phase===1){
   text('!',face.x+face.width*.68,face.y-face.height*.65,31,'#ffe2a1');
   bubble('어… 내 이름?',600,174);
  }else{
   bubble('오늘 못 뛰었어도, 우린 응원해!',249,81);
   bubble('내 응원가잖아…',606,195);
  }
 }else{
  // A slight bow and tears are both anchored to the actual sprite face.
  // The same transform draws the player and the tears for every body shape.
  const bow=ease(Math.min(u*2.4,1))*.085;
  c.save();c.translate(Math.round(x),feet);c.rotate(-bow);
  const face=player(0,0,'sad',205,true);
  for(const side of [-1,1]){
   const tx=face.x+face.width*.19*side,ty=face.y+face.height*.015;
   box(tx,ty,4,Math.max(7,face.height*.15),'#a2eaff');
   const drop=((ms-7400)/53+(side+1)*4)%15;
   box(tx-1,ty+face.height*.1+drop,5,7,'#8dd9fa');
   box(tx,ty+face.height*.1+drop,2,3,'#e7fbff');
  }
  c.restore();
  bubble('기다려 줘서… 정말 고마워요.',565,177);
  text('언제나 네 편이야!',239,90,25,'#fff0bc');
  // Teammates have stopped by the doorway to watch the small thank-you.
  text('♥',731,239+Math.sin(ms*.003)*3,21,'#efb2a1');
 }
}

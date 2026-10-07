// A four-cut baseball-club lesson: greeting, grip/stance, soft toss, high five.
function drawYouthLessonStory(c,event,ms,scene){
 const {phase,u,lerp,ease,box,line,text,bubble,player,npc,ball,floor,plaque}=scene;
 const part=(a,b)=>ease((u-a)/(b-a));
 sceneImage(c,2,0,-119,900,675);box(0,0,900,460,'#296b4233');
 // A low training fence, dirt diamond and equipment make this a practice
 // field shared with the youth team, rather than a stadium spectator scene.
 box(0,251,900,13,'#517669');
 for(let i=0;i<11;i++)box(15+i*88,235,5,69,'#789083');
 line(0,274,900,274,'#688a7588',2);
 floor('#b6986b');
 line(18,421,509,307,'#f0dfb8',4);line(509,307,880,402,'#f0dfb8',4);
 line(460,384,514,374,'#f8e8c3',3);line(460,384,471,435,'#f8e8c3',3);
 line(471,435,525,425,'#f8e8c3',3);line(525,425,514,374,'#f8e8c3',3);
 box(543,403,22,9,'#fff1cf');box(547,412,14,5,'#fff1cf');
 plaque('유소년 야구부 · 함께하는 연습',589,63,457);
 // Ball basket and spare bats remain in the same place throughout all cuts.
 box(143,365,71,46,'#365b66');box(137,358,83,10,'#4b7680');
 for(let j=0;j<3;j++)for(let i=0;i<4;i++)ball(153+i*15,370+j*11,4);
 line(237,413,222,343,'#a9723b',8);line(251,413,242,347,'#c58b49',8);
 box(216,411,49,6,'#826348');

 // Four children stay identifiable by uniform number. Three wait safely
 // behind the batter while watching; they join the final celebration.
 for(let i=0;i<3;i++){
  const x=646+i*78,jump=phase===3?Math.max(0,Math.sin(ms*.008+i))*(i===1?5:3):0;
  npc(x,407-i%2*13-jump,'youth',phase===0||phase===3?'cheer':'idle',i+2);
  if(phase<2){line(x-28,406-i%2*13,x-36,361-i%2*13,'#be8545',6);}
 }

 if(phase===0){
  player(lerp(292,344,ease(u)),419,u<.94?'walk':'idle',189);
  npc(500,419,'youth','cheer',1);
  bubble('오늘은 같이 공을 쳐 볼까?',363,160);
  bubble('네! 가르쳐 주세요!',680,250);
 }else if(phase===1){
  // First model the grip with the player's actual bat sprite, then point out
  // the child's planted feet. Both coach and child face the same practice area.
  player(344,419,u<.5?'bat':'teach',189);
  npc(500,419,'youth','bat',1);
  const glow=.65+Math.sin(ms*.006)*.18;
  c.save();c.globalAlpha=glow;
  box(480,425,15,5,'#ffdf80');box(503,425,15,5,'#ffdf80');
  line(480,436,518,436,'#ffe7a2',3);
  line(480,431,480,441,'#ffe7a2',3);line(518,431,518,441,'#ffe7a2',3);
  // Two hands around the bat grip, highlighted without replacing the child.
  box(514,363,7,7,'#efc49f');box(521,358,7,7,'#efc49f');
  line(535,358,546,348,'#ffe7a2',3);line(535,368,549,368,'#ffe7a2',3);
  c.restore();
  bubble(u<.5?'두 손은 붙여 잡고…':'발은 어깨너비. 공을 끝까지 보자!',431,172);
  if(u>=.5){text('↓',481,400,22,'#fff0ad');text('↓',516,400,22,'#fff0ad');}
  bubble('이렇게요?',672,259);
 }else if(phase===2){
  const hit=u>=.46;
  const coach=player(344,419,'teach',189);
  npc(500,419,'youth',hit?'swing':'bat',1);
  // A slow underhand toss travels from the coach's hand to the bat. After
  // contact it heads out into the field; a short trail makes its direction clear.
  const tossPoint=v=>({x:lerp(coach.hand.x,552,v),y:lerp(coach.hand.y,372,v)-Math.sin(v*Math.PI)*43});
  const hitPoint=v=>({x:lerp(552,867,v),y:lerp(372,222,v)-Math.sin(v*Math.PI)*47});
  const progress=hit?(u-.46)/.54:u/.46,point=hit?hitPoint:tossPoint;
  for(let i=3;i>0;i--){
   const v=Math.max(0,progress-i*.035),v2=Math.max(0,progress-(i-1)*.035),a=point(v),b=point(v2);
   line(a.x,a.y,b.x,b.y,i===1?'#fff0be':'#f4daa377',i===1?4:3);
  }
  const p=point(progress);ball(p.x,p.y,hit?6:7);
  if(u>.44&&u<.65){
   for(let i=0;i<4;i++){
    const a=i*Math.PI/2+.4;
    line(552+Math.cos(a)*11,371+Math.sin(a)*11,552+Math.cos(a)*23,371+Math.sin(a)*23,'#fff1a1',4);
   }
   text('딱!',574,334,25,'#fff2bd');
  }
  bubble(hit?'맞았다! 공이 날아간다!':'하나, 둘… 공을 보자!',hit?662:401,177);
 }else{
  const close=part(0,.35),px=lerp(344,387,close),cx=lerp(500,467,close);
  const coach=player(px,419,u<.2?'walk':'teach',189);
  const childX=lerp(cx,coach.hand.x+27,close),childY=lerp(419,clamp(coach.hand.y+78,380,445),close);
  npc(childX,childY,'youth','cheer',1);
  if(u>.18){
   // Bring the child's raised hand to the coach's real hand, without drawing
   // an extra arm over the player's body or changing their skin colour.
   const hx=coach.hand.x,hy=coach.hand.y;
   for(let i=0;i<4;i++){
    const a=i*Math.PI/2+.35;
    line(hx+Math.cos(a)*13,hy+Math.sin(a)*13,hx+Math.cos(a)*20,hy+Math.sin(a)*20,'#ffe49a',3);
   }
   text('짝!',hx,hy-25,22,'#fff1c3');
  }
  bubble('잘했어! 지금 그 자세야.',438,165);
  bubble('나도 해 볼래요!',724,249);
  for(let i=0;i<3;i++)text('✦',648+i*79,282-(i%2)*14,19,'#ffe09a');
 }
}

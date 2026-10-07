// A fan's greeting is left unanswered on the way to the team bus.
function drawIgnoreStory(c,event,ms,scene){
 const {phase,u,colors,lerp,ease,box,line,text,bubble,player,fan,npc,plaque}=scene;
 box(0,0,900,460,'#c8d6c9');box(0,0,900,30,'#557a7c');
 box(0,261,900,199,'#afaca0');box(0,267,900,15,'#d0c6a8');
 for(let i=0;i<5;i++)line(0,304+i*35,900,304+i*35,'#8a8e8155',2);
 // Team-only exit to the left; waiting fans stand on the other side of a low barrier.
 box(38,87,208,195,'#8fa59b');box(54,103,176,179,'#284652');
 box(64,112,156,170,'#173a45');box(71,262,143,9,'#7a9386');
 box(58,271,168,13,'#b0b8a0');plaque('선수 출구',142,80,220);
 box(276,135,149,51,'#78938a');text('선수 버스 →',351,167,19,'#eff0d7');

 // Windows, destination board, door and wheels make the bus legible at a glance.
 box(501,107,382,28,'#2a4654');box(488,135,401,161,colors);
 box(496,146,284,75,'#163e50');
 for(let i=0;i<4;i++){
  box(506+i*67,154,56,58,'#77a9ad');box(510+i*67,158,48,14,'#9ac1ba');
  box(519+i*67,180,21,25,'#567b82');
 }
 box(497,226,382,9,'#ece0b6');box(501,242,268,7,'#ffffff35');
 box(526,279,47,41,'#1b303d');box(536,289,27,21,'#7d8d8d');
 box(825,279,47,41,'#1b303d');box(835,289,27,21,'#7d8d8d');
 box(790,141,72,157,'#153545');box(798,151,56,71,'#5c919c');
 box(798,226,56,72,'#172c3b');box(798,275,56,9,'#91a3a0');
 box(797,286,58,9,'#b4bda8');box(794,298,63,8,'#d1c9ab');
 box(616,111,166,28,'#173649');text('구단 버스',699,132,19,'#efe9cc');
 box(880,219,7,18,'#f2d796');

 const px=phase===0?lerp(281,361,ease(u)):phase===1?lerp(361,389,ease(u)):phase===2?lerp(389,640,ease(u)):lerp(640,785,ease(u));
 const py=phase===3?lerp(343,326,ease(u)):343;
 // Walking continues past the fans with no answering wave or acknowledgement.
 player(px,py,phase===1?'idle':'walk',184,phase===1&&u<.35);
 if(phase>=2&&u<.25)text('…',px+48,173,22,'#45646c');

 fan(112,423,1,false);npc(370,428,'child','idle');
 // A separately drawn fan can lower the same arm, instead of swapping to a crying pose.
 const fx=242,fy=425,skin='#edc29a';
 box(fx-28,fy-4,56,7,'#344b4955');
 box(fx-17,fy-37,13,37,'#385465');box(fx+6,fy-37,13,37,'#385465');
 box(fx-20,fy-75,42,41,colors);box(fx-7,fy-75,14,43,'#e9ddbb');
 box(fx-20,fy-116,41,39,skin);box(fx-23,fy-123,47,14,'#4e4049');
 box(fx-22,fy-117,8,32,'#4e4049');box(fx+16,fy-117,8,32,'#4e4049');
 box(fx-14,fy-103,5,5,'#334653');box(fx+8,fy-103,5,5,'#334653');
 box(fx-4,fy-87,12,phase===3?2:4,phase===3?'#9b6b58':'#c67d64');
 box(fx-22,fy-131,46,9,'#eadbb1');box(fx+7,fy-124,25,6,'#eadbb1');
 line(fx-22,fy-66,fx-31,fy-33,skin,9);
 let raised=phase===0?0:phase===1?ease(Math.min(u*3,1)):phase===2?1-.26*ease(u):.74*(1-ease(u));
 const wave=(phase===1||phase===2&&u<.45)?Math.sin(ms*.014)*5:0;
 const handX=fx+43+wave*raised,handY=lerp(fy-34,fy-135,raised);
 line(fx+22,fy-65,fx+35,lerp(fy-48,fy-89,raised),skin,9);
 line(fx+35,lerp(fy-48,fy-89,raised),handX,handY,skin,9);
 box(handX-5,handY-9,11,13,skin);
 // Keep the rope in front of the waiting group, and out of the player's walking lane.
 for(const x of [62,181,415,462]){box(x,369,7,74,'#63787b');box(x-6,438,19,7,'#496469');box(x-2,365,11,8,'#9aab9c');}
 line(66,378,464,378,'#af8066',6);line(66,383,464,383,'#cfaa84',3);
 box(79,392,90,23,'#efe1ba');text('팬 대기',124,409,15,'#576359');

 if(phase===0){
  bubble('선수들 나온다!',221,218);
 }else if(phase===1){
  bubble('오늘도 수고하셨어요!',230,217);
 }else if(phase===2){
  if(u>.23)bubble('…?',250,222,true);
 }else{
  bubble('인사만 해 줘도 좋았을 텐데…',256,216,true);
  text('…',373,302,22,'#775c4e');
 }
}

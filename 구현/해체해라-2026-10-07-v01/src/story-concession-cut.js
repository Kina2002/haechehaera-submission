// The queue and the shortcut occupy separate lanes; the rule-breaking reads in motion.
function drawConcessionCutStory(c,event,ms,scene){
 const {phase,u,actor,lerp,ease,box,line,text,bubble,player,fan,npc,plaque}=scene;
 const skin=typeof SKINS!=='undefined'?(SKINS[actor.appearance?.skin??0]||'#efc49f'):'#efc49f';
 box(0,0,900,460,'#c3d0c5');
 box(0,0,900,32,'#5e7d79');box(0,32,900,7,'#91a398');
 box(0,238,900,222,'#b9a787');box(0,238,900,10,'#8f977e');
 for(let row=0;row<5;row++)line(0,273+row*40,900,273+row*40,'#98897555',2);
 for(let col=0;col<9;col++)line(col*128-80,460,col*87+96,248,'#98897544',2);
 // Windows and a passage sign establish the stadium concourse behind the queue.
 box(35,78,244,94,'#7f9891');box(43,86,228,76,'#486d73');
 for(let i=0;i<4;i++){box(51+i*57,106,40,46,'#678d88');box(51+i*57,109,40,4,'#b2c7ad');}
 box(157,85,5,78,'#c7c9af');
 plaque('관람석 통로',120,65,189);

 // Bright awning, visible food shelf and a clerk behind a real counter.
 box(634,92,249,285,'#e5cc9d');box(648,137,222,153,'#264957');
 for(let i=0;i<8;i++){
  box(627+i*33,90,33,36,i%2?'#f0dec0':'#bb7054');
  box(627+i*33,123,33,8,i%2?'#dccca9':'#a7614c');
 }
 plaque('구장 매점',758,84,270);
 box(660,154,74,79,'#f0dfb8');text('음료',697,182,20,'#654c3f');text('간식',697,214,20,'#654c3f');
 npc(804,303,'reporter','idle');
 // Apron and cap make this supporting figure a concession clerk.
 box(779,227,51,52,'#e8dcc0');box(792,221,26,9,'#e8dcc0');box(774,169,59,12,'#e8dcc0');
 box(641,286,245,16,'#88684c');box(650,302,233,74,'#c9a879');
 box(665,317,203,42,'#b49364');text('주문 · 받는 곳',766,345,20,'#4a503f');
 for(let i=0;i<3;i++){box(842+i*11,261,8,23,'#e5b054');box(840+i*11,258,12,5,'#f7e7c3');}

 // The official queue reaches the counter from the left. Its front stays visible.
 line(65,444,600,444,'#efe0ae',4);line(600,444,584,435,'#efe0ae',4);line(600,444,584,453,'#efe0ae',4);
 text('대기 줄',201,434,18,'#635c49');
 box(522,383,7,50,'#617778');box(510,380,32,6,'#617778');box(516,428,19,5,'#435d64');
 box(508,351,36,27,'#f0dfb5');text('앞',526,372,18,'#4c5b56');

 let px,py;
 if(phase===0){px=lerp(128,190,ease(u));py=253;}
 else if(phase===1){
  // Pass behind the waiting fans, then turn into the ordering space beyond them.
  const across=Math.min(u/.68,1),turn=Math.max((u-.68)/.32,0);
  px=lerp(190,590,ease(across))+lerp(0,15,ease(turn));py=lerp(253,410,ease(turn));
 }else if(phase===2){px=605;py=410;}
 else{px=lerp(605,734,ease(u));py=lerp(410,435,ease(u));}
 const height=phase<2?lerp(167,185,phase===1?Math.max((u-.68)/.32,0):0):185;
 const face=player(px,py,phase===2?'teach':'walk',height);
 // Four quiet customers remain in order. They do not turn into a cheering crowd.
 fan(91,415,1,false);npc(204,420,'mother','idle');fan(321,416,2,false);npc(435,414,'reporter','idle');

 const cup=(x,y)=>{
  box(x-9,y-28,18,27,'#eabe66');box(x-7,y-25,5,19,'#f5d999');
  box(x-11,y-32,22,5,'#faf0d1');box(x+3,y-44,3,13,'#9a5a55');
  box(x-7,y-2,14,3,'#ae8753');
 };
 if(phase===2||phase===3){
  // Cup and holding arm follow the actual head/body scale, including wide bodies.
  const hx=face.x+face.width*.73,hy=face.y+face.height*1.1;
  const take=phase===3?1:ease(Math.max((u-.38)/.48,0));
  if(take>0){
   line(face.x+face.width*.35,face.y+face.height*.77,hx-12,hy-15,skin,8);
   box(hx-15,hy-18,8,8,skin);
  }
  cup(lerp(676,hx,take),lerp(286,hy,take));
 }
 if(phase===0){
  bubble('다음 손님, 주문 도와드릴게요!',684,155);
 }else if(phase===1){
  bubble('잠깐만요. 저 먼저요.',343,67,true);
  if(u>.68)text('?',437,264,25,'#735748');
 }else if(phase===2){
  bubble('음료 하나 주세요.',615,172,true);
  bubble('저희가 먼저 기다렸는데요…',274,225,true);
  text('!?',432,266,25,'#886452');text('…',205,247,23,'#886452');
 }else{
  bubble('줄은 뒤에서 서 주셨으면…',291,224,true);
  text('…',435,261,27,'#765b4c');text('…',321,296,25,'#765b4c');
 }
}

// One last autograph after the concourse has grown quiet.
function drawAutographStory(c,event,ms,scene){
 const {phase,u,actor,colors,lerp,ease,box,line,text,bubble,player,npc,plaque}=scene;
 const skin=typeof SKINS!=='undefined'?(SKINS[actor.appearance?.skin??0]||'#efc49f'):'#efc49f';
 sceneImage(c,0,0,-141,900,675);box(0,0,900,460,'#172b55a6');
 box(0,302,900,158,'#66716d');
 for(let i=0;i<5;i++)line(0,324+i*30,900,324+i*30,'#34495455',2);
 for(let i=0;i<7;i++)line(i*157-55,460,i*92+160,303,'#34495444',2);

 // A small lit canopy remains open after the rest of the event has emptied out.
 box(166,114,461,211,'#204551');box(173,119,447,205,'#2a5259');
 box(153,67,485,48,colors);box(153,111,485,11,'#d6ba88');
 box(166,116,11,297,'#b39e7d');box(615,116,11,297,'#b39e7d');
 plaque('팬 사인회',394,97,215);
 for(let i=0;i<7;i++){
  box(187+i*65,127,4,11,'#233c45');
  box(184+i*65,137,10,10,'#efd697');box(187+i*65,139,4,6,'#fff2c6');
 }
 // Empty waiting lanes and a wall clock carry the late-evening context.
 for(const x of [704,819]){box(x-3,286,6,99,'#768988');box(x-12,380,24,6,'#4b6267');box(x-6,282,12,10,'#a9b3a2');}
 line(710,305,813,305,'#9ca497',5);
 box(689,204,72,49,'#aeb9a1');box(695,210,60,37,'#263e48');
 text('대기',725,235,20,'#d8dfb9');
 box(541,166,50,50,'#d1c6a5');box(547,172,38,38,'#203e4d');
 line(566,191,555,187,'#ead6a2',3);line(566,191,566,177,'#ead6a2',3);
 box(559,187,4,4,'#f6e6bb');
 // The chair is behind the actor; the table hides the standing sprite's legs.
 box(403,274,106,113,'#243d47');box(411,282,90,63,'#637a72');
 const face=player(454,417,'idle',216);
 const tableY=Math.max(307,Math.min(341,face.y+face.height*1.2));
 const ballX=face.x+face.width*.75,ballY=tableY-12;
 const handoffX=Math.max(558,face.x+face.width*1.32),handoffY=Math.max(328,tableY-6);
 const nearFan=handoffX+42;
 const fx=phase===0?lerp(813,672,ease(u)):phase===1?672:
  phase===2?lerp(672,nearFan,ease(Math.min(u*1.8,1))):lerp(nearFan,nearFan+39,ease(u));

 // The desk surface supports the baseball, marker and the player's forearms.
 box(230,tableY+8,360,17,'#bea170');box(241,tableY+25,338,77,'#e0ce9d');
 box(246,tableY+102,11,10,'#344d50');box(563,tableY+102,11,10,'#344d50');
 box(257,tableY+43,306,49,colors);text('마지막 팬까지',410,tableY+75,24,'#fff0d2');
 box(265,tableY-5,82,11,'#dce0cc');box(274,tableY-10,69,5,'#f4ead0');
 box(271,tableY-4,56,2,'#98aaa2');
 box(348,tableY-8,49,14,'#eddba7');text(event.player||actor.name||'선수',373,tableY+2,12,'#345058');

 const signedBall=(x,y,signed=1)=>{
  box(x-9,y-12,18,24,'#f6eed2');box(x-12,y-8,24,16,'#f6eed2');
  box(x-8,y-8,2,5,'#cf8170');box(x-8,y+3,2,5,'#cf8170');
  box(x+6,y-8,2,5,'#cf8170');box(x+6,y+3,2,5,'#cf8170');
  if(signed>0){
   line(x-5,y+2,x-2,y-3,'#305264',2);
   if(signed>.35)line(x-2,y-3,x+1,y+2,'#305264',2);
   if(signed>.65)line(x+1,y+2,x+6,y-1,'#305264',2);
  }
 };
 // Fan and any held ball share a transform, including the final grateful bow.
 c.save();c.translate(Math.round(fx),420);
 if(phase===3)c.rotate(-ease(Math.min(u*2,1))*.075);
 npc(0,0,'reporter',phase===0?'walk':'idle');
 box(-25,-77,49,7,colors);box(15,-70,9,30,colors);
 if(phase===0){line(-26,-68,-33,-56,'#efc49f',7);signedBall(-36,-54,0);}
 if(phase===3){
  line(-27,-75,-18,-69,'#efc49f',7);line(25,-75,-7,-63,'#efc49f',7);
  signedBall(-16,-67,1);
 }
 c.restore();

 if(phase===1){
  // The marker visibly moves across the ball, rather than using a static pose.
  const writing=ease(Math.min(u/0.8,1));
  line(face.x+face.width*.29,face.y+face.height*.77,ballX+18,tableY-26,skin,8);
  box(ballX+14,tableY-30,9,9,skin);
  signedBall(ballX,ballY,writing);
  const tipX=ballX+Math.sin(ms*.027)*4,tipY=ballY+Math.sin(ms*.039)*2;
  line(ballX+20,tableY-28,tipX,tipY,'#243e4c',4);box(tipX-1,tipY-1,3,3,'#162e3d');
  text('사각사각…',ballX+45,tableY-53,17,'#d9ddc5');
 }else if(phase===2){
  const give=ease(Math.min(u/0.72,1));
  const bx=lerp(ballX,handoffX,give),by=lerp(ballY,handoffY,give);
  line(face.x+face.width*.29,face.y+face.height*.8,bx-10,by+5,skin,8);
  box(bx-13,by+1,10,8,skin);
  // A receiving hand reaches the same ball before the next cut shows it held.
  if(u>.25){
   const reach=ease(Math.min((u-.25)/.4,1));
   line(fx-26,347,lerp(fx-33,bx+10,reach),lerp(360,by+5,reach),'#efc49f',7);
  }
  signedBall(bx,by,1);
 }else if(phase===3){
  box(ballX+7,tableY-5,31,4,'#304854');
  line(face.x+face.width*.34,face.y+face.height*.8,face.x+face.width*.8,face.y+face.height*.35,skin,8);
  box(face.x+face.width*.8-4,face.y+face.height*.35-8,9,12,skin);
 }

 if(phase===0){
  bubble('늦었는데… 사인 받을 수 있을까요?',683,159);
  bubble('물론이죠. 공 이리 주세요!',365,226);
 }else if(phase===1){
  bubble('이름도 적어 드릴게요.',409,178);
  bubble('정말요? 감사합니다!',701,245);
 }else if(phase===2){
  bubble('오래 기다려 줘서 고마워요.',386,185);
  bubble('정말 소중히 간직할게요!',699,248);
 }else{
  bubble('끝까지 남아 주셔서 감사해요!',681,203);
  bubble('조심히 가요. 다음 경기에도 만나요!',341,161);
  text('♥',fx+38,290+Math.sin(ms*.004)*3,22,'#eab69b');
 }
}

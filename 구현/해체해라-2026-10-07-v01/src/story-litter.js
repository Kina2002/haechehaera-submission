// A drink becomes litter beside a clearly visible bin. Drawing never changes the event.
function drawLitterStory(c,event,ms,scene){
 const {phase,u,actor,colors,lerp,ease,box,line,text,bubble,player,fan,npc,plaque}=scene;
 const skin=typeof SKINS!=='undefined'?(SKINS[actor.appearance?.skin??0]||'#efc49f'):'#efc49f';
 const part=(start,length)=>ease(Math.max(0,Math.min(1,(u-start)/length)));
 box(0,0,900,460,'#c9d3c4');box(0,0,900,31,'#547577');
 box(0,31,900,8,'#96aa9c');box(0,268,900,192,'#c3b398');
 for(let i=0;i<5;i++)line(0,300+i*37,900,300+i*37,'#968e7855',2);
 for(let i=0;i<9;i++)line(i*119-80,460,i*86+101,274,'#968e7844',2);

 // Stadium exit and paving establish the place without a generic stage backdrop.
 box(46,83,250,219,'#97aaa1');box(62,100,218,202,'#284753');
 box(77,112,188,191,'#163743');box(164,111,7,190,'#7f9c98');
 box(78,258,187,14,'#84978b');box(71,272,201,14,'#a6afa0');
 box(63,286,217,17,'#b9bdab');plaque('구장 출구',170,77,250);
 box(326,114,176,91,'#547778');box(337,125,154,68,'#7c9c8d');
 for(let i=0;i<4;i++)box(345+i*38,137,25,44,'#506f69');
 box(374,124,5,68,'#b2bda8');box(451,124,5,68,'#b2bda8');
 text('경기 종료 후',743,74,21,'#375b60');

 // The opening and the word on the bin remain visible throughout all four shots.
 box(548,272,80,115,'#315d62');box(554,282,68,105,'#438078');
 box(541,268,94,16,'#25545b');box(551,259,75,11,'#669287');
 box(560,283,56,13,'#153840');box(569,284,38,5,'#092931');
 box(558,311,60,41,'#c6d6b3');text('쓰레기통',588,338,17,'#345b57');
 box(560,374,58,12,'#315d62');box(544,387,90,6,'#52695255');

 let px=phase===0?lerp(302,386,ease(u)):phase===1?386:phase===2?lerp(386,541,ease(u)):lerp(541,948,ease(u));
 const face=player(px,416,phase===0||phase>=2?'walk':'idle',195);
 // Scale the forearm and cup positions from the actual player's face, not fixed body pixels.
 const hand={x:face.x+face.width*.76,y:face.y+face.height*1.04};
 const mouth={x:face.x+face.width*.47,y:face.y+face.height*.19};
 const cup=(x,y,angle)=>{
  c.save();c.translate(Math.round(x),Math.round(y));c.rotate(angle);
  box(-10,-13,20,26,'#e8b865');box(-7,-9,5,17,'#f8d995');
  box(-12,-17,24,5,'#fcf0cf');box(3,-29,3,13,'#b36458');
  box(-6,11,12,3,'#ae8454');c.restore();
 };
 if(phase===0){
  // Lift to the mouth, sip, and lower before the next cut.
  const sip=Math.sin(Math.PI*u),hx=lerp(hand.x,mouth.x,sip),hy=lerp(hand.y,mouth.y,sip);
  line(face.x+face.width*.34,face.y+face.height*.77,hx-12,hy+7,skin,9);
  box(hx-17,hy+2,9,10,skin);cup(hx,hy,-sip*.16);
  if(u>.33&&u<.8)text('후…',face.x-face.width*.85,face.y,17,'#45636a');
 }else if(phase===1){
  const fall=part(.24,.76),cx=u<.24?lerp(hand.x,hand.x+15,part(0,.24)):lerp(hand.x+15,511,fall),cy=lerp(hand.y,419,fall)-Math.sin(fall*Math.PI)*34;
  const reach=part(0,.25),hx=hand.x+reach*15;
  line(face.x+face.width*.34,face.y+face.height*.77,hx-11,hand.y+6,skin,9);
  if(u<.24)box(hx-15,hand.y+1,8,10,skin);
  cup(cx,cy,fall*1.4);
  if(u>.27&&u<.72)text('툭',cx+25,cy-23,21,'#795844');
  if(u>.72)text('?',748,237,24,'#715748');
 }else{
  const roll=phase===2?ease(u):1,cx=lerp(511,660,roll),cy=419-(phase===2?Math.abs(Math.sin(u*Math.PI*3))*3:0);
  box(cx-21,430,42,4,'#7c73595c');cup(cx,cy,1.4+roll*Math.PI*2);
  if(phase===2){
   text('데굴…',cx-7,395,19,'#78614a');
   if(u>.35)text('…',750,238,28,'#775849');
  }else{
   bubble('쓰레기통이 바로 옆인데…',716,183,true);
   text('…',831,281,25,'#775849');
  }
 }
 // Fans are in the foreground; the departing player passes behind them.
 npc(748,421,'mother','idle');fan(830,422,2,false);
}

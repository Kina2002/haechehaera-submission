// A donation is handed over at a youth-support event, then shared with fans.
// This renderer only draws; the existing event handler owns its rewards.
function drawDonationStory(c,event,ms,scene){
 const {phase,u,actor,lerp,ease,box,line,text,bubble,player,fan,npc,ball,floor,plaque}=scene;
 const skin=typeof SKINS!=='undefined'?(SKINS[actor.appearance?.skin??0]||'#efc49f'):'#efc49f';
 const part=(a,b)=>ease((u-a)/(b-a));
 const envelope=(x,y)=>{
  box(x-36,y-21,72,43,'#976e4b');box(x-33,y-18,66,37,'#fff0cc');
  line(x-31,y-17,x,y+1,'#d0ad76',2);line(x,y+1,x+31,y-17,'#d0ad76',2);
  box(x-25,y+1,50,15,'#f8e3b3');text('기부금',x,y+13,13,'#80553d');
 };
 // The envelope follows the recorded player's own face landmarks, not an
 // assumed head position: short, tall and broad bodies keep a usable grip.
 const carryingPoint=face=>({x:face.x+face.width*.55+21,y:face.y+face.height*.77+26});

 if(phase===3){
  // Cut to the club noticeboard: the player's small portrait is explicitly a
  // photograph of the handover, while the two fans read the published news.
  box(0,0,900,460,'#b7cfc5');box(0,0,900,75,'#486c69');floor('#b6a183');
  box(74,90,559,319,'#6e543e');box(86,102,535,295,'#e7d5b0');
  box(99,116,509,47,'#244f59');text('구단 소식 · 따뜻한 나눔',354,148,25,'#fff0cd');
  box(108,175,259,201,'#567c70');box(117,184,241,183,'#c8d7bd');
  box(124,193,227,27,'#6b9483');text('유소년 지원 전달식',238,213,15,'#fff0d0');
  box(117,327,241,40,'#b79b72');
  const photoFace=player(198,347,'idle',119);
  c.save();c.translate(290,347);c.scale(.74,.74);npc(0,0,'reporter');c.restore();
  const hand=carryingPoint(photoFace);
  c.save();c.translate(lerp(hand.x+9,252,.5),296);c.scale(.65,.65);envelope(0,0);c.restore();
  box(376,181,224,28,'#f5e7c6');text('야구 꿈을 응원합니다',487,201,18,'#34535a');
  text('선수가 전한 기부금,',486,238,18,'#554a40');
  text('아이들의 새 연습에',486,268,18,'#554a40');
  text('힘이 되었습니다.',486,298,18,'#554a40');
  box(396,322,183,4,'#b5a27f');box(396,337,162,4,'#c1ad89');box(396,352,174,4,'#c1ad89');
  fan(700,418,1,true);fan(809,420,3,true);
  bubble('우리 선수, 마음도 멋지네!',680,204);
  if(u>.28)text('♥',749,286-Math.sin(ms*.004)*5,29,'#d47675');
  return;
 }

 // A small community support hall, with youth equipment and a real handover
 // space. The coordinator is distinct from the blue-and-white youth players.
 box(0,0,900,460,'#d9dbc2');box(0,0,900,79,'#476e69');
 box(39,99,147,190,'#62857d');box(50,110,125,177,'#3a615c');
 box(61,120,102,132,'#809d8e');box(151,206,6,6,'#e6c887');
 box(723,98,130,173,'#749991');box(734,110,108,149,'#d6e4cc');
 box(784,110,7,149,'#749991');box(734,174,108,6,'#749991');
 plaque('지역 유소년 야구 지원 전달식',473,66,513);
 box(222,101,453,88,'#f0e5c8');
 text('아이들의 야구 꿈을 함께 응원합니다',448,138,22,'#406963');
 text('지역 야구 나눔 행사',448,169,17,'#737b62');
 floor('#b99d76');
 box(0,294,900,7,'#8e896c');
 // Donated support is represented by baseball supplies, with no invented sum.
 box(54,368,190,14,'#795e42');box(62,382,10,61,'#6a533e');box(226,382,10,61,'#6a533e');
 box(69,327,65,39,'#b77d4d');box(76,333,50,24,'#dba563');text('야구공',101,349,12,'#61472f');
 for(let i=0;i<3;i++)ball(82+i*18,327,6);
 line(160,364,148,302,'#c48e53',8);line(179,364,174,310,'#a97342',8);
 box(192,335,33,30,'#678774');box(198,342,20,15,'#a4b993');

 npc(535,416,'reporter','idle');
 for(let i=0;i<3;i++)npc(648+i*76,420-i%2*8,'youth',phase===2?'cheer':'idle',i+1);

 if(phase===0){
  const px=lerp(273,352,ease(u)),face=player(px,419,u<.93?'walk':'idle',185),hand=carryingPoint(face);
  envelope(hand.x+12,hand.y+3);box(hand.x-24,hand.y+5,9,10,skin);
  bubble('아이들 연습에 보태고 싶어서요.',373,222);
  if(u>.45)bubble('와 주셔서 고맙습니다!',643,272);
 }else if(phase===1){
  const face=player(lerp(352,389,part(0,.25)),419,'teach',185),hand=carryingPoint(face);
  const transfer=part(.18,.83),ex=lerp(hand.x+12,502,transfer),ey=lerp(hand.y+3,347,transfer);
  envelope(ex,ey);
  if(transfer<.86)box(ex-34,ey+4,9,10,skin);
  if(transfer>.3){line(501,342,ex+28,ey+9,'#efc49f',7);box(ex+24,ey+4,9,10,'#efc49f');}
  bubble('필요한 장비와 훈련에 써 주세요.',435,225);
  if(u>.55)text('♥',594,282,24,'#ca7975');
 }else{
  player(389,419,'idle',185);
  envelope(527,348);box(493,353,9,10,'#efc49f');box(552,353,9,10,'#efc49f');
  bubble('마음껏 뛰고, 즐겁게 야구해요.',385,223);
  bubble('감사합니다!',716,282);
  if(u>.35){
   text('♥',647,268-Math.sin(ms*.004)*4,22,'#cf7776');
   text('✦',795,270+Math.sin(ms*.004)*3,23,'#f2c779');
  }
 }
}

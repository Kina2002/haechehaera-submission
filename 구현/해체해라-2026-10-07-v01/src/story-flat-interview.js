// An awkward postgame press conference, drawn with the actual player's sprite.
// The parent owns the canvas save/restore and the four-cut, ten-second timeline.
function drawFlatInterviewStory(c,event,ms,scene){
 const {phase,u,colors,lerp,ease,box,line,text,bubble,player,npc,floor}=scene;
 const at=v=>ease(Math.max(0,Math.min(1,v)));
 const leaving=phase===3,leave=leaving?at((u-.2)/.8):0;
 const away=phase===1?at(u*2):phase===2?1:0;
 const lean=phase===2?at(u*1.8):0;
 const px=leaving?lerp(537,792,leave):520+away*13+lean*17;

 // Sponsor wall, room header and a real exit keep this recognisably an interview room.
 box(0,0,900,460,'#182e45');box(0,0,900,61,'#10273d');
 box(39,69,823,247,'#0e253b');box(47,77,807,231,'#274b64');
 for(let row=0;row<4;row++)for(let col=0;col<7;col++){
  const x=57+col*113,y=87+row*53;
  box(x,y,101,43,(row+col)%2?'#325b70':'#1d3d56');
  box(x+8,y+12,16,16,'#e5dcc6');box(x+11,y+15,10,10,colors);
  line(x+13,y+17,x+19,y+23,'#f0e2c5',2);
  text(col%2?'BASEBALL':'야구단',x+63,y+28,13,'#c4d1cd');
 }
 box(785,94,59,217,'#112438');box(790,101,49,210,'#263d50');
 box(797,138,7,105,'#6a7b81');box(827,216,4,13,'#c1b495');
 box(783,76,63,23,'#618475');text('출구 →',814,93,13,'#f4ecd5');
 text('경기 후 공식 인터뷰',450,40,26,'#f2e7cd');
 floor('#586271');
 box(0,312,900,7,'#33465b');
 for(let i=0;i<6;i++)line(102+i*133,319,20+i*162,460,'#263b5033',2);

 // Chair first, then the upper body, then the desk: legs disappear behind the desk.
 const chairX=leaving?520:520+lean*7;
 box(chairX-53,237,106,164,'#172b3d');box(chairX-45,245,90,92,'#5b6f7a');
 box(chairX-42,251,84,73,'#73848a');box(chairX-50,333,100,12,'#20364b');
 line(chairX-33,345,chairX-43,415,'#263646',6);line(chairX+33,345,chairX+43,415,'#263646',6);
 c.save();
 c.translate(px,leaving?lerp(424,414,at(u*4)):424+(phase===2?Math.sin(u*Math.PI)*-3:0));
 // A small lean away from the microphone reads as disengagement without sad/crying poses.
 c.rotate(leaving?0:(phase===2?.035:phase===1?.014:0));
 player(0,0,leaving&&u>.2?'walk':'idle',214,phase===1||phase===2);
 c.restore();

 box(300,333,456,15,'#d6b67e');box(306,348,444,14,'#876a4d');
 box(312,362,432,85,'#254a62');box(332,375,392,57,'#16384e');
 box(342,384,6,39,colors);
 text('POST GAME INTERVIEW',531,410,21,'#d9ddca');
 // Table microphone, player nameplate, water and the reporters' voice recorder.
 box(423,327,48,6,'#15283a');line(446,326,451,295,'#18283b',5);
 box(441,281,22,17,'#9cb4bd');box(443,283,18,7,'#d3e0dc');
 box(449,298,6,11,'#3f5668');
 box(489,313,129,19,'#b49a72');box(493,310,122,19,'#eee1bc');
 const playerName=Array.from(event.player||'선수').slice(0,8).join('');
 text(playerName,554,324,14,'#294252');
 box(694,296,14,33,'#bfd5d6');box(692,294,18,7,'#8da9b3');
 box(697,305,8,13,'#e3ebd7');box(690,329,22,3,'#9e8560');
 box(360,318,38,12,'#1c3345');box(365,321,18,3,'#789e94');box(387,321,4,4,'#ce7868');

 // Reporter on the left: a raised hand, notebook and moving pen establish a question.
 npc(145,429,'reporter');
 box(102,363,58,38,'#e9dbb9');box(106,367,3,30,'#aa967d');
 for(let i=0;i<3;i++)box(113,373+i*8,30-(i%2)*7,2,'#91a09a');
 const handLift=phase===0?Math.sin(Math.min(u*2,1)*Math.PI/2):phase===2?1:leaving?.7:0;
 line(172,363,186,lerp(349,321,handLift),'#efc49f',7);
 box(182,lerp(344,314,handLift),10,10,'#efc49f');
 line(142,375,153+(phase===1?Math.floor(ms/150)%2*3:0),361,'#26384b',3);
 // A second reporter is seen from behind in the foreground, facing the desk.
 box(219,388,42,69,'#324255');box(225,358,31,35,'#a96f59');
 box(222,353,36,24,'#493849');box(218,396,9,46,'#47576c');box(254,396,9,46,'#47576c');
 box(259,407,25,17,'#e5d3aa');line(263,411,279,411,'#829091',2);

 // The operator and large lens clearly face the player. Tripod stays in the foreground.
 npc(849,442,'reporter');box(833,326,15,38,'#efc49f');
 line(805,336,779,441,'#192c40',6);line(805,336,839,441,'#192c40',6);
 line(805,338,807,441,'#26394a',5);box(791,331,29,8,'#9aa9ad');
 box(776,283,70,46,'#20384b');box(783,277,38,9,'#334b5c');
 box(765,293,12,27,'#122638');box(753,299,13,17,'#0d1e2c');
 box(753,301,3,13,'#729c9f');box(789,294,19,15,'#5e8c95');
 box(817,292,16,4,'#799199');box(817,300,9,3,'#516f7c');
 box(810,309,5,5,leaving&&u>.78?'#748b8e':'#df766b');
 line(837,314,857,325,'#233a4d',5);
 box(53,78,97,29,'#10283b');
 const recording=!(leaving&&u>.78);
 box(65,88,8,8,recording?(Math.floor(ms/450)%2?'#f68b76':'#af4d52'):'#8a9c9a');
 text(recording?'REC':'종료',110,100,17,'#e1e5d4');

 // Speech occupies the empty upper wall, never the player's face or interview equipment.
 if(phase===0){
  bubble('오늘 경기, 어떻게 보셨나요?',232,179);
  if(u>.58)text('…',560,231,25,'#eef0d7');
 }else if(phase===1){
  bubble('그냥… 잘 안 됐네요.',554,145,true);
  if(u>.38)text('…',204,286,26,'#e2c5ae');
 }else if(phase===2){
  bubble('가장 아쉬웠던 장면은요?',221,187);
  if(u>.2)bubble('…다음에 잘해야죠.',566,125,true);
  // A pause in the reporter's pen and the empty space around the mic carry the awkwardness.
  if(u>.55)text('…',372,271,29,'#efcbb1');
 }else{
  bubble('네, 수고하세요.',lerp(558,703,leave),133,true);
  if(u>.23)bubble('아직 질문이 남았는데…',215,201,true);
  if(u>.67)text('…',488,256,30,'#deccb2');
 }
}

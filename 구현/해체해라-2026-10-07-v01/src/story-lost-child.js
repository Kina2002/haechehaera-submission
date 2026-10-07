// A lost child is found in the stadium concourse and reunited with their mother.
// The four cuts use only the recorded actor and deterministic drawing helpers.
function drawLostChildStory(c,event,ms,scene){
 const {phase,u,lerp,ease,box,line,text,bubble,player,npc,floor,plaque}=scene;
 const part=(start,end)=>ease((u-start)/(end-start));

 // Open concourse windows, numbered seating entrance and floor tiles establish
 // an indoor stadium walkway rather than an information-desk waiting scene.
 box(0,0,900,460,'#c8d7ce');
 box(0,0,900,78,'#3a6168');box(0,69,900,12,'#91aaa2');
 box(37,113,284,153,'#5c8581');
 c.save();c.beginPath();c.rect(45,121,268,137);c.clip();
 sceneImage(c,3,-43,-45,414,310);c.restore();
 box(37,111,284,9,'#587d79');box(37,258,284,10,'#587d79');
 box(37,112,8,156,'#587d79');box(313,112,8,156,'#587d79');
 box(125,119,6,141,'#87a097');box(224,119,6,141,'#87a097');
 box(18,269,325,11,'#f3dfb5');
 box(661,108,207,191,'#87a499');box(681,125,167,174,'#234b55');
 for(let i=0;i<5;i++)box(685+i*31,276-i*13,33,23+i*13,'#71918b');
 box(653,106,11,192,'#e5dbc0');box(866,106,11,192,'#e5dbc0');
 plaque('구장 내부 · 관람 통로',233,54,350);
 plaque('1루 관람석 →',765,108,207);
 box(384,100,183,111,'#e3d9b9');box(393,110,165,91,'#688985');
 text('오늘의 경기',475,137,19,'#fff0ce');
 box(413,156,124,6,'#ced3b7');box(427,176,96,6,'#b3c7b2');
 floor('#b7aa92');
 for(let i=0;i<4;i++)line(0,318+i*40,900,318+i*40,'#847f6e44',2);
 for(let i=0;i<6;i++)line(100+i*145,292,40+i*165,452,'#847f6e33',2);
 box(0,291,900,7,'#657f75');

 if(phase===0){
  // The player slows down after spotting a child alone in the corridor.
  const px=lerp(155,351,ease(u));
  player(px,419,u<.88?'walk':'surprised',183);
  npc(525,419,'child','sad');
  const tear=(ms/45)%15;
  box(516,353+tear,3,6,'#74c8e4');box(531,353+tear,3,6,'#74c8e4');
  bubble('엄마… 어디 있어요?',541,270,true);
  if(u>.4){text('?',px+24,204,34,'#fff0b3');bubble('혼자 있네…?',251,172);}
 }else if(phase===1){
  // Lower the actual player's body, keeping the original width/uniform, to
  // bring their face toward the child's eye line before standing up together.
  const px=lerp(351,434,part(0,.24));
  const lower=part(.03,.28)*(1-part(.69,.95));
  c.save();c.translate(px,419);c.scale(1,1-lower*.36);
  player(0,0,lower>.12?'teach':'idle',183);c.restore();
  npc(525,419,'child',u<.3?'sad':'idle');
  if(u<.72){
   bubble('괜찮아. 같이 엄마를 찾아보자.',469,228);
   if(u>.34)bubble('네…!',589,299);
  }else{
   line(px+37,359,503,368,'#efc49f',6);
   bubble('내 옆에서 같이 걸을까?',470,217);
  }
 }else if(phase===2){
  // Their shared walk is visible for the whole cut. Mother first appears at
  // the seating entrance now, so finding her is a distinct story beat.
  const progress=ease(u),px=lerp(434,597,progress),cx=lerp(525,683,progress);
  const mx=lerp(801,754,part(.31,.91));
  npc(mx,416,'mother',u>.31&&u<.91?'walk':'idle');
  player(px,419,u<.94?'walk':'idle',183);
  npc(cx,419,'child',u<.94?'walk':'cheer');
  if(u<.64)line(px+36,359,cx-21,367,'#efc49f',6);
  if(u<.35)bubble('엄마 옷은 무슨 색이니?',458,213);
  else if(u<.7){bubble('분홍색! 저기 엄마예요!',604,224);text('!',mx,233,33,'#ffeab3');}
  else{bubble('엄마!',643,267);bubble('여기 있었구나!',769,211);}
 }else{
  // A clear final tableau: mother embraces the child, and the player steps
  // aside. It still reads as a reunion when reduced motion freezes this cut.
  const mx=lerp(754,742,part(0,.26)),cx=lerp(683,697,part(0,.26));
  player(lerp(597,555,part(0,.28)),419,u<.25?'walk':'idle',183,true);
  npc(mx,416,'mother','idle');npc(cx,419,'child','hug');
  // Bent arms make the embrace explicit instead of two raised-hand poses.
  line(mx-35,334,mx-50,326,'#cf7580',12);
  line(mx-50,326,cx+3,337,'#efc49f',8);
  line(cx+24,357,mx-14,367,'#efc49f',7);
  box(cx-7,341,3,2,'#efc49f');box(cx+6,341,3,2,'#efc49f');
  text('♥',719,269-Math.sin(ms*.003)*3,29,'#cf6c80');
  bubble('엄마!',686,298);
  bubble('데려다주셔서 정말 고마워요.',663,191);
  if(u>.43)bubble('이제 손 꼭 잡고 다녀요.',307,231);
 }
}

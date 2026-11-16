(()=>{
const ids=[0,1,4,2,3],labels=['정면','앞 사선 →','옆 →','뒤 사선 →','뒤','고개 숙임 ↓'];
const appearance={body:2,skin:0,hairColor:2,eyeColor:0,parts:{hair:-1,eyes:0,brows:0,nose:0,mouth:0,beard:-1,wear:-1,black:-1}};
const F=FieldRendererV13,G=FieldCorrectionV01;
const setup=id=>{const c=document.getElementById(id),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#edeae2';g.fillRect(0,0,c.width,c.height);return g;};
function text(g,t,x,y,size=16,color='#233d36'){g.fillStyle=color;g.font=size+'px system-ui';g.fillText(t,x,y);}
function box(g,x,y,w,h){g.strokeStyle='#b9c4bb';g.strokeRect(x+.5,y+.5,w,h);}
function blank(g,x,y,lines){g.fillStyle='#e1dbd1';g.fillRect(x,y,180,145);lines.forEach((v,i)=>text(g,v,x+12,y+45+i*25,15,'#a24a39'));}
function sheet(){
 const g=setup('directions');
 text(g,'머리 방향 · 원본과 실제 연결 확인',24,32,26);
 text(g,'옆얼굴은 연결 수정 후보. 옆 장비와 숙임은 아직 제작·검토가 필요합니다.',24,65,18);
 for(let i=0;i<6;i++){const x=i*216;box(g,x+6,92,204,708);text(g,labels[i],x+18,122,21);
  if(i===5){blank(g,x+18,165,['전용 그림 없음','정면 회전으로','대체하면 안 됨']);blank(g,x+18,390,['숙인 머리·모자','정수리·얼굴 가림','함께 다시 그리기']);blank(g,x+18,626,['몸과 목 기울기','연결 재검토']);continue;}
  const d=ids[i],h=G.head(appearance,d,'none');
  g.drawImage(h,x+33,145,150,144);g.drawImage(h,x+90,300,25,24);text(g,'맨머리 / 원래 픽셀',x+18,354,15);
  if(d===4)blank(g,x+18,390,['옆 모자·머리카락','안경·아이패치','맞는 방향 필요']);
  else {g.drawImage(G.head({...appearance,parts:{...appearance.parts,hair:1}},d,'cap'),x+33,389,150,144);text(g,'기존 장비 · 계속 검토',x+18,565,14);}
  const pose=[0,1,2,3,4][i],out=G.render(appearance,pose,{headwear:'none'});g.drawImage(out.canvas,x+12,585,192,192);
  text(g,'몸 방향: '+labels[i],x+17,788,14);
 }
}
function issues(){
 const g=setup('directionIssues');
 text(g,'몸과 머리를 따로 돌렸던 오류',24,35,26);
 text(g,'적색: 버전16의 문제 / 녹색: 로컬 연결 시험 / 우측: 남은 그림 작업',24,68,18);
 const rows=[
  {title:'옆으로 서기',old:F.render(appearance,2,{headwear:'none'}).canvas,next:G.render(appearance,2,{headwear:'none'}).canvas,desc:['몸은 옆, 머리는 사선이었음','옆얼굴 원본 + 보이는 눈 1개 연결','옆 모자·머리카락·안경은 미완성']},
  {title:'뒤로 달리기',old:F.render(appearance,39,{direction:3,headwear:'none'}).canvas,next:G.render(appearance,14,{headwear:'none'}).canvas,desc:['옆으로 달리는 몸에 뒤통수만 붙임','뒤 달리기 몸 + 뒤 머리로 짝 맞춤','뒤 달리기 2칸뿐 · 전체 주기 추가 필요']},
  {title:'낮은 공격 시점 타격',old:F.render(appearance,47,{direction:2,headwear:'helmet'}).canvas,next:null,desc:['앞 사선 타격 몸에 뒤 머리만 붙임','이 시점에 맞는 몸부터 다시 필요','좌·우타자의 어깨·시선·배트 경로 검토']},
  {title:'고개 숙이기',old:F.render(appearance,30,{headwear:'cap'}).canvas,next:null,desc:['정면 얼굴을 옆으로 기울여 표현함','앞으로 숙인 머리·모자 그림 필요','눈 가림과 목 연결까지 함께 확인']}
 ];
 rows.forEach((r,i)=>{const y=105+i*260;box(g,12,y,1272,246);text(g,r.title,32,y+34,22);
  g.drawImage(r.old,40,y+42,192,192);text(g,'수정 전',250,y+150,16,'#a24a39');
  if(r.next){g.drawImage(r.next,340,y+42,192,192);text(g,'연결 시험',535,y+150,16,'#226948');}
  else blank(g,355,y+62,['새 방향 그림 필요','미완성을 유지']);
  r.desc.forEach((v,j)=>text(g,v,695,y+84+j*42,18,j===0?'#a24a39':'#233d36'));
 });
}
Promise.all([F.init(),G.init()]).then(()=>{sheet();issues();window.directionAuditReady=true;});
})();

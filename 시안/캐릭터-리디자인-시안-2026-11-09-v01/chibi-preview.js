/* 캐릭터 리디자인 시안 · 2026-11-09 v01 — 비교 화면
   지금 게임 그림(charFrame)과 새 2.5등신 시안(Chibi)을 카드 크기·경기장 크기·실제 경기장에서 나란히 보여 줍니다.
   data-test-session 모드라 실제 구단 저장을 읽거나 쓰지 않습니다. */
(function(){
'use strict';
document.body.classList.add('chibi-page');
const C=window.Chibi,NOM=52,dpr=()=>window.devicePixelRatio||1;
const OURS={main:'#08654e',sub:'#f6f8f4'},THEIRS={main:'#172e58',sub:'#f6f8f4'};
const POSES=[['stand','서 있기'],['ready','수비 준비'],['bat','타격 준비'],['run','달리기']];
const CURRENT_FRAME={stand:[1,0],ready:[2,0],bat:[0,0],run:[3,1]};
const BODY_H=[45,57,50,52,49,57];
const STRIP=[['외야',214,true],['2루 근처',250],['1루·투수',320],['타석',455]];

// 기획서 v03의 선수 3명
const TRIO=[
 {title:'A · 파워 · 우타 · 허세',spec:{...OURS,body:'big',skin:2,hairColor:0,hair:'short',feature:'bandage',personality:'brag',props:{wristband:'#3a6fd8'}},note:'크고 둥근 덩치 · 두꺼운 손목 밴드 · 반창고'},
 {title:'B · 주력 · 좌타 · 열혈',spec:{...OURS,body:'slim',skin:0,hairColor:4,hair:'spiky',feature:'freckles',personality:'hot',props:{headband:'#d9433b'}},note:'날렵형 · 머리띠 · 주근깨'},
 {title:'C · 선구안 · 우타 · 소심',spec:{...OURS,body:'normal',skin:1,hairColor:1,hair:'long',feature:'blush',personality:'shy',props:{glasses:true}},note:'보통 체형 · 동그란 안경 · 발그레한 볼'},
];
// First draw: seeds picked so the four show each branch of the rule (big+wristband, slim+tape, broad+necklace, big without a prop).
let powerSeeds=[18,442,420,676],powerPersonalities=['calm','odd','grumpy','hot'];
const FACE_BASE={...OURS,body:'normal',skin:1,hairColor:1,hair:'short',feature:'none',props:{}};

let current=null; // current-art teams
function currentTeams(){if(current)return current;const ours=newTeam('지금 그림',11,3),theirs=newTeam('상대',4,3);current={ours,theirs};return current;}

function canvasCss(w,h){const cv=document.createElement('canvas'),r=dpr();cv.width=Math.round(w*r);cv.height=Math.round(h*r);cv.style.width=w+'px';cv.style.height=h+'px';const g=cv.getContext('2d');g.imageSmoothingEnabled=false;return [cv,g];}
function grass(g,w,h){g.fillStyle='#4f9a3a';g.fillRect(0,0,w,h);g.fillStyle='#57a541';for(let x=0;x<w;x+=Math.round(36*dpr()))g.fillRect(x,0,Math.round(18*dpr()),h);}
function shadow(g,x,y,scale){g.save();g.setTransform(1,0,0,1,Math.round(x),Math.round(y));groundShadow15(g,scale);g.restore();}
function drawNew(g,spec,pose,x,y,H,flip=false,up=1){const r=C.render(spec,pose,Math.max(8,Math.round(H/up)));g.save();g.setTransform(flip?-1:1,0,0,1,Math.round(x),Math.round(y));g.imageSmoothingEnabled=false;g.drawImage(r.canvas,-r.footX*up,-r.footY*up,r.canvas.width*up,r.canvas.height*up);g.restore();}
function drawOld(g,p,tm,pose,x,y,scaleDev,flip=false,outline=true){const [row,col]=CURRENT_FRAME[pose],a=charFrame(p,tm,'motion',row,col),s=BODY_H[a.body]*scaleDev/a.standHeight;
 g.save();g.setTransform(flip?-1:1,0,0,1,Math.round(x),Math.round(y));g.imageSmoothingEnabled=false;(outline?outlinedImage15:plainImage15)(g,a.canvas,Math.round(-a.anchorX*s),Math.round(-a.anchorY*s),Math.round(a.canvas.width*s),Math.round(a.canvas.height*s));g.restore();}
// device pixels per field unit, as the game draws the field at the screen's pixel size
function fieldK(){return Math.min(1100,document.documentElement.clientWidth-48)/900*dpr();}
function zone(y,outfield){return outfield?Math.min(fieldScale(y),outfieldScale15(y)):fieldScale(y);}

function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}

// Card row: 4 poses, chunky pixels (native ~62px drawn x3) vs current art at the same height.
function cardRow(spec,oldPlayer,oldTeam){
 const wrap=el('div','cv-pair'),cardH=180,cellW=150;
 const [nv,ng]=canvasCss(cellW*4,cardH+24),[ov,og]=canvasCss(cellW*4,cardH+24),r=dpr();
 [ng,og].forEach(g=>{g.fillStyle='#0b2236';g.fillRect(0,0,g.canvas.width,g.canvas.height);});
 POSES.forEach(([pose],i)=>{const x=(i+.5)*cellW*r,y=(cardH+8)*r;
  shadow(ng,x,y,2.6*r);drawNew(ng,spec,pose,x,y,cardH*r,false,3);
  shadow(og,x,y,2.6*r);drawOld(og,oldPlayer,oldTeam,pose,x,y,cardH*r/57,false,false);});
 wrap.append(labelled(nv,'새 시안'),labelled(ov,'지금 그림 (외형은 무작위)'));return wrap;
}
// Field-size strip: the same player at the four depths, exactly as many pixels as the game would use.
function fieldStrip(spec,oldPlayer,oldTeam,pose='ready'){
 const k=fieldK(),r=dpr(),w=Math.round(110*STRIP.length),h=Math.round(82*1.5*k/r)+18;
 const [nv,ng]=canvasCss(w,h),[ov,og]=canvasCss(w,h);grass(ng,nv.width,nv.height);grass(og,ov.width,ov.height);
 STRIP.forEach(([name,y,of],i)=>{const sc=zone(y,of),x=(i+.5)*110*r,fy=(h-8)*r;
  shadow(ng,x,fy,sc*k);drawNew(ng,spec,pose,x,fy,NOM*sc*k);
  shadow(og,x,fy,sc*k);drawOld(og,oldPlayer,oldTeam,pose,x,fy,sc*k);});
 const names=el('div','cv-strip-names',STRIP.map(([n,y,of])=>'<span>'+n+' ('+zone(y,of).toFixed(2)+'배)</span>').join(''));
 const wrap=el('div','cv-pair');wrap.append(labelled(nv,'새 시안 · 경기장 크기'),labelled(ov,'지금 그림 · 경기장 크기'));
 const box=el('div');box.append(wrap,names);return box;
}
function labelled(cv,text){const f=el('figure','cv-fig');f.append(cv,el('figcaption','',text));return f;}

function section(title,desc){const s=el('section','cv-section');s.append(el('h2','',title),el('p','cv-desc',desc));document.querySelector('#chibiRoot').append(s);return s;}

function buildTrio(){
 const s=section('① 선수 3명: 겉모습만 보고 강점을 짐작할 수 있나요?','이름표 없이 봤을 때 A는 힘, B는 발, C는 눈이 좋아 보이면 성공이에요. 위는 카드 크기, 아래는 실제 경기장에서 쓰는 크기예요.');
 const {ours}=currentTeams();
 TRIO.forEach((t,i)=>{const card=el('div','cv-card');card.append(el('h3','',t.title),el('p','cv-note',t.note),cardRow(t.spec,ours.players[i],ours),fieldStrip(t.spec,ours.players[i],ours));s.append(card);});
}
function buildPower(){
 const s=section('② 파워 강점 4명: 같은 강점끼리도 서로 다른 사람으로 보이나요?','기획서 v03 규칙(체형 50%, 강점이 뚜렷할 때만 소품, 개인 특징·얼굴·성격은 따로)으로 뽑았어요. "다시 뽑기"를 누를 때마다 같은 규칙으로 새로 뽑아요.');
 const bar=el('div','cv-bar'),btn=el('button','primary','다시 뽑기');bar.append(btn);s.append(bar);
 const holder=el('div');s.append(holder);
 const draw=()=>{holder.innerHTML='';const r=dpr(),k=fieldK(),cardH=150,cell=150,[cv,g]=canvasCss(cell*4,cardH+24),[fv,fg]=canvasCss(cell*4,Math.round(57*1.05*k/r)+20);
  g.fillStyle='#0b2236';g.fillRect(0,0,cv.width,cv.height);grass(fg,fv.width,fv.height);
  const specs=powerSeeds.map((seed,i)=>C.makeSpec('power',seed,{...OURS,...(powerPersonalities[i]?{personality:powerPersonalities[i]}:{})}));
  specs.forEach((spec,i)=>{const x=(i+.5)*cell*r;shadow(g,x,(cardH+8)*r,2.2*r);drawNew(g,spec,'stand',x,(cardH+8)*r,cardH*r,false,3);
   const sc=fieldScale(250);shadow(fg,x,fv.height-8*r,sc*k);drawNew(fg,spec,'ready',x,fv.height-8*r,NOM*sc*k);});
  const info=el('div','cv-info',specs.map(sp=>'<div><b>'+sp.info.personality+'</b><span>체형: '+sp.info.body+'</span><span>소품: '+sp.info.prop+'</span><span>특징: '+sp.info.feature+'</span><span>파워 '+sp.info.top+' · 다음 능력치 '+sp.info.second+'</span></div>').join(''));
  holder.append(labelled(cv,'카드 크기'),labelled(fv,'경기장 크기 (2루 근처, 수비 준비 자세)'),info);};
 btn.onclick=()=>{powerSeeds=powerSeeds.map(()=>Math.floor(Math.random()*1e9));powerPersonalities=[];draw();};
 draw();
}
function buildFaces(){
 const s=section('③ 성격 6가지: 작은 크기에서도 얼굴이 구별되나요?','같은 선수에게 성격만 바꿔 입혔어요. 눈썹과 입 모양으로 구별해요. 경기장 크기에서도 차이가 보이는지 확인해 주세요.');
 const r=dpr(),k=fieldK(),cell=120,[cv,g]=canvasCss(cell*6,190),[fv,fg]=canvasCss(cell*6,Math.round(57*1.05*k/r)+20),[ov,og]=canvasCss(cell*6,Math.round(57*.66*k/r)+20);
 g.fillStyle='#0b2236';g.fillRect(0,0,cv.width,cv.height);grass(fg,fv.width,fv.height);grass(og,ov.width,ov.height);
 C.PERSONALITIES.forEach((pers,i)=>{const spec={...FACE_BASE,personality:pers},x=(i+.5)*cell*r;
  drawNew(g,spec,'stand',x,182*r,174*r,false,3);
  shadow(fg,x,fv.height-8*r,fieldScale(250)*k);drawNew(fg,spec,'ready',x,fv.height-8*r,NOM*fieldScale(250)*k);
  const so=zone(214,true);shadow(og,x,ov.height-8*r,so*k);drawNew(og,spec,'ready',x,ov.height-8*r,NOM*so*k);});
 s.append(labelled(cv,'카드 크기 · 왼쪽부터 '+C.PERSONALITIES.map(p=>C.PERSONALITY_NAMES[p]).join(' · ')),labelled(fv,'내야(2루 근처) 크기'),labelled(ov,'외야 크기 (가장 작음)'));
}
// ④ The real stadium with a defence, a batter and two runners.
function buildField(){
 const s=section('④ 실제 경기장에 세워 보기','게임의 경기장 그림과 원근(구역별 크기) 그대로예요. 포수·투수 전용 자세와 세리머니는 아직 없어서 비슷한 자세로 대신 세웠어요.');
 const bar=el('div','cv-bar'),bNew=el('button','primary','새 시안'),bOld=el('button','','지금 그림');bar.append(bNew,bOld);s.append(bar);
 const cssW=Math.min(1100,document.documentElement.clientWidth-48),[cv,g]=canvasCss(cssW,cssW*530/900);s.append(cv);
 const {ours,theirs}=currentTeams(),order=['power','speed','eye','contact','throw','velocity','control','sense','catch'];
 const D=[['P','stand'],['C','ready'],['1B','ready'],['2B','ready'],['3B','ready'],['SS','ready'],['LF','ready',1],['CF','ready',1],['RF','ready',1]];
 const actors=D.map(([pos,pose,of],i)=>({x:pos==='C'?450:FIELD[pos][0],y:pos==='C'?480:FIELD[pos][1],pose,of:!!of,flip:pos!=='P'&&pos!=='C'&&FIELD[pos][0]>450,spec:C.makeSpec(order[i],300+i,THEIRS),old:[theirs.players[i],theirs]}));
 actors.push({x:422,y:455,pose:'bat',spec:C.makeSpec('power',401,OURS),old:[ours.players[0],ours]});
 actors.push({x:650,y:336,pose:'ready',flip:true,spec:C.makeSpec('speed',402,OURS),old:[ours.players[1],ours]});
 actors.push({x:450,y:230,pose:'ready',flip:true,spec:C.makeSpec('eye',403,OURS),old:[ours.players[2],ours]});
 actors.sort((a,b)=>a.y-b.y);
 let mode='new';
 const draw=()=>{const k=cv.width/900;g.setTransform(k,0,0,k,0,0);g.imageSmoothingEnabled=false;drawStadium(g,900,530,0);g.setTransform(1,0,0,1,0,0);
  for(const a of actors){const sc=zone(a.y,a.of);shadow(g,a.x*k,a.y*k,sc*k);
   if(mode==='new')drawNew(g,a.spec,a.pose,a.x*k,a.y*k,NOM*sc*k,a.flip);else drawOld(g,a.old[0],a.old[1],a.pose,a.x*k,a.y*k,sc*k,a.flip);}
  bNew.classList.toggle('primary',mode==='new');bOld.classList.toggle('primary',mode==='old');};
 bNew.onclick=()=>{mode='new';draw();};bOld.onclick=()=>{mode='old';draw();};draw();
}

function boot(){
 if(typeof ART==='undefined'||!ART.ready||typeof charsReady==='undefined'||!charsReady)return setTimeout(boot,200);
 const root=el('div','chibi-root');root.id='chibiRoot';
 root.append(el('div','cv-head','<h1>캐릭터 리디자인 시안 · v01</h1><p>귀엽고 엉뚱한 2.5등신 · 강점은 몸과 소품, 성격은 얼굴과 행동 · Claude가 코드로 그린 픽셀 그림</p><p class="cv-small">시험 모드라 실제 구단 저장과 분리돼 있어요. 게임 원본 파일은 바꾸지 않았어요.</p>'));
 document.body.append(root);
 buildTrio();buildPower();buildFaces();buildField();
 window.ChibiPreview={ready:true};
}
boot();
})();

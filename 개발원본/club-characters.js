// Small animated sprites are for the playing field; club screens use management art.
const matchSprite25=sprite;
function isPlayingField25(cv){return cv.id==='field'||cv.id==='galleryCanvas'||cv.hasAttribute('data-lab-scene');}
sprite=function(c,x,y,scale,tm,number=0,role='player',pose='idle',tick=0,id='',flip=false){
 if(role!=='player'||!charsReady||isPlayingField25(c.canvas)){
  if(role==='player')c.canvas.dataset.playerRenderer='motion';
  return matchSprite25(c,x,y,scale,tm,number,role,pose,tick,id,flip);
 }
 const p=tm.players?.find(p=>p.id===id)||tm.market?.find(p=>p.id===id)||(tm.offer?.id===id?tm.offer:null)||tm.players?.find(p=>p.number===number)||demoPlayer;
 const a=charFrame(p,tm,'detail'),s=54*scale/1456;
 c.canvas.dataset.playerRenderer='detail';
 c.save();c.translate(Math.round(x),Math.round(y));c.fillStyle='#06241f65';c.beginPath();c.ellipse(0,2,12*scale,3*scale,0,0,Math.PI*2);c.fill();c.imageSmoothingEnabled=false;
 c.drawImage(a.canvas,-a.foot[0]*s,-a.foot[1]*s,a.canvas.width*s,a.canvas.height*s);c.restore();
};

const upperBounds25=new WeakMap();
const waist25=new Map();
function detailWaist25(p){
 const body=p.appearance.body;if(waist25.has(body))return waist25.get(body);
 // Measure the belt in the original blue/white art, independently of team colors.
 const raw=CharacterRenderer.render({...p.appearance,mode:'detail'}).baseCanvas;
 const px=raw.getContext('2d').getImageData(420,560,180,390).data;
 let peak=0,waist=700;
 for(let y=0;y<390;y++){let n=0;for(let x=0;x<180;x++){const i=(y*180+x)*4;if(px[i+3]>160&&px[i+2]>px[i]*1.4&&px[i+2]>px[i+1]*1.15&&px[i+2]>35)n++;}if(n>peak){peak=n;waist=560+y;}}
 waist25.set(body,waist+20);return waist+20;
}
function paintTrainingPortrait25(cv,p,t){
 if(!charsReady)return;
 const a=charFrame(p,t,'detail');let box=upperBounds25.get(a.canvas);
 if(!box){
  const bottom=detailWaist25(p),w=a.canvas.width;
  const px=a.canvas.getContext('2d').getImageData(0,0,w,bottom).data;
  let left=w,right=0,top=bottom;
  for(let y=0;y<bottom;y++)for(let x=0;x<w;x++)if(px[(y*w+x)*4+3]>80){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);}
  box=[Math.max(0,left-12),Math.max(0,top-12),right-left+25,bottom-top+12];upperBounds25.set(a.canvas,box);
 }
 cv.width=360;cv.height=300;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
 const s=Math.min(340/box[2],290/box[3]);g.drawImage(a.canvas,...box,(360-box[2]*s)/2,300-box[3]*s,box[2]*s,box[3]*s);
 cv.dataset.painted=p.id;cv.dataset.playerRenderer='detail';cv.dataset.body=a.body;cv.dataset.cropBottom=detailWaist25(p);
}
const portraitsBefore25=portraitCanvases;
portraitCanvases=function(){portraitsBefore25();for(const cv of $$('canvas[data-training-detail]')){const p=ply(team(),cv.dataset.trainingDetail);if(p)paintTrainingPortrait25(cv,p,team());}};

growthArtworkHTML=function(t){
 const p=ply(t,selection)||t.players[0];selection=p.id;
 return head('선수 훈련','선수를 고르고, 원하는 능력치를 성장시키세요.')+
 '<section class="scene-frame scene-training training-club25">'+playerListHTML(t)+
 '<section class="panel training-profile25"><header><h2>'+esc(p.name)+' <span class="gold">#'+p.number+'</span></h2><p>'+p.hand+' · '+p.tendency+'</p></header>'+
 '<canvas data-training-detail="'+esc(p.id)+'" width="360" height="300" role="img" aria-label="'+esc(p.name)+' 관리용 상반신 캐릭터"></canvas>'+
 '<h3>선수 능력</h3>'+statBars(p)+'</section>'+
 '<section class="panel training-actions25"><div class="row between"><h2>능력 성장</h2><span class="fund">'+money(t.funds)+'</span></div>'+KEYS.map(k=>{
  const f=trainingFacility(k),price=costGrowth(p,k),has=t.facilities.includes(f[0]);
  return '<div class="trainingrow" data-training-stat="'+k+'"><span>'+STATS[k]+'<small class="muted">'+(has?f[1]:f[1]+' 필요')+'</small></span><b>'+p.a[k]+' <span class="muted">→</span> '+(price?p.a[k]+1:p.a[k])+'</b><button class="small primary" data-v8="train" data-stat="'+k+'" aria-label="'+STATS[k]+' 훈련 '+(price?money(price):'최대')+'" '+(live(t)||!has||!price||t.funds<price?'disabled':'')+'>'+(price?money(price):'최대')+'</button></div>';
 }).join('')+'<p class="muted tiny">한 번에 능력치 +1 · 필요한 훈련시설이 있어야 성장할 수 있습니다.</p><button data-go="facilities">훈련시설 확인</button></section></section>';
};
const trainingStyle25=document.createElement('style');trainingStyle25.textContent=`
.training-club25{display:grid;grid-template-columns:225px minmax(275px,1fr) minmax(410px,1.35fr);gap:16px;padding:20px;align-items:start;min-height:790px}
.training-club25>.panel{min-width:0;background:#05213beb}.training-club25 .playerlist{max-height:745px;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin}
.training-club25 .playerlist button{width:100%;min-height:52px}.training-club25 .playerlist h3{font-size:17px;white-space:nowrap}
.training-profile25 header{text-align:center}.training-profile25 header h2{font-size:23px}.training-profile25 header p{font-size:12px;margin-top:9px;color:#b7d2df}
.training-profile25 canvas{display:block;width:100%;height:285px;object-fit:contain;image-rendering:pixelated;margin:10px auto 15px;border-bottom:1px solid #467082}
.training-profile25 h3{margin-bottom:12px}.training-profile25 .statrow{grid-template-columns:72px minmax(0,1fr) 32px;font-size:13px;margin:8px 0}
.training-actions25{display:flex;flex-direction:column;gap:8px}.training-actions25>.row{padding-bottom:12px;border-bottom:1px solid #467082}.training-actions25 h2{font-size:21px}
.training-actions25 .trainingrow{display:grid;grid-template-columns:minmax(115px,1fr) 84px 104px;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #2b526a;font-size:14px}
.training-actions25 small{display:block;font-size:11px;margin-top:6px}.training-actions25 .trainingrow b{font-family:NeoDunggeunmo;font-size:16px;white-space:nowrap;font-weight:normal}.training-actions25 .trainingrow button{font-size:13px;min-height:39px;padding:7px}
.training-actions25>p{line-height:1.8;margin:10px 0}
`;document.head.append(trainingStyle25);

if($('#qaTools')){
 const b=document.createElement('button');b.textContent='훈련·구단 화면 테스트';b.onclick=()=>{
  if(!b.dataset.active){suppressPersist++;b.dataset.active='true';}
  const {t}=fixture23();t.name='해체 드림즈';t.match=null;t.facilities=FACILITIES.filter(f=>f[4]==='훈련').map(f=>f[0]);t.funds=100000;
  t.players.forEach((p,i)=>p.appearance.body=i%6);activeGame=true;selection=t.players[0].id;screen='growth';render();
  toast('저장하지 않는 테스트 구단입니다. 새로고침하면 원래 저장으로 돌아갑니다.');
 };$('#qaTools').append(b);
 const hide=document.createElement('button');hide.textContent='테스트 도구 숨기기';hide.onclick=()=>$('#qaTools').style.display='none';$('#qaTools').append(hide);
}

// Visual checks use a detached player and never read or write a saved club.
if(TEST_ONLY){
 const panel=document.createElement('section');panel.className='panel';panel.id='storySpriteQA';
 panel.innerHTML='<h3>사건 선수 동작 점검</h3><select data-story-sprite-body><option value="0">체형 1</option><option value="1">체형 2</option><option value="2">체형 3</option><option value="3">체형 4</option><option value="4">체형 5</option><option value="5">체형 6</option></select><select data-story-sprite-skin><option value="0">피부색 1</option><option value="1">피부색 2</option><option value="2">피부색 3</option><option value="3">피부색 4</option><option value="4">피부색 5</option><option value="5">피부색 6</option></select><button data-story-sprite-sheet>선택 체형 동작 보기</button><canvas data-story-sprites width="1200" height="500" style="width:100%;height:auto" hidden></canvas>';
 document.body.append(panel);
 panel.querySelector('button').onclick=()=>{
  const cv=panel.querySelector('canvas'),c=cv.getContext('2d');cv.hidden=false;c.imageSmoothingEnabled=false;
  c.fillStyle='#cad9d3';c.fillRect(0,0,cv.width,cv.height);
  const poses=['idle','walk','sad','surprised','teach','bat','swing','cheer'];
  const body=+panel.querySelector('select').value;
  for(let col=0;col<poses.length;col++){
   const p=clone(demoPlayer);p.id='sprite-sheet-'+body;p.appearance.body=body;p.appearance.skin=+panel.querySelector('[data-story-sprite-skin]').value;
   p.appearance.parts={hair:6,beard:3,wear:1,black:1};
   const x=(col%4)*300,y=Math.floor(col/4)*250;c.fillStyle=body%2?'#c3d5cb':'#dbe5df';c.fillRect(x,y,300,250);
   c.fillStyle='#18364b';c.font='16px NeoDunggeunmo';c.textAlign='center';c.fillText((body+1)+' '+poses[col],x+150,y+25);
   clubStoryPlayer(c,p,{primary:11,secondary:5},x+150,y+230,180,poses[col],3100);
  }
 };
 panel.querySelectorAll('select').forEach(select=>select.onchange=()=>panel.querySelector('button').click());
}

if(TEST_ONLY){
 const panel=document.createElement('section');panel.className='panel';
 panel.innerHTML='<h3>피부 명암 비교</h3><button data-skin-audit>6개 피부색 얼굴 확대</button> <button data-skin-autograph>사진 조건 사인회</button><canvas data-skin-sheet width="1200" height="580" style="width:100%;height:auto" hidden></canvas><pre data-skin-report></pre>';
 document.body.append(panel);
 panel.querySelector('[data-skin-autograph]').onclick=()=>{
  const {t}=fixture23();activeGame=true;t.match=null;screen='settings';const p=t.players[0];selection=p.id;
  p.appearance={version:12,body:0,skin:5,hairColor:2,eyeColor:0,parts:{hair:-1,beard:-1,wear:0,black:-1}};
  render();previewClubEvent('autograph');
 };
 panel.querySelector('[data-skin-audit]').onclick=()=>{
  const cv=panel.querySelector('canvas'),g=cv.getContext('2d');cv.hidden=false;g.imageSmoothingEnabled=false;
  const stats=[];
  for(let skin=0;skin<6;skin++){
   const x=skin%3*400,y=Math.floor(skin/3)*290,p=clone(demoPlayer);p.id='skin-audit-'+skin;
   p.appearance={version:12,body:0,skin,hairColor:2,eyeColor:0,parts:{hair:-1,beard:-1,wear:0,black:-1}};
   const a=charFrame(p,{primary:11,secondary:5}),[fx,fy,fw,fh]=a.face;
   g.fillStyle='#46606a';g.fillRect(x,y,400,290);g.fillStyle='#fff1cf';g.font='20px NeoDunggeunmo';g.textAlign='center';g.fillText('피부색 '+(skin+1),x+200,y+30);
   g.drawImage(a.canvas,fx-fw*.2,fy-fh*.8,fw*1.4,fh*2,x+55,y+55,290,215);
   const rgba=a.baseCanvas.getContext('2d').getImageData(fx,fy,fw,fh).data;stats.push({skin,pixels:rgba.length});
  }
  const checks=[];
  for(let body=0;body<6;body++)for(let skin=0;skin<6;skin++){
   const p=clone(demoPlayer);p.id='skin-body-'+body+'-'+skin;p.appearance={version:12,body,skin,hairColor:2,eyeColor:0,parts:{hair:-1,beard:-1,wear:0,black:-1}};
   const before=JSON.stringify(p.appearance),a=charFrame(p,{primary:11,secondary:5}),[x,y,w,h]=a.face;
   const pixels=a.baseCanvas.getContext('2d').getImageData(x,y,w,h).data,colors=new Set();
   for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>200)colors.add([pixels[i],pixels[i+1],pixels[i+2]].join(','));
   if(colors.size<10||p.appearance.skin!==skin)throw Error('피부색/명암 보존 실패');
   checks.push({body,skin,distinctFaceColors:colors.size,skinPreserved:p.appearance.skin===skin});
  }
  panel.querySelector('[data-skin-report]').textContent=JSON.stringify({passed:true,checks,comparison:stats});
 };
}

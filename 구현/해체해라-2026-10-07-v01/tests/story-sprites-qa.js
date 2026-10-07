// Visual checks use a detached player and never read or write a saved club.
if(TEST_ONLY){
 const panel=document.createElement('section');panel.className='panel';panel.id='storySpriteQA';
 panel.innerHTML='<h3>사건 선수 동작 점검</h3><select data-story-sprite-body><option value="0">체형 1</option><option value="1">체형 2</option><option value="2">체형 3</option><option value="3">체형 4</option><option value="4">체형 5</option><option value="5">체형 6</option></select><button data-story-sprite-sheet>선택 체형 동작 보기</button><canvas data-story-sprites width="1200" height="500" style="width:100%;height:auto" hidden></canvas>';
 document.body.append(panel);
 panel.querySelector('button').onclick=()=>{
  const cv=panel.querySelector('canvas'),c=cv.getContext('2d');cv.hidden=false;c.imageSmoothingEnabled=false;
  c.fillStyle='#cad9d3';c.fillRect(0,0,cv.width,cv.height);
  const poses=['idle','walk','sad','surprised','teach','bat','swing','cheer'];
  const body=+panel.querySelector('select').value;
  for(let col=0;col<poses.length;col++){
   const p=clone(demoPlayer);p.id='sprite-sheet-'+body;p.appearance.body=body;
   p.appearance.parts={hair:6,beard:3,wear:1,black:1};
   const x=(col%4)*300,y=Math.floor(col/4)*250;c.fillStyle=body%2?'#c3d5cb':'#dbe5df';c.fillRect(x,y,300,250);
   c.fillStyle='#18364b';c.font='16px NeoDunggeunmo';c.textAlign='center';c.fillText((body+1)+' '+poses[col],x+150,y+25);
   clubStoryPlayer(c,p,{primary:11,secondary:5},x+150,y+230,180,poses[col],3100);
  }
 };
 panel.querySelector('select').onchange=()=>panel.querySelector('button').click();
}

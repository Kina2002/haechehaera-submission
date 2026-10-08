// Match the speaking side and the resolved event, never the current scoreboard.
const SAD_FAN_GROUPS=Object.freeze({
 g04:'상대 홈런',g05:'헛스윙 삼진',g06:'루킹 삼진',g07:'땅볼 아웃',g08:'플라이·직선타 아웃',g09:'병살',
 g14:'득점 기회 무산',g16:'도루 실패',g18:'상대 호수비',g19:'우리 실책',g21:'폭투',g22:'포일',
 g23:'연속 무안타',g24:'뒤진 채 마지막 공격',g27:'패배',g30:'콜드패',g31:'상대 안타',g32:'상대 득점',
 b01:'홈런인 줄 알고 구경',b02:'페어를 파울로 착각',b03:'잡혔는데 계속 뛰기',b04:'베이스 누락',b05:'한 베이스에 두 주자',b06:'무리한 도루',
 b07:'아웃카운트 착각',b08:'엉뚱한 송구',b09:'태그를 깜빡함',b10:'성급한 세리머니',b11:'서로 포구 양보',b12:'베이스 커버 누락',
 'f23-awayLead':'리드 허용','f23-awayTie':'동점 허용','f23-awayChase':'추격 허용','f23-awayExtend':'점수 차 확대',
 'f23-mixed':'출루했지만 주자 아웃','f23-awayScoreOut':'아웃과 함께 실점','f23-awayAdvance':'상대 주자 전진','f23-awayChance':'상대 득점권 기회'
});
function fanReactionPose(speaker,group){
 if(speaker==='우리 관객'&&Object.hasOwn(SAD_FAN_GROUPS,group))return 'sad';
 if(speaker?.startsWith('상대'))return 'tease';
 if(speaker==='우리 치어리더'&&['g03','g29'].includes(group))return 'celebrate';
 return 'idle';
}

const SAD_FAN_ASSET='assets/4d9aac81d0350111c93f.png';
const sadFanArtReady=imageLoad(SAD_FAN_ASSET).then(im=>{
 const cv=canvasNew(im.width,im.height),c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(im,0,0);
 const pixels=c.getImageData(0,0,cv.width,cv.height).data;
 let minX=cv.width,minY=cv.height,maxX=-1,maxY=-1;
 for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++)if(pixels[(y*cv.width+x)*4+3]>30){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
 if(maxX<minX)throw Error('empty sad fan image');
 ART.sheets.sadFans={cv,frames:[[minX,minY,maxX-minX+1,maxY-minY+1]]};
 if(reaction)renderReaction();
 return true;
}).catch(()=>{runtimeErrors.push('우울한 관객 그림을 불러오지 못했습니다.');return false;});

const drawBeforeSadFan=drawReactionBust;
drawReactionBust=function(c,tm,role,pose='idle'){
 if(role!=='fan'||pose!=='sad'||!ART.sheets.sadFans)return drawBeforeSadFan(c,tm,role,pose);
 const src=coloredSheet('sadFans',tm),r=ART.sheets.sadFans.frames[0],w=c.canvas.width,h=c.canvas.height,pad=8;
 const s=Math.min((w-pad*2)/r[2],(h-pad*2)/r[3]),dw=r[2]*s,dh=r[3]*s;
 c.clearRect(0,0,w,h);c.imageSmoothingEnabled=false;c.drawImage(src,...r,(w-dw)/2,h-pad-dh,dw,dh);
};

function previewSadFans(){
 const t=team();if(!t)return;
 note('우리 관객의 아쉬운 순간','<p>우리 관객이 불리한 상황을 말할 때 나오는 모습입니다. 경기 기록은 바뀌지 않습니다.</p><label>상황 <select data-sad-fan-group>'+Object.entries(SAD_FAN_GROUPS).map(([id,title])=>'<option value="'+id+'">'+esc(title)+'</option>').join('')+'</select></label><div style="text-align:center"><canvas data-sad-fan-preview width="340" height="280" style="max-width:100%;image-rendering:pixelated" aria-label="고개를 숙이고 응원 수건을 내린 우리 관객"></canvas><p data-sad-fan-line style="line-height:1.7"></p></div>');
 const draw=()=>{const select=$('[data-sad-fan-group]'),cv=$('[data-sad-fan-preview]');if(!select||!cv)return;const group=DIALOGUES.find(x=>x[0]===select.value);$('[data-sad-fan-line]').textContent=group?.[4].find(x=>x[0]==='우리 관객')?.[1].replaceAll('{N}','6')||'';drawReactionBust(cv.getContext('2d'),t,'fan','sad');};
 $('[data-sad-fan-group]').onchange=draw;draw();sadFanArtReady.then(draw);
}
const renderBeforeSadFan=render;
render=function(){renderBeforeSadFan();if(screen==='settings'&&team())$('#app').insertAdjacentHTML('beforeend','<section class="panel settings-extra"><h3>관객 반응</h3><p>우리 팀의 아쉬운 순간에는 관객도 어깨를 축 늘어뜨립니다.</p><button data-sad-fan-open>우울한 관객 미리보기</button></section>');};
document.addEventListener('click',e=>{if(e.target.closest('[data-sad-fan-open]'))previewSadFans();});

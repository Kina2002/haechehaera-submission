// Fit every reaction speaker inside a padded canvas, including both people in fan/commentary art.
drawReactionBust=function(c,tm,role,pose='idle'){
 if(!ART.ready)return;const idx=role==='commentator'?2:role==='fan'?(pose==='tease'?4:3):pose==='celebrate'?5:pose==='tease'?1:0,src=coloredSheet('reactions',tm),r=ART.sheets.reactions.frames[idx].slice();
 if(role==='cheer')r[3]=Math.round(r[3]*(idx===5?.66:idx===1?.66:.59));
 const w=c.canvas.width,h=c.canvas.height,pad=8,s=Math.min((w-pad*2)/r[2],(h-pad*2)/r[3]),dw=r[2]*s,dh=r[3]*s;
 c.clearRect(0,0,w,h);c.imageSmoothingEnabled=false;c.drawImage(src,...r,(w-dw)/2,h-pad-dh,dw,dh);
};
renderReaction=function(){updateControls();const host=$('#reactionHost');if(!host)return;if(!reaction){host.replaceChildren();return;}let card=host.querySelector('.reaction');if(card?.dataset.event!==reaction.eventId){host.innerHTML='<div class="reaction" data-event="'+esc(reaction.eventId)+'"><div class="bubble"><small>'+esc(reaction.speaker)+'</small>'+esc(reaction.line)+'</div><canvas id="reactionPortrait" width="300" height="270" aria-label="'+esc(reaction.speaker)+'"></canvas></div>';card=host.firstElementChild;}card.classList.toggle('leaving',reaction.left<250);
 const own=!reaction.speaker.startsWith('상대'),tm=reaction.speaker==='중계진'?{primary:4,secondary:3}:own?team():team().match.opp,role=reaction.speaker==='중계진'?'commentator':reaction.speaker.includes('치어')?'cheer':'fan';card.dataset.bust=String(role==='cheer');drawReactionBust($('#reactionPortrait').getContext('2d'),tm,role,['g03','g29'].includes(reaction.group)?'celebrate':own?'idle':'tease');
};
function visualAudit(){
 const options=(key,items)=>'<label>'+key+' <select id="audit'+key+'">'+items.map((n,i)=>'<option value="'+i+'">'+n+'</option>').join('')+'</select></label>';
 note('그림 점검 · v14','<div class="look-controls">'+options('항목',['경기 동작','팀 유니폼','리액션'])+options('동작',['타격','투구','수비','주루','슬라이딩','타석 반응'])+options('파츠',['모두 착용','없음','머리카락','수염','안경','아이블랙'])+options('종류',['1','2','3','4','5','6','7'])+options('배색',['진홍 + 금색','초록 + 아이보리','흰색 + 보라','검정 + 분홍'])+'</div><canvas id="auditVisual" width="1440" height="1000" style="width:100%;height:auto;image-rendering:pixelated"></canvas><p id="auditDescription"></p>');
 $('#dialog').style.cssText='max-width:1500px;width:98vw';
 const draw=()=>{const mode=+$('#audit항목').value,row=+$('#audit동작').value,partMode=+$('#audit파츠').value,index=+$('#audit종류').value,colors=[[1,7],[11,5],[3,13],[0,12]][+$('#audit배색').value],tm={primary:colors[0],secondary:colors[1]},cv=$('#auditVisual'),g=cv.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#c8d8cf';g.fillRect(0,0,1440,1000);let count=0;
 for(let body=0;body<6;body++){const p=clone(demoPlayer);p.id='audit-'+body;const parts={hair:-1,beard:-1,wear:-1,black:-1,eyes:0,nose:3,brows:0,mouth:0};for(const [n,k] of ['hair','beard','wear','black'].entries())if(partMode===0||partMode===n+2)parts[k]=index%CharacterRenderer.variants[k].length;p.appearance={version:12,body,skin:0,hairColor:2,eyeColor:0,parts};
 if(mode===0){const yy=body*160;g.fillStyle=body%2?'#b7cfc1':'#dce5dd';g.fillRect(0,yy,1440,160);g.fillStyle='#142939';g.font='17px Galmuri9';g.fillText(LAB_DATA.bodies[body].name,12,yy+22);for(let col=0;col<6;col++){const a=charFrame(p,tm,'motion',row,col),s=108/a.standHeight;g.drawImage(a.canvas,230+col*195-a.anchorX*s,yy+154-a.anchorY*s,a.canvas.width*s,a.canvas.height*s);count++;}}
 else if(mode===1){const a=charFrame(p,tm,'detail'),x=body*240;g.fillStyle='#142939';g.font='16px Galmuri9';g.fillText(LAB_DATA.bodies[body].name,x+10,30);g.drawImage(a.canvas,x-36,40,312,468);const f=a.face;g.drawImage(a.canvas,f[0]-f[2]*.4,f[1]-f[3],f[2]*1.8,f[3]*2.8,x+5,540,230,357);count++;}
 else{const role=['cheer','cheer','commentator','fan','fan','cheer'][body],pose=['idle','tease','idle','idle','tease','celebrate'][body],x=(body%3)*480,y=Math.floor(body/3)*490;g.fillStyle='#092b48';g.fillRect(x+12,y+15,456,462);const rc=canvasNew(400,350);drawReactionBust(rc.getContext('2d'),tm,role,pose);g.drawImage(rc,x+40,y+80);g.fillStyle='#fff1ca';g.font='20px Galmuri9';g.fillText(['우리 치어리더','상대 치어리더','중계진','우리 관중','상대 관중','홈런 치어리더'][body],x+40,y+55);count++;}}
 $('#auditDescription').textContent=(mode===0?'여섯 체형 × 여섯 자세':mode===1?'여섯 체형 · 전신과 얼굴':'모든 리액션 인물')+' · '+count+'개 표시 · 실제 저장 내용은 바뀌지 않습니다.';};
 $$('.look-controls select').forEach(n=>n.addEventListener('change',draw));draw();
}
document.addEventListener('click',e=>{if(e.target.closest('[data-audit-visual]')&&charsReady)visualAudit();});
if($('#qaTools'))$('#qaTools').insertAdjacentHTML('afterbegin','<button data-audit-visual>v14 그림 점검</button> ');
if($('#qaRun')){const originalQA=$('#qaRun').onclick;$('#qaRun').onclick=async()=>{await originalQA();if(!charsReady)return;const errors=[],palette={primary:'#b21d35',secondary:'#e8bf53',skin:'#e9b383'};let uniformPoses=0,secondaryChecks=0;
 for(let body=0;body<6;body++){
  for(let row=0;row<6;row++)for(let col=0;col<6;col++){const o=CharacterRenderer.render({body,row,col,mode:'motion',palette,parts:{hair:6,beard:3,wear:1,black:1}}),d=o.baseCanvas.getContext('2d').getImageData(0,0,o.canvas.width,o.canvas.height).data;let blue=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>=96&&d[i+2]>d[i]*1.4&&d[i+2]>d[i+1]*1.15&&d[i+2]>35)blue++;if(blue)errors.push('원래 파란 유니폼 잔여 '+[body,row,col]+': '+blue);uniformPoses++;}
  for(const mode of ['detail','motion']){const conf={body,mode,row:1,col:0,parts:{hair:4,wear:0},palette},a=CharacterRenderer.render(conf).baseCanvas,b=CharacterRenderer.render({...conf,palette:{...palette,secondary:'#dd77ca'}}).baseCanvas,da=a.getContext('2d').getImageData(0,0,a.width,a.height).data,db=b.getContext('2d').getImageData(0,0,b.width,b.height).data;let diff=0;for(let i=0;i<da.length;i+=4)if(da[i+3]>96&&(da[i]!==db[i]||da[i+1]!==db[i+1]||da[i+2]!==db[i+2]))diff++;if(diff<20)errors.push('부색상 반영 부족 '+body+' '+mode);secondaryChecks++;}
  await new Promise(requestAnimationFrame);
 }
 if(ART.sheets.reactions.frames[2][0]<1000||ART.sheets.reactions.frames[0][2]<300)errors.push('리액션 원본 좌표 오류');
 const report=JSON.parse($('#qaReport').textContent);report.visualRegression={uniformPoses,secondaryChecks,errors};$('#qaReport').textContent=JSON.stringify(report,null,2);
};}


// Generated transparent images; original PNGs are preserved byte-for-byte.
const officialImages16={},officialFrames16=new Map();
async function loadOfficials16(){await Promise.all(Object.entries(OFFICIAL_DATA).map(async([k,v])=>{const im=new Image();im.src=v.uri;await im.decode();officialImages16[k]=im;}));}
function officialFrame16(kind,index,tm,p){
 const key=[kind,index,tm?.primary,tm?.secondary,p?.appearance?.skin].join(':');if(officialFrames16.has(key))return officialFrames16.get(key);
 const r=OFFICIAL_DATA[kind].frames[index],cv=canvasNew(r[2],r[3]),g=cv.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;g.drawImage(officialImages16[kind],...r,0,0,r[2],r[3]);
 if(kind==='catcher'){
  const px=g.getImageData(0,0,cv.width,cv.height),d=px.data,rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),primary=rgb(COLORS[tm.primary][1]),trim=rgb(COLORS[tm.secondary][1]),skin=rgb(SKINS[p.appearance.skin]);
  for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){const i=(y*cv.width+x)*4,[r,v,b]=[d[i],d[i+1],d[i+2]];if(d[i+3]<32)continue;let target=null,f=1;
   if(b>r*1.4&&b>v*1.2&&b>40){target=primary;f=clamp(b/170,.28,1.25);}
   else if(Math.min(r,v,b)>185&&y<cv.height*.54){target=trim;f=(r+v+b)/735;}
   else if(r>185&&v>100&&b>45&&r>v*1.13&&v>b*1.15&&r-v<105){target=skin;f=clamp(r/245,.65,1.1);}
   if(target)for(let j=0;j<3;j++)d[i+j]=Math.min(255,Math.round(target[j]*f));
  }g.putImageData(px,0,0);
 }
 const d=g.getImageData(0,0,cv.width,cv.height).data;let sx=0,n=0,bottom=0;
 for(let y=Math.max(0,cv.height-38);y<cv.height;y++)for(let x=0;x<cv.width;x++){const i=(y*cv.width+x)*4;if(d[i+3]>128){sx+=x;n++;bottom=Math.max(y,bottom);}}
 const result={canvas:cv,foot:[n?sx/n:cv.width/2,bottom+1]};officialFrames16.set(key,result);return result;
}
function blitOfficial16(c,a,x,y,s,wide=1){c.save();c.translate(Math.round(x),Math.round(y));c.fillStyle='#082c3055';c.beginPath();c.ellipse(0,2,13*wide,3,0,0,Math.PI*2);c.fill();c.imageSmoothingEnabled=false;c.drawImage(a.canvas,-a.foot[0]*s*wide,-a.foot[1]*s,a.canvas.width*s*wide,a.canvas.height*s);c.restore();}
drawUmpire15=function(c,e,t){if(!officialImages16.umpire)return;const judged=!!e&&t>.72,idx=judged&&['ks','kl','ground','fly','line','dp','flydp','cs'].includes(e.type)?2:judged&&['strike','swing'].includes(e.type)?1:0;const a=officialFrame16('umpire',idx);blitOfficial16(c,a,501,517,65/OFFICIAL_DATA.umpire.frames[0][3]);};
drawCatcher15=function(c,x,y,scale,tm,p,t,throwing=false){if(!officialImages16.catcher)return;const e=anim?.e,idx=throwing?2:e?.pitchThrown&&!e.contact&&t>.22?1:0,a=officialFrame16('catcher',idx,tm,p),body=p.appearance.body,s=(33+[0,5,3,4,4,6][body])*scale/OFFICIAL_DATA.catcher.frames[0][3];blitOfficial16(c,a,x,y,s,[.90,.88,1,1.12,1.22,1.12][body]);};
const playerSprite16=sprite;
sprite=function(c,x,y,scale,tm,number,role,pose,tick,id,flip){const p=tm.players?.find(v=>v.id===id);if(role==='player'&&p&&tm.lineup?.some(v=>v.id===id&&v.pos==='C')&&['catcher','glove','throw','idle'].includes(pose)){const t=anim?playProgress(anim.elapsed/anim.duration):0;return drawCatcher15(c,x,y,scale,tm,p,t,pose==='throw');}return playerSprite16(c,x,y,scale,tm,number,role,pose,tick,id,flip);};

// The old comic tail still pointed left after portrait was moved to the right.
const bubble16=document.createElement('style');bubble16.textContent=`
.in-game .reaction{column-gap:18px!important}
.in-game .reaction .bubble{transform:none!important;border-radius:12px!important;overflow:visible!important}
.in-game .reaction .bubble:before,.in-game .reaction .bubble:after{content:"";display:block!important;position:absolute;left:auto!important;bottom:auto!important;top:var(--tail-y,55%);width:0;height:0;transform:translateY(-50%);border:0!important;pointer-events:none}
.in-game .reaction .bubble:before{right:-16px!important;border-top:10px solid transparent!important;border-bottom:10px solid transparent!important;border-left:16px solid #112e46!important}
.in-game .reaction .bubble:after{right:-12px!important;border-top:7px solid transparent!important;border-bottom:7px solid transparent!important;border-left:13px solid #fff7d8!important}
`;document.head.append(bubble16);
const reactionRender16=renderReaction;
renderReaction=function(){reactionRender16();const card=$('.reaction'),bubble=card?.querySelector('.bubble'),portrait=card?.querySelector('canvas');if(!bubble||!portrait)return;const cr=portrait.getBoundingClientRect(),br=bubble.getBoundingClientRect();const role=reaction?.speaker==='중계진'?'commentator':reaction?.speaker.includes('치어')?'cheer':'fan';const mouth=cr.top+cr.height*(role==='commentator'?.68:role==='fan'?.54:.35);bubble.style.setProperty('--tail-y',clamp(mouth-br.top,17,br.height-17)+'px');};

// Add all three sprite poses and all speaker groups to the existing read-only QA scene.
if($('#qa15Open'))$('#qa15Open').textContent='v16 심판·포수·말풍선 점검';
document.addEventListener('click',ev=>{if(!ev.target.closest('#qa15Open'))return;const select=$('#qa15Scene');if(!select)return;
 select.insertAdjacentHTML('beforebegin','<label>화자 <select id="qa16Speaker" aria-label="화자"><option>중계진</option><option>우리 관객</option><option>상대 관객</option><option>우리 치어리더</option><option>상대 치어리더</option></select></label>');
 const oldReactionQA=renderReaction;
 // This wrapper is restricted to the QA dialog and restores normal event choices elsewhere.
 if(!window.qaSpeakerWrapped16){window.qaSpeakerWrapped16=true;renderReaction=function(){const sel=$('#qa16Speaker'),old=reaction;if(sel&&reaction&&!anim?.e?.flowQA23&&!String(reaction.eventId).startsWith('text-')){const candidates=DIALOGUES.flatMap(g=>g[4]).filter(v=>v[0]===sel.value).sort((a,b)=>b[1].length-a[1].length);if(candidates.length)reaction={...reaction,speaker:sel.value,line:candidates[0][1],eventId:reaction.eventId+sel.value};}oldReactionQA();reaction=old;};}
});

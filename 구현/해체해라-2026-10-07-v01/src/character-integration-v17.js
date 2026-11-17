(()=>{'use strict';const R=CharacterPartsV17,oldAppearance=appearance,oldEnrich=enrich,oldPaint=paintDetail;
appearance=function(){const a=oldAppearance();a.v17=R.newLook(Math.random().toString(36),a,true);return a;};
enrich=function(p){const r=oldEnrich(p);R.look(r);return r;};
function config(p,t){return R.config(p,t);}
function paint(cv,p,t,small=false,width=240,height=320){if(!R.ready)return oldPaint(cv,p,t);const a=config(p,t),out=small?R.portrait(a,a.portraitCap!==false):R.fullPortrait(a,a.portraitCap!==false);cv.width=width;cv.height=height;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;const box=out.crop,s=Math.min(width/box[2],height/box[3]);g.clearRect(0,0,width,height);g.drawImage(out.canvas,...box,Math.round((width-box[2]*s)/2),Math.round((height-box[3]*s)/2),Math.round(box[2]*s),Math.round(box[3]*s));cv.dataset.playerRenderer='portrait-v17';cv.dataset.body=p.appearance.body;cv.dataset.appearance=JSON.stringify(R.look(p));cv.setAttribute('aria-label',p.name+(small?' 선수 얼굴':' 선수 전신'));}
paintDetail=(cv,p,t)=>paint(cv,p,t);
paintTrainingPortrait25=function(cv,p,t){paint(cv,p,t,false,360,300);cv.dataset.painted=p.id;};
portraitCanvases=function(){for(const cv of $$('canvas[data-portrait]')){const t=cv.dataset.side==='opp'?team()?.match?.opp:team(),p=t?.players?.find(v=>v.id===cv.dataset.portrait)||t?.market?.find(v=>v.id===cv.dataset.portrait);if(p)paint(cv,p,t,!!cv.closest('.current-card')||cv.getBoundingClientRect().width<85);}for(const cv of $$('canvas[data-training-detail]')){const p=ply(team(),cv.dataset.trainingDetail);if(p)paintTrainingPortrait25(cv,p,team());}};
const originalPlayers=playersArtworkHTML;playersArtworkHTML=function(t){const html=originalPlayers(t),p=ply(t,selection)||t.players[0];if(!p)return html;const button='<button type="button" data-portrait-cap="'+esc(p.id)+'" aria-pressed="'+(R.look(p).portraitCap!==false)+'">모자 '+(R.look(p).portraitCap!==false?'ON':'OFF')+'</button>';return html.replace(/(<section class="panel profile26">[\s\S]*?<\/canvas>)/,'$1'+button);};
document.addEventListener('click',e=>{const b=e.target.closest('[data-portrait-cap]');if(!b)return;const p=ply(team(),b.dataset.portraitCap);if(!p)return;const a=R.look(p);a.portraitCap=a.portraitCap===false;save();render();});
R.bodyNames.forEach((name,i)=>LAB_DATA.bodies[i].name=name);
window.PortraitIntegrationV13={config,paint};R.init().then(()=>{data.slots.forEach(ensureClub);render();}).catch(e=>{runtimeErrors.push(String(e));console.error(e);});
})();

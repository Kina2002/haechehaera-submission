/* All management portraits use the same appearance record and native pixel grid. */
(()=>{'use strict';
function config(p,t){return{...p.appearance,primary:COLORS[t?.primary??0]?.[1]||'#126451',secondary:COLORS[t?.secondary??1]?.[1]||'#f4f5ed'};}
function paint(cv,p,t,small=false,width=240,height=320){
 if(!PortraitRendererV13.ready)return;
 const out=PortraitRendererV13.render(config(p,t));cv.width=width;cv.height=height;
 const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
 const box=small?out.crop:[0,0,128,160],s=Math.min(width/box[2],height/box[3]);
 g.drawImage(out.canvas,...box,Math.round((width-box[2]*s)/2),Math.round(height-box[3]*s),Math.round(box[2]*s),Math.round(box[3]*s));
 cv.dataset.playerRenderer='portrait-v13';cv.dataset.body=p.appearance.body;cv.dataset.appearance=JSON.stringify(p.appearance);
 if(cv.hasAttribute('aria-label'))cv.setAttribute('aria-label',p.name+' 선수 초상');
}
paintDetail=function(cv,p,t){paint(cv,p,t,false);};
paintTrainingPortrait25=function(cv,p,t){paint(cv,p,t,false,360,300);cv.dataset.painted=p.id;};
portraitCanvases=function(){
 for(const cv of $$('canvas[data-portrait]')){const t=cv.dataset.side==='opp'?team()?.match?.opp:team(),p=t?.players?.find(p=>p.id===cv.dataset.portrait)||t?.market?.find(p=>p.id===cv.dataset.portrait);if(p)paint(cv,p,t,!!cv.closest('.current-card')||cv.getBoundingClientRect().width<85);}
 for(const cv of $$('canvas[data-training-detail]')){const p=ply(team(),cv.dataset.trainingDetail);if(p)paintTrainingPortrait25(cv,p,team());}
};
for(let i=0;i<6;i++)LAB_DATA.bodies[i].name=PortraitRendererV13.bodyNames[i];
window.PortraitIntegrationV13={paint,config};
})();

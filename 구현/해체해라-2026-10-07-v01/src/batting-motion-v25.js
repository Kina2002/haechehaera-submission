/* Uses the recorded pitch decision; adds no randomness and changes no identity or artwork. */
(()=>{'use strict';
function phase(e,t){
 const d=e.batting25;if(!d)return '준비';
 if(!e.swing)return t<.22?'공 지켜보기':e.inZone?'지켜본 스트라이크':'볼 골라냄';
 const power=d.command==='power',start=d.center-(power?.10:.055),hit=e.contact?.22:d.center;
 return t<start?'준비':t<hit-.012?(power?'크게 준비':'간결한 준비'):t<hit+.022?(e.contact?'맞힘':'헛스윙'):t<d.center+(power?.16:.08)?(power?'크게 마무리':'짧게 마무리'):e.contact?'타구 확인':'균형 회복';
}
function frame(e,t,form){
 const d=e.batting25,ready=47+form;if(!d)return ready;
 if(!e.swing){if(e.type==='kl'&&t>.7)return 30;if(['bb','hbp'].includes(e.type)&&t>.25)return 23;return ready;}
 const p=phase(e,t);
 if(p==='준비')return ready;
 if(p.endsWith('준비'))return 50+form;
 if(p==='맞힘'||p==='헛스윙')return 53+form;
 if(p.endsWith('마무리'))return 56+form;
 if(e.type==='foul')return 31;
 if(e.type==='ks'&&t>.7)return 30;
 return e.contact?23:t<d.center+.24?38:ready;
}
function tip(out){return out.batPoint||null;}
function trail(c,e,t,point){
 const d=e?.batting25;if(!point||!d||!e.contact||t<=.30||t>=e.motion19?.land||d.exit<88)return;
 // A short ball streak follows its actual trajectory, never a different predicted endpoint.
 const previous=ballPoint19(e,Math.max(.22,t-.012)),g=StadiumViewV13.ground(...previous),q=StadiumViewV13.project(g.x,g.z,.08),dx=point.x-q.x,dy=point.y-q.y,len=Math.hypot(dx,dy)||1;
 c.save();c.fillStyle='#fff5d888';const tail=Math.min(14,(d.exit-80)*.6);for(let i=3;i<tail;i+=3)c.fillRect(Math.round(point.x-dx/len*i),Math.round(point.y-dy/len*i),2,2);c.restore();
}
window.BattingMotionV25={frame,phase,trail,tip};
})();

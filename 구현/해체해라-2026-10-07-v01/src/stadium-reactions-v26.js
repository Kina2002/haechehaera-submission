/* Approved central pass: presentation follows the existing game clock. */
(()=>{
 'use strict';
 const limit=(v,a,b)=>Math.max(a,Math.min(b,v));
 function timing(speaker=''){
  const flow=(speaker==='중계진'?3.5:speaker.includes('치어')?3:2.8)*700;
  return {wait:150,enter:1100,flow,exit:1100,total:flow+2500};
 }
 function frame(width,cardWidth,elapsed,speaker='',reduced=false){
  const t=timing(speaker),center=(width-cardWidth)/2,span=Math.max(0,Math.min(width*.10,(width-cardWidth)*.4));
  const arrive=t.wait+t.enter,leave=arrive+t.flow,finish=leave+t.exit;
  const visible=elapsed>=t.wait&&elapsed<finish;
  let x=center,opacity=visible?1:0;
  if(elapsed<t.wait)x=-cardWidth-20;
  else if(elapsed>=finish)x=width+20;
  else if(elapsed<arrive){
   const u=limit((elapsed-t.wait)/t.enter,0,1),distance=center-span+cardWidth+20,k=2*span/t.flow*t.enter/distance;
   x=-cardWidth-20+distance*((1-k)*(1-(1-u)**3)+k*u);
   if(reduced){x=center;opacity=u;}
  }else if(elapsed<leave)x=reduced?center:center-span+2*span*(elapsed-arrive)/t.flow;
  else{
   const u=limit((elapsed-leave)/t.exit,0,1),distance=width+20-center-span,k=2*span/t.flow*t.exit/distance;
   x=center+span+distance*((1-k)*u**3+k*u);
   if(reduced){x=center;opacity=1-u;}
  }
  return {x,opacity,visible};
 }
 const api={timing,frame};
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(typeof document==='undefined')return;
 const initialized=new WeakSet(),reduce=matchMedia('(prefers-reduced-motion: reduce)');
 let observed=null,observer=null;
 function update(){
  if(screen!=='match'){observer?.disconnect();observed=null;return;}
  const shell=document.querySelector('.stadium-v13'),host=document.querySelector('#reactionHost');
  if(!shell||!host)return;
  if(host.parentNode!==shell)shell.appendChild(host);
  if(observed!==shell){
   observer?.disconnect();observed=shell;
   observer=new ResizeObserver(update);observer.observe(shell);
  }
  const current=reaction,card=host.querySelector('.reaction');
  const eligible=!!current&&(!anim||anim.resultShown);
  if(!eligible||!card){
   host.hidden=true;shell.classList.remove('reaction-running');
   if(!current&&host.firstChild)host.replaceChildren();
   return;
  }
  if(!initialized.has(current)){
   const total=timing(current.speaker).total,oldTotal=current.total||TUNE.reactionMs;
   current.left=limit(current.left/oldTotal,0,1)*total;current.total=total;
   initialized.add(current);
  }
  host.hidden=false;
  host.setAttribute('role','status');host.setAttribute('aria-live','polite');host.setAttribute('aria-atomic','true');
  const state=frame(shell.clientWidth,card.getBoundingClientRect().width,current.total-current.left,current.speaker,reduce.matches);
  card.style.transform='translate('+state.x+'px,-50%)';
  card.style.opacity=String(state.opacity);
  shell.classList.toggle('reaction-running',state.visible);
  host.setAttribute('aria-hidden',String(!state.visible));
 }
 const beforeReaction=renderReaction;
 renderReaction=function(){const result=beforeReaction.apply(this,arguments);update();return result;};
 const beforeField=drawField;
 drawField=function(){const result=beforeField.apply(this,arguments);update();return result;};
 const beforeRender=render;
 render=function(){const result=beforeRender.apply(this,arguments);update();return result;};
 reduce.addEventListener?.('change',update);
 window.StadiumReactionsV26={...api,update};
 update();
})();

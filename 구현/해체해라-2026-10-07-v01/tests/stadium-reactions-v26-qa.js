/* Local-only fixtures. Never changes a saved game. */
(()=>{
 if(!['127.0.0.1','localhost'].includes(location.hostname))throw Error('Local QA only');
 window.ReactionQA26={
  show(speaker='중계진',line='타구는 짧았습니다만, 표정은 이미 홈런이었어요.',part=.5,group='g01'){
   reaction={speaker,line,group,eventId:'qa26-'+speaker,total:5000,left:5000};renderReaction();
   reaction.left=reaction.total*(1-part);StadiumReactionsV26.update();
  },
  check(defense=false){
   CharacterQA17.scene('idle',2,'우타',defense);team().match.paused=true;render();
   const rows=[],check=(name,ok)=>rows.push({name,ok:!!ok});
   for(const who of ['중계진','우리 관객','상대 관객','우리 치어리더','상대 치어리더']){
    const lines=DIALOGUES.flatMap(g=>g[4].filter(x=>x[0]===who)).sort((a,b)=>b[1].length-a[1].length).slice(0,5);
    for(const [,line]of lines){
     this.show(who,line,.5,who==='우리 관객'?'g07':'g01');
     const host=document.querySelector('#reactionHost'),shell=document.querySelector('.stadium-v13'),card=host.querySelector('.reaction'),bubble=card.querySelector('.bubble'),r=shell.getBoundingClientRect(),b=card.getBoundingClientRect();
     check(who+' central layer',host.parentNode===shell&&getComputedStyle(host).zIndex==='8'&&Math.abs((b.y+b.height/2-r.y)/r.height-.55)<.02);
     check(who+' complete text',bubble.scrollHeight<=bubble.clientHeight&&b.x>=r.x&&b.right<=r.right&&b.bottom<=r.bottom);
     check(who+' transparent',getComputedStyle(bubble).backgroundColor==='rgba(255, 246, 219, 0.65)');
    }
    const left=reaction.left;render();check(who+' keeps progress on render',reaction.left===left);
    const xs=[];for(const fraction of [.35,.5,.65]){reaction.left=reaction.total*(1-fraction);StadiumReactionsV26.update();xs.push(document.querySelector('.reaction').getBoundingClientRect().x);}
    check(who+' keeps moving',xs[0]<xs[1]&&xs[1]<xs[2]);
    check(who+' hides only command',getComputedStyle(document.querySelector('.stadium-command')).visibility==='hidden'&&['.stadium-board','.stadium-batter','.stadium-pitcher','.stadium-recent'].every(q=>getComputedStyle(document.querySelector(q)).visibility!=='hidden'));
   }
   reaction=null;renderReaction();check('command restores',getComputedStyle(document.querySelector('.stadium-command')).visibility==='visible');
   this.show('우리 관객','아쉬워도 다음 공에 집중해요.',.5,'g07');
   check('sad fan preserved',document.querySelector('.reaction').dataset.mood==='sad');
   return {defense,width:document.querySelector('.stadium-v13').clientWidth,checks:rows.length,failures:rows.filter(x=>!x.ok),runtimeErrors:runtimeErrors.slice()};
  },
  start(defense=false,rate=1){
   CharacterQA17.scene('single',2,'우타',defense);const m=team().match;
   reaction=null;anim.e.reaction={speaker:'중계진',line:'공보다 감독님 표정이 더 빠르게 움직이네요.',group:'g01'};
   anim.elapsed=0;anim.duration=120;anim.resultShown=false;anim.holdLeft=0;
   m.auto=rate!==1;data.settings.speed=rate;m.paused=false;waitMs=1e9;render();
   return {hiddenBeforeResult:document.querySelector('#reactionHost').hidden};
  }
 };
})();

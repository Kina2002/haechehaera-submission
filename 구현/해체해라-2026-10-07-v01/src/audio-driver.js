(function(root){
 'use strict';
 function create({engine,rules,settings,sadGroups}){
  let latest={},lastScreen=null,lastAnim=null,plan=[],fired=new Set(),reactionKey=null,wasAllowed=false,lastOverlay=null;
  const seen=new Set(),clubRounds=new WeakMap();
  const remember=key=>{seen.add(key);if(seen.size>300)seen.delete(seen.values().next().value);};
  const allowed=()=>!latest.blocked&&settings().enabled;
  const rkey=r=>r?[r.matchId,r.eventId,r.speaker,r.group].join(':'):null;
  function update(s){
   latest=s;
   const can=allowed();
   if(lastScreen!==s.screen){engine.stopEffects('screen-change');lastScreen=s.screen;}
   const overlay=s.club?.view||s.mlb?.id||null;
   if(overlay!==lastOverlay){engine.stopChannel('stinger','overlay-change');lastOverlay=overlay;}
   if(!can&&wasAllowed)engine.stopAll(s.blocked?'paused-or-hidden':'muted');
   wasAllowed=can;engine.mix();
   if(lastAnim!==s.anim){
    engine.stopChannel('field','play-change');engine.stopChannel('judge','play-change');engine.stopChannel('crowd','play-change');
    lastAnim=s.anim;fired=new Set();plan=s.anim?rules.eventPlan(s.anim.e,s.anim.duration,s.judges||[]):[];
   }
   if(s.anim)for(const cue of plan){
    if(fired.has(cue.key)||s.clock<cue.at)continue;
    fired.add(cue.key);
    if(can&&s.clock-cue.at<=180){
     const owner=s.anim;
     void engine.play(cue.id,{maxDuration:cue.maxDuration,
      valid:()=>latest.anim===owner&&allowed()&&latest.clock-cue.at<=350,
      meta:{event:owner.e.id,scheduledMs:cue.at,observedMs:s.clock,screen:s.screen}});
    }
   }
   const nextReaction=rkey(s.reaction);
   if(nextReaction!==reactionKey){
    reactionKey=nextReaction;engine.stopChannel('reaction','speaker-change');
    const id=rules.reactionTrack(s.reaction,sadGroups);
    if(id&&can)void engine.play(id,{valid:()=>rkey(latest.reaction)===nextReaction&&allowed(),
     meta:{speaker:s.reaction.speaker,group:s.reaction.group,event:s.reaction.eventId}});
   }
   if(can){
    engine.music(rules.musicFor(s));
    if(s.club){
     const c=s.club,old=clubRounds.get(c.view)||{elapsed:-1,played:false};
     if(c.elapsed<old.elapsed)old.played=false;
     old.elapsed=c.elapsed;clubRounds.set(c.view,old);
     if(c.elapsed>=c.resultAt&&!old.played){
      old.played=true;void engine.play(c.positive?'warm-event':'bad-event',{valid:()=>latest.club?.view===c.view&&allowed(),meta:{event:c.id}});
     }
    }else if(s.mlb?.success&&!seen.has('mlb:'+s.mlb.id)){
     const key='mlb:'+s.mlb.id;remember(key);void engine.play('mlb',{valid:()=>latest.mlb?.id===s.mlb.id&&allowed(),meta:{event:s.mlb.id}});
    }else if(!s.mlb&&s.screen==='result'&&s.match?.done&&!seen.has('result:'+s.match.id)&&!engine.isPlaying('stinger')){
     remember('result:'+s.match.id);
     const id=s.match.score[0]>s.match.score[1]?'win':s.match.score[0]<s.match.score[1]?'loss':null;
     if(id)void engine.play(id,{valid:()=>latest.screen==='result'&&!latest.club&&!latest.mlb&&allowed(),meta:{event:s.match.id}});
    }else if(!s.club&&!s.mlb&&s.achievement&&!seen.has('achievement:'+s.achievement)&&!engine.isPlaying('stinger')){
     const key=s.achievement;remember('achievement:'+key);void engine.play('achievement',{valid:()=>latest.achievement===key&&allowed(),meta:{event:key}});
    }
   }
  }
  return {update,allowed,snapshot:()=>({screen:latest.screen,blocked:latest.blocked,consumed:[...fired],reactionKey})};
 }
 const api={create};if(typeof module==='object'&&module.exports)module.exports=api;else root.HaecheAudioDriver=api;
})(typeof window==='object'?window:globalThis);

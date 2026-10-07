/* Cue timing shares the visual animation clock; no timers or game randomness. */
(function(root){
 'use strict';
 const positive=new Set(['g02','g03','g10','g13','g15','g17','g20','g25','g26','g29',
  'f23-lead','f23-tie','f23-chase','f23-extend','f23-scoreOut','f23-advance','f23-awayStrand','f23-awayMixed']);
 const taunting=new Set(['g01','g02','g04','g05','g06','g07','g08','g09','g10','g12','g14','g15','g16','g18','g19','g21','g22','g23','g24','g27','g30','g31','g32',
  ...Array.from({length:12},(_,i)=>'b'+String(i+1).padStart(2,'0')),
  'f23-awayLead','f23-awayTie','f23-awayChase','f23-awayExtend','f23-mixed','f23-awayScoreOut','f23-awayAdvance','f23-awayChance']);
 const inverse=t=>t<=.36?t/.36*.55:.55+(t-.36)/.64*.45;
 function reactionTrack(r,sadGroups={}){
  if(!r)return null;
  if(r.speaker==='중계진')return 'commentary';
  if(r.speaker==='우리 관객'&&Object.hasOwn(sadGroups,r.group))return 'sad-fans';
  if(r.speaker==='우리 치어리더'&&positive.has(r.group))return 'home-cheer';
  if(taunting.has(r.group)&&r.speaker==='상대 관객')return 'rival-fans';
  if(taunting.has(r.group)&&r.speaker==='상대 치어리더')return 'rival-cheer';
  return null;
 }
 function eventPlan(e,duration,judges=[]){
  const cues=[],add=(id,at,extra={})=>cues.push({id,at:inverse(at)*duration,...extra});
  if(e.pitchThrown!==false){
   add('pitch',.13,{maxDuration:(inverse(.22)-inverse(.13))*duration/1000+.05});
   if(e.swing&&!e.contact)add('miss',.19);
   if(!e.contact&&!['wp','pb','hbp'].includes(e.type))add('glove',.29);
  }
  if(e.contact)add(e.type==='hr'?'bat-hr':'bat',.22);
  if(e.motion19?.caught)add('glove',e.motion19.land);
  for(const pass of e.motion19?.throws||[])add('glove',pass.end);
  if(e.type==='hr'&&e.attack===0)add('crowd-hr',.57);
  const calls=judges.map(c=>({id:c.kind==='k'?'strike':c.kind,at:inverse(c.at)*duration,judge:true}));
  for(const c of judges.filter(x=>x.kind==='k'))calls.push({id:'out',at:inverse(c.at)*duration+820,judge:true});
  // Closely spaced base calls share one voice. Prioritize the consequential out
  // over a simultaneous safe call instead of speaking two words on top of each other.
  const kept=[];
  for(const cue of calls.sort((a,b)=>a.at-b.at)){
   const near=kept.findIndex(x=>Math.abs(x.at-cue.at)<760);
   if(near<0)kept.push(cue);
   else if(cue.id==='out'&&kept[near].id==='safe')kept[near]=cue;
  }
  cues.push(...kept);
  return cues.sort((a,b)=>a.at-b.at).map((c,i)=>({...c,key:i+':'+c.id}));
 }
 function musicFor(s){
  if(s.blocked)return null;
  if(s.club)return s.club.positive?'bgm-club':null;
  if(s.screen==='result')return null;
  if(s.screen==='match'&&s.match){
   const m=s.visible||s.match;
   return ((m.inning>=4&&Math.abs(m.score[0]-m.score[1])<=2)||m.bases?.[1]||m.bases?.[2])?'bgm-tense':'bgm-main';
  }
  return s.active?'bgm-club':'bgm-main';
 }
 const api={eventPlan,reactionTrack,musicFor,inverse};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.HaecheAudioRules=api;
})(typeof window==='object'?window:globalThis);

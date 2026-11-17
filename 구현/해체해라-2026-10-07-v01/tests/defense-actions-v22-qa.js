/* Local browser QA. No storage writes; load character-v17-qa.js first. */
if(!['127.0.0.1','localhost'].includes(location.hostname))throw Error('Local QA only');
window.checkDefenseActions22=(section='layouts',bodyIndex=0)=>{
 const failures=[],counts={layouts:0,moving:0,ready:0,composites:0,colorPixels:0,eventSamples:0},R=CharacterPartsV17,D=DEFENSE_ACTIONS_V22;
 const check=(ok,detail)=>{if(!ok)failures.push(detail);};
 if(section==='layouts')for(let body=bodyIndex;body===bodyIndex;body++)for(const defense of[false,true])for(let depth=0;depth<3;depth++)for(let side=0;side<3;side++){
  CharacterQA17.scene('idle',body,'우타',defense);const m=team().match,df=tside(m,1-attack(m));df.players.forEach(p=>p.appearance.body=body);m.defense={depth,side};
  const from=Object.fromEntries(df.lineup.filter(i=>i.pos!=='DH').map(i=>[i.id,fieldPosition(i.pos,{depth:2-depth,side:2-side})])),to=Object.fromEntries(df.lineup.filter(i=>i.pos!=='DH').map(i=>[i.id,fieldPosition(i.pos,m.defense)]));
  shiftLead={left:275,total:550,from,to};drawField(performance.now());
  for(const s of StadiumViewV13.lastFrame.filter(s=>!s.offense&&!['C','P'].includes(s.position))){counts.moving++;check(s.action?.phase.startsWith('run')&&s.action.view===DefenseMotionV22.facing(from[s.id],to[s.id],s.worldX>450?'FL':'FR'),{test:'shift run',body,defense,depth,side,s});}
  shiftLead=null;m.formation=to;drawField(performance.now());counts.layouts++;
  for(const s of StadiumViewV13.lastFrame.filter(s=>!s.offense&&!['C','P'].includes(s.position))){const dx=450-s.worldX,dy=450-s.worldY,v=Math.abs(dx)<=Math.abs(dy)*.3?'F':dx<0?'FL':'FR';counts.ready++;check(s.readyView===v&&!s.action&&!s.flip,{test:'home facing',body,defense,depth,side,s});}
  const c=StadiumViewV13.lastFrame.find(s=>s.catcher),u=StadiumViewV13.lastOfficials.find(s=>s.base===0);check(c.action?.view==='B'&&c.action.phase==='crouch'&&u.y>c.y&&Math.abs(u.x-c.x)<30,{test:'catcher/umpire',body,defense,c,u});
 }
 CharacterQA17.scene('idle');const df=tside(team().match,1),a=R.config(df.players[0],df);
 if(section==='composites')for(let body=bodyIndex;body===bodyIndex;body++)for(const phase of['run0','run1','ground','receive','secure','load','release','follow','crouch','crouchReceive'])for(const view of D.views)for(let skin=0;skin<3;skin++){
  const row=D.rows[CHARACTER_ASSETS_V17.bodyIds[body]+'/'+phase+'/'+view],catcher=phase.startsWith('crouch'),opts={headwear:catcher?'catcher':'cap',catcher,action:{phase,view}},look={...a,body,skin,hairId:1+(body*3+skin)%15,glasses:'none',necklace:'none',earring:'none',black:'none'},one=R.render({...look,primary:'#af2828',secondary:'#ffd656'},0,opts),two=R.render({...look,primary:'#285cb8',secondary:'#faf9ef'},0,opts),x=one.canvas.getContext('2d').getImageData(0,0,64,64).data,y=two.canvas.getContext('2d').getImageData(0,0,64,64).data;
  check(one.view===view&&one.gloveHand==='anatomical-left'&&one.foot[1]===56,{test:'pose registration',body,phase,view});
  for(let p=0;p<4096;p++)if(x[p*4+3])check(p%64>0&&p%64<63&&p>63&&p<4032&&x[p*4+3]===255,{test:'clipped/partial alpha',body,phase,view,p});
  const combined=new Map();for(const layer of['bodyLayer','forearm','glove'])for(let i=0;i<row[layer].length;i+=2)combined.set(row[layer][i],row[layer][i+1]);
  for(const[p,id]of combined){if(p/64<row.neck[1]+9)continue;const k=p*4;if(id>=70)check(x.slice(k,k+4).toString()===y.slice(k,k+4).toString(),{test:'equipment tint',body,phase,view,p,id});if(id<=5)check(x.slice(k,k+3).toString()===CHARACTER_ASSETS_V17.palettes.skin[skin][id-1].toString(),{test:'skin seams',body,phase,view,p,id});counts.colorPixels++;}
  counts.composites++;
 }
 const traces=[];
 if(section==='events')for(const defense of[false,true])for(const kind of[bodyIndex]){
  const e=CharacterQA17.scene(kind,2,'우타',defense),phases=new Set();check(validateMotion19(e).length===0,{test:'event timing',kind,defense,failures:validateMotion19(e)});
  for(let step=0;step<=120;step++){const t=step/120;CharacterQA17.at(t);counts.eventSamples++;for(const s of StadiumViewV13.lastFrame.filter(s=>!s.offense)){check(Number.isFinite(s.x)&&Number.isFinite(s.y),{test:'coordinate',kind,t,s});if(s.action){phases.add(s.action.phase);check(!s.flip,{test:'whole body flip',kind,t,s});}}
   const q=StadiumViewV13.lastBall;if(q)check(Number.isFinite(q.x)&&Number.isFinite(q.y),{test:'ball coordinate',kind,t});
  }
  for(const s of e.motion19.throws){CharacterQA17.at(s.start);const q=StadiumViewV13.lastBall,h=StadiumViewV13.playerAnchor(e,s.thrower,s.start,'handPoint','release');check(q&&h&&Math.hypot(q.x-h.x,q.y-h.y)<.01,{test:'release anchor',kind,q,h});if(s.receiver){CharacterQA17.at(s.end-.000001);const b=StadiumViewV13.lastBall,g=StadiumViewV13.playerAnchor(e,s.receiver,s.end,'glovePoint','receive');check(b&&g&&Math.hypot(b.x-g.x,b.y-g.y)<.02,{test:'arrival anchor',kind,b,g});}}
  CharacterQA17.at(.99);const catcher=StadiumViewV13.lastFrame.find(s=>s.catcher);if(['headSlide','tagout','ks','kl'].includes(kind))check(catcher.action?.phase==='crouch'&&catcher.action.view==='B',{test:'catcher recovery',kind,catcher});
  traces.push({kind,defense,phases:[...phases],plan:e.motion19});
 }
 return {section,bodyIndex,counts,failures,traces,regression:section==='regression'?CharacterQA17.checks():null,internal:section==='internal'?checks23():null,simulation:section==='simulation'?simulationChecks19():null,runtimeErrors:runtimeErrors.slice()};
};

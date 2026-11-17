/* Local-only paired replays. Not shipped or exposed as a player menu. */
if(!['127.0.0.1','localhost'].includes(location.hostname))throw Error('Local QA only');
window.DefenseQA24={
 scene(kind='shift-good',defending=false){
  const {t,m,o}=fixture23();activeGame=true;screen='match';m.half=defending?1:0;prepare(m);
  waitMs=1e9;m.paused=true;anim=entrance=sideSwitch=reaction=shiftLead=null;StadiumViewV13.entry=null;
  const side=attack(m),at=tside(m,side),df=tside(m,1-side);
  for(const tm of[t,o])for(const p of tm.players){p.a=Object.fromEntries(KEYS.map(k=>[k,50]));p.a.stamina=70;p.energy=70;p.tendency='중앙';p.appearance.body=2;}
  const ground=kind.startsWith('ground');
  m.defense={side:kind.endsWith('good')?2:kind.endsWith('bad')?0:1,depth:1};m.formation={};m.command='contact';
  if(kind.startsWith('speed'))for(const p of df.players)p.a.speed=kind.endsWith('fast')?80:20;
  if(kind.startsWith('hands'))for(const p of df.players)p.a.catch=kind.endsWith('good')?95:5;
  if(kind.startsWith('hands'))m.defense.side=1;
  const original=r;let i=0,pace=kind.startsWith('hands')?.68:.760526315789,glove=kind.startsWith('hands')?.02:.5;
  const seq=ground?[.848484848485,.8,.5,pace,glove,.8]:[.742424242424,.2,.5,.5,.99,pace,glove,.8];
  r=()=>seq[Math.min(i++,seq.length-1)];let e;
  try{e=emptyEvent(m);e.inputCommand='contact';e.inputDefense={...m.defense};ballInPlay(m,e,null);e.after=snap(m);buildMotion(m,e);e.fielderId=e.fielder.id;delete e.fielder;checkEvent(m,e);}finally{r=original;}
  m.events=[e];anim={e,elapsed:0,duration:1e12,resultShown:false,holdLeft:resultHoldMs(e),judgeClock18:0};
  StadiumViewV13.lastBatter=[m.id,m.inning,m.half,at.lineup[m.order[side]].id].join(':');render();this.at(.22);return e;
 },
 at(t){anim.elapsed=inversePlay18(t)*anim.duration;anim.judgeClock18=anim.elapsed;anim.resultShown=t>=1;drawField(performance.now());return StadiumViewV13.lastFrame;},
 checks(){
  const failures=[],rows=[];
  for(const defending of[false,true])for(const kind of['shift-good','shift-bad','speed-fast','speed-slow','hands-good','hands-bad','ground-good','ground-bad']){
   const e=this.scene(kind,defending),d=e.defense24;
   const check=(ok,why)=>{if(!ok)failures.push({kind,defending,why});};
   check(validateMotion19(e).length===0,validateMotion19(e));check(team().match.checks.violations.length===0,'baseball rule');
   check(e.motion19.land===d.land&&e.motion19.pickup===d.pickup,'shared timing');
   if(d.reached){const pos=fieldPoint19(e.fieldMoves[0],d.land);check(Math.hypot(pos[0]-e.target[0],pos[1]-e.target[1])<.001,'fielder arrived before catch');}
   else{const pos=fieldPoint19(e.fieldMoves[0],d.land);check(Math.hypot(pos[0]-e.target[0],pos[1]-e.target[1])>1,'ball lands before fielder arrives');}
   const detail=popup19(e,1,true)?.detail;check(detail===d.note,'causal popup');
   if(d.drop){this.at(d.land+1e-7);const b=StadiumViewV13.lastBall,g=StadiumViewV13.playerAnchor(e,e.fielderId,d.land,'glovePoint','receive');check(b&&g&&Math.hypot(b.x-g.x,b.y-g.y)<.02,'dropped ball first touches glove');}
   for(let step=0;step<=100;step++){
    const t=step/100;this.at(t);const f=StadiumViewV13.lastFrame.find(x=>x.id===e.fielderId),ball=StadiumViewV13.lastBall;
    check(!!f&&Number.isFinite(f.x)&&Number.isFinite(f.y),'visible fielder');
    if(ball)check(Number.isFinite(ball.x)&&Number.isFinite(ball.y),'visible ball');
    if(!d.reached&&t>d.land&&t<d.pickup-.035)check(f?.action?.phase.startsWith('run'),'late chase keeps running');
   }
   for(const pass of e.motion19.throws){this.at(pass.start+1e-7);const b=StadiumViewV13.lastBall,h=StadiumViewV13.playerAnchor(e,pass.thrower,pass.start,'handPoint','release');check(b&&h&&Math.hypot(b.x-h.x,b.y-h.y)<.02,'throw from hand');}
   rows.push({kind,defending,type:e.type,note:d.note,distance:d.distance,arrival:d.arrival,deadline:d.deadline,land:d.land,pickup:d.pickup});
  }
  return{rows,samples:rows.length*101,failures,runtimeErrors:runtimeErrors.slice()};
 }
};

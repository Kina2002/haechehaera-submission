/* Paired local-only visual QA. Never part of the published game. */
if(!['127.0.0.1','localhost'].includes(location.hostname))throw Error('Local QA only');
window.BattingQA25={
 options(kind){return ({'contact-high':{contact:80,roll:.78},'contact-low':{contact:30,roll:.78},'command-contact':{roll:.65},'command-power':{command:'power',roll:.65},'hit-contact':{contact:80,power:30},'hit-power':{contact:80,power:80,command:'power'},'eye-high':{eye:90,command:'take',zone:false,decision:.07},'eye-low':{eye:20,command:'take',zone:false,decision:.07},'watch-strike':{command:'take',decision:.9},'foul':{foul:0},'hr':{contact:80,power:80,command:'power',hr:.08}})[kind]||{};},
 scene(kind='hit-contact',defending=false,hand='우타',body=2){
  const {t,m,o}=fixture23();activeGame=true;screen='match';m.half=defending?1:0;prepare(m);waitMs=1e9;m.paused=true;anim=entrance=sideSwitch=reaction=shiftLead=null;StadiumViewV13.entry=null;
  const options={contact:50,power:50,eye:50,command:'contact',roll:.2,decision:0,zone:true,hr:.99,foul:.9,...this.options(kind)},at=tside(m,attack(m));
  for(const tm of[t,o])for(const p of tm.players){p.a=Object.fromEntries(KEYS.map(k=>[k,50]));p.a.stamina=70;p.energy=70;p.tendency='중앙';p.hand=hand;p.appearance.body=body;p.visualForm={bat:1,run:0,habit:0,variation:1};}
  for(const p of at.players)Object.assign(p.a,{contact:options.contact,power:options.power,eye:options.eye});
  m.command=options.command;m.defense={side:1,depth:1};m.formation={};
  const original=r,oldBH=chooseBH,oldGroup=chooseGroup;let i=0;const seq=[options.zone?0:.99,.9,options.decision,options.roll,options.foul,.7,.2,.5,.5,options.hr,.5,.5,.8];
  r=()=>seq[Math.min(i++,seq.length-1)];chooseBH=()=>null;chooseGroup=()=>null;let e;
  try{e=resolvePitch(m);}finally{r=original;chooseBH=oldBH;chooseGroup=oldGroup;}
  anim={e,elapsed:0,duration:1e12,resultShown:false,holdLeft:resultHoldMs(e),judgeClock18:0};StadiumViewV13.lastBatter=[m.id,m.inning,m.half,at.lineup[m.order[e.attack]].id].join(':');render();this.at(.15);return e;
 },
 at(t){anim.elapsed=inversePlay18(t)*anim.duration;anim.judgeClock18=anim.elapsed;anim.resultShown=t>=1;drawField(performance.now());return StadiumViewV13.lastFrame;},
 checks(){const failures=[],rows=[];let samples=0;
  for(const defending of[false,true])for(const hand of['우타','좌타'])for(const kind of['contact-high','contact-low','command-contact','command-power','hit-contact','hit-power','eye-high','eye-low','watch-strike','foul','hr']){
   const e=this.scene(kind,defending,hand),d=e.batting25,check=(ok,why)=>{if(!ok)failures.push({kind,defending,hand,why});};
   check(validateMotion19(e).length===0,validateMotion19(e));check(team().match.checks.violations.length===0,'baseball rules');
   if(e.contact){this.at(.22);const b=StadiumViewV13.lastFrame.find(s=>s.id===e.batter),ball=StadiumViewV13.lastBall,tip=StadiumViewV13.batAnchor(e);check(b?.frame===54,'contact frame meets ball');check(ball&&tip&&Math.hypot(ball.x-tip.x,ball.y-tip.y)<.02,'ball touches visible bat');const mv=e.moves.find(s=>s.id===e.batter&&s.from===0);if(mv)check(mv.delay>=d.release,'finish swing before running');}
   if(!e.swing){this.at(.20);const b=StadiumViewV13.lastFrame.find(s=>s.id===e.batter);check(b?.frame===48,'no fake swing while watching');}
   for(let step=0;step<=80;step++){this.at(step/80);samples++;check(StadiumViewV13.lastFrame.every(s=>Number.isFinite(s.x)&&Number.isFinite(s.y)),'player position');const ball=StadiumViewV13.lastBall;if(ball)check(Number.isFinite(ball.x)&&Number.isFinite(ball.y),'ball position');}
   rows.push({kind,defending,hand,type:e.type,swing:e.swing,contact:e.contact,exit:d.exit,pace:d.pace,note:d.note});
  }return {samples,rows,failures,runtimeErrors:runtimeErrors.slice()};
 }
};

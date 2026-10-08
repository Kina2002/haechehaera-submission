const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {randomUUID}=require('node:crypto');

// Run the shipped pitch, fielding, scoring and motion code without rendering or user storage.
// Each PA starts with empty bases; this isolates batting skill, not a season forecast.
function createSimulation({fatigue=false,boneheads=false}={}){
  const filename=path.join(__dirname,'../src/game.js');
  const source=fs.readFileSync(filename,'utf8');
  const ctx=vm.createContext({Math,crypto:{randomUUID},location:{hash:''},performance:{now:()=>0},
    document:{documentElement:{hasAttribute:()=>true}},window:{addEventListener:()=>{}},
    GameStorage:{create:()=>({})},recordRecap:()=>{},restoreAbilities:()=>{},
    balance:()=>({fatigueFloor:.35,pitchCost:1.2,swingCost:.8,powerCost:1.6,runCost:.025})});
  vm.runInContext(source.slice(0,source.indexOf('\nfunction rect(')),ctx);
  vm.runInContext('chooseGroup=()=>null;',ctx);
  if(!boneheads)vm.runInContext('chooseBH=()=>null;',ctx);
  if(fatigue){
    const ext=fs.readFileSync(path.join(__dirname,'../src/extensions.js'),'utf8');
    vm.runInContext("KEYS.push('stamina');",ctx);
    vm.runInContext(ext.slice(ext.indexOf('let fatigueSnapshot=null;'),ext.indexOf('reward=function(m){')),ctx);
  }
  return vm.runInContext(`(options={})=>{
    const {contact=50,count=10000,seed=20261008,command='contact',power=50,eye=50,
      velocity=50,fielding=50,control=50,energy=50,opponentEnergy=50,
      tendency='중앙',hand='우타',defense={side:1,depth:1},fullGame=false}=options;
    const t=newTeam('실험',11,5),o=newTeam('상대',8,4);
    for(const tm of [t,o])for(const p of tm.players){
      p.a=Object.fromEntries(KEYS.map(k=>[k,50]));p.a.stamina=50;p.energy=50;
      p.stats=freshStats();p.hand=hand;p.tendency=tendency;
    }
    for(const p of t.players){p.a.contact=contact;p.a.power=power;p.a.eye=eye;}
    for(const p of o.players){for(const k of ['catch','throw','sense','speed'])p.a[k]=fielding;p.a.velocity=velocity;p.a.control=control;}
    const b=t.players[0];data.slots=[t,null];data.current=0;
    const m={id:'batting-study',opp:o,home:1,inning:1,half:0,outs:0,balls:0,strikes:0,
      bases:[null,null,null],score:[0,0],hits:[0,0],errors:[0,0],order:[0,0],last:[null,null],
      innings:[Array(7).fill(0),Array(7).fill(0)],paPitches:0,pitches:0,bh:[0,0],bhBase:[2,0],
      bhBaseUsed:[0,0],opportunities:[0,0],events:[],rng:seed,done:false,rewarded:false,
      lastLines:{},reactionCount:0,recap:{},checks:{events:0,violations:[],motions:0,reactions:0},defense};
    const permanentAbilities=JSON.stringify([t,o].map(tm=>tm.players.map(p=>p.a)));
    t.match=m;let swings=0,contacts=0,fairBalls=0,ordinaryFairBalls=0,ordinaryFairHits=0;
    const resetEnergy=()=>{for(const p of t.players)p.energy=energy;for(const p of o.players)p.energy=opponentEnergy;};
    resetEnergy();
    for(let pa=0;pa<(fullGame?1000:count);pa++){
      if(!fullGame){
        Object.assign(m,{inning:1,half:0,outs:0,balls:0,strikes:0,bases:[null,null,null],order:[0,0],
          last:[null,null],score:[0,0],events:[],paPitches:0});resetEnergy();
      }
      for(let pitch=0;pitch<1000;pitch++){
        m.command=command;m.defense={...defense};const e=resolvePitch(m);
        if(e.swing)swings++;if(e.swing&&e.contact)contacts++;if(e.fair)fairBalls++;
        if(e.fair&&!e.bh){ordinaryFairBalls++;if(e.hit)ordinaryFairHits++;}
        if(e.pa||m.done)break;
        if(pitch===999)throw Error('Plate appearance did not finish');
      }
      if(m.done)break;
      if(fullGame&&pa===999)throw Error('Game did not finish');
    }
    if(JSON.stringify([t,o].map(tm=>tm.players.map(p=>p.a)))!==permanentAbilities)throw Error('Permanent abilities changed');
    const stats=t.players.map(p=>p.stats);
    for(const s of [...stats,...o.players.map(p=>p.stats)]){
      if(s.pa!==s.ab+s.bb+s.hbp+s.sf||s.h>s.ab)throw Error('Invalid batting stats');
    }
    if(!fullGame&&b.stats.pa!==count)throw Error('Missing plate appearances');
    if(m.checks.violations.length)throw Error(m.checks.violations.join('; '));
    const s=fullGame?stats.reduce((sum,s)=>{for(const k in s)sum[k]=(sum[k]||0)+s[k];return sum;},{}):b.stats;
    return {contact,plateAppearances:s.pa,atBats:s.ab,hits:s.h,average:s.h/s.ab,
      approx95PercentHalfWidth:1.96*Math.sqrt((s.h/s.ab)*(1-s.h/s.ab)/s.ab),homeRuns:s.hr,
      doubles:s.doubles,triples:s.triples,strikeouts:s.k,walks:s.bb,hitByPitch:s.hbp,
      pitches:m.pitches,swings,contacts,swingContactRate:contacts/swings,fairBalls,
      ordinaryFairHitRate:ordinaryFairHits/ordinaryFairBalls,violations:m.checks.violations.length,
      done:m.done,score:m.score,errors:m.errors,boneheads:m.bh,eventsChecked:m.checks.events};
  }`,ctx);
}
module.exports={createSimulation};

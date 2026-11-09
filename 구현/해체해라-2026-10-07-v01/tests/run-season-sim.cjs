// 해체해라 상대 실력 시뮬레이터 (2026-11-09 v01)
// 화면과 저장 없이 실제 경기 판정 코드(game.js + 체력 확장)로 5회 경기를 끝까지 반복합니다.
// 양 팀 모두 자동 경기와 같은 기본 작전(prepare)을 쓰고, 우리 팀 본헤드·체력 저하를 포함합니다.
// 사용법: node tests/run-season-sim.cjs [게임수/칸=300] [결과.json]
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {randomUUID}=require('node:crypto');

function seeded(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}

function createWorld(seed=20261109){
  const src=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8');
  const ext=fs.readFileSync(path.join(__dirname,'../src/extensions.js'),'utf8');
  const auto=fs.readFileSync(path.join(__dirname,'../src/auto-lineup.js'),'utf8');
  const math=Object.create(Math);math.random=seeded(seed);
  const ctx=vm.createContext({Math:math,crypto:{randomUUID},location:{hash:''},performance:{now:()=>0},
    document:{documentElement:{hasAttribute:()=>true}},window:{addEventListener:()=>{}},
    GameStorage:{create:()=>({})},recordRecap:()=>{},restoreAbilities:()=>{},
    balance:()=>({fatigueFloor:.35,pitchCost:1.2,swingCost:.8,powerCost:1.6,runCost:.025})});
  vm.runInContext(src.slice(0,src.indexOf('\nfunction rect(')),ctx);
  // 상대 능력식은 화면 코드 뒤에 있으므로 원본의 해당 함수만 그대로 가져옵니다.
  const oa=src.indexOf('function opponentAbility(');vm.runInContext(src.slice(oa,src.indexOf('\n',oa)),ctx);
  vm.runInContext('chooseGroup=()=>null;',ctx);
  vm.runInContext("KEYS.push('stamina');",ctx);
  vm.runInContext(ext.slice(ext.indexOf('let fatigueSnapshot=null;'),ext.indexOf('reward=function(m){')),ctx);
  vm.runInContext(auto,ctx);
  return vm.runInContext(`(()=>{
    const nine=KEYS.filter(k=>k!=='stamina');
    const mean=ps=>ps.reduce((s,p)=>s+nine.reduce((a,k)=>a+p.a[k],0)/9,0)/ps.length;
    const fresh=p=>{p.energy=p.a.stamina;p.stats=freshStats();return p;};
    const autoLineup=ps=>GameAutoLineup.choose(ps,(p,k)=>p.a[k]);
    // 지금 게임의 새 구단: 강점1·약점1이 있는 시작 선수 12명, 스태미나 40~60, 자동 편성.
    function initialTeam(){const t=newTeam('우리',11,5);t.players.forEach(p=>{p.a.stamina=randomInt(40,60);fresh(p);});t.lineup=autoLineup(t.players);return t;}
    // 지금 게임의 상대 팀: 각 능력 (20~55)+6+단계×4, 센스 70 상한, 스태미나 40~80.
    // lineupMode 'dh'는 현재 게임처럼 생성 순서대로 수비 위치를 배정, 'auto'는 능력에 맞춰 자동 편성.
    function botTeam(level,lineupMode='dh',name='상대'){const o=newTeam(name,8,4,true);o.players=[];
      for(let i=0;i<10;i++){const p=player(false,o.players.map(p=>p.number),true,level);p.a.stamina=randomInt(40,80);o.players.push(fresh(p));}
      o.lineup=lineupMode==='auto'?autoLineup(o.players):dhLineup(o.players);return o;}
    const realBH=chooseBH;
    // boneheads:false는 가상 팀끼리의 경기용입니다(현재 규칙상 본헤드는 이용자 구단에만 있음).
    function playGame(us,opp,home,seed,{boneheads=true}={}){
      chooseBH=boneheads?realBH:()=>null;
      data.slots=[us,null];data.current=0;
      for(const tm of [us,opp])tm.players.forEach(fresh);
      const m={id:'sim-'+seed,opp,home,inning:1,half:0,outs:0,balls:0,strikes:0,bases:[null,null,null],score:[0,0],
        hits:[0,0],errors:[0,0],order:[0,0],last:[null,null],innings:[Array(7).fill(0),Array(7).fill(0)],paPitches:0,
        pitches:0,bh:[0,0],bhBase:[2,0],bhBaseUsed:[0,0],opportunities:[0,0],events:[],rng:(seed>>>0)||7,done:false,
        rewarded:false,lastLines:{},reactionCount:0,recap:{},checks:{events:0,violations:[],motions:0,reactions:0},defense:{side:1,depth:1}};
      us.match=m;
      for(let i=0;i<4000&&!m.done;i++){prepare(m);resolvePitch(m);if(m.events.length>40)m.events.splice(0,m.events.length-40);}
      if(!m.done)throw Error('경기가 끝나지 않았습니다');
      if(m.checks.violations.length)throw Error(m.checks.violations.join('; '));
      us.match=null;
      return {score:m.score.slice(),bh:m.bh[0],innings:m.inning,result:m.score[0]>m.score[1]?'W':m.score[0]<m.score[1]?'L':'D'};
    }
    // 지금 게임의 영입 후보: 9개 능력 10~70(0.1% 확률로 하나 80~100), 스태미나 40~60.
    function recruit(){const p=player(false,[]);p.a.stamina=randomInt(40,60);return fresh(p);}
    return {initialTeam,botTeam,playGame,mean,randomInt,autoLineup,recruit};
  })()`,ctx);
}

// 같은 조건에서 매 경기 새 팀을 뽑아 n경기를 치르고 승·패·무를 셉니다. 홈/원정은 번갈아 진행합니다.
function series(world,makeUs,makeOpp,n,seedBase){
  let w=0,l=0,d=0,rs=0,ra=0,usMean=0,oppMean=0,bh=0;
  for(let i=0;i<n;i++){
    const us=makeUs(),opp=makeOpp();usMean+=world.mean(us.lineup.map(x=>us.players.find(p=>p.id===x.id)));oppMean+=world.mean(opp.players);
    const g=world.playGame(us,opp,i%2,seedBase+i*7919);
    if(g.result==='W')w++;else if(g.result==='L')l++;else d++;rs+=g.score[0];ra+=g.score[1];bh+=g.bh;
  }
  return {games:n,w,l,d,winRate:w/n,winPct:(w+d/2)/n,runsFor:rs/n,runsAgainst:ra/n,boneheads:bh/n,usMean:usMean/n,oppMean:oppMean/n};
}
const pct=x=>(x*100).toFixed(0).padStart(3)+'%';
const f1=x=>x.toFixed(1);

function main(){
  const n=Number(process.argv[2])||300,out=process.argv[3];
  const world=createWorld();const started=Date.now();const report={version:'2026-11-09-v01',gamesPerCell:n,
    notes:['우리 팀 본헤드와 체력 저하 포함, 상대 본헤드 없음(현재 규칙)','양 팀 모두 자동 경기 기본 작전','투수 교체 없음(상대 10명이라 현재도 교체 후보 없음)','승률표는 무승부를 0.5승으로 계산한 값도 함께 기록'],
    experiments:{}};

  // 실험 1: 지금 게임 그대로. 새 구단 시작 선수 vs 상대 단계(현재는 5승마다 +1 단계, ±1 무작위).
  console.log('\n[실험 1] 지금 게임: 새 구단 시작 선수(자동 편성) vs 현재 방식 상대');
  console.log('상대단계 상대평균  우리출전평균  승  패  무   승률  득점  실점  본헤드');
  report.experiments.currentStartVsLevel=[];
  for(const level of [-1,0,1,2,3,5]){
    const row=series(world,()=>world.initialTeam(),()=>world.botTeam(level,'dh'),n,1000+level*100003);row.level=level;
    report.experiments.currentStartVsLevel.push(row);
    console.log(String(level).padStart(6),f1(row.oppMean).padStart(8),f1(row.usMean).padStart(11),String(row.w).padStart(5),String(row.l).padStart(3),String(row.d).padStart(3),pct(row.winRate).padStart(6),f1(row.runsFor).padStart(5),f1(row.runsAgainst).padStart(5),f1(row.boneheads).padStart(6));
  }

  // 실험 2: 실력 차이에 따른 승률. 양 팀 모두 같은 방식으로 뽑고(상대 생성식), 양 팀 모두 자동 편성.
  console.log('\n[실험 2] 같은 생성 방식·같은 편성 규칙일 때 평균 능력 차이별 승률 (우리 본헤드 포함)');
  const levels=[0,3,6,9];const diffs=[-3,-2,-1,0,1,2,3];report.experiments.abilityGap=[];
  console.log('기준단계  차이(단계)  우리평균  상대평균   승률  (무승부 반영)');
  for(const base of levels)for(const dv of diffs){
    const row=series(world,()=>{const t=world.botTeam(base+dv,'auto','우리');return t;},()=>world.botTeam(base,'auto'),n,500000+base*1009+dv*31);
    Object.assign(row,{baseLevel:base,levelDiff:dv});report.experiments.abilityGap.push(row);
    console.log(String(base).padStart(6),String(dv).padStart(9),f1(row.usMean).padStart(10),f1(row.oppMean).padStart(9),pct(row.winRate).padStart(7),pct(row.winPct).padStart(8));
  }

  // 실험 3: 상대 편성만 바꿨을 때 (같은 능력, 생성 순서 배치 vs 능력 맞춤 자동 편성).
  console.log('\n[실험 3] 같은 상대 능력에서 상대 편성 방식만 바꾸기 (우리: 새 구단 시작 선수)');
  report.experiments.opponentLineup=[];
  for(const level of [0,2]){for(const mode of ['dh','auto']){
    const row=series(world,()=>world.initialTeam(),()=>world.botTeam(level,mode),n,900000+level*17+(mode==='auto'?1:0));Object.assign(row,{level,mode});
    report.experiments.opponentLineup.push(row);
    console.log('상대단계',level,mode==='dh'?'지금 방식(순서대로 배치)':'능력 맞춤 자동 편성','→ 우리 승률',pct(row.winRate),' 실점',f1(row.runsAgainst));
  }}
  report.seconds=Math.round((Date.now()-started)/1000);
  console.log('\n소요 시간',report.seconds,'초');
  if(out)fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
}
if(require.main===module)main();
module.exports={createWorld,series};

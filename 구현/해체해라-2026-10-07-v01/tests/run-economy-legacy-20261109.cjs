// 해체해라 자금 시뮬레이터 (2026-11-09 v01)
// 실제 경기 판정(run-season-sim.cjs)에 현재 운영 규칙(extensions.js의 BALANCE·reward·급여·관중·훈련비)을 붙여
// 가상의 감독 3유형이 구단을 운영합니다. 금액 단위는 게임 내부와 같은 만원입니다.
// 사용법: node tests/run-economy-sim.cjs [구단 수=30] [결과.json]
const fs=require('node:fs');
const {createWorld}=require('./run-season-sim.cjs');

// ---- 현재 게임 규칙 (extensions.js 기준값) ----
const B={startFunds:3000,facilityPrice:1000,maintenance:150,baseReward:350,runReward:80,winReward:600,hireFactor:35,trainingFactor:110,salaryFactor:4,ticketBase:10,staminaCap:100,fanEventChance:.32};
const FAC={bat:['contact','power','eye'],field:['sense','catch','throw'],pitch:['velocity','control'],run:['speed'],fitness:['stamina']};
const WELFARE=['shower','locker','massage','sleep','food'],STORES=['goods','restaurant','store'];
const EVENT_FANS=[18,-22,25,-18,20,0,20,-12,18,-15];
const NINE=['contact','power','eye','speed','sense','catch','throw','velocity','control'];
const TEN=[...NINE,'stamina'];
const tier=v=>v<50?1:v<65?2:v<80?3:v<90?4:v<95?6:v<100?8:0;
const meanA=p=>NINE.reduce((s,k)=>s+p.a[k],0)/9;
const mean10=p=>TEN.reduce((s,k)=>s+p.a[k],0)/10;
const price=p=>meanA(p)**2/50;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// 자동 편성과 같은 포지션 가중치. 훈련 우선순위에 사용합니다.
const POSW={P:{velocity:.4,control:.4,sense:.15,stamina:.05},C:{catch:.5,throw:.3,sense:.2},'1B':{catch:.65,sense:.2,throw:.15},
  '2B':{catch:.35,throw:.2,sense:.25,speed:.2},'3B':{catch:.35,throw:.4,sense:.25},SS:{catch:.3,throw:.3,sense:.2,speed:.2},
  LF:{catch:.4,speed:.35,throw:.15,sense:.1},CF:{catch:.35,speed:.4,throw:.15,sense:.1},RF:{catch:.35,speed:.25,throw:.3,sense:.1},DH:{}};
const OFF={contact:.35,power:.3,eye:.2,speed:.1,sense:.05};
function weights(pos){if(pos==='P')return POSW.P;const share=pos==='DH'?0:.65,w={};
  for(const [k,v] of Object.entries(POSW[pos]))w[k]=(w[k]||0)+v*share;for(const [k,v] of Object.entries(OFF))w[k]=(w[k]||0)+v*(1-share);return w;}

const POLICIES={
  thrifty:{name:'아끼는 운영',start:['bat','pitch'],later:['field'],reserveGames:4,stadiumMax:1},
  normal:{name:'보통',start:['bat','pitch'],later:['field','run','shower'],reserveGames:2,stadiumMax:2,stores:true},
  aggressive:{name:'무리한 투자',start:['bat','field','pitch'],later:['run','fitness','goods','restaurant'],reserveGames:1,stadiumMax:3,stores:true},
};

function seeded(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}

// 경기 경험 성장 (제안 v01 · 시험값)
// 이번 경기 기록으로 능력별 경험치를 쌓고, 경험치가 (훈련비 구간 배수 × K)에 닿으면 +1. 경기 성장은 cap까지만.
function gainExp(p,pos,s,growth){
  const e=p.exp??={},add=(k,v)=>{if(v>0)e[k]=(e[k]||0)+v;};
  if(pos!=='P'){
    add('contact',s.h*2+s.pa*.5);
    add('power',(s.doubles+s.triples)*3+s.hr*5+s.rbi);
    add('eye',(s.bb+s.hbp)*3+s.pa*.3);
    add('speed',s.sb*3+s.r*2);
    add('sense',1+s.bh*2);
    if(pos!=='DH'){const w=POSW[pos];add('catch',(w.catch||0)*4+s.e);add('throw',(w.throw||0)*4);add('sense',(w.sense||0)*2);add('speed',(w.speed||0)*2);}
  }else{add('control',s.pout*.5);add('velocity',s.pk*1.5);add('stamina',s.pout*.3);add('sense',1);}
  let ups=0;
  for(const k of Object.keys(e))for(let guard=0;guard<20;guard++){
    const cap=k==='stamina'?Math.min(growth.cap,B.staminaCap):growth.cap;if(p.a[k]>=cap){e[k]=0;break;}
    const need=tier(p.a[k])*growth.K;if(e[k]<need)break;e[k]-=need;p.a[k]++;ups++;
  }
  return ups;
}

// P09/P14 수치 비교용. 실제 게임에 아직 적용되지 않은 제안값입니다.
const CRISIS={win:-6,loss:6,unpaid:8,promotion:-15,relegation:12,loan:15,loanAtSeasonEnd:10,
  lowReserve:3,lowReserveGames:2,interest:1.1,repayShare:.3};
const ORIGINAL_AGING_RULE=Object.freeze({young:5,mid:5,late:10});
const CONFIRMED_AGING_RULE=Object.freeze({young:2,mid:3,late:5});
function agePlayer(p,rnd,decline=true,rule=CONFIRMED_AGING_RULE){
  p.age=(p.age??19)+1;
  const count=decline?(p.age>=41?10:p.age>=36?5:p.age>=30?3:0):0;
  const drop=p.age>=41?rule.late:p.age>=36?rule.mid:rule.young;
  const keys=[...TEN];
  for(let i=0;i<count;i++){
    const j=i+Math.floor(rnd()*(keys.length-i));[keys[i],keys[j]]=[keys[j],keys[i]];
    p.a[keys[i]]=Math.max(1,p.a[keys[i]]-drop);
  }
  return count*drop;
}
function career(world,policy,{games=60,league=false,contractGames=5,seasons=6,seed=1,growth=null,crisis=false,aging=false,agingRule=CONFIRMED_AGING_RULE}){
  const rnd=seeded(seed),ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
  const ageRnd=seeded(seed^0x5a17e901);
  const t=world.initialTeam();
  const enrich=p=>{p.age=19;p.fans=ri(15,85);p.loyalty=ri(45,70);p.salary=Math.max(3,Math.round(price(p)*B.salaryFactor));
    p.ask=Math.max(3,Math.round(price(p)*B.salaryFactor*(1+(50-p.loyalty)/200)));p.contract=contractGames;p.played=0;p.since=0;return p;};
  t.players.forEach(p=>{enrich(p);p.original=true;});
  const club={funds:B.startFunds,debt:0,fac:[],stadium:1,ticket:10,w:0,l:0,d:0,games:0,departures:0,stuck:false,
    opinion:0,loan:0,loanSeason:-1,loans:0,loanPaid:0,forfeits:0,dissolved:false,seasonIndex:0,ageScheduledLoss:0,
    flow:{base:0,runs:0,win:0,gate:0,stores:0,salary:0,maintenance:0,training:0,facilities:0,stadium:0,recruit:0,homeNet:0,awayNet:0,homeGames:0,awayGames:0,
      winNet:0,winGames:0,lossNet:0,lossGames:0,drawNet:0,drawGames:0,winGross:0},trainPoints:0,perfPoints:0};
  const log=[];
  const fixed=()=>t.players.reduce((s,p)=>s+p.salary,0)+club.fac.length*B.maintenance;
  const reserve=()=>policy.reserveGames*fixed();
  const limit=()=>5+(club.stadium-1)*3;
  const spend=(amount,key)=>{club.funds-=amount;club.flow[key]+=amount;};
  const starters=()=>(t.lineup||[]).map(x=>({p:t.players.find(p=>p.id===x.id),pos:x.pos})).filter(x=>x.p);
  const attendance=ticket=>{const pop=t.players.reduce((s,p)=>s+p.fans,0)*.3+80;return Math.round(clamp(pop*(B.ticketBase/ticket)**1.8,0,club.stadium*200));};
  function build(id){if(club.fac.includes(id)||club.fac.length>=limit()||club.funds<B.facilityPrice)return false;spend(B.facilityPrice,'facilities');club.fac.push(id);return true;}
  policy.start.forEach(build);
  function manage(){
    for(const id of policy.later)if(!club.fac.includes(id)&&club.funds-B.facilityPrice>=reserve()+fixed())build(id);
    if(club.stadium<policy.stadiumMax&&club.funds-club.stadium*2500>=reserve()+fixed()){spend(club.stadium*2500,'stadium');club.stadium++;}
    // 훈련: 출전 선수의 (능력 가중치 ÷ 훈련비)가 가장 큰 능력부터 +1. 예비금 아래로는 쓰지 않습니다.
    const open=new Set(club.fac.flatMap(id=>FAC[id]||[]));
    for(let n=0;n<400;n++){
      let best=null;
      for(const {p,pos} of starters()){const w=weights(pos);for(const [k,wt] of Object.entries(w)){if(!open.has(k)||wt<=0)continue;
        const cap=k==='stamina'?B.staminaCap:100;if(p.a[k]>=cap)continue;const c=tier(p.a[k])*B.trainingFactor;if(!c)continue;
        const v=wt/c;if(!best||v>best.v)best={p,k,c,v};}}
      if(!best||club.funds-best.c<reserve())break;
      spend(best.c,'training');best.p.a[best.k]++;club.trainPoints++;
    }
    // 입장료: 관중×(입장료+매장 수) 최대값을 고릅니다.
    const stores=club.fac.filter(id=>STORES.includes(id)).length;let bestT=10,bestV=-1;
    for(let tk=1;tk<=50;tk++){const v=attendance(tk)*(tk+stores);if(v>bestV){bestV=v;bestT=tk;}}club.ticket=bestT;
  }
  function renew(){for(const p of t.players){if(p.contract>0)continue;
    const usage=club.games-p.since?clamp(p.played/(club.games-p.since),0,1):0,base=Math.max(3,price(p)*B.salaryFactor);
    p.ask=clamp(Math.round(base*(.85+.3*usage)),Math.max(3,Math.ceil(p.ask*.8)),Math.min(10000,Math.floor(p.ask*1.2)));
    p.salary=p.ask;p.contract=contractGames;p.played=0;p.since=club.games;}}
  function replaceDeparted(){
    while(t.players.length<10){const cands=[0,1,2].map(()=>{const p=world.recruit();return enrich(p);}).sort((a,b)=>price(a)-price(b));
      const p=cands[0],cost=Math.round(price(p)*B.hireFactor);
      if(club.funds<cost&&crisis&&club.loan===0&&club.loanSeason!==club.seasonIndex){
        const amount=club.debt+(10-t.players.length)*cost;
        club.funds+=amount-club.debt;club.debt=0;club.loan=Math.round(amount*CRISIS.interest);
        club.loanSeason=club.seasonIndex;club.loans++;club.opinion=clamp(club.opinion+CRISIS.loan,0,100);
      }
      if(club.funds<cost){club.stuck=true;return;}spend(cost,'recruit');t.players.push(p);}
    club.stuck=false;
  }
  function playOne(opp,home){
    // 이적 뒤에도 빈 자리가 없게, 훈련 전과 훈련 뒤 모두 자동 편성을 다시 합니다.
    renew();t.lineup=world.autoLineup(t.players);manage();
    t.lineup=world.autoLineup(t.players);
    const g=world.playGame(t,opp,home,ri(1,2**31-1));
    // playGame은 경기 시작 때 기록을 새로 만들므로 p.stats는 이번 경기 기록입니다.
    if(growth)for(const x of t.lineup){const p=t.players.find(p=>p.id===x.id);if(p)club.perfPoints+=gainExp(p,x.pos,p.stats,growth);}
    const win=g.result==='W',crowd=attendance(club.ticket),stores=club.fac.filter(id=>STORES.includes(id)).length;
    const gate=home===0?crowd*club.ticket:0,shop=home===0?crowd*stores:0;
    const inc={base:B.baseReward,runs:g.score[0]*B.runReward,win:win?B.winReward:0,gate,stores:shop};
    for(const [k,v] of Object.entries(inc)){club.funds+=v;club.flow[k]+=v;}
    const salary=t.players.reduce((s,p)=>s+p.salary,0),maint=club.fac.length*B.maintenance,due=salary+maint+club.debt,paid=Math.min(club.funds,due);
    const net=Object.values(inc).reduce((a,v)=>a+v,0)-salary-maint;club.flow[home===0?'homeNet':'awayNet']+=net;club.flow[home===0?'homeGames':'awayGames']++;
    const outcome=win?'win':g.result==='L'?'loss':'draw';club.flow[outcome+'Net']+=net;club.flow[outcome+'Games']++;
    if(win)club.flow.winGross+=Object.values(inc).reduce((a,v)=>a+v,0);
    club.funds-=paid;club.flow.salary+=Math.min(paid,salary);club.flow.maintenance+=Math.max(0,Math.min(paid-salary,maint));club.debt=due-paid;
    if(crisis&&club.loan){const gross=Object.values(inc).reduce((a,v)=>a+v,0);
      const repayment=Math.min(club.loan,Math.floor(gross*CRISIS.repayShare),Math.max(0,gross-due),club.funds);
      club.loan-=repayment;club.funds-=repayment;club.loanPaid+=repayment;}
    if(win)club.w++;else if(g.result==='L')club.l++;else club.d++;club.games++;
    if(crisis)club.opinion=clamp(club.opinion+(win?CRISIS.win:g.result==='L'?CRISIS.loss:0)+(club.debt?CRISIS.unpaid:0),0,100);
    const welfare=club.fac.filter(id=>WELFARE.includes(id)).length,inLineup=new Set(t.lineup.map(x=>x.id));
    for(const p of t.players){p.loyalty=clamp(p.loyalty+welfare-(club.debt?8:0),0,100);p.contract=Math.max(0,p.contract-1);if(inLineup.has(p.id))p.played++;
      p.fans=Math.max(0,p.fans+(win?3:0)+(club.fac.includes('fans')?2:0));}
    if(rnd()<B.fanEventChance){const p=t.players[ri(0,t.players.length-1)];p.fans=Math.max(0,p.fans+EVENT_FANS[ri(0,9)]);}
    const gone=t.players.filter(p=>p.loyalty<=0);if(gone.length){club.departures+=gone.length;t.players=t.players.filter(p=>p.loyalty>0);replaceDeparted();}
    return g;
  }
  const snapshot=extra=>{const s=starters().filter(x=>x.p);return {games:club.games,funds:club.funds,debt:club.debt,w:club.w,l:club.l,d:club.d,
    starterMean:s.reduce((a,x)=>a+meanA(x.p),0)/s.length,salary:t.players.reduce((a,p)=>a+p.salary,0),fixed:fixed(),ticket:club.ticket,
     stadium:club.stadium,facilities:club.fac.length,trainPoints:club.trainPoints,perfPoints:club.perfPoints,departures:club.departures,stuck:club.stuck,
     opinion:club.opinion,loan:club.loan,loans:club.loans,loanPaid:club.loanPaid,forfeits:club.forfeits,dissolved:club.dissolved,
     rosterAgeMean:t.players.reduce((a,p)=>a+p.age,0)/t.players.length,starterAgeMean:s.reduce((a,x)=>a+x.p.age,0)/s.length,
     starterTenMean:s.reduce((a,x)=>a+mean10(x.p),0)/s.length,
     originalCount:t.players.filter(p=>p.original).length,originalMean:(()=>{const a=t.players.filter(p=>p.original);return a.length?a.reduce((v,p)=>v+meanA(p),0)/a.length:null;})(),
     originalTenMean:(()=>{const a=t.players.filter(p=>p.original);return a.length?a.reduce((v,p)=>v+mean10(p),0)/a.length:null;})(),
     ageScheduledLoss:club.ageScheduledLoss,...extra};};
  if(!league){
    let w10=0;
    for(let i=0;i<games&&!club.stuck;i++){const level=Math.floor(club.w/5)+ri(-1,1);const g=playOne(world.botTeam(level,'dh'),i%2);if(g.result==='W')w10++;
      if((i+1)%10===0){log.push(snapshot({winRate10:w10/10}));w10=0;}}
  }else{
    // 제안 리그: 6팀, 상대 5팀과 홈·원정 1번씩(우리 10경기), 가상 팀끼리도 2번씩. 1위 승격, 6위 강등.
    const MIDS=[39,51,63,75],OFFS=[6,3,0,-3,-6];let lv=0;
    for(let s=0;s<seasons&&(!club.stuck||crisis)&&!club.dissolved;s++){
      club.seasonIndex=s;
      if(crisis&&club.stuck&&club.loan===0)replaceDeparted();
      if(s>0)for(const p of t.players)club.ageScheduledLoss+=agePlayer(p,ageRnd,aging,agingRule);
      const ais=OFFS.map((off,i)=>{const o=world.botTeam((MIDS[lv]+off-43.5)/4,'dh','AI'+i);for(const p of o.players)for(const k of NINE)p.a[k]=Math.round(p.a[k]);return {o,pts:0};});
      let ours=0;
      // 홈·원정이 번갈아 오도록 상대마다 첫 경기 장소를 엇갈리게 배정합니다.
      for(let r=0;r<2;r++)for(const [i,ai] of ais.entries()){
        if(club.stuck){if(crisis){club.forfeits++;club.l++;club.games++;club.opinion=clamp(club.opinion+CRISIS.loss,0,100);ai.pts++;}continue;}
        const g=playOne(ai.o,(i+r)%2);const pts=g.result==='W'?1:g.result==='D'?.5:0;ours+=pts;ai.pts+=1-pts;}
      for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)for(let r=0;r<2;r++){const g=world.playGame(ais[i].o,ais[j].o,r,ri(1,2**31-1),{boneheads:false});
        const pts=g.result==='W'?1:g.result==='D'?.5:0;ais[i].pts+=pts;ais[j].pts+=1-pts;}
      const table=[{pts:ours+rnd()*1e-3,us:true},...ais.map(a=>({pts:a.pts+rnd()*1e-3}))].sort((a,b)=>b.pts-a.pts);
      const rank=table.findIndex(x=>x.us)+1;const tierBefore=lv;
      if(rank===1&&lv<3){lv++;if(crisis)club.opinion=clamp(club.opinion+CRISIS.promotion,0,100);}
      else if(rank===6&&lv>0){lv--;if(crisis)club.opinion=clamp(club.opinion+CRISIS.relegation,0,100);}
      if(crisis){if(rank===1&&tierBefore===3)club.opinion=clamp(club.opinion-15,0,100);
        if(club.loan)club.opinion=clamp(club.opinion+CRISIS.loanAtSeasonEnd,0,100);
        if(club.funds<fixed()*CRISIS.lowReserveGames)club.opinion=clamp(club.opinion+CRISIS.lowReserve,0,100);
        club.dissolved=club.opinion>=100;}
      log.push(snapshot({season:s+1,tier:tierBefore,rank,points:ours,nextTier:lv}));
    }
  }
  return {log,flow:club.flow};
}

function median(a){const s=[...a].sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:NaN;}
const TIER=['동네','지역','2부','1부'];
// P16 비교: 같은 초기 난수로 25시즌을 반복하고, 노화 감소만 켜고 끕니다.
function mainAging(n,out,variant='paired',startIndex=0){
  const started=Date.now(),seasons=25,results={};
  const modes=variant==='late5'?['late5']:variant==='gentle'?['gentle']:variant==='compare'?['aging','gentle']:variant==='historical'?['baseline','aging']:['baseline','gentle'];
  for(const mode of modes)results[mode]=[];
  for(let i=startIndex;i<startIndex+n;i++)for(const mode of modes){
    const seed=20261113+i*47,world=createWorld(seed);
    const rule=mode==='gentle'?CONFIRMED_AGING_RULE:mode==='late5'?{young:5,mid:5,late:5}:ORIGINAL_AGING_RULE;
    const r=career(world,POLICIES.normal,{league:true,contractGames:10,seasons,seed:seed+3,growth:{K:10,cap:80},aging:mode!=='baseline',agingRule:rule});
    results[mode].push(r.log);
    const last=r.log.at(-1);console.log(mode,i+1,'도달 시즌',last?.season,'최종 출전 평균 10개',last?.starterTenMean.toFixed(1),'원년 선수',last?.originalCount,'운영 불가',last?.stuck);
  }
  const report={version:'2026-11-09-aging-v01',variant,startIndex,clubsPerMode:n,seasons,policy:'normal',growth:{K:10,cap:80},
    agingRules:{baseline:null,aging:ORIGINAL_AGING_RULE,late5:{young:5,mid:5,late:5},gentle:CONFIRMED_AGING_RULE},
    notes:['경기 판정과 재정 규칙은 기존 시뮬레이터와 동일. 같은 시드의 무노화/노화 짝 비교',
      '원년 선수는 19세 시작, 시즌 12에 30세, 시즌 18에 36세, 시즌 23에 41세',
      '신규 생성된 선수는 19세. 이적·은퇴를 나이 때문에 추가하지 않음',
      '상대 가상 팀은 현재 시뮬레이터처럼 시즌마다 새로 생성되므로 나이를 먹지 않음',
      '자금 부족으로 운영 불가가 되면 해당 구단의 이후 시즌은 시험하지 않음'],results};
  report.seconds=Math.round((Date.now()-started)/1000);console.log('소요 시간',report.seconds,'초');
  if(out)fs.writeFileSync(out,JSON.stringify(report,null,1)+'\n');
}
// 이슈 #46: P09 여론과 P14 대출을 기존 경제·경기 판정 위에서 함께 시험합니다.
function mainCrisis(n,out,startIndex=0,policyFilter=null,lowReserve=CRISIS.lowReserve){
  if(!Number.isFinite(lowReserve)||lowReserve<0)throw new Error('lowReserve must be a nonnegative number');
  if(policyFilter&&policyFilter!=='all'&&!POLICIES[policyFilter])throw new Error('unknown policy: '+policyFilter);
  CRISIS.lowReserve=lowReserve;
  const started=Date.now(),seasons=10;
  const report={version:'2026-11-09-crisis-v06',clubsPerPolicy:n,startIndex,seasons,rules:CRISIS,
    notes:['금액 단위 만원. P10 경기 성장 K=10, P09 제안 리그, P12 계약 10경기',
      '구단 번호마다 독립된 경기·선수 생성 난수. 같은 번호는 세 운영 유형에서 같은 시작 난수 사용',
      '해체 후 재창단은 아직 미모델링. 첫 해체가 나면 해당 구단의 시험을 종료',
      '팬 사건의 여론 효과와 MLB 후원·회생권은 제외. 가상 감독이 대출을 받을 수 있으면 즉시 수락',
      '부전패는 남은 시즌 경기에 적용하고, 운영 불가가 지속되면 이후 시즌도 부전패 처리'],results:{}};
  for(const [key,pol] of Object.entries(POLICIES).filter(([key])=>!policyFilter||policyFilter==='all'||key===policyFilter)){
    const runs=[];for(let i=startIndex;i<startIndex+n;i++){
      const world=createWorld(20261112+i*101);
      runs.push(career(world,pol,{league:true,contractGames:10,seasons,seed:9000+i*13,growth:{K:10,cap:80},crisis:true}));
    }
    report.results[key]=runs.map(r=>r.log);
    const last=runs.map(r=>r.log.at(-1));
    const dissolved=last.filter(r=>r?.dissolved).length,loaned=last.filter(r=>r?.loans>0).length;
    const repaid=last.filter(r=>r?.loans>0&&r.loan===0).length;
    console.log(pol.name,`해체 ${dissolved}/${n}, 대출 ${loaned}/${n}, 대출 전액 상환 ${repaid}/${loaned}, 부전패 ${last.reduce((s,r)=>s+(r?.forfeits||0),0)}경기, 최종 여론 중앙값 ${median(last.map(r=>r.opinion))}`);
  }
  report.seconds=Math.round((Date.now()-started)/1000);console.log('소요 시간',report.seconds,'초');
  if(out)fs.writeFileSync(out,JSON.stringify(report,null,1)+'\n');
}
// 경기 성장 비교: 돈 규칙은 그대로, 제안 리그 10시즌. node tests/run-economy-sim.cjs 20 결과.json growth
function mainGrowth(n,out){
  const started=Date.now(),world=createWorld(20261111),seasons=10;
  const variants=[{key:'none',name:'경기 성장 없음',growth:null,only:['normal']},{key:'slow',name:'느림 K=20',growth:{K:20,cap:80}},
    {key:'mid',name:'보통 K=10',growth:{K:10,cap:80}},{key:'fast',name:'빠름 K=6',growth:{K:6,cap:80}}];
  const report={version:'2026-11-09-growth-v01',clubsPerCell:n,seasons,rules:B,growthRule:'타자: 컨택=안타×2+타석×0.5, 파워=장타×3+홈런×5+타점, 선구안=(볼넷+사구)×3+타석×0.3, 주력=도루×3+득점×2, 센스=1+본헤드×2 / 수비 포지션 가중치×4(포구·송구), ×2(센스·주력), 실책은 포구 / 투수: 제구=아웃×0.5, 구속=탈삼진×1.5, 스태미나=아웃×0.3, 센스=1. +1에 필요한 경험치=훈련비 구간 배수×K, 경기 성장 상한 80',results:{}};
  for(const v of variants)for(const [pk,pol] of Object.entries(POLICIES)){
    if(v.only&&!v.only.includes(pk))continue;
    const runs=[];for(let i=0;i<n;i++)runs.push(career(world,pol,{league:true,contractGames:10,seasons,seed:7000+i*13,growth:v.growth}));
    report.results[v.key+':'+pk]=runs.map(r=>r.log);
    console.log('\n['+v.name+'] '+pol.name);
    console.log(' 시즌  동네  지역  2부  1부  출전평균  경기성장  훈련  자금(중앙값)  급여  운영불가');
    for(const s of [2,5,9]){const rows=runs.map(r=>r.log[Math.min(s,r.log.length-1)]).filter(Boolean);
      const dist=[0,1,2,3].map(x=>(Math.round(100*rows.filter(r=>!r.stuck&&r.nextTier===x).length/rows.length)+'%').padStart(5));
      console.log(String(s+1).padStart(4),...dist,median(rows.map(r=>r.starterMean)).toFixed(1).padStart(9),String(Math.round(median(rows.map(r=>r.perfPoints)))).padStart(8),
        String(Math.round(median(rows.map(r=>r.trainPoints)))).padStart(5),String(Math.round(median(rows.map(r=>r.funds)))).padStart(12),String(Math.round(median(rows.map(r=>r.salary)))).padStart(6),
        String(rows.filter(r=>r.stuck).length).padStart(6));}
    const first=x=>runs.map(r=>r.log.find(l=>l.nextTier>=x)?.season).filter(Boolean);
    for(const [x,label] of [[1,'지역'],[2,'2부'],[3,'1부']]){const f=first(x);
      console.log(' 처음 '+label+' 승격:',Math.round(100*f.length/n)+'% 구단',f.length?'· 중앙값 '+median(f)+'시즌':'');}
  }
  report.seconds=Math.round((Date.now()-started)/1000);console.log('\n소요 시간',report.seconds,'초');
  if(out)fs.writeFileSync(out,JSON.stringify(report,null,1)+'\n');
}
function main(){
  if(process.argv[4]==='aging')return mainAging(Number(process.argv[2])||3,process.argv[3],process.argv[5],Number(process.argv[6])||0);
  if(process.argv[4]==='crisis')return mainCrisis(Number(process.argv[2])||10,process.argv[3],Number(process.argv[5])||0,process.argv[6],
    process.argv[7]===undefined?CRISIS.lowReserve:Number(process.argv[7]));
  if(process.argv[4]==='growth')return mainGrowth(Number(process.argv[2])||20,process.argv[3]);
  const n=Number(process.argv[2])||30,out=process.argv[3],started=Date.now();
  const world=createWorld(20261110);
  const report={version:'2026-11-09-v01',clubsPerPolicy:n,rules:B,policies:POLICIES,notes:[
    '금액 단위 만원. 재계약 때 희망급여를 그대로 지급(애정도 저하 없음), 성적 보정은 0으로 단순화',
    '영입은 이적으로 10명 미만일 때 가장 싼 후보만. 시설 철거·MLB·연봉 협상 전략은 포함하지 않음',
    '리그 실험은 지금 돈 규칙 그대로(리그 상금·관중 배수 없음), 계약 10경기'],current:{},league:{}};
  for(const [key,pol] of Object.entries(POLICIES)){
    const runs=[];for(let i=0;i<n;i++)runs.push(career(world,pol,{games:60,seed:1000+i*7}));
    report.current[key]=runs;
    console.log('\n[지금 규칙 · 60경기] '+pol.name);
    console.log(' 경기  자금(중앙값)  미지급 구단  출전평균  최근10승률  누적승  경기당급여');
    for(let b=0;b<6;b++){const rows=runs.map(r=>r.log[b]).filter(Boolean);if(!rows.length)break;
      console.log(String(rows[0].games).padStart(5),String(Math.round(median(rows.map(r=>r.funds)))).padStart(12),
        (Math.round(100*rows.filter(r=>r.debt>0).length/rows.length)+'%').padStart(10),median(rows.map(r=>r.starterMean)).toFixed(1).padStart(9),
        (Math.round(100*rows.reduce((a,r)=>a+r.winRate10,0)/rows.length)+'%').padStart(10),median(rows.map(r=>r.w)).toFixed(0).padStart(8),
        String(Math.round(median(rows.map(r=>r.salary)))).padStart(10));}
    const played=runs.reduce((a,r)=>a+r.flow.homeGames+r.flow.awayGames,0),f={};
    for(const r of runs)for(const [k,v] of Object.entries(r.flow))f[k]=(f[k]||0)+v/played;
    const hn=runs.reduce((a,r)=>a+r.flow.homeNet,0)/Math.max(1,runs.reduce((a,r)=>a+r.flow.homeGames,0)),an=runs.reduce((a,r)=>a+r.flow.awayNet,0)/Math.max(1,runs.reduce((a,r)=>a+r.flow.awayGames,0));
    console.log(' 실제 치른 경기 수',played,'· 홈경기 1번 평균 손익',hn.toFixed(0),'· 원정 1번 평균 손익',an.toFixed(0),'(급여·유지비 차감, 훈련·건설 제외)');
    console.log(' 경기당 평균 흐름: 기본',f.base.toFixed(0),'득점',f.runs.toFixed(0),'승리',f.win.toFixed(0),'입장',f.gate.toFixed(0),'매장',f.stores.toFixed(0),
      '| 급여',f.salary.toFixed(0),'유지',f.maintenance.toFixed(0),'훈련',f.training.toFixed(0),'시설',f.facilities.toFixed(0),'경기장',f.stadium.toFixed(0),'영입',f.recruit.toFixed(0));
    console.log(' 이적(애정도 0) 평균',(runs.reduce((a,r)=>a+(r.log.at(-1)?.departures||0),0)/n).toFixed(2),'명 · 운영 불가',runs.filter(r=>r.log.at(-1)?.stuck).length,'구단');
  }
  for(const [key,pol] of Object.entries(POLICIES)){
    const runs=[];for(let i=0;i<n;i++)runs.push(career(world,pol,{league:true,contractGames:10,seasons:6,seed:5000+i*11}));
    report.league[key]=runs;
    console.log('\n[제안 리그 · 6시즌(60경기) · 돈 규칙은 지금 그대로] '+pol.name);
    console.log(' 시즌  동네  지역  2부  1부   자금(중앙값)  출전평균  시즌승률  1위비율');
    for(let s=0;s<6;s++){const rows=runs.map(r=>r.log[s]).filter(Boolean);if(!rows.length)break;
      const dist=[0,1,2,3].map(x=>Math.round(100*rows.filter(r=>r.nextTier===x).length/rows.length)+'%');
      console.log(String(s+1).padStart(4),...dist.map(d=>d.padStart(5)),String(Math.round(median(rows.map(r=>r.funds)))).padStart(12),
        median(rows.map(r=>r.starterMean)).toFixed(1).padStart(9),(Math.round(100*rows.reduce((a,r)=>a+r.points/10,0)/rows.length)+'%').padStart(8),
        (Math.round(100*rows.filter(r=>r.rank===1).length/rows.length)+'%').padStart(8));}
  }
  report.seconds=Math.round((Date.now()-started)/1000);console.log('\n소요 시간',report.seconds,'초');
  if(out)fs.writeFileSync(out,JSON.stringify(report,null,1)+'\n');
}
if(require.main===module)main();
module.exports={career,POLICIES,agePlayer,TEN,CONFIRMED_AGING_RULE,ORIGINAL_AGING_RULE};

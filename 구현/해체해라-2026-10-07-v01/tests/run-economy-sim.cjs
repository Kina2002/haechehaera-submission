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
// 같은 사건 순서의 애정도 변화(F21): 사인회 +2, 쓰레기 −2, 기부 +3, 인사 무시 −3, 공 선물 +2, 후보 응원가 +3, 나머지 0. loyalty.events일 때만 씁니다.
const EVENT_LOY=[2,-2,3,-3,2,3,0,0,0,0];
// 애정도 수단 시험용 새 시설(Claude 초안 · 시험값, 2026-11-10): 선수 가족 라운지 — 경기 후 애정도 +1 추가. loyalty.lounge일 때만 짓습니다.
const EXTRA_FAC={lounge:{price:1500,maint:100}};
const NINE=['contact','power','eye','speed','sense','catch','throw','velocity','control'];
const tier=v=>v<50?1:v<65?2:v<80?3:v<90?4:v<95?6:v<100?8:0;
const meanA=p=>NINE.reduce((s,k)=>s+p.a[k],0)/9;
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

// ---- 시설·경기장 개편안 (P17 초안 · 시험값, 2026-11-10) ----
// v03 조정(참가자 승인 2026-11-10): 경기장 2등급 5,000만→8,000만, 버스 3·4단계 +3,000·+4,000만→+5,000·+8,000만,
// 유니폼 개인 팬 1명당 1,000원→500원, 훈련 시설 3단계 유지비 400만→300만. v02 값은 v02 결과 파일의 reform 항목에 남아 있습니다.
// 마사지실(체력)·수면실(본헤드)은 경기 판정에 닿는 효과라 이번 시험에서는 빼고, 가상 감독도 짓지 않습니다.
const REFORM={
  stadiumCost:[0,8000,10000,15000,20000],// 등급 n → n+1 확장비 = stadiumCost[n]. 오프시즌에만
  leagueNeed:[1,1,2,3],// 동네·지역·2부·1부에 필요한 경기장 등급
  fac:{
    bat:{train:['contact','power','eye'],price:1000},field:{train:['sense','catch','throw'],price:1000},
    pitch:{train:['velocity','control'],price:1000},cond:{train:['speed','stamina'],price:1000},
    locker:{price:1000,maint:100},massage:{price:1000,maint:100},sleep:{price:1000,maint:100},food:{price:1500,maint:100},
    uniform:{price:500,maint:0},restaurant:{price:1000,maint:100},billboard:{price:1500,maint:100},
    fanplaza:{price:1000,maint:100},bus:{price:1000,maint:100,awayOnly:true},hall:{price:2000,maint:100},academy:{price:2000,maint:150},
  },
  // 훈련 시설 단계: 올리는 비용·경기당 유지비·훈련비 할인·경기 경험치 배수·경기 성장 한도
  trainLevels:[null,{add:1000,maint:150,disc:0,exp:1,cap:80},{add:2500,maint:250,disc:.2,exp:1.2,cap:80},{add:5000,maint:300,disc:.4,exp:1.4,cap:85}],
  busLevels:[0,1000,2000,5000,8000],busShare:.05,// 응원단 버스 단계 n으로 올리는 비용, 단계마다 원정 응원 +5%p
  uniformPerFan:.05,restaurantPerCrowd:1,billboard:[120,200,350,600],// 만원. 유니폼 개인 팬 1명당 500원, 음식점 관중 1명당 1,000원
  foodExp:1.1,academyExp:1.3,hallPressure:-5,hallMemory:5,academyMax:14,
};
// 개편안 가상 감독: 짓는 순서(later)와 단계 올리기(upgrades)는 시험용 규칙입니다. 승격에 경기장이 필요하면 확장비를 모읍니다.
const REFORM_POLICIES={
  thrifty:{name:'아끼는 운영',start:['bat','pitch'],later:['field','bus','uniform'],upgrades:[['bus',2]],reserveGames:4,stadiumMax:1},
  normal:{name:'보통',start:['bat','pitch'],later:['field','bus','uniform','locker','billboard','food'],upgrades:[['bus',2],['bat',2],['pitch',2]],reserveGames:2,stadiumMax:2},
  aggressive:{name:'무리한 투자',start:['bat','field','pitch'],later:['cond','billboard','bus','restaurant','food','fanplaza','hall','academy'],
    upgrades:[['bus',4],['bat',3],['pitch',3],['field',2]],reserveGames:1,stadiumMax:3},
};

function seeded(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}

// 경기 경험 성장 (제안 v01 · 시험값)
// 이번 경기 기록으로 능력별 경험치를 쌓고, 경험치가 (훈련비 구간 배수 × K)에 닿으면 +1. 경기 성장은 cap까지만.
// boost(시설 개편안 P17): mult(k)는 능력별 경험치 배수, cap(k)는 능력별 경기 성장 한도. 없으면 지금처럼 1배·growth.cap.
function gainExp(p,pos,s,growth,boost=null){
  const e=p.exp??={},add=(k,v)=>{if(v>0)e[k]=(e[k]||0)+v*(boost?boost.mult(k):1);};
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
    const gcap=boost?boost.cap(k):growth.cap,cap=k==='stamina'?Math.min(gcap,B.staminaCap):gcap;if(p.a[k]>=cap){e[k]=0;break;}
    const need=tier(p.a[k])*growth.K;if(e[k]<need)break;e[k]-=need;p.a[k]++;ups++;
  }
  return ups;
}

// 긴급 대출 (P14 제안 · 시험값): 이자 10%, 급여·유지비 뒤 남은 돈에서 경기 수입의 30%까지 상환.
const LOAN={interest:.1,repayShare:.3};
// 해체 여론 설정 (P09 제안 · 시험값). rank는 시즌 끝 1~6위 보정값.
const DISBAND={
  base:{name:'기본',start:30,win:-5,loss:5,unpaid:5,loan:15,loanAtSeasonEnd:10,rank:[-30,-15,0,0,10,20],restart:20},
  strict:{name:'엄격',start:30,win:-4,loss:6,unpaid:6,loan:15,loanAtSeasonEnd:10,rank:[-25,-10,0,5,15,25],restart:20},
  lenient:{name:'관대',start:30,win:-6,loss:4,unpaid:4,loan:15,loanAtSeasonEnd:10,rank:[-35,-20,-5,0,5,15],restart:20},
};
// MLB 진출 (현재 게임 src/mlb.js 기본값과 같음): 주요 3능력 평균 75 이상·출전 5경기 이상, 성공 35%+2%p/점(최대 85%),
// 이적료 5,000만+400만/점, 실패 시 애정도 −20, 3경기 뒤 재도전, 도전하려면 11명 이상.
const MLB={minAbility:75,minGames:5,baseChance:.35,perPoint:.02,maxChance:.85,baseFee:5000,feePerPoint:400,failLoyalty:20,retryGames:3};
// MLB 진출 보상 후보 (참가자 아이디어 2026-11-11, 숫자는 참가자 제안 · 시험값). 진출에 성공한 순간 구단에 남아 있는 선수에게 줍니다.
// pressure: 해체 여론 −%p · loyalty: 남은 선수 모두 애정도 + · count/amount: 남은 선수마다 서로 다른 능력 count개(10개 능력 중 무작위)에 각각 +amount
const MLB_BONUS={
  pressure10:{name:'여론 −10%p',pressure:10},
  loy15:{name:'남은 선수 애정도 +15',loyalty:15},
  loy20:{name:'남은 선수 애정도 +20',loyalty:20},
  abil1:{name:'남은 선수 능력 1개 +10',count:1,amount:10},
  abil2:{name:'남은 선수 능력 2개 +10',count:2,amount:10},
  combo:{name:'여론 −10%p + 애정도 +15 + 능력 1개 +10',pressure:10,loyalty:15,count:1,amount:10},
  // 참가자 수정 (2026-11-11): 능력 +10은 남은 선수 전부가 아니라 3명만(무작위), 세 보상 중 하나를 고르게 하기.
  // pool 'main'(참가자 선택 "대안 1"): 오르는 능력은 그 선수의 주 능력 3개 중에서 고릅니다. 타격(컨택·파워·선구안)과
  // 투구(구속·제구·스태미나) 평균 중 높은 쪽이 주 능력이고, 같으면 타격입니다(F25 MLB 평가와 같은 기준).
  abil3:{name:'남은 선수 3명 주 능력 1개 +10',players:3,count:1,amount:10,pool:'main'},
  abil3x2:{name:'남은 선수 3명 주 능력 2개 +10',players:3,count:2,amount:10,pool:'main'},
  // 고르기: 시험용 감독은 여론 60% 이상이면 여론, 애정도 50 미만 선수가 3명 이상이면 애정도, 그 밖에는 능력을 고릅니다(Claude 초안 규칙).
  choice:{name:'셋 중 고르기 (여론 −10%p · 애정도 +15 · 3명 주 능력 1개 +10)',choose:{pressure:{pressure:10},loyalty:{loyalty:15},ability:{players:3,count:1,amount:10,pool:'main'}}},
  // 참가자 결정 (2026-11-11): 고르기 유지, 다른 둘을 키움. loyPlayers: 애정도를 받을 무작위 선수 수. youngest: 능력 보상을 가장 어린 선수부터(같은 나이는 무작위).
  pressure15:{name:'여론 −15%p',pressure:15},
  loy20x5:{name:'무작위 선수 5명 애정도 +20',loyalty:20,loyPlayers:5},
  young3:{name:'가장 어린 3명 주 능력 1개 +10',players:3,count:1,amount:10,pool:'main',youngest:true},
  // 참가자 결정 (2026-11-11): 능력 보상을 가장 어린 1명에게, MLB로 떠난 선수의 가장 높은 능력(10개 중, 같으면 무작위) +15. 포지션이 고정되지 않아 유형 구분 없음.
  young1x15:{name:'가장 어린 1명 선배 주특기 +15',players:1,count:1,amount:15,youngest:true,inherit:true},
  choice3:{name:'셋 중 고르기 (여론 −15%p · 무작위 5명 애정도 +20 · 가장 어린 1명 선배 주특기 +15)',choose:{pressure:{pressure:15},loyalty:{loyalty:20,loyPlayers:5},ability:{players:1,count:1,amount:15,youngest:true,inherit:true}}},
  choice2:{name:'셋 중 고르기 (여론 −15%p · 무작위 5명 애정도 +20 · 가장 어린 3명 주 능력 1개 +10)',choose:{pressure:{pressure:15},loyalty:{loyalty:20,loyPlayers:5},ability:{players:3,count:1,amount:10,pool:'main',youngest:true}}}};
const MAIN_BAT=['contact','power','eye'],MAIN_PITCH=['velocity','control','stamina'];
const mainAbilities=p=>(MAIN_PITCH.reduce((s,k)=>s+p.a[k],0)>MAIN_BAT.reduce((s,k)=>s+p.a[k],0))?MAIN_PITCH:MAIN_BAT;
const mlbScore=p=>Math.max((p.a.contact+p.a.power+p.a.eye)/3,(p.a.velocity+p.a.control+p.a.stamina)/3);
// awayShare: 원정 경기에서 따라온 우리 관객 비율(참가자 아이디어 2026-11-10). 0이면 지금 게임처럼 원정 입장료 없음.
// 1부까지 키울 돈 후보 (이슈 #46-5, Claude 초안 · 시험값, 2026-11-10): 리그 배당금(경기마다), 순위 상금(시즌 끝 1~3위), 상위 리그 관객 수요 배수
const LEAGUE_MONEY={payout:[0,300,800,1500],prize:[[500,200,100],[2000,1000,500],[5000,2500,1000],[10000,5000,2500]],crowd:[1,1.1,1.25,1.4]};
// 젊은 선수 보너스와 경기 성장 한도 +5 (P10 초안, 2026-11-10). bonus는 [최대 나이, 경기 경험치 배수].
// 나이 하락(decline: [이 나이부터, 시즌마다 모든 능력 −])과 은퇴 나이는 참가자 집 작업(나이에 따른 능력치 하락)이 오기 전까지 쓰는 Claude 임시 가정입니다.
const AGES={startAge:[19,31],prospectAge:[18,19],bonus:[[21,1.5],[25,1.3],[29,1],[33,.7],[99,.4]],capUp:5,decline:[[33,1],[36,2]],retireAt:37};
// 리그별 영입 시장 (참가자 결정 2026-11-10, 숫자는 Claude 초안): 리그가 오를수록 영입 후보의 9개 능력에 더하는 값. 평균 약 40 → 45 → 50 → 55
const MARKET={offset:[0,5,10,15]};
// 리그별 경기 경험치 배수 (P10 참가자 결정 2026-11-11): 동네·지역·2부·1부
const LEAGUE_EXP4=[1,1.2,1.4,1.6];
// 리그 5단계 비교 (참가자 아이디어 2026-11-11, 숫자는 Claude 초안 · 시험값): 동네·지역·전국(새로)·2부·1부.
// 상대 중위권은 39~75를 9씩 나누고, 리그별 값은 4단계 값(중위권 39·51·63·75)을 중위권 능력에 따라 직선으로 나눈 값입니다. 경기장 조건은 위 두 리그(2부 2등급·1부 3등급)를 그대로 둡니다.
const LEAGUE5=(()=>{const M4=[39,51,63,75],M5=[39,48,57,66,75];
  const at=(vals,m)=>{for(let i=0;i<3;i++)if(m<=M4[i+1]){const r=(m-M4[i])/(M4[i+1]-M4[i]);return vals[i]+(vals[i+1]-vals[i])*r;}return vals[3];};
  const map=(vals,round)=>M5.map(m=>round(at(vals,m)));const r10=v=>Math.round(v/10)*10,r2=v=>Math.round(v*100)/100;
  return {mids:M5,need:[1,1,1,2,3],exp:map(LEAGUE_EXP4,r2),billboard:map([120,200,350,600],r10),market:{offset:map(MARKET.offset,Math.round)},
    money:{payout:map(LEAGUE_MONEY.payout,r10),prize:M5.map(m=>[0,1,2].map(k=>r10(at(LEAGUE_MONEY.prize.map(p=>p[k]),m)))),crowd:map(LEAGUE_MONEY.crowd,r2)}};})();
// 선수 나이와 노화 (P21 참가자 확정 2026-11-09). ages.p21을 켜면 위 AGES의 임시 입단 나이·하락 대신 이 규칙을 씁니다.
// 새로 생성되는 선수는 19세. 시즌을 마칠 때마다 +1세 후 새 나이로 감소: 30~35세 서로 다른 능력 3개 −2, 36~40세 5개 −3, 41세 이상 10개 모두 −5. 하한 1.
// 추첨 방식은 이전 시뮬레이터(run-economy-legacy-20261109.cjs)의 agePlayer와 같습니다. 은퇴는 P21에 없으므로 ages.retireWish·managerRetire를 그대로 씁니다.
const TEN=[...NINE,'stamina'];
const P21_AGING=Object.freeze({entryAge:19,bands:Object.freeze([[30,3,2],[36,5,3],[41,10,5]]),floor:1});// [이 나이부터, 능력 수, 감소량]
function ageP21(p,rnd,rule=P21_AGING){
  p.age=(p.age??rule.entryAge)+1;
  const band=rule.bands.filter(([from])=>p.age>=from).at(-1);if(!band)return 0;
  const [,count,drop]=band,keys=[...TEN];
  for(let i=0;i<count;i++){const j=i+Math.floor(rnd()*(keys.length-i));[keys[i],keys[j]]=[keys[j],keys[i]];p.a[keys[i]]=Math.max(rule.floor,p.a[keys[i]]-drop);}
  return count*drop;// 예정 감소 총량(하한 1에 걸린 몫 포함)
}
// 입단 나이 보정 (참가자 결정 2026-11-10): 원년·재창단·영입으로 새로 들어오는 선수는 19~26세로 입단하고,
// 서로 다른 능력 3개에 각각 +(나이−19). 유소년 아카데미 유망주는 19세 그대로. ages.entry를 켜면 씁니다.
// 나이는 고르게 뽑고, 대상은 노화와 같은 10개 능력이며 100을 넘지 않습니다(Claude 초안).
const P21_ENTRY=Object.freeze({min:19,max:26,count:3});
// 이슈 #46-14 후보 (Claude 초안 · 시험값, 2026-11-11): 젊은 선수 보너스를 나이 대신 "이 구단에서 몇 번째 시즌인가"로 줍니다.
// [이 시즌까지, 배수]. 19세 입단 선수에게는 지금 나이 표(21세까지 ×1.5, 25세까지 ×1.3)와 같고, 늦게 입단한 선수도 같은 기간을 받습니다.
const TENURE_BONUS=Object.freeze([[3,1.5],[7,1.3],[99,1]]);
function entryP21(p,rnd,rule=P21_ENTRY){
  p.age=rule.min+Math.floor(rnd()*(rule.max-rule.min+1));
  // rule.count: 보정할 능력 수. 숫자이거나, 입단 나이를 받아 개수를 돌려주는 함수(이슈 #46-14 추가 후보)입니다.
  const bonus=p.age-P21_AGING.entryAge,keys=[...TEN],count=typeof rule.count==='function'?Math.min(TEN.length,rule.count(p.age)):rule.count;
  if(bonus>0)for(let i=0;i<count;i++){const j=i+Math.floor(rnd()*(keys.length-i));[keys[i],keys[j]]=[keys[j],keys[i]];p.a[keys[i]]=Math.min(100,p.a[keys[i]]+bonus);}
  return bonus;
}
// reform: 시설·경기장 개편안(P17)을 씁니다. 이때 원정 응원 비율은 awayShare 대신 응원단 버스 단계로 정합니다(P16).
function career(world,policy,{games=60,league=false,contractGames=5,seasons=6,seed=1,growth=null,disband=null,mlb=null,awayShare=0,reform=false,invest=false,leagueNeed=null,leagueMoney=null,mlbOff=false,mids=null,ages=null,market=null,playYoung=0,rebuildRule=null,loyalty=null,mlbBonus=null,
  leagueExp=null,billboard=null,rounds=2,lastStreak=0,shapeLog=false}){
  // 리그 모양 비교(2026-11-11): leagueExp 리그별 경기 경험치 배수(P10), billboard 리그별 광고판 수입, rounds 상대마다 만나는 횟수(2면 10경기, 4면 20경기),
  // lastStreak 동네 리그 연속 6위 추가 여론(P09, 2시즌째부터), shapeLog 순위 동률 기록. 모두 없으면 지금과 같습니다.
  // mlbBonus: 위 MLB_BONUS 중 하나. 없으면 지금과 같습니다. 능력 추첨은 전용 난수를 써서 다른 판단의 난수 흐름을 건드리지 않습니다.
  const bonusRnd=seeded(seed^0x3c1b2d77);
  // loyalty(애정도 수단 시험, 참가자 요청 2026-11-10): 없으면 지금과 같습니다. 아래 값은 모두 Claude 초안 · 시험값입니다.
  //  events: 구단 사건의 애정도 변화(EVENT_LOY)도 반영 · lockerFirst: 라커룸을 다른 시설보다 먼저 짓기
  //  lounge: 선수 가족 라운지(EXTRA_FAC)를 라커룸 다음에 짓기 · tenure: [완료 시즌 수, 시즌 끝 +애정도] 같은 구단 근속 보너스
  //  solidarity: 애정도가 이 값 이상인 선수는 미지급 경기의 애정도 감소가 −8 대신 −4
  if(loyalty&&(loyalty.lockerFirst||loyalty.lounge))policy={...policy,later:[...(loyalty.lockerFirst?['locker']:[]),...(loyalty.lounge?['lounge']:[]),...policy.later.filter(id=>id!=='locker'&&id!=='lounge')]};
  const fdef=id=>REFORM.fac[id]||EXTRA_FAC[id];
  // market: 위 MARKET 같은 리그별 영입 시장. playYoung: 25세 이하 선수를 주전에 이 수만큼 두는 감독(투수 자리 제외).
  // ages: {bonus: 젊은 선수 보너스, capUp: 경기 성장 한도 +5, aware: 나이를 보는 감독, bonusTable·decline·retireAt: AGES 대신 쓸 값}.
  // 넣으면 나이·하락·은퇴(위 AGES)가 함께 켜집니다. ages.p21: 입단 나이와 하락을 P21 확정 규칙(위 P21_AGING)으로 바꿉니다.
  // leagueMoney: 위 LEAGUE_MONEY 같은 리그별 수입. mlbOff: 감독이 MLB에 보내지 않음(게임에서는 이용자 선택). mids: 리그별 상대 평균 능력
  const rnd=seeded(seed),ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
  const ageRnd=seeded(seed^0x5a17e901);// P21 노화 추첨 전용. 다른 판단의 난수 흐름을 건드리지 않습니다.
  const t=world.initialTeam();
  // ages.entryCount: 숫자(보정 능력 수), 'all25'(25세 이상 입단은 10개 모두, 아래는 3개), 'graded'(나이−19개). 없으면 P21_ENTRY의 3개.
  const ENTRY_COUNT={all25:age=>age>=25?TEN.length:P21_ENTRY.count,graded:age=>age-P21_AGING.entryAge};
  const entryRule=!ages?.entryCount?P21_ENTRY:{...P21_ENTRY,count:ENTRY_COUNT[ages.entryCount]||ages.entryCount};
  const enrich=p=>{if(ages&&p.age==null){if(ages.p21&&ages.entry)entryP21(p,ageRnd,entryRule);else p.age=ages.p21?P21_AGING.entryAge:ri(AGES.startAge[0],AGES.startAge[1]);}p.fans=ri(15,85);p.loyalty=ri(45,70);p.salary=Math.max(3,Math.round(price(p)*B.salaryFactor));
    p.ask=Math.max(3,Math.round(price(p)*B.salaryFactor*(1+(50-p.loyalty)/200)));p.contract=contractGames;p.played=0;p.since=0;p.apps=0;return p;};
  t.players.forEach(enrich);
  const club={funds:B.startFunds,debt:0,fac:[],stadium:1,ticket:10,w:0,l:0,d:0,games:0,departures:0,stuck:false,
    flow:{base:0,runs:0,win:0,gate:0,stores:0,salary:0,maintenance:0,training:0,facilities:0,stadium:0,recruit:0,homeNet:0,awayNet:0,homeGames:0,awayGames:0,loanIn:0,loanRepay:0},trainPoints:0,perfPoints:0,
    // 해체 여론·긴급 대출(P09·P14 제안). disband 옵션이 없으면 사용하지 않습니다.
    pressure:disband?disband.start:0,loan:0,loans:0,loanSeason:-1,season:0,forfeits:0,disbands:0,
    // MLB 진출·후원·회생권(P15 제안). mlb 옵션이 없으면 사용하지 않습니다.
    alumni:[],mlbCount:0,mlbFails:0,mlbFee:0,donations:0,donationSum:0,tickets:0,ticketsUsed:0,
    requests:0,refusals:0,requestSum:0,regularSum:0,regularGames:0,
    // 시설 개편안(P17): 시설 단계, 지금 리그 단계, 경기장 때문에 미뤄진 승격 수, 시설별 비용·수입·유지비·보유 경기 수
    lvl:{},lv:0,delays:0,facStats:{},prospects:0,retired:0,retiredWish:0,retiredByManager:0,youngStarts:0,ageLoss:0,rebuildLog:[],bonusLoy:0,bonusAbil:0,bonusPick:{pressure:0,loyalty:0,ability:0}};
  const addPressure=v=>{if(disband)club.pressure=clamp(club.pressure+v,0,100);};
  const has=id=>club.fac.includes(id);
  const stat=id=>club.facStats[id]??={cost:0,inc:0,maint:0,games:0};
  // 개편안 유지비: 훈련 시설은 단계별, 응원단 버스는 원정 경기에만. away가 null이면 홈·원정 평균(예비금 계산용)
  const facMaint=(id,away)=>{const f=fdef(id);if(f.train)return REFORM.trainLevels[club.lvl[id]||1].maint;
    if(f.awayOnly)return away===null?f.maint/2:away?f.maint:0;return f.maint;};
  const maintTotal=away=>reform?club.fac.reduce((s,id)=>s+facMaint(id,away),0):club.fac.length*B.maintenance;
  // 승격에 더 높은 경기장이 필요하면 확장비만큼 따로 모읍니다(개편안). 이 돈은 훈련·시설에 쓰지 않습니다.
  // leagueNeed: 리그별 경기장 조건을 바꿔 시험할 때(예: 조건 없음 [1,1,1,1]). 없으면 개편안 초안.
  const NEED=leagueNeed||REFORM.leagueNeed;
  // 확장비를 다 모은 감독은 오프시즌에 한 경기 비용만 남기고 확장합니다(투자 먼저 감독). 그 외에는 예비금을 남깁니다.
  const keep=()=>invest?fixed():reserve();
  const goal=()=>reform&&NEED[Math.min(3,club.lv+1)]>club.stadium?REFORM.stadiumCost[club.stadium]:0;
  const trainLv=k=>{if(!reform)return null;const id=Object.keys(REFORM.fac).find(id=>REFORM.fac[id].train?.includes(k));return has(id)?REFORM.trainLevels[club.lvl[id]||1]:null;};
  // 나이 보너스를 쓰면 유소년 아카데미의 +30%는 빼고 나이 배수(18~19세 ×1.5)로 대신합니다.
  // ages.bonusBy==='tenure'(이슈 #46-14 후보): 나이 대신 이 구단에서 몇 번째 시즌인지(p.seasons+1)로 보너스를 고릅니다.
  const ageMult=p=>!ages?.bonus||p.age==null?1:ages.bonusBy==='tenure'?(ages.tenureTable||TENURE_BONUS).find(([max])=>(p.seasons||0)+1<=max)[1]
    :(ages.bonusTable||AGES.bonus).find(([max])=>p.age<=max)[1];
  // 나이를 보는 감독(2026-11-10): 훈련은 29세 이하 그대로·30~32세 절반·33세 이상 안 함, 영입은 후보 3명 중 (평균 능력 + 28 − 나이)가 큰 선수
  const trainAgeW=p=>!ages?.aware||p.age==null?1:p.age<=29?1:p.age<=32?.5:0;
  const newRecruit=()=>{const p=world.recruit();const o=market?market.offset[club.lv]||0:0;if(o)for(const k of NINE)p.a[k]=Math.min(100,p.a[k]+o);return p;};
  const pickRecruit=()=>{if(!ages?.aware)return enrich(newRecruit());const c=[0,1,2].map(()=>enrich(newRecruit()));return c.sort((a,b)=>(meanA(b)+28-b.age)-(meanA(a)+28-a.age))[0];};
  const boostFor=p=>(reform||ages||leagueExp)?{mult:k=>(reform&&has('food')?REFORM.foodExp:1)*(trainLv(k)?.exp||1)*(p.prospect&&!ages?.bonus?REFORM.academyExp:1)*ageMult(p)*(leagueExp?leagueExp[club.lv]:1),
    cap:k=>(trainLv(k)?.cap||growth.cap)+(ages?.capUp?AGES.capUp:0)}:null;
  // 긴급 대출: 미지급금 + 모자란 인원 × 가장 싼 영입비(여유 20%). 시즌당 1번, 남은 대출이 있으면 불가.
  function takeLoan(cheapest){
    if(!disband||club.loan>0||club.loanSeason===club.season)return false;
    const amount=Math.round(club.debt+(10-t.players.length)*cheapest*1.2);
    club.funds+=amount;club.flow.loanIn+=amount;club.loan=Math.round(amount*(1+LOAN.interest));club.loans++;club.loanSeason=club.season;
    const pay=Math.min(club.funds,club.debt);club.funds-=pay;club.debt-=pay;addPressure(disband.loan);return true;
  }
  const log=[];
  const fixed=()=>t.players.reduce((s,p)=>s+p.salary,0)+maintTotal(null);
  const reserve=()=>policy.reserveGames*fixed();
  const limit=()=>5+(club.stadium-1)*3;
  const spend=(amount,key)=>{club.funds-=amount;club.flow[key]+=amount;};
  const starters=()=>(t.lineup||[]).map(x=>({p:t.players.find(p=>p.id===x.id),pos:x.pos})).filter(x=>x.p);
  const attendance=ticket=>{const pop=(t.players.reduce((s,p)=>s+p.fans,0)*.3+80)*(leagueMoney?leagueMoney.crowd[club.lv]:1);return Math.round(clamp(pop*(B.ticketBase/ticket)**1.8,0,club.stadium*200));};
  function build(id){const cost=reform?fdef(id).price:B.facilityPrice;
    if(club.fac.includes(id)||club.fac.length>=limit()||club.funds<cost)return false;spend(cost,'facilities');club.fac.push(id);
    if(reform){stat(id).cost+=cost;if(fdef(id).train||id==='bus')club.lvl[id]=1;}return true;}
  // 단계 올리기 비용(개편안): 훈련 시설 1~3단계, 응원단 버스 1~4단계
  const upCost=id=>{const n=(club.lvl[id]||1)+1;return id==='bus'?REFORM.busLevels[n]:REFORM.trainLevels[n]?.add;};
  function upgrade(id){const c=upCost(id);if(!c)return false;spend(c,'facilities');stat(id).cost+=c;club.lvl[id]++;return true;}
  // 경기장 확장(개편안): 오프시즌에만 1등급씩
  function expand(){const c=REFORM.stadiumCost[club.stadium];if(!c)return false;spend(c,'stadium');club.stadium++;return true;}
  policy.start.forEach(build);
  // MLB 도전: 조건을 갖춘 선수 중 평가가 가장 높은 1명이 경기 전 한 번 도전합니다. 성공하면 12명까지 다시 영입합니다.
  function tryMlb(){
    if(!mlb||mlbOff||t.players.length<11)return;
    const c=t.players.filter(p=>p.apps>=MLB.minGames&&p.loyalty>=1&&p.contract>0&&(p.mlbRetryAt||0)<=club.games&&mlbScore(p)>=MLB.minAbility)
      .sort((a,b)=>mlbScore(b)-mlbScore(a))[0];
    if(!c)return;
    const over=mlbScore(c)-MLB.minAbility,chance=Math.min(MLB.maxChance,MLB.baseChance+MLB.perPoint*over);
    if(rnd()<chance){
      const fee=Math.round(MLB.baseFee+MLB.feePerPoint*over);club.funds+=fee;club.mlbFee+=fee;club.mlbCount++;
      club.alumni.push({loyalty:c.loyalty,memory:c.loyalty,fee,donatedSeason:-1,requestedSeason:-1});t.players=t.players.filter(p=>p!==c);
      if(mlb.ticket&&(mlb.ticketAt||[3,10]).includes(club.mlbCount))club.tickets=Math.min(2,club.tickets+1);
      // MLB 진출 보상(후보): 다시 영입하기 전, 남아 있는 선수에게만
      if(mlbBonus){
        let bo=mlbBonus;
        if(bo.choose){const pick=club.pressure>=60?'pressure':t.players.filter(p=>p.loyalty<50).length>=3?'loyalty':'ability';club.bonusPick[pick]++;bo=bo.choose[pick];}
        if(bo.pressure)addPressure(-bo.pressure);
        // players: 이 수만큼 무작위로 고른 선수만 능력 보상(없으면 남은 선수 모두). 애정도 보상은 loyPlayers가 없으면 남은 선수 모두.
        let abilTo=null;if(bo.players&&bo.players<t.players.length){const pool=[...t.players];for(let i=0;i<bo.players;i++){const j=i+Math.floor(bonusRnd()*(pool.length-i));[pool[i],pool[j]]=[pool[j],pool[i]];}
          if(bo.youngest){for(let i=pool.length-1;i>0;i--){const j=Math.floor(bonusRnd()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}pool.sort((a,b)=>(a.age??99)-(b.age??99));}// 가장 어린 선수부터, 같은 나이는 무작위
          abilTo=new Set(pool.slice(0,bo.players));}
        // inherit: 오르는 능력은 MLB로 떠난 선수(c)의 가장 높은 능력(10개 중). 같으면 무작위
        let inheritKey=null;if(bo.inherit){const best=Math.max(...TEN.map(k=>c.a[k])),tops=TEN.filter(k=>c.a[k]===best);inheritKey=tops[Math.floor(bonusRnd()*tops.length)];}
        let loyTo=null;if(bo.loyPlayers&&bo.loyPlayers<t.players.length){const pool=[...t.players];for(let i=0;i<bo.loyPlayers;i++){const j=i+Math.floor(bonusRnd()*(pool.length-i));[pool[i],pool[j]]=[pool[j],pool[i]];}loyTo=new Set(pool.slice(0,bo.loyPlayers));}
        for(const p of t.players){
          if(bo.loyalty&&(!loyTo||loyTo.has(p))){const before=p.loyalty;p.loyalty=clamp(p.loyalty+bo.loyalty,0,100);club.bonusLoy+=p.loyalty-before;}
          if(bo.count&&(!abilTo||abilTo.has(p))){const keys=inheritKey?[inheritKey]:[...(bo.pool==='main'?mainAbilities(p):TEN)];for(let i=0;i<Math.min(bo.count,keys.length);i++){const j=i+Math.floor(bonusRnd()*(keys.length-i));[keys[i],keys[j]]=[keys[j],keys[i]];
            const before=p.a[keys[i]];p.a[keys[i]]=Math.min(100,before+bo.amount);club.bonusAbil+=p.a[keys[i]]-before;}}
        }
      }
      while(t.players.length<12){const p=pickRecruit(),cost=Math.round(price(p)*B.hireFactor);if(club.funds-cost<reserve())break;spend(cost,'recruit');t.players.push(p);}
    }else{c.loyalty=Math.max(0,c.loyalty-MLB.failLoyalty);c.mlbRetryAt=club.games+MLB.retryGames;club.mlbFails++;}
  }
  // MLB 출신 후원: 위기(미지급금·대출 상환 중·여론 60% 이상)일 때 경기 뒤 일정 확률. 진출 당시 애정도가 높을수록 잘 돕습니다.
  function maybeDonate(){
    if(!mlb?.donate||!(club.debt>0||club.loan>0||club.pressure>=60))return;
    const c=club.alumni.filter(a=>a.donatedSeason!==club.season);if(!c.length||rnd()>=mlb.chance)return;
    const total=c.reduce((s,a)=>s+Math.max(5,a.loyalty),0);let x=rnd()*total,a=c[0];for(const y of c){x-=Math.max(5,y.loyalty);if(x<=0){a=y;break;}}
    if(rnd()>=clamp(a.loyalty/70,.3,1))return;// 애정도가 낮았던 선수는 거절할 수 있음
    const amount=Math.round(a.fee*(.2+.2*a.loyalty/100));club.funds+=amount;club.donations++;club.donationSum+=amount;a.donatedSeason=club.season;
    addPressure(-10);for(const p of t.players)p.fans+=5;
  }
  // 참가자 방식(2026-11-10): ① 후원 요청 — 위기 때 감독이 MLB 출신마다 시즌당 1번 요청. 금액은 떠날 때 애정도 구간으로 정하고,
  // 요청할 때마다 그 선수의 기억 애정도 −10. ② 정기 후원 — 아주 힘들 때(여론 90% 이상 또는 대출 중) 애정도 90 이상으로 떠난 선수가 경기마다 이적료의 5%.
  const REQUEST_TIERS=[[90,.4],[70,.3],[50,.2],[30,.1]];
  function requestSupport(){
    if(!mlb?.request||!(club.debt>0||club.loan>0||club.pressure>=60))return;
    for(const a of club.alumni){if(a.requestedSeason===club.season)continue;a.requestedSeason=club.season;
      const share=(REQUEST_TIERS.find(([min])=>a.memory>=min)||[0,0])[1];club.requests++;a.memory=Math.max(0,a.memory-(reform&&has('hall')?REFORM.hallMemory:10));// 명예의 전당: −10 → −5
      if(!share){club.refusals++;continue;}
      const amount=Math.round(a.fee*share);club.funds+=amount;club.requestSum+=amount;club.donations++;addPressure(-5);}
  }
  function regularSupport(){
    if(!mlb?.regular||!(club.pressure>=90||club.loan>0))return;
    for(const a of club.alumni)if(a.loyalty>=90){const amount=Math.round(a.fee*.05);club.funds+=amount;club.regularSum+=amount;club.regularGames++;}
  }
  // invest(투자 먼저): 감독이 계획한 시설 → 단계 올리기 → 경기장 확장 순서로 다음 항목의 돈을 먼저 모으고, 남는 돈으로 훈련합니다.
  // 건물 자리가 없으면 그 시설은 건너뛰고, 경기장을 넓힌 뒤 다시 짓습니다. 개편안의 경기장 확장은 오프시즌에만 합니다.
  function nextPlan(){
    if(!invest)return null;
    for(const id of policy.later)if(!has(id)&&club.fac.length<limit())return {cost:reform?fdef(id).price:B.facilityPrice,act:()=>build(id)};
    if(reform)for(const [id,max] of policy.upgrades||[])if(has(id)&&(club.lvl[id]||1)<max)return {cost:upCost(id),act:()=>upgrade(id)};
    if(club.stadium<policy.stadiumMax)return reform?{cost:REFORM.stadiumCost[club.stadium],stadium:true,act:expand}
      :{cost:club.stadium*2500,stadium:true,act:()=>{spend(club.stadium*2500,'stadium');club.stadium++;}};
    return null;
  }
  const planGoal=()=>{const p=nextPlan();return !p||(p.stadium&&goal()>0)?0:p.cost;};// 승격용 확장비와 겹치면 한 번만
  function manage(){
    tryMlb();
    if(invest){
      for(let guard=0;guard<20;guard++){const p=nextPlan();if(!p||(p.stadium&&reform)||club.funds-p.cost<reserve()+goal())break;p.act();}
    }else if(reform){
      // 개편안: 시설은 순서대로, 단계 올리기는 목록 순서대로 한 단계씩. 경기장 확장은 오프시즌에만(리그 반복문).
      for(const id of policy.later)if(!has(id)&&club.funds-fdef(id).price>=reserve()+fixed()+goal())build(id);
      for(const [id,max] of policy.upgrades||[])if(has(id)&&(club.lvl[id]||1)<max&&club.funds-upCost(id)>=reserve()+fixed()+goal())upgrade(id);
    }else{
      for(const id of policy.later)if(!club.fac.includes(id)&&club.funds-B.facilityPrice>=reserve()+fixed())build(id);
      if(club.stadium<policy.stadiumMax&&club.funds-club.stadium*2500>=reserve()+fixed()){spend(club.stadium*2500,'stadium');club.stadium++;}
    }
    // 훈련: 출전 선수의 (능력 가중치 ÷ 훈련비)가 가장 큰 능력부터 +1. 예비금(+모으는 확장비) 아래로는 쓰지 않습니다.
    const open=new Set(club.fac.flatMap(id=>reform?fdef(id).train||[]:FAC[id]||[]));
    for(let n=0;n<400;n++){
      let best=null;
      for(const {p,pos} of starters()){const w=weights(pos);for(const [k,wt] of Object.entries(w)){if(!open.has(k)||wt<=0)continue;
        const cap=k==='stamina'?B.staminaCap:100;if(p.a[k]>=cap)continue;const c=Math.round(tier(p.a[k])*B.trainingFactor*(1-(trainLv(k)?.disc||0)));if(!c)continue;
        const v=wt/c*trainAgeW(p);if(v<=0)continue;if(!best||v>best.v)best={p,k,c,v};}}
      if(!best||club.funds-best.c<reserve()+goal()+planGoal())break;
      spend(best.c,'training');best.p.a[best.k]++;club.trainPoints++;
    }
    // 입장료: 관중×(입장료+매장 수) 최대값을 고릅니다. 개편안은 관중×(입장료×(1+원정 응원 비율)+음식점) 최대값.
    const stores=club.fac.filter(id=>STORES.includes(id)).length;let bestT=10,bestV=-1;
    const share=reform&&has('bus')?REFORM.busShare*club.lvl.bus:0,rest=reform&&has('restaurant')?REFORM.restaurantPerCrowd:0;
    for(let tk=1;tk<=50;tk++){const v=reform?attendance(tk)*(tk*(1+share)+rest):attendance(tk)*(tk+stores);if(v>bestV){bestV=v;bestT=tk;}}club.ticket=bestT;
  }
  // 젊은 선수 출전 감독: 주전 야수 중 25세 초과로 가장 약한 자리에, 후보 중 가장 좋은 25세 이하 선수를 넣어 playYoung명을 맞춥니다.
  function forceYoung(){
    const ids=new Set(t.lineup.map(x=>x.id)),find=id=>t.players.find(q=>q.id===id);
    const bench=t.players.filter(p=>!ids.has(p.id)&&p.age<=25).sort((a,b)=>meanA(b)-meanA(a));
    let need=playYoung-t.lineup.filter(x=>x.pos!=='P'&&find(x.id)?.age<=25).length;
    const slots=t.lineup.map((x,i)=>({x,i,p:find(x.id)})).filter(o=>o.p&&o.x.pos!=='P'&&o.p.age>25).sort((a,b)=>meanA(a.p)-meanA(b.p));
    for(const o of slots){if(need<=0||!bench.length)break;t.lineup[o.i]={...o.x,id:bench.shift().id};need--;club.youngStarts++;}
  }
  function renew(){for(const p of t.players){if(p.contract>0)continue;
    const usage=club.games-p.since?clamp(p.played/(club.games-p.since),0,1):0,base=Math.max(3,price(p)*B.salaryFactor);
    p.ask=clamp(Math.round(base*(.85+.3*usage)),Math.max(3,Math.ceil(p.ask*.8)),Math.min(10000,Math.floor(p.ask*1.2)));
    p.salary=p.ask;p.contract=contractGames;p.played=0;p.since=club.games;}}
  function replaceDeparted(){
    while(t.players.length<10){const cands=[0,1,2].map(()=>{const p=newRecruit();return enrich(p);}).sort((a,b)=>price(a)-price(b));
      const p=cands[0],cost=Math.round(price(p)*B.hireFactor);if(club.funds<cost)takeLoan(cost);if(club.funds<cost){club.stuck=true;return;}spend(cost,'recruit');t.players.push(p);}
  }
  // 재창단 (P09 제안): 애정도 70 이상 중 최대 3명만 남기고, 새 시작 선수로 12명. 자금·시설·경기장·빚 초기화.
  // rebuildRule(재창단 세부 비교, 이슈 #46-4): keepMax·keepLoyalty(남는 선수 수·기준), keepStadium(경기장 등급 유지), restart(여론 재시작 값).
  // 없으면 위 초안 그대로이고, 있으면 재창단마다 남은 인원을 기록합니다.
  function rebuild(){
    const R={keepMax:3,keepLoyalty:70,keepStadium:false,restart:disband.restart,...(rebuildRule||{})};
    const keep=t.players.filter(p=>p.loyalty>=R.keepLoyalty).sort((a,b)=>b.loyalty-a.loyalty).slice(0,R.keepMax);
    if(rebuildRule)club.rebuildLog.push({season:club.season+1,kept:keep.length,loy70:t.players.filter(p=>p.loyalty>=70).length,
      loy50:t.players.filter(p=>p.loyalty>=50).length,stadium:club.stadium,keptMean:keep.length?keep.reduce((a,p)=>a+meanA(p),0)/keep.length:null});
    keep.forEach(p=>{p.contract=contractGames;});
    const newcomers=world.initialTeam().players.slice(0,12-keep.length).map(enrich);
    t.players=[...keep,...newcomers];t.lineup=world.autoLineup(t.players);
    Object.assign(club,{funds:B.startFunds,debt:0,loan:0,fac:[],stadium:R.keepStadium?club.stadium:1,ticket:10,stuck:false,pressure:R.restart,lvl:{},lv:0});
    policy.start.forEach(build);
  }
  function playOne(opp,home){
    // 이적 뒤에도 빈 자리가 없게, 훈련 전과 훈련 뒤 모두 자동 편성을 다시 합니다.
    renew();t.lineup=world.autoLineup(t.players);manage();
    t.lineup=world.autoLineup(t.players);
    if(playYoung&&ages)forceYoung();
    const g=world.playGame(t,opp,home,ri(1,2**31-1));
    // playGame은 경기 시작 때 기록을 새로 만들므로 p.stats는 이번 경기 기록입니다.
    if(growth)for(const x of t.lineup){const p=t.players.find(p=>p.id===x.id);if(p)club.perfPoints+=gainExp(p,x.pos,p.stats,growth,boostFor(p));}
    const win=g.result==='W',crowd=attendance(club.ticket),stores=club.fac.filter(id=>STORES.includes(id)).length;
    let gate=home===0?crowd*club.ticket:0,shop=home===0?crowd*stores:0;
    // 원정 응원 관객 입장료: 홈경기 기준 우리 관객 수 × 원정 비율 × 우리 입장료. 매장 수입은 홈에서만.
    let awayGate=home===0?0:Math.round(crowd*awayShare)*club.ticket;
    if(reform){
      // 개편안 수입: 원정 응원은 버스 단계로, 유니폼 매장(개인 팬 합계)·음식점(관중)은 홈에서만, 광고판은 매 경기 리그별 고정
      const share=has('bus')?REFORM.busShare*club.lvl.bus:0;awayGate=home===0?0:Math.round(crowd*share)*club.ticket;
      const part={uniform:has('uniform')&&home===0?Math.round(t.players.reduce((s,p)=>s+p.fans,0)*REFORM.uniformPerFan):0,
        restaurant:has('restaurant')&&home===0?crowd*REFORM.restaurantPerCrowd:0,billboard:has('billboard')?(billboard||REFORM.billboard)[club.lv]:0,bus:awayGate};
      shop=part.uniform+part.restaurant+part.billboard;
      for(const id of club.fac){const s=stat(id);s.inc+=part[id]||0;s.maint+=facMaint(id,home!==0);s.games++;}
    }
    const inc={base:B.baseReward,runs:g.score[0]*B.runReward,win:win?B.winReward:0,gate,stores:shop,awayGate,league:leagueMoney?leagueMoney.payout[club.lv]:0};
    club.flow.league??=0;
    club.flow.awayGate??=0;
    for(const [k,v] of Object.entries(inc)){club.funds+=v;club.flow[k]+=v;}
    const salary=t.players.reduce((s,p)=>s+p.salary,0),maint=maintTotal(home!==0),due=salary+maint+club.debt,paid=Math.min(club.funds,due);
    const net=Object.values(inc).reduce((a,v)=>a+v,0)-salary-maint;club.flow[home===0?'homeNet':'awayNet']+=net;club.flow[home===0?'homeGames':'awayGames']++;
    club.funds-=paid;club.flow.salary+=Math.min(paid,salary);club.flow.maintenance+=Math.max(0,Math.min(paid-salary,maint));club.debt=due-paid;
    // 대출 상환: 급여·유지비를 낸 뒤 남은 돈에서 이번 경기 수입의 30%까지.
    if(club.loan>0&&club.funds>0){const pay=Math.min(club.loan,club.funds,Math.round(Object.values(inc).reduce((a,v)=>a+v,0)*LOAN.repayShare));club.funds-=pay;club.loan-=pay;club.flow.loanRepay+=pay;}
    if(win)club.w++;else if(g.result==='L')club.l++;else club.d++;club.games++;
    // 개편안: 애정도 +1은 라커룸 하나뿐, 팬 +2는 팬 만남 광장
    const welfare=reform?(has('locker')?1:0)+(has('lounge')?1:0):club.fac.filter(id=>WELFARE.includes(id)).length,inLineup=new Set(t.lineup.map(x=>x.id));
    const plaza=reform?has('fanplaza'):club.fac.includes('fans');
    const unpaidLoss=p=>club.debt?(loyalty?.solidarity!=null&&p.loyalty>=loyalty.solidarity?4:8):0;
    for(const p of t.players){p.loyalty=clamp(p.loyalty+welfare-unpaidLoss(p),0,100);p.contract=Math.max(0,p.contract-1);if(inLineup.has(p.id)){p.played++;p.apps=(p.apps||0)+1;}
      p.fans=Math.max(0,p.fans+(win?3:0)+(plaza?2:0));}
    if(rnd()<B.fanEventChance){const p=t.players[ri(0,t.players.length-1)],e=ri(0,9);p.fans=Math.max(0,p.fans+EVENT_FANS[e]);
      if(loyalty?.events)p.loyalty=clamp(p.loyalty+EVENT_LOY[e],0,100);}
    const gone=t.players.filter(p=>p.loyalty<=0);if(gone.length){club.departures+=gone.length;t.players=t.players.filter(p=>p.loyalty>0);replaceDeparted();}
    return g;
  }
  const snapshot=extra=>{const s=starters().filter(x=>x.p);return {games:club.games,funds:club.funds,debt:club.debt,w:club.w,l:club.l,d:club.d,
    starterMean:s.reduce((a,x)=>a+meanA(x.p),0)/s.length,salary:t.players.reduce((a,p)=>a+p.salary,0),fixed:fixed(),ticket:club.ticket,
    stadium:club.stadium,facilities:club.fac.length,trainPoints:club.trainPoints,perfPoints:club.perfPoints,departures:club.departures,stuck:club.stuck,
    ...(mlbBonus?{bonusLoy:club.bonusLoy,bonusAbil:club.bonusAbil,...(mlbBonus.choose?{bonusPick:{...club.bonusPick}}:{})}:{}),
    ...(ages?{ageMean:s.reduce((a,x)=>a+x.p.age,0)/s.length,retired:club.retired,retiredWish:club.retiredWish,retiredByManager:club.retiredByManager,oldest:Math.max(...t.players.map(p=>p.age)),youngStarters:s.filter(x=>x.p.age<=25).length,youngStarts:club.youngStarts,...(ages.p21?{ageLoss:club.ageLoss}:{})}:{}),
    ...(loyalty?{loyMean:t.players.reduce((a,p)=>a+p.loyalty,0)/t.players.length,loy70:t.players.filter(p=>p.loyalty>=70).length,loy50:t.players.filter(p=>p.loyalty>=50).length}:{}),...extra};};
  if(!league){
    let w10=0;
    for(let i=0;i<games&&!club.stuck;i++){const level=Math.floor(club.w/5)+ri(-1,1);const g=playOne(world.botTeam(level,'dh'),i%2);if(g.result==='W')w10++;
      if((i+1)%10===0){log.push(snapshot({winRate10:w10/10}));w10=0;}}
  }else{
    // 제안 리그: 6팀, 상대 5팀과 홈·원정 1번씩(우리 10경기), 가상 팀끼리도 2번씩. 1위 승격, 6위 강등.
    // rounds=4면 상대마다 홈·원정 2번씩(20경기). 단계 수는 mids 길이(4 또는 5)이고 TOP이 맨 위 리그입니다.
    const MIDS=mids||[39,51,63,75],OFFS=[6,3,0,-3,-6],TOP=MIDS.length-1;let lv=0;
    for(let s=0;s<seasons&&(disband||!club.stuck);s++){
      club.season=s;
      // 해체 규칙을 쓰면 시즌 시작 때 다시 인원을 채워 봅니다(새 시즌에는 대출을 다시 받을 수 있음).
      if(disband&&t.players.length<10){club.stuck=false;replaceDeparted();}
      club.lv=lv;
      if(ages&&s>0){
        // 나이: 시즌마다 +1세 후 능력 하락. ages.p21이면 P21 확정 규칙, 아니면 임시 가정(33세부터 하락·37세 은퇴 등).
        // 은퇴한 자리는 예비금 안에서 12명까지 다시 영입합니다.
        if(ages.bonusBy==='tenure')for(const p of t.players)p.seasons=(p.seasons||0)+1;
        if(ages.p21)for(const p of t.players)club.ageLoss+=ageP21(p,ageRnd);
        else for(const p of t.players){p.age++;const d=((ages.decline||AGES.decline).filter(([from])=>p.age>=from).at(-1)||[0,0])[1];if(d)for(const k of [...NINE,'stamina'])p.a[k]=Math.max(20,p.a[k]-d);}
        // 은퇴: retireAt이 있으면 그 나이에 은퇴(이전 시험). null이면 정해진 나이 없이 ① 선수가 원할 때(retireWish: [이 나이부터, 시즌 끝 확률])
        // ② 나이를 보는 감독이 시킬 때(managerRetire: 35세 이상 후보 선수, 38세 이상 선수)만 은퇴합니다(참가자 결정 2026-11-10).
        const ra=ages.retireAt===undefined?AGES.retireAt:ages.retireAt,wish=ages.retireWish||null,inLineup=new Set((t.lineup||[]).map(x=>x.id));
        t.players=t.players.filter(p=>{
          if(ra&&p.age>=ra){club.retired++;return false;}
          const w=wish?((wish.filter(([a])=>p.age>=a).at(-1)||[0,0])[1]):0;
          if(w&&rnd()<w){club.retired++;club.retiredWish++;return false;}
          if(ages.aware&&ages.managerRetire&&p.age>=35&&(!inLineup.has(p.id)||p.age>=38)){club.retired++;club.retiredByManager++;return false;}
          return true;});
        if(t.players.length<10){club.stuck=false;replaceDeparted();}
        while(t.players.length<12){const p=pickRecruit(),cost=Math.round(price(p)*B.hireFactor);if(club.funds-cost<reserve())break;spend(cost,'recruit');t.players.push(p);}
      }
      if(reform&&s>0){
        // 오프시즌 경기장 확장: 다음 승격에 필요하면(모은 돈으로) 또는 감독이 계획한 등급까지 여유가 있으면 1등급
        const need=NEED[Math.min(TOP,lv+1)],c=REFORM.stadiumCost[club.stadium];
        if(c&&((need>club.stadium&&club.funds-c>=keep())||(club.stadium<policy.stadiumMax&&club.funds-c>=(invest?keep():reserve()+fixed()))))expand();
        // 유소년 아카데미: 시즌마다 무료 유망주 1명(능력 −5, 경기 경험치 +30%)
        if(has('academy')&&t.players.length<REFORM.academyMax){const p=world.recruit();for(const k of NINE)p.a[k]=Math.max(20,p.a[k]-5);if(ages)p.age=ages.p21?P21_AGING.entryAge:ri(AGES.prospectAge[0],AGES.prospectAge[1]);enrich(p);p.prospect=true;t.players.push(p);club.prospects++;}
      }
      const ais=OFFS.map((off,i)=>{const o=world.botTeam((MIDS[lv]+off-43.5)/4,'dh','AI'+i);for(const p of o.players)for(const k of NINE)p.a[k]=Math.round(p.a[k]);return {o,pts:0};});
      let ours=0,forfeits=0;
      // 홈·원정이 번갈아 오도록 상대마다 첫 경기 장소를 엇갈리게 배정합니다.
      for(let r=0;r<rounds;r++)for(const [i,ai] of ais.entries()){
        if(club.stuck){if(!disband)break;ai.pts+=1;club.l++;forfeits++;club.forfeits++;addPressure(disband.loss);continue;}// 부전패
        const g=playOne(ai.o,(i+r)%2);const pts=g.result==='W'?1:g.result==='D'?.5:0;ours+=pts;ai.pts+=1-pts;
        if(disband){addPressure(g.result==='W'?disband.win:g.result==='L'?disband.loss:0);if(club.debt>0)addPressure(disband.unpaid);}
        maybeDonate();requestSupport();regularSupport();
      }
      for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)for(let r=0;r<rounds;r++){const g=world.playGame(ais[i].o,ais[j].o,r%2,ri(1,2**31-1),{boneheads:false});
        const pts=g.result==='W'?1:g.result==='D'?.5:0;ais[i].pts+=pts;ais[j].pts+=1-pts;}
      // 순위 동률 기록(shapeLog): 우리가 1위·6위 자리에서 다른 팀과 승점이 같았는지. 난수를 쓰지 않습니다.
      const allPts=[ours,...ais.map(a=>a.pts)],ptsTop=Math.max(...allPts),ptsBot=Math.min(...allPts);
      const tieFirst=ours===ptsTop&&allPts.filter(x=>x===ptsTop).length>1,tieLast=ours===ptsBot&&allPts.filter(x=>x===ptsBot).length>1;
      const table=[{pts:ours+rnd()*1e-3,us:true},...ais.map(a=>({pts:a.pts+rnd()*1e-3}))].sort((a,b)=>b.pts-a.pts);
      const rank=table.findIndex(x=>x.us)+1;const tierBefore=lv;let delayed=false;
      // 순위 상금(후보): 이번 시즌 리그의 1~3위
      if(leagueMoney){const pz=leagueMoney.prize[lv][rank-1]||0;if(pz){club.funds+=pz;club.flow.prize=(club.flow.prize||0)+pz;}}
      if(rank===1&&lv<TOP&&reform&&NEED[lv+1]>club.stadium){
        // 개편안: 승격에 경기장 등급이 모자라면 이번 오프시즌에 확장할 기회. 못 하면 승격이 한 시즌 미뤄집니다.
        const c=REFORM.stadiumCost[club.stadium];
        if(NEED[lv+1]-club.stadium===1&&club.funds-c>=keep()){expand();lv++;}else{delayed=true;club.delays++;}
      }else if(rank===1&&lv<TOP)lv++;else if(rank===6&&lv>0)lv--;
      club.lv=lv;
      // 근속 보너스(loyalty.tenure): 시즌이 끝날 때 완료 시즌 수 +1, 기준 이상이면 해체 판정 전에 애정도 +
      if(loyalty?.tenure)for(const p of t.players){p.tenure=(p.tenure||0)+1;if(p.tenure>=loyalty.tenure[0])p.loyalty=clamp(p.loyalty+loyalty.tenure[1],0,100);}
      let disbanded=false,pressureEnd=null;
      if(disband){
        addPressure(disband.rank[rank-1]);
        // 동네 리그 연속 6위(P09 참가자 결정 2026-11-11): 2시즌째부터 매 시즌 +lastStreak. 동네 리그 6위가 아니면 다시 셉니다.
        if(lastStreak){club.last6=tierBefore===0&&rank===6?(club.last6||0)+1:0;if(club.last6>=2){addPressure(lastStreak);club.streakHits=(club.streakHits||0)+1;}}
        if(club.loan>0)addPressure(disband.loanAtSeasonEnd);
        if(reform&&has('hall'))addPressure(REFORM.hallPressure);// 명예의 전당: 시즌 끝 여론 −5%p
        pressureEnd=club.pressure;
        // 구단 회생권(P15): 해체 판정 때 1장을 써서 막고 여론을 70%로 내립니다.
        if(club.pressure>=100&&mlb?.ticket&&club.tickets>0){club.tickets--;club.ticketsUsed++;club.pressure=70;}
        else if(club.pressure>=100){disbanded=true;club.disbands++;rebuild();lv=0;club.last6=0;}
      }
      log.push(snapshot({season:s+1,tier:tierBefore,rank,points:ours,nextTier:lv,forfeits,pressureEnd,disbanded,loanLeft:club.loan,...(shapeLog?{tieFirst,tieLast,streakHits:club.streakHits||0}:{}),loans:club.loans,disbands:club.disbands,
        mlbCount:club.mlbCount,mlbFails:club.mlbFails,mlbFee:club.mlbFee,donations:club.donations,donationSum:club.donationSum,tickets:club.tickets,ticketsUsed:club.ticketsUsed,
        requests:club.requests,refusals:club.refusals,requestSum:club.requestSum,regularSum:club.regularSum,regularGames:club.regularGames,
        alumni:club.alumni.length,alumni90:club.alumni.filter(a=>a.loyalty>=90).length,alumniLoyalty:club.alumni.map(a=>a.loyalty),
        flow:{...club.flow},// 수입·지출 항목별 누적 금액
        ...(rebuildRule&&disbanded?{rebuild:{...club.rebuildLog.at(-1)}}:{}),
        ...(reform?{delayed,delays:club.delays,fac:[...club.fac],lvl:{...club.lvl},prospects:club.prospects,facStats:JSON.parse(JSON.stringify(club.facStats))}:{})}));
    }
  }
  return {log,flow:club.flow};
}

function median(a){const s=[...a].sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:NaN;}
const TIER=['동네','지역','2부','1부'];
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
// 해체 여론·긴급 대출·재창단 비교: 제안 리그 10시즌, 경기 성장 K=10(결정값), 돈 규칙 그대로.
// node tests/run-economy-sim.cjs 20 결과.json disband
function mainDisband(n,out){
  const started=Date.now(),world=createWorld(20261110),seasons=10,growth={K:10,cap:80};
  const report={version:'2026-11-10-disband-v01',clubsPerCell:n,seasons,growth,loan:LOAN,settings:DISBAND,results:{}};
  for(const [dk,set] of Object.entries(DISBAND))for(const [pk,pol] of Object.entries(POLICIES)){
    const runs=[];for(let i=0;i<n;i++)runs.push(career(world,pol,{league:true,contractGames:10,seasons,seed:9100+i*17,growth,disband:set}));
    report.results[dk+':'+pk]=runs.map(r=>r.log);
    const last=runs.map(r=>r.log.at(-1)),firsts=runs.map(r=>r.log.find(l=>l.disbanded)?.season).filter(Boolean);
    const pAt=s=>median(runs.map(r=>r.log[s]?.pressureEnd).filter(x=>x!=null));
    console.log('\n[여론 '+set.name+'] '+pol.name);
    console.log(' 해체 1번 이상:',Math.round(100*firsts.length/n)+'% 구단',firsts.length?'· 첫 해체 중앙값 '+median(firsts)+'시즌':'',
      '· 구단당 해체',(last.reduce((a,l)=>a+l.disbands,0)/n).toFixed(2)+'번');
    console.log(' 긴급 대출: 받은 구단',Math.round(100*last.filter(l=>l.loans>0).length/n)+'%','· 구단당',(last.reduce((a,l)=>a+l.loans,0)/n).toFixed(2)+'번',
      '· 부전패 경기 구단당',(runs.reduce((a,r)=>a+r.log.reduce((b,l)=>b+l.forfeits,0),0)/n).toFixed(1));
    console.log(' 시즌 끝 여론(중앙값) 3·6·10시즌:',pAt(2),'/',pAt(5),'/',pAt(9),
      '· 10시즌 뒤 리그 동네/지역/2부/1부:',[0,1,2,3].map(x=>Math.round(100*last.filter(l=>l.nextTier===x).length/n)+'%').join('/'),
      '· 자금 중앙값',Math.round(median(last.map(l=>l.funds))));
  }
  report.seconds=Math.round((Date.now()-started)/1000);console.log('\n소요 시간',report.seconds,'초');
  if(out)fs.writeFileSync(out,JSON.stringify(report,null,1)+'\n');
}
// 재창단 세부 비교 (이슈 #46-4, 2026-11-10): 지금 결정된 묶음(개편안 v03·리그별 수입 P19·영입 시장 P20·P21 나이, 투자 먼저 감독) 위에서
// 남는 선수 수·기준, 경기장 등급 유지, 여론 재시작 값만 바꿉니다. 구단들이 한 world의 난수를 차례로 이어 쓰므로,
// 안마다 똑같은 것은 처음 해체되는 구단까지이고 그 뒤 구단들은 서로 다른 표본입니다(안끼리 짝지은 비교가 아님).
// node tests/run-economy-sim.cjs 20 결과.json rebuild [시즌 수=15] [aggressive|normal|thrifty, 생략하면 셋 다]
function mainRebuild(n,out,seasons=15,only=null){
  const started=Date.now();
  const AG={bonus:false,capUp:false,aware:true,p21:true,retireAt:null,retireWish:[[35,.1],[36,.2],[37,.35],[38,.5],[39,.65],[40,.8]],managerRetire:true};
  const base={league:true,contractGames:10,seasons,growth:{K:10,cap:80},disband:DISBAND.base,mlb:{request:true,regular:true,ticket:true,ticketAt:[1]},
    reform:true,invest:true,leagueMoney:LEAGUE_MONEY,market:MARKET,ages:AG};
  const VARIANTS={
    draft:{name:'초안: 애정도 70 이상 최대 3명 · 경기장 1등급 · 여론 20%',rule:{}},
    keep0:{name:'남는 선수 없음',rule:{keepMax:0}},
    keep5:{name:'애정도 50 이상 최대 5명',rule:{keepMax:5,keepLoyalty:50}},
    stadium:{name:'초안 + 경기장 등급 유지',rule:{keepStadium:true}},
    restart30:{name:'초안 + 여론 30%(새 구단과 같음)에서 다시 시작',rule:{restart:30}},
  };
  const pols=only?[only]:Object.keys(REFORM_POLICIES);
  const report={version:'2026-11-10-rebuild-v01',clubsPerCell:n,seasons,policies:pols,settings:{...base,disband:'base'},variants:{},results:{},summary:{}};
  const pct=(a,b)=>b?Math.round(100*a/b)+'%':'-';
  for(const pk of pols)for(const [vk,v] of Object.entries(VARIANTS)){
    const world=createWorld(20261115),runs=[];
    for(let i=0;i<n;i++)runs.push(career(world,REFORM_POLICIES[pk],{...base,rebuildRule:v.rule,seed:16000+i*31}));
    const key=pk+':'+vk;report.variants[key]=REFORM_POLICIES[pk].name+' · '+v.name;report.results[key]=runs.map(r=>r.log);
    const logs=runs.map(r=>r.log),last=logs.map(l=>l.at(-1)),rb=logs.flatMap(l=>l.filter(e=>e.disbanded).map(e=>e.rebuild));
    // 첫 재창단 뒤: 다시 지역 리그로 올라가기까지 걸린 시즌, 다시 해체됐는지
    const after=logs.map(l=>{const i=l.findIndex(e=>e.disbanded);if(i<0)return null;const rest=l.slice(i+1);
      const up=rest.findIndex(e=>e.nextTier>=1);return {left:rest.length,up:up<0?null:up+1,again:rest.some(e=>e.disbanded)};}).filter(Boolean);
    const avg=f=>rb.length?rb.reduce((a,x)=>a+f(x),0)/rb.length:null;
    const sum={disbandedClubs:after.length/n,disbandsPerClub:last.reduce((a,e)=>a+e.disbands,0)/n,rebuilds:rb.length,
      keptMean:avg(x=>x.kept),keptAny:avg(x=>x.kept>0?1:0),loy70Mean:avg(x=>x.loy70),loy50Mean:avg(x=>x.loy50),
      upAgain:after.filter(x=>x.up!=null).length,upMedian:median(after.filter(x=>x.up!=null).map(x=>x.up)),again:after.filter(x=>x.again).length,
      distEnd:[0,1,2,3].map(x=>pct(last.filter(e=>e.nextTier===x).length,n)).join('/'),first3:logs.filter(l=>l.some(e=>e.nextTier>=3)).length/n,
      fundsEnd:Math.round(median(last.map(e=>e.funds)))};
    report.summary[key]=sum;
    console.log('\n['+REFORM_POLICIES[pk].name+'] '+v.name);
    console.log(' 해체 1번 이상',pct(after.length,n),'· 구단당 해체',sum.disbandsPerClub.toFixed(2)+'번 · 재창단',rb.length+'번',
      rb.length?'· 남은 선수 평균 '+sum.keptMean.toFixed(1)+'명 (1명 이상 남은 재창단 '+pct(rb.filter(x=>x.kept>0).length,rb.length)+') · 해체 순간 애정도 70 이상 '+sum.loy70Mean.toFixed(1)+'명 / 50 이상 '+sum.loy50Mean.toFixed(1)+'명':'');
    console.log(' 첫 재창단 뒤: 다시 지역 승격',after.length?sum.upAgain+'/'+after.length+'구단 (중앙값 '+sum.upMedian+'시즌)':'-','· 다시 해체',after.length?sum.again+'/'+after.length+'구단':'-',
      '·',seasons+'시즌 뒤 리그 동네/지역/2부/1부',sum.distEnd,'· 1부 도달',pct(sum.first3*n,n),'· 자금 중앙값',sum.fundsEnd);
  }
  report.seconds=Math.round((Date.now()-started)/1000);console.log('\n소요 시간',report.seconds,'초');
  if(out)fs.writeFileSync(out,JSON.stringify(report,null,1)+'\n');
}
// 애정도 수단 비교 (참가자 요청 2026-11-10: 재창단 잔류 기준 애정도 70은 그대로 두고, 애정도를 올릴 시설·이벤트를 넣어 보기).
// 결정된 묶음(개편안 v03·리그별 수입·영입 시장·P21 나이와 입단 보정, 투자 먼저 감독)에 재창단 초안(70 이상 최대 3명)을 기록합니다.
// 구단마다 따로 만든 world를 쓰므로 안끼리 같은 구단을 짝지어 비교합니다.
// node tests/run-economy-sim.cjs 20 결과.json loyalty [시즌 수=12] [aggressive|normal|thrifty, 생략하면 셋 다]
function mainLoyalty(n,out,seasons=12,only=null){
  const started=Date.now();
  const AG={bonus:false,capUp:false,aware:true,p21:true,entry:true,retireAt:null,retireWish:[[35,.1],[36,.2],[37,.35],[38,.5],[39,.65],[40,.8]],managerRetire:true};
  const base={league:true,contractGames:10,seasons,growth:{K:10,cap:80},disband:DISBAND.base,mlb:{request:true,regular:true,ticket:true,ticketAt:[1]},
    reform:true,invest:true,leagueMoney:LEAGUE_MONEY,market:MARKET,ages:AG,rebuildRule:{}};
  const VARIANTS={
    none:{name:'지금 시뮬레이터 (구단 사건의 애정도 변화 없음)',loyalty:null},
    events:{name:'구단 사건의 애정도 변화 반영 (지금 게임 규칙)',loyalty:{events:true}},
    locker:{name:'+ 라커룸을 가장 먼저 짓는 감독',loyalty:{events:true,lockerFirst:true}},
    lounge:{name:'+ 라커룸 먼저 + 새 시설 선수 가족 라운지(경기 후 +1 추가)',loyalty:{events:true,lockerFirst:true,lounge:true}},
    tenure:{name:'+ 라커룸 먼저 + 근속 보너스(3시즌째부터 시즌 끝 +5)',loyalty:{events:true,lockerFirst:true,tenure:[3,5]}},
    solidarity:{name:'+ 라커룸 먼저 + 위기 결속(애정도 60 이상은 미지급 감소 −4)',loyalty:{events:true,lockerFirst:true,solidarity:60}},
  };
  const pols=only?[only]:Object.keys(REFORM_POLICIES);
  const report={version:'2026-11-10-loyalty-v01',clubsPerCell:n,seasons,policies:pols,settings:{...base,disband:'base'},extraFacilities:EXTRA_FAC,eventLoyalty:EVENT_LOY,variants:{},results:{},summary:{}};
  const pct=(a,b)=>b?Math.round(100*a/b)+'%':'-',mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;
  for(const pk of pols)for(const [vk,v] of Object.entries(VARIANTS)){
    const runs=[];
    for(let i=0;i<n;i++)runs.push(career(createWorld(20261120+i),REFORM_POLICIES[pk],{...base,loyalty:v.loyalty,seed:16000+i*31}));
    const key=pk+':'+vk;report.variants[key]=REFORM_POLICIES[pk].name+' · '+v.name;report.results[key]=runs.map(r=>r.log);
    const logs=runs.map(r=>r.log),last=logs.map(l=>l.at(-1)),rows=logs.flat(),rb=rows.filter(e=>e.disbanded).map(e=>e.rebuild);
    const sum={disbandedClubs:logs.filter(l=>l.some(e=>e.disbanded)).length/n,disbandsPerClub:mean(last.map(e=>e.disbands)),rebuilds:rb.length,
      rebuildLoy70:mean(rb.map(x=>x.loy70)),rebuildKept:mean(rb.map(x=>x.kept)),rebuildKeptAny:mean(rb.map(x=>x.kept>0?1:0)),
      seasonLoy70:rows[0]?.loy70!=null?mean(rows.map(e=>e.loy70)):null,seasonLoyMean:rows[0]?.loyMean!=null?mean(rows.map(e=>e.loyMean)):null,
      departures:mean(last.map(e=>e.departures)),distEnd:[0,1,2,3].map(x=>pct(last.filter(e=>e.nextTier===x).length,n)).join('/'),fundsEnd:Math.round(median(last.map(e=>e.funds)))};
    report.summary[key]=sum;
    console.log('\n['+REFORM_POLICIES[pk].name+'] '+v.name);
    console.log(' 해체 1번 이상',pct(sum.disbandedClubs*n,n),'· 구단당 해체',sum.disbandsPerClub.toFixed(2)+'번 · 재창단',rb.length+'번',
      rb.length?'· 해체 순간 애정도 70 이상 '+sum.rebuildLoy70.toFixed(1)+'명 · 남은 선수 '+sum.rebuildKept.toFixed(1)+'명 (1명 이상 남은 재창단 '+pct(rb.filter(x=>x.kept>0).length,rb.length)+')':'');
    console.log(' 시즌 끝 평균: 애정도 70 이상',sum.seasonLoy70==null?'-':sum.seasonLoy70.toFixed(1)+'명','· 평균 애정도',sum.seasonLoyMean==null?'-':sum.seasonLoyMean.toFixed(1),
      '· 이적(애정도 0) 구단당',sum.departures.toFixed(1)+'명 ·',seasons+'시즌 뒤 리그 동네/지역/2부/1부',sum.distEnd,'· 자금 중앙값',sum.fundsEnd);
  }
  report.seconds=Math.round((Date.now()-started)/1000);console.log('\n소요 시간',report.seconds,'초');
  if(out)fs.writeFileSync(out,JSON.stringify(report,null,1)+'\n');
}
// 세 유저 유형 플레이 분석 (참가자 요청 2026-11-11): 지금까지 정한 규칙을 모두 넣고, 같은 구단을 아끼는·보통·무리한 투자 유저가 각각 운영합니다.
// 규칙: 시설 개편 v03·리그별 수입·영입 시장·P21 나이와 입단 보정·젊은 선수 보너스·해체 여론·긴급 대출·재창단 초안·MLB 후원과 회생권·구단 사건 애정도.
// 구단마다 따로 만든 world를 쓰므로 세 유저가 같은 구단(같은 운)으로 시작합니다.
// node tests/run-economy-sim.cjs 20 결과.json personas [시즌 수=25] [thrifty|normal|aggressive] [world 시드 시작=20261130] [구단 시드 시작=21000] [MLB 보상 후보=MLB_BONUS 키]
function mainPersona(n,out,seasons=25,pk='normal',worldSeed=20261130,seedBase=21000,bonusKey=null){
  const started=Date.now();
  const ages={bonus:true,bonusTable:[[21,1.5],[25,1.3],[99,1]],capUp:true,aware:true,p21:true,entry:true,retireAt:null,
    retireWish:[[35,.1],[36,.2],[37,.35],[38,.5],[39,.65],[40,.8]],managerRetire:true};
  const base={league:true,contractGames:10,seasons,growth:{K:10,cap:80},disband:DISBAND.base,mlb:{request:true,regular:true,ticket:true,ticketAt:[1]},
    reform:true,invest:true,leagueMoney:LEAGUE_MONEY,market:MARKET,ages,rebuildRule:{},loyalty:{events:true}};
  if(bonusKey&&!MLB_BONUS[bonusKey])throw new Error('MLB 보상 후보가 없습니다: '+bonusKey);
  const bonus=bonusKey?{mlbBonus:MLB_BONUS[bonusKey]}:{};
  const runs=[];for(let i=0;i<n;i++)runs.push(career(createWorld(worldSeed+i),REFORM_POLICIES[pk],{...base,...bonus,seed:seedBase+i*31}));
  const report={version:bonusKey?'2026-11-11-mlb-bonus-v01':'2026-11-11-personas-v01',persona:pk,personaName:REFORM_POLICIES[pk].name,policy:REFORM_POLICIES[pk],clubs:n,seasons,worldSeed,seedBase,
    ...(bonusKey?{bonusKey,bonus:MLB_BONUS[bonusKey]}:{}),settings:{...base,disband:'base'},reform:REFORM,results:runs.map(r=>r.log)};
  report.seconds=Math.round((Date.now()-started)/1000);console.log(REFORM_POLICIES[pk].name,'구단',n,'· 소요 시간',report.seconds,'초');
  if(out)fs.writeFileSync(out,JSON.stringify(report,null,1)+'\n');
}
// 리그 모양 비교 (참가자 요청 2026-11-11): 4단계·5단계 × 시즌 10경기·20경기. 나머지는 세 유저 분석(personas)과 같은 규칙에
// MLB 진출 보상 고르기(choice3), 리그별 경기 경험치 배수, 동네 리그 연속 6위 +10%p를 더합니다(모두 2026-11-11 결정).
// 20경기는 시즌당 성장이 지금과 비슷하도록 K=20, 경기당 여론(승·패·미지급)을 ±2.5%p로, 계약을 1시즌(20경기)으로 맞춥니다.
// node tests/run-economy-sim.cjs 40 결과.json shape [t4g10|t5g10|t4g20|t5g20] [thrifty|normal|aggressive] [시즌 수=25]
const SHAPES={t4g10:{name:'4단계 · 10경기',tiers:4,rounds:2},t5g10:{name:'5단계 · 10경기',tiers:5,rounds:2},
  t4g20:{name:'4단계 · 20경기',tiers:4,rounds:4},t5g20:{name:'5단계 · 20경기',tiers:5,rounds:4}};
function mainShape(n,out,key='t4g10',pk='normal',seasons=25,worldSeed=20261130,seedBase=21000){
  const started=Date.now(),sh=SHAPES[key];if(!sh)throw new Error('리그 모양이 없습니다: '+key);
  const g20=sh.rounds===4,L=sh.tiers===5?LEAGUE5:null;
  const ages={bonus:true,bonusTable:[[21,1.5],[25,1.3],[99,1]],capUp:true,aware:true,p21:true,entry:true,retireAt:null,
    retireWish:[[35,.1],[36,.2],[37,.35],[38,.5],[39,.65],[40,.8]],managerRetire:true};
  const disband=g20?{...DISBAND.base,win:-2.5,loss:2.5,unpaid:2.5}:DISBAND.base;
  const base={league:true,contractGames:5*sh.rounds,seasons,growth:{K:g20?20:10,cap:80},disband,mlb:{request:true,regular:true,ticket:true,ticketAt:[1]},
    reform:true,invest:true,leagueMoney:L?L.money:LEAGUE_MONEY,market:L?L.market:MARKET,mids:L?L.mids:null,leagueNeed:L?L.need:null,billboard:L?L.billboard:null,
    leagueExp:L?L.exp:LEAGUE_EXP4,rounds:sh.rounds,lastStreak:10,shapeLog:true,ages,rebuildRule:{},loyalty:{events:true},mlbBonus:MLB_BONUS.choice3};
  const runs=[];for(let i=0;i<n;i++)runs.push(career(createWorld(worldSeed+i),REFORM_POLICIES[pk],{...base,seed:seedBase+i*31}));
  const report={version:'2026-11-11-league-shape-v01',shape:key,shapeName:sh.name,tiers:sh.tiers,gamesPerSeason:5*sh.rounds,persona:pk,personaName:REFORM_POLICIES[pk].name,clubs:n,seasons,worldSeed,seedBase,
    settings:{...base,disband,mlbBonus:'choice3'},league5:L,results:runs.map(r=>r.log)};
  report.seconds=Math.round((Date.now()-started)/1000);console.log(sh.name,REFORM_POLICIES[pk].name,'구단',n,'· 소요 시간',report.seconds,'초');
  if(out)fs.writeFileSync(out,JSON.stringify(report,null,1)+'\n');
}
// MLB 진출·후원·회생권 비교: 해체 여론 기본 설정, 경기 성장 K=10, 제안 리그 10시즌.
// node tests/run-economy-sim.cjs 20 결과.json mlb
function mainMlb(n,out){
  const started=Date.now(),world=createWorld(20261112),seasons=10,growth={K:10,cap:80};
  const variants=[{key:'none',name:'MLB 도전 안 함',mlb:null},{key:'mlb',name:'MLB 도전만 (후원·회생권 없음)',mlb:{donate:false,ticket:false}},
    {key:'full',name:'후원 15% + 회생권(3명·10명)',mlb:{donate:true,chance:.15,ticket:true,ticketAt:[3,10]}},
    {key:'full1',name:'후원 15% + 회생권(1명·3명)',mlb:{donate:true,chance:.15,ticket:true,ticketAt:[1,3]}}];
  const report={version:'2026-11-10-mlb-v01',clubsPerCell:n,seasons,growth,disband:DISBAND.base,mlbRules:MLB,variants:variants.map(v=>({key:v.key,name:v.name,mlb:v.mlb})),results:{}};
  for(const v of variants)for(const [pk,pol] of Object.entries(POLICIES)){
    const runs=[];for(let i=0;i<n;i++)runs.push(career(world,pol,{league:true,contractGames:10,seasons,seed:12000+i*19,growth,disband:DISBAND.base,mlb:v.mlb}));
    report.results[v.key+':'+pk]=runs.map(r=>r.log);
    const last=runs.map(r=>r.log.at(-1)),avg=f=>(last.reduce((a,l)=>a+(l[f]||0),0)/n);
    const firsts=runs.map(r=>r.log.find(l=>l.disbanded)?.season).filter(Boolean);
    console.log('\n['+v.name+'] '+pol.name);
    console.log(' MLB 성공 구단당',avg('mlbCount').toFixed(2)+'명','· 1명 이상',Math.round(100*last.filter(l=>l.mlbCount>=1).length/n)+'%','· 3명 이상',Math.round(100*last.filter(l=>l.mlbCount>=3).length/n)+'%',
      '· 실패',avg('mlbFails').toFixed(2)+'번','· 이적료 구단당',Math.round(avg('mlbFee'))+'만');
    console.log(' 후원 구단당',avg('donations').toFixed(2)+'번',Math.round(avg('donationSum'))+'만','· 회생권 사용 구단당',avg('ticketsUsed').toFixed(2)+'장','· 남은 회생권',avg('tickets').toFixed(2)+'장');
    console.log(' 해체 1번 이상',Math.round(100*firsts.length/n)+'%','· 구단당 해체',avg('disbands').toFixed(2)+'번','· 10시즌 뒤 동네/지역/2부/1부',[0,1,2,3].map(x=>Math.round(100*last.filter(l=>l.nextTier===x).length/n)+'%').join('/'),
      '· 자금 중앙값',Math.round(median(last.map(l=>l.funds))));
  }
  report.seconds=Math.round((Date.now()-started)/1000);console.log('\n소요 시간',report.seconds,'초');
  if(out)fs.writeFileSync(out,JSON.stringify(report,null,1)+'\n');
}
// 참가자 방식 비교: 첫 MLB 회생권 1장 + 후원 요청 + 정기 후원(애정도 90 이상) vs MLB 도전만.
// node tests/run-economy-sim.cjs 20 결과.json mlb2
function mainMlb2(n,out){
  const started=Date.now(),world=createWorld(20261113),seasons=10,growth={K:10,cap:80};
  const variants=[{key:'mlb',name:'MLB 도전만',mlb:{donate:false,ticket:false}},
    {key:'request',name:'첫 MLB 회생권 + 후원 요청 + 정기 후원',mlb:{donate:false,request:true,regular:true,ticket:true,ticketAt:[1]}}];
  const report={version:'2026-11-10-mlb-v02',clubsPerCell:n,seasons,growth,disband:DISBAND.base,mlbRules:MLB,
    requestTiers:'떠날 때 애정도 90+ 40% / 70~89 30% / 50~69 20% / 30~49 10% / 30 미만 거절, 요청마다 기억 애정도 −10, 시즌당 선수별 1번, 위기(미지급·대출·여론 60%+) 때만, 후원 1번마다 여론 −5',
    regular:'여론 90% 이상 또는 대출 중일 때, 애정도 90 이상으로 떠난 선수가 경기마다 이적료의 5%',ticket:'첫 MLB 진출 때 1장, 시즌 끝 해체 판정에서 여론 70%로',
    variants:variants.map(v=>({key:v.key,name:v.name,mlb:v.mlb})),results:{}};
  for(const v of variants)for(const [pk,pol] of Object.entries(POLICIES)){
    const runs=[];for(let i=0;i<n;i++)runs.push(career(world,pol,{league:true,contractGames:10,seasons,seed:13000+i*23,growth,disband:DISBAND.base,mlb:v.mlb}));
    report.results[v.key+':'+pk]=runs.map(r=>r.log);
    const last=runs.map(r=>r.log.at(-1)),avg=f=>(last.reduce((a,l)=>a+(l[f]||0),0)/n);
    const firsts=runs.map(r=>r.log.find(l=>l.disbanded)?.season).filter(Boolean),al=last.reduce((a,l)=>a+l.alumni,0),al90=last.reduce((a,l)=>a+l.alumni90,0);
    console.log('\n['+v.name+'] '+pol.name);
    console.log(' MLB 성공 구단당',avg('mlbCount').toFixed(2)+'명','· 1명 이상',Math.round(100*last.filter(l=>l.mlbCount>=1).length/n)+'%',
      '· 애정도 90 이상으로 떠난 선수',al?Math.round(100*al90/al)+'%':'-','· 이적료 구단당',Math.round(avg('mlbFee'))+'만');
    console.log(' 후원 요청',avg('requests').toFixed(2)+'번 (거절',avg('refusals').toFixed(2)+') · 요청 후원금',Math.round(avg('requestSum'))+'만',
      '· 정기 후원',Math.round(avg('regularSum'))+'만 ('+avg('regularGames').toFixed(1)+'경기)','· 회생권 사용',avg('ticketsUsed').toFixed(2)+'장 · 남음',avg('tickets').toFixed(2)+'장');
    console.log(' 해체 1번 이상',Math.round(100*firsts.length/n)+'%','· 구단당 해체',avg('disbands').toFixed(2)+'번','· 대출 구단당',avg('loans').toFixed(2)+'번',
      '· 10시즌 뒤 동네/지역/2부/1부',[0,1,2,3].map(x=>Math.round(100*last.filter(l=>l.nextTier===x).length/n)+'%').join('/'),'· 자금 중앙값',Math.round(median(last.map(l=>l.funds))));
  }
  report.seconds=Math.round((Date.now()-started)/1000);console.log('\n소요 시간',report.seconds,'초');
  if(out)fs.writeFileSync(out,JSON.stringify(report,null,1)+'\n');
}
// 원정 응원 관객 입장료 비교: 지금까지 정한 규칙 전체(제안 리그, 계약 10경기, 경기 성장 K=10, 해체 여론 기본, 긴급 대출,
// MLB 진출·후원 요청·정기 후원·첫 MLB 회생권)에서 원정 비율 0·20·30·50%.
// node tests/run-economy-sim.cjs 20 결과.json away
function mainAway(n,out){
  const started=Date.now(),world=createWorld(20261115),seasons=10;
  const base={league:true,contractGames:10,seasons,growth:{K:10,cap:80},disband:DISBAND.base,mlb:{request:true,regular:true,ticket:true,ticketAt:[1]}};
  const shares=[0,.2,.3,.5];
  const report={version:'2026-11-10-away-v01',clubsPerCell:n,seasons,unit:'만원',settings:{...base,disband:'base'},shares,results:{}};
  const sum=(f,keys)=>keys.reduce((a,k)=>a+(f[k]||0),0);
  const INC=['base','runs','win','gate','stores','awayGate'],FIX=['salary','maintenance'];
  for(const share of shares)for(const [pk,pol] of Object.entries(POLICIES)){
    const runs=[];for(let i=0;i<n;i++)runs.push(career(world,pol,{...base,awayShare:share,seed:16000+i*31}));
    report.results[share+':'+pk]=runs.map(r=>r.log);
    const last=runs.map(r=>r.log.at(-1)),avg=f=>last.reduce((a,l)=>a+(l[f]||0),0)/n;
    const per=k=>runs.reduce((a,r)=>a+(r.log.at(-1).flow[k]||0)/r.log.length,0)/n;// 시즌당 평균
    const inc=INC.reduce((a,k)=>a+per(k),0)+avg('mlbFee')/seasons+avg('requestSum')/seasons+avg('regularSum')/seasons,fix=FIX.reduce((a,k)=>a+per(k),0);
    const firsts=x=>runs.map(r=>r.log.find(l=>l.nextTier>=x)?.season).filter(Boolean),dis=runs.filter(r=>r.log.some(l=>l.disbanded)).length;
    console.log('\n[원정 비율 '+Math.round(share*100)+'%] '+pol.name);
    console.log(' 시즌 평균 수입',Math.round(inc),'(원정 입장료',Math.round(per('awayGate'))+', 홈 입장료',Math.round(per('gate'))+') · 급여+유지비',Math.round(fix),'· 여유 돈',Math.round(inc-fix),'· 훈련비',Math.round(per('training')));
    console.log(' 10시즌 뒤 출전 평균',median(last.map(l=>l.starterMean)).toFixed(1),'· 동네/지역/2부/1부',[0,1,2,3].map(x=>Math.round(100*last.filter(l=>l.nextTier===x).length/n)+'%').join('/'),
      '· 처음 2부',Math.round(100*firsts(2).length/n)+'%'+(firsts(2).length?'(중앙값 '+median(firsts(2))+'시즌)':''),'· 처음 1부',Math.round(100*firsts(3).length/n)+'%');
    console.log(' 해체 1번 이상',Math.round(100*dis/n)+'%','· 대출 구단당',avg('loans').toFixed(2),'· MLB 구단당',avg('mlbCount').toFixed(2),'· 10시즌 뒤 자금 중앙값',Math.round(median(last.map(l=>l.funds))));
  }
  report.seconds=Math.round((Date.now()-started)/1000);console.log('\n소요 시간',report.seconds,'초');
  if(out)fs.writeFileSync(out,JSON.stringify(report,null,1)+'\n');
}
// 시설·경기장 개편안 비교(P17): 지금 시설(원정 입장료 없음) vs 개편안(원정 응원은 응원단 버스 단계로).
// 나머지 규칙은 mainAway와 같습니다. node tests/run-economy-sim.cjs 20 결과.json reform [시즌 수=15] [free: 경기장 조건 없음도 함께]
function mainReform(n,out,seasons=15){
  const started=Date.now(),world=createWorld(20261115);
  const base={league:true,contractGames:10,seasons,growth:{K:10,cap:80},disband:DISBAND.base,mlb:{request:true,regular:true,ticket:true,ticketAt:[1]}};
  // 두 설정 모두 "투자 먼저" 감독(invest)으로 맞춥니다. 그래서 지금 시설 결과는 원정 응원 시험(away)의 0%와 다릅니다.
  const CONFIGS={now:{name:'지금 시설',policies:POLICIES,opts:{invest:true}},reform:{name:'개편안',policies:REFORM_POLICIES,opts:{reform:true,invest:true}},
    ...(process.argv[6]==='free'?{reformFree:{name:'개편안 · 경기장 승격 조건 없음',policies:REFORM_POLICIES,opts:{reform:true,invest:true,leagueNeed:[1,1,1,1]}}}:{})};
  const report={version:'2026-11-10-reform-v03',clubsPerCell:n,seasons,unit:'만원',settings:{...base,disband:'base'},reform:REFORM,reformPolicies:REFORM_POLICIES,results:{},summary:{}};
  const pct=(a,b)=>Math.round(100*a/b)+'%';
  for(const [ck,cfg] of Object.entries(CONFIGS))for(const [pk,pol] of Object.entries(cfg.policies)){
    const runs=[];for(let i=0;i<n;i++)runs.push(career(world,pol,{...base,...cfg.opts,seed:16000+i*31}));
    report.results[ck+':'+pk]=runs.map(r=>r.log);
    const at=s=>runs.map(r=>r.log[Math.min(s,r.log.length)-1]);
    const per=k=>runs.reduce((a,r)=>a+(r.log.at(-1).flow[k]||0)/r.log.length,0)/n;
    const mlbPer=k=>runs.reduce((a,r)=>a+(r.log.at(-1)[k]||0)/r.log.length,0)/n;
    const inc=['base','runs','win','gate','stores','awayGate'].reduce((a,k)=>a+per(k),0)+mlbPer('mlbFee')+mlbPer('requestSum')+mlbPer('regularSum');
    const fix=per('salary')+per('maintenance');
    const first=(x,upto)=>runs.map(r=>r.log.slice(0,upto).find(l=>l.nextTier>=x)?.season).filter(Boolean);
    const dis=upto=>runs.filter(r=>r.log.slice(0,upto).some(l=>l.disbanded)).length;
    const dist=s=>[0,1,2,3].map(x=>pct(at(s).filter(l=>l.nextTier===x).length,n)).join('/');
    const sum={inc:Math.round(inc),fix:Math.round(fix),spare:Math.round(inc-fix),training:Math.round(per('training')),facilities:Math.round(per('facilities')),stadium:Math.round(per('stadium')),
      awayGate:Math.round(per('awayGate')),stores:Math.round(per('stores')),
      starter10:median(at(10).map(l=>l.starterMean)),starterEnd:median(at(seasons).map(l=>l.starterMean)),dist10:dist(10),distEnd:dist(seasons),
      first2_10:first(2,10).length/n,first2End:first(2,seasons).length/n,first3_10:first(3,10).length/n,first3End:first(3,seasons).length/n,
      first2Median:median(first(2,seasons)),first3Median:median(first(3,seasons)),disband10:dis(10)/n,disbandEnd:dis(seasons)/n,
      loans:runs.reduce((a,r)=>a+r.log.at(-1).loans,0)/n,mlb:runs.reduce((a,r)=>a+r.log.at(-1).mlbCount,0)/n,
      stadiumEnd:median(at(seasons).map(l=>l.stadium)),delays:runs.reduce((a,r)=>a+(r.log.at(-1).delays||0),0)/n};
    if(ck!=='now'){
      // 시설별 수입·유지비: 보유한 경기 기준 시즌(10경기)당 평균과 본전까지 걸리는 시즌 수
      const ids=[...new Set(runs.flatMap(r=>Object.keys(r.log.at(-1).facStats||{})))];sum.facilities_detail={};
      for(const id of ids){const ss=runs.map(r=>r.log.at(-1).facStats[id]).filter(Boolean),g=ss.reduce((a,s)=>a+s.games,0);if(!g)continue;
        const incS=10*ss.reduce((a,s)=>a+s.inc,0)/g,maintS=10*ss.reduce((a,s)=>a+s.maint,0)/g,cost=ss.reduce((a,s)=>a+s.cost,0)/ss.length;
        sum.facilities_detail[id]={built:ss.length/n,incPerSeason:Math.round(incS),maintPerSeason:Math.round(maintS),netPerSeason:Math.round(incS-maintS),avgCost:Math.round(cost),
          payback:incS-maintS>0?+(cost/(incS-maintS)).toFixed(1):null};}
      sum.busLevel=at(seasons).map(l=>l.fac?.includes('bus')?l.lvl.bus:0);sum.prospects=runs.reduce((a,r)=>a+(r.log.at(-1).prospects||0),0)/n;
    }
    report.summary[ck+':'+pk]=sum;
    console.log('\n['+cfg.name+'] '+pol.name);
    console.log(' 시즌 평균 수입',sum.inc,'(홈 입장료',Math.round(per('gate'))+', 원정 응원',sum.awayGate+', 시설 수입',sum.stores+') · 급여+유지비',sum.fix,'· 여유 돈',sum.spare,'· 훈련비',sum.training,'· 시설비',sum.facilities,'· 경기장',sum.stadium);
    console.log(' 출전 평균 10시즌',sum.starter10.toFixed(1),'/',seasons+'시즌',sum.starterEnd.toFixed(1),'· 리그(동네/지역/2부/1부) 10시즌',sum.dist10,'/',seasons+'시즌',sum.distEnd);
    console.log(' 처음 2부 10시즌',pct(sum.first2_10,1),'/',seasons+'시즌',pct(sum.first2End,1),'(중앙값',sum.first2Median,'시즌) · 처음 1부',pct(sum.first3_10,1),'/',pct(sum.first3End,1),'(중앙값',sum.first3Median,'시즌)');
    console.log(' 해체 1번 이상 10시즌',pct(sum.disband10,1),'/',seasons+'시즌',pct(sum.disbandEnd,1),'· 대출',sum.loans.toFixed(2),'· MLB',sum.mlb.toFixed(2),'· 경기장 중앙값',sum.stadiumEnd,'· 경기장 때문에 미룬 승격',sum.delays.toFixed(2));
    if(sum.facilities_detail){for(const [id,d] of Object.entries(sum.facilities_detail))console.log('   '+id.padEnd(10),'지은 구단',pct(d.built,1),'· 시즌당 수입',d.incPerSeason,'유지비',d.maintPerSeason,'손익',d.netPerSeason,'· 들인 돈',d.avgCost,'· 본전',d.payback===null?'-':d.payback+'시즌');
      console.log('   버스 단계(마지막):',sum.busLevel.join(','),'· 유망주 구단당',sum.prospects.toFixed(1));}
  }
  report.seconds=Math.round((Date.now()-started)/1000);console.log('\n소요 시간',report.seconds,'초');
  if(out)fs.writeFileSync(out,JSON.stringify(report,null,1)+'\n');
}
// 1부까지 키울 돈 후보 비교 (이슈 #46-5): 보통 감독 · 개편안 v03 · 투자 먼저. 후보마다 같은 시작 상태(새 world)에서 돌립니다.
// node tests/run-economy-sim.cjs 20 결과.json top [시즌 수=20]
// worldSeed·seedBase: 같은 묶음을 다른 표본으로 더 돌릴 때(2026-11-10 추가). 기본값은 이전 시험과 같습니다.
function mainTop(n,out,seasons=20,set='top',worldSeed=20261115,seedBase=16000){
  const started=Date.now();
  const base={league:true,contractGames:10,seasons,growth:{K:10,cap:80},disband:DISBAND.base,mlb:{request:true,regular:true,ticket:true,ticketAt:[1]},reform:true,invest:true};
  const SETS={top:{
    now:{name:'① 지금 그대로 (v03)',opts:{}},
    noMlb:{name:'② MLB 안 보내기',opts:{mlbOff:true}},
    money:{name:'③ 리그별 수입 (배당금·1~3위 상금·관객)',opts:{leagueMoney:LEAGUE_MONEY}},
    easier:{name:'④ 상대 실력 완화 (2부 59·1부 68)',opts:{mids:[39,51,59,68]}},
    both:{name:'⑤ ③ + ④',opts:{leagueMoney:LEAGUE_MONEY,mids:[39,51,59,68]}},
  },
  // 젊은 선수 보너스 시험(2026-11-10): 세 후보 모두 P19 리그별 수입을 넣습니다. node tests/run-economy-sim.cjs 20 결과.json youth 20
  youth:{
    money:{name:'A. 리그별 수입 (P19 결정, 나이 없음)',opts:{leagueMoney:LEAGUE_MONEY}},
    aging:{name:'B. A + 나이 (임시 가정: 33세부터 하락·37세 은퇴), 보너스 없음',opts:{leagueMoney:LEAGUE_MONEY,ages:{bonus:false,capUp:false}}},
    youth:{name:'C. B + 젊은 선수 보너스 + 경기 성장 한도 85',opts:{leagueMoney:LEAGUE_MONEY,ages:{bonus:true,capUp:true}}},
  },
  // 참가자 요청(2026-11-10): 나이를 보는 감독, 능력 하락은 35세부터(35~37세 −1, 38세부터 −2), 은퇴는 선수 희망(35세 10% ~ 40세 이상 80%)·감독 결정만. node tests/run-economy-sim.cjs 20 결과.json youth2 20
  youth2:{
    aging35:{name:'B2. 리그별 수입 + 나이(35세부터 하락, 은퇴는 선수 희망·감독 결정) + 나이 보는 감독, 보너스 없음',opts:{leagueMoney:LEAGUE_MONEY,ages:{bonus:false,capUp:false,aware:true,decline:[[35,1],[38,2]],retireAt:null,retireWish:[[35,.1],[36,.2],[37,.35],[38,.5],[39,.65],[40,.8]],managerRetire:true}}},
    draft35:{name:'C2. B2 + 초안 보너스(30세 이상 감속) + 한도 85',opts:{leagueMoney:LEAGUE_MONEY,ages:{bonus:true,capUp:true,aware:true,decline:[[35,1],[38,2]],retireAt:null,retireWish:[[35,.1],[36,.2],[37,.35],[38,.5],[39,.65],[40,.8]],managerRetire:true}}},
    flat35:{name:'D2. B2 + 감속 없는 보너스(18~21 ×1.5·22~25 ×1.3·26세 이상 ×1.0) + 한도 85',opts:{leagueMoney:LEAGUE_MONEY,ages:{bonus:true,bonusTable:[[21,1.5],[25,1.3],[99,1]],capUp:true,aware:true,decline:[[35,1],[38,2]],retireAt:null,retireWish:[[35,.1],[36,.2],[37,.35],[38,.5],[39,.65],[40,.8]],managerRetire:true}}},
  },
  // 리그별 영입 시장 + 젊은 선수 출전 감독(참가자 요청 2026-11-10). 모두 리그별 수입·35세부터 하락·선수 희망/감독 결정 은퇴·나이 보는 감독.
  // node tests/run-economy-sim.cjs 20 결과.json youth3 20
  youth3:(()=>{const AG={bonus:false,capUp:false,aware:true,decline:[[35,1],[38,2]],retireAt:null,retireWish:[[35,.1],[36,.2],[37,.35],[38,.5],[39,.65],[40,.8]],managerRetire:true},
    FL={...AG,bonus:true,bonusTable:[[21,1.5],[25,1.3],[99,1]],capUp:true};return {
    marketE:{name:'E. 리그별 영입 시장 (보너스 없음)',opts:{leagueMoney:LEAGUE_MONEY,ages:AG,market:MARKET}},
    marketF:{name:'F. E + 감속 없는 젊은 선수 보너스 + 한도 85',opts:{leagueMoney:LEAGUE_MONEY,ages:FL,market:MARKET}},
    marketG:{name:'G. F + 젊은 선수 2명 출전 감독',opts:{leagueMoney:LEAGUE_MONEY,ages:FL,market:MARKET,playYoung:2}},
  };})(),
  // P21 확정 나이 규칙으로 다시 시험 (이슈 #46-5 남은 일, 2026-11-10 준비). 은퇴·감독은 youth3과 같고 하락만 P21 규칙입니다.
  // 41세 구간까지 보려면 25시즌 이상(P21). node tests/run-economy-sim.cjs 20 결과.json p21 25
  p21:(()=>{const AG={bonus:false,capUp:false,aware:true,p21:true,retireAt:null,retireWish:[[35,.1],[36,.2],[37,.35],[38,.5],[39,.65],[40,.8]],managerRetire:true},
    FL={...AG,bonus:true,bonusTable:[[21,1.5],[25,1.3],[99,1]],capUp:true};return {
    money:{name:'③ 리그별 수입 (나이 없음, 기준)',opts:{leagueMoney:LEAGUE_MONEY}},
    money21:{name:'③ + P21 나이 (영입 시장·보너스 없음)',opts:{leagueMoney:LEAGUE_MONEY,ages:AG}},
    marketE:{name:'E21. ③ + P21 나이 + 리그별 영입 시장',opts:{leagueMoney:LEAGUE_MONEY,ages:AG,market:MARKET}},
    marketF:{name:'F21. E21 + 감속 없는 젊은 선수 보너스 + 한도 85',opts:{leagueMoney:LEAGUE_MONEY,ages:FL,market:MARKET}},
    marketG:{name:'G21. F21 + 젊은 선수 2명 출전 감독',opts:{leagueMoney:LEAGUE_MONEY,ages:FL,market:MARKET,playYoung:2}},
  };})(),
  // p21 + 입단 나이 보정(참가자 결정 2026-11-10: 19~26세 입단, 능력 3개 각 +(나이−19)). 나이 없는 기준 안은 p21 묶음과 같아서 뺐습니다.
  // 같은 world 시드·구단 시드로 돌리면 p21 묶음과 짝지어 비교할 수 있습니다. node tests/run-economy-sim.cjs 20 결과.json p21e 25 [world 시드] [구단 시드 시작]
  p21e:(()=>{const AG={bonus:false,capUp:false,aware:true,p21:true,entry:true,retireAt:null,retireWish:[[35,.1],[36,.2],[37,.35],[38,.5],[39,.65],[40,.8]],managerRetire:true},
    FL={...AG,bonus:true,bonusTable:[[21,1.5],[25,1.3],[99,1]],capUp:true};return {
    money21:{name:'③ + P21 나이 + 입단 나이 보정',opts:{leagueMoney:LEAGUE_MONEY,ages:AG}},
    marketE:{name:'E21e. ③ + P21 나이·입단 보정 + 리그별 영입 시장',opts:{leagueMoney:LEAGUE_MONEY,ages:AG,market:MARKET}},
    marketF:{name:'F21e. E21e + 감속 없는 젊은 선수 보너스 + 한도 85',opts:{leagueMoney:LEAGUE_MONEY,ages:FL,market:MARKET}},
    marketG:{name:'G21e. F21e + 젊은 선수 2명 출전 감독',opts:{leagueMoney:LEAGUE_MONEY,ages:FL,market:MARKET,playYoung:2}},
  };})(),
  // 이슈 #46-14 후보 비교 (2026-11-11): 입단 나이 보정 뒤 줄어든 1부 도달을 되돌릴 수 있는지, F21e(영입 시장 + 젊은 선수 보너스 + 한도 85)에 하나씩 더합니다.
  // p21e와 같은 시드로 돌리면 F21e와 짝지어 비교합니다. node tests/run-economy-sim.cjs 20 결과.json p21f 25 [world 시드] [구단 시드 시작]
  p21f:(()=>{const FL={bonus:true,bonusTable:[[21,1.5],[25,1.3],[99,1]],capUp:true,aware:true,p21:true,entry:true,retireAt:null,
      retireWish:[[35,.1],[36,.2],[37,.35],[38,.5],[39,.65],[40,.8]],managerRetire:true};return {
    count5:{name:'F21e + 입단 보정 능력 5개(각 +(나이−19))',opts:{leagueMoney:LEAGUE_MONEY,ages:{...FL,entryCount:5},market:MARKET}},
    tenure:{name:'F21e + 젊은 선수 보너스를 입단 뒤 시즌 수로(1~3시즌 ×1.5, 4~7시즌 ×1.3)',opts:{leagueMoney:LEAGUE_MONEY,ages:{...FL,bonusBy:'tenure'},market:MARKET}},
    both:{name:'F21e + 능력 5개 + 시즌 수 보너스',opts:{leagueMoney:LEAGUE_MONEY,ages:{...FL,entryCount:5,bonusBy:'tenure'},market:MARKET}},
  };})(),
  // 이슈 #46-14 추가 후보 (참가자 질문 2026-11-11): 25·26세 입단은 모든 능력 보정, 그리고 계단을 없앤 완만한 안(나이−19개 능력).
  // node tests/run-economy-sim.cjs 20 결과.json p21g 25 [world 시드] [구단 시드 시작]
  p21g:(()=>{const FL={bonus:true,bonusTable:[[21,1.5],[25,1.3],[99,1]],capUp:true,aware:true,p21:true,entry:true,retireAt:null,
      retireWish:[[35,.1],[36,.2],[37,.35],[38,.5],[39,.65],[40,.8]],managerRetire:true};return {
    all25:{name:'F21e + 25·26세 입단은 10개 능력 모두 +(나이−19), 19~24세는 3개',opts:{leagueMoney:LEAGUE_MONEY,ages:{...FL,entryCount:'all25'},market:MARKET}},
    graded:{name:'F21e + 나이−19개 능력에 각 +(나이−19) (20세 1개 … 26세 7개)',opts:{leagueMoney:LEAGUE_MONEY,ages:{...FL,entryCount:'graded'},market:MARKET}},
  };})(),
  };
  const VARIANTS=SETS[set],p21set=['p21','p21e','p21f','p21g'].includes(set),aged=set.startsWith('youth')||p21set;
  const report={version:(set==='p21f'||set==='p21g'?'2026-11-11-':'2026-11-10-')+set+'-v01',ages:p21set?{p21:P21_AGING,...(set!=='p21'?{entry:P21_ENTRY}:{}),...(set==='p21f'?{tenureBonus:TENURE_BONUS}:{}),tempAges:AGES}:set.startsWith('youth')?AGES:undefined,market:set==='youth3'||p21set?MARKET:undefined,variantOpts:Object.fromEntries(Object.entries(SETS[set]).map(([k,v])=>[k,v.opts])),clubsPerCell:n,...(p21set?{worldSeed,seedBase}:{}),seasons,unit:'만원',policy:'normal',settings:{...base,disband:'base'},reform:REFORM,leagueMoney:LEAGUE_MONEY,variants:{},results:{},summary:{}};
  const pct=(a,b)=>Math.round(100*a/b)+'%',med=a=>median(a);
  for(const [vk,v] of Object.entries(VARIANTS)){
    const world=createWorld(worldSeed),runs=[];
    for(let i=0;i<n;i++)runs.push(career(world,REFORM_POLICIES.normal,{...base,...v.opts,seed:seedBase+i*31}));
    report.variants[vk]=v.name;report.results[vk]=runs.map(r=>r.log);
    const at=s=>runs.map(r=>r.log[Math.min(s,r.log.length)-1]);
    const per=k=>runs.reduce((a,r)=>a+(r.log.at(-1).flow[k]||0)/r.log.length,0)/n;
    const extra=k=>runs.reduce((a,r)=>a+(r.log.at(-1)[k]||0)/r.log.length,0)/n;
    const inc=['base','runs','win','gate','stores','awayGate','league','prize'].reduce((a,k)=>a+per(k),0)+extra('mlbFee')+extra('requestSum')+extra('regularSum');
    const fix=per('salary')+per('maintenance');
    const first=x=>runs.map(r=>r.log.find(l=>l.nextTier>=x)?.season).filter(Boolean);
    const dist=s=>[0,1,2,3].map(x=>pct(at(s).filter(l=>l.nextTier===x).length,n)).join('/');
    const top=runs.flatMap(r=>r.log.filter(l=>l.tier===3)),second=runs.flatMap(r=>r.log.filter(l=>l.tier===2));
    const ranks=rows=>[1,2,3,4,5,6].map(k=>pct(rows.filter(l=>l.rank===k).length,rows.length||1)).join('/');
    const sum={inc:Math.round(inc),fix:Math.round(fix),spare:Math.round(inc-fix),training:Math.round(per('training')),league:Math.round(per('league')),prize:Math.round(per('prize')),
      first2:first(2).length/n,first2Median:med(first(2)),first3:first(3).length/n,first3Median:med(first(3)),dist10:dist(10),dist15:dist(15),distEnd:dist(seasons),
      disband:runs.filter(r=>r.log.some(l=>l.disbanded)).length/n,loans:runs.reduce((a,r)=>a+r.log.at(-1).loans,0)/n,mlb:runs.reduce((a,r)=>a+r.log.at(-1).mlbCount,0)/n,
      starter10:med(at(10).map(l=>l.starterMean)),starterEnd:med(at(seasons).map(l=>l.starterMean)),salaryEnd:med(at(seasons).map(l=>l.salary)),
      seasons2:second.length,ranks2:ranks(second),seasons1:top.length,ranks1:ranks(top),stadiumEnd:med(at(seasons).map(l=>l.stadium))};
    report.summary[vk]=sum;
    console.log('\n'+v.name);
    console.log(' 시즌 평균 수입',sum.inc,'(리그 배당금',sum.league+', 상금',sum.prize+') · 급여+유지비',sum.fix,'· 여유 돈',sum.spare,'· 훈련비',sum.training);
    console.log(' 처음 2부',pct(sum.first2,1),'(중앙값',sum.first2Median,'시즌) · 처음 1부',pct(sum.first3,1),'(중앙값',sum.first3Median,'시즌) · 리그(동네/지역/2부/1부) 10시즌',sum.dist10,'/ 15시즌',sum.dist15,'/',seasons+'시즌',sum.distEnd);
    console.log(' 출전 평균 10시즌',sum.starter10.toFixed(1),'/',seasons+'시즌',sum.starterEnd.toFixed(1),'· 경기당 급여',seasons+'시즌',sum.salaryEnd,'· 경기장',sum.stadiumEnd,'· 해체 1번 이상',pct(sum.disband,1),'· 대출',sum.loans.toFixed(2),'· MLB',sum.mlb.toFixed(2));
    if(aged){sum.ageEnd=med(at(seasons).map(l=>l.ageMean??NaN));sum.retired=runs.reduce((a,r)=>a+(r.log.at(-1).retired||0),0)/n;sum.retiredWish=runs.reduce((a,r)=>a+(r.log.at(-1).retiredWish||0),0)/n;sum.retiredByManager=runs.reduce((a,r)=>a+(r.log.at(-1).retiredByManager||0),0)/n;sum.oldest=med(at(seasons).map(l=>l.oldest??NaN));sum.youngStarters=med(at(seasons).map(l=>l.youngStarters??NaN));
      console.log(' 출전 선수 평균 나이',seasons+'시즌',isNaN(sum.ageEnd)?'-':sum.ageEnd.toFixed(1),'· 은퇴 구단당',sum.retired.toFixed(1),'(선수 희망',sum.retiredWish.toFixed(1)+', 감독 결정',sum.retiredByManager.toFixed(1)+') · 최고령 중앙값',sum.oldest,'· 25세 이하 주전(마지막 시즌)',sum.youngStarters);}
    console.log(' 2부에서 보낸 시즌',sum.seasons2,'순위(1~6위)',sum.ranks2,'· 1부에서 보낸 시즌',sum.seasons1,'순위',sum.ranks1);
  }
  report.seconds=Math.round((Date.now()-started)/1000);console.log('\n소요 시간',report.seconds,'초');
  if(out)fs.writeFileSync(out,JSON.stringify(report,null,1)+'\n');
}
function main(){
  if(process.argv[4]==='shape')return mainShape(Number(process.argv[2])||20,process.argv[3],process.argv[5]||'t4g10',process.argv[6]||'normal',Number(process.argv[7])||25);
  if(process.argv[4]==='personas')return mainPersona(Number(process.argv[2])||20,process.argv[3],Number(process.argv[5])||25,process.argv[6]||'normal',Number(process.argv[7])||20261130,Number(process.argv[8])||21000,process.argv[9]||null);
  if(process.argv[4]==='loyalty')return mainLoyalty(Number(process.argv[2])||20,process.argv[3],Number(process.argv[5])||12,process.argv[6]||null);
  if(process.argv[4]==='rebuild')return mainRebuild(Number(process.argv[2])||20,process.argv[3],Number(process.argv[5])||15,process.argv[6]||null);
  // p21 추가 표본: node tests/run-economy-sim.cjs 20 결과.json p21 25 [world 시드=20261115] [구단 시드 시작=16000]
  if(['p21','p21e','p21f','p21g'].includes(process.argv[4]))return mainTop(Number(process.argv[2])||20,process.argv[3],Number(process.argv[5])||25,process.argv[4],Number(process.argv[6])||20261115,Number(process.argv[7])||16000);
  if(process.argv[4]==='youth3')return mainTop(Number(process.argv[2])||20,process.argv[3],Number(process.argv[5])||20,'youth3');
  if(process.argv[4]==='youth2')return mainTop(Number(process.argv[2])||20,process.argv[3],Number(process.argv[5])||20,'youth2');
  if(process.argv[4]==='youth')return mainTop(Number(process.argv[2])||20,process.argv[3],Number(process.argv[5])||20,'youth');
  if(process.argv[4]==='top')return mainTop(Number(process.argv[2])||20,process.argv[3],Number(process.argv[5])||20);
  if(process.argv[4]==='reform')return mainReform(Number(process.argv[2])||20,process.argv[3],Number(process.argv[5])||15);
  if(process.argv[4]==='away')return mainAway(Number(process.argv[2])||20,process.argv[3]);
  if(process.argv[4]==='mlb2')return mainMlb2(Number(process.argv[2])||20,process.argv[3]);
  if(process.argv[4]==='growth')return mainGrowth(Number(process.argv[2])||20,process.argv[3]);
  if(process.argv[4]==='mlb')return mainMlb(Number(process.argv[2])||20,process.argv[3]);
  if(process.argv[4]==='disband')return mainDisband(Number(process.argv[2])||20,process.argv[3]);
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
module.exports={career,POLICIES,DISBAND,REFORM,REFORM_POLICIES,LEAGUE_MONEY,AGES,MARKET,TEN,P21_AGING,ageP21,P21_ENTRY,entryP21,TENURE_BONUS,MLB_BONUS};

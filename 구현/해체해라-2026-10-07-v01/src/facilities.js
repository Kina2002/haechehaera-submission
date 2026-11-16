// Facility overhaul and the away gate, build step ⑤ (2026-11-11).
// P17 시설과 경기장 개편 (v03 numbers; the stadium part came with ①): 15 facilities in five groups, training-facility levels 1~3,
// 응원단 버스 levels 1~4, upkeep split (training and academy 150, uniform shop 0, bus on away games only, the rest 100), demolition
// with a 30% refund of the build cost and every upgrade, building slots 5 + (stadium grade − 1) × 3, and each facility's effect.
// P16 원정 응원 관객 입장료: an away game earns round(our home crowd × bus share) × our ticket price; bus levels 1–4 give 15/20/25/30% (2026-11-12).
// Layout like src/league.js … src/mlb-support.js: pure rules first, then the game-hook marker comment, then the UI marker comment.
// Tests slice the source at those two marker comments, so keep them unique.
// Where the effects plug in:
//  - extensions.js seams: facilityUpkeep · facilityShopIncome · awayGateIncome · facilityLoyalty · facilityBudgetShops (the per-game
//    settlement and the next-game estimate), staminaUseFactor (마사지실), buildFacility (the build button), FACILITIES (filled here).
//  - growth.js: GROWTH_EXP_MULTIPLIERS (선수 식당, training levels) and growthCap (training level 3); extensions.js costGrowth (discount).
//  - game.js bhScore (수면실) · opinion.js OPINION_SEASON_END_PARTS (명예의 전당) and OPINION_REBUILD_HOOKS (rebuild clears the levels)
//  - mlb-support.js MLB_SUPPORT_HOOKS.memoryDrop (명예의 전당) · league.js season-end step 'facilities' (아카데미 유망주, 명예의 전당 헌액).
// Season end order after this file:
//  rank → prize → opinion → revival-disband → disband → revival-relegation → promotion → aging → rebuild → offseason → opinion-record → revival-record → facilities.

const FACILITY={
 slotsBase:5,slotsPerGrade:3,            // P17 §1 (unchanged): 5 + (stadium grade − 1) × 3 building slots
 refund:.3,                              // P17 §6: demolition returns 30% of the build cost and every upgrade
 // P17 §5 training levels: added cost, upkeep per game, training-cost discount, match-experience factor, match-growth cap bonus.
 // The cap bonus is +5 on the match-growth cap of ② (85 → 90), as P17 notes for the youth bonus (the simulator's 80 → 85).
 train:[null,{add:1000,upkeep:150,discount:0,exp:1,cap:0},{add:2500,upkeep:250,discount:.2,exp:1.2,cap:0},{add:5000,upkeep:300,discount:.4,exp:1.4,cap:5}],
 // P17 §4 · P16 응원단 버스: added cost and the away share (0% without a bus, then 15/20/25/30%).
 bus:[null,{add:1000,share:.15},{add:2000,share:.2},{add:5000,share:.25},{add:8000,share:.3}],
 uniformPerFan:.05,                      // P17 §3 (v03): 500원 per personal fan of every player, home games (만원 units)
 restaurantPerCrowd:1,                   // P17: 1,000원 per home spectator = 1만원 per crowd unit (10 spectators)
 billboard:[120,200,350,600],            // P17: every game (home and away) by league tier 동네 · 지역 · 2부 · 1부
 lockerLoyalty:1,plazaFans:2,            // P17: 라커룸 +1 loyalty after each game (the only loyalty facility) · 팬 만남 광장 +2 fans
 massageSave:.15,                        // P17: our players use 15% less stamina in a match
 sleepSense:5,                           // P17: the bonehead check uses sense +5 (Temporary ⑤: capped at 100)
 foodExp:1.1,                            // P17: match experience +10%
 hallOpinion:-5,hallMemoryDrop:5,        // P17: season-end opinion −5%p · a support request lowers remembered loyalty by 5 instead of 10
 academyAge:19,academyMinus:5,academyFloor:20,// P17 · P21: a 19-year-old prospect, 9 abilities −5 (not below 20) like the simulator; no extra ×1.3 (the age bonus replaces it)
 legacyPrice:1000,                       // the old flat build cost (BALANCE.facilityPrice) used for old saves
 logSize:30,                             // academy prospects kept in the log
};
const FACILITY_CATEGORIES=['훈련','복지','수익','팬','특별'];
const FACILITY_NINE=['contact','power','eye','speed','sense','catch','throw','velocity','control'];
// P17 §2 (v03): 14 → 15 facilities. Training facilities cost FACILITY.train[1] and pay the upkeep of their level.
const FACILITY_TABLE=[
 {id:'bat',category:'훈련',name:'타격 훈련장',train:['contact','power','eye'],effect:'컨택 · 파워 · 선구안 훈련'},
 {id:'field',category:'훈련',name:'수비 훈련장',train:['sense','catch','throw'],effect:'야구센스 · 포구 · 송구 훈련'},
 {id:'pitch',category:'훈련',name:'불펜',train:['velocity','control'],effect:'구속 · 제구 훈련'},
 {id:'conditioning',category:'훈련',name:'컨디셔닝 센터',train:['speed','stamina'],effect:'주력 · 스태미나 훈련'},
 {id:'locker',category:'복지',name:'라커룸',price:1000,upkeep:100,effect:'경기 후 모든 선수 애정도 +1'},
 {id:'massage',category:'복지',name:'마사지실',price:1000,upkeep:100,effect:'경기 중 체력 소모 −15%'},
 {id:'sleep',category:'복지',name:'수면실',price:1000,upkeep:100,effect:'본헤드 판정 때 야구센스 +5로 계산'},
 {id:'food',category:'복지',name:'선수 식당',price:1500,upkeep:100,effect:'모든 선수 경기 경험치 +10%'},
 {id:'uniform',category:'수익',name:'유니폼 매장',price:500,upkeep:0,effect:'홈경기마다 선수 개인 팬 1명당 500원'},
 {id:'restaurant',category:'수익',name:'구장 음식점',price:1000,upkeep:100,effect:'홈 관중 1명당 1,000원'},
 {id:'billboard',category:'수익',name:'광고판',price:1500,upkeep:100,effect:'경기마다 리그별 고정 수입'},
 {id:'fans',category:'팬',name:'팬 만남 광장',price:1000,upkeep:100,effect:'경기 후 모든 선수 개인 팬 +2'},
 {id:'bus',category:'팬',name:'응원단 버스',upkeep:100,awayOnly:true,effect:'원정 응원 입장료 · 단계마다 원정 응원 +5%p'},
 {id:'hall',category:'팬',name:'명예의 전당',price:2000,upkeep:100,effect:'시즌 끝 해체 여론 −5%p · MLB 출신 후원 요청 때 애정도 −10 → −5'},
 {id:'academy',category:'특별',name:'유소년 아카데미',price:2000,upkeep:150,effect:'시즌마다 무료 19세 유망주 1명'},
];
// Old saves (F18, 14 facilities) → the new table. null: removed (편의점) and refunded at its build cost (P17 §6 기존 저장).
// Two old facilities that become one (달리기장 + 체력 훈련실, 샤워실 + 탈의실): the first is kept, the other refunded at its build cost.
const FACILITY_OLD={bat:'bat',field:'field',pitch:'pitch',run:'conditioning',fitness:'conditioning',shower:'locker',locker:'locker',massage:'massage',sleep:'sleep',food:'food',goods:'uniform',restaurant:'restaurant',store:null,fans:'fans'};
const FACILITY_OLD_NAMES={bat:'타격 훈련실',field:'수비 훈련실',pitch:'투수 훈련실',run:'달리기장',fitness:'체력 훈련실',shower:'샤워실',locker:'탈의실',massage:'마사지실',sleep:'수면실',food:'선수 식당',goods:'유니폼 · 굿즈 매장',restaurant:'구장 음식점',store:'편의점',fans:'팬 만남 광장'};
// BALANCE values the table replaced (one flat build cost and upkeep). Old saves keep them in t.balance; they are dropped on load.
const FACILITY_RETIRED_BALANCE=['facilityPrice','maintenance'];
const ACADEMY_RESULTS=['hired','missed','rebuild'];

// ---- table lookups ----
const facilityRound=v=>Math.round(v*100)/100;
function facilityDef(id){return FACILITY_TABLE.find(f=>f.id===id)||null;}
function facilityMaxLevel(def){return def?.train?FACILITY.train.length-1:def?.id==='bus'?FACILITY.bus.length-1:1;}
function facilityLeveled(def){return facilityMaxLevel(def)>1;}
function facilitySteps(def){return def?.train?FACILITY.train:def?.id==='bus'?FACILITY.bus:null;}
function facilityPrice(def){const s=facilitySteps(def);return s?s[1].add:def.price;}
// Build cost plus the upgrades up to a level (what a new facility at that level has cost).
function facilityCostTo(def,level){const s=facilitySteps(def);return s?s.slice(1,level+1).reduce((n,x)=>n+x.add,0):def.price;}
function facilityTrainingDef(k){return FACILITY_TABLE.find(f=>f.train?.includes(k))||null;}

// ---- what a club has ----
function newFacilityState(){return {v:1,levels:{},paid:{},academy:{season:null,prospect:null,log:[]},hall:{inducted:[]}};}
function facilityState(t){const S=t.facilityData??=newFacilityState();S.levels??={};S.paid??={};S.academy??={season:null,prospect:null,log:[]};S.academy.log??=[];S.hall??={inducted:[]};return S;}
function facilityHas(t,id){return Array.isArray(t?.facilities)&&t.facilities.includes(id);}
// Read only (never creates state): a built facility without a stored level is level 1.
function facilityLevel(t,id){
 if(!facilityHas(t,id))return 0;const def=facilityDef(id);if(!def)return 0;
 const v=t.facilityData?.levels?.[id];return Number.isInteger(v)?Math.min(Math.max(v,1),facilityMaxLevel(def)):1;
}
function facilitySlots(t){return FACILITY.slotsBase+((Number(t?.stadium)||1)-1)*FACILITY.slotsPerGrade;}
function facilityPaid(t,id){const def=facilityDef(id);if(!def||!facilityHas(t,id))return 0;const v=t.facilityData?.paid?.[id];return Number.isFinite(v)&&v>=0?v:facilityCostTo(def,facilityLevel(t,id));}
function facilityRefund(t,id){return Math.round(facilityPaid(t,id)*FACILITY.refund);}

// ---- effects ----
function facilityTrainLevel(t,k){const d=facilityTrainingDef(k);return d?facilityLevel(t,d.id):0;}
function facilityTrainingDiscount(t,k){const n=facilityTrainLevel(t,k);return n?FACILITY.train[n].discount:0;}
function facilityExpFactor(t,p,k){const n=facilityTrainLevel(t,k);return (facilityHas(t,'food')?FACILITY.foodExp:1)*(n?FACILITY.train[n].exp:1);}
function facilityCapBonus(t,k){const n=facilityTrainLevel(t,k);return n?FACILITY.train[n].cap:0;}
function busShare(t){const n=facilityLevel(t,'bus');return n?FACILITY.bus[n].share:0;}
function facilityFansTotal(t){return (t?.players||[]).reduce((s,p)=>s+(Number(p.fans)||0),0);}

// ---- upkeep (P17: training by level, academy 150, uniform shop 0, bus on away games only, the rest 100) ----
// The next game: the league fixture (our club opens every season at home), a home game outside the league.
function facilityNextAway(t){const L=t?.league;if(!L||L.phase!=='season'||typeof leagueFixture!=='function')return false;const fx=leagueFixture(L);return !!fx&&!fx.usHome;}
function facilityAway(t,m){return m?m.home===1:facilityNextAway(t);}
function facilityUpkeepOf(t,id,away){
 const def=facilityDef(id);if(!def||!facilityHas(t,id))return 0;
 if(def.train)return FACILITY.train[facilityLevel(t,id)].upkeep;
 return def.awayOnly?(away?def.upkeep:0):def.upkeep;
}
function facilityUpkeepRows(t,m){const away=facilityAway(t,m);return [...new Set(Array.isArray(t?.facilities)?t.facilities:[])].filter(id=>facilityDef(id)).map(id=>({id,amount:facilityUpkeepOf(t,id,away)}));}
function facilityUpkeepTotal(t,m){return facilityUpkeepRows(t,m).reduce((s,r)=>s+r.amount,0);}

// ---- one game's facility money (P17 shops, P16 away gate). crowd = attendance(t), our home-game crowd in units of 10 people ----
function facilitySettlement(t,m,crowd){
 const home=m?.home===0,tier=Number.isInteger(m?.league?.tier)?m.league.tier:(t?.league?.tier??0),fans=facilityFansTotal(t),c=Math.max(0,Number(crowd)||0);
 const uniform=home&&facilityHas(t,'uniform')?facilityRound(fans*FACILITY.uniformPerFan):0;
 const restaurant=home&&facilityHas(t,'restaurant')?facilityRound(c*FACILITY.restaurantPerCrowd):0;
 const billboard=facilityHas(t,'billboard')?(FACILITY.billboard[tier]??FACILITY.billboard[0]):0;
 // P16: the fans who would have come to our home game × the bus share × our ticket price (the simulator rounds the crowd first).
 const share=busShare(t),awayCrowd=home?0:Math.round(c*share),awayGate=home?0:awayCrowd*(Number(t?.ticket)||0);
 const rows=facilityUpkeepRows(t,m||{home:home?0:1});
 return {home,tier,fans,crowd:c,uniform,restaurant,billboard,stores:facilityRound(uniform+restaurant+billboard),bus:facilityLevel(t,'bus'),share,awayCrowd,awayGate,
  upkeep:rows.reduce((s,r)=>s+r.amount,0),rows:rows.filter(r=>r.amount>0)};
}
// The part kept with the game's finance record (result screen and saved history).
function facilityFinanceDetail(x){return {home:x.home,tier:x.tier,fans:x.fans,crowd:x.crowd,uniform:x.uniform,restaurant:x.restaurant,billboard:x.billboard,bus:x.bus,share:x.share,awayCrowd:x.awayCrowd,awayGate:x.awayGate,upkeep:x.upkeep,rows:x.rows.map(r=>({id:r.id,amount:r.amount}))};}

// ---- build, upgrade, demolish (P17 §6: building and upgrading during a season too, never during a game) ----
function facilityBuildBlock(t,id){
 const def=facilityDef(id);if(!def)return '없는 시설입니다.';
 if(live(t))return '경기가 끝난 뒤 지을 수 있습니다.';
 if(facilityHas(t,id))return '이미 지은 시설입니다.';
 const used=t.facilities.length,limit=facilitySlots(t);
 if(used>=limit)return '건물 자리가 없습니다('+used+' / '+limit+'). 경기장을 확장하거나 시설을 철거해 주세요.';
 if(!(t.funds>=facilityPrice(def)))return '건설 자금이 부족합니다. '+money(facilityPrice(def))+'이 필요합니다.';
 return '';
}
function buildFacility(t,id){
 const block=facilityBuildBlock(t,id);if(block)return block;
 const def=facilityDef(id),price=facilityPrice(def);if(!spend(t,price,def.name+' 건설'))return '건설 자금이 부족합니다.';
 const S=facilityState(t);t.facilities.push(id);S.paid[id]=price;if(facilityLeveled(def))S.levels[id]=1;
 if(id==='hall')facilityHallInduct(t);
 return '';
}
function facilityUpgradeCost(t,id){const def=facilityDef(id),n=facilityLevel(t,id);if(!def||!n||n>=facilityMaxLevel(def))return 0;return facilitySteps(def)[n+1].add;}
function facilityUpgradeBlock(t,id){
 const def=facilityDef(id);if(!def)return '없는 시설입니다.';
 if(!facilityLeveled(def))return '단계가 없는 시설입니다.';
 if(!facilityHas(t,id))return '먼저 지어 주세요.';
 if(live(t))return '경기가 끝난 뒤 올릴 수 있습니다.';
 const cost=facilityUpgradeCost(t,id);if(!cost)return '최고 단계입니다.';
 if(!(t.funds>=cost))return '자금이 부족합니다. '+money(cost)+'이 필요합니다.';
 return '';
}
function upgradeFacility(t,id){
 const block=facilityUpgradeBlock(t,id);if(block)return block;
 const def=facilityDef(id),cost=facilityUpgradeCost(t,id),next=facilityLevel(t,id)+1,paid=facilityPaid(t,id);
 if(!spend(t,cost,def.name+' '+next+'단계'))return '자금이 부족합니다.';
 const S=facilityState(t);S.levels[id]=next;S.paid[id]=facilityRound(paid+cost);
 return '';
}
function facilityDemolishBlock(t,id){const def=facilityDef(id);if(!def)return '없는 시설입니다.';if(!facilityHas(t,id))return '지은 적이 없는 시설입니다.';if(live(t))return '경기가 끝난 뒤 철거할 수 있습니다.';return '';}
function demolishFacility(t,id){
 const block=facilityDemolishBlock(t,id);if(block)return {error:block};
 const def=facilityDef(id),paid=facilityPaid(t,id),refund=facilityRefund(t,id),level=facilityLevel(t,id),S=facilityState(t);
 t.facilities=t.facilities.filter(x=>x!==id);delete S.levels[id];delete S.paid[id];
 if(refund>0)gain(t,refund,def.name+' 철거 · 30% 환급');
 news(t,def.name+' 철거','들인 돈 '+money(paid)+'의 30%인 '+money(refund)+'을 돌려받았습니다.'+(facilityLeveled(def)?' ('+level+'단계였습니다.)':'')+' 건물 자리 '+t.facilities.length+' / '+facilitySlots(t)+'.');
 return {ok:true,refund,paid,level};
}

// ---- 유소년 아카데미 (P17 · P21): one free 19-year-old prospect a season, offered at the season end for the coming season ----
function academyLog(t,p,result){
 const A=facilityState(t).academy;A.log.push({season:p?.academy?.season??A.season??null,id:p?.id||'',name:String(p?.name||''),result,at:Date.now()});
 if(A.log.length>FACILITY.logSize)A.log.splice(0,A.log.length-FACILITY.logSize);
}
function academyProspect(t,season,rnd=Math.random){
 const p=player(false,(t.players||[]).map(x=>x.number),false,0,[...(t.players||[]),...(t.market||[])].map(x=>x.name));
 for(const k of FACILITY_NINE){const v=p.a[k];p.a[k]=Math.min(v,Math.max(FACILITY.academyFloor,v-FACILITY.academyMinus));}// lower than a 동네 recruit; a value under 20 stays
 if(typeof enterPlayerAge==='function')enterPlayerAge(p,rnd,FACILITY.academyAge);else p.age=FACILITY.academyAge;// 19 → no entry bonus
 p.salary=Math.max(3,Math.round(abilityPrice(p)*balance(t).salaryFactor));p.price=0;p.energy=p.a.stamina;delete p.wage26;
 p.academy={season};
 return p;
}
function academySeasonStep(t,ctx,rnd=Math.random){
 if(!facilityHas(t,'academy'))return null;
 const A=facilityState(t).academy,season=ctx.season+1;
 if(Number.isInteger(A.season)&&A.season>=season)return null;// once per season (retry or reload)
 if(A.prospect)academyLog(t,A.prospect,'missed');// last season's prospect was not signed and goes elsewhere
 const p=academyProspect(t,season,rnd);A.prospect=p;A.season=season;
 news(t,'유소년 아카데미 유망주 · '+p.name+'('+p.age+'세)','시즌 '+season+'에 뛸 유망주가 왔습니다. 영입 화면에서 영입비 없이 데려올 수 있습니다(경기 급여 '+money(p.salary)+'). 다음 시즌 끝까지 데려오지 않으면 다른 곳으로 갑니다.');
 return p;
}
function academyHireBlock(t){
 const p=t?.facilityData?.academy?.prospect;if(!p)return '데려올 유망주가 없습니다.';
 if(live(t))return '경기가 끝난 뒤 영입할 수 있습니다.';
 if(t.players.length>=35)return '선수단이 35명으로 가득 찼습니다.';
 return '';
}
function hireAcademyProspect(t){
 const block=academyHireBlock(t);if(block)return block;
 const A=t.facilityData.academy,p=A.prospect;
 p.number=Array.from({length:100},(_,i)=>i).find(i=>!t.players.some(x=>x.number===i));
 p.contract=Math.max(1,contractGamesFor26(t));p.energy=p.a.stamina;p.lowOffers=0;
 t.players.push(p);if(typeof wageState26==='function')wageState26(p,t);
 A.prospect=null;academyLog(t,p,'hired');
 news(t,p.name+' 영입 · 유소년 아카데미',p.age+'세 유망주가 영입비 없이 입단했습니다. 경기 급여 '+money(p.salary)+' · '+p.contract+'경기 계약.');
 return '';
}

// ---- 명예의 전당: MLB alumni are inducted while the hall stands; the list stays after a rebuild (P17 §6) ----
function facilityHallInduct(t){
 if(!facilityHas(t,'hall')||typeof mlbSuccessRecords!=='function')return 0;
 const H=facilityState(t).hall,season=t.league?.season??null;let n=0;
 for(const h of mlbSuccessRecords(t)){if(typeof h.id!=='string'||H.inducted.some(x=>x.id===h.id))continue;H.inducted.push({id:h.id,name:String(h.player?.name||'').slice(0,20),season});n++;}
 return n;
}

// ---- season end and rebuild ----
function facilitySeasonEndStep(t,ctx){
 const inducted=facilityHallInduct(t),p=academySeasonStep(t,ctx);
 if(inducted||p)ctx.facilities={inducted,prospect:p?{id:p.id,name:p.name,age:p.age}:null};
 return ctx.facilities||null;
}
// The rebuild (③) has already emptied t.facilities: the levels, the money records and a waiting prospect go; the hall list stays.
function facilityRebuildHook(t){
 const S=facilityState(t);S.levels={};S.paid={};
 if(S.academy.prospect){academyLog(t,S.academy.prospect,'rebuild');S.academy.prospect=null;}
}

// ---- old saves and validation ----
function facilityOldPrice(t){const v=Number(t?.balance?.facilityPrice);return Number.isFinite(v)&&v>=0&&v<=100000?v:FACILITY.legacyPrice;}
// Runs once for a club without t.facilityData (every save before ⑤, and a new club with no facilities).
function migrateFacilities(t){
 const list=Array.isArray(t.facilities)?t.facilities:[],price=facilityOldPrice(t),out=[],seen=new Set(),notes=[],refunds=[],dropped=[],S=newFacilityState();
 for(const id of list){
  if(typeof id!=='string'||seen.has(id))continue;seen.add(id);// the old build button never allowed the same id twice
  const to=Object.prototype.hasOwnProperty.call(FACILITY_OLD,id)?FACILITY_OLD[id]:facilityDef(id)?id:undefined,old=FACILITY_OLD_NAMES[id]||id;
  if(to===undefined){dropped.push(id);continue;}
  if(to===null){refunds.push({id,amount:price});notes.push(old+' 없어짐(건설비 '+money(price)+' 환급)');continue;}
  if(out.includes(to)){refunds.push({id,amount:price});notes.push(old+' → '+facilityDef(to).name+'에 합침(건설비 '+money(price)+' 환급)');continue;}
  out.push(to);S.paid[to]=price;if(facilityLeveled(facilityDef(to)))S.levels[to]=1;
  if(FACILITY_OLD_NAMES[id]&&FACILITY_OLD_NAMES[id]!==facilityDef(to).name)notes.push(old+' → '+facilityDef(to).name);
 }
 t.facilities=out;t.facilityData=S;
 const refund=refunds.reduce((s,r)=>s+r.amount,0);
 if(refund>0&&Array.isArray(t.ledger))gain(t,refund,'시설 개편 · 사라지거나 합쳐진 시설 건설비 환급');
 if(list.length){
  S.migrated={from:list.filter(x=>typeof x==='string').slice(0,50),to:out.slice(),refund,dropped:dropped.slice(0,50),at:Date.now()};
  const limit=facilitySlots(t);
  if(Array.isArray(t.news))news(t,'시설 개편 · 15개 시설','시설이 새 목록으로 바뀌었습니다. '+(notes.length?notes.join(' · ')+'. ':'')+(out.length?'지금 시설: '+out.map(id=>facilityDef(id).name).join(', ')+'. 훈련 시설은 1단계로 이어집니다. ':'')+
   (dropped.length?'알 수 없는 시설 '+dropped.length+'개는 지웠습니다. ':'')+(out.length>limit?'건물 자리를 넘었습니다('+out.length+' / '+limit+'). 지은 시설은 그대로 쓰지만, 철거해서 자리가 나기 전에는 새로 지을 수 없습니다.':''));
 }
 return S;
}
function ensureFacilityState(t){
 if(!t||!Array.isArray(t.players))return null;
 if(!Array.isArray(t.facilities))t.facilities=[];
 if(!t.facilityData)migrateFacilities(t);
 if(t.balance)for(const k of FACILITY_RETIRED_BALANCE)if(Object.prototype.hasOwnProperty.call(t.balance,k))delete t.balance[k];
 const S=facilityState(t);
 const clean=[...new Set(t.facilities.filter(id=>typeof id==='string'&&facilityDef(id)))];if(clean.length!==t.facilities.length)t.facilities=clean;
 for(const id of Object.keys(S.levels))if(!t.facilities.includes(id)||!facilityLeveled(facilityDef(id)))delete S.levels[id];
 for(const id of Object.keys(S.paid))if(!t.facilities.includes(id))delete S.paid[id];
 for(const id of t.facilities){const def=facilityDef(id);if(facilityLeveled(def)&&!Number.isInteger(S.levels[id]))S.levels[id]=1;if(!Number.isFinite(S.paid[id]))S.paid[id]=facilityCostTo(def,facilityLevel(t,id));}
 return S;
}
// Before ensureClub: a save without t.facilityData is an older save and its ids are converted on load (any list the old check took).
function validateFacilityState(t){
 const fail=msg=>{throw Error('시설 자료 오류 · '+msg);};
 const int=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b,num=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b,obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v),str=(v,n)=>typeof v==='string'&&v.length<=n;
 const S=t.facilityData;
 if(S!==undefined){
  if(!obj(S)||S.v!==1)fail('형식');
  const list=t.facilities;
  if(!Array.isArray(list)||list.some(id=>!facilityDef(id))||new Set(list).size!==list.length)fail('시설 목록');
  if(!obj(S.levels)||Object.entries(S.levels).some(([id,v])=>!list.includes(id)||!facilityLeveled(facilityDef(id))||!int(v,1,facilityMaxLevel(facilityDef(id)))))fail('시설 단계');
  if(!obj(S.paid)||Object.entries(S.paid).some(([id,v])=>!list.includes(id)||!num(v,0,1e7)))fail('들인 돈');
  const A=S.academy;
  if(A!==undefined){
   if(!obj(A)||(A.season!==null&&!int(A.season,1,1e6))||!Array.isArray(A.log)||A.log.length>200||A.log.some(x=>!obj(x)||!str(x.name,40)||!ACADEMY_RESULTS.includes(x.result)))fail('유소년 아카데미');
   const p=A.prospect;
   if(p!=null){try{validatePlayer(p);}catch(e){fail('아카데미 유망주 · '+e.message);}if(!int(p.age,15,150)||!num(p.salary,0,1e5)||!num(p.price??0,0,0))fail('아카데미 유망주');}
  }
  const H=S.hall;
  if(H!==undefined&&(!obj(H)||!Array.isArray(H.inducted)||H.inducted.length>1000||H.inducted.some(x=>!obj(x)||!str(x.id,80)||!str(x.name,40))))fail('명예의 전당');
  if(S.migrated!==undefined&&(!obj(S.migrated)||!num(S.migrated.refund,0,1e7)))fail('시설 개편 기록');
 }
 for(const m of [t.match,...(Array.isArray(t.history)?t.history:[])].filter(Boolean)){
  const f=m.finance?.facility;if(f===undefined)continue;
  if(!obj(f)||['fans','crowd','uniform','restaurant','billboard','awayCrowd','awayGate','upkeep'].some(k=>f[k]!==undefined&&!num(f[k],0,1e7))||(f.share!==undefined&&!num(f.share,0,1))||(f.bus!==undefined&&!int(f.bus,0,FACILITY.bus.length-1))||
   (f.rows!==undefined&&(!Array.isArray(f.rows)||f.rows.length>FACILITY_TABLE.length||f.rows.some(r=>!obj(r)||!num(r.amount,0,1e4)))))fail('경기 시설 결산');
 }
}

// Game hooks.
// The facility list every older screen and check reads (achievements, the training screen, trainingFacility, the QA tools).
FACILITIES.splice(0,FACILITIES.length,...FACILITY_TABLE.map(f=>[f.id,f.name,f.effect,f.train||[],f.category]));
// The per-game settlement in extensions.js reward() and the next-game estimate on the home screen.
facilityUpkeep=function(t,m){return facilityUpkeepTotal(t,m);};
facilityShopIncome=function(t,m,crowd){return facilitySettlement(t,m,crowd).stores;};
awayGateIncome=function(t,m,crowd){return m?.home===0?0:facilitySettlement(t,m,crowd).awayGate;};
facilityLoyalty=function(t){return facilityHas(t,'locker')?FACILITY.lockerLoyalty:0;};
facilityBudgetShops=function(t){const crowd=attendance(t),h=facilitySettlement(t,{home:0},crowd),a=facilitySettlement(t,{home:1},crowd);return h.stores+a.stores+a.awayGate;};
// 마사지실: our players use 15% less stamina for pitches, swings, running and fielding (the opponent is unchanged).
staminaUseFactor=function(t,p){return p&&facilityHas(t,'massage')&&t.players.includes(p)?1-FACILITY.massageSave:1;};
// 수면실: our player's bonehead check uses sense +5 (capped at 100, Temporary ⑤). The check reads the fatigued abilities as before.
const bhScoreBeforeFacilities=bhScore;
bhScore=function(p,n){
 const t=typeof team==='function'?team():null;
 if(p?.a&&facilityHas(t,'sleep')&&t.players.includes(p))return bhScoreBeforeFacilities({...p,a:{...p.a,sense:Math.min(100,(Number(p.a.sense)||0)+FACILITY.sleepSense)}},n);
 return bhScoreBeforeFacilities(p,n);
};
// Match experience: 선수 식당 ×1.1 for everyone, a training facility at level 2 / 3 ×1.2 / ×1.4 on its abilities (P17 · P10).
GROWTH_EXP_MULTIPLIERS.push((t,p,k)=>facilityExpFactor(t,p,k));
// Level 3 raises the match-growth cap of its abilities by 5 (85 → 90; stamina also stays within the stamina setting).
const growthCapBeforeFacilities=growthCap;
growthCap=function(t,p,k){
 const base=growthCapBeforeFacilities(t,p,k),bonus=facilityCapBonus(t,k);if(!bonus)return base;
 const raised=GROWTH.matchCap+bonus;return Math.max(base,k==='stamina'?Math.min(raised,balance(t).staminaCap):raised);
};
// Training with money: level 2 −20%, level 3 −40% on that facility's abilities.
const costGrowthBeforeFacilities=costGrowth;
costGrowth=function(p,k){const c=costGrowthBeforeFacilities(p,k);if(!c)return c;const d=facilityTrainingDiscount(team(),k);return d?Math.round(c*(1-d)):c;};
// 명예의 전당: −5%p at the season end (summed with the rank modifier before the one clamp, ③) and support requests −5 instead of −10 (④).
OPINION_SEASON_END_PARTS.push(t=>facilityHas(t,'hall')?{key:'hall',label:'명예의 전당',delta:FACILITY.hallOpinion}:null);
MLB_SUPPORT_HOOKS.memoryDrop.push((t,h,drop)=>facilityHas(t,'hall')?Math.min(drop,FACILITY.hallMemoryDrop):drop);
// The rebuild removes every facility (③ empties t.facilities); levels and money records go with them, the hall list stays.
OPINION_REBUILD_HOOKS.push(t=>facilityRebuildHook(t));
// Last season-end step: hall of fame inductions and next season's academy prospect (after a rebuild, so a disbanded club gets none).
addLeagueSeasonEndStep({id:'facilities',run:facilitySeasonEndStep});
// The settlement detail is computed with the inputs the settlement itself uses (before the game's fan changes)
// and kept with the game's finance record and the saved history.
const rewardBeforeFacilities=reward;
reward=function(m){
 if(m.rewarded)return rewardBeforeFacilities(m);
 const t=team(),detail=t?facilitySettlement(t,m,attendance(t)):null;
 const result=rewardBeforeFacilities(m);
 if(detail&&m.rewarded&&m.finance&&m.finance.facility===undefined){
  m.finance.facility=facilityFinanceDetail(detail);
  const h=t.history?.find(x=>x.id===m.id);if(h?.finance)h.finance=clone(m.finance);
 }
 return result;
};
const ensureClubBeforeFacilities=ensureClub;
ensureClub=function(t){ensureClubBeforeFacilities(t);if(t&&typeof data!=='undefined'&&data?.slots?.includes(t))ensureFacilityState(t);};
const validateTeamBeforeFacilities=validateTeam;
validateTeam=function(t){validateTeamBeforeFacilities(t);validateFacilityState(t);};

// UI integration.
function facilityUpkeepText(def){
 if(def.train)return '유지비 '+FACILITY.train.slice(1).map((x,i)=>(i+1)+'단계 '+money(x.upkeep)).join(' · ')+' / 경기';
 if(def.awayOnly)return '유지비 원정 경기에만 '+money(def.upkeep);
 return def.upkeep?'유지비 '+money(def.upkeep)+' / 경기':'유지비 없음';
}
function facilityEffectText(t,def){
 const tier=t.league?.tier??0;
 if(def.train)return def.train.map(k=>STATS[k]).join(' · ')+' 훈련. 2단계 훈련비 −20% · 경기 경험치 ×1.2, 3단계 훈련비 −40% · 경기 경험치 ×1.4 · 경기 성장 한도 '+(GROWTH.matchCap+FACILITY.train[3].cap)+'.';
 switch(def.id){
  case 'locker':return '경기 후 모든 선수 애정도 +1. 애정도를 올리는 시설은 라커룸 하나입니다(희망급여보다 많이 깎인 급여를 받는 선수는 오르지 않음).';
  case 'massage':return '경기 중 우리 선수의 체력 소모 −15% (투구 · 스윙 · 주루 · 수비).';
  case 'sleep':return '본헤드 판정 때 우리 선수의 야구센스를 +5로 계산합니다(100까지).';
  case 'food':return '경기에 나간 모든 선수의 경기 경험치 +10%.';
  case 'uniform':{const fans=facilityFansTotal(t);return '홈경기마다 선수 개인 팬 1명당 500원. 지금 개인 팬 '+fans.toLocaleString('ko-KR')+'명 → 홈경기당 '+money(facilityRound(fans*FACILITY.uniformPerFan))+'. 유니폼 그리기는 아직 없습니다.';}
  case 'restaurant':{const c=attendance(t);return '홈 관중 1명당 1,000원. 지금 예상 홈 관중 '+spectators(c)+'명 → 홈경기당 '+money(c*FACILITY.restaurantPerCrowd)+'.';}
  case 'billboard':return '경기마다(홈 · 원정) 리그별 고정 수입: '+FACILITY.billboard.map((v,i)=>leagueTierName(i).replace(' 리그','')+' '+money(v)).join(' · ')+'. 지금 '+leagueTierName(tier)+' '+money(FACILITY.billboard[tier]??0)+'.';
  case 'fans':return '경기 후 모든 선수 개인 팬 +2 (관중과 유니폼 매장 수입도 따라 늘어납니다).';
  case 'bus':{const c=attendance(t),s=busShare(t);return '원정 경기에서 따라온 우리 관객의 입장료: 홈경기였다면 왔을 관객 × 원정 응원 비율 × 우리 입장료. 버스 없음 0%, 1~4단계 '+FACILITY.bus.slice(1).map(x=>Math.round(x.share*100)+'%').join(' · ')+'. 지금 '+Math.round(s*100)+'% → 원정 경기당 약 '+money(Math.round(c*s)*t.ticket)+'.';}
  case 'hall':return '시즌 끝 해체 여론 −5%p. MLB 출신에게 후원을 요청할 때 기억하는 애정도가 −10 대신 −5. 재창단해도 헌액 기록은 남습니다.';
  case 'academy':return '시즌이 끝날 때마다 다음 시즌에 뛸 19세 유망주 1명이 영입비 없이 영입 후보로 옵니다. 능력은 동네 리그 후보보다 5 낮고, 19세라 경기 경험치 ×1.5(젊은 선수 보너스)를 받습니다.';
 }
 return def.effect;
}
function facilityLevelsHTML(t,def){
 const steps=facilitySteps(def);if(!steps)return '';const now=facilityLevel(t,def.id);
 return '<ol class="facility-levels">'+steps.slice(1).map((x,i)=>{const n=i+1,text=def.train?(x.discount?'훈련비 −'+Math.round(x.discount*100)+'% · 경험치 ×'+x.exp:'훈련 가능')+(x.cap?' · 한도 '+(GROWTH.matchCap+x.cap):'')+' · 유지비 '+money(x.upkeep):'원정 응원 '+Math.round(x.share*100)+'%';
  return '<li class="'+(n===now?'gold':n<now?'':'muted')+'">'+n+'단계 · '+(n===1?'건설 ':'+')+money(x.add)+' · '+text+'</li>';}).join('')+'</ol>';
}
function facilityExtraHTML(t,def){
 const S=t.facilityData;
 if(def.id==='academy'){const A=S?.academy,p=A?.prospect,last=A?.log?.at(-1);
  return '<p class="tiny">'+(p?'유망주 '+esc(p.name)+'('+p.age+'세) 대기 중 · <button class="small" data-go="market">영입 화면</button>':A?.season?'시즌 '+A.season+' 유망주는 이미 왔습니다.':'첫 유망주는 이번 시즌이 끝날 때 옵니다.')+(last?' · 지난 유망주 '+esc(last.name)+' ('+({hired:'입단',missed:'떠남',rebuild:'재창단으로 떠남'}[last.result])+')':'')+'</p>';}
 if(def.id==='hall'){const list=S?.hall?.inducted||[];return '<p class="tiny">헌액 '+list.length+'명'+(list.length?' · '+list.slice(-8).map(x=>esc(x.name)).join(', '):' · MLB에 진출한 선수가 헌액됩니다.')+'</p>';}
 return '';
}
function facilityCardHTML(t,def){
 const id=def.id,built=facilityHas(t,id),lv=facilityLevel(t,id),max=facilityMaxLevel(def),price=facilityPrice(def);
 let html='<section class="panel facility'+(built?' facility-built':'')+'" data-facility="'+id+'"><span class="gold">'+def.category+'</span><h2>'+def.name+(built&&max>1?' · '+lv+'단계':'')+'</h2>'+
  '<p>'+esc(facilityEffectText(t,def))+'</p><small class="muted">건설비 '+money(price)+' · '+facilityUpkeepText(def)+'</small>'+facilityLevelsHTML(t,def);
 if(built){
  const up=facilityUpgradeCost(t,id),ub=facilityUpgradeBlock(t,id),db=facilityDemolishBlock(t,id);
  html+='<p class="good tiny">✓ 운영 중'+(max>1?' · '+lv+' / '+max+'단계':'')+' · 들인 돈 '+money(facilityPaid(t,id))+'</p>'+facilityExtraHTML(t,def);
  if(max>1&&lv<max)html+='<button data-facility-act="level" data-id="'+id+'" '+(ub?'disabled title="'+esc(ub)+'"':'')+'>'+(lv+1)+'단계로 올리기 · '+money(up)+'</button>';
  html+='<button class="small" data-facility-act="demolish" data-id="'+id+'" '+(db?'disabled title="'+esc(db)+'"':'')+'>철거 · '+money(facilityRefund(t,id))+' 환급</button>';
 }else{
  const block=facilityBuildBlock(t,id);
  html+='<button data-v8="build" data-id="'+id+'" '+(block?'disabled title="'+esc(block)+'"':'')+'>건설 · '+money(price)+'</button>';
 }
 return html+'</section>';
}
facilitiesHTML=function(t){
 const used=t.facilities.length,limit=facilitySlots(t),away=facilityNextAway(t),cat=FACILITY_CATEGORIES.includes(facilityCategory)?facilityCategory:'전체',block=stadiumUpgradeBlock(t);
 return head('구단 시설','시설마다 하는 일이 다릅니다. 철거하면 들인 돈(건설비와 단계 비용)의 30%를 돌려받습니다.')+
  '<div class="panel ops-banner"><span>경기장 <strong>'+t.stadium+'등급</strong></span><span>건물 <strong>'+used+' / '+limit+'</strong></span><span>좌석 <strong>'+spectators(t.stadium*200)+'</strong></span><button class="primary" data-v8="upgrade" '+(block?'disabled title="'+esc(block)+'"':'')+'>'+(t.stadium>=5?'경기장 최대 등급':'경기장 확장 · '+money(stadiumUpgradeCost(t)))+'</button></div>'+
  '<section class="panel stack facility-summary"><div class="row between"><span>다음 경기('+(away?'원정':'홈')+') 시설 유지비</span><b>'+money(facilityUpkeepTotal(t,null))+'</b></div>'+
  '<div class="row between"><span>원정 응원 비율 (응원단 버스)</span><b>'+Math.round(busShare(t)*100)+'%</b></div>'+
  '<p class="tiny muted">유지비: 훈련 시설은 단계별(150만 · 250만 · 300만), 유소년 아카데미 150만, 유니폼 매장 없음, 응원단 버스는 원정 경기에만 100만, 나머지 100만. 시설 짓기와 단계 올리기·철거는 시즌 중에도 되고, 경기 중에는 안 됩니다.</p>'+
  (used>limit?'<p class="bad tiny">건물 자리를 넘었습니다('+used+' / '+limit+'). 지은 시설은 그대로 쓰지만, 철거해서 자리가 나기 전에는 새로 지을 수 없습니다.</p>':used>=limit?'<p class="tiny muted">건물 자리가 모두 찼습니다. 경기장을 확장(오프시즌)하거나 시설을 철거하면 새로 지을 수 있습니다.</p>':'')+'</section>'+
  '<div class="facility-tabs" role="group" aria-label="시설 카테고리">'+['전체',...FACILITY_CATEGORIES].map(k=>{const list=FACILITY_TABLE.filter(f=>k==='전체'||f.category===k);return '<button data-facility-category="'+k+'" aria-pressed="'+(cat===k)+'" class="'+(cat===k?'primary':'')+'">'+k+' <small>'+list.filter(f=>facilityHas(t,f.id)).length+' / '+list.length+'</small></button>';}).join('')+'</div>'+
  '<div class="ops-grid">'+FACILITY_TABLE.filter(f=>cat==='전체'||f.category===cat).map(f=>facilityCardHTML(t,f)).join('')+'</div>';
};
function academyPanelHTML(t){
 const A=t.facilityData?.academy,p=A?.prospect;if(!p&&!facilityHas(t,'academy'))return '';
 if(!p)return '<section class="panel stack facility-academy"><h3>유소년 아카데미</h3><p class="tiny muted">시즌이 끝날 때마다 다음 시즌에 뛸 19세 유망주 1명이 영입비 없이 옵니다.'+(A?.season?' 시즌 '+A.season+' 유망주는 이미 왔습니다.':'')+'</p></section>';
 const block=academyHireBlock(t);
 return '<section class="panel stack facility-academy"><h3>유소년 아카데미 유망주 · 시즌 '+(p.academy?.season??'')+'</h3><p><b>'+esc(p.name)+'</b> · '+p.age+'세 · '+esc(p.hand)+' · 9개 능력 평균 '+meanAbility(p).toFixed(1)+'</p>'+statBars(p)+
  '<p>영입비 없음 · 경기 급여 '+money(p.salary)+'</p><button class="primary" data-facility-act="academy-hire" '+(block?'disabled':'')+'>무료 영입</button>'+(block?'<p class="tiny muted">'+esc(block)+'</p>':'<p class="tiny muted">다음 시즌 끝까지 데려오지 않으면 다른 곳으로 갑니다.</p>')+'</section>';
}
const marketBeforeFacilities=marketHTML;
marketHTML=function(t){const html=marketBeforeFacilities(t),panel=academyPanelHTML(t),at=html.indexOf('<section class="panel ops-banner">');return !panel?html:at<0?panel+html:html.slice(0,at)+panel+html.slice(at);};
function facilityTrainingNoteHTML(t){
 const rows=FACILITY_TABLE.filter(d=>d.train&&facilityHas(t,d.id)).map(d=>{const n=facilityLevel(t,d.id),x=FACILITY.train[n];return d.name+' '+n+'단계'+(x.discount?' · 훈련비 −'+Math.round(x.discount*100)+'%':'')+(x.exp>1?' · 경기 경험치 ×'+x.exp:'')+(x.cap?' · 경기 성장 한도 '+(GROWTH.matchCap+x.cap):'');});
 if(facilityHas(t,'food'))rows.push('선수 식당 · 모든 선수 경기 경험치 ×'+FACILITY.foodExp);
 return '<p class="tiny muted facility-training-note">'+(rows.length?rows.map(esc).join('<br>'):'훈련 시설 2·3단계는 훈련비를 깎아 주고 경기 경험치를 늘립니다.')+'</p>';
}
const growthArtworkBeforeFacilities=growthArtworkHTML;
growthArtworkHTML=function(t){const html=growthArtworkBeforeFacilities(t),at=html.lastIndexOf('<button data-go="facilities">');return at<0?html:html.slice(0,at)+facilityTrainingNoteHTML(t)+html.slice(at);};
// Settlement lines: the shops broken down under "매장 수입", the away gate in place of the away ticket line, the upkeep under the wages.
const financeResultBeforeFacilities=financeResult;
financeResult=function(m){
 let html=financeResultBeforeFacilities(m);const x=m?.finance?.facility;if(!x)return html;
 const row=(label,v)=>'<div class="row between facility-line"><span>'+label+'</span><b class="'+(v>=0?'good':'bad')+'">'+(v>=0?'+':'')+money(v)+'</b></div>';
 if(!x.home)html=html.replace(/<span>입장권 \(원정 · [^<]*\)<\/span>/,'<span>원정 응원 입장료 ('+(x.bus?'응원단 버스 '+x.bus+'단계 · '+Math.round(x.share*100)+'%':'응원단 버스 없음 · 0%')+' · 따라온 관객 '+spectators(x.awayCrowd)+'명)</span>');
 const shops=(x.uniform>0?row('· 유니폼 매장 (개인 팬 '+Number(x.fans).toLocaleString('ko-KR')+'명 × 500원)',x.uniform):'')+(x.restaurant>0?row('· 구장 음식점 (관중 '+spectators(x.crowd)+'명 × 1,000원)',x.restaurant):'')+(x.billboard>0?row('· 광고판 ('+leagueTierName(x.tier)+')',x.billboard):'');
 const after=(text,add)=>{const i=html.indexOf(text);if(i<0||!add)return;const j=html.indexOf('</div>',i);if(j>=0)html=html.slice(0,j+6)+add+html.slice(j+6);};
 after('<span>매장 수입</span>',shops);
 const names=(x.rows||[]).map(r=>(facilityDef(r.id)?.name||r.id)+' '+money(r.amount)).join(' · ');
 if(x.upkeep>0)after('<span>지급한 급여·유지비·미지급금</span>','<p class="tiny muted facility-line">· 그중 시설 유지비 '+money(x.upkeep)+(names?' ('+esc(names)+')':'')+'</p>');
 return html;
};
const leagueOffseasonBeforeFacilities=leagueOffseasonHTML;
leagueOffseasonHTML=function(t){
 const html=leagueOffseasonBeforeFacilities(t),p=t.facilityData?.academy?.prospect;if(!p)return html;
 const line='<p class="tiny gold">유소년 아카데미 유망주 '+esc(p.name)+'('+p.age+'세)가 왔습니다. 영입비 없이 데려올 수 있습니다. <button class="small" data-go="market">영입 화면</button></p>',at=html.indexOf('>')+1;
 return html.slice(0,at)+line+html.slice(at);
};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-facility-act]');if(!b||b.disabled||!activeGame)return;
 const t=team();if(!t)return;const id=b.dataset.id,act=b.dataset.facilityAct;
 if(act==='level'){const before=facilityLevel(t,id),error=upgradeFacility(t,id);toast(error||facilityDef(id).name+' '+(before+1)+'단계로 올렸습니다.');if(!error)save();render();return;}
 if(act==='academy-hire'){const p=t.facilityData?.academy?.prospect,error=hireAcademyProspect(t);toast(error||p.name+' 선수가 입단했습니다 · #'+p.number);if(!error){selection=p.id;save();}render();return;}
 if(act!=='demolish')return;
 const block=facilityDemolishBlock(t,id);if(block){toast(block);return;}
 const def=facilityDef(id),paid=facilityPaid(t,id),refund=facilityRefund(t,id);
 confirmBox(def.name+' 철거',def.name+(facilityLeveled(def)?'('+facilityLevel(t,id)+'단계)':'')+'을(를) 철거합니다. 들인 돈 '+money(paid)+'의 30%인 '+money(refund)+'을 돌려받고, 효과는 바로 사라집니다. 되돌릴 수 없습니다.',()=>{
  const r=demolishFacility(team(),id);if(r.error){toast(r.error);return;}
  save();toast(def.name+'을(를) 철거했습니다 · '+money(r.refund)+' 환급');render();
 },'철거');
});
const facilityStyle=document.createElement('style');facilityStyle.textContent='.facility-levels{margin:8px 0 8px 18px;padding:0;font-size:12px;line-height:1.6}.facility-levels .muted{opacity:.6}.facility-summary{margin:12px 0}.facility .tiny{margin:6px 0}.facility button+button{margin-left:6px}.facility-built{border-color:#68d2a4}.facility-academy{margin:12px 0}.facility-line span{padding-left:10px;font-size:12px}.facility-training-note{line-height:1.7;margin:8px 0}';
document.head.append(facilityStyle);

;document.currentScript?.remove();

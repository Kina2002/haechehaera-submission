// MLB 진출 보상 후보 비교 (run-economy-sim.cjs personas ... <MLB_BONUS 키> 결과). 기준은 P23 세 유저 결과(같은 구단·같은 시드).
// 사용법: node tests/analyze-mlb-bonus-sim.cjs <후보 결과 폴더> [요약.json]
// 후보 결과 파일 이름: mlb-bonus-<유저>-<후보>-<a|b>.json (a: world 20261130·구단 21000, b: world 20261150·구단 22000, 각 20구단 × 25시즌)
const fs=require('node:fs'),path=require('node:path');
const [dir,outFile]=process.argv.slice(2);
const PERSONAS=['normal','aggressive','thrifty'],NAME={thrifty:'아끼는',normal:'보통',aggressive:'무리하는'};
const VARIANTS=['base','pressure10','loy15','loy20','abil1','abil2','combo','abil3','abil3x2','choice','pressure15','loy20x5','young3','choice2','young1x15','choice3'];
const VNAME={base:'지금 규칙',pressure10:'여론 −10%p',loy15:'애정도 +15',loy20:'애정도 +20',abil1:'모두 능력 1개 +10',abil2:'모두 능력 2개 +10',combo:'셋 다 (−10%p·+15·1개 +10)',
  abil3:'3명 능력 1개 +10',abil3x2:'3명 능력 2개 +10',choice:'셋 중 고르기',
  // 참가자 결정 v04 (2026-11-11)
  pressure15:'여론 −15%p',loy20x5:'무작위 5명 애정도 +20',young3:'어린 3명 능력 1개 +10',choice2:'셋 중 고르기 v04',
  // 참가자 결정 v05 (2026-11-11)
  young1x15:'어린 1명 선배 주특기 +15',choice3:'셋 중 고르기 v05'};
const usable=f=>{if(!fs.existsSync(f))return false;const t=fs.readFileSync(f,'utf8');return !t.startsWith('{"skipped"');};// 건너뛴 자리 표시 파일은 뺍니다
const file=(p,v,s)=>v==='base'?path.join(__dirname,`persona-sim-20261111-${p}-${s}.json`):path.join(dir,`mlb-bonus-${p}-${v}-${s}.json`);
const med=a=>{const s=a.filter(Number.isFinite).sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:null;};
const mean=a=>{const s=a.filter(Number.isFinite);return s.length?s.reduce((x,y)=>x+y,0)/s.length:null;};
const pct=(a,b)=>b?Math.round(100*a/b):null,r1=x=>x==null?null:Math.round(10*x)/10;
const summary={};
for(const p of PERSONAS){summary[p]={};
  for(const v of VARIANTS){
    const fs2=['a','b'].map(s=>file(p,v,s));if(!fs2.every(usable))continue;
    const logs=fs2.flatMap(f=>JSON.parse(fs.readFileSync(f,'utf8')).results),n=logs.length,rows=logs.flat(),last=logs.map(l=>l.at(-1));
    const reach=t=>{const f=logs.map(l=>l.find(e=>e.nextTier>=t&&!e.disbanded)?.season).filter(Boolean);return {share:pct(f.length,n),median:med(f)};};
    const top=rows.filter(e=>e.tier===3);
    let rel=0,first=0;for(const l of logs)for(let i=0;i<l.length;i++){const e=l[i];if(e.tier===3&&e.nextTier===2&&!e.disbanded){rel++;if(i>0&&l[i-1].tier===2)first++;}}
    const alum=last.flatMap(e=>e.alumniLoyalty||[]);
    const late=rows.filter(e=>e.season>=10);
    const kept=rows.filter(e=>e.rebuild).map(e=>e.rebuild.kept);
    summary[p][v]={name:VNAME[v],clubs:n,
      reach2:reach(2),reach3:reach(3),
      topSeasonsPerClub:r1(top.length/n),top6th:pct(top.filter(e=>e.rank===6).length,top.length),topFirstSeasonRelegation:pct(first,rel),topWinRate:pct(top.reduce((a,e)=>a+e.points,0),top.length*10),
      mlbPerClub:r1(mean(last.map(e=>e.mlbCount))),mlbFailPerClub:r1(mean(last.map(e=>e.mlbFails))),firstMlb:med(logs.map(l=>l.find(e=>e.mlbCount>0)?.season).filter(Boolean)),
      starter10:r1(med(logs.map(l=>l[9]?.starterMean))),starter25:r1(med(last.map(e=>e.starterMean))),
      disbandClubs:pct(logs.filter(l=>l.some(e=>e.disbanded)).length,n),disbandsPerClub:r1(mean(last.map(e=>e.disbands))),loanClubs:pct(last.filter(e=>e.loans>0).length,n),
      calm:pct(rows.filter(e=>e.pressureEnd<30).length,rows.length),angry:pct(rows.filter(e=>e.pressureEnd>=60).length,rows.length),
      loy70Late:r1(mean(late.map(e=>e.loy70))),loyMeanLate:r1(mean(late.map(e=>e.loyMean))),departuresPerClub:r1(mean(last.map(e=>e.departures))),rebuildKept:kept.length?r1(mean(kept)):null,
      ticketsUsed:r1(mean(last.map(e=>e.ticketsUsed))),requestSum:Math.round(mean(last.map(e=>e.requestSum))),regularSum:Math.round(mean(last.map(e=>e.regularSum))),
      alumni90:r1(mean(last.map(e=>e.alumni90))),alumniLoyMedian:med(alum),
      fundsEnd:Math.round(med(last.map(e=>e.funds))),salaryEnd:Math.round(med(last.map(e=>e.salary))),
      bonusAbilPerClub:Math.round(mean(last.map(e=>e.bonusAbil||0))),bonusLoyPerClub:Math.round(mean(last.map(e=>e.bonusLoy||0))),
      ...(last[0].bonusPick?{picks:Object.fromEntries(['pressure','loyalty','ability'].map(k=>[k,r1(mean(last.map(e=>e.bonusPick?.[k]||0)))]))}:{})};
  }
}
for(const p of PERSONAS){console.log(`\n===== ${NAME[p]} 유저 =====`);
  for(const [v,s] of Object.entries(summary[p]))console.log(`${s.name.padEnd(22)} 2부 ${s.reach2.share}%·${s.reach2.median} | 1부 ${s.reach3.share}%·${s.reach3.median} | 1부 시즌 ${s.topSeasonsPerClub}/구단 6위 ${s.top6th}% 첫시즌강등 ${s.topFirstSeasonRelegation}% 승률 ${s.topWinRate}% | MLB ${s.mlbPerClub}·실패 ${s.mlbFailPerClub}·첫 ${s.firstMlb} | 출전 ${s.starter10}→${s.starter25} | 해체 ${s.disbandClubs}%(${s.disbandsPerClub}) 대출 ${s.loanClubs}% | 평온 ${s.calm}% 분노+ ${s.angry}% | 애정70 ${s.loy70Late}명 평균 ${s.loyMeanLate} 떠남 ${s.departuresPerClub} 재창단 남음 ${s.rebuildKept} | 회생권 ${s.ticketsUsed} 요청 ${s.requestSum} 정기 ${s.regularSum} 출신90 ${s.alumni90} 출신 애정 ${s.alumniLoyMedian} | 자금 ${s.fundsEnd} 급여 ${s.salaryEnd} | 보너스 능력 ${s.bonusAbilPerClub} 애정 ${s.bonusLoyPerClub}${s.picks?' | 고른 횟수 여론/애정/능력 '+[s.picks.pressure,s.picks.loyalty,s.picks.ability].join('/'):''}`);}
if(outFile)fs.writeFileSync(outFile,JSON.stringify(summary,null,1)+'\n');

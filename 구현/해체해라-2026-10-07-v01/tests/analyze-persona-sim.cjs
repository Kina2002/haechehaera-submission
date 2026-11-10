// 세 유저 유형 플레이 분석 집계 (run-economy-sim.cjs personas 결과). 유저마다 결과 파일 여러 개를 합칩니다.
// 사용법: node tests/analyze-persona-sim.cjs 아끼는1.json,아끼는2.json 보통1.json,보통2.json 무리한1.json,무리한2.json [요약.json]
const fs=require('node:fs');
const args=process.argv.slice(2),outFile=args.length>3?args.pop():null;
const groups=args.map(g=>g.split(',').map(f=>JSON.parse(fs.readFileSync(f,'utf8'))));
const TIER=['동네','지역','2부','1부'];
const med=a=>{const s=a.filter(Number.isFinite).sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:NaN;};
const mean=a=>{const s=a.filter(Number.isFinite);return s.length?s.reduce((x,y)=>x+y,0)/s.length:NaN;};
const pct=(a,b)=>b?Math.round(100*a/b):NaN;
const summary={};
for(const reps of groups){
  const name=reps[0].personaName,logs=reps.flatMap(r=>r.results),n=logs.length,S=reps[0].seasons,rows=logs.flat();
  const s={name,clubs:n,seasons:S};
  // 진행: 처음 각 리그에 닿은 시즌
  s.reach=[1,2,3].map(t=>{const f=logs.map(l=>l.find(e=>e.nextTier>=t)?.season).filter(Boolean);return {tier:TIER[t],share:pct(f.length,n),median:med(f)};});
  // 리그별 승률·강등·승격
  s.byTier=[0,1,2,3].map(t=>{const r=rows.filter(e=>e.tier===t);return {tier:TIER[t],seasons:r.length,winRate:pct(r.reduce((a,e)=>a+e.points,0),r.length*10),
    promoted:pct(r.filter(e=>e.nextTier>t&&!e.disbanded).length,r.length),relegated:pct(r.filter(e=>e.nextTier<t&&!e.disbanded).length,r.length),
    rank56:pct(r.filter(e=>e.rank>=5).length,r.length)};});
  // 승격 직후 시즌의 승률 변화 (같은 구단의 승격 직전 시즌 → 승격 첫 시즌)
  s.jump=[1,2,3].map(t=>{const d=[],money=[];for(const l of logs)for(let i=1;i<l.length;i++)if(l[i].tier===t&&l[i-1].tier===t-1&&!l[i-1].disbanded){
      d.push(l[i].points-l[i-1].points);money.push((l[i].flow.league||0)+(l[i].flow.prize||0)-(l[i-1].flow.league||0)-(l[i-1].flow.prize||0));}
    const bounce=[];for(const l of logs)for(let i=1;i<l.length;i++)if(l[i].tier===t&&l[i-1].tier===t-1&&!l[i-1].disbanded)bounce.push(l[i].nextTier<t?1:0);
    return {to:TIER[t],promotions:d.length,winsChange:mean(d),immediateRelegation:pct(bounce.reduce((a,b)=>a+b,0),bounce.length),leagueMoneyFirstSeason:Math.round(mean(money))};});
  // 시즌별 흐름
  s.bySeason=[1,3,5,8,10,12,15,18,20,22,25].filter(x=>x<=S).map(x=>{const at=logs.map(l=>l[x-1]).filter(Boolean);
    return {season:x,winRate:pct(at.reduce((a,e)=>a+e.points,0),at.length*10),funds:Math.round(med(at.map(e=>e.funds))),starter:+med(at.map(e=>e.starterMean)).toFixed(1),
      pressure:Math.round(med(at.map(e=>e.pressureEnd))),danger:pct(at.filter(e=>e.pressureEnd>=90).length,at.length),loy70:+mean(at.map(e=>e.loy70)).toFixed(1),
      tiers:[0,1,2,3].map(t=>pct(at.filter(e=>e.nextTier===t).length,at.length)).join('/')};});
  // 위기 기능
  const last=logs.map(l=>l.at(-1));
  s.crisis={disbandedClubs:pct(logs.filter(l=>l.some(e=>e.disbanded)).length,n),disbandsPerClub:+mean(last.map(e=>e.disbands)).toFixed(2),
    loanClubs:pct(last.filter(e=>e.loans>0).length,n),loansPerClub:+mean(last.map(e=>e.loans)).toFixed(2),forfeitClubs:pct(logs.filter(l=>l.some(e=>e.forfeits>0)).length,n),
    stuckSeasons:rows.filter(e=>e.stuck).length};
  // MLB·후원·회생권
  s.mlb={successPerClub:+mean(last.map(e=>e.mlbCount)).toFixed(1),failPerClub:+mean(last.map(e=>e.mlbFails)).toFixed(1),clubsWithMlb:pct(last.filter(e=>e.mlbCount>0).length,n),
    firstMlbSeason:med(logs.map(l=>l.find(e=>e.mlbCount>0)?.season).filter(Boolean)),requests:+mean(last.map(e=>e.requests)).toFixed(2),refusals:+mean(last.map(e=>e.refusals)).toFixed(2),
    requestSum:Math.round(mean(last.map(e=>e.requestSum))),regularSum:Math.round(mean(last.map(e=>e.regularSum))),ticketsHeld:+mean(last.map(e=>e.tickets)).toFixed(2),
    ticketsUsed:+mean(last.map(e=>e.ticketsUsed)).toFixed(2),feePerClub:Math.round(mean(last.map(e=>e.mlbFee)))};
  // 시설: 끝에 가진 비율, 처음 지은 시즌, 돈 수지
  const ids=[...new Set(rows.flatMap(e=>e.fac||[]))];
  s.facilities=ids.map(id=>{const first=logs.map(l=>l.find(e=>(e.fac||[]).includes(id))?.season).filter(Boolean);
    const st=last.map(e=>e.facStats?.[id]).filter(Boolean);const games=st.reduce((a,x)=>a+x.games,0);
    return {id,everBuilt:pct(first.length,n),haveAtEnd:pct(last.filter(e=>(e.fac||[]).includes(id)).length,n),firstSeason:med(first),
      cost:Math.round(mean(st.map(x=>x.cost))),incomePerGame:games?+(st.reduce((a,x)=>a+x.inc,0)/games).toFixed(1):0,maintPerGame:games?+(st.reduce((a,x)=>a+x.maint,0)/games).toFixed(1):0};})
    .sort((a,b)=>b.everBuilt-a.everBuilt);
  s.levels={bus:med(last.map(e=>e.lvl?.bus||0)),bat:med(last.map(e=>e.lvl?.bat||0)),pitch:med(last.map(e=>e.lvl?.pitch||0)),field:med(last.map(e=>e.lvl?.field||0)),
    stadium:[1,2,3,4,5].map(g=>pct(last.filter(e=>e.stadium===g).length,n)).join('/'),promotionDelays:+mean(last.map(e=>e.delays||0)).toFixed(2),prospects:+mean(last.map(e=>e.prospects||0)).toFixed(1)};
  // 돈의 쓰임 (25시즌 누적, 구단 평균)
  const flow=k=>Math.round(mean(last.map(e=>e.flow[k]||0)));
  const income=['base','runs','win','gate','stores','awayGate','league','prize'].reduce((a,k)=>a+flow(k),0)+Math.round(mean(last.map(e=>e.mlbFee+e.requestSum+e.regularSum)));
  s.money={income,training:flow('training'),recruit:flow('recruit'),facilities:flow('facilities'),stadium:flow('stadium'),salary:flow('salary'),maintenance:flow('maintenance'),
    trainingShare:pct(flow('training'),income),recruitShare:pct(flow('recruit'),income),fundsEnd:Math.round(med(last.map(e=>e.funds))),
    ticket:{median:med(rows.map(e=>e.ticket)),min:Math.min(...rows.map(e=>e.ticket)),max:Math.max(...rows.map(e=>e.ticket))}};
  s.players={departuresPerClub:+mean(last.map(e=>e.departures)).toFixed(1),retiredPerClub:+mean(last.map(e=>e.retired)).toFixed(1),
    trainPointsPerSeason:+(mean(last.map(e=>e.trainPoints))/S).toFixed(1),perfPointsPerSeason:+(mean(last.map(e=>e.perfPoints))/S).toFixed(1)};
  summary[name]=s;
}
// 출력
for(const [name,s] of Object.entries(summary)){
  console.log(`\n===== ${name} (구단 ${s.clubs} · ${s.seasons}시즌) =====`);
  console.log('처음 도달:',s.reach.map(r=>`${r.tier} ${r.share}% (중앙값 ${r.median}시즌)`).join(' · '));
  console.log('리그별:',s.byTier.map(t=>`${t.tier} ${t.seasons}시즌 승률 ${t.winRate}% 승격 ${t.promoted}% 강등 ${t.relegated}% 5·6위 ${t.rank56}%`).join(' | '));
  console.log('승격 직후:',s.jump.map(j=>`${j.to} 승격 ${j.promotions}번 · 승점 변화 ${j.winsChange.toFixed(1)} · 바로 강등 ${j.immediateRelegation}% · 리그 수입 +${j.leagueMoneyFirstSeason}`).join(' | '));
  console.log('시즌별 (승률·자금·출전평균·여론·여론90+·애정70+·리그분포):');
  for(const x of s.bySeason)console.log(`  ${String(x.season).padStart(2)}: ${x.winRate}% · ${x.funds} · ${x.starter} · ${x.pressure}% · ${x.danger}% · ${x.loy70}명 · ${x.tiers}`);
  console.log('위기:',JSON.stringify(s.crisis));
  console.log('MLB:',JSON.stringify(s.mlb));
  console.log('시설:',s.facilities.map(f=>`${f.id} 지음${f.everBuilt}%·끝${f.haveAtEnd}%·${f.firstSeason}시즌·비용${f.cost}·수입${f.incomePerGame}/유지${f.maintPerGame}`).join(' | '));
  console.log('단계:',JSON.stringify(s.levels));
  console.log('돈:',JSON.stringify(s.money));
  console.log('선수:',JSON.stringify(s.players));
}
if(outFile)fs.writeFileSync(outFile,JSON.stringify(summary,null,1)+'\n');

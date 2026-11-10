// P24 해결 방안의 1차 추정 (P23 세 유저 결과를 다시 세는 정적 계산, 새 시뮬레이션 없음).
// 사용법: node tests/analyze-p24-whatif.cjs tests [요약.json]
// 해체 여론 대안은 시즌 단위 근사(승패 ±5 + 순위 보정만, 미지급·대출·명예의 전당·후원 제외)라 대안끼리 상대 비교로만 봅니다.
const fs=require('fs'),path=require('path');
const dir=process.argv[2]||__dirname,out=process.argv[3];
const P=['thrifty','normal','aggressive'],NAME={thrifty:'아끼는',normal:'보통',aggressive:'무리한'};
const load=p=>['a','b'].flatMap(s=>JSON.parse(fs.readFileSync(path.join(dir,`persona-sim-20261111-${p}-${s}.json`),'utf8')).results);
const pct=(a,b)=>b?Math.round(1000*a/b)/10:null,mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:null;};
const MIDS=[39,51,63,75];
const R={};
for(const p of P){
  const logs=load(p),rows=logs.flat(),r={clubs:logs.length};
  // 1) 리그별 순위 분포, 1·2위 비율
  r.rankByTier=[0,1,2,3].map(t=>{const x=rows.filter(e=>e.tier===t);return {tier:t,seasons:x.length,ranks:[1,2,3,4,5,6].map(k=>pct(x.filter(e=>e.rank===k).length,x.length)),
    points:+mean(x.map(e=>e.points)).toFixed(2),starter:+mean(x.map(e=>e.starterMean)).toFixed(1),gap:+(mean(x.map(e=>e.starterMean))-MIDS[t]).toFixed(1)};});
  // 2) 승격 첫 시즌: 출전 평균과 리그 중위권 차이, 첫 시즌 순위
  r.entry=[1,2,3].map(t=>{const d=[],rk=[],pts=[];for(const l of logs)for(let i=1;i<l.length;i++)if(l[i].tier===t&&l[i-1].tier===t-1&&!l[i-1].disbanded){d.push(l[i].starterMean-MIDS[t]);rk.push(l[i].rank);pts.push(l[i].points);}
    return {tier:t,n:d.length,gap:+mean(d).toFixed(1),ranks:[1,2,3,4,5,6].map(k=>pct(rk.filter(x=>x===k).length,rk.length)),points:+mean(pts).toFixed(2)};});
  // 3) 1부 강등 중 승격 첫 시즌 강등 비율 (첫 시즌 강등 면제 효과)
  {let rel=0,first=0;for(const l of logs)for(let i=0;i<l.length;i++){const e=l[i];if(e.tier===3&&e.nextTier===2&&!e.disbanded){rel++;if(i>0&&l[i-1].tier===2)first++;}}
   r.top={relegations:rel,firstSeason:first,firstShare:pct(first,rel),seasonsIn1:rows.filter(e=>e.tier===3).length,
     clubSeasonsIn1PerClub:+(rows.filter(e=>e.tier===3).length/logs.length).toFixed(2)};}
  // 4) 리그별 머문 시즌 (처음 그 리그에 올라간 뒤 다음 리그로 처음 올라가기까지)
  r.stay=[1,2].map(t=>{const d=[];for(const l of logs){const a=l.findIndex(e=>e.tier===t),b=l.findIndex(e=>e.tier===t+1);if(a>=0&&b>a)d.push(b-a);}return {tier:t,n:d.length,median:med(d)};});
  // 5) 해체 시점 분류와 대체 회생권 시점
  {const ev=[];for(const l of logs){let reach1=false,reach2=false;for(const e of l){if(e.disbanded||e.pressureEnd>=100)ev.push({season:e.season,reach1,reach2,mlb:e.mlbCount>0,blocked:!e.disbanded});if(e.nextTier>=1&&!e.disbanded)reach1=true;if(e.nextTier>=2&&!e.disbanded)reach2=true;}}
   const dis=ev.filter(x=>!x.blocked);
   // 한 구단당 1장: 처음으로 조건을 갖춘 뒤의 첫 해체만 막는다고 가정 (이미 MLB 회생권으로 막힌 경우는 제외)
   const alt=key=>{let n=0;for(const l of logs){let reach1=false,reach2=false,used=false;for(const e of l){const cond=key==='start'?true:key==='r1'?reach1:reach2;
       if(e.disbanded&&cond&&!used){n++;used=true;}if(!e.disbanded&&e.pressureEnd>=100)used=true;// MLB 회생권을 이미 쓴 구단은 1장을 쓴 것으로
       if(e.nextTier>=1&&!e.disbanded)reach1=true;if(e.nextTier>=2&&!e.disbanded)reach2=true;}}return n;};
   const clubsDis=logs.filter(l=>l.some(e=>e.disbanded)).length;
   r.disband={events:dis.length,clubsWithDisband:clubsDis,beforeReach1:dis.filter(x=>!x.reach1).length,afterReach1:dis.filter(x=>x.reach1&&!x.reach2).length,afterReach2:dis.filter(x=>x.reach2).length,
     withMlb:dis.filter(x=>x.mlb).length,ticketUsed:ev.filter(x=>x.blocked).length,firstSeasonMedian:med(logs.map(l=>l.find(e=>e.disbanded)?.season).filter(Boolean)),
     blockIfStart:alt('start'),blockIfReach1:alt('r1'),blockIfReach2:alt('r2')};}
  // 6) 정기 후원: 위기 시즌(여론 90+ 또는 대출 남음, 또는 여론 60+)에 기억 애정도 T 이상 MLB 출신이 있었나
  {const th=[90,70,50,30],crisis=rows.filter(e=>e.pressureEnd>=90||e.loanLeft>0),crisis60=rows.filter(e=>e.pressureEnd>=60||e.loanLeft>0);
   const lastAl=logs.flatMap(l=>l.at(-1).alumniLoyalty||[]);
   r.regular={crisisSeasons:crisis.length,crisis60Seasons:crisis60.length,
     withAlumni:th.map(T=>({T,crisis90:crisis.filter(e=>(e.alumniLoyalty||[]).some(x=>x>=T)).length,crisis60:crisis60.filter(e=>(e.alumniLoyalty||[]).some(x=>x>=T)).length})),
     alumniEnd:{n:lastAl.length,median:med(lastAl),max:lastAl.length?Math.max(...lastAl):null,share70:pct(lastAl.filter(x=>x>=70).length,lastAl.length),share50:pct(lastAl.filter(x=>x>=50).length,lastAl.length)},
     firstMlbSeason:med(logs.map(l=>l.find(e=>e.mlbCount>0)?.season).filter(Boolean))};}
  // 7) 해체 여론 단계 분포와 대체 규칙(시즌 단위 근사)
  {const band=x=>x>=90?3:x>=60?2:x>=30?1:0,dist=a=>[0,1,2,3].map(b=>pct(a.filter(x=>band(x)===b).length,a.length));
   r.pressure={all:dist(rows.map(e=>e.pressureEnd)),byTier:[0,1,2,3].map(t=>dist(rows.filter(e=>e.tier===t).map(e=>e.pressureEnd)))};
   // 근사 모형: 시즌마다 P += 50 − 10×승점 + 순위 보정, 0~100. 미지급·대출·명예의 전당·후원은 빠짐. 해체되면(근사 100) 20에서 다시.
   const RULES={
     now:{name:'지금 규칙',mod:[-30,-15,0,0,10,20]},
     owner:{name:'구단주 목표 (리그별 목표 순위 달성 −15, 못 하면 +15)',goal:[2,3,4,5]},
     stall:{name:'정체 압박 (같은 리그 4시즌째부터 시즌마다 +10)',mod:[-30,-15,0,0,10,20],stall:[4,10]},
     tier:{name:'상위 리그 기대 (2부·1부에서 3·4위도 +5, 5·6위 +15·+25)',mod:[-30,-15,0,0,10,20],modTop:[-30,-15,5,5,15,25]},
     milder:{name:'승리 −4 / 패배 +5 (지금 −5/+5)',mod:[-30,-15,0,0,10,20],win:4,loss:5}};
   r.pressureAlt={};
   for(const [k,rule] of Object.entries(RULES)){let err=[],all=[],hits=0,seasonsN=0;
     for(const l of logs){let P0=30,same=0,prevTier=-1;for(const e of l){
       const W=e.points,L=10-e.points;// 무승부는 0.5씩 나눠 근사
       let d=-(rule.win||5)*W+(rule.loss||5)*L;
       if(rule.goal)d+=e.rank<=rule.goal[e.tier]?-15:15;else d+=(rule.modTop&&e.tier>=2?rule.modTop:rule.mod)[e.rank-1];
       same=e.tier===prevTier?same+1:1;prevTier=e.tier;if(rule.stall&&same>=rule.stall[0])d+=rule.stall[1];
       let P1=Math.max(0,Math.min(100,P0+d));all.push(P1);seasonsN++;
       if(k==='now'&&!e.disbanded&&e.loanLeft===0&&e.forfeits===0)err.push(Math.abs(P1-e.pressureEnd));
       if(P1>=100){hits++;P1=20;}
       // 실제 기록의 해체·재창단은 그대로 따라갑니다(리그·성적은 기록 그대로)
       if(e.disbanded&&P1!==20)P1=20;
       if(e.nextTier!==e.tier)same=0;
       P0=P1;}}
     r.pressureAlt[k]={name:rule.name,dist:dist(all),hundredPerClub:+(hits/logs.length).toFixed(2),hundredShare:pct(hits,seasonsN),...(k==='now'?{meanAbsErr:+mean(err).toFixed(1)}:{})};}}
  // 8) 경기장: 리그·등급별 시즌 입장 수입(홈+원정)과 음식점·상점, 입장료
  {const per=[];for(const l of logs)for(let i=0;i<l.length;i++){const e=l[i],q=i?l[i-1]:null;if(q&&(q.disbanded))continue;
     const f=k=>(e.flow[k]||0)-(q?.flow[k]||0);const rest=(e.facStats?.restaurant?.inc||0)-(q?.facStats?.restaurant?.inc||0);
     per.push({tier:e.tier,stadium:e.stadium,gate:f('gate')+f('awayGate'),stores:f('stores')+rest,ticket:e.ticket,home:f('homeGames')});}
   r.stadium=[[2,2],[2,3],[3,3]].map(([t,g])=>{const x=per.filter(z=>z.tier===t&&z.stadium===g);const gate=mean(x.map(z=>z.gate)),st=mean(x.map(z=>z.stores));
     // 좌석이 다 차는 상태에서 좌석 ×(g+1)/g: 입장 수입 ×((g+1)/g)^(1−1/1.8), 음식점·상점 ×(g+1)/g
     const k=(g+1)/g,extra=gate*(k**(1-1/1.8)-1)+st*(k-1);
     return {tier:t,stadium:g,seasons:x.length,gatePerSeason:Math.round(gate),storesPerSeason:Math.round(st),ticketMedian:med(x.map(z=>z.ticket)),ticketMax:x.length?Math.max(...x.map(z=>z.ticket)):null,nextGradeExtraPerSeason:Math.round(extra)};});
   r.stadiumEnd=[1,2,3,4,5].map(g=>pct(logs.filter(l=>l.at(-1).stadium===g).length,logs.length));}
  // 9) 돈: 시즌별 자금 중앙값, 2부·1부에서 자금 1억 이상인 시즌 비율
  r.funds=[1,5,10,15,20,25].map(s=>({season:s,median:med(logs.map(l=>l[s-1]?.funds).filter(x=>x!=null))}));
  r.idle=[1,2,3].map(t=>{const x=rows.filter(e=>e.tier===t);return {tier:t,over5000:pct(x.filter(e=>e.funds>=5000).length,x.length),over10000:pct(x.filter(e=>e.funds>=10000).length,x.length),median:med(x.map(e=>e.funds))};});
  {const last=logs.map(l=>l.at(-1)),fl=k=>mean(last.map(e=>e.flow[k]||0));
   const inc=['base','runs','win','gate','stores','awayGate','league','prize'].reduce((a,k)=>a+fl(k),0)+mean(last.map(e=>e.mlbFee+e.requestSum+e.regularSum));
   r.spend={income:Math.round(inc),training:Math.round(fl('training')),salary:Math.round(fl('salary')),maintenance:Math.round(fl('maintenance')),facilities:Math.round(fl('facilities')),stadium:Math.round(fl('stadium')),recruit:Math.round(fl('recruit')),
     unspentShare:pct(mean(last.map(e=>e.funds)),inc)};}
  R[p]=r;
}
for(const p of P){const r=R[p];console.log(`\n=== ${NAME[p]} (${r.clubs}구단) ===`);
  console.log('리그별 순위 1~6위 %:');for(const x of r.rankByTier)console.log(`  ${x.tier}: ${x.seasons}시즌 ${x.ranks.join('/')} · 승점 ${x.points} · 출전 ${x.starter} (리그 중위권과 ${x.gap})`);
  console.log('승격 첫 시즌:');for(const x of r.entry)console.log(`  →${x.tier}: ${x.n}번 · 차이 ${x.gap} · 순위 ${x.ranks.join('/')} · 승점 ${x.points}`);
  console.log('1부:',JSON.stringify(r.top));console.log('머문 시즌:',JSON.stringify(r.stay));
  console.log('해체:',JSON.stringify(r.disband));console.log('정기 후원:',JSON.stringify(r.regular));
  console.log('여론 단계 0-29/30-59/60-89/90+ %:',r.pressure.all.join('/'),'· 리그별',r.pressure.byTier.map(x=>x.join('/')).join(' | '));
  for(const [k,v] of Object.entries(r.pressureAlt))console.log(`  ${k} ${v.name}: ${v.dist.join('/')} · 100% 도달 ${v.hundredPerClub}/구단 (${v.hundredShare}%)${v.meanAbsErr!=null?' · 근사 오차 '+v.meanAbsErr:''}`);
  console.log('경기장:',JSON.stringify(r.stadium),'· 끝 등급',r.stadiumEnd.join('/'));
  console.log('자금:',JSON.stringify(r.funds));console.log('여유:',JSON.stringify(r.idle));console.log('지출:',JSON.stringify(r.spend));}
// 추가: 리그별 성장(훈련·경기 경험), MLB 유출, 강등 때 회생권 보유, 예비금 대비 자금
const RES={thrifty:4,normal:2,aggressive:1};// 시험용 감독의 예비금(경기 수)
for(const p of P){const logs=load(p);console.log(`\n=== ${NAME[p]} · 추가 ===`);
  for(const t of [0,1,2,3]){const ds=[],tr=[],pf=[],mlb=[];
    for(const l of logs)for(let i=1;i<l.length;i++){const e=l[i],q=l[i-1];if(e.tier!==t||q.disbanded||q.tier!==t)continue;ds.push(e.starterMean-q.starterMean);tr.push(e.trainPoints-q.trainPoints);pf.push(e.perfPoints-q.perfPoints);mlb.push(e.mlbCount-q.mlbCount);}
    console.log(`  ${t}: 같은 리그 연속 시즌 ${ds.length} · 출전 평균 변화 ${mean(ds)?.toFixed(2)} · 훈련 점수 ${mean(tr)?.toFixed(1)} · 경기 경험 점수 ${mean(pf)?.toFixed(1)} · MLB 진출 ${mean(mlb)?.toFixed(2)}명/시즌`);}
  for(const t of [3,2,1]){let rel=0,held=0;const clubs=new Set(),clubsHeld=new Set();logs.forEach((l,ci)=>{for(const e of l)if(e.tier===t&&e.nextTier===t-1&&!e.disbanded){rel++;clubs.add(ci);if(e.tickets>0){held++;clubsHeld.add(ci);}}});
    console.log(`  ${['','지역','2부','1부'][t]} 강등 ${rel}번 (${clubs.size}구단) · 그때 회생권 보유 ${held}번 (${clubsHeld.size}구단)`);}
  const ratio=logs.flatMap(l=>l.slice(4).map(e=>e.funds/(e.fixed*RES[p])));console.log(`  5시즌 이후 자금 ÷ 예비금 기준: 중앙값 ${med(ratio).toFixed(2)} · 경기당 고정비 중앙값 ${med(logs.flatMap(l=>l.slice(4).map(e=>e.fixed)))}`);
  const mlbTier=[0,1,2,3].map(t=>{let n=0;for(const l of logs)for(let i=1;i<l.length;i++)if(l[i].tier===t&&!l[i-1].disbanded)n+=Math.max(0,l[i].mlbCount-l[i-1].mlbCount);return n;});
  console.log(`  MLB 진출이 일어난 리그(동네/지역/2부/1부): ${mlbTier.join('/')}`);}
if(out)fs.writeFileSync(out,JSON.stringify(R,null,1));

// 리그 시즌 시험 결과(run-economy-sim.cjs의 top·youth·p21 묶음)를 시즌 지점별로 모아 봅니다. 여러 표본 파일은 안별로 합칩니다.
// 사용법: node tests/analyze-season-sim.cjs 결과1.json[,결과2.json,...] [지점=10,15,20,25]
const fs=require('node:fs');
const [files,cps='10,15,20,25']=process.argv.slice(2);
const reports=files.split(',').map(f=>JSON.parse(fs.readFileSync(f,'utf8')));
const checkpoints=cps.split(',').map(Number);
const med=a=>{const s=a.filter(Number.isFinite).sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:NaN;};
const pct=(a,b)=>b?Math.round(100*a/b)+'%':'-';
// 비율의 95% 근사 오차폭(정규 근사). 구단 수가 적으면 넓습니다.
const moe=(k,n)=>{const p=k/n;return Math.round(196*Math.sqrt(Math.max(p*(1-p),1/(4*n))/n));};
for(const vk of Object.keys(reports[0].results)){
  const logs=reports.flatMap(r=>r.results[vk]||[]),n=logs.length;
  console.log('\n'+vk+' — '+reports[0].variants[vk]+` (구단 ${n}, 파일 ${reports.length})`);
  for(const s of checkpoints){
    const at=logs.map(l=>l[Math.min(s,l.length)-1]).filter(Boolean);if(!at.length)continue;
    const reached=x=>logs.filter(l=>l.slice(0,s).some(e=>e.nextTier>=x)).length,r3=reached(3);
    const dist=[0,1,2,3].map(x=>pct(at.filter(e=>e.nextTier===x).length,at.length)).join('/');
    console.log(` ${String(s).padStart(2)}시즌: 2부 도달 ${pct(reached(2),n)} · 1부 도달 ${pct(r3,n)} (±${moe(r3,n)}%p) · 리그(동네/지역/2부/1부) ${dist}`+
      ` · 출전 평균 ${med(at.map(e=>e.starterMean)).toFixed(1)}`+
      (at[0].ageMean!=null?` · 출전 나이 ${med(at.map(e=>e.ageMean)).toFixed(1)} · 25세 이하 주전 ${med(at.map(e=>e.youngStarters))}`:'')+
      (at[0].ageLoss!=null?` · 누적 노화 감소 ${Math.round(med(at.map(e=>e.ageLoss)))}`:'')+
      ` · 해체 경험 ${pct(logs.filter(l=>l.slice(0,s).some(e=>e.disbanded)).length,n)}`);
  }
  const last=logs.map(l=>l.at(-1)),top=logs.flatMap(l=>l.filter(e=>e.tier===3));
  if(last[0].retired!=null)console.log(` 은퇴 구단당 ${(last.reduce((a,e)=>a+(e.retired||0),0)/n).toFixed(1)} (선수 희망 ${(last.reduce((a,e)=>a+(e.retiredWish||0),0)/n).toFixed(1)}, 감독 결정 ${(last.reduce((a,e)=>a+(e.retiredByManager||0),0)/n).toFixed(1)})`);
  console.log(` 1부에서 보낸 시즌 ${top.length} · 순위 1~6위 ${[1,2,3,4,5,6].map(k=>pct(top.filter(e=>e.rank===k).length,top.length)).join('/')}`+
    ` · MLB 구단당 ${(last.reduce((a,e)=>a+(e.mlbCount||0),0)/n).toFixed(1)}명 · 대출 구단당 ${(last.reduce((a,e)=>a+(e.loans||0),0)/n).toFixed(2)}번`);
}

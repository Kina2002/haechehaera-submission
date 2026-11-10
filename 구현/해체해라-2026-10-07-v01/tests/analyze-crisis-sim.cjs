// 자금·해체 여론 시험 원자료 요약. node tests/analyze-crisis-sim.cjs 결과.json
const fs=require('node:fs');
const file=process.argv[2];if(!file)throw Error('결과 JSON 경로가 필요합니다');
const report=JSON.parse(fs.readFileSync(file,'utf8'));
const median=values=>{const a=[...values].sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:null;};
for(const [name,runs] of Object.entries(report.results)){
  const last=runs.map(log=>log.at(-1));
  const loaned=runs.filter(log=>log.at(-1).loans>0);
  const dissolved=last.filter(x=>x.dissolved);
  const survivors=last.filter(x=>!x.dissolved);
  const recovered=loaned.filter(log=>{
    const first=log.find(x=>x.loans>0).season;
    return log.some(x=>x.season>first&&!x.dissolved&&!x.stuck);
  });
  const summary={clubs:runs.length,dissolved:dissolved.length,dissolutionSeasons:dissolved.map(x=>x.season),
    loaned:loaned.length,repaidByEnd:loaned.filter(log=>log.at(-1).loan===0).length,
    survivedAPlayableSeasonAfterLoan:recovered.length,everStuck:runs.filter(log=>log.some(x=>x.stuck)).length,
    forfeits:last.reduce((s,x)=>s+x.forfeits,0),survivorOpinionMedian:median(survivors.map(x=>x.opinion)),
    survivorOpinionAtLeast60:survivors.filter(x=>x.opinion>=60).length};
  console.log(name,JSON.stringify(summary));
}

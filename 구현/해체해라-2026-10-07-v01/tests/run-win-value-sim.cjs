// 현재 금액 규칙에서 4억 4천만원이 어느 정도의 경기 수입인지 비교합니다.
// node tests/run-win-value-sim.cjs [구단 수=5] [결과.json]
const fs=require('node:fs');
const {career,POLICIES}=require('./run-economy-legacy-20261109.cjs');
const {createWorld}=require('./run-season-sim.cjs');

const n=Number(process.argv[2])||5,out=process.argv[3],runs=[];
for(let i=0;i<n;i++){
  const seed=20261120+i*31;
  runs.push(career(createWorld(seed),POLICIES.normal,{league:true,contractGames:10,seasons:6,seed:seed+5,growth:{K:10,cap:80}}));
}
const sum=(key)=>runs.reduce((s,r)=>s+r.flow[key],0);
const games=sum('homeGames')+sum('awayGames'),wins=sum('winGames'),losses=sum('lossGames');
const result={version:'2026-11-09-win-value-v01',clubs:n,seasons:6,target:44000,unit:'만원',
  notes:['보통 운영, 현재 돈 규칙, 리그 6시즌, 계약 10경기, 경기 성장 K=10',
    '승리 경기 손익은 경기 수입에서 해당 경기 급여·유지비를 뺀 값. 훈련·건설비는 별도',
    '전액을 저축하는 가정과 실제 가상 감독의 지출을 구분'],
  summary:{games,wins,losses,draws:sum('drawGames'),winRate:wins/games,
    winBonusPerWin:600,winGrossMean:sum('winGross')/wins,winSettlementNetMean:sum('winNet')/wins,
    lossSettlementNetMean:sum('lossNet')/losses,
    gameSettlementNetMean:(sum('homeNet')+sum('awayNet'))/games,
    actualFundsChangePerGame:runs.reduce((s,r)=>s+r.log.at(-1).funds-3000,0)/games,
    trainingPerGame:sum('training')/games,facilityPerGame:sum('facilities')/games,stadiumPerGame:sum('stadium')/games,
    winsForBonusOnly:Math.ceil(44000/600),winsForGrossOnly:Math.ceil(44000/(sum('winGross')/wins)),
    winsForSettlementNetOnly:Math.ceil(44000/(sum('winNet')/wins))},
  runs:runs.map(r=>({last:r.log.at(-1),flow:r.flow}))};
console.log(JSON.stringify(result.summary,null,2));
if(out)fs.writeFileSync(out,JSON.stringify(result,null,1)+'\n');

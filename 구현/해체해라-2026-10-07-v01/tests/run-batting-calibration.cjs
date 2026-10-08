const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {createSimulation}=require('./batting-simulation.cjs');
const run=createSimulation();
const count=100000;
const results=[30,50,80,85,100].map(contact=>{
  const row=run({contact,count});console.log(JSON.stringify(row));return row;
});
const report={
  source:'src/game.js',sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../src/game.js'))).digest('hex'),
  conditions:{otherBatterStats:50,opponentStats:50,command:'contact',hand:'우타',tendency:'중앙',
    defense:'중앙/보통',fatigue:false,boneheads:false,eachPlateAppearanceStartsWithEmptyBases:true,
    plateAppearancesPerContact:count,seed:20261008},results
};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');

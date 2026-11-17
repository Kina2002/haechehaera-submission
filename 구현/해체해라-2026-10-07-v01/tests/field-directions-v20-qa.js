/* Local regression QA; load character-v17-qa.js first. Never runs on public saves. */
if(!['127.0.0.1','localhost'].includes(location.hostname))throw Error('Local QA only');
window.checkFieldDirections20=()=>{
 const checks=[],failures=[],R=CharacterPartsV17;let layouts=0,fielders=0;
 for(let body=0;body<6;body++)for(const defense of [false,true])for(let depth=0;depth<3;depth++)for(let side=0;side<3;side++){
  CharacterQA17.scene('idle',body,'우타',defense);const m=team().match,df=tside(m,1-attack(m));df.players.forEach(p=>p.appearance.body=body);m.defense={depth,side};m.formation=Object.fromEntries(df.lineup.filter(i=>i.pos!=='DH').map(i=>[i.id,fieldPosition(i.pos,m.defense)]));drawField(performance.now());layouts++;
  for(const s of StadiumViewV13.lastFrame.filter(r=>!r.offense&&r.position!=='C')){fielders++;const pos=fieldPosition(s.position,m.defense),p=ply(df,s.id),view=R.render(R.config(p,df),s.frame,{headwear:'cap',flip:s.flip,direction:s.direction}).view;
   if(!['F','FR','FL'].includes(view)||(view==='FR'&&pos[0]>=BASES[0][0])||(view==='FL'&&pos[0]<=BASES[0][0])||(s.position==='P'&&view!=='F'))failures.push({body,defense,depth,side,position:s.position,view});
  }
  const catcher=StadiumViewV13.lastFrame.find(r=>r.catcher);if(!catcher||catcher.direction!==3)failures.push({body,defense,depth,side,error:'catcher direction'});
 }
 checks.push({name:'6체형×9시프트×공격/수비 카메라의 홈 방향 대기',ok:failures.length===0,layouts,fielders});
 CharacterQA17.scene('idle',2,'우타',false);const m=team().match,df=tside(m,1-attack(m)),p=ply(df,df.lineup.find(i=>i.pos==='SS').id),I=FieldIntegrationV13;
 I.describe(p,df,'run',100,350,250,false);const run=I.describe(p,df,'run',200,340,250,true);checks.push({name:'달리는 수비수의 이동 방향 유지',ok:run.flip&&run.frame>=39&&run.frame<=46});
 const at=tside(m,attack(m)),bat=ply(at,at.lineup[m.order[attack(m)]].id);bat.hand='좌타';const batting=I.describe(bat,at,'bat',0,478,455,false);checks.push({name:'좌타자 타격 방향 유지',ok:batting.flip&&batting.frame>=47&&batting.frame<=49});
 return{checks,failures,runtimeErrors:runtimeErrors.slice(),internal:checks23()};
};

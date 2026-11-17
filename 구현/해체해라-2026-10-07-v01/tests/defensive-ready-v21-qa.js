/* Local-only integration QA. Load character-v17-qa.js first; no saved games are written. */
if(!['127.0.0.1','localhost'].includes(location.hostname))throw Error('Local QA only');
window.checkDefensiveReady21=()=>{
 const failures=[],checks=[],R=CharacterPartsV17;let layouts=0,fielders=0,moving=0;
 function inspect(body,defense,depth,side){
  const m=team().match,df=tside(m,1-attack(m));
  if(StadiumViewV13.low===defense)failures.push({body,defense,error:'wrong camera'});
  for(const s of StadiumViewV13.lastFrame.filter(r=>!r.offense&&!['P','C'].includes(r.position))){
   fielders++;const p=ply(df,s.id),a=R.config(p,df),identity=JSON.stringify(p.appearance),out=R.render(a,s.frame,{headwear:s.headwear,readyView:s.readyView,flip:s.flip,defense:true});
   const dx=BASES[0][0]-s.worldX,dy=BASES[0][1]-s.worldY,expect=Math.abs(dx)<=Math.abs(dy)*.3?'F':dx<0?'FL':'FR';
   if(s.readyView!==expect||out.view!==expect||out.pose!=='defensive-ready'||s.flip||out.gloveHand!=='anatomical-left'||identity!==JSON.stringify(p.appearance))failures.push({body,defense,depth,side,position:s.position,expected:expect,actual:s.readyView,render:out.view});
  }
  const pitcher=StadiumViewV13.lastFrame.find(r=>!r.offense&&r.position==='P'),catcher=StadiumViewV13.lastFrame.find(r=>r.catcher);
  if(!pitcher||pitcher.readyView||pitcher.frame!==0||!catcher||catcher.readyView||catcher.direction!==3)failures.push({body,defense,depth,side,error:'pitcher/catcher exception'});
 }
 for(let body=0;body<6;body++)for(const defense of[false,true])for(let depth=0;depth<3;depth++)for(let side=0;side<3;side++){
  CharacterQA17.scene('idle',body,'우타',defense);const m=team().match,df=tside(m,1-attack(m));df.players.forEach(p=>p.appearance.body=body);
  m.defense={depth,side};const before=Object.fromEntries(df.lineup.filter(i=>i.pos!=='DH').map(i=>[i.id,fieldPosition(i.pos,{depth:2-depth,side:2-side})])),after=Object.fromEntries(df.lineup.filter(i=>i.pos!=='DH').map(i=>[i.id,fieldPosition(i.pos,m.defense)]));
  shiftLead={left:275,total:550,from:before,to:after};drawField(performance.now());
  for(const s of StadiumViewV13.lastFrame.filter(r=>!r.offense&&!['P','C'].includes(r.position))){moving++;if(s.readyView||s.frame<39||s.frame>46)failures.push({body,defense,depth,side,error:'shift movement frozen',position:s.position,frame:s.frame});}
  shiftLead=null;m.formation=after;drawField(performance.now());layouts++;inspect(body,defense,depth,side);
 }
 checks.push({name:'6체형 × 9시프트 × 공격/수비: 이동과 홈 방향 준비 자세',ok:failures.length===0,layouts,fielders,moving});
 CharacterQA17.scene('idle',2,'우타',false);const m=team().match,df=tside(m,1-attack(m)),p=ply(df,df.lineup.find(i=>i.pos==='SS').id),I=FieldIntegrationV13;
 for(const pose of['run','throw','catch','glove']){const s=I.describe(p,df,pose,200,350,250,false);checks.push({name:pose+' 동작 유지',ok:!s.readyView});}
 const a=R.config(p,df);let colors=0;
 for(let body=0;body<6;body++)for(const view of['F','FR','FL'])for(let skin=0;skin<3;skin++){
  const normal={...a,body,skin,necklace:'none'},row=DEFENSIVE_READY_V21.rows[CHARACTER_ASSETS_V17.bodyIds[body]+'/'+view],one=R.render({...normal,primary:'#af2828',secondary:'#ffd656'},0,{headwear:'cap',readyView:view}),two=R.render({...normal,primary:'#285cb8',secondary:'#faf9ef'},0,{headwear:'cap',readyView:view}),im=one.canvas.getContext('2d').getImageData(0,0,64,64).data,im2=two.canvas.getContext('2d').getImageData(0,0,64,64).data;
  const combined=new Map();for(const layer of['body','forearm','glove'])for(let i=0;i<row[layer].length;i+=2)combined.set(row[layer][i],row[layer][i+1]);
  for(const [pixel,material]of combined){if(pixel/64<row.neck[1]+8)continue;const pos=pixel*4;
   if(material>=70&&im.slice(pos,pos+4).toString()!==im2.slice(pos,pos+4).toString())failures.push({body,view,skin,error:'fixed equipment recolored',pixel,material});
   if(material<=5&&im.slice(pos,pos+3).toString()!==CHARACTER_ASSETS_V17.palettes.skin[skin][material-1].toString())failures.push({body,view,skin,error:'body skin mismatch',pixel});
  }colors++;
 }
 checks.push({name:'54 체형·방향·피부 조합: 팀색 변경 시 바지·신발·글러브 보존',ok:failures.length===0,combinations:colors});
 return{checks,failures,runtimeErrors:runtimeErrors.slice(),regression:CharacterQA17.checks(),internal:checks23()};
};

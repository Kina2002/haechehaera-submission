if(TEST_ONLY){
 const panel=document.createElement('section');panel.className='panel';
 panel.innerHTML='<h3>관객 표정과 사건 주인공</h3><button data-fan-check>관객 표정·선수 표시 검사</button> <button data-fan-preview-qa>우울한 관객 보기</button> <button data-event-identity-qa>사건 주인공 보기</button><pre data-fan-report style="white-space:pre-wrap"></pre>';
 document.body.append(panel);
 function makeFanFixture(){const {t,m}=fixture23();activeGame=true;t.match.paused=true;const p=t.players[0];p.name='박주인공';p.number=42;selection=p.id;return {t,m,p};}
 panel.querySelector('[data-fan-preview-qa]').onclick=()=>{makeFanFixture();screen='settings';render();previewSadFans();};
 panel.querySelector('[data-event-identity-qa]').onclick=()=>{makeFanFixture();screen='settings';render();previewClubEvent('autograph');};
 panel.querySelector('[data-fan-check]').onclick=async()=>{
  const keep={data,screen,activeGame,selection,anim,reaction,shiftLead},before=JSON.stringify(data),rows=[];
  const check=(name,ok)=>{rows.push({name,ok:!!ok});if(!ok)throw Error(name);};
  suppressPersist++;
  try{
   check('sad asset ready',await sadFanArtReady);check('original artwork ready',ART.ready&&charsReady);
   const {t,m,p}=makeFanFixture();screen='match';render();
   for(const group of Object.keys(SAD_FAN_GROUPS)){
    const entry=DIALOGUES.find(x=>x[0]===group);reaction={group,speaker:'우리 관객',line:entry[4].find(x=>x[0]==='우리 관객')[1],left:5000,total:5000,eventId:'fan-'+group};renderReaction();
    check(group+' uses sad portrait',$('#reactionHost .reaction')?.dataset.mood==='sad');
   }
   for(const [speaker,group,want] of [['우리 관객','g26','idle'],['상대 관객','g27','tease'],['우리 치어리더','g29','celebrate'],['우리 관객','f23-scoreOut','idle']]){
    reaction={group,speaker,line:'표정 검사',left:5000,total:5000,eventId:speaker+group};renderReaction();check(speaker+' '+group,$('#reactionHost .reaction')?.dataset.mood===want);
   }
   const cv=canvasNew(300,270),c=cv.getContext('2d'),paint=[];
   for(const [primary,secondary] of [[4,3],[11,5],[0,2],[3,7]]){
    drawReactionBust(c,{primary,secondary},'fan','sad');const d=c.getImageData(0,0,300,270).data;let count=0,edge=0,sum=0;
    for(let y=0;y<270;y++)for(let x=0;x<300;x++){const i=(y*300+x)*4;if(d[i+3]>30){count++;if(x<7||x>292||y<7||y>262)edge++;sum+=(d[i]+3*d[i+1]+5*d[i+2]);}}
    check('palette '+primary+'/'+secondary+' fits',count>15000&&edge===0);paint.push(sum);
   }
   check('team recolouring differs',new Set(paint).size===4);
   reaction=null;screen='settings';render();
   const originalName=p.name,originalLook=JSON.stringify(p.appearance);
   for(const def of CLUB_EVENT_TYPES){
    const event={id:'identity-'+def.id,kind:def.id,playerId:p.id,player:originalName,text:def.title,actor:clone(p),companions:clubEventCast(t,p),primary:t.primary,secondary:t.secondary,seen:false,fans:0,loyalty:0,before:{fans:p.fans,loyalty:p.loyalty},after:{fans:p.fans,loyalty:p.loyalty}};
    check(def.id+' opens',showClubEvent(event,t,true));
    check(def.id+' label',$('.club-event-actor strong')?.textContent==='#42 박주인공');
    const portrait=$('[data-club-actor-portrait]');await portrait.decode();check(def.id+' portrait',portrait.naturalWidth===72);
    const frameBefore=charFrame,seen=[];
    try{charFrame=function(actor,tm,mode,...rest){seen.push({id:actor.id,look:JSON.stringify(actor.appearance),mode});return frameBefore(actor,tm,mode,...rest);};drawClubEventScene(clubEventView.el.querySelector('[data-club-scene]').getContext('2d'),event,3300);}finally{charFrame=frameBefore;}
    check(def.id+' renders actual actor',seen.some(x=>x.id===p.id&&x.look===originalLook&&x.mode==='motion'));
    p.name='변경한 현재 이름';check(def.id+' snapshot identity',$('.club-event-actor strong').textContent==='#42 박주인공');p.name=originalName;
    closeClubEvent();
   }
  }catch(e){rows.push({name:e.message,ok:false});}
  finally{closeClubEvent();data=keep.data;screen=keep.screen;activeGame=keep.activeGame;selection=keep.selection;anim=keep.anim;reaction=keep.reaction;shiftLead=keep.shiftLead;suppressPersist--;render();}
  rows.push({name:'original state preserved',ok:JSON.stringify(data)===before});
  const report={passed:rows.every(x=>x.ok),checks:rows.length,rows,runtimeErrors:runtimeErrors.slice()};window.fanReactionQA=report;panel.querySelector('[data-fan-report]').textContent=JSON.stringify(report,null,2);
 };
}

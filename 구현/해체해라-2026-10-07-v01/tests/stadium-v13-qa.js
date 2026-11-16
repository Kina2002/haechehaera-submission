/* Deterministic visual fixtures; available only in tests.html's isolated session. */
(()=>{'use strict';if(!TEST_ONLY)throw Error('isolated test session required');
const fixture=(kind='single',body=2,hand='우타',home=0)=>{
 data={saveVersion:1,slots:[newTeam('해체 드림즈',11,5),null],current:0,settings:{sound:false,speed:1}};activeGame=true;startMatch();if(entrance)finishEntrance();
 const m=team().match;m.id='visual-'+kind+'-'+body;m.home=home;m.half=home===0?1:0;m.inning=3;m.score=[2,1];m.innings=[[1,1,0,null,null,null,null],[0,1,0,null,null,null,null]];m.bases=[null,null,null];m.paused=true;waitMs=1e9;anim=null;reaction=null;sideSwitch=null;prepare(m);
 const at=tside(m,0),df=tside(m,1);at.players.forEach(p=>{p.appearance.body=body;p.hand=hand;});const runner=at.lineup[2].id;
 if(['sb','cs','headSlide','tagout','return'].includes(kind))m.bases[0]=runner;
 if(kind==='home')m.bases[2]=runner;
 const e=emptyEvent(m);e.inputCommand='contact';e.fielder=fielder(df,'CF');e.fielderId=e.fielder.id;e.fieldPos='CF';e.target=[535,242];
 if(['single','double','triple','hr','home'].includes(kind)){e.swing=true;e.contact=true;reachHit(m,e,{single:1,double:2,triple:3,hr:4,home:1}[kind]);if(kind==='hr')e.target=[780,115];}
 else if(['sb','cs','headSlide','tagout'].includes(kind)){const out=['cs','tagout'].includes(kind);m.bases[0]=null;e.type=out?'cs':'sb';e.text=out?'태그 아웃':'2루 진루';e.pitchThrown=false;e.tag=true;e.actor=runner;e.fielder=fielder(df,'C');e.fielderId=e.fielder.id;e.fieldPos='C';e.target=null;e.throwBases=[2];moveTo(e,runner,1,2,out,.24);if(out)addOut(m,e,runner);else m.bases[1]=runner;const p=ply(at,runner);p.visualForm={...PlayerMotionV13.identity(p),variation:kind==='headSlide'?0:1};}
 else if(['ks','kl'].includes(kind)){e.type=kind;e.swing=kind==='ks';e.contact=false;addOut(m,e,e.batter);finishPA(m,e,'ab');}
 else if(kind==='ground'){e.swing=true;e.contact=true;e.fieldPos='SS';e.fielder=fielder(df,'SS');e.fielderId=e.fielder.id;e.target=[375,343];groundOut(m,e,false);}
 else if(kind==='fly'){e.swing=true;e.contact=true;flyOut(m,e,0);}
 else if(['bb','hbp'].includes(kind)){e.contact=false;e.swing=false;e.target=null;walk(m,e,kind);}
 else {e.type=kind==='miss'?'swing':kind;e.swing=['miss','foul'].includes(kind);e.contact=kind==='foul';if(e.contact)e.target=[100,380];else e.target=null;}
 e.after=snap(m);buildMotion(m,e);anim={e,elapsed:0,duration:4200,resultShown:false,holdLeft:resultHoldMs(e)};StadiumViewV13.entry=null;render();return e;
};
function at(t,hold=0){let low=0,high=1;for(let i=0;i<24;i++){const mid=(low+high)/2;if(playProgress(mid)<t)low=mid;else high=mid;}anim.elapsed=(low+high)/2*anim.duration;anim.resultShown=hold>0;anim.holdLeft=resultHoldMs(anim.e)-hold;drawField(performance.now());return StadiumViewV13.calls.filter(a=>a.tm===team()).map(a=>{const p=ply(a.tm,a.id),state=FieldIntegrationV13.describe(p,a.tm,a.pose,a.tick,a.x,a.y,a.flip),out=FieldRendererV13.render(FieldIntegrationV13.config(p,a.tm),state.frame,{headwear:state.headwear,flip:state.flip,direction:state.direction});return{id:a.id,x:a.x,y:a.y,frame:state.frame,contact:state.contact,anchor:state.contact?out.contacts[state.contact]:out.foot,flip:state.flip};});}
window.StadiumQA13={fixture,at};
})();

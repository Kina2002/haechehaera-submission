/* Local visual QA helpers; excluded from the published bundle. */
(()=>{
if(!['127.0.0.1','localhost'].includes(location.hostname))throw Error('Local QA only');
window.CharacterQA17={
scene(kind='single',body=2,hand='우타',defense=false){
 const {t,m,o}=fixture23();activeGame=true;screen='match';m.half=defense?1:0;prepare(m);waitMs=1e9;anim=entrance=sideSwitch=reaction=shiftLead=null;StadiumViewV13.entry=null;
 const side=attack(m),at=tside(m,side),df=tside(m,1-side);at.players.forEach(p=>{p.appearance.body=body;p.hand=hand;});
 if(kind==='idle'){StadiumViewV13.lastBatter=[m.id,m.inning,m.half,at.lineup[m.order[side]].id].join(':');render();drawField(performance.now());return;}
 const runner=at.lineup[2].id;if(['headSlide','footSlide','tagout'].includes(kind))m.bases[0]=runner;
 const e=emptyEvent(m);e.inputCommand='contact';e.fielder=fielder(df,'CF');e.fielderId=e.fielder.id;e.fieldPos='CF';e.target=[535,242];
 if(['single','double','hr'].includes(kind)){e.swing=true;e.contact=true;reachHit(m,e,{single:1,double:2,hr:4}[kind]);if(kind==='hr')e.target=[780,115];}
 else if(['headSlide','footSlide','tagout'].includes(kind)){const out=kind==='tagout';m.bases[0]=null;e.type=out?'cs':'sb';e.text=out?'태그 아웃':'2루 진루';e.pitchThrown=false;e.tag=true;e.actor=runner;e.fielder=fielder(df,'C');e.fielderId=e.fielder.id;e.fieldPos='C';e.target=null;e.throwBases=[2];moveTo(e,runner,1,2,out,.24);if(out)addOut(m,e,runner);else m.bases[1]=runner;const p=ply(at,runner);p.visualForm={...PlayerMotionV13.identity(p),variation:kind==='headSlide'?0:1};}
 else if(kind==='ground'){e.swing=true;e.contact=true;e.fieldPos='SS';e.fielder=fielder(df,'SS');e.fielderId=e.fielder.id;e.target=[375,343];groundOut(m,e,false);}
 else if(['ks','kl'].includes(kind)){e.type=kind;e.swing=kind==='ks';e.contact=false;e.target=null;e.fieldPos='C';e.fielder=fielder(df,'C');e.fielderId=e.fielder.id;addOut(m,e,e.batter);finishPA(m,e,'ab');}
 e.after=snap(m);buildMotion(m,e);anim={e,elapsed:0,duration:1e12,resultShown:false,holdLeft:resultHoldMs(e)};render();this.at(.01);return e;
},
at(t,hold=0){let lo=0,hi=1;for(let i=0;i<30;i++){const mid=(lo+hi)/2;if(playProgress(mid)<t)lo=mid;else hi=mid;}anim.elapsed=(lo+hi)/2*anim.duration;anim.resultShown=hold>0;anim.holdLeft=resultHoldMs(anim.e)-hold;drawField(performance.now());return StadiumViewV13.lastFrame;},
checks(){
const rows=[],check=(name,fn)=>{try{if(!fn())throw Error('expectation failed');rows.push({name,ok:true});}catch(e){rows.push({name,ok:false,error:String(e)});}};
const R=CharacterPartsV17;
check('공격 포수도 헬멧',()=>R.equipmentFor(true,'C').headwear==='helmet'&&!R.equipmentFor(true,'C').catcher);
check('수비 포수 보호장비',()=>R.equipmentFor(false,'C').catcher&&R.equipmentFor(false,'C').headwear==='catcher');
check('투수·야수 야구모자',()=>['P','1B','2B','SS','3B','LF','CF','RF'].every(p=>R.equipmentFor(false,p).headwear==='cap'));
check('저장 복사 후 외형 동일',()=>{const p=team().players[0],before=JSON.stringify(R.look(p)),copy=JSON.parse(JSON.stringify(p));return before===JSON.stringify(R.look(copy));});
check('선수창 모자OFF와 경기 장비 독립',()=>{const p=team().players[0];R.look(p).portraitCap=false;return R.equipmentFor(true,'P').headwear==='helmet';});
check('좌·우타 준비 방향',()=>{for(const hand of ['우타','좌타']){this.scene('idle',2,hand);const st=StadiumViewV13.lastFrame.find(s=>s.offense);if(st.flip!==(hand==='좌타'))return false;}return true;});
check('수비 시점 공격팀만 타순',()=>{this.scene('idle',2,'우타',true);return !StadiumViewV13.low&&document.querySelector('.stadium-lineup').textContent.includes(team().match.opp.name);});
for(const kind of ['single','double','headSlide','footSlide','tagout','ground','ks','kl','hr'])check(kind+' 동작과 장비',()=>{this.scene(kind);for(const t of [.16,.23,.42,.75,.94,1]){this.at(t,t===1?900:0);if(StadiumViewV13.lastFrame.some(s=>!Number.isFinite(s.x)||!Number.isFinite(s.y)||s.offense&&s.headwear!=='helmet'||!s.offense&&s.position==='C'&&!s.catcher))return false;}return true;});
check('1루 도착 발 유지',()=>{this.scene('single');this.at(1,900);const id=anim.e.batter,s=StadiumViewV13.lastFrame.find(x=>x.id===id);return !!s&&s.contact==='foot'&&s.frame===17;});
check('2루 세이프 후 베이스 유지',()=>{this.scene('footSlide');this.at(1,900);const s=StadiumViewV13.lastFrame.find(x=>x.id===anim.e.actor);return !!s&&s.contact==='foot'&&s.frame===17;});
check('태그아웃 후 베이스 유지 강제 없음',()=>{this.scene('tagout');this.at(1,250);const s=StadiumViewV13.lastFrame.find(x=>x.id===anim.e.actor);return !!s&&s.contact===null;});
return {checks:rows,runtimeErrors:runtimeErrors.slice(),diagnostics:R.diagnostics()};
}
};
})();

function fixture23(){
 const t=newTeam('우리 점검',11,5),o=opponent(t);data={saveVersion:1,slots:[t,null],current:0,settings:{sound:false,speed:1}};
 const m={id:'qa23',opp:o,home:1,inning:1,half:0,outs:0,balls:0,strikes:0,bases:[null,null,null],score:[0,0],order:[0,0],last:[null,null],hits:[0,0],errors:[0,0],innings:[Array(7).fill(0),Array(7).fill(0)],paPitches:0,events:[],rng:15151,pitches:0,bh:[0,0],bhBase:[0,0],bhBaseUsed:[0,0],opportunities:[0,0],defense:{side:1,depth:1},checks:{events:0,violations:[],motions:0,reactions:0},lastLines:{},reactionCount:0,used:t.lineup.map(x=>x.id),subs:[],done:false,paused:false};
 t.match=m;prepare(m);return {t,m,o};
}
function context23(fn){const keep={data,anim,reaction,shiftLead,screen};suppressPersist++;anim=null;reaction=null;shiftLead=null;try{return fn();}finally{data=keep.data;anim=keep.anim;reaction=keep.reaction;shiftLead=keep.shiftLead;screen=keep.screen;suppressPersist--;}}
function checks23(){return context23(()=>{
 const rows=[],check=(name,fn)=>{try{if(!fn())throw Error('기대 결과와 다름');rows.push({name,ok:true});}catch(e){rows.push({name,ok:false,error:e.message});}};
 check('상대 12명 · 후보 3명',()=>{const {o}=fixture23();return o.players.length===12&&o.lineup.length===9;});
 check('30% 초과 투수는 유지',()=>{const {m,o}=fixture23(),p=pitcher(o);p.energy=p.a.stamina*.31;return !autoRelief23(m)&&pitcher(o).id===p.id;});
 check('체력 30% · 타순/포지션/기록 유지하며 교체',()=>{const {m,o}=fixture23(),p=pitcher(o),i=o.lineup.findIndex(x=>x.id===p.id),own=JSON.stringify(team().lineup),rng=m.rng;p.energy=p.a.stamina*.30;const result=autoRelief23(m),next=pitcher(o);return result&&next.id!==p.id&&o.lineup[i].id===next.id&&next.stats.games===1&&next.stats.appearances===1&&own===JSON.stringify(team().lineup)&&rng===m.rng;});
 check('타석 중에는 교체하지 않음',()=>{const {m,o}=fixture23();pitcher(o).energy=0;m.paPitches=2;return !autoRelief23(m);});
 check('상대 공격 중에는 교체하지 않음',()=>{const {m,o}=fixture23();pitcher(o).energy=0;m.half=1;return !autoRelief23(m);});
 check('체력과 투구 능력이 좋은 후보 선택',()=>{const {m,o}=fixture23();pitcher(o).energy=0;const bench=o.players.slice(9);bench.forEach((p,i)=>{p.energy=p.a.stamina;p.a.control=30+i*20;p.a.velocity=30+i*20;p.a.sense=50;});return autoRelief23(m)?.inId===bench[2].id;});
 check('후보 소진 시 유지 · 내려간 투수 재등판 없음',()=>{const {m,o}=fixture23(),ids=[pitcher(o).id];for(let i=0;i<3;i++){pitcher(o).energy=0;autoRelief23(m);ids.push(pitcher(o).id);}pitcher(o).energy=0;return new Set(ids).size===4&&!autoRelief23(m)&&o.players.length===12;});
 check('교체 저장·복원 뒤 중복 교체 기록 없음',()=>{const {m,o}=fixture23();pitcher(o).energy=0;autoRelief23(m);const copy=clone(m);team().match=copy;return !autoRelief23(copy)&&copy.oppChanges23.length===1&&copy.oppUsed23.length===10;});
 check('진행 중인 이전 저장에도 후보를 한 번만 추가',()=>{const {m,o}=fixture23();o.players=o.players.slice(0,9);delete o.reliefRoster23;reliefState23(m);const ids=o.players.map(p=>p.id).join();reliefState23(m);return o.players.length===12&&o.players.map(p=>p.id).join()===ids;});
 check('경기 스킵도 새 투수가 투구 · 이전 투구 기록 보존',()=>{const {m,o}=fixture23();pitcher(o).energy=0;const id=pitcher(o).id;skipChunk(m,1);return m.oppChanges23.length===1&&m.events[0].pitcher===pitcher(o).id&&m.events[0].pitcher!==id&&m.events[0].before.order[0]===0;});
 const event=(extra={})=>({type:'single',attack:0,bh:0,batter:'b',pa:true,ab:true,runs:[],outIds:[],outsAdded:0,before:{score:[0,0],bases:['r',null,null],outs:0},after:{score:[0,0],bases:['b',null,null],outs:1},...extra});
 const choose=e=>{const {m}=fixture23();return chooseGroup(m,e);};
 check('안타+선행주자 아웃은 단순 안타 축하 제외',()=>choose(event({outIds:['r'],outsAdded:1}))==='f23-mixed');
 check('안타여도 3아웃 기회 무산 우선',()=>choose(event({outIds:['r'],outsAdded:1,inningChange:true}))==='g14');
 check('득점+주자 아웃은 두 결과 함께 반영',()=>choose(event({runs:['r2'],outIds:['r'],outsAdded:1,after:{score:[1,0],bases:['b',null,null],outs:1}}))==='f23-scoreOut');
 check('우리 수비 아웃+실점은 무조건 호수비 축하 제외',()=>choose(event({attack:1,type:'sf',runs:['r'],outsAdded:1,outIds:['b'],after:{score:[0,1],bases:[null,null,null],outs:1}}))==='f23-awayScoreOut');
 check('동점/역전/추격/추가점 구별',()=>{const pairs=[[[0,2],[2,2],'tie'],[[0,2],[3,2],'lead'],[[0,3],[1,3],'chase'],[[2,0],[3,0],'extend']];return pairs.every(([before,after,key])=>choose(event({runs:['r'],before:{score:before,bases:[]},after:{score:after,bases:[],outs:0}}))==='f23-'+key);});
 check('상대 동점/역전/추격 구별',()=>{const pairs=[[[2,0],[2,2],'awayTie'],[[2,0],[2,3],'awayLead'],[[3,0],[3,1],'awayChase']];return pairs.every(([before,after,key])=>choose(event({attack:1,runs:['r'],before:{score:before,bases:[]},after:{score:after,bases:[],outs:0}}))==='f23-'+key);});
 check('본헤드와 종료 결과는 전용 멘트 유지',()=>{const {m}=fixture23();const bh=chooseGroup(m,event({bh:11,bhSide:0}));m.done=true;m.score=[2,1];return bh==='b11'&&chooseGroup(m,event())==='g26';});
 check('새 그룹 한 사건 한 화자 · 직전 문구 반복 방지',()=>{const {m}=fixture23();return Object.keys(FLOW_LINES23).every(k=>{let last=null;for(let i=0;i<12;i++){const r=pickReaction(m,'f23-'+k);if(!r||r.index===last)return false;last=r.index;}return true;});});
 check('선수도 선행주자 아웃·포구 후 실점 인지',()=>speechCue22(event({outIds:['r'],outsAdded:1})).key==='mixed'&&speechCue22(event({type:'sf',fielderId:'f',runs:['r'],outsAdded:1})).key==='catchConcede');
 return {checks:rows,dialogueGroups:DIALOGUES.length,dialogueLines:DIALOGUES.reduce((n,g)=>n+g[4].length,0),runtimeErrors:runtimeErrors.slice()};
});}
function previewRelief23(){context23(()=>{const {m,o}=fixture23();pitcher(o).energy=0;const r=autoRelief23(m);screen='match';m.paused=false;note('상대 투수 자동 교체 · 저장하지 않는 미리보기','<p>체력 '+Math.round(r.energy)+' / '+r.maxEnergy+' · '+esc(r.out)+' → '+esc(r.in)+'</p><div id="qa23Stage" class="in-game">'+matchHTML()+'</div>');$('#dialog').style.cssText='max-width:1420px;width:98vw';$('#qa23Stage').querySelectorAll('button').forEach(b=>b.disabled=true);portraitCanvases();drawField(performance.now());restoreHistory21();});}
if($('#qaTools')){const b=document.createElement('button');b.textContent='교체·팀 흐름 검사';b.onclick=()=>note('교체·팀 흐름 검사','<pre id="report23">'+esc(JSON.stringify(checks23(),null,2))+'</pre>');$('#qaTools').append(b);const p=document.createElement('button');p.textContent='상대 투수 교체 미리보기';p.onclick=previewRelief23;$('#qaTools').append(p);}

// v18: derive presentation calls from resolved events; never decide game outcomes here.
const umpireImages18={},umpirePlans18=new WeakMap();
const UMPIRE_SPOTS18=[[400,514],[706,344],[548,248],[194,344]];
async function loadUmpires18(){await Promise.all(Object.entries(UMPIRE_ART18).map(async([name,entry])=>{const im=new Image();im.src=entry.uri;await im.decode();umpireImages18[name]=im;}));}
function judgeBase18(base){return base===4?0:base;}
function catchJudge18(e){return ['LF','3B','SS'].includes(e.fieldPos)?3:['RF','1B'].includes(e.fieldPos)?1:2;}
function throwArrival18(e,base){
 const index=(e.throwBases||[]).indexOf(base),n=(e.throwBases||[]).length,start=e.throwStart||.55;
 if(index<0)return .92;
 const points=(e.ball||[]).slice(e.contact?2:e.pitchThrown?1:0),target=BASES[base];let total=0,covered=null;
 for(let i=1;i<points.length;i++){total+=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);if(Math.hypot(points[i][0]-target[0],points[i][1]-target[1])<1&&covered===null)covered=total;}
 const fraction=total&&covered!==null?covered/total:(index+1)/n;
 return start+(.92-start)*fraction;
}
function judgePlan18(e){
 if(!e)return [];if(umpirePlans18.has(e))return umpirePlans18.get(e);
 const calls=[],put=(base,kind,at,reason)=>calls.push({base:judgeBase18(base),kind,at:clamp(at,0,1),reason});
 if(['ks','kl'].includes(e.type))put(0,'k',.32,e.type==='ks'?'헛스윙 삼진':'루킹 삼진');
 else if(['strike','swing'].includes(e.type))put(0,'strike',.32,'스트라이크');
 const caught=['fly','line','sf','flydp'].includes(e.type);
 if(caught)put(catchJudge18(e),'out',Math.max(.55,...(e.fieldMoves||[]).filter(x=>x.id===e.fielderId).map(x=>x.end||.55)),e.type==='line'?'직선타 포구':'뜬공 포구');
 const outs=(e.moves||[]).filter(x=>x.out);
 for(const mv of outs){
  const base=e.type==='flydp'?mv.from:mv.to;
  const arrival=throwArrival18(e,base);
  const at=e.type==='dp'||e.type==='flydp'?arrival+.015:Math.max(arrival,mv.until||.94);
  put(base,'out',at,e.tag?'태그 아웃':'베이스 아웃');
 }
 // Do not call safe for walks, home runs, or runners whose advancement was voided.
 if(!['bb','hbp','hr'].includes(e.type))for(const mv of e.moves||[]){
  if(mv.out||mv.to<1||mv.to>4)continue;
  const valid=mv.to===4?(e.runs||[]).includes(mv.id):e.after?.bases?.[mv.to-1]===mv.id;
  if(valid)put(mv.to,'safe',Math.min(.99,(mv.until||.94)+.01),'진루 성공');
 }
 calls.sort((a,b)=>a.at-b.at||a.base-b.base);
 const filtered=calls.filter((c,i)=>!calls.slice(0,i).some(p=>p.base===c.base&&p.kind===c.kind&&Math.abs(p.at-c.at)<.12));
 umpirePlans18.set(e,filtered);return filtered;
}
function inversePlay18(t){return t<=.36?t/.36*.55:.55+(t-.36)/.64*.45;}
function umpireClock18(){if(!anim)return 0;if(Number.isFinite(anim.judgeClock18))return anim.judgeClock18;return anim.elapsed+(anim.resultShown?Math.max(0,resultHoldMs(anim.e)-(anim.holdLeft??resultHoldMs(anim.e))):0);}
const JUDGE_TIMES18={out:[0,170,80,480,170,180],safe:[0,160,100,500,180,180],k:[0,250,110,650,210,200],strike:[0,90,70,420,150,160]};
function judgeState18(call,clock,duration){
 const times=JUDGE_TIMES18[call.kind],signal=inversePlay18(call.at)*duration,age=clock-(signal-times[1]-times[2]),end=times.slice(1).reduce((a,b)=>a+b,0);
 if(age<0||age>=end)return {frame:0,speaking:false,age};
 let t=age,frame=1;while(frame<5&&t>=times[frame])t-=times[frame++];
 return {frame,speaking:clock>=signal&&clock<signal+times[3]+120,age,signal};
}
function umpireAsset18(base,kind){
 if(kind==='k')return {file:'strikeout.png',row:0,flip:false};
 if(kind==='safe')return {file:'safe-sheet.png',row:base,flip:false};
 if(base===0)return {file:'out-sheet.png',row:0,flip:true};
 // Rows 1 and 4 of the v03 source were rejected for changing arms mid-motion.
 return {file:'out-dynamic.png',row:base===2?2:1,flip:base===3};
}
function activeJudges18(e){const clock=umpireClock18(),duration=anim?.duration||3200,calls=judgePlan18(e);return UMPIRE_SPOTS18.map((xy,base)=>{const relevant=calls.filter(x=>x.base===base);let call=null,state={frame:0,speaking:false};for(const c of relevant){const s=judgeState18(c,clock,duration);if(s.frame){call=c;state=s;}}return {base,xy,call,state};});}
drawUmpire15=function(c,e,t){
 if(!umpireImages18['out-dynamic.png'])return;
 for(const official of activeJudges18(e)){
  const {base,xy,call,state}=official,spec=umpireAsset18(base,call?.kind||'out'),entry=UMPIRE_ART18[spec.file],seq=entry.rows[spec.row];
  let frame=state.frame;
  // A normal strike is a restrained raised fist, not the full strikeout sequence.
  if(call?.kind==='strike')frame=frame>=2&&frame<=4?1:0;
  const f=seq[frame],scale=(base===0?62:base===2?44:52)/seq[0].rect[3];
  c.save();c.translate(...xy);c.fillStyle='#102b3455';c.beginPath();c.ellipse(0,2,base===2?12:16,3,0,0,7);c.fill();if(spec.flip)c.scale(-1,1);c.imageSmoothingEnabled=false;c.drawImage(umpireImages18[spec.file],...f.rect,-f.foot[0]*scale,-f.foot[1]*scale,f.rect[2]*scale,f.rect[3]*scale);c.restore();
 }
};
function judgeBubble18(c,official){
 const {call,xy,base}=official,words=call.kind==='safe'?'세이프!':call.kind==='k'?'삼진!':call.kind==='strike'?'스트라이크!':'아웃!';
 const height=base===0?62:base===2?44:52,anchor=[xy[0],xy[1]-height+12];
 const x=base===0?xy[0]-51:base===1?xy[0]+10:base===3?xy[0]-10:xy[0]+12,y=xy[1]-height-32,w=words.length*15+20,h=30;
 c.save();c.fillStyle=call.kind==='safe'?'#e5fff1':'#fff5d9';c.strokeStyle=call.kind==='safe'?'#155e48':'#703322';c.lineWidth=2;
 c.beginPath();c.roundRect(x-w/2,y,w,h,5);c.moveTo(x+5,y+h);c.lineTo(anchor[0],anchor[1]);c.lineTo(x-4,y+h);c.fill();c.stroke();c.fillStyle='#142b37';c.font='17px NeoDunggeunmo,monospace';c.textAlign='center';c.fillText(words,x,y+21);c.restore();
}
const fieldEffects18=effectsForEvent;
effectsForEvent=function(c,e,t,time){fieldEffects18(c,e,t,time);for(const official of activeJudges18(e))if(official.state.speaking)judgeBubble18(c,official);};
// Synchronize the first and second force-outs with their distinct throws.
const priorMotion18=buildMotion;
buildMotion=function(m,e){priorMotion18(m,e);if(e.type==='dp'||e.type==='flydp'){for(const mv of e.moves.filter(x=>x.out)){const base=e.type==='flydp'?mv.from:mv.to;if((e.throwBases||[]).includes(base))mv.until=throwArrival18(e,base)+.015;}}};
function judgeChecks18(){
 const rows=[],check=(name,fn)=>{try{if(!fn())throw Error('예상 판정과 다릅니다');rows.push({name,ok:true});}catch(e){rows.push({name,ok:false,error:e.message});}};
 const event=(type,extra={})=>({type,moves:[],runs:[],fieldMoves:[],after:{bases:[null,null,null]},...extra});
 check('삼진은 홈 주심만 판정',()=>['ks','kl'].every(type=>{const p=judgePlan18(event(type));return p.length===1&&p[0].base===0&&p[0].kind==='k';}));
 check('일반 스트라이크와 삼진 동작 분리',()=>judgePlan18(event('strike'))[0].kind==='strike'&&umpireAsset18(0,'k').file==='strikeout.png');
 check('땅볼 아웃은 1루심',()=>judgePlan18(event('ground',{moves:[{id:'b',from:0,to:1,out:true,until:.94}],throwBases:[1]}))[0].base===1);
 check('도루 성공·실패는 도착 베이스에서 반대 판정',()=>['sb','cs'].every(type=>{const p=judgePlan18(event(type,{moves:[{id:'r',from:1,to:2,out:type==='cs',until:.94}],after:{bases:[null,type==='sb'?'r':null,null]}}));return p.length===1&&p[0].base===2&&p[0].kind===(type==='sb'?'safe':'out');}));
 check('병살은 2루 다음 1루, 따로 판정',()=>{const p=judgePlan18(event('dp',{moves:[{from:1,to:2,out:true},{from:0,to:1,out:true}],throwBases:[2,1]}));return p.length===2&&p[0].base===2&&p[1].base===1&&p[0].at<p[1].at;});
 check('희생플라이 포구 아웃과 홈 세이프 공존',()=>{const p=judgePlan18(event('sf',{fieldPos:'CF',moves:[{id:'r',from:3,to:4,out:false,until:.94}],runs:['r']}));return p.length===2&&p[0].kind==='out'&&p[1].base===0&&p[1].kind==='safe';});
 check('귀루 실패는 출발 베이스에서 아웃',()=>{const p=judgePlan18(event('flydp',{fieldPos:'CF',moves:[{id:'r',from:1,to:2,out:true}],throwBases:[1]}));return p.length===2&&p[1].base===1;});
 check('무효 진루에는 세이프 없음',()=>!judgePlan18(event('single',{moves:[{id:'b',from:0,to:1,out:false}]})).length);
 check('볼넷·홈런에 불필요한 세이프 없음',()=>['bb','hbp','hr'].every(type=>!judgePlan18(event(type,{moves:[{id:'b',from:0,to:1}],after:{bases:['b',null,null]}})).length));
 check('볼·파울은 아웃으로 오표시하지 않음',()=>['ball','foul'].every(type=>!judgePlan18(event(type)).length));
 check('타이밍 역변환은 3배속까지 동일한 진행률',()=>[1400,3200,4200].every(d=>[.32,.55,.735,.94].every(t=>Math.abs(playProgress(inversePlay18(t)*d/d)-t)<1e-9)));
 check('병살 첫 송구는 실제 경로 길이로 시점 결정',()=>{const e=event('dp',{contact:true,ball:[[450,326],[450,441],[375,343],BASES[2],BASES[1]],throwBases:[2,1]}),at=throwArrival18(e,2),point=pointAlong(e.ball.slice(2),(at-.55)/(.92-.55));return Math.hypot(point[0]-450,point[1]-230)<.001&&throwArrival18(e,1)===.92;});
 check('실제 판정 이전에는 말풍선 숨김',()=>{const c={kind:'out',at:.94},signal=inversePlay18(c.at)*3200;return !judgeState18(c,signal-1,3200).speaking&&judgeState18(c,signal+1,3200).speaking;});
 check('판정 후 대기 복귀 및 말풍선 종료',()=>{const s=judgeState18({kind:'safe',at:.94},6500,3200);return s.frame===0&&!s.speaking;});
 check('원본 사건·기록은 판정 계획으로 변경되지 않음',()=>{const e=event('single'),before=JSON.stringify(e);judgePlan18(e);return JSON.stringify(e)===before;});
 check('모든 표시 자세가 이미지 범위 내부',()=>[0,1,2,3].every(base=>['out','safe','k'].every(kind=>{const x=umpireAsset18(base,kind),a=UMPIRE_ART18[x.file];return a.rows[x.row].length===6&&a.rows[x.row].every(f=>f.rect[0]>=0&&f.rect[1]>=0&&f.rect[0]+f.rect[2]<=a.size[0]&&f.rect[1]+f.rect[3]<=a.size[1]);})));
 return rows;
}
if($('#qa15Open'))$('#qa15Open').textContent='심판·판정 경기 미리보기';
if($('#qaTools')){const b=document.createElement('button');b.id='qa18Check';b.textContent='심판 판정 연결 검사';b.onclick=()=>{const rows=judgeChecks18(),rules=ruleChecks();note('심판 판정 연결 검사','<pre id="judgeReport18">'+esc(JSON.stringify({judgeChecks:rows,ruleChecks:rules,runtimeErrors:runtimeErrors.slice()},null,2))+'</pre>');};$('#qaTools').append(b);}

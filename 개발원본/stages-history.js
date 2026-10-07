// Plate decisions and plays on the field have separate labels. No pitch announcement.
function eventStage21(e){
 return !e.bh&&['ball','strike','swing','ks','kl','bb','hbp','foul'].includes(e.type)?'plate':'field';
}
const popupBefore21=popup19;
popup19=function(e,t,result=false){
 const p=popupBefore21(e,t,result);if(!p||p.key==='pitch')return null;
 return {...p,stage:eventStage21(e)};
};
popupMarkup19=function(p){
 const stage=p.stage||'field',label=stage==='plate'?'타석 판정':'타격 · 주루 · 수비';
 return '<div class="event-popup19 '+p.theme+' stage-'+stage+'" role="status"><span class="phase21">'+label+'</span><small>'+esc(p.tag)+'</small><strong>'+esc(p.title)+'</strong><p>'+esc(p.detail)+'</p></div>';
};
const historyScroll21={match:null,top:0,follow:true};
function visibleHistory21(m,current=anim){
 const seen=new Set();return (m.events||[]).filter(e=>{
  if(current&&!current.resultShown&&e.id===current.e.id||seen.has(e.id))return false;
  seen.add(e.id);return true;
 });
}
function historyHTML21(m){
 const rows=visibleHistory21(m).map(e=>{
  const stage=eventStage21(e),label=stage==='plate'?'타석':'경기',player=e.batterName?e.batterName+' · ':'';
  return '<div class="history-row21" data-event="'+esc(e.id)+'"><time>'+e.inning+'회 '+(e.half?'말':'초')+'</time><span class="history-phase21 '+stage+'">'+label+'</span><span class="history-team21">'+(e.attack===0?'우리':'상대')+'</span><span>'+esc(player+eventCaption(e))+'</span></div>';
 }).join('');
 return '<section class="play-history21"><div class="history-heading21"><b>경기 기록</b><span>스크롤로 이전 플레이 보기</span></div><div class="history-scroll21" role="region" aria-label="이번 경기의 지난 플레이 기록" tabindex="0" data-match="'+esc(m.id)+'">'+(rows||'<p class="history-empty21">첫 플레이가 끝나면 기록이 여기에 쌓입니다.</p>')+'</div></section>';
}
const matchBefore21=matchHTML;
matchHTML=function(){return matchBefore21().replace('<div class="controls">',historyHTML21(team().match)+'<div class="controls">');};
document.addEventListener('scroll',ev=>{
 const el=ev.target;if(!el?.classList?.contains('history-scroll21')||!el.dataset.restored)return;
 historyScroll21.match=el.dataset.match;historyScroll21.top=el.scrollTop;historyScroll21.follow=el.scrollHeight-el.clientHeight-el.scrollTop<6;
},true);
function restoreHistory21(){
 const el=$('.history-scroll21');if(!el||el.dataset.restored)return;
 if(historyScroll21.match!==el.dataset.match){historyScroll21.match=el.dataset.match;historyScroll21.follow=true;historyScroll21.top=0;}
 el.scrollTop=historyScroll21.follow?el.scrollHeight:historyScroll21.top;el.dataset.restored='true';
}
const paintBefore21=paintOutcome;
paintOutcome=function(){paintBefore21();restoreHistory21();};
const style21=document.createElement('style');style21.textContent=`
.event-popup19 .phase21{display:inline-block;margin:0 0 7px;padding:3px 7px;border:1px solid #72e3b7;background:#123f38;color:#c8ffea;font-size:12px;line-height:1.3}
.event-popup19.stage-plate .phase21{border-color:#96bdff;background:#243859;color:#d5e4ff}
.event-popup19.stage-plate{--accent:#b4ceff;border-color:#729ee0;background:#12223cf5}
.play-history21{background:#081c2c;border:1px solid #315371;border-top:0;text-align:left;padding:7px 10px}
.history-heading21{display:flex;justify-content:space-between;gap:12px;font-size:11px;line-height:1.5;color:#a5bdcd;margin-bottom:4px}.history-heading21 b{color:#eef7ff}
.history-scroll21{max-height:92px;overflow-y:auto;overscroll-behavior:contain;scrollbar-color:#55788d #0a2234;scrollbar-width:thin}
.history-scroll21:focus-visible{outline:2px solid #ffe28b;outline-offset:2px}
.history-row21{display:grid;grid-template-columns:48px 34px 28px minmax(0,1fr);gap:7px;align-items:baseline;font-size:11px;line-height:1.7;padding:4px 0;border-bottom:1px solid #274050;color:#ebf2ef;word-break:keep-all;overflow-wrap:anywhere}
.history-row21:last-child{border-bottom:0}.history-row21 time,.history-team21{color:#91aabe}.history-phase21{border-radius:3px;text-align:center;font-size:10px}.history-phase21.plate{background:#243859;color:#c4ddff}.history-phase21.field{background:#123f38;color:#b9f4d9}.history-empty21{font-size:11px;color:#8da6b5;margin:5px 0}
`;document.head.append(style21);

// QA history samples are confined to the existing, non-saving preview dialog.
function seedHistory21(m,e){
 const samples=[['ball','볼'],['strike','루킹 스트라이크'],['foul','파울'],['single','안타 · 1루 진루'],['ground','땅볼 아웃'],['sb','도루 성공']];
 m.events=Array.from({length:24},(_,i)=>({id:m.id+':history-'+i,inning:1+Math.floor(i/18),half:i>=9&&i<18?1:0,attack:i>=9&&i<18?1:0,type:samples[i%6][0],text:samples[i%6][1],batterName:'기록 미리보기',bh:0}));m.events.push(e);
}
if($('#qaTools')){const b=document.createElement('button');b.textContent='타석·경기 기록 검사';b.onclick=()=>{
 const base={id:'test',type:'ball',attack:0,moves:[],fieldMoves:[],runs:[],after:{bases:[]}},checks=[];
 const check=(name,ok)=>checks.push({name,ok});
 check('투구 진행 중 팝업 없음',popup19(base,.15)===null);
 check('볼/스트라이크/삼진/볼넷/파울은 타석 판정',['ball','strike','ks','kl','bb','hbp','foul'].every(type=>eventStage21({...base,type})==='plate'));
 check('안타/아웃/도루/본헤드는 경기 상황',['single','ground','fly','sb','cs'].every(type=>eventStage21({...base,type})==='field')&&eventStage21({...base,bh:2})==='field');
 check('아직 진행 중인 결과는 기록에서 제외',visibleHistory21({events:[base]},{e:base,resultShown:false}).length===0);
 check('결과 확정 후에는 기록 1개',visibleHistory21({events:[base,base]},{e:base,resultShown:true}).length===1);
 check('지난 기록을 마지막 3개로 자르지 않음',visibleHistory21({events:Array.from({length:24},(_,i)=>({...base,id:String(i)}))},null).length===24);
 note('타석·경기 기록 검사','<pre id="historyReport21">'+esc(JSON.stringify({checks,runtimeErrors:runtimeErrors.slice()},null,2))+'</pre>');
 };$('#qaTools').append(b);}

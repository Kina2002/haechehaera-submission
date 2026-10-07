// Cosmetic only: never consume the match RNG or change the resolved play.
const PLAYER_LINES22={
 hbp:['야얏!','아야야!','공이 왜 나한테!','으악, 맞았잖아!'],
 catch:['좋았어!','잡았다!','내 글러브 안에!','이건 안 놓치지!'],
 hit:['됐다, 뛰자!','좋아, 빠졌다!','이번엔 맞았다!','달려, 달려!'],
 hr:['이건 넘어갔다!','드디어 한 방!','제대로 맞았다!','오늘은 내가 주인공!'],
 foul:['아, 살짝 늦었네!','다시 한 번!','조금만 더 안쪽!','다음 공이다!'],
 ks:['방금 공 어디 갔지?','아, 헛돌았다!','배트만 빨랐네…','다음엔 맞힌다…'],
 kl:['그게 들어왔네…','아, 지켜봤는데…','너무 기다렸나…','다음엔 휘두른다!'],
 bb:['잘 참았다!','차분하게, 1루로!','골라내길 잘했네!','좋아, 출루!'],
 sb:['휴, 먼저 왔다!','이 발이면 되지!','한 발 빨랐다!','도착!'],
 cs:['아, 읽혔네…','딱 걸렸다…','조금만 빨랐어도!','너무 욕심냈나…'],
 error:['아, 내 손!','미안, 다시 잡을게!','이걸 놓치네…','글러브야, 왜 그래!'],
 wp:['앗, 빠졌다!','공부터 찾자!','뒤로 갔어!','내가 주울게!'],
 ground:['아, 정면이네…','조금만 비켜가지!','다음엔 뚫는다!','잘 잡네…'],
 dp:['두 명이나…','병살은 아픈데…','아, 제대로 걸렸네!','다음 타석엔 꼭!'],
 bh1:['넘어간 줄 알았지…','어? 안 넘어갔어?','감상할 때가 아니네!'],
 bh2:['파울인 줄 알았어!','어? 페어라고?','지금이라도 뛰자!'],
 bh3:['잡았어? 언제?','돌아가야 했네!','너무 멀리 왔는데…'],
 bh4:['베이스를 빼먹었다!','잠깐, 다시 밟고!','발이 너무 빨랐네…'],
 bh5:['여기 네 자리야?','같이 서면 안 되나…','어, 앞에 있었네!'],
 bh6:['지금이 아니었나!','포수가 보고 있었네…','너무 티 났나…'],
 bh7:['아직 안 끝났어?','벌써 교대인 줄…','아웃을 잘못 셌네!'],
 bh8:['거기로 던진 게 아닌데!','방향을 잘못 봤다!','어, 아무도 없네…'],
 bh9:['태그도 해야 했네!','베이스만 밟았는데…','아, 손이 늦었다!'],
 bh10:['아, 송구가 남았지!','좋아하기엔 일렀네!','세리머니 취소!'],
 bh11:['네가 잡는 줄!','내 공이었어?','둘 다 양보했네…'],
 bh12:['누가 들어가는 거야?','베이스가 비었잖아!','아, 내 자리였네!']
};
const speechPlans22=new WeakMap(),lastLine22=new Map();
function speechCue22(e){
 if(!e)return null;
 const runner=(e.moves||[]).find(x=>x.id===(e.actor||e.batter))||(e.moves||[])[0];
 if(e.bh)return {key:'bh'+e.bh,id:e.bhActors?.[0]||e.fielderId||e.batter,side:e.bhSide??0,at:e.bh>=7?Math.max(.55,e.motion19?.pickup||0):.57};
 if(e.type==='hbp')return {key:'hbp',id:e.batter,side:e.attack,at:.22};
 if(['fly','line','sf','flydp'].includes(e.type))return {key:'catch',id:e.fielderId,side:1-e.attack,at:e.motion19?.land??.55};
 if(['single','double','triple','hr'].includes(e.type))return {key:e.type==='hr'?'hr':'hit',id:e.batter,side:e.attack,at:e.type==='hr'?.57:Math.max(.57,e.motion19?.land||0)};
 if(['error','wp','pb'].includes(e.type))return {key:e.type==='error'?'error':'wp',id:e.fielderId,side:1-e.attack,at:.56};
 if(['sb','cs'].includes(e.type))return {key:e.type,id:runner?.id,side:e.attack,at:runner?.until??.96};
 if(['ks','kl','bb','foul','ground','dp'].includes(e.type))return {key:e.type,id:e.batter,side:e.attack,at:['ground','dp'].includes(e.type)?.96:e.type==='foul'?.40:.32};
 return null;
}
function speechPlan22(e){
 if(!e)return null;if(speechPlans22.has(e))return speechPlans22.get(e);
 const cue=speechCue22(e),lines=cue&&PLAYER_LINES22[cue.key];
 if(!lines||!cue.id){speechPlans22.set(e,null);return null;}
 const available=lines.filter(x=>x!==lastLine22.get(cue.key));
 const line=available[Math.floor(Math.random()*available.length)];lastLine22.set(cue.key,line);
 const plan={...cue,line};speechPlans22.set(e,plan);return plan;
}
function paintPlayerSpeech22(e,t,actors){
 const field=$('.field-wrap'),cv=$('#field');if(!field||!cv)return;
 let bubble=field.querySelector('.player-speech22');const p=speechPlan22(e);
 const age=p?umpireClock18()-inversePlay18(p.at)*anim.duration:-1;
 const actor=p&&actors.find(a=>a.p?.id===p.id&&a.tm===tside(team().match,p.side));
 if(!p||!actor||age<0||age>=2100){bubble?.remove();return;}
 if(!bubble){bubble=document.createElement('div');bubble.className='player-speech22';field.append(bubble);}
 if(bubble.dataset.event!==e.id){bubble.dataset.event=e.id;bubble.textContent=p.line;bubble.dataset.kind=p.key;bubble.dataset.side=p.side;bubble.setAttribute('aria-label',(p.side===0?'우리 팀 ':'상대 팀 ')+actor.p.name+': '+p.line);}
 // Follow the actual rendered actor, including running, without changing sprite size.
 const box=field.getBoundingClientRect(),cr=cv.getBoundingClientRect(),sx=cr.width/cv.width,sy=cr.height/cv.height;
 const x=cr.left-box.left+actor.x*sx,y=cr.top-box.top+(actor.y-49*fieldScale(actor.y))*sy;
 const w=bubble.offsetWidth,h=bubble.offsetHeight,margin=8;
 const obstacles=[field.querySelector('.reaction'),field.querySelector('.event-popup19'),field.querySelector('.score-ribbon')].filter(Boolean).map(el=>el.getBoundingClientRect());
 const candidates=[[x-w/2,y-h-14],[x-w-24,y-h/2],[x+24,y-h/2],[x-w/2,y+24]];
 let best=null;
 for(const [cx,cy]of candidates){const left=clamp(cx,margin,Math.max(margin,box.width-w-margin)),top=clamp(cy,margin,Math.max(margin,box.height-h-margin));let overlap=0;for(const r of obstacles)overlap+=Math.max(0,Math.min(left+w,r.right-box.left)-Math.max(left,r.left-box.left))*Math.max(0,Math.min(top+h,r.bottom-box.top)-Math.max(top,r.top-box.top));if(!best||overlap<best.overlap)best={left,top,overlap};}
 bubble.style.left=best.left+'px';bubble.style.top=best.top+'px';
 const above=best.top+h/2<y;bubble.dataset.tail=above?'bottom':'top';bubble.style.setProperty('--tail-x',clamp(x-best.left,12,w-12)+'px');
 bubble.style.opacity=age>1850?String((2100-age)/250):'1';
}
let speechField22=drawField.toString();
const speechAnchor22='effectsForEvent(c,e,t,time);';
if(!speechField22.includes(speechAnchor22))throw Error('선수 말풍선 연결 위치 없음');
speechField22=speechField22.replace(speechAnchor22,speechAnchor22+'paintPlayerSpeech22(e,t,actors);');
drawField=(0,eval)('('+speechField22+')');
const speechStyle22=document.createElement('style');speechStyle22.textContent=`
.player-speech22{position:absolute;z-index:5;pointer-events:none;background:#fff9e8;color:#162b37;border:2px solid #20394b;border-radius:9px;padding:8px 11px;max-width:200px;width:max-content;white-space:normal;word-break:keep-all;overflow-wrap:anywhere;font:16px/1.35 NeoDunggeunmo,sans-serif;box-shadow:2px 3px 0 #061d3c55}
.player-speech22[data-side="1"]{background:#fff0de;border-color:#6f4930}
.player-speech22:after{content:"";position:absolute;left:var(--tail-x);width:9px;height:9px;background:inherit;transform:translateX(-50%) rotate(45deg)}
.player-speech22[data-tail="bottom"]:after{bottom:-7px;border-right:2px solid #20394b;border-bottom:2px solid #20394b}
.player-speech22[data-tail="top"]:after{top:-7px;border-left:2px solid #20394b;border-top:2px solid #20394b}
`;document.head.append(speechStyle22);


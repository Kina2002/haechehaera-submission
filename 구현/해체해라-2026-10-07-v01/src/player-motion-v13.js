/* Presentation-only timelines. Match events own paths, speed and verdicts. */
(function(root){'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const personalities=['열혈','소심','허세','느긋','엉뚱','투덜'];
const forms={bat:['어깨 높이','다리 높이 들기','낮게 모으기'],run:['균형 보폭','빠른 발 교대']};
function identity(p={}){
 const id=String(p.id||p.name||'preview'),saved=p.visualForm||p.appearance?.visualForm||{};
 const valid=(v,n,f)=>Number.isInteger(v)&&v>=0&&v<n?v:f;
 const person=String(p.personality?.name||p.personality||p.person||'');
 const habit=personalities.findIndex(s=>person.includes(s));
 return{bat:valid(saved.bat,3,hash(id+':bat')%3),run:valid(saved.run,2,hash(id+':run')%2),habit:valid(saved.habit,6,habit<0?hash(id+':habit')%6:habit),variation:valid(saved.variation,3,hash(id+':variation')%3)};
}
const cycle=(frames,t,period)=>frames[Math.floor(Math.max(0,t)/period)%frames.length];
// Curves pass through every base at the same route fraction as the straight path.
function routePoint(points,t){
 if(points.length<2)return points[0]||[0,0];const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));let d=clamp(t)*lengths.reduce((a,b)=>a+b,0),i=0;while(i<lengths.length-1&&d>lengths[i])d-=lengths[i++];const u=lengths[i]?d/lengths[i]:0,a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d2=points[Math.min(points.length-1,i+2)],u2=u*u,u3=u2*u;
 return b.map((v,k)=>(2*u3-3*u2+1)*v+(u3-2*u2+u)*(c[k]-a[k])*.35+(-2*u3+3*u2)*c[k]+(u3-u2)*(d2[k]-v)*.35);
}
function running(time,form=0,rear=false){
 if(rear)return cycle([14,15],time,115);
 // Both use the verified alternating feet. Cadence is visual, never player speed.
 return cycle([39,40,41,42,43,44,45,46],time,form===1?58:75);
}
const scenarios=[
 ['entry','입장 → 몸풀기 → 준비'],['bat','타격 → 배트 정리 → 출발'],['single','타격 → 1루 → 감속·대기'],
 ['second','1루 → 2루 · 발 슬라이딩'],['headSlide','1루 → 2루 · 머리 슬라이딩'],['third','2루 → 3루 · 감속·대기'],
 ['home','3루 → 홈 터치·안도'],['round','1루 → 2루 → 3루 → 홈'],['lead','베이스 리드 → 대기'],['return','리드 → 귀루·접촉'],
 ['tagup','태그업 대기 → 출발'],['overslide','슬라이딩 지나침 → 재접촉'],['check','지켜보기 → 체크 스윙'],
 ['miss','헛스윙 → 균형 회복·준비'],['foul','파울 → 타구 확인·준비'],['walk','볼넷 → 배트 정리 → 1루'],
 ['hbp','사구 → 몸 추스르기 → 1루'],['lookingK','루킹 삼진 → 반응·퇴장'],['swingingK','헛스윙 삼진 → 반응·퇴장'],
 ['flyout','뜬공 확인 → 감속·퇴장'],['tagout','슬라이딩 → 태그 아웃·퇴장'],['forceout','1루 선포구 → 아웃·퇴장'],
 ['earlyBall','선포구 확인 → 멈춤·귀루'],['homer','홈런 확인 → 순회 → 홈 세리머니'],['habit','개인 대기 버릇'],
 ['exit','벤치 쪽 퇴장'],['fieldEntry','수비 위치로 이동'],
 ['bh1','타구 구경 → 뒤늦은 출발'],['bh2','파울 착각 → 급히 출발'],['bh3','포구 후 계속 뛰기 → 귀루'],
 ['bh4','베이스 누락 → 되돌아가기'],['bh5','같은 베이스 두 주자 → 수습'],['bh6','무리한 도루 → 감속·아웃'],
 ['bh7','아웃 수 착각 → 복귀']
];
function sample(action,u,p={},context={}){
 u=clamp(u);const f={...identity(p),...context.forms},time=context.time??u*6000,left=context.left??p.hand==='좌타';
 const ready=47+f.bat,load=50+f.bat,hit=53+f.bat,finish=56+f.bat;
 const run=()=>running(time,f.run,!!context.rear),walk=()=>cycle(context.rear?[8,9]:[6,7],time,180);
 const habit=(v)=>59+f.habit+6*Math.min(2,Math.floor(clamp(v)*3));
 let pose=0,contact=null,phase='대기',flip=!!context.flip,direction;
 const set=(n,label,touch=null)=>{pose=n;phase=label;contact=touch;};
 const batting=v=>v<.32?ready:v<.52?load:v<.60?hit:v<.79?finish:v<.9?38:23;
 const slide=(v,head=false)=>v<.22?run():v<.38?(head?27:24):v<.76?(head?28:25):v<.9?(head?29:26):17;
 switch(action){
 case 'entry': set(u<.57?walk():u<.64?16:u<.73?1:u<.86?74:ready,u<.57?'입장':u<.86?'몸풀기':'준비');flip=u<.64?context.home!==false:left;break;
 case 'bat':set(u<.8?batting(u/.8):run(),u<.8?'타격':'출발');flip=u<.8?left:!!context.flip;break;
 case 'single':set(u<.26?batting(u/.26):u<.84?run():u<.92?16:17,u<.26?'타격':u<.84?'1루 진루':u<.92?'감속':'베이스 대기',u>=.92?'foot':null);flip=u<.26?left:!!context.flip;break;
 case 'second':case 'headSlide':case 'tagout':{const head=action==='headSlide'||context.slide==='head',v=clamp((u-.56)/.32);set(u<.56?run():slide(v,head),u<.56?'진루':u<.88?'슬라이딩':'접촉 유지',u>=.80?(pose===28||pose===29?'hand':'foot'):null);if(u>=.80)contact=pose===28||pose===29?'hand':'foot';if(action==='tagout'&&u>.80)set(u<.90?30:walk(),u<.90?'태그 아웃':'퇴장');break;}
 case 'third':set(u<.83?run():u<.92?16:17,u<.83?'3루 진루':'3루 대기',u>=.92?'foot':null);break;
 case 'home':set(u<.78?run():u<.86?17:u<.93?34:1,u<.78?'홈 진루':u<.86?'홈 터치':'득점 뒤 안도',u>=.78&&u<.86?'foot':null);break;
 case 'round':set(run(),'베이스 순회');break;
 case 'lead':set(u<.3?walk():5,u<.3?'베이스에서 나오기':'리드');break;
 case 'return':set(u<.18?1:u<.75?run():17,u<.75?'귀루':'접촉 유지',u>=.75?'foot':null);break;
 case 'tagup':set(u<.38?17:run(),u<.38?'태그업 대기':'포구 뒤 출발',u<.38?'foot':null);break;
 case 'overslide':set(u<.25?24:u<.58?25:u<.8?29:17,u<.58?'미끄러짐':u<.8?'다시 손 뻗기':'재접촉',u>=.67?(u<.8?'hand':'foot'):null);break;
 case 'check':set(u<.42?ready:u<.65?22:ready,u<.42?'공 지켜보기':u<.65?'체크 스윙':'준비 복귀');flip=left;break;
 case 'miss':case 'foul':set(u<.58?batting(u/.58):u<.76?(action==='foul'?31:38):ready,u<.58?'스윙':u<.76?'타구 확인·균형 회복':'준비 복귀');flip=left;break;
 case 'walk':case 'hbp':set(u<.16?(action==='hbp'?32:ready):u<.27?23:u<.85?walk():17,u<.27?'배트 정리':u<.85?'1루 이동':'베이스 대기',u>=.85?'foot':null);flip=u<.27?left:!!context.flip;break;
 case 'lookingK':case 'swingingK':set(u<.5?(action==='swingingK'?batting(u/.5):ready):u<.78?30:walk(),u<.5?'투구 확인':u<.78?'삼진 반응':'퇴장');flip=u<.5?left:!!context.flip;break;
 case 'flyout':set(u<.4?run():u<.58?31:u<.7?16:u<.84?30:walk(),u<.4?'진루':u<.7?'포구 확인':'아웃·퇴장');break;
 case 'forceout':set(u<.74?run():u<.82?16:u<.91?30:walk(),u<.74?'1루 진루':u<.91?'포스 아웃':'퇴장');break;
 case 'earlyBall':set(u<.45?run():u<.63?16:u<.78?31:run(),u<.45?'진루':u<.78?'선포구 확인':'귀루');if(u>=.78)flip=!flip;break;
 case 'homer':set(u<.16?batting(u/.16):u<.24?35:u<.82?run():u<.86?17:u<.95?habit((u-.86)/.09):1,u<.24?'홈런 확인':u<.82?'베이스 순회':u<.86?'홈 터치':'홈 세리머니',u>=.82&&u<.86?'foot':null);flip=u<.16?left:!!context.flip;break;
 case 'habit':set(habit(u),'개인 버릇');break;
 case 'exit':set(walk(),'벤치로 퇴장');break;
 case 'fieldEntry':set(u<.88?run():5,u<.88?'수비 위치 이동':'수비 준비');break;
 case 'bh1':case 'bh2':set(u<.52?31:run(),u<.52?(action==='bh1'?'타구 구경':'파울로 착각'):'뒤늦은 출발');break;
 case 'bh3':case 'bh4':set(u<.5?run():u<.68?16:run(),u<.5?'잘못된 진루':u<.68?'실수 확인':'되돌아가기');if(u>=.68)flip=!flip;break;
 case 'bh5':set(u<.45?run():u<.75?31:walk(),u<.45?'진루':u<.75?'같은 베이스 두 주자':'자리 수습');break;
 case 'bh6':set(u<.7?run():u<.82?16:30,u<.7?'무리한 도루':'아웃 확인');break;
 case 'bh7':set(u<.55?walk():u<.7?31:run(),u<.55?'교대로 착각':u<.7?'실수 확인':'복귀');if(u>=.7)flip=!flip;break;
 default:set(17,'베이스 대기','foot');
 }
 if(context.rear&&pose>=39&&pose<=46)direction=3;
 return{pose,phase,contact,flip,direction,forms:f};
}
const api={identity,running,sample,routePoint,forms,scenarios,personalities};root.PlayerMotionV13=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

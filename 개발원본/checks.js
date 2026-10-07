ruleChecks=function(){const original=data,oldAnim=anim,oldReaction=reaction,oldShift=shiftLead,oldScreen=screen,rows=[];suppressPersist++;anim=null;reaction=null;shiftLead=null;
const check=(name,f)=>{try{if(!f())throw Error('기대 결과와 다름');rows.push({name,ok:true});}catch(e){rows.push({name,ok:false,error:e.message});}};
function fixture(outs=0){const t=newTeam('검증',11,5),o=newTeam('상대',8,4);data={saveVersion:1,slots:[t,null],current:0,settings:{sound:false,speed:1}};const m={id:'test',opp:o,home:1,inning:1,half:0,outs,balls:0,strikes:0,bases:[null,null,null],score:[0,0],order:[0,0],last:[null,null],hits:[0,0],errors:[0,0],innings:[Array(7).fill(0),Array(7).fill(0)],paPitches:0,events:[],rng:15151,pitches:0,bh:[0,0],bhBase:[0,0],bhBaseUsed:[0,0],opportunities:[0,0],defense:{side:1,depth:1},checks:{events:0,violations:[],motions:0,reactions:0},lastLines:{},reactionCount:0,used:t.lineup.map(x=>x.id),subs:[],done:false};t.match=m;prepare(m);return {t,m,ids:t.players.slice(1,4).map(p=>p.id)};}
try{
check('초기 12명 · 출전 9명 · 6체형',()=>{const {t}=fixture();return t.players.length===12&&t.lineup.length===9&&new Set(t.players.map(p=>p.appearance.body)).size===6;});
check('시작 시설 0 · 시작 자금 3000',()=>{const {t}=fixture();return t.facilities.length===0&&t.funds===3000;});
check('초기 지급 반복 진입 시 선수 유지',()=>{const t=newTeam('준비',11,5,true);ensureInitialRoster(t);const ids=t.players.map(p=>p.id).join();ensureInitialRoster(t);return t.players.length===12&&ids===t.players.map(p=>p.id).join();});
check('등번호 중복 방지',()=>{const {t}=fixture();t.setupDraft=t.players.map(p=>({id:p.id,name:p.name,number:p.number}));t.setupDraft[1].number=t.setupDraft[0].number;return !!setupIdentityError(t,t.setupDraft);});
check('35명 한도 초과 저장 거부',()=>{const {t}=fixture();t.match=null;while(t.players.length<36)t.players.push(player(false,t.players.map(p=>p.number)));try{validateTeam(t);return false;}catch{return true;}});
check('영입 야구센스 상한 70',()=>Array.from({length:100},()=>player(false)).every(p=>p.a.sense<=70));
check('부족한 자금 거래는 잔액 유지',()=>{const {t}=fixture(),a=t.funds;return !spend(t,a+1,'검사')&&t.funds===a;});
check('훈련 연결에 모든 능력 포함',()=>KEYS.every(k=>trainingFacility(k)));
check('100 능력은 성장 비용 0',()=>{const {t}=fixture(),p=t.players[0];p.a.contact=100;return costGrowth(p,'contact')===0;});
check('무체력도 출전 가능 · 능력 감소',()=>{const {t}=fixture(),p=t.players[0];p.a.contact=50;p.energy=0;const reduced=effective(p,'contact')<50&&p.a.contact===50;p.a.contact=1;return reduced&&effective(p,'contact')===1;});
check('만루 볼넷 · 1득점 · 타수 제외',()=>{const {m,ids}=fixture();m.bases=ids;const p=batter(m),e=emptyEvent(m);walk(m,e,'bb');return m.score[0]===1&&p.stats.bb===1&&p.stats.ab===0&&e.moves.length===4;});
check('볼넷에서 비강제 2루 주자는 유지',()=>{const {m,ids}=fixture();m.bases[1]=ids[0];walk(m,emptyEvent(m),'bb');return m.bases[1]===ids[0]&&m.bases[2]===null;});
check('1사 1·3루 병살은 득점 없음',()=>{const {m,ids}=fixture(1);m.bases=[ids[0],null,ids[2]];const e=emptyEvent(m);groundOut(m,e,true);return m.outs===3&&m.score[0]===0&&e.outsAdded===2;});
check('무사 병살은 아웃 2개',()=>{const {m,ids}=fixture();m.bases[0]=ids[0];groundOut(m,emptyEvent(m),true);return m.outs===2&&m.order[0]===1;});
check('만루 홈런 · 4득점과 4개 루 순회',()=>{const {m,ids}=fixture();m.bases=ids;const e=emptyEvent(m);reachHit(m,e,4);return m.score[0]===4&&e.moves.find(x=>x.from===0).points.length===5;});
check('희생플라이는 타수 제외',()=>{const {m,ids}=fixture();m.bases[2]=ids[0];const p=batter(m);flyOut(m,emptyEvent(m),10);return m.score[0]===1&&p.stats.sf===1&&p.stats.ab===0;});
check('도루 실패는 타순 유지',()=>{const {m,ids}=fixture();m.bases[0]=ids[0];const e=emptyEvent(m);runnerEvent(m,e,'steal',6);return m.outs===1&&m.order[0]===0&&!e.pitchThrown;});
check('안타로 연속 무안타 해제',()=>{const {m}=fixture(),p=batter(m);p.stats.hitless=9;reachHit(m,emptyEvent(m),1);return p.stats.hitless===0;});
check('본헤드 회당 3 · 상대에게 발생 없음',()=>{const {m}=fixture();m.bhBase=[99,0];m.opportunities=[999,0];for(let i=0;i<3;i++)if(chooseBH(m,emptyEvent(m))?.side!==0)return false;m.half=1;return chooseBH(m,emptyEvent(m))===null&&m.bh[1]===0;});
check('새 회에서 본헤드 제한 초기화',()=>{const {m}=fixture();m.bhByInning={1:3};m.bhBase=[99,0];m.opportunities=[999,0];m.inning=2;return chooseBH(m,emptyEvent(m))?.side===0;});
check('야구센스 비중 70%',()=>{const p=player(false);KEYS.forEach(k=>p.a[k]=0);p.a.sense=100;return Object.keys(BH_OTHER).every(n=>bhScore(p,+n)===70);});
check('한 사건 한 멘트 · 팀 흐름 포함 61상황 244개',()=>DIALOGUES.length===61&&DIALOGUES.every(x=>x[4].length===4));
check('멘트 직전 문구 반복 방지',()=>{const {m}=fixture();let a=pickReaction(m,'g05'),ok=true;for(let i=0;i<30;i++){const n=pickReaction(m,'g05');ok&&=n.index!==a.index;a=n;}return ok;});
check('10초 지시 · 5초 반응',()=>RULES.decisionSeconds===10&&TUNE.reactionMs===5000);
check('공격 버튼은 대기 즉시 종료',()=>{const {m}=fixture();m.inputLeft=9;let ran=0;return commitInstruction(m,'attack','contact',()=>ran++)&&ran===1&&m.inputLeft===0;});
check('교체 선수는 타순·포지션 유지',()=>{const {t,m}=fixture(),out=t.lineup[0].id,inp=t.players[9].id,pos=t.lineup[0].pos;return !substitute(t,out,inp)&&t.lineup[0].id===inp&&t.lineup[0].pos===pos&&m.used.includes(inp);});
check('교체 후 재출전 거부',()=>{const {t}=fixture(),out=t.lineup[0].id,inp=t.players[9].id;substitute(t,out,inp);return !!substitute(t,inp,out);});
check('누적 보상 중복 지급 방지',()=>{const {t,m}=fixture();m.done=true;m.score=[2,1];reward(m);const funds=t.funds;reward(m);return t.w===1&&t.trophies===1&&t.history.length===1&&t.funds===funds&&!t.offer;});
check('피로 적용 후 영구 능력은 유지',()=>{const {t,m}=fixture(),p=t.players[0],a=JSON.stringify(p.a);p.energy=0;resolvePitch(m);return JSON.stringify(p.a)===a;});
check('기준 요구액 재계약',()=>{const {t}=fixture();t.match=null;const p=t.players[0];p.contract=0;negotiate(p,salaryAsk(p));return p.contract===balance().contractGames;});
check('낮은 급여 제안 애정도 하락',()=>{const {t}=fixture(),p=t.players[0],l=p.loyalty;p.salary=100;negotiate(p,1);return p.loyalty===l-15&&p.lowOffers===1;});
check('두 슬롯 독립 직렬화 복원',()=>{const {t}=fixture();t.match=null;data.slots[1]=newTeam('두번째',8,4);const round=JSON.parse(JSON.stringify(data));validateRoot(round);return round.slots[0].id!==round.slots[1].id&&round.slots[1].funds===3000;});
check('손상된 외형 저장 거부',()=>{const {t}=fixture();t.players[0].appearance.body=7;try{validateTeam(t);return false;}catch{return true;}});
check('6체형 모두 경기용 파츠 소스 존재',()=>LAB_DATA.bodies.length===6&&Object.keys(PLAYER_PARTS.motion).length===21&&Object.values(PLAYER_PARTS.motion).every(p=>p.views.length===4));
check('상세·경기 실제 파츠 6체형 합성',()=>{const t=newTeam('그림',11,5);for(let body=0;body<6;body++){const p=t.players[body];p.appearance.parts={hair:5,beard:3,wear:0,eyes:-1,nose:-1,brows:-1,mouth:-1};for(const mode of ['detail','motion']){const x=charFrame(p,t,mode);if(!x.canvas.width||!x.rects.hair||!x.rects.beard||!x.rects.wear)return false;}}return true;});
check('눈·머리 색 독립 보존',()=>{const p=player(true);p.appearance.hairColor=4;p.appearance.eyeColor=2;const q=JSON.parse(JSON.stringify(p));return q.appearance.hairColor===4&&q.appearance.eyeColor===2;});
check('내장 글꼴 두 종과 라이선스',()=>document.fonts.check('16px NeoDunggeunmo')&&document.fonts.check('12px Galmuri9')&&FONT_LICENSE_TEXT.includes('SIL OPEN FONT LICENSE'));

check('급여는 고능력에서 더 가파르게 증가',()=>{const p=player(false);KEYS.forEach(k=>p.a[k]=40);const low=abilityPrice(p);KEYS.forEach(k=>p.a[k]=80);return abilityPrice(p)===low*4;});
check('평균40·12명·시설2개는 패배 적자 승리 소폭 흑자',()=>{const {t}=fixture();t.match=null;t.players.forEach(p=>{KEYS.forEach(k=>p.a[k]=40);p.salary=128;p.fans=50;});t.facilities=['bat','field'];t.ticket=10;const b=balance(t),loss=b.baseReward+3*b.runReward+attendance(t)*t.ticket/2-operatingBudget(t).total;return loss<0&&loss+b.winReward>0&&loss+b.winReward<500;});
check('입장료50 무조건 유리한 문제 차단',()=>{const {t}=fixture();t.players.forEach(p=>p.fans=50);t.ticket=10;const regular=attendance(t)*t.ticket;t.ticket=50;return attendance(t)*t.ticket<regular;});
check('기존 급여·영입가 전환은 한 번만 적용',()=>{const {t}=fixture();t.match=null;delete t.economyVersion;t.players.forEach(p=>p.salary=1);t.market=[player(false)];adjustEconomy(t);const a=t.players[0].salary,price=t.market[0].price;t.players[0].salary=a+7;adjustEconomy(t);return a>1&&t.players[0].salary===a+7&&t.market[0].price===price;});
check('진행 중인 경기는 경제 전환 유예',()=>{const {t}=fixture();delete t.economyVersion;t.players[0].salary=9;adjustEconomy(t);return t.players[0].salary===9&&t.economyVersion!==9;});
check('선수35명·시설5개 운영비를 모두 합산',()=>{const {t}=fixture();t.match=null;while(t.players.length<35)t.players.push(player(false));t.players.forEach(p=>p.salary=128);t.facilities=['bat','field','pitch','run','fitness'];return operatingBudget(t).total===35*128+5*150;});

check('원화 표시 · 0원·음수·억 단위',()=>money(0)==='0원'&&money(3000)==='3,000만 원'&&money(-257)==='-257만 원'&&money(12345)==='1억 2,345만 원');
check('입장료×실제 관중=표시 입장 수입',()=>{const {t}=fixture();t.ticket=10;t.players.forEach(p=>p.fans=50);return attendance(t)*SPECTATORS_PER_UNIT*ticketInput(t.ticket)===wonValue(attendance(t)*t.ticket);});
check('원화 입력이 급여·입장료 판정값으로 정확히 복원',()=>salaryFromInput(1280000)===128&&ticketFromInput(10000)===10&&!Number.isInteger(ticketFromInput(1500)));
check('매장 관중당 1000원 수입은 기존 경제와 동일',()=>{const {t}=fixture();return attendance(t)*SPECTATORS_PER_UNIT*1000===wonValue(attendance(t));});
check('입장 중 투구·체력·경기기록 진행 차단',()=>{const {t,m}=fixture();holdEntrance(m);const before=JSON.stringify(t);launchPitch();return JSON.stringify(t)===before&&m.paused&&m.inputLeft===10&&!anim;});
check('입장 종료 후 10초부터 지시 시작 · 중복 종료 방지',()=>{const {m}=fixture();holdEntrance(m);return releaseEntrance(m)&&!m.paused&&m.inputLeft===10&&!m.pendingEntrance&&!releaseEntrance(m);});
check('입장 중 저장 복원 시 대기 상태 유지',()=>{const {m}=fixture();holdEntrance(m);const copy=JSON.parse(JSON.stringify(m));return copy.pendingEntrance&&copy.paused&&copy.pitches===0&&copy.events.length===0;});
check('입장 → 준비 → 시작 순서와 5초대 길이',()=>entranceStage(0)===0&&entranceStage(2099)===0&&entranceStage(2100)===1&&entranceStage(4099)===1&&entranceStage(4100)===2&&ENTRANCE_MS===5400);
check('실제 새 경기 생성 흐름도 첫 투구 전 입장 대기',()=>{const {t,m}=fixture();m.done=true;const renderer=render,oldWait=waitMs;try{render=()=>{};startMatch();return t.match.id!==m.id&&t.match.pendingEntrance&&t.match.paused&&t.match.pitches===0&&t.match.events.length===0&&t.match.inputLeft===10&&!reaction;}finally{render=renderer;waitMs=oldWait;}});
}finally{restoreAbilities();data=original;anim=oldAnim;reaction=oldReaction;shiftLead=oldShift;screen=oldScreen;suppressPersist--;}
GameV08.testReport=rows;return rows;};


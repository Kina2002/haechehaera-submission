// React to the completed team outcome, not merely the batter's hit type.
const FLOW_LINES23={
 lead:['점수를 뒤집습니다. 이제 우리 팀이 앞섭니다!','역전이에요! 이 흐름 지켜요!','좋아! 드디어 우리가 앞이다!','아, 리드를 내줬네. 다시 따라가자!'],
 tie:['우리 팀이 동점을 만듭니다. 승부는 다시 원점입니다.','동점이에요! 이제 한 점만 더!','따라잡았다! 여기서 멈추지 말자!','동점이네. 다음 점수는 우리 거야!'],
 chase:['점수 차를 좁혔습니다. 아직 추격이 필요합니다.','한 걸음 따라갔어요! 계속 이어가요!','좋아, 따라가자! 아직 끝난 건 아니야!','아직 우리가 앞이야. 여기서 끊자!'],
 extend:['우리 팀이 점수를 보탭니다. 리드를 더 벌립니다.','좋아요! 점수 차를 더 벌려요!','한 점 더! 그래도 끝까지 집중하자!','점수 차가 벌어지네. 이제 막아야지!'],
 awayLead:['상대가 앞서갑니다. 우리 팀은 다시 추격해야 합니다.','리드를 내줬어요. 여기서 더 주면 안 돼요!','아, 결국 뒤집혔네! 정신 차리자!','뒤집었다! 점수판 보기 좋네!'],
 awayTie:['상대에게 동점을 허용합니다. 다시 팽팽해졌습니다.','동점이 됐어요. 다음 한 점은 지켜요!','아, 그 리드를 못 지키냐…','따라잡았다! 이제 뒤집자!'],
 awayChase:['상대가 점수 차를 좁힙니다. 우리 팀의 리드는 남아 있습니다.','아직 앞서 있어요! 더는 내주지 말아요!','아직 이기고 있다! 하지만 불안하잖아!','차이 줄였다! 계속 쫓아가자!'],
 awayExtend:['상대가 추가 득점합니다. 우리 팀의 추격이 더 어려워집니다.','차이가 벌어져요. 이번엔 꼭 막아요!','한 점도 아픈데 또 주네…','한 점 더! 따라오려면 바쁘겠네!'],
 mixed:['타자는 살아 나갔지만 주자를 잃었습니다. 마냥 웃을 결과는 아닙니다.','출루는 했지만 주자 아웃이 아쉬워요. 침착하게 가요!','타자는 살았는데 앞 주자는 왜 잃어!','한 명 잡았다! 남은 주자도 묶어두자!'],
 awayMixed:['상대 주자를 잡았지만 타자는 남았습니다. 아직 안심하기는 이릅니다.','아웃은 챙겼어요! 남은 주자도 잘 막아요!','하나는 잡았네. 그래도 아직 주자 있다!','타자는 살았다! 다음 타석 이어가자!'],
 scoreOut:['점수는 챙겼지만 아웃도 나왔습니다. 득점과 주루 손실이 함께 남습니다.','점수는 반가워요! 다음엔 아웃까지 줄여봐요!','들어온 건 좋은데, 주자까지 잃긴 아깝다!','점수는 줬어도 아웃은 챙겼다. 여기서 막자!'],
 awayScoreOut:['아웃은 잡았지만 실점도 허용했습니다. 수비 결과가 엇갈립니다.','아웃은 잡았지만 점수를 줬어요. 다음 주자는 막아요!','잡으면 뭐 해, 점수가 들어왔는데!','아웃은 아쉽지만 점수는 우리 거다!'],
 advance:['타자는 아웃됐지만 주자를 앞으로 보냈습니다. 기회는 남아 있습니다.','아웃은 아쉽지만 주자는 전진했어요! 이어가요!','주자는 보냈다. 이제 불러들이자!','아웃 하나! 남은 주자는 보내지 말자!'],
 awayAdvance:['아웃을 잡는 사이 상대 주자가 전진했습니다. 수비 집중이 필요합니다.','하나 잡았어요! 가까워진 주자도 조심해요!','아웃은 좋지만 주자가 가까워졌잖아!','주자는 전진했다! 다음엔 홈까지!'],
 chance:['우리 팀 주자가 득점권에 있습니다. 다음 타석이 중요합니다.','기회가 이어져요! 이제 홈으로 불러와요!','좋아, 주자 모았다! 점수로 바꾸자!','출루는 허용해도 홈은 안 돼!'],
 awayChance:['상대 주자가 득점권에 들어왔습니다. 위기를 끊어야 합니다.','위기예요. 다음 타자를 꼭 막아요!','또 득점권이야? 여기서 끊자!','좋아, 기회 왔다! 한 방이면 된다!'],
 awayStrand:['상대 주자를 남겨두고 무실점으로 공격을 끝냈습니다.','위기 넘겼어요! 이제 우리 공격이에요!','휴, 주자 두고 끝냈다! 잘 버텼어!','주자만 남겼네. 다음엔 꼭 불러오자!']
};
for(const [key,lines]of Object.entries(FLOW_LINES23))DIALOGUES.push(['f23-'+key,'팀 흐름',key,'확정된 득점·주자·아웃 상황 기준',lines.map((line,i)=>[['중계진','우리 치어리더','우리 관객','상대 관객'][i],line])]);
function flowGroup23(m,e){
 if(m.done||e.bh||!e.before?.score||!e.after?.score)return null;
 const own=e.attack===0,runs=e.runs?.length||0,outs=e.outsAdded||0;
 const before=e.before.bases||[],after=e.after.bases||[],ended=e.inningChange||e.after.outs>=3;
 if(runs){
  if(outs)return own?'f23-scoreOut':'f23-awayScoreOut';
  const prior=e.before.score[0]-e.before.score[1],now=e.after.score[0]-e.after.score[1];
  return 'f23-'+(own?(now===0?'tie':now>0?(prior<=0?'lead':'extend'):'chase'):(now===0?'awayTie':now<0?(prior>=0?'awayLead':'awayExtend'):'awayChase'));
 }
 if(ended&&before.some(Boolean))return own?'g14':'f23-awayStrand';
 const runnerOut=(e.outIds||[]).some(id=>id!==e.batter);
 if(outs&&(after.includes(e.batter)||runnerOut&&!['dp','flydp','cs'].includes(e.type)))return own?'f23-mixed':'f23-awayMixed';
 if(!ended&&outs===1&&!runnerOut&&before.some((id,i)=>id&&after.indexOf(id)>i))return own?'f23-advance':'f23-awayAdvance';
 if(e.pa&&!outs&&(after[1]||after[2]))return own?'f23-chance':'f23-awayChance';
 return null;
}
const chooseBefore23=chooseGroup,reactionContext23=new WeakMap();
chooseGroup=function(m,e){const group=flowGroup23(m,e)||chooseBefore23(m,e);reactionContext23.set(m,{e,group});return group;};
const pickBefore23=pickReaction;
pickReaction=function(m,group,N=0){
 const result=pickBefore23(m,group,N),context=reactionContext23.get(m);reactionContext23.delete(m);
 if(result&&context?.group===group&&['f23-scoreOut','f23-awayScoreOut'].includes(group)){
  const e=context.e,d=e.after.score[0]-e.after.score[1],prior=e.before.score[0]-e.before.score[1];
  result.line+=' '+(d===0?'현재 동점입니다.':d>0?(prior<=0?'우리 팀이 앞서갑니다.':'우리 팀이 리드를 지킵니다.'):(prior>=0?'상대가 앞서갑니다.':'우리 팀은 추격이 필요합니다.'));
 }
 return result;
};
// Individual speech also acknowledges a lost runner instead of celebrating the hit alone.
PLAYER_LINES22.mixed=['주자 아웃이 아쉽네…','살았지만 웃을 수 없네…','다음 주자는 지키자!','출루만으로는 부족하네…'];
PLAYER_LINES22.scoreOut=['점수는 챙겼다…','아웃은 아쉽네…','다음엔 더 침착하게!','득점은 다행이야!'];
PLAYER_LINES22.catchConcede=['잡았는데 점수가 들어갔네…','송구가 늦었나…','다음 주자는 막는다!','아, 홈은 못 막았네…'];
const speechBefore23=speechCue22;
speechCue22=function(e){const cue=speechBefore23(e);if(cue&&['hit','catch'].includes(cue.key)&&((e.outsAdded||0)>0&&['single','double','triple'].includes(e.type)||(e.runs?.length||0)>0&&['fly','line','sf','flydp'].includes(e.type)))return {...cue,key:cue.key==='catch'?'catchConcede':e.runs?.length?'scoreOut':'mixed'};return cue;};


/* Common form candidates. Personality labels are non-exclusive suggestions. */
window.FormCandidates={
 bat:[
  {id:'B01',name:'기본 균형',description:'배트를 몸 가까이 두고 작은 준비에서 일정하게 회전합니다.',features:['발 간격과 머리 높이가 안정적','짧은 준비, 단단한 중심','다른 폼을 비교하는 기준'],tags:['소심','느긋','투덜이'],p:{stance:15,crouch:0,kick:3,hands:0,bat:-1.15,sway:0,lean:2,finish:0,finishX:-14,finishY:-3,finishAngle:-2.4}},
  {id:'B02',name:'다리 높이 들기',description:'앞다리를 높이 들어 힘을 모으고 크게 내딛습니다.',features:['준비에서 무릎이 확실히 올라감','접촉 전 다리를 내려 중심 이동','크고 적극적인 준비 동작'],tags:['열혈','허세','엉뚱'],p:{stance:15,crouch:0,kick:24,hands:1,bat:-1.25,sway:1,lean:3,finish:2,finishX:-20,finishY:-15,finishAngle:-2.8}},
  {id:'B03',name:'낮게 모으기',description:'낮은 자세로 몸을 모았다가 타격 순간에 펴냅니다.',features:['낮은 머리와 깊은 무릎 굽힘','준비와 접촉의 높이 차이','작은 자세에서 크게 펴지는 실루엣'],tags:['열혈','소심','투덜이'],p:{stance:19,crouch:6,kick:0,hands:-2,bat:-.95,sway:1,lean:6,finish:-1,finishX:-19,finishY:-13,finishAngle:-2.3}},
  {id:'B04',name:'넓게 서기',description:'발을 넓게 놓고 다리를 크게 들지 않으며 몸통을 돌립니다.',features:['넓은 발 간격','발이 지면을 지키는 준비','회전과 마무리의 옆 폭이 큼'],tags:['열혈','허세','느긋'],p:{stance:23,crouch:3,kick:1,hands:0,bat:-1.15,sway:0,lean:4,finish:4,finishX:-25,finishY:-2,finishAngle:-3.15}},
  {id:'B05',name:'배트 높게 들기',description:'상체를 세우고 손과 배트를 높이 든 채 준비합니다.',features:['높은 손 위치와 세운 상체','준비 실루엣이 위로 길어짐','타격 때 손을 내려 앞으로 연결'],tags:['소심','허세','엉뚱'],p:{stance:13,crouch:-2,kick:8,hands:9,bat:-1.15,sway:0,lean:0,finish:3,finishX:-14,finishY:-20,finishAngle:-2.05}},
  {id:'B06',name:'배트 낮게 흔들기',description:'낮은 배트를 가볍게 흔들며 리듬을 잡고 준비합니다.',features:['배트가 뒤쪽으로 낮게 뻗음','작은 흔들림이 있는 대기','준비의 여유와 짧게 끊는 마무리'],tags:['느긋','엉뚱','투덜이'],p:{stance:17,crouch:1,kick:4,hands:-8,bat:-3.05,sway:4,lean:1,finish:-3,finishX:-14,finishY:3,finishAngle:-3.0}}
 ],
 run:[
  {id:'R01',name:'앞으로 기울이기',description:'상체를 앞으로 기울이고 팔을 앞뒤로 선명하게 움직입니다.',features:['앞으로 향한 어깨와 머리','몸 가까이에서 빠르게 왕복하는 팔','돌진하는 인상, 실제 속도는 공통'],tags:['열혈','소심','투덜이'],p:{lean:10,cadence:2.15,lift:9,bob:1.8,arm:.93,armWide:0,head:0}},
  {id:'R02',name:'상체 세우기',description:'머리와 어깨의 높이를 안정적으로 유지하며 달립니다.',features:['곧게 세운 몸통','과하지 않은 보폭과 팔치기','침착하고 흔들림이 적은 실루엣'],tags:['소심','느긋','투덜이'],p:{lean:1,cadence:1.9,lift:8,bob:.7,arm:.68,armWide:0,head:0}},
  {id:'R03',name:'무릎 높이 들기',description:'무릎을 높이 들고 위아래 탄력이 보이는 자세입니다.',features:['높이 접히는 앞다리','상하 움직임이 뚜렷함','작은 크기에서도 리듬 차이가 보임'],tags:['열혈','허세','엉뚱'],p:{lean:4,cadence:2.2,lift:20,bob:4.6,arm:.87,armWide:1,head:-1}},
  {id:'R04',name:'큰 보폭',description:'발이 앞뒤로 길게 벌어지고 한 걸음을 길게 이어갑니다.',features:['길게 벌어지는 다리','천천히 바뀌는 큰 걸음','걸음 수가 적어도 이동 속도는 공통'],tags:['허세','느긋'],p:{lean:3,cadence:1.4,lift:10,bob:1.6,arm:.94,armWide:0,head:0}},
  {id:'R05',name:'짧은 보폭',description:'작은 걸음을 자주 바꾸고 팔도 몸 가까이에서 움직입니다.',features:['짧고 잦은 발 교대','좁은 팔치기','작은 걸음이어도 이동 속도는 공통'],tags:['소심','느긋','엉뚱','투덜이'],p:{lean:5,cadence:2.9,lift:7,bob:1.3,arm:.54,armWide:-1,head:0}},
  {id:'R06',name:'팔 크게 치기',description:'팔꿈치의 앞뒤 움직임을 크게 보여주는 자세입니다.',features:['몸 바깥까지 커지는 팔의 폭','가슴과 어깨의 움직임 강조','큰 팔 동작이 성능을 정하지 않음'],tags:['열혈','허세','엉뚱'],p:{lean:5,cadence:1.95,lift:10,bob:2,arm:1.38,armWide:5,head:1}}
 ],
 phases:{bat:['준비','힘 모으기','딛기','맞히기','마무리','복귀'],run:['오른발 지지','밀어내기','발 교대','왼발 지지','밀어내기','발 교대']},
 sampleTimes:{bat:[0,.25,.43,.56,.73,.92],run:[0,1/6,2/6,.5,2/3,5/6]},
 personalities:{'열혈':{bat:['B02','B03','B04'],run:['R01','R03','R06']},'소심':{bat:['B01','B03','B05'],run:['R01','R02','R05']},'허세':{bat:['B02','B04','B05'],run:['R03','R04','R06']},'느긋':{bat:['B01','B04','B06'],run:['R02','R04','R05']},'엉뚱':{bat:['B02','B05','B06'],run:['R03','R05','R06']},'투덜이':{bat:['B01','B03','B06'],run:['R01','R02','R05']}}
};

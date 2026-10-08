if(TEST_ONLY){
 const panel=document.createElement('section');panel.className='panel';
 panel.innerHTML='<h3>경기 기록 색상 검사 · 실제 저장과 분리</h3><button data-history-colors-qa>경기 기록 색상 미리보기·검사</button>';
 document.body.append(panel);
 panel.querySelector('button').onclick=()=>{
  const samples=[
   ['single',0,1,0,'김해체 · 안타!',0,0,'positive'],
   ['ground',0,1,0,'이웃찬 · 땅볼 아웃',1,0,'negative'],
   ['double',1,1,1,'상대 타자 · 2루타!',0,0,'negative'],
   ['kl',1,1,1,'상대 타자 · 루킹 삼진',1,0,'positive'],
   ['foul',0,2,0,'박병맛 · 파울 · 타석 계속',0,0,'neutral'],
   ['sf',0,2,0,'최타돌 · 희생플라이 · 태그업 득점',1,1,'neutral'],
   ['ground',1,2,1,'상대 타자 · 땅볼 아웃 · 3아웃',1,0,'positive']
  ];
  const events=samples.map(([type,attack,inning,half,text,outsAdded,runs],i)=>{
   const score=[0,0];score[attack]=runs;
   return {id:'color-example-'+i,type,attack,inning,half,text,outsAdded,bh:0,runs:runs?['runner']:[],moves:[],before:{score:[0,0],outs:i===6?2:0},after:{score,outs:i===6?3:outsAdded,bases:[null,null,null]}};
  });
  const before=JSON.stringify(events),html=historyHTML21({id:'color-examples',events});
  note('경기 기록 색상 · 상황 예시','<p>우리 팀에 유리한 결과는 파란색, 불리한 결과는 붉은색입니다. 파울과 득점·아웃이 섞인 결과는 기본색입니다.</p><div class="history-color-preview">'+html+'</div><pre id="historyColorsReport" hidden></pre><style>.history-color-preview{margin-top:15px}.history-color-preview .history-scroll21{max-height:340px}.history-color-preview .history-row21{font-size:13px;padding:8px 9px;grid-template-columns:58px 40px 34px minmax(0,1fr)}</style>');
  const checks=[],check=(name,ok)=>checks.push({name,ok:!!ok});
  const colors={positive:'rgb(134, 202, 255)',negative:'rgb(255, 154, 166)',neutral:'rgb(235, 242, 239)'};
  samples.forEach((sample,i)=>{const row=$('#dialog').querySelector('[data-event="color-example-'+i+'"]'),expected=sample[7];
   check('상황 '+(i+1)+' · '+sample[4],row?.dataset.tone===expected&&getComputedStyle(row).color===colors[expected]);
  });
  check('마지막 아웃의 회차·초말 유지',$('#dialog').querySelector('[data-event="color-example-6"] time').textContent==='2회 말');
  check('기록 데이터 변경 없음',JSON.stringify(events)===before);
  check('화면 오류 없음',runtimeErrors.length===0);
  $('#historyColorsReport').textContent=JSON.stringify({checkedAt:'2026-10-08',passed:checks.every(x=>x.ok),checks,runtimeErrors:runtimeErrors.slice()},null,2);
 };
}

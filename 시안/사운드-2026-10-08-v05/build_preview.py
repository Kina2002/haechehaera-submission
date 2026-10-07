"""Build the standalone, user-facing v05 listening page."""
from pathlib import Path
from html import escape

root=Path(__file__).resolve().parent
cards=[
 ('01-commentary-mic','중계진','마이크 ON','0.42초 · 새 시안','딸깍 켜지고 바로 끝나는 짧은 마이크 효과음.','#527c84'),
 ('02-rival-fans-tease','상대 관객 → 우리 팀 조롱','관중석 한마디','5초 · 용도 선택 완료','이전 오르간 음악 그대로. 상대 관객의 짓궂은 한마디에 사용.','#aa8440'),
 ('03-home-fans-sad','우리 관객 → 우울한 반응','또 놓쳤네…','5초 · 새 시안','낮아지는 클라리넷과 조용한 전자 피아노로 아쉬움을 표현.','#688296'),
 ('04-home-cheer-support','우리 치어리더 → 우리 팀 응원','다 같이 박수!','5초 · 용도 선택 완료','우리 팀이 잘했을 때 나오는 신나는 응원. 이전 음악 그대로.','#648748'),
 ('05-rival-cheer-tease','상대 치어리더 → 우리 팀 조롱','어머, 또요?','5초 · 새 시안','짧게 끊는 금관과 현악기, 마림바가 주고받는 장난스러운 리듬.','#ab6578')
]

def player(key,title):
    return f'<audio controls preload="metadata" aria-label="{escape(title)}" src="audio/{key}.wav"></audio><div class="links"><a href="audio/{key}.mp3" download>MP3 받기</a><a href="audio/{key}.wav" download>WAV 받기</a></div>'

def card(key,role,title,duration,desc,color):
    return f'<article class="card" style="--accent:{color}"><p class="role">{role}</p><h2>{title}</h2><span class="tag">{duration}</span><p class="desc">{desc}</p>{player(key,role+" · "+title)}</article>'

html='''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>해체해라 · 마이크·우울·조롱·타격음 시안</title><style>
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f6f1e5;color:#173c33;font:15px/1.7 system-ui,'Malgun Gothic',sans-serif}main{max-width:1060px;margin:auto;padding:25px 24px 60px}header{display:flex;justify-content:space-between;align-items:center;gap:14px;border-bottom:1px solid #173c33;padding-bottom:15px}.brand{font-size:22px;font-weight:900}.stamp{font-size:10px;letter-spacing:1px}h1{font-size:38px;line-height:1.3;letter-spacing:-1.3px;margin:27px 0 12px}.intro{color:#617465;font-size:14px}.choices{background:#e8ecdb;border-left:3px solid #829747;padding:12px 15px;font-size:12px;margin:20px 0}.controls{display:flex;justify-content:space-between;align-items:center;gap:14px;font-size:12px;margin:19px 0}.now{color:#617465}button{font:inherit;cursor:pointer;color:#173c33;border:1px solid #173c33;border-radius:4px;padding:8px 12px;white-space:nowrap;background:transparent}button:hover{background:#e2e8cc}.mix{background:#173c33;color:#fff9ea;border-radius:5px;padding:20px}.mix p{margin:0 0 12px;font-size:13px}.mix strong{font-size:17px}.mix small{color:#d8e1b8}.mix a{color:#d8e1b8}audio{width:100%;height:38px;display:block}.links{display:flex;flex-wrap:wrap;gap:17px;margin-top:9px;font-size:12px}a{color:#45684b}.cards{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:22px}.card{background:#fffcf3;border:1px solid #d6dccb;border-top:4px solid var(--accent);border-radius:4px;padding:20px;min-width:0}.role{font-size:12px;color:var(--accent);font-weight:750;margin:0}.card h2{font-size:23px;line-height:1.3;margin:10px 0}.tag{font-size:11px;padding:3px 9px;border-radius:14px;background:#ececdb}.desc{font-size:13px;color:#617465;min-height:42px;margin:14px 0}.section-title{font-size:25px;margin:34px 0 9px}.muted{color:#617465;font-size:13px}.compare{border:1px solid #d6dccb;background:#ede9dc;padding:17px;border-radius:4px;margin-top:18px}.compare p{font-size:13px;margin-top:0}.all{border-top:1px solid #d6dccb;margin-top:25px;padding-top:16px}.all summary{cursor:pointer;font-size:13px;margin-bottom:14px}.credit{font-size:12px;color:#617465;border-top:1px solid #d6dccb;margin-top:25px;padding-top:15px}@media(max-width:700px){.cards{grid-template-columns:1fr}h1{font-size:31px}.desc{min-height:0}}@media(max-width:420px){main{padding:23px 16px 40px}h1{font-size:28px}.stamp{font-size:9px}.controls{align-items:flex-start}}
</style></head><body><main><header><span class="brand">해체해라</span><span class="stamp">SOUND STUDY 05 / 2026.10.08</span></header><h1>마이크는 짧게.<br>응원과 조롱은 다르게.</h1><p class="intro">중계진은 짧은 켜짐 소리로 바꾸고,<br>우리 관객의 우울함과 상대 치어리더의 조롱을 새로 만들었습니다.</p><div class="choices">선택 완료: 홈런 관중 환호 4초 · 보내주신 헛스윙 소리<br>게임에는 아직 적용하지 않았습니다.</div><div class="controls"><span class="now" id="now" aria-live="polite">재생 버튼을 눌러 비교해 보세요.</span><button id="stop">모두 정지</button></div><section class="mix"><p><strong>이번에 만든 세 가지 소리</strong><br><small>마이크 ON → 우리 관객 우울 → 상대 치어리더 조롱 · 11.72초</small></p>'''
html+=player('00-new-three','새 시안 세 가지 이어 듣기')+'</section><section class="cards">'
html+=''.join(card(*x) for x in cards)+'</section>'
html+='<h2 class="section-title">타격은 더 짧고 경쾌하게, 딱!</h2><p class="muted">배트가 맞는 소리입니다. 홈런 직후 관중 환호와는 따로 구분했습니다.</p><section class="cards">'
html+=card('06-bat-crisp','일반 타격','짧게 딱!','0.25초 · 새 시안','길게 퍼지는 잡음을 줄이고 나무의 충격을 앞쪽에 모았습니다.','#97734c')
html+=card('07-homerun-bat-crisp','홈런 타격','더 선명하게 딱!','0.29초 · 새 시안','일반 타격보다 조금 더 높은 나무 울림으로 구분했습니다.','#b0744c')
html+='</section><section class="compare"><p><strong>타격음 수정 전후</strong><br>일반 이전 → 새 일반 → 홈런 이전 → 새 홈런 · 3.74초</p>'+player('00-bat-before-after','타격음 수정 전후 비교')+'</section>'
html+='<details class="all"><summary>다섯 등장 상황을 순서대로 듣기 · 23.02초</summary><p class="muted">중계진 → 상대 관객 → 우리 관객 → 우리 치어리더 → 상대 치어리더</p>'+player('00-all-roles','다섯 상황 전체 이어 듣기')+'</details>'
html+='''<footer class="credit">스트라이크·아웃·불꽃놀이 시안은 계속 보류입니다.<br>새 BGM 악기 음색: <a href="https://github.com/mrbumpy409/GeneralUser-GS">S. Christian Collins / GeneralUser GS</a>. 마이크·타격은 합성 시안입니다. <a href="README.md">제작 설명·선택 상태</a></footer></main><script>
const audios=[...document.querySelectorAll('audio')],status=document.querySelector('#now');
for(const a of audios){a.volume=.65;a.addEventListener('play',()=>{for(const b of audios)if(a!==b)b.pause();status.textContent='재생 중 · '+a.getAttribute('aria-label')});a.addEventListener('ended',()=>status.textContent='재생 완료 · '+a.getAttribute('aria-label'));a.addEventListener('error',()=>status.textContent='오디오 파일을 불러오지 못했습니다. audio 폴더를 확인해 주세요.');}
document.querySelector('#stop').addEventListener('click',()=>{for(const a of audios){a.pause();a.currentTime=0}status.textContent='모든 소리를 정지했습니다.'});
</script></body></html>'''
(root/'index.html').write_text(html,encoding='utf-8',newline='\n')

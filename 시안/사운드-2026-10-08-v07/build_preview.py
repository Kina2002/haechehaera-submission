"""Standalone v07 draft player; no game changes."""
from pathlib import Path
from html import escape
import json
import re

root=Path(__file__).resolve().parent
old=(root.parent/'사운드-2026-10-08-v06/index.html').read_text(encoding='utf-8')
style=re.search(r'<style>(.*?)</style>',old,re.S).group(1)
script=re.search(r'<script>(.*?)</script>',old,re.S).group(1)
tracks={x['id']:x for x in json.loads((root/'audio-checks.json').read_text(encoding='utf-8'))['tracks']}

def seconds(key):
    return f"{tracks[key]['seconds']:.2f}".rstrip('0').rstrip('.')+'초'

def player(key,label):
    return f'<audio controls preload="metadata" aria-label="{escape(label)}" src="audio/{key}.wav"></audio><div class="links"><a href="audio/{key}.mp3" download>MP3</a><a href="audio/{key}.wav" download>WAV</a></div>'

def card(role,title,desc,key,color,comparison=None):
    s=f'<article class="card" style="--accent:{color}"><p class="role">{role}</p><h2>{title}</h2><span class="tag">{seconds(key)}</span><p class="desc">{desc}</p>'+player(key,role+' · '+title)
    if comparison:
        key,label=comparison
        s+='<details class="all"><summary>이전 소리와 비교</summary><p class="muted">'+label+'</p>'+player(key,label)+'</details>'
    return s+'</article>'

body='''<header><span class="brand">해체해라</span><span class="stamp">SOUND STUDY 07 / 2026.10.08</span></header><h1>아, 아…<br>어머, 또요↗?</h1><p class="intro">중계진은 에코가 들어간 마이크 테스트.<br>상대 치어리더는 트럼펫 끝음을 위로 올렸습니다.</p><div class="choices">이번 수정도 시안이며 게임에는 적용하지 않았습니다.<br>타격음과 기존 관객·우리 치어리더 음악은 그대로 유지했습니다.</div><div class="controls"><span class="now" id="now" aria-live="polite">이번 수정본 두 가지를 먼저 들어보세요.</span><button id="stop">모두 정지</button></div><section class="mix"><p><strong>이번 수정본 이어 듣기</strong><br><small>에코 아, 아 → 끝음 올린 트럼펫 · '''+seconds('00-revised-all')+'</small></p>'
body+=player('00-revised-all','이번 수정본 두 가지')+'</section><section class="cards">'
body+=card('중계진 · 마이크 테스트','아, 아…','합성 남성 목소리로 두 번 발성하고, 뒤에 짧게 반복되는 에코를 붙였습니다.','01-commentary-mic-aa','#527c84',('00-mic-before-after','이전 우웅 → 에코가 들어간 아, 아'))
body+=card('상대 치어리더 → 우리 팀 조롱','어머, 또요↗?','기존 트럼펫의 앞부분은 유지하고 마지막 두 음과 끝음의 꺾임을 위로 올렸습니다.','05-rival-cheer-rising','#ab6578',('00-trumpet-before-after','이전: 끝음 내림 → 새 시안: 끝음 올림'))
body+='</section><details class="all"><summary>유지한 타격음·관객·우리 치어리더 음악</summary><section class="cards">'
body+=card('일반 타격','더 크게 딱!','이전 v06 파일 그대로입니다.','06-bat-louder','#97734c')
body+=card('홈런 타격','더 크게 딱!','이전 v06 파일 그대로입니다.','07-homerun-bat-louder','#b0744c')
body+=card('상대 관객 → 우리 팀 조롱','관중석 한마디','익살스러운 오르간 음악입니다.','02-rival-fans-tease','#aa8440')
body+=card('우리 관객 → 우울한 반응','또 놓쳤네…','클라리넷과 전자 피아노 음악입니다.','03-home-fans-sad','#688296')
body+=card('우리 치어리더 → 우리 팀 응원','다 같이 박수!','우리 팀이 잘했을 때의 응원 음악입니다.','04-home-cheer-support','#648748')
body+='</section></details><footer class="credit">기본 음량 65%. 홈런 관중 환호·헛스윙·투구 소리는 선택 완료·미적용입니다.<br>스트라이크·아웃·불꽃놀이는 계속 보류입니다.<br>목소리는 음성 합성, 음악은 편곡 시안입니다. <a href="README.md">제작 방식·출처·검사</a></footer>'
html='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>해체해라 · 에코 아아와 끝음 올린 트럼펫</title><style>'+style+'</style></head><body><main>'+body+'</main><script>'+script+'</script></body></html>'
(root/'index.html').write_text(html,encoding='utf-8',newline='\n')

"""Standalone v06 audio player; carries forward established page styling."""
from pathlib import Path
from html import escape
import re

root=Path(__file__).resolve().parent
old=(root.parent/'사운드-2026-10-08-v05/index.html').read_text(encoding='utf-8')
style=re.search(r'<style>(.*?)</style>',old,re.S).group(1)
script=re.search(r'<script>(.*?)</script>',old,re.S).group(1)
def player(key,label):
    return f'<audio controls preload="metadata" aria-label="{escape(label)}" src="audio/{key}.wav"></audio><div class="links"><a href="audio/{key}.mp3" download>MP3</a><a href="audio/{key}.wav" download>WAV</a></div>'
def card(role,title,tag,desc,key,color,comparison=None):
    s=f'<article class="card" style="--accent:{color}"><p class="role">{role}</p><h2>{title}</h2><span class="tag">{tag}</span><p class="desc">{desc}</p>'+player(key,role+' · '+title)
    if comparison:
        key,label= comparison
        s+='<details class="all"><summary>이전 소리와 비교</summary><p class="muted">'+label+'</p>'+player(key,label)+'</details>'
    return s+'</article>'
body='''<header><span class="brand">해체해라</span><span class="stamp">SOUND STUDY 06 / 2026.10.08</span></header><h1>딸깍, 우웅.<br>딱! 그리고 얄미운 트럼펫.</h1><p class="intro">마이크에는 켜진 뒤 울림을, 타격에는 더 큰 소리를.<br>상대 치어리더는 트럼펫을 앞세워 다시 편곡했습니다.</p><div class="choices">선택 완료: 홈런 관중 환호 · 헛스윙 · 투구 소리<br>이번 수정도 시안이며 게임에는 적용하지 않았습니다.</div><div class="controls"><span class="now" id="now" aria-live="polite">같은 재생 음량에서 이전 소리와 비교해 보세요.</span><button id="stop">모두 정지</button></div><section class="mix"><p><strong>이번 수정본 이어 듣기</strong><br><small>마이크 → 일반 타격 → 홈런 타격 → 트럼펫 · 8.69초</small></p>'''
body+=player('00-revised-all','이번 수정본 네 가지')+'</section><section class="cards">'
body+=card('중계진','딸깍, 우웅','1.2초 · 수정 시안','마이크가 켜진 뒤 낮은 울림이 올라왔다 부드럽게 사라집니다.','01-commentary-mic-hum','#527c84',('00-mic-before-after','이전 클릭 → 클릭과 우웅'))
body+=card('상대 치어리더 → 우리 팀 조롱','어머, 또요?','5초 · 트럼펫 편곡','트럼펫을 짧게 반복하고 끝음을 아래로 꺾어, 더 얄미운 느낌을 노렸습니다.','05-rival-cheer-trumpet','#ab6578',('00-trumpet-before-after','이전 편곡 → 새 트럼펫 편곡'))
body+=card('일반 타격','더 크게 딱!','0.25초 · 충격 평균 진폭 +5.17dB','길이는 그대로 두고 타격이 더 크게 들리도록 조정했습니다.','06-bat-louder','#97734c')
body+=card('홈런 타격','더 크게 딱!','0.29초 · 충격 평균 진폭 +5.36dB','홈런의 높은 나무 울림을 유지하면서 소리를 키웠습니다.','07-homerun-bat-louder','#b0744c')
body+='</section><section class="compare"><p><strong>타격음 음량 비교</strong><br>이전 일반 → 큰 일반 → 이전 홈런 → 큰 홈런 · 3.03초</p>'+player('00-bat-before-after','타격음 음량 전후 비교')+'</section>'
body+='<details class="all"><summary>유지한 관객·우리 치어리더 음악</summary><section class="cards">'
body+=card('상대 관객 → 우리 팀 조롱','관중석 한마디','5초 · 그대로 유지','익살스러운 오르간 음악입니다.','02-rival-fans-tease','#aa8440')
body+=card('우리 관객 → 우울한 반응','또 놓쳤네…','5초 · 그대로 유지','클라리넷과 전자 피아노 음악입니다.','03-home-fans-sad','#688296')
body+=card('우리 치어리더 → 우리 팀 응원','다 같이 박수!','5초 · 그대로 유지','우리 팀이 잘했을 때의 응원 음악입니다.','04-home-cheer-support','#648748')
body+='</section></details><footer class="credit">기본 재생 음량은 이전과 같은 65%입니다. 스트라이크·아웃·불꽃놀이는 계속 보류입니다.<br>새 소리는 합성·편곡 시안입니다. <a href="README.md">제작 방식·검사·선택 상태</a></footer>'
html='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>해체해라 · 마이크 울림·큰 타격·트럼펫 시안</title><style>'+style+'</style></head><body><main>'+body+'</main><script>'+script+'</script></body></html>'
(root/'index.html').write_text(html,encoding='utf-8',newline='\n')

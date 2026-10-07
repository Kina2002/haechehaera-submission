"""Two versions of three real recorded umpire calls; independent of the game."""
from pathlib import Path
from html import escape
import json
import re

root=Path(__file__).resolve().parent
old=(root.parent/'사운드-2026-10-08-v07/index.html').read_text(encoding='utf-8')
style=re.search(r'<style>(.*?)</style>',old,re.S).group(1)
script=re.search(r'<script>(.*?)</script>',old,re.S).group(1)
tracks={x['id']:x for x in json.loads((root/'audio-checks.json').read_text(encoding='utf-8'))['tracks']}

def player(key,label):
    return f'<audio controls preload="metadata" aria-label="{escape(label)}" src="audio/{key}.wav"></audio><div class="links"><a href="audio/{key}.mp3" download>MP3</a><a href="audio/{key}.wav" download>WAV</a></div>'

def duration(key):
    return f"{tracks[key]['seconds']:.2f}".rstrip('0').rstrip('.')+'초'

body='''<header><span class="brand">해체해라</span><span class="stamp">SOUND STUDY 08 / 2026.10.08</span></header><h1>스트라이크!<br>아웃! 세이프!</h1><p class="intro">성우가 직접 외친 영어 판정 콜을 짧게 편집했습니다.<br>A는 원래 발성을 살리고, B는 낮은 울림과 힘을 보강했습니다.</p><div class="choices">세 가지 모두 새 시안 · 게임 미적용<br>같은 판정을 A → B 순서로 비교해 보세요.</div><div class="controls"><span class="now" id="now" aria-live="polite">B 세 가지 이어 듣기로 먼저 확인해 보세요.</span><button id="stop">모두 정지</button></div><section class="mix"><p><strong>B · 굵고 힘 있게 이어 듣기</strong><br><small>Strike! → Out! → Safe! · '''+duration('00-b-three')+'</small></p>'+player('00-b-three','B 판정 세 가지 이어 듣기')+'</section><details class="all"><summary>A · 원래 발성으로 세 가지 듣기</summary>'+player('00-a-three','A 판정 세 가지 이어 듣기')+'</details>'
for key,title,desc in [('strike','스트라이크!','짧고 거칠게 치고 나오는 판정 콜.'),('out','아웃!','굵게 뻗어 나가는 판정 콜.'),('safe','세이프!','앞을 분명하게 열고 끝까지 밀어주는 판정 콜.')]:
    body+=f'<section class="compare"><h2>{title}</h2><p>{desc}</p><section class="cards">'
    for version,label,color in [('a','A · 원래 발성','#527c84'),('b','B · 굵고 힘 있게','#97734c')]:
        track=f'{key}-{version}'
        body+=f'<article class="card" style="--accent:{color}"><p class="role">{label}</p><span class="tag">{duration(track)}</span>'+player(track,title+' / '+label)+'</article>'
    body+='</section><details class="all"><summary>A → B 바로 비교</summary>'+player(key+'-ab',title+' A 다음 B')+'</details></section>'
body+='''<footer class="credit">실제 목소리 녹음: <a href="https://freesound.org/people/jcookvoice/sounds/625473/" target="_blank" rel="noopener">jcookvoice · American Baseball The Umpire</a> (CC0). 발췌·음색·음량 편집.<br>기본 재생 음량 65%. 다른 소리의 선택 상태는 그대로입니다.<br><a href="README.md">출처·편집 내용·검사</a></footer>'''
html='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>해체해라 · 심판 목소리 A/B 시안</title><style>'+style+'</style></head><body><main>'+body+'</main><script>'+script+'</script></body></html>'
(root/'index.html').write_text(html,encoding='utf-8',newline='\n')

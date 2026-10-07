"""Safe-reference umpire call audition, without changing the game."""
from pathlib import Path
from html import escape
import json
import re

root=Path(__file__).resolve().parent
old=(root.parent/'사운드-2026-10-08-v08/index.html').read_text(encoding='utf-8')
style=re.search(r'<style>(.*?)</style>',old,re.S).group(1)
style=style.replace('grid-template-columns:repeat(2,1fr)', 'grid-template-columns:repeat(3,1fr)')
style+='\n@media(max-width:900px){.cards{grid-template-columns:1fr}}'
script=re.search(r'<script>(.*?)</script>',old,re.S).group(1)
tracks={x['id']:x for x in json.loads((root/'audio-checks.json').read_text(encoding='utf-8'))['tracks']}

def seconds(key):
    return f"{tracks[key]['seconds']:.2f}".rstrip('0').rstrip('.')+'초'

def player(key,label):
    return f'<audio controls preload="metadata" aria-label="{escape(label)}" src="audio/{key}.wav"></audio><div class="links"><a href="audio/{key}.mp3" download>MP3</a><a href="audio/{key}.wav" download>WAV</a></div>'

def card(title,key,desc,color,comparison=None):
    text=f'<article class="card" style="--accent:{color}"><h2>{title}</h2><span class="tag">{seconds(key)}</span><p class="desc">{desc}</p>'+player(key,title)
    if comparison:
        text+='<details class="all"><summary>이전 소리 → 이번 수정</summary>'+player(comparison,title+' 이전 다음 수정')+'</details>'
    return text+'</article>'

body='''<header><span class="brand">해체해라</span><span class="stamp">SOUND STUDY 09 / 2026.10.08</span></header><h1>세이프의 느낌으로.<br>스트라이크! 아웃!</h1><p class="intro">세이프를 참고 음성으로 넣어<br>스트라이크와 아웃을 새로 생성한 시안입니다.</p><div class="choices">세이프 A·B 파일은 그대로 보관했습니다.<br>스트라이크·아웃만 새 시안 · 게임 미적용</div><div class="controls"><span class="now" id="now" aria-live="polite">세이프를 먼저 듣고 새 판정과 비교해 보세요.</span><button id="stop">모두 정지</button></div><section class="mix"><p><strong>기준 → 새 소리 이어 듣기</strong><br><small>세이프 → 스트라이크 → 아웃 · '''+seconds('00-safe-strike-out')+'</small></p>'+player('00-safe-strike-out','세이프 다음 새 스트라이크와 아웃')+'</section><section class="cards">'
body+=card('세이프 · 기준 그대로','safe-b','이전 화면의 기본 B입니다. 음원은 수정하지 않았습니다.','#648748')
body+=card('새 스트라이크!','strike-new','세이프의 목소리를 참고한 AI 합성. Strike! 한 단어 전체를 다시 만들었습니다.','#527c84','strike-before-after')
body+=card('새 아웃!','out-new','같은 기준으로 Out!을 새로 생성했습니다. 세이프와 힘·음색을 비교해 보세요.','#97734c','out-before-after')
body+='</section><details class="all"><summary>세이프 A · 원래 발성도 그대로</summary>'+player('safe-a','세이프 A 원래 발성')+'</details><footer class="credit">세이프: 실제 녹음 · 새 스트라이크/아웃: AI 합성 (Chatterbox-Nano).<br>참고 음원: <a href="https://freesound.org/people/jcookvoice/sounds/625473/" target="_blank" rel="noopener">jcookvoice · American Baseball The Umpire</a> (CC0).<br>기본 음량 65%. <a href="README.md">제작 내용·출처·검사</a></footer>'
html='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>해체해라 · 세이프 기준 스트라이크·아웃</title><style>'+style+'</style></head><body><main>'+body+'</main><script>'+script+'</script></body></html>'
(root/'index.html').write_text(html,encoding='utf-8',newline='\n')

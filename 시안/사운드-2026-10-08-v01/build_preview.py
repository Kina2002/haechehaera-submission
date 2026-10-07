"""Build a standalone audition page and a Markdown cue sheet from rendered drafts."""
import hashlib
import html
import json
from pathlib import Path
import wave
import numpy as np

ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / 'audio/manifest.json').read_text(encoding='utf-8'))
tracks = manifest['tracks']


def duration(seconds):
    return f'{seconds:.1f}초'


def player(t, loop=False):
    track_id = html.escape(t['id'])
    return (f'<audio controls preload="metadata" id="{track_id}" aria-label="{html.escape(t["title"])} 재생" '
            f'src="audio/{t["wav"]}"></audio>'
            + (f'<label class="loop"><input type="checkbox" data-loop="{track_id}"> 반복 듣기</label>' if loop else '')
            + f'<div class="downloads"><a href="audio/{t["mp3"]}" download>MP3 받기 ↗</a>'
            f'<a href="audio/{t["wav"]}" download>WAV 받기 ↗</a></div>')


bgm = ''.join(f'<article class="track"><div class="track-number">0{i+1} / BGM</div>'
              f'<h3>{html.escape(t["title"])}</h3><p class="description">{html.escape(t["context"])}</p>'
              f'<div class="tags"><span>{duration(t["seconds"])}</span><span>{t["bpm"]} BPM</span><span>반복형</span></div>'
              f'{player(t,True)}</article>' for i,t in enumerate(tracks[:3]))
sfx = ''.join(f'<article class="cue"><div class="cue-info"><h3><span>{i+1:02}</span> {html.escape(t["title"])}</h3>'
              f'<p>{html.escape(t["context"])}</p></div><div class="cue-player">{player(t)}</div></article>'
              for i,t in enumerate(tracks[3:-1]))
sampler = tracks[-1]
page = '''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>해체해라 · 사운드 시안 01</title><style>
:root{color-scheme:light;--ink:#173d33;--muted:#587368;--paper:#f7f3e8;--line:#d4dcce;--lime:#dbe9ad}
*{box-sizing:border-box}body{margin:0;color:var(--ink);background:var(--paper);font:15px/1.65 system-ui,'Malgun Gothic',sans-serif}
main{max-width:1150px;margin:auto;padding:38px 30px 70px}header{display:flex;justify-content:space-between;align-items:center;gap:20px;border-bottom:1px solid var(--ink);padding-bottom:17px}.brand{font-weight:900;letter-spacing:-1px;font-size:21px}.stamp{font-size:12px;letter-spacing:2px}
.hero{display:grid;grid-template-columns:1.1fr 1fr;gap:55px;padding:52px 0 35px;align-items:center}.eyebrow{font-size:12px;letter-spacing:2px;font-weight:700}h1{font-size:48px;line-height:1.2;letter-spacing:-2px;margin:15px 0 20px}h1 em{font-style:normal;color:#7c913b}.intro{max-width:490px;color:var(--muted);line-height:1.9}.badge{display:inline-block;font-size:12px;border:1px solid #a4b890;border-radius:20px;padding:3px 10px;margin-top:6px;background:#eaf0db}
.sampler{background:var(--ink);color:var(--paper);padding:28px;border-radius:6px;position:relative;overflow:hidden}.sampler h2{margin:10px 0;font-size:23px;letter-spacing:-.5px}.sampler p{color:#c6d4bc;font-size:13px;margin:8px 0 17px}.sampler .downloads a{color:#d9e6b9}.wave{display:flex;gap:5px;height:35px;align-items:center;margin-bottom:24px;opacity:.75}.wave i{display:block;width:5px;height:var(--h);background:var(--lime);border-radius:4px}
audio{width:100%;height:38px;display:block}button{font:inherit;cursor:pointer;border:1px solid var(--ink);color:var(--ink);background:transparent;border-radius:4px;padding:7px 12px}button:hover{background:var(--lime)}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #e8913c;outline-offset:4px}
.toolbar{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:13px 0;border-bottom:1px solid var(--line);font-size:13px}.volume{display:flex;gap:10px;align-items:center}.volume input{width:110px;accent-color:var(--ink)}.now{color:var(--muted);flex:1}.section-title{display:flex;justify-content:space-between;gap:20px;align-items:baseline;margin:32px 0 17px}.section-title h2{font-size:21px;margin:0}.section-title span{color:var(--muted);font-size:12px}
.bgms{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.track{padding:23px;background:#fffdf6;border:1px solid var(--line);border-top:4px solid var(--ink);border-radius:4px}.track:nth-child(2){border-top-color:#929f55}.track:nth-child(3){border-top-color:#bb7744}.track-number{font-size:11px;color:var(--muted);letter-spacing:1.7px}.track h3{font-size:21px;margin:9px 0 13px;letter-spacing:-.6px}.description{font-size:13px;color:var(--muted);min-height:48px;margin:0 0 15px}.tags{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 17px}.tags span{border:1px solid var(--line);font-size:11px;padding:2px 7px;border-radius:3px}.loop{display:flex;gap:5px;align-items:center;font-size:12px;margin-top:13px}.loop input{accent-color:var(--ink)}.downloads{display:flex;gap:17px;margin-top:13px;font-size:11px}.downloads a{color:var(--muted);text-decoration:none}.downloads a:hover{text-decoration:underline}
.cue{display:grid;grid-template-columns:1fr 380px;gap:35px;align-items:center;padding:19px 8px;border-top:1px solid var(--line)}.cue h3{font-size:15px;margin:0 0 4px}.cue h3 span{font:12px monospace;color:#80937c;margin-right:14px}.cue p{color:var(--muted);font-size:12px;margin:0 0 0 36px}.cue .downloads{margin:7px 0 0 14px}.note{margin-top:28px;padding:18px 20px;border-left:3px solid #a5b77b;color:var(--muted);font-size:13px;background:#edf0e1}footer{margin-top:36px;border-top:1px solid var(--line);padding-top:17px;display:flex;justify-content:space-between;color:var(--muted);font-size:12px}footer a{color:inherit}
@media(max-width:850px){.hero{gap:25px}h1{font-size:38px}.bgms{grid-template-columns:1fr}.description{min-height:0}.cue{grid-template-columns:1fr 300px;gap:15px}}
@media(max-width:600px){main{padding:20px 18px 45px}.hero{grid-template-columns:1fr;padding-top:30px;gap:22px}h1{font-size:39px}.toolbar{flex-wrap:wrap}.now{flex-basis:100%}.cue{grid-template-columns:1fr;gap:12px;padding:18px 0}.cue p{margin-left:0}.cue h3 span{margin-right:8px}.section-title{display:block}.stamp{font-size:10px;letter-spacing:1px}footer{display:block}}
</style></head><body><main>
<header><div class="brand">해체해라</div><div class="stamp">SOUND STUDY / 2026.10.08</div></header>
<section class="hero"><div><div class="eyebrow">진지한 야구, 이상한 선수들.</div><h1>구장에 소리가<br><em>생긴다면.</em></h1><p class="intro">경쾌한 경기장 오르간, 다정한 구단의 오후,<br>그리고 9회말의 긴장감. 세 가지 분위기를 들어보세요.</p><span class="badge">시안 01 · 게임 미적용</span></div>
<div class="sampler"><div class="wave" aria-hidden="true">WAVE</div><div class="eyebrow">QUICK LISTEN / 1:12</div><h2>전체 시안 이어 듣기</h2><p>BGM 세 곡을 12초씩, 이어서 효과음 14종을 들려드립니다.</p>SAMPLER</div></section>
<div class="toolbar"><span class="now" id="now" aria-live="polite">듣고 싶은 곡의 재생 버튼을 눌러 주세요.</span><label class="volume">음량 <input type="range" id="volume" min="0" max="100" value="65" aria-label="전체 음량"><output id="volume-label">65%</output></label><button id="stop">모두 정지</button></div>
<div class="section-title"><h2>배경음악 · 3가지 분위기</h2><span>약 30초 / 반복해서 비교해 보세요</span></div><section class="bgms">BGMS</section>
<div class="section-title"><h2>상황별 효과음 · 14종</h2><span>플레이 순간부터 경기 뒤 이야기까지</span></div><section>SFXS</section>
<div class="note">오르간·전자 피아노·전자음을 직접 조합한 오리지널 시안입니다. 음성·실제 관중 녹음은 포함하지 않았습니다. 선택한 분위기를 바탕으로 길이와 악기, 강도를 다듬을 수 있습니다.</div>
<footer><span>HAECHEHAERA / AUDIO CONCEPT 01</span><a href="README.md">시안 설명과 전체 재생 순서 ↗</a></footer>
</main><script>
const labels=LABELS;
const audios=[...document.querySelectorAll('audio')];
const now=document.querySelector('#now');
for(const a of audios){a.volume=.65;a.addEventListener('play',()=>{for(const other of audios)if(other!==a)other.pause();now.textContent='재생 중 · '+labels[a.id];});a.addEventListener('ended',()=>{now.textContent='재생 완료 · '+labels[a.id];});a.addEventListener('error',()=>{now.textContent='파일을 열 수 없습니다. 시안 폴더의 audio 폴더를 함께 보관해 주세요.';});}
document.querySelector('#volume').addEventListener('input',e=>{for(const a of audios)a.volume=e.target.value/100;document.querySelector('#volume-label').value=e.target.value+'%';});
document.querySelector('#stop').addEventListener('click',()=>{for(const a of audios){a.pause();a.currentTime=0;}now.textContent='모든 소리를 정지했습니다.';});
for(const el of document.querySelectorAll('[data-loop]'))el.addEventListener('change',()=>{document.getElementById(el.dataset.loop).loop=el.checked;});
</script></body></html>'''
page=page.replace('WAVE',''.join(f'<i style="--h:{h}px"></i>' for h in [8,14,22,12,31,20,35,14,24,30,11,18,32,24,10,29,19,34,15,25,9,20,30,17,25,11,32,23,14,27,18,8,21,30,15]))
page=page.replace('SAMPLER',player(sampler)).replace('BGMS',bgm).replace('SFXS',sfx)
page=page.replace('LABELS',json.dumps({t['id']:t['title'] for t in tracks},ensure_ascii=False))
(ROOT/'index.html').write_text(page,encoding='utf-8',newline='\n')

lines=['# 해체해라 사운드 시안 01','', '**2026-10-08 · 시안만 제작 · 게임 미적용**','',
       '[개별 재생 화면](index.html) · [전체 이어 듣기 MP3](audio/00-listen-all.mp3)','',
       '## 제작 방향','',
       '도트 야구게임에 맞춘 경기장 오르간·레트로 전자음과 따뜻한 전자 피아노입니다. 직접 작성한 멜로디·화성·리듬과 합성 음색을 사용했습니다. 기존 곡, 음원 샘플, 사람 목소리, 관중 녹음을 사용하지 않았습니다. 음악 생성 AI 서비스로 만든 완성 음원이 아니라 소리의 방향을 고르는 전자음 시안입니다.','',
       '게임 코드·실행 파일·자산 목록과 공개 사이트에는 연결하지 않았습니다. 이 폴더의 파일만 재생합니다.','',
       '## BGM','', '| 제목 | 사용 상황 | 길이 / 템포 | 듣기 |','| --- | --- | --- | --- |']
for t in tracks[:3]:
    lines.append(f'| {t["title"]} | {t["context"]} | {duration(t["seconds"])} / {t["bpm"]} BPM | [MP3](audio/{t["mp3"]}) · [WAV](audio/{t["wav"]}) |')
lines+=['','## 효과음','', '| 제목 | 사용 상황 | 듣기 |','| --- | --- | --- |']
for t in tracks[3:-1]:
    lines.append(f'| {t["title"]} | {t["context"]} | [MP3](audio/{t["mp3"]}) · [WAV](audio/{t["wav"]}) |')
lines+=['','## 전체 이어 듣기 순서','', 'BGM은 각 12초씩 발췌했습니다. 곡 사이와 효과음 사이에는 0.65초의 간격이 있습니다.','']
for t in manifest['sampler_timeline']:
    s=t['at_seconds'];lines.append(f'- {int(s)//60}:{s%60:04.1f} — {t["title"]}')
lines+=['','## 확인할 포인트','',
        '- 메인 BGM이 게임의 유쾌한 분위기와 어울리는지, 반복하면 피로하지 않은지 봅니다.',
        '- 따뜻한 BGM과 긴장 BGM이 장면에 맞게 다른 느낌인지 비교합니다.',
        '- 타격·포구·판정음이 충분히 구분되는지, 홈런·승리·업적 축하음의 크기와 길이가 적당한지 확인합니다.',
        '- 이번에는 관중 함성·심판의 실제 음성과 이벤트별 긴 음악은 만들지 않았습니다. 필요하면 방향 선택 후 별도 시안으로 확장할 수 있습니다.','',
        '## 파일과 검증','',
        '- 원본: 44.1 kHz / 스테레오 / 16-bit PCM WAV. 듣기·공유용: MP3 192 kbps.',
        '- BGM은 박자에 맞춘 정확한 마디 길이로 만들고 반복 구간에 잔향을 연결했습니다. 반복용은 WAV를 사용합니다. MP3는 인코더 패딩에 따른 틈이 생길 수 있습니다.',
        '- 18개 WAV의 형식·길이·무음 여부·최대 진폭·시작/끝 경계와 MP3 파일 생성 여부를 검사했습니다. 청감과 취향 평가는 사용자 확인이 필요합니다.',
        '- 음량 수치는 RMS와 sample peak입니다. 방송용 LUFS/true peak 마스터링 검사를 완료했다는 의미는 아닙니다.',
        '- 재생 화면은 자동으로 소리를 내지 않습니다. 한 번에 한 파일만 재생하며 전체 음량과 모두 정지를 지원합니다.',
        '- 생성 원본: `make_audio.py` (Python + numpy, MP3는 lameenc). 같은 난수 시드로 재현할 수 있습니다. `--out`에는 존재하지 않는 새 경로를 지정합니다.',
        '- 재생 화면/문서 생성: `build_preview.py`. 품질 측정 결과: `audio-checks.json`.','']
(ROOT/'README.md').write_text('\n'.join(lines),encoding='utf-8',newline='\n')

checks=[]
for t in tracks:
    path=ROOT/'audio'/t['wav']
    with wave.open(str(path),'rb') as w:
        assert (w.getnchannels(),w.getsampwidth(),w.getframerate())==(2,2,44100)
        raw=w.readframes(w.getnframes())
        a=np.frombuffer(raw,dtype='<i2').reshape(-1,2).astype(float)/32768
    assert abs(len(a)/44100-t['seconds'])<.001
    assert np.isfinite(a).all() and .005<np.max(np.abs(a))<.99
    assert np.max(np.abs(a[0]))==0 and np.max(np.abs(a[-1]))==0
    assert np.count_nonzero(a)>len(a)*.1
    mp3=ROOT/'audio'/t['mp3'];assert mp3.stat().st_size>1000
    checks.append({'file':t['wav'],'passed':True,'frames':len(a),
                   'peak_dbfs':t['peak_dbfs'],'rms_dbfs':t['rms_dbfs'],
                   'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
(ROOT/'audio-checks.json').write_text(json.dumps({'passed':len(checks),'failed':0,'checks':checks},ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(f'Created preview and cue sheet; {len(checks)} audio files passed format, level and boundary checks.')

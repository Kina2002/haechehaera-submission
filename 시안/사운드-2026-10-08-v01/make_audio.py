"""Original synthesized sound concepts for Haechehaera; never edits game files.

Requires numpy; optional lameenc writes listening MP3s alongside loop-safe WAVs.
Usage: python make_audio.py --out <new output folder> [--encoder-dir <folder>]
"""
from __future__ import annotations
import argparse
import json
import math
from pathlib import Path
import sys
import wave
import numpy as np

SR = 44100
RNG = np.random.default_rng(20261008)


def freq(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def env(n, attack=.008, release=.055, decay=0):
    t = np.arange(n) / SR
    e = np.ones(n) if not decay else np.exp(-t * decay)
    a, r = min(n, int(attack * SR)), min(n, int(release * SR))
    if a:
        e[:a] *= np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if r:
        e[-r:] *= np.sin(np.linspace(np.pi / 2, 0, r)) ** 2
    return e


def tone(midi, duration, voice='organ'):
    n = max(2, round(duration * SR))
    t = np.arange(n) / SR
    f = freq(midi)
    phase = 2 * np.pi * f * t
    if voice == 'organ':
        y = sum(a * np.sin(phase * h) for h, a in [(1, 1), (2, .43), (3, .24), (4, .08)])
        e = env(n, .009, .065)
    elif voice == 'lead':
        phase += .011 * np.sin(2 * np.pi * 5.1 * t)
        y = sum(np.sin(phase * h) / h ** 1.45 for h in (1, 3, 5, 7) if f * h < SR / 2)
        e = env(n, .005, .045, .55)
    elif voice == 'bass':
        y = np.sin(phase) + .29 * np.sin(phase * 2) + .09 * np.sin(phase * 3)
        e = env(n, .005, .045, 1.9)
    elif voice == 'bell':
        y = np.sin(phase) + .3 * np.sin(phase * 2) * np.exp(-t * 8)
        y += .08 * np.sin(phase * 4) * np.exp(-t * 13)
        e = env(n, .003, .09, 4.5)
    elif voice == 'epiano':
        y = np.sin(phase + 1.2 * np.sin(phase * 2) * np.exp(-t * 7))
        y += .15 * np.sin(phase * .5) * np.exp(-t * 2)
        e = env(n, .008, .13, 2.0)
    elif voice == 'pad':
        y = np.sin(phase) + .24 * np.sin(phase * 2) + .12 * np.sin(phase * 3)
        e = env(n, .10, .23)
    else:
        raise ValueError(voice)
    return (y * e).astype(np.float32)


def noise(duration, mode='high'):
    x = RNG.standard_normal(round(duration * SR)).astype(np.float32)
    if mode == 'high':
        x = x - np.convolve(x, np.ones(9) / 9, 'same')
    elif mode == 'low':
        x = np.convolve(x, np.ones(31) / 31, 'same')
    return x


def percussion(kind, strength=1):
    if kind == 'kick':
        t = np.arange(round(.28 * SR)) / SR
        phase = 2 * np.pi * (48 * t + 105 * .023 * (1 - np.exp(-t / .023)))
        y = np.sin(phase) * np.exp(-t * 19)
        y += noise(.28) * np.exp(-t * 260) * .055
    elif kind == 'snare':
        t = np.arange(round(.18 * SR)) / SR
        y = noise(.18) * .4 * np.exp(-t * 29)
        y += (.25 * np.sin(2 * np.pi * 180 * t) + .13 * np.sin(2 * np.pi * 310 * t)) * np.exp(-t * 36)
    elif kind == 'hat':
        t = np.arange(round(.075 * SR)) / SR
        y = noise(.075) * np.exp(-t * 75) * .20
    elif kind == 'brush':
        t = np.arange(round(.20 * SR)) / SR
        y = noise(.20) * np.exp(-t * 20) * .12
    else:
        raise ValueError(kind)
    return (y * env(len(y), .001, .01) * strength).astype(np.float32)


def add(dst, signal, start, gain=1, pan=0, loop=False):
    start = round(start * SR)
    if signal.ndim == 1:
        angle = (pan + 1) * np.pi / 4
        signal = np.column_stack((signal * np.cos(angle), signal * np.sin(angle)))
    signal = signal * gain
    if loop:
        start %= len(dst)
        k = min(len(signal), len(dst) - start)
        dst[start:start+k] += signal[:k]
        if k < len(signal):
            dst[:len(signal)-k] += signal[k:]
    elif start < len(dst):
        k = min(len(signal), len(dst) - start)
        dst[start:start+k] += signal[:k]


def polish(y, loop=False, rms_target=.145):
    y = y.astype(np.float64)
    y -= y.mean(axis=0)
    # Short room reflections; cyclic reflections preserve musical loop tails.
    wet = y.copy()
    for delay, level in [(.063, .055), (.117, .035), (.191, .018)]:
        d = round(delay * SR)
        if loop:
            wet += np.roll(y[:, ::-1], d, axis=0) * level
        else:
            wet[d:] += y[:-d, ::-1] * level
    peak = np.max(np.abs(wet))
    rms = np.sqrt(np.mean(wet ** 2))
    wet *= min(.80 / max(peak, 1e-9), rms_target / max(rms, 1e-9))
    # A 2 ms boundary ramp removes sample discontinuities without a long loop dip.
    ramp = round((.002 if loop else .008) * SR)
    wet[:ramp] *= np.linspace(0, 1, ramp)[:, None]
    wet[-ramp:] *= np.linspace(1, 0, ramp)[:, None]
    return wet.astype(np.float32)


def compose(style):
    if style == 'main':
        bpm, bars = 120, 16
        chords = [[60,64,67,69],[57,60,64,67],[53,57,60,64],[55,59,62,65],
                  [60,64,67,71],[57,60,64,67],[62,65,69,72],[55,59,62,65]] * 2
        roots = [36,33,29,31,36,33,38,31] * 2
        melodies = [[(0,76,.65),(.75,79,.40),(1.5,81,.4),(2,79,.65),(3,76,.35),(3.5,74,.35)],
                    [(0,72,.7),(1,76,.4),(1.75,79,.4),(2.5,76,.8)],
                    [(0,77,.4),(.75,76,.4),(1.5,72,.8),(2.75,69,.8)],
                    [(0,71,.6),(1,74,.4),(1.75,77,.5),(2.5,74,.4),(3.25,71,.4)],
                    [(0,76,.4),(.5,79,.4),(1.25,84,.8),(2.5,83,.4),(3.25,79,.5)],
                    [(0,81,.65),(1,79,.4),(1.75,76,.65),(3,72,.7)],
                    [(0,74,.4),(.75,77,.4),(1.5,81,.7),(2.5,77,.4),(3.25,74,.4)],
                    [(0,74,.4),(.75,71,.4),(1.5,67,.5),(2.5,71,.4),(3.25,74,.45)]]
    elif style == 'club':
        bpm, bars = 92, 12
        chords = [[53,57,60,64],[52,55,60,62],[50,53,57,60],[46,50,53,57],
                  [55,58,62,65],[48,52,55,62],[53,57,60,64],[48,52,55,58],
                  [50,53,57,60],[46,50,53,57],[55,58,62,65],[48,52,55,58]]
        roots = [29,28,26,34,31,24,29,24,26,34,31,24]
        melodies = [[(0,72,1.0),(1.5,76,.8),(3,77,.75)],[(.5,76,.85),(2,72,1.5)],
                    [(0,69,.8),(1.5,72,.75),(3,77,.7)],[(.5,74,1),(2.25,72,1.1)],
                    [(0,70,.8),(1.5,74,1),(3,77,.7)],[(.5,76,.8),(2,74,1.4)],
                    [(0,72,1),(1.5,69,.8),(3,67,.75)],[(.5,70,.8),(2,72,1.4)],
                    [(0,69,1),(1.5,72,.8),(3,76,.7)],[(.5,74,1),(2.25,72,1.1)],
                    [(0,70,.8),(1.5,69,1),(3,67,.7)],[(0,64,1),(1.5,67,.7),(3,70,.7)]]
    else:
        bpm, bars = 136, 16
        chords = [[57,60,64,67],[57,60,64,67],[53,57,60,64],[55,59,62,65],
                  [50,53,57,60],[53,57,60,64],[52,56,59,62],[52,56,59,62]] * 2
        roots = [33,33,29,31,26,29,28,28] * 2
        melodies = [[(0,76,.3),(.75,72,.3),(1.5,69,.3),(2.5,72,.4),(3.25,76,.4)],
                    [(0,79,.7),(1.25,76,.4),(2,72,.4),(3,69,.5)],
                    [(0,77,.3),(.75,76,.3),(1.5,72,.4),(2.5,69,.6)],
                    [(0,74,.6),(1.25,71,.3),(2,67,.6),(3.25,71,.4)],
                    [(0,74,.3),(.75,77,.3),(1.5,81,.6),(2.5,77,.6)],
                    [(0,77,.7),(1.25,76,.3),(2,72,.5),(3,69,.5)],
                    [(0,71,.3),(.75,74,.3),(1.5,76,.5),(2.5,80,.4),(3.25,76,.4)],
                    [(0,74,.5),(1,71,.4),(2,68,.5),(3,71,.5)]]
    beat = 60 / bpm
    audio = np.zeros((round(bars * 4 * beat * SR), 2), np.float32)
    for bar in range(bars):
        offset, chord, root = bar * 4, chords[bar], roots[bar]
        if style == 'club':
            for at, duration in [(0,1.3),(2.5,1.2)]:
                for i, note in enumerate(chord):
                    add(audio, tone(note, duration*beat, 'epiano'), (offset+at+i*.027)*beat, .105, -.35, True)
            for at, note in [(0,root),(2.5,root+7)]:
                add(audio,tone(note,.8*beat,'bass'),(offset+at)*beat,.29,-.08,True)
            for at in [.5,1.5,2.5,3.5]:
                add(audio,percussion('brush',.65),(offset+at)*beat,.5,.30,True)
            for at in [0,2]:
                add(audio,percussion('kick',.4),(offset+at)*beat,.35,0,True)
        else:
            for at in [.5,1.5,2.5,3.5]:
                for note in chord:
                    add(audio,tone(note,.24*beat,'organ'),(offset+at)*beat,.062,-.37,True)
            bass_pattern = [(0,root),(.75,root),(1.5,root+7),(2,root+12),(2.75,root+7),(3.5,root)]
            if style == 'tension':
                bass_pattern = [(i*.5,root+(12 if i%4==3 else 0)) for i in range(8)]
            for at, note in bass_pattern:
                add(audio,tone(note,.34*beat,'bass'),(offset+at)*beat,.30,-.05,True)
            for at in ([0,1.5,2,2.75] if style=='tension' else [0,1.75,2,3.5]):
                add(audio,percussion('kick'),(offset+at)*beat,.30,0,True)
            for at in [1,3]:
                add(audio,percussion('snare'),(offset+at)*beat,.27,.13,True)
            for i in range(8):
                at=i*.5 + (.035 if i%2 else 0)
                add(audio,percussion('hat',.68 if i%2 else 1),(offset+at)*beat,.32,.42,True)
            if bar % 4 == 3:
                for i in range(3):
                    add(audio,percussion('snare',.4+i*.12),(offset+3.25+i*.25)*beat,.2,(-.2+i*.2),True)
            if style == 'tension':
                for i in range(8):
                    add(audio,tone(chord[i%4]+12,.17*beat,'bell'),(offset+i*.5)*beat,.09,.45,True)
        melody = melodies[bar % len(melodies)]
        for at, note, length in melody:
            # The second chorus varies the top-line, retaining a recognizable theme.
            if style=='main' and bar>=8 and bar%4==2:
                note += 12
            voice = 'epiano' if style=='club' else 'lead'
            sound = tone(note, length*beat+.075, voice)
            add(audio,sound,(offset+at)*beat,.21 if style=='club' else .18,.07,True)
            add(audio,sound,(offset+at+.75)*beat,.023,-.45,True)
    return polish(audio,True), bpm, bars


def effect(kind):
    durations={'bat':.70,'glove':.48,'whoosh':.65,'strike':.65,'out':1.1,
               'homerun':3.5,'win':4.2,'loss':3.3,'achievement':2.3,
               'warm_event':2.7,'bad_event':1.6,'mlb':3.5,'click':.22,'confirm':.48}
    a=np.zeros((round(durations[kind]*SR),2),np.float32)
    def note(m,t,d,v='organ',g=.22,p=0):
        add(a,tone(m,d,v),t,g,p)
    def chord(notes,t,d,v='organ',g=.12):
        for i,m in enumerate(notes):
            note(m,t+i*.008,d,v,g,(i-(len(notes)-1)/2)*.12)
    if kind in ['bat','glove']:
        d=.30 if kind=='bat' else .28
        t=np.arange(round(d*SR))/SR
        if kind=='bat':
            y=noise(d)*np.exp(-t*150)*.85
            y+=sum(k*np.sin(2*np.pi*f*t)*np.exp(-t*r) for f,k,r in [(880,.45,40),(1660,.22,64),(2560,.10,100)])
        else:
            y=noise(d,'low')*np.exp(-t*56)*1.8
            y+=np.sin(2*np.pi*155*t)*np.exp(-t*35)*.85
            y+=noise(d)*np.exp(-t*110)*.16
        add(a,y*env(len(y),.0005,.03),.015,.8)
    elif kind=='whoosh':
        t=np.arange(round(.47*SR))/SR
        y=noise(.47)*np.sin(np.pi*t/.47)**3*.4
        y+=np.sin(2*np.pi*(680*t-430*t*t))*.025*np.sin(np.pi*t/.47)**3
        add(a,y,.03,.8,-.25)
    elif kind=='strike':
        note(88,.01,.12,'bell',.40);note(76,.10,.24,'lead',.16)
    elif kind=='out':
        for t,m in [(0,72),(.17,67),(.36,60)]:note(m,t,.22,'organ',.28)
    elif kind=='homerun':
        for i,m in enumerate([72,76,79,84,83,84]):note(m,i*.17,.23,'lead',.26)
        chord([60,64,67,72],1.16,1.3,g=.11)
        for i,m in enumerate([84,88,91,96]):note(m,1.14+i*.14,.55,'bell',.13,(-.5+i*.3))
        for t in [0,.34,.68,1.16]:add(a,percussion('snare'),t,.19)
    elif kind=='win':
        for i,m in enumerate([72,72,76,79,77,76,74,79,84]):note(m,i*.21,.30,'organ',.24)
        chord([48,60,64,67,72],1.92,1.65,g=.11)
        for t in [0,.42,.84,1.26,1.68]:add(a,percussion('snare'),t,.18)
        note(91,2.07,1.1,'bell',.14,.45)
    elif kind=='loss':
        for i,m in enumerate([67,65,63,60]):note(m,i*.38,.48,'epiano',.32)
        chord([48,55,60,63],1.7,1.2,'epiano',.16)
    elif kind=='achievement':
        for i,m in enumerate([72,76,79,84]):note(m,i*.14,.60,'bell',.33,(-.3+i*.2))
        chord([60,64,67],.58,1.2,'epiano',.13)
    elif kind=='warm_event':
        for i,m in enumerate([72,76,79,76,77]):note(m,i*.23,.65,'epiano',.26)
        chord([53,57,60,64],1.18,1.2,'epiano',.13)
        note(84,1.21,.9,'bell',.14,.4)
    elif kind=='bad_event':
        for i,m in enumerate([72,71,65]):note(m,i*.20,.28,'lead',.22)
        chord([48,54,57],.67,.61,'organ',.15)
    elif kind=='mlb':
        for i,m in enumerate([67,72,76,79,84,88]):note(m,i*.18,.32,'organ',.24)
        chord([53,57,60,65],1.24,.62,g=.10)
        chord([55,59,62,67],1.89,.62,g=.10)
        chord([60,64,67,72],2.5,.65,g=.10)
        note(96,2.53,.8,'bell',.16,.4)
    elif kind=='click':
        note(79,0,.07,'bell',.30)
    elif kind=='confirm':
        note(76,0,.12,'bell',.31);note(84,.11,.23,'bell',.30)
    return polish(a,rms_target=.13)


def write_wav(path,a):
    pcm=(np.clip(a,-1,1)*32767).round().astype('<i2')
    with wave.open(str(path),'wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
    return pcm


def render(out,encoder_dir):
    if out.exists():
        raise SystemExit(f'Refusing to overwrite existing audio: {out}')
    out.mkdir(parents=True)
    if encoder_dir:
        sys.path.insert(0,str(encoder_dir.resolve()))
    try:
        import lameenc
    except ImportError:
        lameenc=None
    manifest=[]
    tracks=[]
    def save(stem,title,a,category,context,loop=False,**extra):
        pcm=write_wav(out/(stem+'.wav'),a)
        if lameenc:
            enc=lameenc.Encoder();enc.set_bit_rate(192);enc.set_in_sample_rate(SR)
            enc.set_channels(2);enc.set_quality(2)
            (out/(stem+'.mp3')).write_bytes(enc.encode(pcm.tobytes())+enc.flush())
        entry={'id':stem,'title':title,'category':category,'context':context,'loop':loop,
               'wav':stem+'.wav','mp3':stem+'.mp3' if lameenc else None,
               'seconds':round(len(a)/SR,3),'peak_dbfs':round(float(20*np.log10(max(1e-9,np.max(np.abs(a))))),2),
               'rms_dbfs':round(float(20*np.log10(max(1e-9,np.sqrt(np.mean(a*a))))),2),
               'sample_rate':SR,'channels':2,**extra}
        assert np.isfinite(a).all() and np.max(np.abs(a))<.99
        assert np.abs(a[0]).max()<1e-7 and np.abs(a[-1]).max()<1e-7
        manifest.append(entry);return entry
    for style,stem,title,context in [
        ('main','bgm-01-play-ball','오늘도 해체는 없다','메인 화면 · 일반 경기 / 경쾌한 오르간, 통통 튀는 베이스'),
        ('club','bgm-02-our-club','우리 동네 야구단','구단 운영 · 사인회 · 기부 · 어린이 돕기 / 따뜻한 전자 피아노'),
        ('tension','bgm-03-full-count','9회말 풀카운트','접전 · 득점권 위기 / 촘촘한 리듬과 단조 멜로디')]:
        a,bpm,bars=compose(style)
        save(stem,title,a,'BGM',context,True,bpm=bpm,bars=bars)
        tracks.append((title,a))
    for kind,title,context in [
        ('bat','배트에 딱!','타격 순간 / 짧고 마른 나무 타격음'),
        ('glove','글러브에 퍽','포구 순간 / 낮고 둔탁한 포구음'),
        ('whoosh','헛스윙 휙','스윙했지만 맞히지 못했을 때'),
        ('strike','스트라이크','판정 말풍선과 함께 / 짧은 전자 신호'),
        ('out','아웃','아웃 판정 / 내려가는 오르간 3음'),
        ('homerun','홈런!','홈런 연출 / 올라가는 선율과 반짝이는 마무리'),
        ('win','해체는 다음에','승리 결과 / 밝은 경기장 팡파르'),
        ('loss','오늘은 여기까지','패배 결과 / 짧고 씁쓸한 전자 피아노'),
        ('achievement','업적 달성','업적 알림 / 작은 반짝임'),
        ('warm_event','마음이 따뜻해지는 소식','사인회 · 기부 · 어린이 돕기 결과'),
        ('bad_event','어이, 그건 아니지','쓰레기 투기 · 새치기 · 성의 없는 인터뷰 결과'),
        ('mlb','더 큰 무대로','MLB 진출 성공 / 세 단계로 커지는 축하 선율'),
        ('click','메뉴 선택','선택 이동 / 작은 한 음'),
        ('confirm','선택 완료','결정 · 저장 완료 / 올라가는 두 음')]:
        a=effect(kind)
        save('sfx-'+kind,title,a,'효과음',context)
        tracks.append((title,a))
    timeline=[];parts=[];cursor=0
    for i,(title,a) in enumerate(tracks):
        clip=a[:min(len(a),12*SR)].copy()
        if i<3:
            fade=int(.35*SR);clip[-fade:]*=np.linspace(1,0,fade)[:,None]
        timeline.append({'at_seconds':round(cursor,3),'title':title,'duration':round(len(clip)/SR,3)})
        parts.extend([clip,np.zeros((round(.65*SR),2),np.float32)])
        cursor+=len(clip)/SR+.65
    sampler=np.concatenate(parts)
    save('00-listen-all','전체 시안 이어 듣기',sampler,'모음','BGM 3곡의 앞 12초 → 효과음 14종')
    (out/'manifest.json').write_text(json.dumps({'draft':True,'integrated':False,'generation':'Original score and procedural synthesis, no sampled music or voices','tracks':manifest,'sampler_timeline':timeline},ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({'tracks':len(manifest),'sampler_seconds':round(len(sampler)/SR,2),'mp3':bool(lameenc),'output':str(out)},ensure_ascii=False))


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);p.add_argument('--encoder-dir',type=Path)
    args=p.parse_args();render(args.out,args.encoder_dir)

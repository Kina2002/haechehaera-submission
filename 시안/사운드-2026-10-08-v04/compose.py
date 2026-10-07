"""Original reaction music, rendered offline. Never writes to the game.

Requires mido/numpy/scipy/soundfile/lameenc and an external FluidSynth executable
with GeneralUser GS 2.0.3. Pass --out a NEW directory; source MIDI is preserved.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import sys
import tempfile

SR = 44100
PPQ = 960


def compose(role, short, mido):
    bpm = {'commentary': 116, 'fans': 108, 'cheer': 132}[role]
    bars = 2 if short else 8
    mid = mido.MidiFile(ticks_per_beat=PPQ)
    master = mido.MidiTrack(); mid.tracks.append(master)
    master.extend([mido.MetaMessage('track_name', name=role),
                   mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(bpm)),
                   mido.MetaMessage('time_signature', numerator=4, denominator=4)])
    tracks = {}
    # All program numbers are zero-based General MIDI instruments.
    specs = {
        'commentary': [('brass', 61, 90, 56), ('piano', 1, 64, 79),
                       ('bass', 33, 101, 64), ('guitar', 27, 65, 33), ('drums', 0, 88, 64)],
        'fans': [('organ', 17, 88, 55), ('marimba', 12, 69, 83),
                 ('bass', 32, 103, 64), ('guitar', 24, 61, 33), ('drums', 0, 81, 64)],
        'cheer': [('brass', 62, 83, 51), ('piano', 2, 84, 79),
                  ('bass', 38, 91, 64), ('guitar', 27, 65, 30), ('drums', 0, 96, 64)]
    }[role]
    for i, (name, program, volume, pan) in enumerate(specs):
        channel = 9 if name == 'drums' else i
        t = mido.MidiTrack(); mid.tracks.append(t)
        t.append(mido.MetaMessage('track_name', name=name))
        t.extend([mido.Message('program_change', channel=channel, program=program),
                  mido.Message('control_change', channel=channel, control=7, value=volume),
                  mido.Message('control_change', channel=channel, control=10, value=pan),
                  mido.Message('control_change', channel=channel, control=91, value=27 if name=='drums' else 42),
                  mido.Message('control_change', channel=channel, control=93, value=0)])
        tracks[name] = [channel, t, []]

    def note(name, at, pitch, length, velocity):
        chan, _, events = tracks[name]
        start = round(max(0, at) * PPQ)
        end = round((max(0, at) + length) * PPQ)
        events.append((start, 1, mido.Message('note_on', channel=chan, note=pitch, velocity=max(1,min(127,velocity)))))
        events.append((end, 0, mido.Message('note_off', channel=chan, note=pitch, velocity=0)))

    def chord(name, at, pitches, length, velocity, strum=0):
        for i, pitch in enumerate(pitches):
            note(name, at+i*strum, pitch, length, velocity-(i%3)*3)

    if role == 'commentary':
        # C mixolydian broadcast band; a compact syncopated brass hook.
        harmony = [[60,64,67,74],[58,62,65,72],[57,60,64,67],[55,59,62,65],
                   [60,64,67,74],[62,65,69,72],[53,57,60,64],[55,59,62,65]]
        roots = [36,34,33,31,36,38,29,31]
        phrases = [
            [(0,72,.42),(0.75,76,.22),(1.25,79,.40),(2,81,.32),(2.75,79,.78)],
            [(0,77,.40),(.75,74,.23),(1.5,72,.72),(3,70,.30),(3.5,67,.27)],
            [(0,72,.45),(1,76,.38),(1.75,79,.27),(2.5,76,.45),(3.25,72,.32)],
            [(0,74,.33),(.75,71,.3),(1.5,67,.68),(3.25,69,.2),(3.5,71,.25)],
            [(0,79,.48),(.75,81,.30),(1.5,84,.78),(3,79,.47)],
            [(0,81,.45),(1,77,.34),(1.75,74,.5),(3,72,.5)],
            [(0,77,.48),(.75,76,.28),(1.5,72,.65),(2.75,69,.30),(3.5,72,.25)],
            [(0,74,.48),(1,71,.30),(1.75,67,.35),(2.75,69,.27),(3.5,71,.25)]
        ]
    elif role == 'fans':
        # Jaunty, lightly swung stadium organ with a marimba answer.
        harmony = [[60,64,67,69],[57,60,64,67],[62,65,69,72],[55,59,62,65],
                   [60,64,67,69],[64,67,71,74],[53,57,60,62],[55,59,62,65]]
        roots = [36,33,38,31,36,40,29,31]
        phrases = [
            [(0,76,.27),(.65,79,.24),(1.5,76,.3),(2.25,74,.26),(3,72,.58)],
            [(.5,72,.30),(1.25,76,.28),(2,79,.35),(3,76,.28),(3.65,72,.22)],
            [(0,74,.30),(.65,77,.25),(1.5,81,.45),(2.65,77,.3),(3.5,74,.26)],
            [(.5,74,.3),(1.25,71,.28),(2,67,.55),(3.25,69,.22),(3.65,71,.22)],
            [(0,76,.3),(.65,79,.25),(1.5,84,.4),(2.65,79,.26),(3.25,76,.34)],
            [(.5,79,.3),(1.25,78,.24),(2,76,.50),(3.25,74,.30)],
            [(0,77,.3),(.65,76,.25),(1.5,72,.4),(2.65,69,.26),(3.25,72,.32)],
            [(.5,74,.3),(1.25,71,.28),(2,67,.55),(3.25,71,.22),(3.65,74,.22)]
        ]
    else:
        # E-flat dance cheer, four-on-the-floor and a two-bar call/answer hook.
        harmony = [[63,67,70,74],[60,63,67,70],[56,60,63,67],[58,62,65,70],
                   [63,67,70,74],[60,63,67,70],[56,60,63,67],[58,62,65,70]]
        roots = [39,36,32,34,39,36,32,34]
        phrases = [
            [(0,79,.27),(.5,79,.25),(1.25,82,.42),(2,84,.27),(2.75,82,.65)],
            [(.5,79,.26),(1.25,75,.45),(2,79,.26),(2.75,82,.28),(3.5,79,.25)],
            [(0,80,.27),(.5,80,.25),(1.25,84,.42),(2,87,.27),(2.75,84,.65)],
            [(.5,82,.27),(1.25,77,.42),(2,74,.30),(2.75,77,.3),(3.5,82,.25)],
            [(0,82,.27),(.5,82,.25),(1.25,87,.42),(2,86,.27),(2.75,82,.65)],
            [(.5,84,.26),(1.25,82,.45),(2,79,.26),(2.75,75,.28),(3.5,79,.25)],
            [(0,80,.27),(.5,80,.25),(1.25,84,.42),(2,87,.27),(2.75,84,.65)],
            [(.5,82,.27),(1.25,77,.42),(2,74,.30),(2.75,77,.3),(3.5,82,.25)]
        ]

    for bar in range(bars):
        offset = 4*bar
        final = short and bar == 1
        voicing = harmony[bar] if not final else harmony[0]
        root = roots[bar] if not final else roots[0]
        limit = 2.5 if final else 4
        if role == 'commentary':
            for at in [.5,1.5,2.75,3.5]:
                if at < limit: chord('piano',offset+at,voicing,.24,76,.006)
            for at in [.25,1.25,2.25,3.25]:
                if at < limit: chord('guitar',offset+at,[voicing[0],voicing[2]],.14,65,.012)
            bassline = [(0,root),(.75,root+12),(1.5,root+7),(2,root),(2.75,root+7),(3.5,root+10)]
        elif role == 'fans':
            for at in [.65,1.65,2.65,3.65]:
                if at < limit: chord('guitar',offset+at,voicing,.22,69,.011)
            for at in [0,2]:
                if at < limit: chord('organ',offset+at,[voicing[0]-12,voicing[1],voicing[2]],.26,54)
            bassline = [(0,root),(1,root+7),(2,root+12),(3,root+7)]
        else:
            for at in [.5,1.25,2.5,3.25]:
                if at < limit: chord('piano',offset+at,voicing,.29,91,.005)
            for at in [.5,1.5,2.5,3.5]:
                if at < limit: chord('guitar',offset+at,[voicing[1],voicing[2]],.12,70,.010)
            bassline = [(x*.5,root+(12 if x%4==3 else 0)) for x in range(8)]
        for at,pitch in bassline:
            if at < limit: note('bass',offset+at,pitch,.31 if role!='fans' else .62,94-(int(at*4)%3)*5)
        lead = 'organ' if role=='fans' else 'brass'
        melody = phrases[bar]
        if final:
            melody = ([(0,79,.25),(.65,76,.25),(1.5,72,.9)] if role=='fans' else
                      [(0,79,.30),(.5,76,.3),(1.5,72,.9)] if role=='commentary' else
                      [(0,82,.25),(.5,79,.25),(1,75,1.05)])
        for at,pitch,duration in melody:
            note(lead,offset+at,pitch,duration,94 if role=='cheer' else 89)
            if role=='commentary': note(lead,offset+at,pitch-12,duration,55)
        if role=='fans' and not final:
            for at,pitch in [(2.65,voicing[-1]+12),(3.65,voicing[-2]+12)]:
                note('marimba',offset+at,pitch,.25,66)
        if final:
            chord('piano' if role!='fans' else 'organ',offset+1.5,voicing,.95,79)
            note('bass',offset+1.5,root,.8,98)

        kicks = [0,1,2,3] if role=='cheer' else [0,1.75,2.5] if role=='commentary' else [0,2]
        for at in kicks:
            if at < limit: note('drums',offset+at,36,.1,103 if role=='cheer' else 91)
        for at in [1,3]:
            if at < limit:
                note('drums',offset+at+.008,37 if role=='fans' else 38,.11,75 if role=='fans' else 94)
                if role=='cheer': note('drums',offset+at+.019,39,.1,96)
        for i in range(8):
            at=i*.5+(.15 if role=='fans' and i%2 else 0)
            if at < limit: note('drums',offset+at,42,.08,57 if i%2 else 68)
        if role=='cheer':
            for at in [.5,1.5,2.5,3.5]:
                if at < limit: note('drums',offset+at,54,.1,60)
        if bar%4==3 and not final:
            for i in range(3): note('drums',offset+3.25+.25*i,[45,47,50][i],.13,71+i*6)
        if final:
            note('drums',offset+1.5,49,.17,65 if role=='fans' else 89)
        elif bar%4==0:
            note('drums',offset,49,.15,65 if role=='fans' else 83)

    for _, t, events in tracks.values():
        cursor=0
        for at,_,msg in sorted(events,key=lambda e:(e[0],e[1])):
            t.append(msg.copy(time=at-cursor));cursor=at
        t.append(mido.MetaMessage('end_of_track',time=max(0,bars*4*PPQ-cursor)))
    return mid,bpm,bars


def main(a):
    for p in a.deps: sys.path.insert(0,str(p.resolve()))
    import mido
    import numpy as np
    import soundfile as sf
    import lameenc
    from scipy.signal import butter,sosfilt,resample_poly
    a.out.mkdir(parents=True,exist_ok=False)
    audio=a.out/'audio';audio.mkdir()
    midi=a.out/'midi';midi.mkdir()
    manifest=[];shorts=[]
    def save(name,title,y,meta):
        sf.write(audio/(name+'.wav'),y,SR,subtype='PCM_16')
        enc=lameenc.Encoder();enc.set_bit_rate(192);enc.set_in_sample_rate(SR);enc.set_channels(2);enc.set_quality(2)
        pcm=np.round(np.clip(y,-1,1)*32767).astype('<i2')
        (audio/(name+'.mp3')).write_bytes(enc.encode(pcm.tobytes())+enc.flush())
        decoded,sr=sf.read(audio/(name+'.mp3'),always_2d=True)
        assert sr==SR and decoded.shape[1]==2 and np.isfinite(decoded).all()
        assert abs(len(decoded)/SR-len(y)/SR)<.15 and .01<np.max(np.abs(decoded))<.99
        wav,sr=sf.read(audio/(name+'.wav'),always_2d=True)
        assert len(wav)==len(y) and np.max(np.abs(wav[[0,-1]]))<.0001
        assert np.isfinite(wav).all() and .01<np.sqrt(np.mean(wav**2))<.25
        manifest.append(dict(id=name,title=title,seconds=round(len(y)/SR,3),
                             peak_dbfs=round(float(20*np.log10(abs(wav).max())),2),
                             true_peak_4x_dbfs=round(float(20*np.log10(abs(resample_poly(wav,4,1,axis=0)).max())),2),
                             rms_dbfs=round(float(20*np.log10(np.sqrt(np.mean(wav**2)))),2),
                             sha256=hashlib.sha256((audio/(name+'.wav')).read_bytes()).hexdigest(),
                             passed=True,**meta))
    with tempfile.TemporaryDirectory(prefix='haeche-music-') as tmp:
        for n,(role,title) in enumerate([('commentary','중계석 ON AIR'),('fans','관중석 한마디'),('cheer','다 같이 박수!')],1):
            for short in [True,False]:
                mid,bpm,bars=compose(role,short,mido)
                kind='cue' if short else 'full'
                name=f'{n:02d}-{role}-{kind}'
                mid.save(midi/(name+'.mid'))
                # Use a short ASCII path for native Windows file APIs.
                temp_mid=Path(tmp)/'music.mid';mid.save(temp_mid)
                temp_wav=Path(tmp)/'render.wav'
                result=subprocess.run([str(a.fluidsynth.resolve()),'-ni','-q','-r',str(SR),'-g','0.45',
                    '-C','0','-R','1','-o','synth.reverb.room-size=0.42','-o','synth.reverb.damp=0.40',
                    '-o','synth.reverb.width=0.65','-o','synth.reverb.level=0.28',
                    '-F',str(temp_wav),'-T','wav','-O','float',str(a.soundfont.resolve()),str(temp_mid)],
                    capture_output=True,check=True)
                y,sr=sf.read(temp_wav,always_2d=True)
                assert sr==SR and y.shape[1]==2 and abs(y).max()>.01
                length=5.0 if short else bars*4*60/bpm+1.0
                count=round(length*SR)
                if len(y)<count:y=np.pad(y,((0,count-len(y)),(0,0)))
                y=y[:count]
                y=sosfilt(butter(2,32,fs=SR,btype='highpass',output='sos'),y,axis=0)
                # Mild compression; leave drum transients and horn articulation intact.
                y*=.19/max(np.sqrt(np.mean(y*y)),1e-9)
                y=.95*np.tanh(y/.95)
                target=.85/max(abs(resample_poly(y,4,1,axis=0)).max(),1e-9)
                y*=min(target,1.20)
                attack=round(.007*SR);release=round((.45 if short else .9)*SR)
                y[:attack]*=np.linspace(0,1,attack)[:,None]
                y[-release:]*=np.linspace(1,0,release)[:,None]
                save(name,title+(' · 등장 5초' if short else ' · 확장 BGM'),y,
                     dict(role=role,variant=kind,bpm=bpm,bars=bars,loop=False))
                if short:shorts.append(y)
                print(name,round(len(y)/SR,3),flush=True)
        gap=np.zeros((round(.65*SR),2))
        combined=np.concatenate([shorts[0],gap,shorts[1],gap,shorts[2]])
        save('00-three-entrances','중계진 → 관객 → 치어리더 · 5초씩',combined,dict(variant='comparison',loop=False))
    report=dict(draft=True,integrated=False,held=['strike','out','homerun-fireworks'],
                renderer='FluidSynth 2.6.1',soundfont='GeneralUser GS 2.0.3',
                soundfont_sha256=hashlib.sha256(a.soundfont.read_bytes()).hexdigest(),
                listening_review='User review pending; objective decoding and signal checks only',tracks=manifest)
    (a.out/'audio-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps(manifest,ensure_ascii=False))


if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--deps',type=Path,action='append',default=[])
    p.add_argument('--fluidsynth',type=Path,required=True)
    p.add_argument('--soundfont',type=Path,required=True)
    main(p.parse_args())

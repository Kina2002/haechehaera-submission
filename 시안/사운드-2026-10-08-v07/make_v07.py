"""Draft only: echoed Korean mic check and an upward trumpet ending."""
import argparse
import asyncio
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

SR = 44100


def rising_score(previous, mido):
    spec = importlib.util.spec_from_file_location('previous_draft', previous/'make_v06.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    mid = module.trumpet_score(mido)
    changed = []
    for track in mid.tracks:
        tick = 0
        for msg in track:
            tick += msg.time
            if msg.is_meta:
                continue
            beat = tick / mid.ticks_per_beat
            # Preserve the opening and accompaniment. Raise only the final calls.
            threshold = {0: 6.25, 1: 7.2}.get(msg.channel)
            if threshold is None or beat < threshold:
                continue
            if msg.type in ('note_on', 'note_off'):
                old = msg.note
                msg.note = 79 if msg.channel == 0 else 81
                changed.append(dict(beat=beat,channel=msg.channel,kind=msg.type,old=old,new=msg.note))
            elif msg.type == 'pitchwheel' and msg.pitch < 0:
                old = msg.pitch
                msg.pitch = -msg.pitch
                changed.append(dict(beat=beat,channel=msg.channel,kind=msg.type,old=old,new=msg.pitch))
    assert len(changed) == 10
    return mid, changed


def main(a):
    for path in a.deps:
        sys.path.insert(0, str(path.resolve()))
    import numpy as np
    import soundfile as sf
    import lameenc
    import mido
    from scipy.signal import butter, sosfilt, resample_poly
    from scipy.ndimage import uniform_filter1d

    a.out.mkdir(parents=True, exist_ok=False)
    audio = a.out/'audio'; audio.mkdir()
    sources = a.out/'sources'; sources.mkdir()
    midi_dir = a.out/'midi'; midi_dir.mkdir()
    voice_meta = dict(text='아.', voice='ko-KR-HyunsuMultilingualNeural', rate='-15%', pitch='-3Hz',
                      provider='Microsoft Edge TTS via edge-tts', synthetic=True, integrated=False,
                      edit='One vowel, duration adjusted to 0.34 and 0.40 seconds with pitch preserved; repeated with 0.16 second gap')
    voice_path = sources/'mic-check-hyunsu.mp3'
    if a.voice_source:
        shutil.copy2(a.voice_source, voice_path)
    else:
        import edge_tts
        async def generate():
            await edge_tts.Communicate(voice_meta['text'], voice_meta['voice'],
                                      rate=voice_meta['rate'], pitch=voice_meta['pitch']).save(str(voice_path))
        asyncio.run(generate())
    voice_meta['sha256'] = hashlib.sha256(voice_path.read_bytes()).hexdigest()
    (sources/'voice-generation.json').write_text(json.dumps(voice_meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    report = []
    def peak(y):
        return float(abs(resample_poly(y,4,1,axis=0)).max())
    def load(path):
        y, sr = sf.read(path, always_2d=True)
        if sr != SR:
            g = math.gcd(sr,SR); y = resample_poly(y,SR//g,sr//g,axis=0)
        if y.shape[1] == 1:
            y = np.repeat(y,2,axis=1)
        return y
    def inspect(key, title, **extra):
        y, sr = sf.read(audio/(key+'.wav'),always_2d=True)
        mp3, rate = sf.read(audio/(key+'.mp3'),always_2d=True)
        assert sr == rate == SR and y.shape[1] == mp3.shape[1] == 2
        assert np.isfinite(y).all() and np.isfinite(mp3).all()
        assert abs(len(y)-len(mp3)) < .15*SR
        assert .001 < peak(y) < .96 and .001 < abs(mp3).max() < .99
        assert abs(y[[0,-1]]).max() < .0001
        row = dict(id=key,title=title,seconds=round(len(y)/SR,3),
                   true_peak_4x_dbfs=round(20*math.log10(peak(y)),2),
                   sha256=hashlib.sha256((audio/(key+'.wav')).read_bytes()).hexdigest(),passed=True,**extra)
        report.append(row)
        return y
    def write(key, title, y, **extra):
        assert peak(y) < .92
        sf.write(audio/(key+'.wav'),y,SR,subtype='PCM_16')
        enc = lameenc.Encoder(); enc.set_bit_rate(192); enc.set_in_sample_rate(SR); enc.set_channels(2); enc.set_quality(2)
        (audio/(key+'.mp3')).write_bytes(enc.encode(np.round(y*32767).astype('<i2').tobytes())+enc.flush())
        return inspect(key,title,**extra)

    voice = load(voice_path)
    power = uniform_filter1d(np.mean(voice*voice,axis=1),round(.01*SR))
    active = np.flatnonzero(power > power.max()*.003)
    assert len(active) > 0
    voice = voice[max(0,active[0]-round(.025*SR)):min(len(voice),active[-1]+round(.06*SR))]
    # Two clearly separated mic-check vowels, not a hurried TTS phrase.
    import imageio_ffmpeg
    with tempfile.TemporaryDirectory(prefix='haeche-aa-') as temp:
        temp=Path(temp); sf.write(temp/'vowel.wav',voice,SR,subtype='PCM_24')
        syllables=[]
        for i,seconds in enumerate([.34,.40]):
            speed=len(voice)/SR/seconds; filters=[]
            while speed < .5:
                filters.append('atempo=0.5'); speed/=.5
            while speed > 2:
                filters.append('atempo=2.0'); speed/=2
            filters.append(f'atempo={speed:.8f}')
            out=temp/f'vowel-{i}.wav'
            subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error',
                '-i',str(temp/'vowel.wav'),'-af',','.join(filters),str(out)],check=True,capture_output=True)
            syllable=load(out)
            syllable[:round(.012*SR)]*=np.linspace(0,1,round(.012*SR))[:,None]
            syllable[-round(.03*SR):]*=np.linspace(1,0,round(.03*SR))[:,None]
            syllables.append(syllable)
        voice=np.concatenate([syllables[0],np.zeros((round(.16*SR),2)),syllables[1]*.94])
    # PA microphone colour, retaining intelligibility of the two short vowels.
    voice = sosfilt(butter(2,[150,6000],btype='bandpass',fs=SR,output='sos'),voice,axis=0)
    voice *= .60/max(abs(voice).max(),1e-9)
    voice = .8*voice + .2*np.tanh(voice*1.6)/1.6
    voice[:round(.008*SR)] *= np.linspace(0,1,round(.008*SR))[:,None]
    voice[-round(.025*SR):] *= np.linspace(1,0,round(.025*SR))[:,None]
    lead = round(.07*SR)
    dry = np.pad(voice,((lead,round(.76*SR)),(0,0)))
    mic = dry.copy()
    for delay, level in [(.12,.34),(.24,.20),(.36,.12),(.48,.07),(.60,.04)]:
        shift=round(delay*SR)
        reflected=sosfilt(butter(2,4300,btype='lowpass',fs=SR,output='sos'),dry[:-shift],axis=0)
        mic[shift:] += reflected[:,::-1]*level
    # Keep a small switch click; the spoken mic check is now the foreground.
    old_click=load(a.previous.parent/'사운드-2026-10-08-v05/audio/01-commentary-mic.wav')
    mic[:len(old_click)] += old_click*.22
    mic*=min(1,.82/peak(mic))
    mic[-round(.08*SR):]*=np.linspace(1,0,round(.08*SR))[:,None]
    mic=write('01-commentary-mic-aa','중계진 · 에코 아, 아',mic,state='new_draft',kind='sfx',
              echo_delays_seconds=[.12,.24,.36,.48,.60],voice_source=voice_meta)

    mid,changes=rising_score(a.previous,mido)
    mid.save(midi_dir/'05-rival-cheer-rising.mid')
    with tempfile.TemporaryDirectory(prefix='haeche-v07-') as temp:
        temp=Path(temp); score=temp/'score.mid'; mid.save(score); render=temp/'render.wav'
        subprocess.run([str(a.fluidsynth.resolve()),'-ni','-q','-r',str(SR),'-g','0.38','-C','0','-R','1',
                        '-o','synth.reverb.room-size=0.34','-o','synth.reverb.damp=0.48',
                        '-o','synth.reverb.width=0.6','-o','synth.reverb.level=0.22',
                        '-F',str(render),'-T','wav','-O','float',str(a.soundfont.resolve()),str(score)],
                       check=True,capture_output=True)
        y=load(render)[:5*SR]
        y=np.pad(y,((0,max(0,5*SR-len(y))),(0,0)))
        y=sosfilt(butter(2,38,btype='highpass',fs=SR,output='sos'),y,axis=0)
        y*=.185/max(np.sqrt(np.mean(y*y)),1e-9)
        y=.95*np.tanh(y/.95); y*=min(1,.86/peak(y))
        y[:round(.006*SR)]*=np.linspace(0,1,round(.006*SR))[:,None]
        y[-round(.5*SR):]*=np.linspace(1,0,round(.5*SR))[:,None]
    trumpet=write('05-rival-cheer-rising','어머, 또요? · 끝음 올리기',y,state='new_draft',kind='bgm',
                  bpm=132,ending_direction='up',score_changes=changes)
    retained=[('06-bat-louder','일반 타격 · 더 크게 딱!'),('07-homerun-bat-louder','홈런 타격 · 더 크게 딱!'),
              ('02-rival-fans-tease','상대 관객 · 관중석 한마디'),('03-home-fans-sad','우리 관객 · 또 놓쳤네…'),
              ('04-home-cheer-support','우리 치어리더 · 다 같이 박수!')]
    for key,title in retained:
        for ext in ['wav','mp3']:
            src=a.previous/'audio'/(key+'.'+ext); dest=audio/src.name
            shutil.copy2(src,dest); assert src.read_bytes()==dest.read_bytes()
        inspect(key,title,state='retained',unchanged_copy=True)
    gap=np.zeros((round(.65*SR),2))
    write('00-mic-before-after','마이크 · 우웅 → 에코 아, 아',np.concatenate([
        load(a.previous/'audio/01-commentary-mic-hum.wav'),gap,mic]),kind='comparison')
    write('00-trumpet-before-after','어머, 또요? · 내리는 끝음 → 올리는 끝음',np.concatenate([
        load(a.previous/'audio/05-rival-cheer-trumpet.wav'),gap,trumpet]),kind='comparison')
    write('00-revised-all','이번 수정 · 에코 아, 아 → 끝음 올린 트럼펫',np.concatenate([mic,gap,trumpet]),kind='comparison')
    shutil.copy2(a.previous/'sources/LICENSE-GeneralUser.txt',sources/'LICENSE-GeneralUser.txt')
    (a.out/'audio-checks.json').write_text(json.dumps(dict(integrated=False,tracks=report,
        listening_review='Subjective review pending; objective decoding and waveform checks only'),
        ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps([{'id':r['id'],'seconds':r['seconds'],'peak_dbfs':r['true_peak_4x_dbfs']} for r in report],ensure_ascii=False))


if __name__ == '__main__':
    p=argparse.ArgumentParser()
    for flag in ['out','previous','fluidsynth','soundfont']:
        p.add_argument('--'+flag,type=Path,required=True)
    p.add_argument('--voice-source',type=Path)
    p.add_argument('--deps',type=Path,action='append',default=[])
    main(p.parse_args())

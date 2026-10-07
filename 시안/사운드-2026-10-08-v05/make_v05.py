"""Reaction-role audio drafts: original mic switch and two original music cues.

Dependencies and SoundFont are the same pinned local tools used for v04.
The output directory must be new. No game files are written.
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile

SR = 44100
PPQ = 960


def score(role, mido):
    sad = role == 'home-fans-sad'
    bpm = 96 if sad else 124
    mid = mido.MidiFile(ticks_per_beat=PPQ)
    tempo = mido.MidiTrack();mid.tracks.append(tempo)
    tempo.extend([mido.MetaMessage('track_name',name=role),
                  mido.MetaMessage('set_tempo',tempo=mido.bpm2tempo(bpm)),
                  mido.MetaMessage('time_signature',numerator=4,denominator=4)])
    specs = ([('clarinet',71,80,59),('epiano',4,79,73),('bass',32,83,62),('drums',0,62,64)] if sad else
             [('brass',56,78,53),('marimba',12,79,85),('pizz',45,85,38),('bass',33,91,64),('drums',0,83,64)])
    tracks={}
    for i,(name,program,volume,pan) in enumerate(specs):
        channel=9 if name=='drums' else i
        track=mido.MidiTrack();mid.tracks.append(track)
        track.append(mido.MetaMessage('track_name',name=name))
        for control,value in [(7,volume),(10,pan),(91,38 if sad else 27),(93,0)]:
            track.append(mido.Message('control_change',channel=channel,control=control,value=value))
        track.append(mido.Message('program_change',channel=channel,program=program))
        tracks[name]=(channel,track,[])

    def n(part,at,pitch,length,velocity):
        channel,_,events=tracks[part]
        events.extend([(round(at*PPQ),1,mido.Message('note_on',channel=channel,note=pitch,velocity=velocity)),
                       (round((at+length)*PPQ),0,mido.Message('note_off',channel=channel,note=pitch,velocity=0))])

    def chord(part,at,pitches,length,velocity):
        for i,pitch in enumerate(pitches):n(part,at+i*.009,pitch,length,velocity-i*2)

    if sad:
        # Quiet, rueful C minor; room for the fan's line, without a victory pulse.
        for at,pitches,length in [(0,[48,55,62,63],1.7),(2.5,[53,60,65,68],1.0),
                                  (4,[55,59,62,65],.65),(5.25,[48,55,60,63],1.4)]:
            chord('epiano',at,pitches,length,69)
        for at,pitch,length,vel in [(0.25,67,.68,75),(1.25,63,.75,73),(2.5,65,.55,70),
                                     (3.5,62,.62,67),(5.25,60,1.2,65)]:
            n('clarinet',at,pitch,length,vel)
        for at,pitch,length in [(0,36,1.0),(2.5,41,.8),(4,43,.5),(5.25,36,1.15)]:
            n('bass',at,pitch,length,72)
        for at,vel in [(1,35),(3,30)]:n('drums',at,37,.1,vel)
    else:
        # Dry, cheeky call-and-answer rather than the home cheer's dance rhythm.
        for at,pitches in [(0,[55,59,62,64]),(1.5,[57,60,64,67]),(3,[55,59,62,65]),
                           (4.5,[53,57,60,62]),(6,[55,59,62,64])]:
            chord('pizz',at,pitches,.26,81)
        for at,pitch,length in [(0,79,.19),(.5,78,.18),(1.25,79,.3),(2,74,.25),
                                (3,76,.24),(3.5,74,.18),(4.25,72,.32),(5,74,.2),(6,71,.65)]:
            n('brass',at,pitch,length,84 if at<3 else 77)
        for at,pitch in [(.75,83),(1.75,86),(2.75,83),(4.75,81),(5.5,78),(6.5,79)]:
            n('marimba',at,pitch,.21,74)
        for at,pitch in [(0,43),(1,50),(2,45),(3,43),(4,41),(5,50),(6,43)]:
            n('bass',at,pitch,.32,86)
        for at in [0,2,4,6]:n('drums',at,36,.1,77)
        for at in [1,3,5]:n('drums',at+.01,37,.12,88)
        for i in range(12):n('drums',i*.5+(.055 if i%2 else 0),42,.07,47 if i%2 else 61)
        for at,pitch in [(5.5,76),(5.75,77),(6,76)]:n('drums',at,pitch,.08,67)
    for _,track,events in tracks.values():
        previous=0
        for tick,_,msg in sorted(events,key=lambda x:(x[0],x[1])):
            track.append(msg.copy(time=tick-previous));previous=tick
        track.append(mido.MetaMessage('end_of_track',time=max(0,8*PPQ-previous)))
    return mid,bpm


def main(a):
    for p in a.deps:sys.path.insert(0,str(p.resolve()))
    import numpy as np
    import soundfile as sf
    import lameenc
    import mido
    from scipy.signal import butter,sosfilt,resample_poly
    a.out.mkdir(parents=True,exist_ok=False)
    audio=a.out/'audio';audio.mkdir()
    midi_dir=a.out/'midi';midi_dir.mkdir()
    report=[]

    def inspect(name,title,meta):
        wav,sr=sf.read(audio/(name+'.wav'),always_2d=True)
        mp3,mp3sr=sf.read(audio/(name+'.mp3'),always_2d=True)
        assert sr==mp3sr==SR and wav.shape[1]==mp3.shape[1]==2
        assert np.isfinite(wav).all() and np.isfinite(mp3).all()
        assert abs(len(wav)-len(mp3))<.15*SR
        assert .005<abs(wav).max()<.95 and .005<abs(mp3).max()<.99
        assert abs(wav[[0,-1]]).max()<.0001
        assert abs(resample_poly(wav,4,1,axis=0)).max()<.95
        report.append(dict(id=name,title=title,seconds=round(len(wav)/SR,3),
            peak_dbfs=round(float(20*np.log10(abs(wav).max())),2),
            rms_dbfs=round(float(20*np.log10(np.sqrt(np.mean(wav*wav)))),2),
            true_peak_4x_dbfs=round(float(20*np.log10(abs(resample_poly(wav,4,1,axis=0)).max())),2),
            sha256=hashlib.sha256((audio/(name+'.wav')).read_bytes()).hexdigest(),passed=True,**meta))
        return wav

    def write(name,title,y,meta):
        # A/B montages inherit old transients; attenuate the whole montage equally.
        true_peak=abs(resample_poly(y,4,1,axis=0)).max()
        if true_peak>.90:y=y*(.85/true_peak)
        sf.write(audio/(name+'.wav'),y,SR,subtype='PCM_16')
        enc=lameenc.Encoder();enc.set_bit_rate(192);enc.set_in_sample_rate(SR);enc.set_channels(2);enc.set_quality(2)
        pcm=np.round(np.clip(y,-1,1)*32767).astype('<i2')
        (audio/(name+'.mp3')).write_bytes(enc.encode(pcm.tobytes())+enc.flush())
        return inspect(name,title,meta)

    # A 0.42-second physical switch: dry click, low contact transient, brief circuit opening.
    # No speech, melody, sustained hiss or high feedback whistle.
    rng=np.random.default_rng(2026100805)
    mono=np.zeros(round(.42*SR))
    def layer(start,length,kind,gain):
        t=np.arange(round(length*SR))/SR
        if kind=='click':
            noise=sosfilt(butter(2,[850,5800],btype='bandpass',fs=SR,output='sos'),rng.normal(0,1,len(t)))
            signal=(noise*.65+np.sin(2*np.pi*1750*t)*.19)*np.exp(-t*240)
        elif kind=='contact':
            signal=(np.sin(2*np.pi*145*t)+.27*np.sin(2*np.pi*290*t))*np.exp(-t*65)
        else:
            noise=sosfilt(butter(2,[320,2500],btype='bandpass',fs=SR,output='sos'),rng.normal(0,1,len(t)))
            signal=noise*np.exp(-t*50)
        ramp=min(len(t)//2,round(.0007*SR))
        signal[:ramp]*=np.linspace(0,1,ramp)
        signal[-round(.004*SR):]*=np.linspace(1,0,round(.004*SR))
        start=round(start*SR);mono[start:start+len(signal)]+=signal*gain
    layer(.012,.065,'click',.54);layer(.021,.14,'contact',.22)
    layer(.053,.18,'circuit',.075);layer(.057,.04,'click',.14)
    mic=np.column_stack([mono,mono])
    mic*=.54/max(abs(resample_poly(mic,4,1,axis=0)).max(),1e-9)
    mic=write('01-commentary-mic','중계진 · 마이크 ON',mic,
              dict(speaker='중계진',situation='등장',state='new_draft',kind='sfx'))

    new={}
    with tempfile.TemporaryDirectory(prefix='haeche-role-') as tmp:
        for name,title,role,speaker,situation in [
            ('03-home-fans-sad','우리 관객 · 또 놓쳤네…','home-fans-sad','우리 관객','우리 팀이 불리해 우울한 반응'),
            ('05-rival-cheer-tease','상대 치어리더 · 어머, 또요?','rival-cheer-tease','상대 치어리더','우리 팀을 조롱하는 반응')]:
            mid,bpm=score(role,mido);mid.save(midi_dir/(name+'.mid'))
            temp_mid=Path(tmp)/'score.mid';mid.save(temp_mid)
            temp_wav=Path(tmp)/'render.wav'
            subprocess.run([str(a.fluidsynth.resolve()),'-ni','-q','-r',str(SR),'-g','0.45',
                '-C','0','-R','1','-o','synth.reverb.room-size=0.35','-o','synth.reverb.damp=0.50',
                '-o','synth.reverb.width=0.6','-o','synth.reverb.level=0.23',
                '-F',str(temp_wav),'-T','wav','-O','float',str(a.soundfont.resolve()),str(temp_mid)],
                check=True,capture_output=True)
            y,sr=sf.read(temp_wav,always_2d=True)
            assert sr==SR and abs(y).max()>.001
            size=5*SR
            if len(y)<size:y=np.pad(y,((0,size-len(y)),(0,0)))
            y=sosfilt(butter(2,32,btype='highpass',fs=SR,output='sos'),y[:size],axis=0)
            y*= (.13 if role=='home-fans-sad' else .17)/max(np.sqrt(np.mean(y*y)),1e-9)
            y=.95*np.tanh(y/.95)
            y*=min(1,.84/max(abs(resample_poly(y,4,1,axis=0)).max(),1e-9))
            attack=round(.006*SR);release=round(.55*SR)
            y[:attack]*=np.linspace(0,1,attack)[:,None];y[-release:]*=np.linspace(1,0,release)[:,None]
            new[name]=write(name,title,y,dict(speaker=speaker,situation=situation,bpm=bpm,state='new_draft',kind='bgm'))

    reused={}
    for source,name,title,speaker,situation in [
        ('02-fans-cue','02-rival-fans-tease','상대 관객 · 관중석 한마디','상대 관객','우리 팀을 조롱하는 반응'),
        ('03-cheer-cue','04-home-cheer-support','우리 치어리더 · 다 같이 박수!','우리 치어리더','우리 팀이 잘했을 때 응원')]:
        for ext in ['wav','mp3']:
            src=a.previous/'audio'/(source+'.'+ext);dst=audio/(name+'.'+ext)
            shutil.copy2(src,dst);assert src.read_bytes()==dst.read_bytes()
        reused[name]=inspect(name,title,dict(speaker=speaker,situation=situation,state='user_assigned',kind='bgm',source_version='v04',unchanged_copy=True))

    gap=np.zeros((round(.65*SR),2))
    # Compact wooden contact: strong inharmonic mid/high modes, very short noise.
    # A second sub-millisecond tap sharpens the edge without a metallic ringing tail.
    bats={}
    for name,title,home in [('06-bat-crisp','일반 타격 · 짧게 딱!',False),
                            ('07-homerun-bat-crisp','홈런 타격 · 더 선명하게 딱!',True)]:
        t=np.arange(round(.16*SR))/SR
        crack_noise=sosfilt(butter(2,[2200,7600],btype='bandpass',fs=SR,output='sos'),rng.normal(0,1,len(t)))
        crack_noise/=max(np.sqrt(np.mean(crack_noise**2)),1e-9)
        mono=crack_noise*np.exp(-t*460)*(.24 if home else .19)
        modes=([(960,.18,95),(2020,.53,123),(3440,.76,141),(5150,.33,190)] if home else
               [(880,.20,103),(1780,.57,132),(2950,.65,158),(4430,.30,210)])
        for hz,level,decay in modes:
            mono+=level*np.sin(2*np.pi*hz*t+.025*np.sin(2*np.pi*7*t))*np.exp(-t*decay)
        delayed=round(.00085*SR)
        mono[delayed:]+=crack_noise[:-delayed]*np.exp(-t[:-delayed]*650)*.12
        ramp=round(.00023*SR);mono[:ramp]*=np.linspace(0,1,ramp)
        mono[-round(.015*SR):]*=np.linspace(1,0,round(.015*SR))
        bat=np.zeros((round((.29 if home else .25)*SR),2));start=round(.009*SR)
        bat[start:start+len(mono)]=mono[:,None]*.707
        reflection=start+round(.021*SR)
        bat[reflection:reflection+len(mono)]+=mono[:,None]*np.array([.017,.028])[None,:]
        bat*=.84/max(abs(resample_poly(bat,4,1,axis=0)).max(),1e-9)
        bats[name]=write(name,title,bat,dict(kind='sfx',state='new_draft',situation='홈런 배트 접촉' if home else '일반 배트 접촉'))
    before= a.previous.parent/'사운드-2026-10-08-v02'/'audio'
    old_bat,sr=sf.read(before/'01-normal-contact.wav',always_2d=True);assert sr==SR
    old_home,sr=sf.read(before/'02-homerun-contact.wav',always_2d=True);assert sr==SR
    write('00-bat-before-after','일반 이전 → 새 일반 → 홈런 이전 → 새 홈런',np.concatenate([
          old_bat,gap,bats['06-bat-crisp'],gap,old_home,gap,bats['07-homerun-bat-crisp']]),dict(kind='comparison',state='new_draft'))
    write('00-new-three','새 소리 · 마이크 → 우리 관객 우울 → 상대 치어리더 조롱',
          np.concatenate([mic,gap,new['03-home-fans-sad'],gap,new['05-rival-cheer-tease']]),dict(kind='comparison',state='new_draft'))
    write('00-all-roles','다섯 상황 이어 듣기',np.concatenate([
        mic,gap,reused['02-rival-fans-tease'],gap,new['03-home-fans-sad'],gap,
        reused['04-home-cheer-support'],gap,new['05-rival-cheer-tease']]),dict(kind='comparison',state='draft'))
    report=sorted(report,key=lambda x:x['id'])
    (a.out/'audio-checks.json').write_text(json.dumps(dict(integrated=False,tracks=report,
        retained_holds=['strike','out','homerun-fireworks'],
        subjective_listening='User review pending; no subjective listening claimed'),ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))


if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--previous',type=Path,required=True)
    p.add_argument('--deps',type=Path,action='append',default=[])
    p.add_argument('--fluidsynth',type=Path,required=True)
    p.add_argument('--soundfont',type=Path,required=True)
    main(p.parse_args())

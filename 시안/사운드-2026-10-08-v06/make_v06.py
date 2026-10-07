"""v06: mic hum, louder contacts, and a foreground trumpet taunt. Draft only."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

SR=44100
PPQ=960


def trumpet_score(mido):
    mid=mido.MidiFile(ticks_per_beat=PPQ)
    tempo=mido.MidiTrack();mid.tracks.append(tempo)
    tempo.extend([mido.MetaMessage('track_name',name='Rival cheer: cheeky trumpet'),
                  mido.MetaMessage('set_tempo',tempo=mido.bpm2tempo(132)),
                  mido.MetaMessage('time_signature',numerator=4,denominator=4)])
    tracks={}
    # GM zero-based: 56 Trumpet, 59 Muted Trumpet, 45 Pizzicato Strings.
    for channel,name,program,volume,pan in [(0,'trumpet',56,112,60),(1,'muted reply',59,75,80),
                                            (2,'bass',33,76,64),(3,'pizz',45,64,36),(9,'drums',0,68,64)]:
        track=mido.MidiTrack();mid.tracks.append(track)
        track.append(mido.MetaMessage('track_name',name=name))
        track.append(mido.Message('program_change',channel=channel,program=program))
        for control,value in [(7,volume),(10,pan),(91,28),(93,0)]:
            track.append(mido.Message('control_change',channel=channel,control=control,value=value))
        tracks[name]=(channel,track,[])
    def event(part,at,msg,order=1):
        tracks[part][2].append((round(at*PPQ),order,msg))
    def n(part,at,pitch,length,velocity,scoop=False,fall=False):
        channel=tracks[part][0]
        event(part,at,mido.Message('note_on',channel=channel,note=pitch,velocity=velocity),2)
        event(part,at+length,mido.Message('note_off',channel=channel,note=pitch,velocity=0),0)
        if scoop:
            for step,value in [(0,-2400),(.035,-1300),(.075,0)]:
                event(part,at+step,mido.Message('pitchwheel',channel=channel,pitch=value))
        if fall:
            for step,value in [(length*.50,0),(length*.66,-1400),(length*.80,-3400),(length*.95,-6100)]:
                event(part,at+step,mido.Message('pitchwheel',channel=channel,pitch=value))
        if scoop or fall:event(part,at+length+.005,mido.Message('pitchwheel',channel=channel,pitch=0))
    # Insistent repeated notes, chromatic side-step, then a deliberately smug fall.
    lead=[(0,79,.20,112),(.5,79,.17,108),(.875,80,.17,106),(1.25,79,.22,112),
          (1.75,76,.23,103),(2.5,74,.60,105),(4,79,.20,114),(4.5,77,.19,109),
          (4.875,76,.17,107),(5.25,75,.17,105),(5.625,74,.22,103),(6.25,74,.82,111)]
    for i,(at,pitch,length,vel) in enumerate(lead):
        n('trumpet',at,pitch,length,vel,scoop=i in [0,6],fall=i in [5,11])
    for at,pitch in [(3.25,71),(3.55,72),(3.8,71),(7.2,67)]:
        n('muted reply',at,pitch,.18,86,fall=at==7.2)
    for at,pitches in [(0,[55,59,62]),(1.5,[57,60,64]),(3,[55,59,65]),
                       (4,[53,57,60]),(5.5,[55,59,62]),(6.25,[55,59,62])]:
        for pitch in pitches:n('pizz',at,pitch,.22,69)
    for at,pitch in [(0,43),(1,50),(2,45),(3,43),(4,41),(5,50),(6.25,43)]:
        n('bass',at,pitch,.29,81)
    for at in [0,2,4,6.25]:n('drums',at,36,.08,73)
    for at in [1,3,5]:n('drums',at+.01,37,.08,76)
    for i in range(14):n('drums',i*.5,42,.06,45 if i%2 else 53)
    for at,pitch in [(5.75,76),(6,77),(6.25,76)]:n('drums',at,pitch,.07,64)
    for _,track,events in tracks.values():
        last=0
        for tick,_,msg in sorted(events,key=lambda x:(x[0],x[1])):
            track.append(msg.copy(time=tick-last));last=tick
        track.append(mido.MetaMessage('end_of_track',time=max(0,8*PPQ-last)))
    return mid


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
    def load(name):
        y,sr=sf.read(a.previous/'audio'/(name+'.wav'),always_2d=True)
        assert sr==SR
        return y
    def peak(y):return float(abs(resample_poly(y,4,1,axis=0)).max())
    def inspect(name,title,meta):
        y,sr=sf.read(audio/(name+'.wav'),always_2d=True)
        mp3,mp3sr=sf.read(audio/(name+'.mp3'),always_2d=True)
        assert sr==mp3sr==SR and y.shape[1]==mp3.shape[1]==2
        assert np.isfinite(y).all() and np.isfinite(mp3).all()
        assert abs(len(y)-len(mp3))<.15*SR
        assert .001<abs(y).max()<.96 and .001<abs(mp3).max()<.99
        assert peak(y)<.96 and abs(y[[0,-1]]).max()<.0001
        report.append(dict(id=name,title=title,seconds=round(len(y)/SR,3),
            peak_dbfs=round(float(20*np.log10(abs(y).max())),2),
            true_peak_4x_dbfs=round(float(20*np.log10(peak(y))),2),
            rms_dbfs=round(float(20*np.log10(np.sqrt(np.mean(y*y)))),2),
            sha256=hashlib.sha256((audio/(name+'.wav')).read_bytes()).hexdigest(),passed=True,**meta))
        return y
    def write(name,title,y,meta):
        if peak(y)>.92:y=y*(.89/peak(y))
        sf.write(audio/(name+'.wav'),y,SR,subtype='PCM_16')
        enc=lameenc.Encoder();enc.set_bit_rate(192);enc.set_in_sample_rate(SR);enc.set_channels(2);enc.set_quality(2)
        pcm=np.round(np.clip(y,-1,1)*32767).astype('<i2')
        (audio/(name+'.mp3')).write_bytes(enc.encode(pcm.tobytes())+enc.flush())
        return inspect(name,title,meta)

    old_mic=load('01-commentary-mic')
    mic=np.zeros((round(1.2*SR),2));mic[:len(old_mic)]+=old_mic
    t=np.arange(round(1.08*SR))/SR
    # Low, voiced electrical resonance: a slight upward opening, then settling down.
    frequency=126+42*np.exp(-t/0.19)+2.4*np.sin(2*np.pi*4.2*t)
    phase=np.cumsum(frequency)*2*np.pi/SR
    hum=(np.sin(phase)+.42*np.sin(phase*2+.12)+.14*np.sin(phase*3))
    envelope=(1-np.exp(-t/.065))*np.exp(-t*2.8)
    envelope*=1+.085*np.sin(2*np.pi*3.8*t)
    envelope[-round(.25*SR):]*=np.linspace(1,0,round(.25*SR))**1.5
    hum*=envelope*.48
    onset=round(.052*SR)
    mic[onset:onset+len(hum)]+=hum[:,None]
    dry=mic.copy()
    for delay,level in [(.037,.11),(.081,.07)]:
        shift=round(delay*SR);mic[shift:]+=dry[:-shift,::-1]*level
    mic*=min(1,.79/peak(mic));mic[-round(.025*SR):]*=np.linspace(1,0,round(.025*SR))[:,None]
    mic=write('01-commentary-mic-hum','중계진 · 딸깍, 우웅',mic,dict(state='new_draft',kind='sfx'))

    bats={};gains={}
    for old_name,name,title in [('06-bat-crisp','06-bat-louder','일반 타격 · 더 크게 딱!'),
                                ('07-homerun-bat-crisp','07-homerun-bat-louder','홈런 타격 · 더 크게 딱!')]:
        original=load(old_name)
        # Oversampled gentle saturation raises average impact level within peak headroom.
        up=resample_poly(original,4,1,axis=0)
        y=resample_poly(.90*np.tanh(up*2.65/.90),1,4,axis=0)[:len(original)]
        y*=min(1,.89/peak(y));y[0]=0;y[-1]=0
        active=round(.10*SR)
        gain=float(20*np.log10(np.sqrt(np.mean(y[:active]**2))/np.sqrt(np.mean(original[:active]**2))))
        assert gain>4.5
        gains[name]=round(gain,2)
        bats[name]=write(name,title,y,dict(state='new_draft',kind='sfx',first_100ms_rms_gain_db=round(gain,2),duration_preserved=True))

    mid=trumpet_score(mido);mid.save(midi_dir/'05-rival-cheer-trumpet.mid')
    with tempfile.TemporaryDirectory(prefix='haeche-v06-') as tmp:
        temp_mid=Path(tmp)/'score.mid';mid.save(temp_mid);temp_wav=Path(tmp)/'render.wav'
        subprocess.run([str(a.fluidsynth.resolve()),'-ni','-q','-r',str(SR),'-g','0.38',
            '-C','0','-R','1','-o','synth.reverb.room-size=0.34','-o','synth.reverb.damp=0.48',
            '-o','synth.reverb.width=0.6','-o','synth.reverb.level=0.22',
            '-F',str(temp_wav),'-T','wav','-O','float',str(a.soundfont.resolve()),str(temp_mid)],check=True,capture_output=True)
        trumpet,sr=sf.read(temp_wav,always_2d=True);assert sr==SR and abs(trumpet).max()>.01
        trumpet=trumpet[:5*SR]
        if len(trumpet)<5*SR:trumpet=np.pad(trumpet,((0,5*SR-len(trumpet)),(0,0)))
        trumpet=sosfilt(butter(2,38,btype='highpass',fs=SR,output='sos'),trumpet,axis=0)
        trumpet*=.185/max(np.sqrt(np.mean(trumpet**2)),1e-9)
        trumpet=.95*np.tanh(trumpet/.95)
        trumpet*=min(1,.86/peak(trumpet))
        trumpet[:round(.006*SR)]*=np.linspace(0,1,round(.006*SR))[:,None]
        trumpet[-round(.5*SR):]*=np.linspace(1,0,round(.5*SR))[:,None]
    trumpet=write('05-rival-cheer-trumpet','상대 치어리더 · 어머, 또요? 트럼펫',trumpet,
                  dict(state='new_draft',kind='bgm',bpm=132,lead='Trumpet / GM 56',reply='Muted Trumpet / GM 59'))
    for name,title in [('02-rival-fans-tease','상대 관객 · 관중석 한마디'),
                       ('03-home-fans-sad','우리 관객 · 또 놓쳤네…'),
                       ('04-home-cheer-support','우리 치어리더 · 다 같이 박수!')]:
        for ext in ['wav','mp3']:
            src=a.previous/'audio'/(name+'.'+ext);dst=audio/(name+'.'+ext)
            shutil.copy2(src,dst);assert src.read_bytes()==dst.read_bytes()
        inspect(name,title,dict(state='retained',kind='bgm',unchanged_copy=True))
    gap=np.zeros((round(.65*SR),2))
    write('00-mic-before-after','마이크 · 이전 → 클릭과 우웅',np.concatenate([old_mic,gap,mic]),dict(kind='comparison'))
    write('00-bat-before-after','일반 이전 → 큰 일반 → 홈런 이전 → 큰 홈런',np.concatenate([
        load('06-bat-crisp'),gap,bats['06-bat-louder'],gap,load('07-homerun-bat-crisp'),gap,bats['07-homerun-bat-louder']]),
        dict(kind='comparison',independent_normalization=False))
    write('00-trumpet-before-after','어머, 또요? · 이전 → 새 트럼펫',np.concatenate([
        load('05-rival-cheer-tease'),gap,trumpet]),dict(kind='comparison'))
    write('00-revised-all','수정본 · 마이크 → 일반 타격 → 홈런 타격 → 트럼펫',np.concatenate([
        mic,gap,bats['06-bat-louder'],gap,bats['07-homerun-bat-louder'],gap,trumpet]),dict(kind='comparison'))
    (a.out/'audio-checks.json').write_text(json.dumps(dict(integrated=False,bat_gain=gains,tracks=report,
        listening_review='Subjective review pending; objective decoding and waveform checks only'),ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps([{'id':r['id'],'seconds':r['seconds'],'peak':r['true_peak_4x_dbfs']} for r in report],ensure_ascii=False))
    print(json.dumps(gains))


if __name__=='__main__':
    p=argparse.ArgumentParser()
    for flag in ['out','previous','fluidsynth','soundfont']:p.add_argument('--'+flag,type=Path,required=True)
    p.add_argument('--deps',type=Path,action='append',default=[])
    main(p.parse_args())

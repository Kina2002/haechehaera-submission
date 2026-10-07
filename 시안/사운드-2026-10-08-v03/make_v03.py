"""Generic synthetic umpire calls and an edited public-domain fireworks recording.

Requires numpy/scipy/soundfile/imageio-ffmpeg and lameenc in supplied dependency dirs.
This script never writes into the game or previous sound drafts.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT=Path(__file__).resolve().parent
SR=44100


def main(deps,encoder_dir,out):
    sys.path.insert(0,str(deps.resolve()));sys.path.insert(0,str(encoder_dir.resolve()))
    import numpy as np
    import soundfile as sf
    import lameenc
    import imageio_ffmpeg
    from scipy.signal import butter,sosfilt,resample_poly,lfilter
    from scipy.ndimage import uniform_filter1d
    if out.exists():raise SystemExit('Use a new output directory; existing audio is preserved.')
    out.mkdir(parents=True)
    ff=imageio_ffmpeg.get_ffmpeg_exe()
    def load(path):
        y,sr=sf.read(path,always_2d=True)
        if sr!=SR:
            import math
            g=math.gcd(sr,SR);y=resample_poly(y,SR//g,sr//g,axis=0)
        if y.shape[1]==1:y=np.repeat(y,2,axis=1)
        return y
    def band(y,low,high):
        return sosfilt(butter(3,[low,high],btype='bandpass',fs=SR,output='sos'),y,axis=0)
    def stretch(y,factor):
        with tempfile.TemporaryDirectory(prefix='haeche-voice-') as d:
            p=Path(d);sf.write(p/'in.wav',y,SR,subtype='PCM_24')
            subprocess.run([ff,'-hide_banner','-loglevel','error','-i',str(p/'in.wav'),'-af',f'atempo={1/factor:.8f}',str(p/'out.wav')],check=True,capture_output=True)
            return load(p/'out.wav')
    def join(parts,overlap=.012):
        y=parts[0]
        for part in parts[1:]:
            n=min(round(overlap*SR),len(y),len(part))
            w=np.linspace(0,1,n)[:,None]
            y=np.concatenate([y[:-n],y[-n:]*(1-w)+part[:n]*w,part[n:]])
        return y
    def master(y,peak=.85):
        y=np.asarray(y,dtype=float)
        y-=y.mean(axis=0)
        y*=peak/max(np.max(np.abs(y)),1e-9)
        n=min(round(.006*SR),len(y)//2)
        y[:n]*=np.linspace(0,1,n)[:,None];y[-n:]*=np.linspace(1,0,n)[:,None]
        true_peak=np.max(np.abs(resample_poly(y,4,1,axis=0)))
        if true_peak>.91:y*=.91/true_peak
        return y
    def voice(name,kind):
        y=load(ROOT/'sources'/(name+'.mp3'))
        power=uniform_filter1d(np.mean(y*y,axis=1),round(.01*SR))
        indices=np.where(power>power.max()*.0025)[0]
        start=max(0,indices[0]-round(.045*SR));end=min(len(y),indices[-1]+round(.055*SR))
        y=y[start:end]
        if kind=='strike':
            # Lengthen the early vowel region while retaining the end consonants.
            a=round(len(y)*.18);b=round(len(y)*.52)
            y=join([y[:a],stretch(y[a:b],1.78),y[b:]])
        else:
            y=stretch(y,1.13)
        y=band(y,105,9000)
        y+=band(y,1600,3700)*.60
        y/=max(np.max(np.abs(y)),1e-9)
        # Parallel saturation and mild compression give projection without replacing speech.
        y=.70*y+.30*np.tanh(y*2.4)/np.tanh(2.4)
        envelope=np.sqrt(uniform_filter1d(np.mean(y*y,axis=1),round(.020*SR))+1e-12)
        gain=np.minimum(1,(.18/np.maximum(envelope,.18))**.45)
        gain=lfilter([.08],[1,-.92],gain)
        y*=gain[:,None]
        y=np.pad(y,((round(.035*SR),round(.18*SR)),(0,0)))
        dry=y.copy()
        for delay,level in [(.034,.055),(.071,.035),(.112,.018)]:
            n=round(delay*SR);y[n:]+=dry[:-n,::-1]*level
        return master(y,.86)
    def fireworks():
        p=ROOT/'sources/fireworks-source.wav'
        if not p.exists():
            subprocess.run([ff,'-hide_banner','-loglevel','error','-i',str(ROOT/'sources/fireworks-piece-stephan.ogg'),'-map','0:a:0','-ar',str(SR),'-ac','2',str(p)],check=True,capture_output=True)
        original=load(p)
        y=original[round(43.35*SR):round(50.85*SR)].copy()
        y=band(y,36,15500)
        y+=band(y,48,210)*1.35
        y+=band(y,2100,7000)*.22
        # Bring up the real spreading crackles between bursts, preserving the stereo recording.
        envelope=np.sqrt(uniform_filter1d(np.mean(y*y,axis=1),round(.028*SR))+1e-12)
        gain=np.minimum(1,(.055/np.maximum(envelope,.055))**.50)
        y*=gain[:,None]
        y*=.26/max(np.sqrt(np.mean(y*y)),1e-9)
        # Control isolated recording spikes so the spreading fireworks stay full.
        y=np.tanh(y*1.20)
        fade=round(.65*SR)
        y[:round(.012*SR)]*=np.linspace(0,1,round(.012*SR))[:,None]
        y[-fade:]*=np.linspace(1,0,fade)[:,None]
        y=np.pad(y,((round(.04*SR),round(.10*SR)),(0,0)))
        return master(y,.88)
    manifest=[]
    def save(name,title,y,source):
        sf.write(out/(name+'.wav'),y,SR,subtype='PCM_16')
        pcm=np.round(np.clip(y,-1,1)*32767).astype('<i2')
        enc=lameenc.Encoder();enc.set_bit_rate(192);enc.set_in_sample_rate(SR);enc.set_channels(2);enc.set_quality(2)
        (out/(name+'.mp3')).write_bytes(enc.encode(pcm.tobytes())+enc.flush())
        assert np.isfinite(y).all() and .005<np.max(np.abs(y))<.95
        assert np.abs(y[[0,-1]]).max()<1e-8
        decoded=load(out/(name+'.mp3'))
        assert len(decoded)>len(y)*.9 and np.max(np.abs(decoded))>.005
        manifest.append({'id':name,'title':title,'seconds':round(len(y)/SR,3),'source':source,
                         'peak_dbfs':round(float(20*np.log10(np.max(np.abs(y)))),2),
                         'rms_dbfs':round(float(20*np.log10(np.sqrt(np.mean(y*y))))),
                         'sha256':hashlib.sha256((out/(name+'.wav')).read_bytes()).hexdigest(),'passed':True})
    strike=voice('strike-hyunsu','strike');out_call=voice('out-hyunsu','out');boom=fireworks()
    save('01-strike-voice','스트~라이크! · 심판 목소리',strike,'Microsoft Edge TTS / ko-KR-HyunsuMultilingualNeural, duration and dynamics edit')
    save('02-out-voice','아웃! · 심판 목소리',out_call,'Microsoft Edge TTS / ko-KR-HyunsuMultilingualNeural, dynamics edit')
    save('03-fireworks-show','홈런 · 실제 불꽃놀이',boom,'Fireworks Piece / stephan / public domain / 43.35–50.85 sec excerpt, EQ and dynamics edit')
    save('04-strike-english','Strike! · 영어 발성 비교',voice('strike-guy','strike'),'Microsoft Edge TTS / en-US-GuyNeural, duration and dynamics edit')
    save('05-out-english','Out! · 영어 발성 비교',voice('out-guy','out'),'Microsoft Edge TTS / en-US-GuyNeural, dynamics edit')
    gap=np.zeros((round(.65*SR),2))
    all_new=np.concatenate([strike,gap,out_call,gap,boom])
    save('00-new-three','새 시안 세 가지 이어 듣기',all_new,'New Korean calls followed by fireworks')
    before=load(ROOT.parent/'사운드-2026-10-08-v02/audio/10-fireworks-homerun.wav')
    save('06-fireworks-before-after','홈런 폭죽 · 수정 전후',np.concatenate([before,gap,boom]),'Previous synthesized v02 followed by recorded v03')
    (ROOT/'audio-checks.json').write_text(json.dumps({'draft':True,'integrated':False,'tracks':manifest},ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps(manifest,ensure_ascii=False))


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--deps',type=Path,required=True);p.add_argument('--encoder-dir',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
    a=p.parse_args();main(a.deps,a.encoder_dir,a.out)

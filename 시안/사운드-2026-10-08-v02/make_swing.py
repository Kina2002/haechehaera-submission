"""Short, low/mid air rush for a swinging bat, without a sustained hiss."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import sys
import wave
import numpy as np

ROOT=Path(__file__).resolve().parent
SR=44100


def read(p):
    with wave.open(str(p),'rb') as w:
        assert (w.getnchannels(),w.getsampwidth(),w.getframerate())==(2,2,SR)
        return np.frombuffer(w.readframes(w.getnframes()),'<i2').reshape(-1,2).astype(float)/32768


def save(p,a,lameenc):
    pcm=np.round(a*32767).astype('<i2')
    with wave.open(str(p.with_suffix('.wav')),'wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
    e=lameenc.Encoder();e.set_bit_rate(192);e.set_in_sample_rate(SR);e.set_channels(2);e.set_quality(2)
    p.with_suffix('.mp3').write_bytes(e.encode(pcm.tobytes())+e.flush())


def high_ratio(a):
    power=np.abs(np.fft.rfft(a.mean(axis=1)))**2
    f=np.fft.rfftfreq(len(a),1/SR)
    return float(power[f>=4000].sum()/power.sum())


def main(out,encoder_dir):
    names=['03-old-swing','04-short-swing','00-swing-before-after']
    for name in names:
        for ext in ['.wav','.mp3']:
            if (out/(name+ext)).exists():
                raise SystemExit('Choose a new output directory; existing audio is preserved.')
    out.mkdir(parents=True,exist_ok=True)
    sys.path.insert(0,str(encoder_dir.resolve()))
    import lameenc
    previous=ROOT.parent/'사운드-2026-10-08-v01/audio'
    old=read(previous/'sfx-whoosh.wav')
    for ext in ['wav','mp3']:
        shutil.copyfile(previous/f'sfx-whoosh.{ext}',out/f'03-old-swing.{ext}')
    d=.175
    n=round(d*SR)
    t=np.arange(n)/SR
    u=t/d
    rng=np.random.default_rng(2026100803)
    raw=rng.standard_normal(n)
    spectrum=np.fft.rfft(raw)
    f=np.fft.rfftfreq(n,1/SR)
    def band(center,width):
        a=np.fft.irfft(spectrum*np.exp(-.5*((f-center)/width)**2),n=n)
        return a/max(np.sqrt(np.mean(a*a)),1e-9)
    # Broad moving air, no sine whistle and practically no high-frequency hiss.
    upper=band(1250,490)
    lower=band(400,270)
    body=band(190,115)
    blend=u**.7
    rush=(upper*(1-blend)+lower*blend+.12*body)
    envelope=np.sin(np.pi*u)**1.6 * np.exp(-u*.8)
    rush*=envelope
    angle=np.pi/4+(.50*u-.25)
    moving=np.column_stack([rush*np.cos(angle),rush*np.sin(angle)])
    new=np.zeros((round(.33*SR),2))
    at=round(.012*SR)
    new[at:at+n]=moving
    new*=.70/np.max(np.abs(new))
    save(out/'04-short-swing',new,lameenc)
    gap=np.zeros((round(.65*SR),2))
    compare=np.concatenate([np.zeros((round(.15*SR),2)),old,gap,new,gap,old,gap,new,gap])
    save(out/'00-swing-before-after',compare,lameenc)
    checks={'draft':True,'integrated':False,'order':['수정 전','수정 후','수정 전','수정 후'],
            'original_preserved':hashlib.sha256((previous/'sfx-whoosh.wav').read_bytes()).digest()==hashlib.sha256((out/'03-old-swing.wav').read_bytes()).digest(),
            'old_high_frequency_energy_ratio':round(high_ratio(old),6),
            'new_high_frequency_energy_ratio':round(high_ratio(new),6),'checks':[]}
    assert checks['original_preserved'] and high_ratio(new)<high_ratio(old)*.1
    for name in names:
        a=read(out/(name+'.wav'))
        assert np.isfinite(a).all() and .01<np.max(np.abs(a))<.99
        assert np.max(np.abs(a[[0,-1]]))==0
        checks['checks'].append({'file':name+'.wav','seconds':round(len(a)/SR,3),'passed':True})
    (ROOT/'swing-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps(checks,ensure_ascii=False))


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);p.add_argument('--encoder-dir',type=Path,required=True)
    a=p.parse_args();main(a.out,a.encoder_dir)

"""Standalone home-run contact draft; preserves the first audition and game."""
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


def read_wav(p):
    with wave.open(str(p),'rb') as w:
        assert (w.getnchannels(),w.getsampwidth(),w.getframerate())==(2,2,SR)
        return np.frombuffer(w.readframes(w.getnframes()),'<i2').reshape(-1,2).astype(float)/32768


def save(p,a,encoder):
    pcm=np.round(a*32767).astype('<i2')
    with wave.open(str(p.with_suffix('.wav')),'wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
    e=encoder.Encoder();e.set_bit_rate(192);e.set_in_sample_rate(SR);e.set_channels(2);e.set_quality(2)
    p.with_suffix('.mp3').write_bytes(e.encode(pcm.tobytes())+e.flush())


def band_ratio(a):
    # Compare the first 150 ms of contact: presence (2–6 kHz) against low/mid body.
    x=a[:round(.15*SR)].mean(axis=1)
    power=np.abs(np.fft.rfft(x))**2
    f=np.fft.rfftfreq(len(x),1/SR)
    return float(10*np.log10(power[(f>=2000)&(f<6000)].sum()/power[(f>=200)&(f<2000)].sum()))


def main(out,encoder_dir):
    if out.exists():
        raise SystemExit('Choose a new output directory; existing audio is preserved.')
    sys.path.insert(0,str(encoder_dir.resolve()))
    import lameenc
    out.mkdir(parents=True)
    previous=ROOT.parent/'사운드-2026-10-08-v01/audio'
    ordinary=read_wav(previous/'sfx-bat.wav')
    for ext in ['wav','mp3']:
        shutil.copyfile(previous/f'sfx-bat.{ext}',out/f'01-normal-contact.{ext}')

    t=np.arange(round(.22*SR))/SR
    rng=np.random.default_rng(2026100802)
    raw=rng.standard_normal(len(t))
    f=np.fft.rfftfreq(len(t),1/SR)
    shape=np.exp(-.5*((f-4300)/1700)**2)
    crack=np.fft.irfft(np.fft.rfft(raw)*shape,n=len(t))
    crack/=np.sqrt(np.mean(crack*crack))
    y=.48*crack*np.exp(-t*185)
    # Brief inharmonic wood resonances, without a sustained metallic ringing note.
    for hz,gain,decay in [(680,.15,90),(1650,.65,68),(2850,.88,78),(4350,.43,125)]:
        y+=gain*np.sin(2*np.pi*hz*t)*np.exp(-t*decay)
    attack=round(.00045*SR)
    y[:attack]*=np.linspace(0,1,attack)
    y[-round(.015*SR):]*=np.linspace(1,0,round(.015*SR))
    home=np.zeros((round(.55*SR),2))
    at=round(.015*SR)
    home[at:at+len(y),:]=y[:,None]*.707
    # A very small early field reflection adds space while keeping the attack dry.
    for delay,gains in [(.026,(.06,.04)),(.043,(.025,.04))]:
        d=at+round(delay*SR)
        home[d:d+len(y)]+=y[:,None]*np.array(gains)[None,:]
    active=round(.15*SR)
    target=np.sqrt(np.mean(ordinary[:active]**2))
    home*=min(.80/np.max(np.abs(home)),target*1.10/np.sqrt(np.mean(home[:active]**2)))
    save(out/'02-homerun-contact',home,lameenc)
    # Same nominal playback gain, with generous gaps for an easy A/B comparison.
    gap=np.zeros((round(.65*SR),2))
    start=np.zeros((round(.15*SR),2))
    comparison=np.concatenate([start,ordinary,gap,home,gap,ordinary,gap,home,gap])
    save(out/'00-normal-then-homerun',comparison,lameenc)

    report={'draft':True,'integrated':False,'order':['일반 타격','홈런 타격','일반 타격','홈런 타격'],
            'normal_sha256':hashlib.sha256((out/'01-normal-contact.wav').read_bytes()).hexdigest(),
            'source_sha256':hashlib.sha256((previous/'sfx-bat.wav').read_bytes()).hexdigest(),
            'normal_presence_db':round(band_ratio(ordinary),2),'homerun_presence_db':round(band_ratio(home),2),
            'checks':[]}
    assert report['normal_sha256']==report['source_sha256']
    assert band_ratio(home)>band_ratio(ordinary)+3
    for name in ['01-normal-contact','02-homerun-contact','00-normal-then-homerun']:
        a=read_wav(out/(name+'.wav'))
        assert np.isfinite(a).all() and .01<np.max(np.abs(a))<.99
        assert np.max(np.abs(a[[0,-1]]))==0
        report['checks'].append({'file':name+'.wav','seconds':round(len(a)/SR,3),
                                'peak_dbfs':round(float(20*np.log10(np.max(np.abs(a)))),2),'passed':True})
    (ROOT/'audio-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps(report,ensure_ascii=False))


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);p.add_argument('--encoder-dir',type=Path,required=True)
    args=p.parse_args();main(args.out,args.encoder_dir)

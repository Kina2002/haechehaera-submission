"""Punchier calls and a synthesized fireworks home-run celebration. Draft only."""
import argparse
import json
from pathlib import Path
import shutil
import sys
import numpy as np
from make_swing import read, save

ROOT=Path(__file__).resolve().parent
SR=44100
RNG=np.random.default_rng(2026100804)


def noise(seconds,center=None,width=700):
    n=round(seconds*SR);x=RNG.standard_normal(n)
    if center is not None:
        f=np.fft.rfftfreq(n,1/SR)
        x=np.fft.irfft(np.fft.rfft(x)*np.exp(-.5*((f-center)/width)**2),n=n)
    return x/max(np.sqrt(np.mean(x*x)),1e-9)


def add(dst,x,start,gain=1,pan=0):
    at=round(start*SR)
    if x.ndim==1:
        angle=(pan+1)*np.pi/4
        x=np.column_stack([x*np.cos(angle),x*np.sin(angle)])
    n=min(len(x),len(dst)-at)
    dst[at:at+n]+=x[:n]*gain


def impact(seconds=.35,low=105):
    t=np.arange(round(seconds*SR))/SR
    phase=2*np.pi*(low*t+140*.018*(1-np.exp(-t/.018)))
    y=.7*np.sin(phase)*np.exp(-t*20)+noise(seconds,2200,1200)*.45*np.exp(-t*64)
    y+=noise(seconds,680,430)*.22*np.exp(-t*30)
    y[:22]*=np.linspace(0,1,22)
    y[-200:]*=np.linspace(1,0,200)
    return y


def brass(frequency,seconds,fall=0):
    t=np.arange(round(seconds*SR))/SR
    phase=2*np.pi*(frequency*t+fall*t*t/2)
    y=sum(np.sin(phase*k)/k**1.2 for k in range(1,8))
    envelope=np.exp(-t*7)
    envelope[:round(.004*SR)]*=np.linspace(0,1,round(.004*SR))
    envelope[-round(.035*SR):]*=np.linspace(1,0,round(.035*SR))
    return y*envelope


def finish(a,space=False):
    dry=a.copy()
    for delay,gain in ([(.073,.14),(.131,.095),(.207,.07),(.323,.035)] if space else [(.046,.075),(.081,.04)]):
        k=round(delay*SR);a[k:]+=dry[:-k,::-1]*gain
    a*=min(.79/np.max(np.abs(a)),.18/max(np.sqrt(np.mean(a*a)),1e-9))
    k=round(.004*SR)
    a[:k]*=np.linspace(0,1,k)[:,None];a[-k:]*=np.linspace(1,0,k)[:,None]
    return a


def make_strike():
    a=np.zeros((round(.62*SR),2))
    add(a,impact(.35,145),.01,.60)
    add(a,brass(784,.30,-100),.014,.34,-.13)
    add(a,brass(392,.24,-35),.014,.15,.13)
    return finish(a)


def make_out():
    a=np.zeros((round(.85*SR),2))
    add(a,impact(.43,78),.01,.67)
    add(a,brass(294,.34,-70),.014,.30,-.18)
    add(a,brass(147,.45,-25),.014,.30,.18)
    # A second, lower stamp resolves the call with a firm end.
    add(a,impact(.27,65),.24,.22)
    return finish(a)


def make_fireworks():
    a=np.zeros((round(4.0*SR),2))
    t=np.arange(round(.39*SR))/SR
    launch=noise(.39,1200,700)*np.sin(np.pi*t/.39)**1.5
    add(a,launch,.02,.055,-.2)
    for at,pan,gain in [(.43,-.3,1),(1.12,.48,.83),(1.80,-.48,.88),(2.38,.15,1.10)]:
        t=np.arange(round(.76*SR))/SR
        boom=np.sin(2*np.pi*(55*t+75*.031*(1-np.exp(-t/.031))))*np.exp(-t*9)
        bloom=noise(.76,1250,950)*np.exp(-t*11)*.23
        crack=noise(.76,4500,2400)*np.exp(-t*110)*.46
        burst=(boom*.55+bloom+crack)
        burst[:18]*=np.linspace(0,1,18);burst[-300:]*=np.linspace(1,0,300)
        add(a,burst,at,gain*.45,pan)
        # Scattered sparks after each burst, spread across the stereo field.
        for j in range(14):
            d=.020+RNG.random()*.023
            tt=np.arange(round(d*SR))/SR
            spark=noise(d,3500+RNG.random()*2000,1600)*np.exp(-tt*(140+RNG.random()*100))
            spark[:12]*=np.linspace(0,1,12);spark[-60:]*=np.linspace(1,0,60)
            when=at+.045+j*.038+RNG.random()*.022
            add(a,spark,when,.04+RNG.random()*.055,float(RNG.uniform(-.85,.85)))
    return finish(a,True)


def main(out,encoder_dir):
    sys.path.insert(0,str(encoder_dir.resolve()))
    import lameenc
    previous=ROOT.parent/'사운드-2026-10-08-v01/audio'
    configs=[('strike','05-old-strike','06-strong-strike','00-strike-before-after',make_strike),
             ('out','07-old-out','08-strong-out','00-out-before-after',make_out),
             ('homerun','09-old-homerun','10-fireworks-homerun','00-homerun-before-after',make_fireworks)]
    for _,old_id,new_id,compare_id,_ in configs:
        for name in [old_id,new_id,compare_id]:
            for ext in ['.wav','.mp3']:
                if (out/(name+ext)).exists():raise SystemExit('Output already exists: '+name+ext)
    checks=[]
    for kind,old_id,new_id,compare_id,factory in configs:
        old=read(previous/('sfx-'+kind+'.wav'));new=factory()
        for ext in ['wav','mp3']:
            shutil.copyfile(previous/f'sfx-{kind}.{ext}',out/f'{old_id}.{ext}')
        save(out/new_id,new,lameenc)
        gap=np.zeros((round(.65*SR),2))
        compare=np.concatenate([np.zeros((round(.15*SR),2)),old,gap,new,gap])
        save(out/compare_id,compare,lameenc)
        for name in [old_id,new_id,compare_id]:
            a=read(out/(name+'.wav'))
            assert np.isfinite(a).all() and .01<np.max(np.abs(a))<.99
            assert np.max(np.abs(a[[0,-1]]))==0
            checks.append({'file':name+'.wav','seconds':round(len(a)/SR,3),
                           'peak_dbfs':round(float(20*np.log10(np.max(np.abs(a)))),2),'passed':True})
    (ROOT/'impact-checks.json').write_text(json.dumps({'draft':True,'integrated':False,'checks':checks},ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps(checks,ensure_ascii=False))


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);p.add_argument('--encoder-dir',type=Path,required=True)
    a=p.parse_args();main(a.out,a.encoder_dir)

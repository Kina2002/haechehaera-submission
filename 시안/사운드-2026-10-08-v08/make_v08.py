"""Cut licensed actor recordings into three calls, with natural/full A/B versions."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

SR=44100

def main(a):
    for dep in a.deps: sys.path.insert(0,str(dep.resolve()))
    import numpy as np
    import soundfile as sf
    import lameenc
    from scipy.signal import butter,sosfilt,resample_poly
    source,rate=sf.read(a.source,always_2d=True)
    assert rate==SR and source.shape[1]==2
    cuts=json.loads(a.cuts.read_text(encoding='utf-8'))
    a.out.mkdir(parents=True,exist_ok=False)
    audio=a.out/'audio';audio.mkdir()
    rows=[];buffers={}
    def peak(y): return float(abs(resample_poly(y,4,1,axis=0)).max())
    def rms(y): return float(np.sqrt(np.mean(y*y)))
    def band(y,low,high):
        return sosfilt(butter(2,[low,high],btype='bandpass',fs=SR,output='sos'),y,axis=0)
    def boundary(y):
        n=round(.005*SR);y[:n]*=np.linspace(0,1,n)[:,None]
        n=round(.018*SR);y[-n:]*=np.linspace(1,0,n)[:,None]
        return np.pad(y,((round(.025*SR),round(.06*SR)),(0,0)))
    def save(key,title,y,meta):
        assert np.isfinite(y).all() and peak(y)<.90
        sf.write(audio/(key+'.wav'),y,SR,subtype='PCM_16')
        enc=lameenc.Encoder();enc.set_bit_rate(192);enc.set_in_sample_rate(SR);enc.set_channels(2);enc.set_quality(2)
        (audio/(key+'.mp3')).write_bytes(enc.encode(np.round(y*32767).astype('<i2').tobytes())+enc.flush())
        wav,wsr=sf.read(audio/(key+'.wav'),always_2d=True)
        mp3,msr=sf.read(audio/(key+'.mp3'),always_2d=True)
        assert wsr==msr==SR and wav.shape[1]==mp3.shape[1]==2
        assert np.isfinite(mp3).all() and abs(len(mp3)-len(wav))<.15*SR
        assert .001<abs(mp3).max()<.99 and abs(wav[[0,-1]]).max()<.0001
        rows.append(dict(id=key,title=title,seconds=round(len(wav)/SR,3),
            peak_4x_dbfs=round(20*np.log10(peak(wav)),2),rms_dbfs=round(20*np.log10(rms(wav)),2),
            sha256=hashlib.sha256((audio/(key+'.wav')).read_bytes()).hexdigest(),passed=True,**meta))
        buffers[key]=wav
    for cut in cuts:
        key=cut['id'];title=cut['title']
        raw=source[round(cut['start']*SR):round(cut['end']*SR)].copy()
        assert len(raw)>.20*SR
        raw-=raw.mean(axis=0)
        natural=band(raw,75,10500)
        full=natural+band(natural,130,360)*.78+band(natural,1400,3100)*.14
        # Keep the actual human timing/pitch. Mild parallel saturation adds body.
        full/=max(abs(full).max(),1e-9)
        full=.70*full+.30*np.tanh(full*1.8)/np.tanh(1.8)
        versions=[boundary(natural),boundary(full)]
        versions=[y*(.22/rms(y)) for y in versions]
        gain=min(1,.86/max(peak(y) for y in versions))
        versions=[y*gain for y in versions]
        assert abs(20*np.log10(rms(versions[0])/rms(versions[1])))<.01
        for version,label,y in zip(['a','b'],['원래 발성','굵고 힘 있게'],versions):
            save(key+'-'+version,title+' / '+label,y,dict(kind='call',version=version,
                source_excerpt_seconds=[cut['start'],cut['end']],spoken_word=cut['word'],
                pitch_changed=False,time_stretched=False,source='jcookvoice / CC0 1.0',
                comparison_rms_matched=True))
    gap=np.zeros((round(.55*SR),2))
    for version in ['a','b']:
        save('00-'+version+'-three',version.upper()+' 판정 세 가지',np.concatenate([
            buffers['strike-'+version],gap,buffers['out-'+version],gap,buffers['safe-'+version]]),dict(kind='comparison'))
    for cut in cuts:
        key=cut['id']
        save(key+'-ab',cut['title']+' A → B',np.concatenate([buffers[key+'-a'],gap,buffers[key+'-b']]),dict(kind='comparison'))
    (a.out/'audio-checks.json').write_text(json.dumps(dict(draft=True,integrated=False,tracks=rows,
        listening_review='Subjective listening review is pending; checks cover decoding and waveform properties.'),
        ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps([dict(id=r['id'],seconds=r['seconds'],rms_dbfs=r['rms_dbfs'],peak_dbfs=r['peak_4x_dbfs']) for r in rows],ensure_ascii=False))

if __name__=='__main__':
    p=argparse.ArgumentParser()
    for flag in ['source','cuts','out']:p.add_argument('--'+flag,type=Path,required=True)
    p.add_argument('--deps',type=Path,action='append',default=[])
    main(p.parse_args())

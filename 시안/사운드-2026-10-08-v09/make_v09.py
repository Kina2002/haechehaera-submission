"""Master AI-generated calls; retain original Safe A/B bytes for comparison."""
import argparse
import hashlib
import json
from math import gcd
from pathlib import Path
import shutil
import sys

SR = 44100


def main(a):
    for dep in a.deps:
        sys.path.insert(0, str(dep.resolve()))
    import numpy as np
    import soundfile as sf
    import lameenc
    from scipy.signal import butter, sosfilt, resample_poly
    from scipy.ndimage import uniform_filter1d, maximum_filter1d

    reference, sr = sf.read(a.previous/'audio/safe-b.wav', always_2d=True)
    assert sr == SR
    a.out.mkdir(parents=True, exist_ok=False)
    audio = a.out/'audio'
    audio.mkdir()
    rows, buffers = [], {}

    def peak(y):
        return float(abs(resample_poly(y, 4, 1, axis=0)).max())

    def inspect(key, title, meta):
        wav, sr = sf.read(audio/(key+'.wav'), always_2d=True)
        mp3, msr = sf.read(audio/(key+'.mp3'), always_2d=True)
        assert sr == msr == SR and wav.shape[1] == mp3.shape[1] == 2
        assert np.isfinite(wav).all() and np.isfinite(mp3).all()
        assert abs(len(wav)-len(mp3)) < .15*SR and abs(mp3).max() < .99
        assert .001 < peak(wav) < .90 and abs(wav[[0, -1]]).max() < .0001
        rows.append(dict(id=key, title=title, seconds=round(len(wav)/SR, 3),
            peak_4x_dbfs=round(20*np.log10(peak(wav)), 2),
            rms_dbfs=round(20*np.log10(np.sqrt(np.mean(wav*wav))), 2),
            sha256=hashlib.sha256((audio/(key+'.wav')).read_bytes()).hexdigest(),
            passed=True, **meta))
        buffers[key] = wav

    def save(key, title, y, meta):
        sf.write(audio/(key+'.wav'), y, SR, subtype='PCM_16')
        enc = lameenc.Encoder()
        enc.set_bit_rate(192)
        enc.set_in_sample_rate(SR)
        enc.set_channels(2)
        enc.set_quality(2)
        (audio/(key+'.mp3')).write_bytes(
            enc.encode(np.round(y*32767).astype('<i2').tobytes())+enc.flush())
        inspect(key, title, meta)

    for key, title, path in [('strike-new', '새 스트라이크', a.strike),
                             ('out-new', '새 아웃', a.out_call)]:
        y, sr = sf.read(path, always_2d=True)
        if y.shape[1] == 1:
            y = np.repeat(y, 2, axis=1)
        divisor = gcd(sr, SR)
        y = resample_poly(y, SR//divisor, sr//divisor, axis=0)
        y -= y.mean(axis=0)
        y = sosfilt(butter(2, 65, btype='highpass', fs=SR, output='sos'), y, axis=0)
        envelope = np.sqrt(np.maximum(0, uniform_filter1d(np.mean(y*y, axis=1), round(.012*SR))))
        active = np.flatnonzero(envelope > envelope.max()*.02)
        start = max(0, active[0]-round(.035*SR))
        end = min(len(y), active[-1]+round(.07*SR))
        y = y[start:end]
        fade = min(round(.008*SR), len(y)//4)
        y[:fade] *= np.linspace(0, 1, fade)[:, None]
        fade = min(round(.025*SR), len(y)//4)
        y[-fade:] *= np.linspace(1, 0, fade)[:, None]
        y = np.pad(y, ((round(.04*SR), round(.05*SR)), (0, 0)))
        y *= np.sqrt(np.mean(reference**2))/max(np.sqrt(np.mean(y*y)), 1e-9)
        # Short generated plosives otherwise force down the entire word's volume.
        # Use 3 ms look-ahead, instant attack and a 35 ms release, without clipping.
        level = maximum_filter1d(np.max(abs(y), axis=1), round(.006*SR)|1)
        release = np.exp(-1/(.035*SR))
        held = 0.0
        for i in range(len(level)):
            held = max(level[i], held*release)
            level[i] = held
        gain = np.minimum(1, (.30/np.maximum(level, 1e-9))**.75)
        y *= gain[:, None]
        y *= np.sqrt(np.mean(reference**2))/max(np.sqrt(np.mean(y*y)), 1e-9)
        y *= min(1, .84/peak(y))
        save(key, title, y, dict(state='new_draft', ai_generated=True,
            source_file=path.name, source_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
            removed_outer_silence_seconds=[start/SR, (len(envelope)-end)/SR],
            speed_change=False, pitch_change=False, reference='v08 safe-b',
            compressor=dict(ratio=4, threshold=.30, lookahead_ms=3, release_ms=35,
                            minimum_gain_db=round(20*np.log10(gain.min()), 2))))

    for key, title in [('safe-b', '세이프 B · 기준 그대로'), ('safe-a', '세이프 A · 그대로')]:
        for ext in ['wav', 'mp3']:
            src = a.previous/'audio'/(key+'.'+ext)
            dst = audio/src.name
            shutil.copy2(src, dst)
            assert src.read_bytes() == dst.read_bytes()
        inspect(key, title, dict(state='retained_reference', unchanged_copy=True, selected=False))

    gap = np.zeros((round(.60*SR), 2))
    save('00-safe-strike-out', '세이프 → 새 스트라이크 → 새 아웃',
         np.concatenate([buffers['safe-b'], gap, buffers['strike-new'], gap, buffers['out-new']]),
         dict(kind='comparison'))
    for key, title in [('strike', '스트라이크'), ('out', '아웃')]:
        before, sr = sf.read(a.previous/'audio'/(key+'-b.wav'), always_2d=True)
        assert sr == SR
        save(key+'-before-after', title+' 이전 → 새 시안',
             np.concatenate([before, gap, buffers[key+'-new']]), dict(kind='comparison'))
    (a.out/'audio-checks.json').write_text(json.dumps(dict(draft=True, integrated=False,
        safe_reference_unchanged=True, reference_choice='v08 default B; A retained too',
        tracks=rows,
        listening_review='Word clarity, voice similarity and preference need user listening; signal checks only.'),
        ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(rows, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    for flag in ['previous', 'out', 'strike', 'out-call']:
        p.add_argument('--'+flag, type=Path, required=True)
    p.add_argument('--deps', type=Path, action='append', default=[])
    main(p.parse_args())

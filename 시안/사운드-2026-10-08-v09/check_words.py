"""Optional ASR screen for wrong/missing words; not a listening evaluation."""
import argparse
import json
import os
from pathlib import Path
import sys

p = argparse.ArgumentParser()
for flag in ['deps', 'cache', 'source', 'out']:
    p.add_argument('--'+flag, type=Path, required=True)
a = p.parse_args()
sys.path.insert(0, str(a.deps.resolve()))
os.environ['HF_HUB_DISABLE_PROGRESS_BARS'] = '1'
import av
import numpy as np
from faster_whisper import WhisperModel

model = WhisperModel('small.en', device='cpu', compute_type='int8', cpu_threads=4,
                     download_root=str(a.cache.resolve()))
results = []
for path in sorted(a.source.glob('*.wav')):
    if not path.name.startswith(('strike-', 'out-')):
        continue
    resampler = av.AudioResampler(format='flt', layout='mono', rate=16000)
    frames = []
    with av.open(str(path)) as container:
        for frame in container.decode(audio=0):
            frames.extend(x.to_ndarray().reshape(-1) for x in resampler.resample(frame))
        frames.extend(x.to_ndarray().reshape(-1) for x in resampler.resample(None))
    samples = np.concatenate(frames)
    samples *= min(1, .85/max(np.max(np.abs(samples)), 1e-9))
    segments, info = model.transcribe(samples, language='en', beam_size=5,
                                      word_timestamps=True, condition_on_previous_text=False)
    rows = [dict(start=s.start, end=s.end, text=s.text,
                 words=[dict(word=w.word, start=w.start, end=w.end, probability=w.probability)
                        for w in s.words]) for s in segments]
    result = dict(file=path.name, transcript=' '.join(r['text'].strip() for r in rows), segments=rows)
    print(json.dumps(result), flush=True)
    results.append(result)
a.out.write_text(json.dumps(dict(model='faster-whisper small.en', automated=True,
    note='No target-word prompt used. Word screening only; timbre, similarity, force and preference need listening.',
    results=results), ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

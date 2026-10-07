"""Optional local speech recognition to check edit boundaries, not listening QA."""
import argparse
import json
import os
from pathlib import Path
import sys

p=argparse.ArgumentParser()
p.add_argument('--deps',type=Path,required=True)
p.add_argument('--source',type=Path,required=True)
p.add_argument('--out',type=Path,required=True)
p.add_argument('--cache',type=Path,required=True)
p.add_argument('--model',default='base.en')
a=p.parse_args()
sys.path.insert(0,str(a.deps.resolve()))
os.environ['HF_HUB_DISABLE_PROGRESS_BARS']='1'
from faster_whisper import WhisperModel
import av
import numpy as np

model=WhisperModel(a.model,device='cpu',compute_type='int8',cpu_threads=4,
                   download_root=str(a.cache.resolve()))
# Decode explicitly for PyAV versions whose open() omits metadata_errors.
resampler=av.AudioResampler(format='flt',layout='mono',rate=16000)
frames=[]
with av.open(str(a.source)) as container:
    for frame in container.decode(audio=0):
        frames.extend(x.to_ndarray().reshape(-1) for x in resampler.resample(frame))
    frames.extend(x.to_ndarray().reshape(-1) for x in resampler.resample(None))
samples=np.concatenate(frames)
samples*=min(1,.85/max(np.max(np.abs(samples)),1e-9))
segments,info=model.transcribe(samples,language='en',beam_size=5,word_timestamps=True,
                               condition_on_previous_text=False)
rows=[dict(start=s.start,end=s.end,text=s.text,
           words=[dict(start=w.start,end=w.end,word=w.word,probability=w.probability) for w in s.words])
      for s in segments]
a.out.write_text(json.dumps(dict(model='faster-whisper '+a.model,automated_transcript=True,
    note='Timing aid only; subjective listening is still required.',segments=rows),indent=2)+'\n',encoding='utf-8')
print(json.dumps(rows,ensure_ascii=False))

"""Generate AI umpire calls conditioned on the existing CC0 Safe excerpt.

Keep generated sources, model settings, and its built-in Perth watermark.
Run in an isolated Chatterbox installation, separate from mastering/ASR.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import time


def main(a):
    sys.path.insert(0, str(a.deps.resolve()))
    os.environ['HF_HOME'] = str(a.cache.resolve())
    os.environ['HF_HUB_DISABLE_XET'] = '1'
    os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'
    os.environ['TOKENIZERS_PARALLELISM'] = 'false'
    import numpy as np
    import soundfile as sf
    import torch
    from huggingface_hub import snapshot_download
    from chatterbox.tts_turbo import ChatterboxTurboTTS

    torch.set_num_threads(4)
    torch.set_num_interop_threads(2)
    a.out.mkdir(parents=True, exist_ok=False)
    safe, sr = sf.read(a.reference, always_2d=True)
    safe = safe.mean(axis=1)
    # The model needs >5 seconds. This only repeats the same short reference;
    # it does not add speaker information or promise identical voice quality.
    reference = np.tile(np.concatenate([safe, np.zeros(round(.07 * sr))]), 9)
    reference_path = a.out / 'safe-reference-repeated.wav'
    sf.write(reference_path, reference, sr, subtype='PCM_16')
    print('Loading Chatterbox-Nano on CPU...', flush=True)
    model_path = str(a.model_dir.resolve()) if a.model_dir else snapshot_download('ResembleAI/chatterbox-nano', allow_patterns=[
        've.safetensors', 't3_nano_v1.safetensors', 's3gen_meanflow.safetensors',
        '*.json', '*.txt', 'conds.pt'])
    model = ChatterboxTurboTTS.from_local(model_path, device='cpu', nano=True)
    print('Preparing Safe reference...', flush=True)
    model.prepare_conditionals(str(reference_path))
    items = []
    for call, text in [('strike', 'Strike!'), ('out', 'Out!')]:
        if call not in a.calls:
            continue
        for seed in a.seeds:
            torch.manual_seed(seed)
            np.random.seed(seed)
            started = time.monotonic()
            print(f'Generating {text} seed={seed}...', flush=True)
            with torch.inference_mode():
                wav = model.generate(text, temperature=.8, top_p=.95,
                                     repetition_penalty=1.2)
            data = wav.squeeze().numpy()
            assert np.isfinite(data).all() and np.max(np.abs(data)) > .001
            path = a.out / f'{call}-{seed}.wav'
            sf.write(path, data, model.sr, subtype='PCM_24')
            item = dict(call=call, text=text, seed=seed, file=path.name,
                        seconds=round(len(data)/model.sr, 3),
                        elapsed_seconds=round(time.monotonic()-started, 2),
                        sha256=hashlib.sha256(path.read_bytes()).hexdigest())
            items.append(item)
            print(json.dumps(item), flush=True)
            (a.out/'generation.json').write_text(json.dumps(dict(
                ai_generated=True, model='ResembleAI/chatterbox-nano',
                model_source='https://huggingface.co/ResembleAI/chatterbox-nano',
                model_license='MIT', device='cpu', builtin_watermark_enabled=True,
                model_revision=Path(model_path).name,
                reference=str(a.reference.name),
                reference_sha256=hashlib.sha256(a.reference.read_bytes()).hexdigest(),
                reference_repetitions=9, reference_original_seconds=len(safe)/sr,
                reference_note='Very short Safe excerpt repeated to meet 5s input length; voice similarity needs listening.',
                temperature=.8, top_p=.95, repetition_penalty=1.2,
                tracks=items), ensure_ascii=False, indent=2)+'\n', encoding='utf-8')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    for flag in ['deps', 'cache', 'reference', 'out']:
        p.add_argument('--'+flag, type=Path, required=True)
    p.add_argument('--seeds', nargs='+', type=int, default=[12, 23, 34])
    p.add_argument('--model-dir', type=Path)
    p.add_argument('--calls', nargs='+', choices=['strike', 'out'], default=['strike', 'out'])
    main(p.parse_args())

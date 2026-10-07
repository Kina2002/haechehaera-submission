"""Recreate the approved 5.4-second entrance murmur from the saved CC0 source."""
from pathlib import Path
import argparse
import subprocess

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--ffmpeg', required=True)
args = parser.parse_args()
subprocess.run([args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-ss', '12',
    '-i', str(ROOT/'sources/crowd-talking-murmur-trezz77.mp3'), '-t', '5.4',
    '-af', 'highpass=f=140,lowpass=f=3800,alimiter=limit=0.75:level=false,afade=t=in:st=0:d=0.3,afade=t=out:st=4.55:d=0.85',
    '-ar', '44100', '-ac', '2', '-codec:a', 'libmp3lame', '-b:a', '160k',
    str(ROOT/'audio/entrance-crowd-murmur.mp3')], check=True)

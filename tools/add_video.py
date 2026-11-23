#!/usr/bin/env python3
"""Prepare a short clip for The Wine Reference.

Usage: python3 tools/add_video.py <input video> <name> [--start S] [--len S] [--width W] [--sound]

Makes, in video/:
  <name>.mp4         H.264, silent unless --sound, no more than 20 s, 1280 px wide (720 px for --width 720)
  <name>-mobile.mp4  720 px wide version for phones
  <name>.webp        poster frame shown before the clip plays (and for people who prefer less motion)
Then prints the HTML to paste into the page.

Clips play muted on a loop, only when on screen. Phones in data-saving mode and people
who ask for less motion see the poster frame instead.
"""
import argparse, json, os, subprocess, sys

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('name')
ap.add_argument('--start', type=float, default=0); ap.add_argument('--len', type=float, default=12)
ap.add_argument('--width', type=int, default=1280); ap.add_argument('--sound', action='store_true')
ap.add_argument('--alt', default='')
a = ap.parse_args()
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, 'video'); os.makedirs(out, exist_ok=True)
dur = min(a.len, 20)

def enc(width, path, crf):
    vf = f"scale='min({width},iw)':-2:flags=lanczos,fps=30,format=yuv420p"
    cmd = ['ffmpeg', '-y', '-v', 'error', '-ss', str(a.start), '-t', str(dur), '-i', a.src, '-vf', vf,
           '-c:v', 'libx264', '-preset', 'veryfast', '-crf', str(crf), '-profile:v', 'high', '-movflags', '+faststart']
    cmd += (['-c:a', 'aac', '-b:a', '96k'] if a.sound else ['-an'])
    subprocess.run(cmd + [path], check=True)
    return os.path.getsize(path)

big = os.path.join(out, a.name + '.mp4'); small = os.path.join(out, a.name + '-mobile.mp4'); poster = os.path.join(out, a.name + '.webp')
s1 = enc(a.width, big, 27); s2 = enc(720, small, 29)
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', str(a.start + 0.5), '-i', a.src, '-frames:v', '1',
                '-vf', f"scale='min({a.width},iw)':-2", '-c:v', 'libwebp', '-quality', '78', poster], check=True)
info = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                                  '-of', 'json', big], capture_output=True, text=True).stdout)['streams'][0]
w, h = info['width'], info['height']
print(f"video/{a.name}.mp4 {s1/1e6:.1f} MB · mobile {s2/1e6:.1f} MB · {w}x{h}")
if s1 > 6e6: print('WARNING: bigger than 6 MB; try a shorter --len or --width 960', file=sys.stderr)
alt = a.alt or a.name.replace('-', ' ')
print(f'<video class="clip" muted loop playsinline preload="none" width="{w}" height="{h}" poster="video/{a.name}.webp" '
      f'data-src="video/{a.name}.mp4" data-src-mobile="video/{a.name}-mobile.mp4" aria-label="{alt}"></video>')

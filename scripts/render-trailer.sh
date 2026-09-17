#!/bin/sh
# Run from any directory after recording at http://127.0.0.1:5173/?trailer=1.
set -eu
cd "$(dirname "$0")/.."
python3 scripts/trailer-audio.py
"${FFMPEG:-ffmpeg}" -y -i artifacts/backbone-rally-trailer.mp4 \
  -i artifacts/trailer-original-audio.wav -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -t 20 -movflags +faststart \
  public/media/backbone-rally-trailer.mp4

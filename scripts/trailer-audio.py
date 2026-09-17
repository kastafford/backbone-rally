"""An original, quiet synth bed and expression cues for the 20-second trailer."""
import math, wave, array
from pathlib import Path
rate=48000; duration=20; samples=array.array('f',[0])*(rate*duration)
def tone(at, note, length=.35, volume=.08, end_note=None):
    start=int(at*rate); count=int(length*rate); phase=0
    for i in range(min(count,len(samples)-start)):
        t=i/rate; f=440*2**((note+(0 if end_note is None else (end_note-note)*i/count)-69)/12)
        phase+=2*math.pi*f/rate
        env=min(1,t/.012)*math.exp(-t*5/length)*min(1,(length-t)/.04)
        samples[start+i]+=volume*env*(math.sin(phase)+.18*math.sin(phase*2))
beat=60/108
melody=[72,76,79,81,79,76,74,79]
for i in range(34):
    at=.45+i*beat
    if 7<at<10: continue
    tone(at,melody[i%8],.48,.055)
    if i%2==0:tone(at,[48,53,55,48][(i//8)%4],.7,.055)
    if i%4==2:tone(at+beat*.5,84,.22,.025)
# A little descending sigh for the slip; a warm rising cadence at the finish.
tone(7.2,76,1.5,.075,57)
# A rising leap and bright landing cue for the fold shortcut.
tone(10.85,67,.65,.09,86)
for i,n in enumerate([79,84,88]):tone(12+i*.10,n,.4,.075)
for i,n in enumerate([72,76,79,84]):tone(16+i*.16,n,.75,.10)
for n in [60,64,67,72]:tone(18,n,1.5,.035)
for i in range(len(samples)):
    fade=min(1,i/rate/.5,(duration-i/rate)/.7)
    samples[i]=max(-1,min(1,samples[i]*fade))
pcm=array.array('h',(int(s*32767) for s in samples))
Path('artifacts').mkdir(exist_ok=True)
with wave.open('artifacts/trailer-original-audio.wav','wb') as out:
    out.setnchannels(1);out.setsampwidth(2);out.setframerate(rate);out.writeframes(pcm.tobytes())

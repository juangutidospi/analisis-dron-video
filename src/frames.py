#!/usr/bin/env python3
"""Extrae fotogramas del MP4 en los momentos clave + portada + tira de luz + sparkline.
Variables de entorno: MP4, WORK, CHROME."""
import os, json, subprocess, math
from common import load, keypoints

MP4=os.environ["MP4"]; WORK=os.environ["WORK"]
CHROME=os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
FR=os.path.join(WORK, "frames"); os.makedirs(FR, exist_ok=True)
d=load(WORK); dur=d["meta"]["dur"]

def grab(sec, out, w):
    sec=max(0.2, min(sec, dur-0.2))
    subprocess.run(["ffmpeg","-y","-ss",f"{sec}","-i",MP4,"-frames:v","1",
                    "-vf",f"scale={w}:-2","-q:v","4",out], capture_output=True)

# 8 fotogramas de los hitos (336 px de ancho)
for k in keypoints(d):
    grab(k["t"], os.path.join(FR, f"frm_{k['key']}.jpg"), 336)
# portada (alta resolucion, ultimo tercio del vuelo suele dar buen paisaje)
grab(dur*0.90, os.path.join(WORK, "hero.jpg"), 1280)
# tira de luz: 3 momentos del vuelo
for frac, name in ((0.15,"l1"),(0.55,"l2"),(0.95,"l3")):
    grab(dur*frac, os.path.join(FR, f"{name}.jpg"), 480)

# sparkline del perfil de altitud (PNG 328x92 via Chrome) para el KMZ
S=d["series"]; rels=[x["rel"] for x in S if x["rel"] is not None]
n=len(rels); W=328; H=92; pad=6; mx=max(rels) or 1
pts=[(pad+i/(n-1)*(W-2*pad), pad+(1-rels[i]/mx)*(H-2*pad)) for i in range(n)]
path="M"+" L".join(f"{x:.1f},{y:.1f}" for x,y in pts)
area=path+f" L{pts[-1][0]:.1f},{H-pad} L{pts[0][0]:.1f},{H-pad} Z"
svg=(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
 '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
 '<stop offset="0" stop-color="#5aa0f5" stop-opacity="0.5"/>'
 '<stop offset="1" stop-color="#5aa0f5" stop-opacity="0.02"/></linearGradient></defs>'
 f'<path d="{area}" fill="url(#g)"/>'
 f'<path d="{path}" fill="none" stroke="#6db0ff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>')
open(os.path.join(WORK,"spark.html"),"w").write(svg)
subprocess.run([CHROME,"--headless","--disable-gpu","--force-device-scale-factor=1",
    "--default-background-color=00000000","--window-size=328,92",
    f"--screenshot={os.path.join(WORK,'spark.png')}", "file://"+os.path.join(WORK,"spark.html")],
    capture_output=True)
print(f"  8 fotogramas + portada + tira de luz + sparkline")

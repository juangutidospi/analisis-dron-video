#!/usr/bin/env python3
"""Extrae fotogramas del MP4 en los momentos clave + portada + tira de luz,
y dibuja el sparkline (Pillow) para el KMZ."""
import os, subprocess
from common import load, keypoints
from PIL import Image, ImageDraw

def run(cfg):
    MP4=cfg["MP4"]; WORK=cfg["WORK"]; FFMPEG=cfg.get("FFMPEG","ffmpeg")
    FR=os.path.join(WORK,"frames"); os.makedirs(FR, exist_ok=True)
    d=load(WORK); dur=d["meta"]["dur"]

    def grab(sec, out, w):
        sec=max(0.2, min(sec, dur-0.2))
        subprocess.run([FFMPEG,"-y","-ss",f"{sec}","-i",MP4,"-frames:v","1",
                        "-vf",f"scale={w}:-2","-q:v","4",out], capture_output=True)

    for k in keypoints(d):
        grab(k["t"], os.path.join(FR, f"frm_{k['key']}.jpg"), 336)
    grab(dur*0.90, os.path.join(WORK, "hero.jpg"), 1280)
    for frac, name in ((0.15,"l1"),(0.55,"l2"),(0.95,"l3")):
        grab(dur*frac, os.path.join(FR, f"{name}.jpg"), 480)

    # sparkline del perfil de altitud (Pillow, PNG transparente 328x92) para el KMZ
    S=d["series"]; rels=[x["rel"] for x in S if x["rel"] is not None]
    n=len(rels); W=328; H=92; pad=6; mx=max(rels) or 1; sc=2  # 2x para suavizar
    W2,H2,pad2=W*sc,H*sc,pad*sc
    img=Image.new("RGBA",(W2,H2),(0,0,0,0)); dr=ImageDraw.Draw(img)
    pts=[(pad2+i/(n-1)*(W2-2*pad2), pad2+(1-rels[i]/mx)*(H2-2*pad2)) for i in range(n)]
    dr.polygon(pts+[(pts[-1][0],H2-pad2),(pts[0][0],H2-pad2)], fill=(90,160,245,70))
    dr.line(pts, fill=(109,176,255,255), width=sc*2, joint="curve")
    img=img.resize((W,H), Image.LANCZOS)
    img.save(os.path.join(WORK,"spark.png"))
    print("  8 fotogramas + portada + tira de luz + sparkline")

if __name__=="__main__":
    run(dict(os.environ))

#!/usr/bin/env python3
"""Descarga imagen de satelite (Esri World Imagery, sin clave) de la zona del vuelo
y la une en trabajo/sat.jpg. Variables de entorno: WORK, CHROME."""
import os, json, math, subprocess
from common import load

WORK=os.environ["WORK"]
CHROME=os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
d=load(WORK)
T=[p for p in d["track"] if p[0] is not None]
lats=[p[0] for p in T]; lons=[p[1] for p in T]
la0,la1=min(lats),max(lats); lo0,lo1=min(lons),max(lons)
dla=(la1-la0)*0.18 or 1e-4; dlo=(lo1-lo0)*0.18 or 1e-4
la0-=dla; la1+=dla; lo0-=dlo; lo1+=dlo
def tiles_at(z):
    n=2**z
    def xt(lon): return (lon+180)/360*n
    def yt(lat):
        r=math.radians(lat); return (1-math.log(math.tan(r)+1/math.cos(r))/math.pi)/2*n
    x0=math.floor(xt(lo0)); x1=math.floor(xt(lo1)); y0=math.floor(yt(la1)); y1=math.floor(yt(la0))
    return x0,x1,y0,y1,(x1-x0+1)*(y1-y0+1)
# zoom adaptativo: el mayor con <=30 teselas (mas detalle en vuelos pequenos)
z=17
for zz in range(20,13,-1):
    *_ , ntiles = tiles_at(zz)
    if ntiles<=30: z=zz; break
n=2**z
x0,x1,y0,y1,_=tiles_at(z)
cols=x1-x0+1; rows=y1-y0+1
cfg=dict(z=z, x0=x0, x1=x1, y0=y0, y1=y1, cols=cols, rows=rows,
         originX=x0*256, originY=y0*256, compW=cols*256, compH=rows*256)
json.dump(cfg, open(os.path.join(WORK,"tilecfg.json"),"w"))

TD=os.path.join(WORK,"tiles"); os.makedirs(TD, exist_ok=True)
base="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile"
for y in range(y0,y1+1):
    for x in range(x0,x1+1):
        out=os.path.join(TD, f"{y}_{x}.jpg")
        if os.path.exists(out) and os.path.getsize(out)>1000: continue
        subprocess.run(["curl","-s","-A","Mozilla/5.0","-o",out,f"{base}/{z}/{y}/{x}"])

tiles=""
for ri,y in enumerate(range(y0,y1+1)):
    for ci,x in enumerate(range(x0,x1+1)):
        tiles+=f'<img src="tiles/{y}_{x}.jpg" style="position:absolute;left:{ci*256}px;top:{ri*256}px;width:256px;height:256px">'
open(os.path.join(WORK,"stitch.html"),"w").write(
    f'<body style="margin:0"><div style="position:relative;width:{cfg["compW"]}px;height:{cfg["compH"]}px;overflow:hidden">{tiles}</div></body>')
subprocess.run([CHROME,"--headless","--disable-gpu","--force-device-scale-factor=1",
    f"--window-size={cfg['compW']},{cfg['compH']}",
    f"--screenshot={os.path.join(WORK,'sat_full.png')}", "file://"+os.path.join(WORK,"stitch.html")],
    capture_output=True)
# reducir a ~900 px de ancho y JPEG
subprocess.run(["sips","-Z","900","-s","format","jpeg","-s","formatOptions","82",
    os.path.join(WORK,"sat_full.png"), "--out", os.path.join(WORK,"sat.jpg")], capture_output=True)
print(f"  satelite {cols}x{rows} teselas ({cfg['compW']}x{cfg['compH']}px) -> sat.jpg")

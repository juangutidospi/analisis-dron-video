#!/usr/bin/env python3
"""Descarga imagen de satelite (Esri World Imagery, sin clave) de la zona del vuelo
y la une con Pillow en trabajo/sat.jpg."""
import os, json, math, urllib.request
from common import load
from PIL import Image

def run(cfg):
    WORK=cfg["WORK"]
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
    z=17
    for zz in range(20,13,-1):
        if tiles_at(zz)[4]<=30: z=zz; break
    x0,x1,y0,y1,_=tiles_at(z)
    cols=x1-x0+1; rows=y1-y0+1
    cfgd=dict(z=z, x0=x0, x1=x1, y0=y0, y1=y1, cols=cols, rows=rows,
              originX=x0*256, originY=y0*256, compW=cols*256, compH=rows*256)
    json.dump(cfgd, open(os.path.join(WORK,"tilecfg.json"),"w"))

    base="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile"
    canvas=Image.new("RGB", (cols*256, rows*256), (20,22,26))
    for ri,y in enumerate(range(y0,y1+1)):
        for ci,x in enumerate(range(x0,x1+1)):
            try:
                req=urllib.request.Request(f"{base}/{z}/{y}/{x}", headers={"User-Agent":"Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=20) as resp:
                    tile=Image.open(resp).convert("RGB")
                canvas.paste(tile, (ci*256, ri*256))
            except Exception as e:
                print(f"    tesela {x},{y} fallo: {e}")
    # reducir a ~760 px de ancho (el mapa se muestra a ~600) y guardar JPEG ligero
    if canvas.width>760:
        h=round(canvas.height*760/canvas.width)
        canvas=canvas.resize((760,h), Image.LANCZOS)
    canvas.save(os.path.join(WORK,"sat.jpg"), "JPEG", quality=72, optimize=True)
    print(f"  satelite {cols}x{rows} teselas (zoom {z}) -> sat.jpg")

if __name__=="__main__":
    run(dict(os.environ))

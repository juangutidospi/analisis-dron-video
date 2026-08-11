#!/usr/bin/env python3
"""Extrae la telemetria de un .SRT de DJI a trabajo/data.json.
Uso (via generar.sh): variables de entorno SRT y WORK."""
import re, math, json, datetime, os

SRT=os.environ["SRT"]; WORK=os.environ["WORK"]
txt=open(SRT, encoding="utf-8", errors="ignore").read()

rows=[]
for m in re.finditer(r'FrameCnt: (\d+),[^\n]*\n(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d+)\n(.*)', txt):
    body=m.group(3)
    def g(k):
        mm=re.search(r'%s: ?([-\d\.]+)' % re.escape(k), body); return float(mm.group(1)) if mm else None
    sh=re.search(r'shutter: 1/([\d\.]+)', body)
    cm=re.search(r'color_md: ?([^\],]+)', body)
    rows.append(dict(cnt=int(m.group(1)), ts=m.group(2),
        lat=g("latitude"), lon=g("longitude"), rel=g("rel_alt"), ab=g("abs_alt"),
        iso=g("iso"), ct=g("ct"), ev=g("ev"), fnum=g("fnum"),
        shutter=(sh.group(1)[:-2] if sh else None), color_md=(cm.group(1).strip() if cm else "")))
if len(rows)<2: raise SystemExit("SRT sin datos de telemetria")

def pt(s): return datetime.datetime.strptime(s, "%Y-%m-%d %H:%M:%S.%f")
t0=pt(rows[0]["ts"])
for r in rows: r["t"]=(pt(r["ts"])-t0).total_seconds()
dur=rows[-1]["t"]

def hav(a,b,c,e):
    R=6371000; p1=math.radians(a); p2=math.radians(c); dp=math.radians(c-a); dl=math.radians(e-b)
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))

GLITCH=25.0  # m/s: techo fisico para filtrar saltos de GPS
# muestreo 0.5 s para series/velocidades
step=max(1, int(round(len(rows)/dur*0.5))) if dur>0 else 1
samp=rows[::step]
for i,r in enumerate(samp):
    if i==0: r["hs"]=0.0; r["vs"]=0.0; continue
    p=samp[i-1]; dt=r["t"]-p["t"]
    if r["lat"] and p["lat"] and dt>0:
        d=hav(p["lat"],p["lon"],r["lat"],r["lon"]); sp=d/dt
        r["hs"]=sp if sp<=GLITCH else None
    else: r["hs"]=None
    r["vs"]=round((r["rel"]-p["rel"])/dt,2) if (r["rel"] is not None and p["rel"] is not None and dt>0) else None

# velocidades desde el muestreo de 0,5 s (el GPS del SRT se refresca ~cada 0,5 s)
hspeeds=[]; vspeeds=[]
for r in samp:
    if r.get("hs") is not None: hspeeds.append(r["hs"])
    if r.get("vs") is not None: vspeeds.append(r["vs"])
# distancia total: sumar el recorrido entre muestras de 0,5 s (filtrando saltos imposibles)
dist=0.0
for i in range(1,len(samp)):
    a,b=samp[i-1],samp[i]
    if a["lat"] and b["lat"]:
        d=hav(a["lat"],a["lon"],b["lat"],b["lon"]); dt=b["t"]-a["t"]
        if dt>0 and d/dt<=GLITCH: dist+=d
# glitches: ruido bruto del GPS entre frames consecutivos (para la nota de calidad)
glitches=0; gmax=0.0; prev=None
for r in rows:
    if r["lat"] and r["lon"]:
        if prev:
            dt=r["t"]-prev[2]
            if dt>0:
                sp=hav(prev[0],prev[1],r["lat"],r["lon"])/dt
                if sp>GLITCH: glitches+=1; gmax=max(gmax,sp)
        prev=(r["lat"],r["lon"],r["t"])
lat0,lon0=rows[0]["lat"],rows[0]["lon"]
valid=[r for r in rows if r["lat"]]
maxfar=max(hav(lat0,lon0,r["lat"],r["lon"]) for r in valid)

def rng(k,src=valid):
    v=[r[k] for r in src if r.get(k) is not None]; return [min(v),max(v)] if v else [None,None]
isos=sorted({r["iso"] for r in rows if r["iso"]})
shs=sorted({r["shutter"] for r in rows if r["shutter"]}, key=lambda s:float(s))
cmds=sorted({r["color_md"] for r in rows if r["color_md"]})

out=dict(
  meta=dict(fname=os.path.basename(SRT), frames=len(rows),
     fps=round((len(rows)-1)/dur) if dur else 0, dur=dur,
     start=rows[0]["ts"], end=rows[-1]["ts"], size_mb=round(os.path.getsize(SRT)/1048576,1)),
  ranges=dict(rel=rng("rel"), ab=rng("ab"), ct=rng("ct"), lat=rng("lat"), lon=rng("lon"),
     hspeed=[min(hspeeds) if hspeeds else 0, max(hspeeds) if hspeeds else 0],
     hspeed_avg=(sum(hspeeds)/len(hspeeds)) if hspeeds else 0,
     vspeed=[min(vspeeds) if vspeeds else 0, max(vspeeds) if vspeeds else 0]),
  dist=round(dist), maxfar=round(maxfar),
  takeoff=[lat0,lon0], land=[rows[-1]["lat"],rows[-1]["lon"]],
  center=[sum(r["lat"] for r in valid)/len(valid), sum(r["lon"] for r in valid)/len(valid)],
  cam=dict(iso=isos, shutter=shs, fnum=sorted({r["fnum"] for r in rows if r["fnum"]}),
     ev=sorted({r["ev"] for r in rows if r["ev"] is not None}), color_md=cmds),
  glitches=glitches, glitch_max=round(gmax,1),
  series=[dict(t=round(r["t"],2), rel=r["rel"], ab=r["ab"],
     hs=(round(r["hs"],3) if r.get("hs") is not None else None),
     vs=r.get("vs"), lat=r["lat"], lon=r["lon"], iso=r["iso"], ct=r["ct"]) for r in samp],
  track=[[round(r["lat"],6), round(r["lon"],6), r["rel"]] for r in rows[::10] if r["lat"]],
)
json.dump(out, open(os.path.join(WORK,"data.json"),"w"))
print(f"  data.json: {len(rows)} frames, {dur:.0f}s, dist {out['dist']}m, alt max {out['ranges']['rel'][1]:.0f}m")

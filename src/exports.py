#!/usr/bin/env python3

def run(cfg):
    """Genera GPX (enriquecido), KML (simple) y CSV (todos los frames) desde el SRT.
    Variables de entorno: SRT, WORK, OUT, BASE."""
    import os, re, math, csv, datetime
    from common import load, hav, keypoints, mmss, kmh

    SRT=cfg["SRT"]; WORK=cfg["WORK"]; OUT=cfg["OUT"]; BASE=cfg["BASE"]
    d=load(WORK)
    txt=open(SRT, encoding="utf-8", errors="ignore").read()

    rows=[]
    for m in re.finditer(r'FrameCnt: (\d+),[^\n]*\n(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d+)\n(.*)', txt):
        body=m.group(3)
        def g(k):
            mm=re.search(r'%s: ?([-\d\.]+)' % re.escape(k), body); return mm.group(1) if mm else ""
        sh=re.search(r'shutter: 1/([\d\.]+)', body)
        cm=re.search(r'color_md: ?([^\],]+)', body)
        rows.append(dict(cnt=int(m.group(1)), ts=m.group(2), lat=g("latitude"), lon=g("longitude"),
            rel=g("rel_alt"), ab=g("abs_alt"), iso=g("iso"), ct=g("ct"), ev=g("ev"), fnum=g("fnum"),
            shutter=("1/"+sh.group(1) if sh else ""), color_md=(cm.group(1).strip() if cm else "")))
    def pt(s): return datetime.datetime.strptime(s, "%Y-%m-%d %H:%M:%S.%f")
    t0=pt(rows[0]["ts"])
    def utc(s): return (pt(s)-datetime.timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")  # CEST->UTC
    def bearing(a,b,c,e):
        y=math.sin(math.radians(e-b))*math.cos(math.radians(c))
        x=math.cos(math.radians(a))*math.sin(math.radians(c))-math.sin(math.radians(a))*math.cos(math.radians(c))*math.cos(math.radians(e-b))
        return (math.degrees(math.atan2(y,x))+360)%360

    # ---- CSV: todos los frames ----
    with open(os.path.join(OUT, BASE+".csv"), "w", newline="") as fp:
        w=csv.writer(fp)
        w.writerow(["frame","timestamp_local","lat","lon","rel_alt_m","abs_alt_m","iso","shutter","fnum","ev","color_temp_k","color_mode"])
        for r in rows:
            w.writerow([r["cnt"],r["ts"],r["lat"],r["lon"],r["rel"],r["ab"],r["iso"],r["shutter"],r["fnum"],r["ev"],r["ct"],r["color_md"]])

    # ---- GPX enriquecido (waypoints de hitos + velocidad/rumbo cada ~0,5 s) ----
    S=[dict(r) for r in rows[::25] if r["lat"]]
    for i,r in enumerate(S):
        r["t"]=(pt(r["ts"])-t0).total_seconds()
        if i>0:
            p=S[i-1]; dt=r["t"]-p["t"]; dd=hav(float(p["lat"]),float(p["lon"]),float(r["lat"]),float(r["lon"]))
            sp=dd/dt if dt>0 else 0
            r["mps"]=round(sp,2) if sp<=25 else S[i-1].get("mps",0)
            r["hd"]=round(bearing(float(p["lat"]),float(p["lon"]),float(r["lat"]),float(r["lon"])))
        else: r["mps"]=0.0; r["hd"]=0
    gpx=['<?xml version="1.0" encoding="UTF-8"?>',
     '<gpx version="1.1" creator="analisis-dron" xmlns="http://www.topografix.com/GPX/1/1"',
     '  xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">',
     f' <metadata><name>{BASE}</name><time>{utc(rows[0]["ts"])}</time></metadata>']
    for k in keypoints(d):
        x=k["x"]
        gpx.append(f' <wpt lat="{x["lat"]}" lon="{x["lon"]}"><ele>{x["ab"]:.1f}</ele>'
                   f'<name>{k["label"]} ({k["metric"]})</name><desc>{mmss(x["t"])}</desc></wpt>')
    gpx.append(' <trk><name>'+BASE+'</name><trkseg>')
    for r in S:
        gpx.append(f'  <trkpt lat="{r["lat"]}" lon="{r["lon"]}"><ele>{float(r["ab"]):.1f}</ele><time>{utc(r["ts"])}</time>'
                   f'<extensions><gpxtpx:TrackPointExtension><gpxtpx:speed>{r["mps"]}</gpxtpx:speed>'
                   f'<gpxtpx:course>{r["hd"]}</gpxtpx:course></gpxtpx:TrackPointExtension></extensions></trkpt>')
    gpx+=[' </trkseg></trk>','</gpx>']
    open(os.path.join(OUT, BASE+".gpx"),"w").write("\n".join(gpx))

    # ---- KML simple (linea + despegue/aterrizaje) ----
    coords="\n".join(f"{r['lon']},{r['lat']},{float(r['ab']):.0f}" for r in rows[::5] if r["lat"])
    tk=rows[0]; ld=rows[-1]
    kml=f'''<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>{BASE}</name>
     <Style id="t"><LineStyle><color>ff3478eb</color><width>4</width></LineStyle></Style>
     <Placemark><name>Despegue</name><Point><coordinates>{tk['lon']},{tk['lat']},{tk['ab'] or 0}</coordinates></Point></Placemark>
     <Placemark><name>Aterrizaje</name><Point><coordinates>{ld['lon']},{ld['lat']},{ld['ab'] or 0}</coordinates></Point></Placemark>
     <Placemark><name>Recorrido</name><styleUrl>#t</styleUrl><LineString><tessellate>1</tessellate>
      <altitudeMode>absolute</altitudeMode><coordinates>
    {coords}
      </coordinates></LineString></Placemark>
    </Document></kml>'''
    open(os.path.join(OUT, BASE+".kml"),"w").write(kml)
    print(f"  CSV ({len(rows)} frames) + GPX (enriquecido) + KML")


if __name__=="__main__":
    import os
    run(dict(os.environ))
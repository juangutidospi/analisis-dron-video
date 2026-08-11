#!/usr/bin/env python3

def run(cfg):
    """Genera el informe HTML (autonomo, offline) desde trabajo/ hacia salida/<base>.html.
    Variables de entorno: WORK, OUT, BASE, TEMPLATE, TITULO."""
    import os, json, math, base64, datetime
    from common import load, hav, mmss, kmh, keypoints

    WORK=cfg["WORK"]; OUT=cfg["OUT"]; BASE=cfg["BASE"]
    TEMPLATE=cfg["TEMPLATE"]; TITULO=cfg.get("TITULO","Vuelo con DJI Neo 2")
    d=load(WORK); S=d["series"]; tk=d["takeoff"]; m=d["meta"]; r=d["ranges"]; cam=d["cam"]
    tc=json.load(open(os.path.join(WORK,"tilecfg.json")))
    DUR=m["dur"]
    KP=keypoints(d)  # rellena x["far"] en cada muestra

    def b64(path):
        return "data:image/jpeg;base64,"+base64.b64encode(open(os.path.join(WORK,path),"rb").read()).decode()
    def esc(s): return str(s).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace('"',"&quot;")
    def f(v,dec=0): return f"{v:.{dec}f}"

    # ---------- galeria de momentos ----------
    gallery=""
    for k in KP:
        x=k["x"]
        gallery+=(f'<figure class="mo"><div class="mo-img"><img src="{b64("frames/frm_"+k["key"]+".jpg")}" alt="{esc(k["label"])}" loading="lazy">'
          f'<span class="mo-t">{mmss(x["t"])}</span></div>'
          f'<figcaption><div class="mo-label">{esc(k["label"])}</div>'
          f'<div class="mo-metric">{k["metric"]}</div><div class="mo-sub">{k["sub"]}</div></figcaption></figure>')

    # ---------- series para las graficas ----------
    SER=[{"t":x["t"],"rel":x["rel"],"ab":x["ab"],
          "hs":(x["hs"]*3.6 if x.get("hs") is not None else None),
          "vs":x["vs"],"far":x["far"],"iso":x["iso"],"ct":x["ct"],"pitch":x.get("pitch")} for x in S]
    CHARTS={}
    def svg_timechart(cid,cfgs,W=900,H=300):
        L=44; R=46 if len(cfgs)>1 else 16; Tp=12; B=26
        def X(t): return L+(t/DUR)*(W-L-R)
        p=[f'<svg id="{cid}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" style="display:block;width:100%;height:auto">']
        s=0
        while s<=DUR:
            x=X(s); p.append(f'<path d="M{x:.1f},{Tp} L{x:.1f},{H-B}" style="stroke:var(--grid)" stroke-width="1" fill="none"/>')
            p.append(f'<text x="{x:.1f}" y="{H-9}" class="axlbl" text-anchor="middle">{int(s//60)}:00</text>'); s+=60
        for ci,cf in enumerate(cfgs):
            vals=[q[cf["k"]] for q in SER if q.get(cf["k"]) is not None]
            vmin=cf.get("min", min(vals)); vmax=max(vals)
            if vmin==vmax: vmax=vmin+1
            pad=(vmax-vmin)*0.10; vmin-=pad; vmax+=pad
            def Y(v,vmin=vmin,vmax=vmax): return H-B-((v-vmin)/(vmax-vmin))*(H-B-Tp)
            axX=L if ci==0 else W-R; anch='end' if ci==0 else 'start'; ox=-7 if ci==0 else 7
            for g in range(5):
                v=vmin+(vmax-vmin)*g/4; y=Y(v)
                if ci==0: p.append(f'<path d="M{L},{y:.1f} L{W-R},{y:.1f}" style="stroke:var(--grid)" stroke-width="{1 if g==0 else 0.6}" fill="none"/>')
                p.append(f'<text x="{axX+ox}" y="{y+3:.1f}" class="axlbl" text-anchor="{anch}" style="fill:var({cf["color"]})">{cf["fmt"](v)}</text>')
            dp=""; pen=False
            for q in SER:
                v=q.get(cf["k"])
                if v is None: pen=False; continue
                dp+=("L" if pen else "M")+f"{X(q['t']):.1f},{Y(v):.1f}"; pen=True
            if cf.get("area"):
                fv=next(q for q in SER if q.get(cf["k"]) is not None); lv=next(q for q in reversed(SER) if q.get(cf["k"]) is not None)
                p.append(f'<path d="{dp}L{X(lv["t"]):.1f},{H-B}L{X(fv["t"]):.1f},{H-B}Z" style="fill:var({cf["color"]});opacity:.13" stroke="none"/>')
            p.append(f'<path d="{dp}" style="stroke:var({cf["color"]})" stroke-width="2.2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>')
        p.append('</svg>')
        CHARTS[cid]={"L":L,"R":R,"Tp":Tp,"B":B,"W":W,"H":H,"tmax":DUR,"cfgs":
            [{"k":c["k"],"label":c["label"],"unit":c.get("unit",""),"dec":c.get("dec",0),"color":c["color"]} for c in cfgs]}
        return "".join(p)

    ALT_SVG=svg_timechart("alt",[{"k":"rel","color":"--blue","area":True,"min":0,"fmt":lambda v:f"{round(v)}","label":"Altura","unit":"m","dec":0}])
    SP_SVG=svg_timechart("sp",[{"k":"hs","color":"--blue","min":0,"fmt":lambda v:f"{round(v)}","label":"Horizontal","unit":"km/h","dec":1},
                          {"k":"vs","color":"--violet","fmt":lambda v:f"{round(v)}","label":"Vertical","unit":"m/s","dec":1}])
    FAR_SVG=svg_timechart("far",[{"k":"far","color":"--aqua","area":True,"min":0,"fmt":lambda v:f"{round(v)}","label":"Distancia","unit":"m","dec":0}])
    CAM_SVG=svg_timechart("cam",[{"k":"iso","color":"--blue","fmt":lambda v:f"{round(v)}","label":"ISO","unit":"","dec":0},
                           {"k":"ct","color":"--yellow","fmt":lambda v:f"{round(v/100)/10}k","label":"Temp","unit":"K","dec":0}])
    GB_SVG=svg_timechart("gb",[{"k":"pitch","color":"--green","area":True,"fmt":lambda v:f"{round(v)}°","label":"Pitch","unit":"°","dec":0}])

    def scrub_html(cid,N=34):
        c=CHARTS[cid]
        lp=c["L"]/c["W"]*100; wp=(c["W"]-c["L"]-c["R"])/c["W"]*100
        tpp=c["Tp"]/c["H"]*100; hp=(c["H"]-c["Tp"]-c["B"])/c["H"]*100
        cols=""
        for i in range(N):
            s=min(SER, key=lambda q:abs(q["t"]-(i+0.5)/N*DUR))
            lines=f'<b>{mmss(s["t"])}</b>'
            for cf in c["cfgs"]:
                v=s.get(cf["k"])
                if v is None: continue
                lines+=f'<br><span style="color:var({cf["color"]})">&#9679;</span> {cf["label"]}: {v:.{cf["dec"]}f}{(" "+cf["unit"]) if cf["unit"] else ""}'
            ec=" stip-left" if i>N*0.72 else (" stip-right" if i<N*0.28 else "")
            cols+=(f'<button class="scol" style="left:{i/N*100:.3f}%;width:{100/N:.3f}%" aria-label="{mmss(s["t"])}">'
                   f'<span class="scross"></span><span class="stip{ec}">{lines}</span></button>')
        return f'<div class="scrub" style="left:{lp:.3f}%;width:{wp:.3f}%;top:{tpp:.3f}%;height:{hp:.3f}%">{cols}</div>'
    ALT_SCRUB=scrub_html("alt"); SP_SCRUB=scrub_html("sp"); FAR_SCRUB=scrub_html("far"); CAM_SCRUB=scrub_html("cam"); GB_SCRUB=scrub_html("gb")

    # ---------- mapa satelite (SVG estatico) ----------
    def svg_map():
        z=tc["z"]; nn=2**z; ox=tc["originX"]; oy=tc["originY"]; W=tc["compW"]; H=tc["compH"]
        T=[q for q in d["track"] if q[0] is not None]
        def PX(lon): return (lon+180)/360*nn*256-ox
        def PY(lat):
            rr=math.radians(lat); return (1-math.log(math.tan(rr)+1/math.cos(rr))/math.pi)/2*nn*256-oy
        relmax=max(q[2] or 0 for q in T) or 1
        def col(v):
            t=max(0,min(1,(v or 0)/relmax)); a=[76,149,255]; b=[255,138,76]
            return 'rgb(%d,%d,%d)'%tuple(round(a[i]+(b[i]-a[i])*t) for i in range(3))
        SAT=b64("sat.jpg")
        p=[f'<svg id="map" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {W} {H}" width="{W}" height="{H}" style="display:block;width:100%;height:auto">']
        p.append(f'<image x="0" y="0" width="{W}" height="{H}" preserveAspectRatio="none" xlink:href="{SAT}" href="{SAT}"/>')
        p.append(f'<rect x="1" y="1" width="{W-2}" height="{H-2}" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="2"/>')
        full='M'+'L'.join(f'{PX(q[1]):.1f},{PY(q[0]):.1f}' for q in T)
        p.append(f'<path d="{full}" stroke="rgba(0,0,0,.55)" stroke-width="11" fill="none" stroke-linejoin="round" stroke-linecap="round"/>')
        for i in range(1,len(T)):
            p.append(f'<path d="M{PX(T[i-1][1]):.1f},{PY(T[i-1][0]):.1f}L{PX(T[i][1]):.1f},{PY(T[i][0]):.1f}" stroke="{col(T[i][2])}" stroke-width="7" fill="none" stroke-linecap="round"/>')
        tx=PX(tk[1]); ty=PY(tk[0])
        p.append(f'<circle cx="{tx:.1f}" cy="{ty:.1f}" r="15" style="fill:var(--green)" stroke="#fff" stroke-width="4"/>')
        res=156543.03392*math.cos(tk[0]*math.pi/180)/nn; spx=100/res
        p.append(f'<path d="M28,{H-40}L{28+spx:.1f},{H-40}" stroke="#fff" stroke-width="5"/>')
        p.append(f'<path d="M28,{H-48}L28,{H-32}M{28+spx:.1f},{H-48}L{28+spx:.1f},{H-32}" stroke="#fff" stroke-width="5"/>')
        p.append(f'<text x="28" y="{H-52}" fill="#fff" font-size="26" font-weight="700">100 m</text>')
        for i,k in enumerate(KP):
            x=PX(k["lon"]); y=PY(k["lat"])
            p.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="11" fill="#fff" style="stroke:var(--blue)" stroke-width="4"/>')
            p.append(f'<circle class="mk-hit" cx="{x:.1f}" cy="{y:.1f}" r="46" fill="transparent" data-idx="{i}"/>')
        p.append('</svg>')
        return "".join(p), (PX,PY,W,H)
    MAP_SVG, (PX,PY,MW,MH)=svg_map()
    KPBTNS=""
    for k in KP:
        xp=PX(k["lon"])/MW*100; yp=PY(k["lat"])/MH*100
        edge=" kptip-left" if xp>66 else (" kptip-right" if xp<34 else "")
        KPBTNS+=(f'<button class="kpbtn" style="left:{xp:.2f}%;top:{yp:.2f}%" aria-label="{esc(k["label"])}">'
          f'<span class="kptip{edge}"><img src="{b64("frames/frm_"+k["key"]+".jpg")}" alt=""><span class="kptip-b">'
          f'<span class="kptip-l">{esc(k["label"])}</span>'
          f'<span class="kptip-m">{mmss(k["t"])} &middot; {k["metric"]}</span></span></span></button>')

    # ---------- sustituciones ----------
    MESES=["","enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]
    dt=datetime.datetime.strptime(m["start"],"%Y-%m-%d %H:%M:%S.%f")
    fecha=f"{dt.day} de {MESES[dt.month]} de {dt.year}"
    tstart=m["start"][11:19]; tend=m["end"][11:19]; dur=mmss(m["dur"])
    reps={
     "__TITULO__":esc(TITULO),"__HERO__":b64("hero.jpg"),"__DATA__":"{}","__GALLERY__":gallery,
     "__MAP_SVG__":MAP_SVG,"__KPBTNS__":KPBTNS,
     "__ALT_SVG__":ALT_SVG,"__SP_SVG__":SP_SVG,"__FAR_SVG__":FAR_SVG,"__CAM_SVG__":CAM_SVG,"__GB_SVG__":GB_SVG,
     "__ALT_SCRUB__":ALT_SCRUB,"__SP_SCRUB__":SP_SCRUB,"__FAR_SCRUB__":FAR_SCRUB,"__CAM_SCRUB__":CAM_SCRUB,"__GB_SCRUB__":GB_SCRUB,
     "__LIGHT1__":b64("frames/l1.jpg"),"__LIGHT2__":b64("frames/l2.jpg"),"__LIGHT3__":b64("frames/l3.jpg"),
     "__FECHA__":fecha,"__TSTART__":tstart,"__TEND__":tend,"__DUR__":dur,
     "__FRAMES__":f"{m['frames']:,}".replace(",","."),"__FPS__":str(m["fps"]),
     "__RELMAX__":f(r["rel"][1]),"__MAXFAR__":str(d["maxfar"]),"__DIST__":f"{d['dist']:,}".replace(",","."),
     "__HSMAX__":f(r["hspeed"][1]*3.6),"__HSAVG__":f(r["hspeed_avg"]*3.6),
     "__ABMIN__":f(r["ab"][0]),"__ABMAX__":f(r["ab"][1]),"__VSUP__":f(r["vspeed"][1],1),
     "__ISOMIN__":f(min(cam["iso"])),"__ISOMAX__":f(max(cam["iso"])),
     "__SHMIN__":cam["shutter"][0],"__SHMAX__":cam["shutter"][-1],"__FNUM__":f(cam["fnum"][0],1),
     "__CTMIN__":f(r["ct"][0]),"__CTMAX__":f(r["ct"][1]),
     "__PMIN__":f(r["pitch"][0]),"__PMAX__":f(r["pitch"][1]),
     "__TKLAT__":f(tk[0],6),"__TKLON__":f(tk[1],6),
     "__CLAT__":f(d["center"][0],6),"__CLON__":f(d["center"][1],6),
     "__MAPURL__":f"https://www.google.com/maps?q={tk[0]:.6f},{tk[1]:.6f}",
     "__GLMAX__":f(d["glitch_max"]*3.6),
    }
    HTML=open(TEMPLATE).read()
    for k,v in reps.items(): HTML=HTML.replace(k,str(v))
    out=os.path.join(OUT, BASE+".html")
    open(out,"w").write(HTML)
    print(f"  informe -> {os.path.basename(out)} ({len(HTML)//1024} KB)")


if __name__=="__main__":
    import os
    run(dict(os.environ))
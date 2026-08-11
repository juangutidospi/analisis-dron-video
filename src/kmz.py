import json, math, zipfile, os, datetime
import xml.dom.minidom as X

def run(cfg):
    WORK=cfg["WORK"]; ASSETS=cfg["ASSETS"]; OUT=cfg["OUT"]; BASE=cfg["BASE"]
    SC=WORK+"/"
    d=json.load(open(WORK+"/data.json")); S=d["series"]; tk=d["takeoff"]
    t0=datetime.datetime.strptime(d["meta"]["start"],"%Y-%m-%d %H:%M:%S.%f")
    MESES=["","ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]
    _fecha=f"{t0.day} {MESES[t0.month]} {t0.year}, {d['meta']['start'][11:16]}"
    _dur=f"{int(d['meta']['dur']//60)}:{int(d['meta']['dur']%60):02d}"
    _frames=f"{d['meta']['frames']:,}".replace(",",".")
    _dist=f"{d['dist']:,}".replace(",",".")
    _relmax=f"{d['ranges']['rel'][1]:.0f}"
    def utc(sec): return (t0+datetime.timedelta(seconds=sec-7200)).strftime("%Y-%m-%dT%H:%M:%SZ")
    def hav(a,b,c,e):
        R=6371000;p1=math.radians(a);p2=math.radians(c);dp=math.radians(c-a);dl=math.radians(e-b)
        x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
        return 2*R*math.asin(math.sqrt(x))
    def bearing(a,b,c,e):
        y=math.sin(math.radians(e-b))*math.cos(math.radians(c))
        x=math.cos(math.radians(a))*math.sin(math.radians(c))-math.sin(math.radians(a))*math.cos(math.radians(c))*math.cos(math.radians(e-b))
        return (math.degrees(math.atan2(y,x))+360)%360
    DIRS=['N','NE','E','SE','S','SO','O','NO']
    def cdir(h): return DIRS[round(h/45)%8]
    for i,r in enumerate(S):
        r["hd"]=round(bearing(S[i-1]["lat"],S[i-1]["lon"],r["lat"],r["lon"])) if (i>0 and S[i-1]["lat"] and r["lat"]) else None
    S[0]["hd"]=S[1]["hd"]
    def kmh(r): return r["hs"]*3.6 if r.get("hs") is not None else None
    def mmss(t): return f"{int(t//60)}:{int(t%60):02d}"
    lats=[r["lat"] for r in S]; lons=[r["lon"] for r in S]
    clat=(min(lats)+max(lats))/2; clon=(min(lons)+max(lons))/2

    # gradientes por color
    G={"green":("#12b312","#0a7c0a"),"blue":("#3a8bf0","#1c5cab"),"orange":("#f47a3f","#c14e22"),
       "violet":("#9a5cf0","#6a37c0"),"red":("#ee5555","#b32a2a"),"indigo":("#6e70e6","#4143b0"),
       "amber":("#dd8636","#a15816"),"navy":("#3a4straight","#171e33"),"track":("#3a8bf0","#1a5bc0")}
    G["navy"]=("#3a4668","#171e33")
    # color del numero heroe (brillante para tema oscuro)
    HB={"green":"#3ad24f","blue":"#6db0ff","orange":"#ff8c52","violet":"#b07bff","red":"#ff6b6b",
        "indigo":"#9092ff","amber":"#f0a24e","navy":"#9fb0d8","track":"#6db0ff"}
    # paleta oscura (grafito, mas contraste)
    BG="#22252d"; BODY="#22252d"; TILEBG="#2f333d"; TXT="#f6f7f9"; MUT="#a4aab5"; FOOT="#8a909b"; LBL="#b2b8c3"
    TILEBORDER="rgba(255,255,255,.08)"; BARTRACK="#3a3f4a"
    MATTE=BG  # mismo color que la tarjeta: el marco del globo de GE se vuelve invisible
    PANEL="#20232b"; PTILE="#2b2f39"  # panel oscuro de estadisticas sobre la cabecera de color
    def kmlcol(h):  # #rrggbb -> aabbggrr (KML)
        h=h.lstrip('#'); return 'ff'+h[4:6]+h[2:4]+h[0:2]
    def mix(h1,h2,t):  # mezcla h1->h2 en proporcion t (0..1)
        h1=h1.lstrip('#'); h2=h2.lstrip('#')
        c1=[int(h1[i:i+2],16) for i in (0,2,4)]; c2=[int(h2[i:i+2],16) for i in (0,2,4)]
        return '#'+''.join(f'{round(a+(b-a)*t):02x}' for a,b in zip(c1,c2))

    def vv(r):
        if r.get("vs") is None: return "&mdash;"
        a="&#8593;" if r["vs"]>=0 else "&#8595;"
        return f'{a} {abs(r["vs"]):.1f} m/s'
    def vel(r):
        s=kmh(r); return f"{s:.0f} km/h" if s is not None else "&mdash;"
    def rumbo(r):
        return f'{r["hd"]:.0f}&deg; {cdir(r["hd"])}' if r.get("hd") is not None else "&mdash;"
    def pct(v,ref): return max(4,min(100,round(v/ref*100)))

    def tile(lbl,val):
        return (f'<td style="padding:9px 12px;background:{PTILE};border-radius:10px;width:50%;vertical-align:top">'
                f'<div style="font-size:9px;letter-spacing:.6px;color:{MUT};text-transform:uppercase;line-height:1.25">{lbl}</div>'
                f'<div style="font-size:14px;font-weight:700;color:{TXT};margin-top:5px;line-height:1.15">{val}</div></td>')
    def grid(pairs):
        cells=[tile(l,v) for l,v in pairs]
        rows=""
        for i in range(0,len(cells),2):
            pair=cells[i:i+2]
            if len(pair)==1: pair.append('<td style="width:50%"></td>')
            rows+="<tr>"+pair[0]+'<td style="width:12px"></td>'+pair[1]+"</tr>"
            rows+='<tr><td colspan="3" style="height:12px;font-size:0;line-height:0">&nbsp;</td></tr>'
        return f'<table style="width:100%;border-collapse:separate;border-spacing:0">{rows}</table>'

    def card(accent,icon,title,subtitle,hero,bar_pct,tiles,r,frame=None):
        a1,a2=G[accent]; hb=HB[accent]
        hv,hu,hl=hero
        photo=(f'<img src="files/frm_{frame}.jpg" width="336" height="189" '
               f'style="display:block;width:100%;height:auto;border-radius:9px;margin-bottom:12px">') if frame else ''
        return ("<![CDATA["
        f'<div style="width:360px;color:{TXT};font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif">'
        # cabecera: sin fondo propio -> se ve el color del globo (bgColor) llenando todo el ancho
        f'<table style="width:100%;border-collapse:collapse"><tr>'
        f'<td style="width:34px;vertical-align:middle;padding:8px 0 13px">'
        f'<img src="files/{icon}" width="32" height="32" style="display:block"></td>'
        f'<td style="padding:8px 0 13px 12px;vertical-align:middle">'
        f'<div style="color:#fff;font-size:16px;font-weight:800;line-height:1.2">{title}</div>'
        f'<div style="color:rgba(255,255,255,.9);font-size:11px;margin-top:3px">{subtitle}</div>'
        f'</td></tr></table>'
        # panel oscuro de estadisticas
        f'<div style="background:{PANEL};border-radius:14px;padding:12px">'
        f'{photo}'
        f'<div style="display:flex;align-items:baseline;gap:7px">'
        f'<span style="font-size:34px;font-weight:800;line-height:1;color:{hb};letter-spacing:-1px">{hv}</span>'
        f'<span style="font-size:14px;font-weight:600;color:{MUT}">{hu}</span></div>'
        f'<div style="font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:{LBL};margin:5px 0 12px">{hl}</div>'
        f'<div style="height:6px;background:{BARTRACK};border-radius:4px;overflow:hidden;margin-bottom:14px">'
        f'<div style="height:6px;width:{bar_pct}%;background:linear-gradient(90deg,{hb},{a2});border-radius:4px"></div></div>'
        f'{grid(tiles)}'
        f'<div style="margin-top:13px;font-size:11px;color:{FOOT}">&#128205; {r["lat"]:.6f}, {r["lon"]:.6f}</div>'
        f'</div></div>]]>')

    # secundarios (mosaicos) excluyendo la metrica heroe
    def tiles_for(r,skip):
        allt=[("mom","Momento",f"<b>{mmss(r['t'])}</b>"),("alt","Altura",f"{r['rel']:.0f} m"),
              ("altsl","Altitud",f"{r['ab']:.0f} m"),("vel","Velocidad",vel(r)),
              ("vvert","Vel. vertical",vv(r)),("rumbo","Rumbo",rumbo(r)),("temp","Temp. color",f"{r['ct']:.0f} K")]
        out=[(l,v) for k,l,v in allt if k!=skip]
        return out[:6]

    # ---- puntos ----
    despegue=S[0]; aterr=S[-1]
    alto=max(S,key=lambda r:r["rel"])
    lejano=max(S,key=lambda r:hav(tk[0],tk[1],r["lat"],r["lon"]))
    rapido=max((r for r in S if r.get("hs") is not None),key=lambda r:r["hs"])
    _umbral=min(100,0.8*max(x["rel"] for x in S))  # descenso: por debajo de vuelos que no llegan a 100 m
    desc_start=next((S[i] for i in range(len(S)-1,0,-1) if S[i]["rel"]>_umbral), max(S,key=lambda x:x["rel"]))
    dive=min(S,key=lambda r:(r["vs"] if r.get("vs") is not None else 9))
    luz=max(S,key=lambda r:r["iso"])
    maxfar=hav(tk[0],tk[1],lejano["lat"],lejano["lon"])

    def sub(r): return f"Minuto {mmss(r['t'])} &middot; {r['ab']:.0f} m msnm"
    CFG=[
     ("1 · Despegue","pin_up","green","ico_up.png","Despegue",sub(despegue),
       (f"{despegue['rel']:.0f}","m","Altura al iniciar la grabacion"),pct(despegue['rel'],120),"alt",despegue),
     (f"Punto mas alto · {alto['rel']:.0f} m","pin_hi","blue","ico_hi.png","Punto mas alto",sub(alto),
       (f"{alto['rel']:.0f}","m","Altura maxima sobre el despegue"),100,"alt",alto),
     (f"Punto mas lejano · {maxfar:.0f} m","pin_far","orange","ico_far.png","Punto mas lejano",sub(lejano),
       (f"{maxfar:.0f}","m","Distancia al punto de despegue"),100,"dist",lejano),
     (f"Velocidad maxima · {kmh(rapido):.0f} km/h","pin_fast","violet","ico_fast.png","Velocidad maxima",sub(rapido),
       (f"{kmh(rapido):.0f}","km/h","Velocidad horizontal maxima"),100,"vel",rapido),
     (f"Inicio del descenso · {desc_start['rel']:.0f} m","pin_topdesc","indigo","ico_topdesc.png","Inicio del descenso",sub(desc_start),
       (f"{desc_start['rel']:.0f}","m","Empieza a bajar para aterrizar"),pct(desc_start['rel'],120),"alt",desc_start),
     (f"Descenso mas rapido · {abs(dive['vs']):.1f} m/s","pin_dive","amber","ico_dive.png","Descenso mas rapido",sub(dive),
       (f"{abs(dive['vs']):.1f}","m/s","Bajada mas rapida (aterrizaje)"),100,"vvert",dive),
     (f"Menos luz · ISO {luz['iso']:.0f}","pin_light","navy","ico_light.png","Menos luz",sub(luz),
       (f"{luz['iso']:.0f}","ISO","Maxima sensibilidad (menos luz)"),100,"temp",luz),
     ("5 · Aterrizaje","pin_down","red","ico_down.png","Aterrizaje",sub(aterr),
       (f"{aterr['rel']:.0f}","m","Altura al tocar suelo"),pct(aterr['rel'],120),"alt",aterr),
    ]
    keypoints=""
    for name,style,ak,icon,htitle,subt,hero,bp,skip,r in CFG:
        b=card(ak,icon,htitle,subt,hero,bp,tiles_for(r,skip),r,frame=style.replace("pin_",""))
        keypoints+=(f'  <Placemark><name>{name}</name><styleUrl>#{style}</styleUrl>\n'
                    f'   <description>{b}</description>\n'
                    f'   <Point><altitudeMode>absolute</altitudeMode>'
                    f'<coordinates>{r["lon"]},{r["lat"]},{r["ab"]:.1f}</coordinates></Point></Placemark>\n')

    # minutos
    def minute(target):
        r=min(S,key=lambda x:abs(x["t"]-target)); nm=f"{target//60}:00"
        b=card("track","ico_min.png",f"Minuto {nm}",f"Posicion &middot; {r['ab']:.0f} m msnm",
               (f"{r['rel']:.0f}","m","Altura sobre el despegue"),pct(r['rel'],120),
               tiles_for(r,"alt"),r)
        return (f'  <Placemark><name>{nm}</name><styleUrl>#pin_min</styleUrl>\n'
                f'   <description>{b}</description>\n'
                f'   <Point><altitudeMode>absolute</altitudeMode>'
                f'<coordinates>{r["lon"]},{r["lat"]},{r["ab"]:.1f}</coordinates></Point></Placemark>\n')
    minutes="".join(minute(m) for m in (60,120,180,240,300))

    # track animado (globo premium)
    a1,a2=G["track"]
    track_desc=("<![CDATA["
     f'<div style="width:360px;color:{TXT};font-family:-apple-system,system-ui,sans-serif">'
     f'<table style="width:100%;border-collapse:collapse"><tr>'
     f'<td style="width:38px;padding:8px 0 13px;vertical-align:middle">'
     f'<img src="files/drone.png" width="36" height="36" style="display:block"></td>'
     f'<td style="padding:8px 0 13px 12px;vertical-align:middle"><div style="color:#fff;font-size:16px;font-weight:800">Vuelo DJI Neo 2</div>'
     f'<div style="color:rgba(255,255,255,.9);font-size:11px;margin-top:3px">{_fecha} &middot; {_dur} min</div></td>'
     f'</tr></table>'
     f'<div style="background:{PANEL};border-radius:14px;padding:12px">'
     f'{grid([("Altura maxima",f"{_relmax} m"),("Alejamiento","%d m"%round(maxfar)),("Recorrido",f"{_dist} m"),("Vel. maxima","%d km/h"%round(kmh(rapido))),("Duracion",_dur),("Fotogramas",_frames)])}'
     f'<div style="margin-top:13px;font-size:9px;letter-spacing:.5px;color:{MUT};text-transform:uppercase">Perfil de altitud</div>'
     f'<img src="files/spark.png" width="328" height="92" style="display:block;width:100%;height:auto;margin-top:5px;border-radius:8px">'
     f'<div style="display:flex;justify-content:space-between;font-size:10px;color:{FOOT};margin-top:3px">'
     f'<span>0:00</span><span>max {_relmax} m</span><span>{_dur}</span></div>'
     f'<div style="margin-top:11px;font-size:11px;color:{MUT};line-height:1.5">'
     f'&#9654; Usa la barra de tiempo para reproducir<br>&#128295; Clic derecho &#8594; Mostrar perfil de elevacion</div>'
     f'</div></div>]]>')

    def arr(name,vals): return f'      <gx:SimpleArrayData name="{name}">'+"".join(f"<gx:value>{v}</gx:value>" for v in vals)+"</gx:SimpleArrayData>\n"
    whens="".join(f"    <when>{utc(r['t'])}</when>\n" for r in S)
    coords="".join(f"    <gx:coord>{r['lon']} {r['lat']} {r['ab']:.1f}</gx:coord>\n" for r in S)
    ext=("    <ExtendedData><SchemaData schemaUrl=\"#fs\">\n"
     +arr("altura_m",[f"{r['rel']:.0f}" for r in S])
     +arr("velocidad_kmh",[f"{kmh(r):.0f}" if kmh(r) is not None else 0 for r in S])
     +arr("vertical_ms",[r["vs"] if r.get("vs") is not None else 0 for r in S])
     +arr("rumbo_deg",[r["hd"] if r.get("hd") is not None else 0 for r in S])
     +arr("iso",[f"{r['iso']:.0f}" for r in S])+arr("temp_color_k",[f"{r['ct']:.0f}" for r in S])
     +"    </SchemaData></ExtendedData>\n")
    line=" ".join(f"{r['lon']},{r['lat']},{r['ab']:.1f}" for r in S)

    def bstyle(accent):  # fondo = tono del acento mezclado con gris oscuro (mas tenue), rellena el globo entero
        tint=mix(G[accent][1],"#2a2d35",0.55)  # 55% hacia el gris del panel
        return f'<BalloonStyle><bgColor>{kmlcol(tint)}</bgColor><text><![CDATA[$[description]]]></text></BalloonStyle>'
    def pstyle(sid,icon,accent,scale=1.15,label=False):
        lab='<LabelStyle><scale>0.8</scale></LabelStyle>' if label else ''
        return f' <Style id="{sid}"><IconStyle><scale>{scale}</scale><Icon><href>files/{icon}</href></Icon></IconStyle>{lab}{bstyle(accent)}</Style>\n'
    styles=(
     f' <Style id="track"><LineStyle><color>ff2878eb</color><width>4</width></LineStyle>{bstyle("track")}</Style>\n'
     f' <Style id="wall"><LineStyle><color>882878eb</color><width>2</width></LineStyle><PolyStyle><color>1c2878eb</color></PolyStyle>{bstyle("track")}</Style>\n'
     f' <Style id="drone"><IconStyle><scale>1.5</scale><Icon><href>files/drone.png</href></Icon></IconStyle>'
     f'<LineStyle><color>ff2878eb</color><width>4</width></LineStyle><LabelStyle><scale>0.9</scale></LabelStyle>{bstyle("track")}</Style>\n'
     +pstyle("pin_up","ico_up.png","green")+pstyle("pin_hi","ico_hi.png","blue")+pstyle("pin_far","ico_far.png","orange")
     +pstyle("pin_fast","ico_fast.png","violet")+pstyle("pin_down","ico_down.png","red")+pstyle("pin_topdesc","ico_topdesc.png","indigo")
     +pstyle("pin_dive","ico_dive.png","amber")+pstyle("pin_light","ico_light.png","navy")+pstyle("pin_min","ico_min.png","track",0.7,True))

    kml=f'''<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
    <Document>
     <name>Vuelo DJI Neo 2 — 2026-08-06 (avanzado)</name>
     <open>1</open>
     <LookAt><longitude>{clon:.6f}</longitude><latitude>{clat:.6f}</latitude>
      <altitude>760</altitude><heading>0</heading><tilt>55</tilt><range>1800</range><altitudeMode>absolute</altitudeMode></LookAt>
    {styles}
     <Folder><name>Trayectoria del vuelo</name><open>1</open>
      <Placemark><name>Recorrido</name><styleUrl>#track</styleUrl>
       <description>{track_desc}</description>
       <LineString><tessellate>1</tessellate><altitudeMode>absolute</altitudeMode><coordinates>{line}</coordinates></LineString></Placemark>
      <Placemark><name>Muros de altitud</name><styleUrl>#wall</styleUrl>
       <description>{track_desc}</description>
       <LineString><extrude>1</extrude><tessellate>1</tessellate><altitudeMode>absolute</altitudeMode><coordinates>{line}</coordinates></LineString></Placemark>
     </Folder>
     <Folder><name>Vuelo animado (barra de tiempo)</name><open>1</open>
      <Placemark><name>Dron en movimiento</name><styleUrl>#drone</styleUrl>
       <description>{track_desc}</description>
       <gx:Track><altitudeMode>absolute</altitudeMode>
    {whens}{coords}   </gx:Track>
      </Placemark>
     </Folder>
     <Folder><name>Puntos clave</name><open>1</open>
    {keypoints} </Folder>
     <Folder><name>Marcas de minuto</name><open>0</open>
    {minutes} </Folder>
    </Document></kml>'''

    out=OUT+"/"+BASE+"-avanzado.kmz"
    icons=["drone","ico_up","ico_down","ico_hi","ico_far","ico_fast","ico_topdesc","ico_dive","ico_light","ico_min","spark"]
    photos=["up","hi","far","fast","topdesc","dive","light","down"]
    with zipfile.ZipFile(out,"w",zipfile.ZIP_DEFLATED) as z:
        z.writestr("doc.kml",kml)
        for n in icons:
            src=(WORK+"/spark.png") if n=="spark" else (ASSETS+"/iconos/"+n+".png")
            z.write(src,"files/"+n+".png")
        for p in photos: z.write(WORK+f"/frames/frm_{p}.jpg","files/"+f"frm_{p}.jpg")
    with zipfile.ZipFile(out) as z:
        X.parseString(z.read("doc.kml")); names=z.namelist()
    print("KMZ:",os.path.getsize(out),"bytes — XML OK |",len(names),"archivos | placemarks",kml.count("<Placemark>"))
    for n in icons: assert f"files/{n}.png" in names
    for p in photos: assert f"files/frm_{p}.jpg" in names
    print("OK — fotogramas incrustados:",len(photos))


if __name__=="__main__":
    import os
    run(dict(os.environ))
"""Utilidades compartidas: carga de datos, puntos clave y proyeccion Web Mercator."""
import json, math, os

def load(work):
    return json.load(open(os.path.join(work, "data.json")))

def hav(a, b, c, e):
    R=6371000; p1=math.radians(a); p2=math.radians(c); dp=math.radians(c-a); dl=math.radians(e-b)
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))

def mmss(t): t=int(round(t)); return f"{t//60}:{t%60:02d}"
def kmh(x): return x["hs"]*3.6 if x.get("hs") is not None else None

def keypoints(d):
    """Devuelve los 8 hitos del vuelo en orden, cada uno con key/label/metric/sub y la muestra."""
    S=d["series"]; tk=d["takeoff"]
    for x in S: x["far"]=hav(tk[0], tk[1], x["lat"], x["lon"])
    alto=max(S, key=lambda x:x["rel"])
    lejano=max(S, key=lambda x:x["far"])
    rapido=max((x for x in S if x.get("hs") is not None), key=lambda x:x["hs"])
    umbral=min(100, 0.8*max(x["rel"] for x in S))  # vuelos que no llegan a 100 m
    desc_start=next((S[i] for i in range(len(S)-1,0,-1) if S[i]["rel"]>umbral), alto)
    dive=min(S, key=lambda x:(x["vs"] if x.get("vs") is not None else 9))
    luz=max(S, key=lambda x:x["iso"])
    kp=[
     ("up","Despegue",S[0],f"{S[0]['rel']:.0f} m","Altura al iniciar"),
     ("light","Menos luz",luz,f"ISO {luz['iso']:.0f}","Máxima sensibilidad"),
     ("far","Punto más lejano",lejano,f"{lejano['far']:.0f} m","Del despegue"),
     ("hi","Punto más alto",alto,f"{alto['rel']:.0f} m","Sobre el despegue"),
     ("topdesc","Inicio del descenso",desc_start,f"{desc_start['rel']:.0f} m","Empieza a bajar"),
     ("fast","Velocidad máxima",rapido,f"{kmh(rapido):.0f} km/h","Horizontal"),
     ("dive","Descenso más rápido",dive,f"{abs(dive['vs']):.1f} m/s","Bajada máxima"),
     ("down","Aterrizaje",S[-1],f"{S[-1]['rel']:.0f} m","Al tocar suelo"),
    ]
    return [dict(key=k, label=l, x=x, metric=me, sub=su, t=x["t"], lat=x["lat"], lon=x["lon"]) for k,l,x,me,su in kp]

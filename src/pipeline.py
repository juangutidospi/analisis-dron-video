#!/usr/bin/env python3
"""Orquesta todas las etapas. Usable desde CLI y desde la app (GUI)."""
import os, sys, tempfile, shutil

SRC=os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SRC)
import extract, exports, satellite, frames, report, kmz

def _res_base():
    # recursos (assets/plantilla): en el .app empaquetado van en _MEIPASS
    return getattr(sys, "_MEIPASS", None) or os.path.dirname(SRC)

def _assets_dir():
    b=_res_base()
    for cand in (os.path.join(b,"assets"), os.path.join(b,"..","assets")):
        if os.path.isdir(cand): return os.path.abspath(cand)
    return os.path.join(b,"assets")

def _template():
    b=_res_base()
    for cand in (os.path.join(b,"report_template.html"), os.path.join(SRC,"report_template.html")):
        if os.path.isfile(cand): return os.path.abspath(cand)
    return os.path.join(SRC,"report_template.html")

def _ffmpeg():
    # en el .app empaquetado va un ffmpeg junto a los recursos
    b=getattr(sys, "_MEIPASS", None)
    if b:
        import glob
        for c in glob.glob(os.path.join(b, "ffmpeg*")):
            try: os.chmod(c, 0o755)
            except Exception: pass
            return c
    try:
        import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"

def find_mp4(srt):
    for ext in (".MP4",".mp4",".Mp4"):
        c=os.path.splitext(srt)[0]+ext
        if os.path.exists(c): return c
    return ""

def default_dests():
    """Carpetas donde dejar los resultados: la del proyecto (si existe) y la del Desktop."""
    home=os.path.expanduser("~"); dests=[]
    if not getattr(sys, "frozen", False):
        prj=os.path.dirname(SRC)  # ejecutando desde el codigo: carpeta del proyecto
        dests.append(os.path.join(prj, "outputs"))
    else:
        prj=os.path.join(home, "Desktop", "analisis-dron")  # app portable: si el proyecto esta en el Desktop
        if os.path.isdir(prj): dests.append(os.path.join(prj, "outputs"))
    dests.append(os.path.join(home, "Desktop", "analisis-dron-salidas"))
    seen=set(); out=[]
    for d in dests:
        d=os.path.abspath(d)
        if d not in seen: seen.add(d); out.append(d)
    return out

def run_pipeline(srt, mp4=None, out_roots=None, titulo="Vuelo con DJI Neo 2", log=print):
    base=os.path.splitext(os.path.basename(srt))[0]
    mp4=mp4 or find_mp4(srt)
    roots=out_roots or default_dests()
    dests=[os.path.join(r, base) for r in roots]
    primary=dests[0]
    cfg=dict(SRT=srt, MP4=mp4 or "", BASE=base,
             WORK=os.path.join(tempfile.gettempdir(), "analisis-dron", base),
             OUT=primary, ASSETS=_assets_dir(), TEMPLATE=_template(),
             TITULO=titulo or "Vuelo con DJI Neo 2", FFMPEG=_ffmpeg())
    os.makedirs(cfg["WORK"], exist_ok=True); os.makedirs(primary, exist_ok=True)

    log(f"▶ Vuelo: {base}")
    log("· Telemetría…");   extract.run(cfg)
    log("· GPX/KML/CSV…");  exports.run(cfg)
    if cfg["MP4"] and os.path.exists(cfg["MP4"]):
        log("· Satélite…");        satellite.run(cfg)
        log("· Fotogramas…");      frames.run(cfg)
        log("· Informe HTML…");    report.run(cfg)
        log("· Google Earth…");    kmz.run(cfg)
    else:
        log("⚠ Sin MP4: solo GPX/KML/CSV (el informe y el KMZ necesitan el vídeo).")

    # copiar a las demas carpetas de destino
    for d in dests[1:]:
        os.makedirs(d, exist_ok=True)
        for f in os.listdir(primary):
            shutil.copy2(os.path.join(primary, f), os.path.join(d, f))
    for d in dests:
        log(f"✅ Guardado en: {d}")
    return primary

if __name__=="__main__":
    if len(sys.argv)<2:
        print("Uso: pipeline.py vuelo.SRT [vuelo.MP4]"); sys.exit(1)
    srt=sys.argv[1]; mp4=sys.argv[2] if len(sys.argv)>2 and sys.argv[2] else None
    run_pipeline(srt, mp4, titulo=os.environ.get("TITULO","Vuelo con DJI Neo 2"))

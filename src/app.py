#!/usr/bin/env python3
"""Ventana para generar el análisis de un vuelo DJI."""
import os, sys, threading, subprocess, traceback
import tkinter as tk
from tkinter import filedialog
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pipeline

BG="#12141a"; CARD="#1b1e26"; FIELD="#20232b"; INK="#f4f5f7"; MUT="#9aa0ab"; SUB="#7e8390"
BLUE="#3a8bf0"; BLUE_H="#5a9ff4"; GREEN="#2fc39a"; GREEN_H="#43d3ab"
GREY="#2b2f39"; GREY_H="#363b47"; DISABLED="#2a2d35"; DIS_TXT="#5b606b"

def _round(cv, x1,y1,x2,y2,r,**kw):
    pts=[x1+r,y1,x2-r,y1,x2,y1,x2,y1+r,x2,y2-r,x2,y2,x2-r,y2,x1+r,y2,x1,y2,x1,y2-r,x1,y1+r,x1,y1]
    return cv.create_polygon(pts, smooth=True, **kw)

class CButton(tk.Canvas):
    """Botón dibujado a mano (color y esquinas redondeadas, se ve igual en macOS)."""
    def __init__(self, parent, text, command=None, kind="primary", width=210, height=46):
        super().__init__(parent, width=width, height=height, bg=parent["bg"],
                         highlightthickness=0, bd=0)
        pal={"primary":(BLUE,BLUE_H,"#fff"),"success":(GREEN,GREEN_H,"#07352a"),
             "secondary":(GREY,GREY_H,INK)}
        self.c0,self.ch,self.fg=pal[kind]; self.cmd=command; self.enabled=True
        self.W,self.H=width,height
        self.rect=_round(self,2,2,width-2,height-2,12,fill=self.c0,outline="")
        self.lbl=self.create_text(width/2,height/2,text=text,fill=self.fg,
                                  font=("Helvetica Neue",14,"bold"))
        self.bind("<Enter>", lambda e:self.enabled and self.itemconfig(self.rect,fill=self.ch))
        self.bind("<Leave>", lambda e:self.enabled and self.itemconfig(self.rect,fill=self.c0))
        self.bind("<Button-1>", lambda e:self._click())
    def _click(self):
        if self.enabled and self.cmd: self.cmd()
    def set_text(self,t): self.itemconfig(self.lbl,text=t)
    def set_enabled(self,on):
        self.enabled=on
        self.itemconfig(self.rect,fill=self.c0 if on else DISABLED)
        self.itemconfig(self.lbl,fill=self.fg if on else DIS_TXT)
        self.config(cursor="pointinghand" if on else "arrow")

class App:
    def __init__(self, root):
        self.root=root; self.srt=None; self.mp4=""; self.out=None; self.running=False
        root.title("Análisis de vuelos DJI")
        root.configure(bg=BG); root.geometry("660x620"); root.minsize(600,560)

        head=tk.Frame(root,bg=BG); head.pack(fill="x",padx=26,pady=(22,0))
        tk.Label(head,text="🚁",bg=BG,font=("Helvetica",30)).pack(side="left")
        tt=tk.Frame(head,bg=BG); tt.pack(side="left",padx=12)
        tk.Label(tt,text="Análisis de vuelos DJI",bg=BG,fg=INK,
                 font=("Helvetica Neue",22,"bold")).pack(anchor="w")
        tk.Label(tt,text="Convierte la telemetría de tu vuelo en un informe completo.",
                 bg=BG,fg=SUB,font=("Helvetica Neue",12)).pack(anchor="w")

        card=tk.Frame(root,bg=CARD); card.pack(fill="x",padx=26,pady=(18,0))
        self._pad=tk.Frame(card,bg=CARD); self._pad.pack(fill="x",padx=18,pady=16)

        # fila 1: SRT
        r1=tk.Frame(self._pad,bg=CARD); r1.pack(fill="x")
        tk.Label(r1,text="1",bg=BLUE,fg="#fff",font=("Helvetica Neue",12,"bold"),
                 width=2).pack(side="left",ipady=2)
        tk.Label(r1,text="  Archivo del vuelo (.SRT)",bg=CARD,fg=INK,
                 font=("Helvetica Neue",13,"bold")).pack(side="left")
        r1b=tk.Frame(self._pad,bg=CARD); r1b.pack(fill="x",pady=(8,0))
        CButton(r1b,"Elegir .SRT…",self.choose_srt,"secondary",width=160,height=40).pack(side="left")
        self.lbl_srt=tk.Label(r1b,text="ningún archivo",bg=CARD,fg=MUT,
                              font=("Helvetica Neue",12)); self.lbl_srt.pack(side="left",padx=12)

        # fila 2: MP4
        r2=tk.Frame(self._pad,bg=CARD); r2.pack(fill="x",pady=(16,0))
        tk.Label(r2,text="2",bg=GREEN,fg="#07352a",font=("Helvetica Neue",12,"bold"),
                 width=2).pack(side="left",ipady=2)
        tk.Label(r2,text="  Vídeo (.MP4)  ",bg=CARD,fg=INK,
                 font=("Helvetica Neue",13,"bold")).pack(side="left")
        tk.Label(r2,text="se detecta solo; cámbialo si hace falta",bg=CARD,fg=SUB,
                 font=("Helvetica Neue",11)).pack(side="left")
        r2b=tk.Frame(self._pad,bg=CARD); r2b.pack(fill="x",pady=(8,0))
        CButton(r2b,"Elegir .MP4…",self.choose_mp4,"secondary",width=160,height=40).pack(side="left")
        self.lbl_mp4=tk.Label(r2b,text="—",bg=CARD,fg=MUT,
                              font=("Helvetica Neue",12)); self.lbl_mp4.pack(side="left",padx=12)

        # fila 3: título
        r3=tk.Frame(self._pad,bg=CARD); r3.pack(fill="x",pady=(16,0))
        tk.Label(r3,text="Título del informe",bg=CARD,fg=INK,
                 font=("Helvetica Neue",13,"bold")).pack(anchor="w")
        self.title_var=tk.StringVar(value="Vuelo con DJI Neo 2")
        e=tk.Entry(self._pad,textvariable=self.title_var,bg=FIELD,fg=INK,insertbackground=INK,
                   relief="flat",font=("Helvetica Neue",13)); e.pack(fill="x",pady=(6,0),ipady=7)

        # generar
        self.btn_go=CButton(root,"Generar análisis",self.generate,"success",width=240,height=50)
        self.btn_go.pack(anchor="w",padx=26,pady=(16,8)); self.btn_go.set_enabled(False)

        self.log=tk.Text(root,bg=CARD,fg=INK,relief="flat",font=("Menlo",11),
                         height=10,wrap="word",padx=14,pady=12,insertbackground=INK)
        self.log.pack(fill="both",expand=True,padx=26,pady=(0,8)); self.log.configure(state="disabled")

        foot=tk.Frame(root,bg=BG); foot.pack(fill="x",padx=26,pady=(0,18))
        self.btn_open=CButton(foot,"Abrir resultados",self.open_out,"secondary",width=180,height=40)
        self.btn_open.pack(side="left"); self.btn_open.set_enabled(False)

    # ---- lógica ----
    def _short(self,p): return os.path.basename(p) if p else ""
    def choose_srt(self):
        p=filedialog.askopenfilename(title="Elige el .SRT del vuelo",
            filetypes=[("Telemetría DJI","*.SRT *.srt"),("Todos","*.*")])
        if not p: return
        self.srt=p; self.lbl_srt.config(text=self._short(p),fg=INK)
        self.mp4=pipeline.find_mp4(p)
        self.lbl_mp4.config(text=(self._short(self.mp4)+"  ✓") if self.mp4 else "no encontrado — elígelo",
                            fg=(GREEN if self.mp4 else "#e0a33a"))
        self.btn_go.set_enabled(True)
    def choose_mp4(self):
        p=filedialog.askopenfilename(title="Elige el .MP4 del vuelo",
            filetypes=[("Vídeo","*.MP4 *.mp4 *.mov *.MOV"),("Todos","*.*")])
        if not p: return
        self.mp4=p; self.lbl_mp4.config(text=self._short(p)+"  ✓",fg=GREEN)

    def _log(self,msg):
        self.log.configure(state="normal"); self.log.insert("end",msg+"\n")
        self.log.see("end"); self.log.configure(state="disabled")
    def log_safe(self,msg): self.root.after(0,self._log,msg)

    def generate(self):
        if self.running or not self.srt: return
        self.running=True; self.btn_go.set_enabled(False); self.btn_open.set_enabled(False)
        self.log.configure(state="normal"); self.log.delete("1.0","end"); self.log.configure(state="disabled")
        threading.Thread(target=self._work,daemon=True).start()
    def _work(self):
        try:
            out=pipeline.run_pipeline(self.srt, mp4=(self.mp4 or None),
                                      titulo=self.title_var.get(), log=self.log_safe)
            self.out=out
            self.root.after(0, lambda: self.btn_open.set_enabled(True))
        except Exception:
            self.log_safe("‼ Error:\n"+traceback.format_exc())
        finally:
            self.running=False
            self.root.after(0, lambda: self.btn_go.set_enabled(True))
    def open_out(self):
        if self.out and os.path.isdir(self.out): subprocess.Popen(["open",self.out])

def main():
    args=[a for a in sys.argv[1:] if not a.startswith("-")]
    if args and args[0].lower().endswith(".srt"):
        pipeline.run_pipeline(args[0]); return
    root=tk.Tk(); App(root); root.mainloop()

if __name__=="__main__":
    main()

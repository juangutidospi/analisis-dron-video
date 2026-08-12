#!/usr/bin/env python3
"""Empaqueta los módulos ES de js/ en un único js/bundle.js (script clásico).
Así la web funciona también abriendo index.html con doble clic (file://), donde
Chrome bloquea los módulos ES. Mantén los módulos de js/ como fuente y ejecuta
este script tras cada cambio: python3 build.py
"""
import re, os

ORDER = ['srt', 'geo', 'charts', 'satmap', 'exports', 'zip', 'kmz', 'frames', 'report', 'app']
HERE = os.path.dirname(os.path.abspath(__file__))
JS = os.path.join(HERE, 'js')

IMPORT_RE = re.compile(r"^\s*import\s*\{([^}]+)\}\s*from\s*'\./(\w+)\.js';\s*$", re.M)
EXP_FN = re.compile(r"export\s+(?:async\s+)?function\s+(\w+)")
EXP_CONST = re.compile(r"export\s+const\s+(\w+)")

def build():
    parts = ["/* Generado por build.py — NO editar a mano. Fuente: js/*.js */", "(function(){", "'use strict';", "var __REG = {};"]
    for name in ORDER:
        src = open(os.path.join(JS, name + '.js'), encoding='utf-8').read()
        # imports -> desestructurar del registro
        src = IMPORT_RE.sub(lambda m: f"const {{{m.group(1).strip()}}} = __REG['{m.group(2)}'];", src)
        # nombres exportados
        exports = EXP_FN.findall(src) + EXP_CONST.findall(src)
        # quitar la palabra export
        src = re.sub(r"export\s+(?=(?:async\s+)?function|const)", "", src)
        ret = "return {" + ", ".join(exports) + "};" if exports else ""
        parts.append(f"__REG['{name}'] = (function(){{\n{src}\n{ret}\n}})();")
    parts.append("})();")
    out = "\n".join(parts)
    open(os.path.join(JS, 'bundle.js'), 'w', encoding='utf-8').write(out)
    print(f"bundle.js: {len(out)//1024} KB ({len(ORDER)} módulos)")

if __name__ == '__main__':
    build()

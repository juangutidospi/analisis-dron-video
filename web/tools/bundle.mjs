#!/usr/bin/env node
/**
 * Une los módulos ES de web/ en web/app.bundle.js, un archivo clásico sin
 * imports: así la web se abre también con doble clic (file://), donde Chrome
 * bloquea los módulos ES. Edita los módulos de js/ y regenera con:
 *   node tools/bundle.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = root;

/** @returns {Promise<string[]>} Rutas .js bajo un directorio, ordenadas. */
async function walk(dir) {
  const out = [];
  for (const e of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const id = (p) => posix.normalize(p.slice(WEB.length + 1).split('\\').join('/'));

const resolve = (from, spec) => {
  const base = from.split('/').slice(0, -1);
  for (const part of spec.split('/')) {
    if (part === '.' || part === '') continue;
    if (part === '..') base.pop(); else base.push(part);
  }
  return base.join('/');
};

/** Reescribe imports y exports de un módulo como registro en el bundle. */
function transform(moduleId, src) {
  const exported = [];
  let out = src;

  out = out.replace(/^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?$/gm, (_, names, spec) => {
    const list = names.split(',').map((n) => n.trim()).filter(Boolean)
      .map((n) => { const m = n.match(/^(\S+)\s+as\s+(\S+)$/); return m ? `${m[1]}: ${m[2]}` : n; });
    return `const { ${list.join(', ')} } = __req(${JSON.stringify(resolve(moduleId, spec))});`;
  });
  out = out.replace(/^import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"];?$/gm,
    (_, name, spec) => `const ${name} = __req(${JSON.stringify(resolve(moduleId, spec))}).default;`);
  out = out.replace(/^import\s+['"]([^'"]+)['"];?$/gm,
    (_, spec) => `__req(${JSON.stringify(resolve(moduleId, spec))});`);

  out = out.replace(/^export\s+default\s+/m, '__x.default = ');
  out = out.replace(/^export\s+(async\s+function|function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm,
    (_, kind, name) => { exported.push(name); return `${kind} ${name}`; });

  if (exported.length) out += `\nObject.assign(__x, { ${exported.join(', ')} });\n`;
  return out;
}

const files = [join(WEB, 'main.js'), ...await walk(join(WEB, 'js'))];
const parts = [];
for (const f of files) {
  parts.push(`__m[${JSON.stringify(id(f))}] = function (__x, __req) {\n${transform(id(f), await readFile(f, 'utf8'))}\n};`);
}

const bundle = `/**
 * GENERADO — no editar a mano. Une los módulos de web/ en un solo archivo
 * clásico para que la web se pueda abrir con doble clic (file://).
 * Regenerar tras tocar cualquier .js:  node tools/bundle.mjs
 */
(function () {
  const __m = {};
  const __c = {};
  function __req(moduleId) {
    if (__c[moduleId]) return __c[moduleId];
    const factory = __m[moduleId];
    if (!factory) throw new Error('módulo no registrado: ' + moduleId);
    const __x = {};
    __c[moduleId] = __x;
    factory(__x, __req);
    return __x;
  }

${parts.join('\n\n')}

  __req('main.js');
})();
`;

await writeFile(join(WEB, 'app.bundle.js'), bundle);
console.log(`app.bundle.js · ${files.length} módulos · ${(bundle.length / 1024).toFixed(0)} KB`);

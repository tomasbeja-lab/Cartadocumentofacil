// Arma la carpeta "dist" que se publica: copia "src" y completa dos datos automáticos.
//   - La versión del service worker (para que los celulares reciban cada actualización).
//   - El ID de Google Analytics, si está definido como variable de entorno GA_ID (opcional).
//   - La dirección del sitio (variable SITE_URL, por ejemplo https://cartadocumentofacil.com.ar) para el SEO:
//     enlaces canónicos, mapa del sitio y vista previa al compartir.
// No usa ninguna librería: alcanza con Node.
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'src';
const OUT = 'dist';

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(SRC, OUT, { recursive: true });

// 1) Versión del service worker = código de la publicación (o la hora, si se arma en tu computadora).
const build = (process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || String(Date.now())).slice(0, 8);
const swPath = join(OUT, 'sw.js');
writeFileSync(swPath, readFileSync(swPath, 'utf8').replaceAll('__BUILD__', build));

// 2) ID de Google Analytics (opcional). Si no está definido, el script queda desactivado.
const ga = (process.env.GA_ID || '').trim();
if (ga) {
  if (!/^G-[A-Z0-9]{6,}$/.test(ga)) throw new Error(`GA_ID no parece un ID de medición válido (debe empezar con "G-"): ${ga}`);
  const aPath = join(OUT, 'analytics.js');
  const original = readFileSync(aPath, 'utf8');
  if (!original.includes("var GA_ID = 'G-XXXXXXXXXX';")) throw new Error('No se encontró la línea GA_ID en analytics.js');
  writeFileSync(aPath, original.replace("var GA_ID = 'G-XXXXXXXXXX';", `var GA_ID = '${ga}';`));
}


// 3) Dirección del sitio para el SEO (canónicos, sitemap, imagen al compartir) y fecha de actualización.
function siteUrl() {
  let u = (process.env.SITE_URL || '').trim();
  if (u && !/^https?:\/\/[^/\s]+/.test(u)) throw new Error(`SITE_URL debe empezar con https:// (ej.: https://cartadocumentofacil.com.ar): ${u}`);
  if (!u && process.env.CF_PAGES_URL) {
    try {
      const h = new URL(process.env.CF_PAGES_URL).hostname;
      const m = h.match(/^[0-9a-f]{8}\.(.+\.pages\.dev)$/);   // quita el prefijo de cada publicación
      u = 'https://' + (m ? m[1] : h);
    } catch (e) { /* sigue sin dirección */ }
  }
  return (u || 'http://localhost:8080').replace(/\/+$/, '');
}
const SITE = siteUrl();
const LASTMOD = new Date().toISOString().slice(0, 10);
function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(html|xml|txt)$/.test(f)) continue;
    const t = readFileSync(p, 'utf8');
    if (t.includes('__SITE_URL__') || t.includes('__LASTMOD__')) writeFileSync(p, t.replaceAll('__SITE_URL__', SITE).replaceAll('__LASTMOD__', LASTMOD));
  }
}
walk(OUT);
if (!process.env.SITE_URL) console.warn(`Aviso: SITE_URL no está definida; se usa ${SITE}. Definila en Cloudflare cuando tengas el dominio.`);

console.log(`Listo: carpeta "${OUT}" armada para ${SITE}. Versión ${build}${ga ? ` · Google Analytics ${ga}` : ' · Google Analytics desactivado'}.`);

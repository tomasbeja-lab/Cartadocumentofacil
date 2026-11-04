# Carta Documento Fácil

Aplicación web para completar e imprimir una carta documento sobre el formulario preimpreso del Correo Argentino. Funciona en el navegador, se instala en el celular o la PC y no envía lo que escribís a ningún servidor.

No tiene base de datos ni servidor propio: son archivos estáticos (HTML, CSS y JavaScript).

## Publicación automática

El sitio está en **Cloudflare**, en el Worker `mute-disk-4b12` (archivos estáticos), con el dominio `cartadocumentofacil.com.ar`. Cada vez que se guarda un cambio en la rama `main`, **GitHub Actions** arma el sitio y lo publica solo, en menos de un minuto. No hay que subir nada a mano.

- El flujo está en `.github/workflows/deploy.yml`: ejecuta `npm run build` y después `wrangler deploy`, que sube la carpeta `dist` según `wrangler.jsonc`.
- También se puede lanzar a mano: pestaña **Actions** → **Publicar en Cloudflare** → **Run workflow**.
- Para ver si una publicación salió bien, entrá a la pestaña **Actions** (tilde verde = publicada).

Configuración en GitHub (Settings → Secrets and variables → Actions):

| Tipo | Nombre | Valor |
|---|---|---|
| Variable | `SITE_URL` | La dirección del sitio: `https://cartadocumentofacil.com.ar` (para el SEO) |
| Variable | `GA_ID` | El ID de Google Analytics (`G-…`); si se deja vacía, Analytics queda desactivado |
| Secreto | `CLOUDFLARE_API_TOKEN` | Token de Cloudflare con la plantilla “Edit Cloudflare Workers” |
| Secreto | `CLOUDFLARE_ACCOUNT_ID` | El ID de la cuenta de Cloudflare |

El comando de armado (`scripts/build.mjs`) copia `src/` a `dist/` y completa dos datos solos:

- **Versión del modo sin conexión:** cambia con cada publicación, así los celulares con la aplicación instalada reciben siempre la última versión. Ya no hay que acordarse de subir ningún número.
- **Google Analytics:** si definís la variable `GA_ID`, se carga en `analytics.js`. Si no la definís, queda desactivado.
- **Dirección del sitio:** con `SITE_URL` completa los enlaces canónicos, el mapa del sitio (`sitemap.xml`), `robots.txt` y la imagen que se ve al compartir. Si no la definís, los enlaces quedan apuntando a `localhost`: no la borres.

## Cómo editar (sin instalar nada)

1. Entrá al repositorio en github.com y abrí el archivo que querés cambiar (ver tabla de abajo).
2. Tocá el **lápiz** (Edit this file) y hacé el cambio.
3. Tocá **Commit changes**. GitHub Actions publica la nueva versión sola.

Si guardás un cambio en una **rama nueva** (la opción “Create a new branch” al confirmar), no se publica: solo se publica lo que llega a `main`. Para probarlo antes, usá `npm run preview` en tu computadora (ver abajo).

## Dónde está cada cosa

| Qué querés cambiar | Archivo |
|---|---|
| Textos de la carátula (inicio) | `src/index.html` |
| Publicidad del estudio en la carátula | `src/index.html`, sección `id="estudios"` |
| Publicidad en la aplicación (panel) | `src/app/index.html`, bloque `class="ads"` |
| Publicidad en la guía general | `src/guia/carta-documento/index.html`, sección `id="abogado"` |
| Publicidad sobre la carta (franja punteada) | `src/app/app.js`, buscar `adStrip` |
| Aspecto de la aplicación (colores, tamaños) | `src/app/app.css` |
| Funcionamiento de la aplicación | `src/app/app.js` |
| Política de privacidad | `src/privacidad/index.html` |
| Guía “Cómo completar una carta documento” | `src/guia/como-completar-carta-documento/index.html` |
| Guía general “Carta documento: qué es, cómo se envía…” | `src/guia/carta-documento/index.html` |
| Preguntas frecuentes | `src/index.html`, sección `id="preguntas"` |
| Título y descripción que muestra Google | La cabecera (`<title>` y `<meta name="description">`) de cada página |
| Imagen al compartir por WhatsApp o redes | `src/og-image.png` (1200 × 630 px) |
| Páginas que se informan a Google | `src/sitemap.xml` (si agregás una página nueva, sumala acá) |
| Google Analytics (eventos, aviso de consentimiento) | `src/analytics.js` |
| Ícono, nombre y colores al instalar la aplicación | `src/manifest.webmanifest` y los `.png` de `src/` |
| Cabeceras y caché del hosting | `src/_headers` |
| Página de “no encontrada” | `src/404.html` |
| Logos y archivos de marca del estudio | `brand/` (no se publican) |

La carpeta `dist/` se genera sola: **no la edites** ni la subas a GitHub.

## SEO: lo que hay que hacer en Google (una sola vez)

1. Revisá que la variable `SITE_URL` de GitHub tenga tu dominio definitivo (ya está cargada con `https://cartadocumentofacil.com.ar`).
2. Entrá a Google Search Console, agregá la propiedad de tu dominio y verificala (con el registro DNS que te indica; si el dominio está en Cloudflare, se carga ahí).
3. En Search Console, en “Sitemaps”, enviá `https://tu-dominio/sitemap.xml`.
4. Con “Inspección de URLs”, pedí la indexación de la página de inicio y de la guía.
5. Opcional: vinculá Search Console con Google Analytics (en Analytics, Administración → Vinculaciones de productos).

El sitio solo se publica en el dominio propio: la dirección `workers.dev` y las direcciones de vista previa están desactivadas en `wrangler.jsonc`, así Google no indexa copias.

## Para probarlo en tu computadora

Hace falta Node.js (versión 18 o más) y Python 3:

```
npm run preview
```

Abrí http://localhost:8080 en el navegador.

## Cosas para tener presentes

- **Privacidad:** no guardes en este repositorio datos de clientes ni cartas reales. La aplicación no los necesita.
- **Publicidad:** cada estudio es responsable de sus servicios. Si cambia el estudio anunciante, hay que actualizar los cuatro lugares de la tabla.
- **Formulario compatible:** las posiciones están medidas para el formulario preimpreso del Correo Argentino con las dos secciones (“A.R. – Carta documento” y “Carta documento”), en papel Legal. Otros modelos requieren nuevas mediciones.
- **No es asesoramiento legal.** Es una herramienta de ayuda para completar e imprimir.

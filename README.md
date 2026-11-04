# Carta Documento Fácil

Aplicación web para completar e imprimir una carta documento sobre el formulario preimpreso del Correo Argentino. Funciona en el navegador, se instala en el celular o la PC y no envía lo que escribís a ningún servidor.

No tiene base de datos ni servidor propio: son archivos estáticos (HTML, CSS y JavaScript).

## Cómo se publica

El sitio está en **Cloudflare Pages**, conectado a este repositorio de **GitHub**. Cada vez que se guarda un cambio en la rama `main`, Cloudflare arma y publica el sitio solo, en alrededor de un minuto. No hay que subir nada a mano.

Configuración en Cloudflare (Workers y Pages → Crear → Pages → Conectar con Git):

| Campo | Valor |
|---|---|
| Rama de producción | `main` |
| Framework preset | Ninguno |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Variable de entorno | `SITE_URL` = la dirección del sitio, por ejemplo `https://cartadocumentofacil.com.ar` (para el SEO) |
| Variable de entorno (opcional) | `GA_ID` = tu ID de Google Analytics (`G-…`) |

El comando de armado (`scripts/build.mjs`) copia `src/` a `dist/` y completa dos datos solos:

- **Versión del modo sin conexión:** cambia con cada publicación, así los celulares con la aplicación instalada reciben siempre la última versión. Ya no hay que acordarse de subir ningún número.
- **Google Analytics:** si definís la variable `GA_ID`, se carga en `analytics.js`. Si no la definís, queda desactivado.
- **Dirección del sitio:** con `SITE_URL` completa los enlaces canónicos, el mapa del sitio (`sitemap.xml`), `robots.txt` y la imagen que se ve al compartir. Si no la definís, usa la dirección `.pages.dev` del proyecto.

## Cómo editar (sin instalar nada)

1. Entrá al repositorio en github.com y abrí el archivo que querés cambiar (ver tabla de abajo).
2. Tocá el **lápiz** (Edit this file) y hacé el cambio.
3. Tocá **Commit changes**. Cloudflare publica la nueva versión sola.

Para probar un cambio antes de publicarlo, guardalo en una **rama nueva** (la opción “Create a new branch” al confirmar). Cloudflare arma una dirección de prueba para esa rama sin tocar el sitio real. Cuando te guste, se une a `main`.

## Dónde está cada cosa

| Qué querés cambiar | Archivo |
|---|---|
| Textos de la carátula (inicio) | `src/index.html` |
| Publicidad del estudio en la carátula | `src/index.html`, sección `id="estudios"` |
| Publicidad en la aplicación (panel) | `src/app/index.html`, bloque `class="ads"` |
| Publicidad sobre la carta (franja punteada) | `src/app/app.js`, buscar `adStrip` |
| Aspecto de la aplicación (colores, tamaños) | `src/app/app.css` |
| Funcionamiento de la aplicación | `src/app/app.js` |
| Política de privacidad | `src/privacidad/index.html` |
| Guía “Cómo completar una carta documento” | `src/guia/como-completar-carta-documento/index.html` |
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

1. Definí `SITE_URL` en Cloudflare con tu dominio definitivo y volvé a publicar.
2. Entrá a Google Search Console, agregá la propiedad de tu dominio y verificala (con el registro DNS que te indica; si el dominio está en Cloudflare, se carga ahí).
3. En Search Console, en “Sitemaps”, enviá `https://tu-dominio/sitemap.xml`.
4. Con “Inspección de URLs”, pedí la indexación de la página de inicio y de la guía.
5. Opcional: vinculá Search Console con Google Analytics (en Analytics, Administración → Vinculaciones de productos).

Las direcciones de prueba de cada rama no se indexan: Cloudflare las marca para que Google no las muestre.

## Para probarlo en tu computadora

Hace falta Node.js (versión 18 o más) y Python 3:

```
npm run preview
```

Abrí http://localhost:8080 en el navegador.

## Cosas para tener presentes

- **Privacidad:** no guardes en este repositorio datos de clientes ni cartas reales. La aplicación no los necesita.
- **Publicidad:** cada estudio es responsable de sus servicios. Si cambia el estudio anunciante, hay que actualizar los tres lugares de la tabla.
- **Formulario compatible:** las posiciones están medidas para el formulario preimpreso del Correo Argentino con las dos secciones (“A.R. – Carta documento” y “Carta documento”), en papel Legal. Otros modelos requieren nuevas mediciones.
- **No es asesoramiento legal.** Es una herramienta de ayuda para completar e imprimir.

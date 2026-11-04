# Carta Documento Fácil: contexto para Claude Code

Sitio estático (sin framework ni dependencias) para completar una carta documento e imprimirla sobre el formulario preimpreso del Correo Argentino. Es **solo online**: no se instala ni funciona sin conexión (decisión del dueño, para que no se pueda descargar y copiar fácil). No volver a agregar manifest, botón de instalar ni caché del service worker. Público: abogados, estudios y personas en Argentina.

## Comandos

- `npm run build`: arma `dist/` desde `src/` (script `scripts/build.mjs`, solo Node, sin librerías).
- `npm run preview`: arma y sirve en http://localhost:8080 (requiere Python 3).
- Variables de armado: `SITE_URL` (dominio, para canónicos/sitemap/OG; si falta usa la dirección de Cloudflare o localhost), `GA_ID` (Google Analytics, opcional; se valida que empiece con `G-`).

## Estructura

- `src/index.html`: carátula (SEO, preguntas frecuentes, publicidad del estudio, datos estructurados JSON-LD).
- `src/app/index.html` + `app.css` + `app.js`: la aplicación (editor sobre la carta, exportación PDF y Word, calibración).
- `src/guia/como-completar-carta-documento/`: guía de contenido para SEO (cómo completar el formulario).
- `src/guia/carta-documento/`: guía general para SEO (qué es, diferencias, cómo se envía, errores comunes, si recibiste una). Incluye un aviso del estudio en `id="abogado"`.
- `src/privacidad/`: política de privacidad (se muestra la parte de Google Analytics solo si hay `GA_ID`).
- `src/analytics.js`: Google Analytics con consentimiento previo; respeta Global Privacy Control y "No rastrear".
- `src/sw.js`: desinstalador del viejo modo sin conexión (borra la caché y se da de baja en los dispositivos que lo tenían). Dejarlo publicado con `Cache-Control: no-cache`.
- `src/sitemap.xml`: **si agregás una página, sumala acá.**
- `brand/`: logos del estudio anunciante (no se publican).

## Reglas del proyecto (no negociables)

1. **Privacidad:** lo que la persona escribe en la carta nunca sale del navegador. No agregar llamadas de red con datos de la carta, ni cuentas, ni bases de datos. Los eventos de analytics llevan solo el nombre de la acción.
2. **Sin dependencias ni frameworks.** Todo en HTML, CSS y JavaScript plano. El PDF y el Word se generan a mano en `app.js` (sin librerías). No cambiar eso sin pedirlo.
3. **Calibración y geometría:** las posiciones de los casilleros (`BLOCKS`, `COLS`, `BODY`) y las líneas del formulario para la calibración por foto (`FORM_H`, `FORM_V`) se midieron sobre fotos reales del formulario. **No tocarlas** sin una nueva medición.
4. **Textos de la interfaz en español rioplatense (voseo):** "completá", "descargá", "tocá". Comillas tipográficas “ ” y apóstrofo ’ en el texto visible.
5. **No es asesoramiento legal:** no escribir textos que den consejos legales ni prometan resultados. La publicidad de abogados está regulada: nada de promesas ni comparaciones.
6. **No afiliado al Correo Argentino:** no usar su marca más allá de la mención descriptiva del formulario.
7. No commitear `dist/`.

## Publicidad

El estudio anunciante es Diez · Basanta · Sar Diez & Asoc. (derecho comercial y laboral). Aparece en cuatro lugares: `src/index.html` (sección `id="estudios"`), `src/app/index.html` (bloque `class="ads"`), `src/app/app.js` (función `adStrip`, franja sobre la carta que no se imprime) y `src/guia/carta-documento/index.html` (sección `id="abogado"`). Si cambian los datos, actualizar los cuatro. Los enlaces “consultá con un abogado” de las guías y de las preguntas frecuentes llevan a esos avisos: el aviso siempre va marcado como “Publicidad”.

## Antes de dar por terminado un cambio

Probar con `npm run preview`:
- La carátula carga y "Abrir la aplicación" lleva a `/app/`.
- En la aplicación: escribir sobre la carta (clic en un casillero), "Ver un ejemplo" (en "Mis cartas guardadas"), "Descargar PDF para imprimir" y "Descargar Word" funcionan, y la firma queda debajo del texto.
- "Imprimir página de calibración (PDF)" descarga la hoja con las cuatro cruces.
- No hay errores en la consola del navegador.

/* Carta Documento Fácil: Google Analytics 4 con consentimiento previo.
 *
 * Para activarlo, pegá abajo tu ID de medición (empieza con "G-") y volvé a publicar el sitio.
 * Mientras el ID siga siendo el de ejemplo, este archivo no hace nada: no carga Google ni muestra avisos.
 *
 * Reglas de privacidad de este script:
 *  - Google Analytics se carga recién si la persona toca "Aceptar".
 *  - Se respeta la señal "No rastrear" / Global Privacy Control del navegador.
 *  - Los eventos nunca llevan texto de las cartas ni datos personales: solo el nombre de la acción.
 */
(function () {
  'use strict';

  var GA_ID = 'G-XXXXXXXXXX';          // ← pegá acá tu ID de medición de Google Analytics

  var KEY = 'cdf-consent';
  var enabled = /^G-[A-Z0-9]{6,}$/.test(GA_ID) && GA_ID !== 'G-XXXXXXXXXX';
  var loaded = false;

  function getConsent() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setConsent(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* sin almacenamiento */ } }
  function browserOptOut() { return navigator.globalPrivacyControl === true || navigator.doNotTrack === '1'; }

  // Expuesto para la página de privacidad (leer el estado y cambiar la elección).
  window.cdfAnalytics = {
    enabled: enabled,
    state: function () { return browserOptOut() ? 'denied-browser' : (getConsent() || 'pending'); },
    reopen: function () { if (enabled) showBanner(); }
  };
  if (!enabled) return;

  function loadGA() {
    if (loaded) return; loaded = true;
    window['ga-disable-' + GA_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
  }

  function stopGA() {
    window['ga-disable-' + GA_ID] = true;
    ['_ga', '_ga_' + GA_ID.replace('G-', '')].forEach(function (n) {
      document.cookie = n + '=; Max-Age=0; path=/';
      document.cookie = n + '=; Max-Age=0; path=/; domain=.' + location.hostname;
    });
  }

  function track(name, params) { if (loaded && window.gtag) window.gtag('event', name, params || {}); }

  /* ---------- aviso de consentimiento ---------- */
  function showBanner() {
    var old = document.getElementById('cdf-consent'); if (old) old.remove();
    if (!document.getElementById('cdf-consent-css')) {
      var st = document.createElement('style'); st.id = 'cdf-consent-css';
      st.textContent = '#cdf-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;max-width:640px;margin:0 auto;background:#fff;color:#12202e;border:1px solid #b9c4d0;border-radius:10px;box-shadow:0 6px 28px rgba(0,0,0,.25);padding:14px 16px;font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
        '#cdf-consent p{margin:0 0 10px}#cdf-consent a{color:#0b5cad}#cdf-consent div{display:flex;gap:10px;flex-wrap:wrap}' +
        '#cdf-consent button{font:inherit;font-weight:650;cursor:pointer;border-radius:8px;padding:9px 18px;border:1.5px solid #0f3d5e;background:#fff;color:#0f3d5e;flex:1 1 130px}' +
        '#cdf-consent button:focus-visible{outline:3px solid #e8a826;outline-offset:2px}' +
        '@media (prefers-color-scheme:dark){#cdf-consent{background:#16202a;color:#e8edf2;border-color:#2b3947}#cdf-consent a{color:#6fb4ea}#cdf-consent button{background:#16202a;color:#e8edf2;border-color:#6fb4ea}}';
      document.head.appendChild(st);
    }
    var d = document.createElement('div'); d.id = 'cdf-consent'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Preferencias de privacidad');
    d.innerHTML = '<p>Usamos Google Analytics para entender cómo se usa el sitio (páginas vistas y botones tocados). <b>Nunca incluye lo que escribís en tus cartas.</b> ¿Lo aceptás? <a href="/privacidad/">Más información</a></p>' +
      '<div><button type="button" data-v="granted">Aceptar</button><button type="button" data-v="denied">Rechazar</button></div>';
    d.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var v = b.getAttribute('data-v'); setConsent(v); d.remove();
      if (v === 'granted') loadGA(); else stopGA();
      document.dispatchEvent(new CustomEvent('cdf-consent-change'));
    });
    document.body.appendChild(d);
  }

  /* ---------- eventos (solo el nombre de la acción, sin texto ni datos personales) ---------- */
  var BY_ID = { btnPdf: 'descargar_pdf', btnDocx: 'descargar_word', btnPrint: 'imprimir_navegador', btnCalib: 'hoja_calibracion',
                btnApplyPhoto: 'calibracion_con_foto', btnExample: 'ver_ejemplo', btnDraftSave: 'guardar_carta', btnModelos: 'ver_modelos' };
  function where(el) { return el.closest('.adstrip') ? 'carta' : el.closest('.ads') ? 'panel' : el.closest('#estudios') ? 'sitio' : el.closest('#abogado') ? 'guia' : 'otro'; }
  // Además de clic_publicidad, cada contacto tiene su propio evento para usarlo como conversión (Analytics y Google Ads).
  function contacto(tipo, nombre, el) { var u = where(el); track('clic_publicidad', { tipo: tipo, ubicacion: u }); track(nombre, { ubicacion: u }); }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('button, a'); if (!el) return;
    if (el.id && BY_ID[el.id]) { track(BY_ID[el.id]); return; }
    if (el.hasAttribute('data-modelo')) { track('usar_modelo', { modelo: el.getAttribute('data-modelo') }); return; }
    var href = el.getAttribute && el.getAttribute('href') || '';
    if (/^tel:/.test(href)) contacto('llamar', 'contacto_llamada', el);
    else if (/wa\.me/.test(href)) contacto('whatsapp', 'contacto_whatsapp', el);
    else if (href === '/app/') track('abrir_aplicacion');
  }, true);

  /* ---------- arranque ---------- */
  function start() {
    var note = document.getElementById('statsNote');
    if (note) note.textContent = 'Lo que escribís en tus cartas se procesa en tu dispositivo y no se envía a ningún servidor. Para saber cuánta gente visita el sitio usamos Cloudflare Web Analytics (sin cookies ni datos personales) y, solo si lo aceptás, Google Analytics.';
    if (browserOptOut()) return;
    var c = getConsent();
    if (c === 'granted') loadGA();
    else if (c !== 'denied') showBanner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

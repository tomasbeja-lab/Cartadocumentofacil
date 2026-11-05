(function () {
  var PT = 25.4 / 72;           // 1 pt en mm
  var KEY = 'cd-formato-v1';
  var PAPERS = { legal: [215.9, 355.6], oficio: [216, 330], a4: [210, 297] };
  var FONTS = {
    times:   { key: 'times',   css: '"Times New Roman", Times, "Liberation Serif", serif',   pdf: 'Times-Roman', docx: 'Times New Roman', asc: 0.891, desc: 0.216 },
    arial:   { key: 'arial',   css: 'Arial, Helvetica, "Liberation Sans", sans-serif',        pdf: 'Helvetica',   docx: 'Arial',           asc: 0.905, desc: 0.212 },
    courier: { key: 'courier', css: '"Courier New", Courier, "Liberation Mono", monospace',   pdf: 'Courier',     docx: 'Courier New',     asc: 0.833, desc: 0.300 }
  };
  // Calibración de fábrica: ninguna. Cada impresora mueve el papel distinto, así que cada persona calibra la suya.
  var FACTORY = null;

  var DEFAULT_DATA = {
    rNombre: '', rDom: '', rCP: '', rLoc: '', rProv: '',
    dNombre: '', dDom: '', dCP: '', dLoc: '', dProv: '',
    cuerpo: '', dom: '', cierre: '', fNombre: '', fDni: '', fCuit: ''
  };
  var EXAMPLE_DATA = {
    rNombre: 'Juan PÉREZ', rDom: 'Av. Siempreviva 742, Piso 3° “B”', rCP: '1425', rLoc: 'Capital Federal', rProv: 'C.A.B.A',
    dNombre: 'María GÓMEZ', dDom: 'Calle Falsa 123', dCP: '5000', dLoc: 'Córdoba', dProv: 'Córdoba',
    cuerpo: 'Por la presente INTIMO a Ud. para que, dentro del plazo de 48 horas hábiles de recibida esta comunicación, abone la suma de PESOS [monto] adeudada en concepto de [concepto], bajo apercibimiento de iniciar las acciones judiciales correspondientes, con costas. Este es un texto de ejemplo para ver cómo queda la carta: reemplazalo por el tuyo.',
    dom: 'Constituyo domicilio legal en Av. Siempreviva 742, Piso 3° “B”, C.A.B.A., donde serán válidas las notificaciones.',
    cierre: 'Queda Ud. debidamente notificada.', fNombre: 'Juan Pérez', fDni: 'DNI N° 00.000.000', fCuit: 'CUIT N° 00-00000000-0'
  };

  // Posiciones base (pt desde el borde superior izquierdo), medidas del modelo en Word.
  var BLOCKS = {
    A: { name: 103.6, dom: 135.1, row: 160.1, label: 'Copia 1' },
    B: { name: 370.7, dom: 401.3, row: 425.7, label: 'Copia 2' }
  };
  var COLS = {
    r: { x: 80.0,  cp: 76.0,  loc: 150.2, prov: 237.5, who: 'Remitente' },
    d: { x: 317.2, cp: 313.5, loc: 388.4, prov: 476.2, who: 'Destinatario' }
  };
  var BODY = { x: 55.0, y: 443.7 };
  var SIG = { y: 736.6 };

  function buildFields() {
    var list = [];
    ['A', 'B'].forEach(function (g) {
      ['r', 'd'].forEach(function (p) {
        var b = BLOCKS[g], c = COLS[p], tag = BLOCKS[g].label + ' · ' + c.who;
        list.push({ id: g + p + 'N', grp: g, label: tag + ': nombre', x: c.x, y: b.name, bind: p + 'Nombre', min: 52 });
        list.push({ id: g + p + 'D', grp: g, label: tag + ': domicilio', x: c.x, y: b.dom, bind: p + 'Dom', min: 56 });
        list.push({ id: g + p + 'C', grp: g, label: tag + ': CP', x: c.cp, y: b.row, bind: p + 'CP', min: 12, sm: true });
        list.push({ id: g + p + 'L', grp: g, label: tag + ': localidad', x: c.loc, y: b.row, bind: p + 'Loc', min: 28, sm: true });
        list.push({ id: g + p + 'P', grp: g, label: tag + ': provincia', x: c.prov, y: b.row, bind: p + 'Prov', min: 22, sm: true });
      });
    });
    return list;
  }
  var FIELDS = buildFields();
  var GROUPS = [
    { id: 'g', label: 'Toda la hoja' },
    { id: 'A', label: 'Encabezado copia 1' },
    { id: 'B', label: 'Encabezado copia 2' },
    { id: 'body', label: 'Cuerpo del texto' },
    { id: 'sig', label: 'Firma y DNI' }
  ];

  function defaultState() {
    var off = {};
    GROUPS.forEach(function (g) { off[g.id] = { x: 0, y: 0 }; });
    var f = {};
    FIELDS.forEach(function (fl) { f[fl.id] = { x: 0, y: 0 }; });
    f.body = { x: 0, y: 0 }; f.sig = { x: 0, y: 0 };
    var st = {
      data: JSON.parse(JSON.stringify(DEFAULT_DATA)),
      off: off, f: f,
      body: { size: 11, lh: 12.65, w: 174.6 },
      font: { family: 'times', hSize: 11, cSize: 9 },
      paper: 'legal', gShow: false, gPrint: false, gOnly: false, locked: false, bg: true, fver: 0, calibrated: false, hot: true
    };
    if (FACTORY) {
      st.off = Object.assign(st.off, FACTORY.off || {});
      st.f = Object.assign(st.f, FACTORY.f || {});
      st.body = Object.assign(st.body, FACTORY.body || {});
      st.font = Object.assign(st.font, FACTORY.font || {});
      if (FACTORY.paper && PAPERS[FACTORY.paper]) st.paper = FACTORY.paper;
      st.locked = true; st.fver = FACTORY.ver || 1;
    }
    return st;
  }

  var S = defaultState();
  function curFont() { return FONTS[S.font.family] || FONTS.times; }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var p = JSON.parse(raw), d = defaultState();
      S = {
        data: Object.assign(d.data, p.data || {}),
        off: Object.assign(d.off, p.off || {}),
        f: Object.assign(d.f, p.f || {}),
        body: Object.assign(d.body, p.body || {}),
        font: Object.assign(d.font, p.font || {}),
        paper: PAPERS[p.paper] ? p.paper : d.paper,
        gShow: !!p.gShow, gPrint: !!p.gPrint, gOnly: !!p.gOnly,
        locked: p.locked === undefined ? d.locked : !!p.locked,
        bg: p.bg === undefined ? true : !!p.bg,
        fver: p.fver || 0,
        calibrated: !!p.calibrated,
        hot: p.hot === undefined ? true : !!p.hot
      };
      // Calibración de fábrica nueva: se aplica una vez, conservando los datos cargados.
      if (FACTORY && S.fver !== (FACTORY.ver || 1)) { S.off = d.off; S.locked = true; S.fver = FACTORY.ver || 1; }
    } catch (e) { /* sin almacenamiento: se usan los valores por defecto */ }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ }
  }

  var $ = function (id) { return document.getElementById(id); };
  var paperEl = $('paperEl');

  function mm(v) { return (Math.round(v * 100) / 100) + 'mm'; }
  function num(v) { var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; }

  function posMm(baseXpt, baseYpt, grp, fid) {
    var o = S.off, f = S.f[fid] || { x: 0, y: 0 };
    return {
      x: baseXpt * PT + o.g.x + (o[grp] ? o[grp].x : 0) + f.x,
      y: baseYpt * PT + o.g.y + (o[grp] ? o[grp].y : 0) + f.y
    };
  }
  // La firma va siempre dos líneas debajo de la última línea del cuerpo.
  var GAP_LINES = 2, LIMIT_MM = 320;
  var EFF = { size: 11, lh: 12.65, shrunk: false };   // tamaño realmente usado (puede ser 1 punto menor si el texto no entra)
  function sigPos(nLines, lh) {
    var l = lh || EFF.lh;
    var b = posMm(BODY.x, BODY.y, 'body', 'body'), o = S.off, f = S.f.sig || { x: 0, y: 0 };
    return { x: b.x + (o.sig.x - o.body.x) + f.x, y: b.y + (nLines + GAP_LINES) * l / MM2PT + (o.sig.y - o.body.y) + f.y };
  }
  function sigCount() { return [S.data.fNombre, S.data.fDni, S.data.fCuit].filter(Boolean).length || 1; }
  function fitsBelow(nLines, lh) { return sigPos(nLines, lh).y + sigCount() * lh / MM2PT <= LIMIT_MM; }
  function bodyLineCount(box) {
    var n = 0;
    Array.prototype.forEach.call(box.querySelectorAll('p'), function (p) { n += paraLines(p).length; });
    return n;
  }
  function checkFit(sigY) {
    var w = $('fitWarn'); if (!w) return;
    var bottom = sigY + sigCount() * EFF.lh / MM2PT, lineMm = EFF.lh / MM2PT;
    if (bottom > LIMIT_MM) {
      var extra = Math.ceil((bottom - LIMIT_MM) / lineMm);
      w.textContent = 'El texto no entra en el formulario ni reduciendo la letra a ' + (Math.round(EFF.size * 10) / 10) + ' pt: sobran unas ' + extra + ' líneas. Acortá el texto o usá una hoja de continuación.';
      w.style.color = 'var(--guide)'; w.hidden = false;
    } else if (EFF.shrunk) {
      w.textContent = 'Para que el texto entre, redujo la letra del cuerpo a ' + (Math.round(EFF.size * 10) / 10) + ' pt (1 punto menos que el tamaño elegido).';
      w.style.color = 'var(--muted)'; w.hidden = false;
    } else w.hidden = true;
  }

  function pos(el, baseXpt, baseYpt, grp, fid) {
    var p = posMm(baseXpt, baseYpt, grp, fid);
    el.style.left = mm(p.x); el.style.top = mm(p.y);
  }

  function addLabel(el, text) {
    var s = document.createElement('span'); s.className = 'lbl'; s.textContent = text; el.appendChild(s);
  }

  function ruler(kind, length) {
    var r = document.createElement('div'); r.className = 'ruler ' + kind;
    for (var v = 0; v <= length; v += 5) {
      var i = document.createElement('i');
      var big = v % 10 === 0;
      if (kind === 'top') { i.style.left = v + 'mm'; i.style.height = (big ? 3 : 1.6) + 'mm'; }
      else { i.style.top = v + 'mm'; i.style.width = (big ? 3 : 1.6) + 'mm'; }
      r.appendChild(i);
      if (big && v > 0) {
        var b = document.createElement('b'); b.textContent = v / 10;
        if (kind === 'top') b.style.left = v + 'mm'; else b.style.top = v + 'mm';
        r.appendChild(b);
      }
    }
    return r;
  }

  function formSvg(W, H) {
    var Y = '#f2c63c', N = '#23396f', L = '#f4edbf', G = '#6479a3', LN = '#8c99b8', B = '#f8f5dc';
    var o = [];
    function rect(x, y, w, h, fill, stroke) {
      o.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + (fill || 'none') + '"' +
        (stroke ? ' stroke="' + stroke + '" stroke-width="0.2"' : '') + '/>');
    }
    function ln(x1, y1, x2, y2, col, w, dash) {
      o.push('<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (col || LN) + '" stroke-width="' + (w || 0.2) + '"' +
        (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>');
    }
    function tx(x, y, t, size, col, anchor, bold, rot) {
      o.push('<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + (col || G) + '" text-anchor="' + (anchor || 'start') + '"' +
        (bold ? ' font-weight="700"' : '') + (rot ? ' transform="rotate(' + rot + ' ' + x + ' ' + y + ')"' : '') + '>' + t + '</text>');
    }
    o.push('<svg class="formbg" xmlns="http://www.w3.org/2000/svg" width="' + W + 'mm" height="' + H + 'mm" viewBox="0 0 ' + W + ' ' + H +
      '" font-family="Arial Narrow, Liberation Sans Narrow, Arial, Helvetica, sans-serif">');
    // zona del cuerpo
    rect(19, 154.5, 181.5, 190, B);
    ln(14, 154, 205, 154, N, 0.35);
    // ----- Bloque 1: A.R. - Carta documento
    rect(25, 9.7, 83.2, 10.6, Y); tx(33.5, 14.3, 'Correo', 3.0, '#23396f', 'start', true); tx(33.5, 17.6, 'Argentino', 3.0, '#23396f', 'start', true);
    rect(108.3, 9.0, 83, 12.2, '', LN); tx(149.8, 16.2, 'CÓDIGO DE CLIENTE', 2.4, G, 'middle');
    rect(24.8, 21.2, 83.4, 5.3, N); tx(30.5, 25.1, 'A.R. - CARTA DOCUMENTO', 3.1, '#fff', 'start', true);
    rect(108.2, 21.2, 83.1, 1.4, N);
    rect(108.2, 26.5, 83.1, 33.7, L);
    ln(24.8, 44.2, 191.3, 44.2); ln(24.8, 52.2, 191.3, 52.2); ln(24.8, 60.2, 191.3, 60.2);
    ln(108.2, 26.5, 108.2, 89.8); ln(191.3, 26.5, 191.3, 89.8); ln(24.8, 26.5, 24.8, 60.2);
    ln(50.0, 52.2, 50.0, 60.2); ln(80.5, 52.2, 80.5, 60.2); ln(134.3, 52.2, 134.3, 60.2); ln(164.7, 52.2, 164.7, 60.2);
    tx(25.3, 30.0, 'REMITENTE', 2.0); tx(107.6, 30.0, 'N° A.R. (Troquel T&amp;T)', 1.8, G, 'end'); tx(109.1, 29.9, 'DESTINATARIO', 2.0);
    tx(25.3, 46.8, 'DOMICILIO', 2.0); tx(109.1, 46.8, 'DOMICILIO', 2.0);
    tx(25.3, 54.7, 'CÓDIGO POSTAL', 2.0); tx(51.5, 54.7, 'LOCALIDAD', 2.0); tx(82.3, 54.7, 'PROVINCIA', 2.0);
    tx(109.1, 54.7, 'CÓDIGO POSTAL', 2.0); tx(135.5, 54.7, 'LOCALIDAD', 2.0); tx(166.5, 54.7, 'PROVINCIA', 2.0);
    rect(108.2, 60.6, 83.1, 2.6, N); tx(149.7, 62.5, 'RECIBÍ CONFORME EL ENVÍO REFERENTE A ESTE AVISO', 2.0, '#fff', 'middle', true);
    ln(108.2, 67.9, 131.5, 67.9); ln(131.5, 63.2, 131.5, 72.3); ln(108.2, 72.3, 191.3, 72.3); ln(108.2, 80.8, 178.5, 80.8); ln(178.5, 72.3, 178.5, 89.8);
    tx(109.1, 66.2, 'FECHA', 1.7); tx(109.1, 70.6, 'HORA', 1.7); tx(132.5, 65.2, 'FIRMA DEL DESTINATARIO', 1.7);
    tx(109.1, 74.6, 'ACLARACIÓN FIRMA DESTINATARIO', 1.7); tx(109.1, 82.4, 'FIRMA EMPLEADO QUE ENTREGA Y N° DE LEGAJO', 1.7);
    tx(104.5, 78.8, 'SELLO', 2.0, G, 'end'); tx(104.5, 81.0, 'OFICINA', 2.0, G, 'end'); tx(104.5, 83.2, 'ORIGEN', 2.0, G, 'end');
    tx(184.9, 78.2, 'SELLO', 2.0, G, 'middle'); tx(184.9, 80.4, 'OFICINA', 2.0, G, 'middle'); tx(184.9, 82.6, 'DESTINO', 2.0, G, 'middle');
    ln(24.8, 89.8, 191.3, 89.8);
    ln(12, 101.2, 205, 101.2, LN, 0.2, '0.8 0.8');
    // ----- Bloque 2: Carta documento
    rect(24.7, 104.0, 83.5, 10.5, Y); tx(33.5, 108.6, 'Correo', 3.0, '#23396f', 'start', true); tx(33.5, 111.9, 'Argentino', 3.0, '#23396f', 'start', true);
    rect(108.2, 103.7, 83.5, 11.8, '', LN); tx(149.9, 108.6, 'OBLEA SUPERIOR', 2.1, G, 'middle'); tx(149.9, 111.0, 'DE ETIQUETA T&amp;T', 2.1, G, 'middle');
    rect(24.7, 115.7, 83.5, 5.0, N); tx(32.3, 119.4, 'CARTA DOCUMENTO', 3.1, '#fff', 'start', true);
    rect(108.2, 115.7, 83.5, 1.4, N);
    ln(24.7, 138.4, 191.5, 138.4); ln(24.7, 146.1, 191.5, 146.1); ln(24.7, 153.9, 191.5, 153.9);
    ln(108.1, 120.7, 108.1, 153.9);
    ln(49.8, 146.1, 49.8, 153.9); ln(80.7, 146.1, 80.7, 153.9); ln(134.5, 146.1, 134.5, 153.9); ln(165.0, 146.1, 165.0, 153.9);
    tx(25.5, 124.2, 'REMITENTE', 2.0); tx(109.2, 124.2, 'DESTINATARIO', 2.0);
    tx(25.5, 141.0, 'DOMICILIO', 2.0); tx(109.2, 141.0, 'DOMICILIO', 2.0);
    tx(25.3, 148.6, 'CÓDIGO POSTAL', 2.0); tx(51.5, 148.6, 'LOCALIDAD', 2.0); tx(82.3, 148.6, 'PROVINCIA', 2.0);
    tx(109.1, 148.6, 'CÓDIGO POSTAL', 2.0); tx(135.5, 148.6, 'LOCALIDAD', 2.0); tx(166.5, 148.6, 'PROVINCIA', 2.0);
    // márgenes laterales
    tx(9.8, 268, 'Doble por aquí', 2.1, G, 'middle', false, -90);
    tx(206.5, 250, 'Doble por aquí', 2.1, G, 'middle', false, 90);
    tx(12.6, 335, 'CLIENTE CORPORATIVO', 2.8, G, 'middle', false, -90);
    tx(209, 330, '4010005110', 1.5, G, 'middle', false, 90);
    o.push('</svg>');
    return o.join('');
  }

  /* ---------- Edición directa sobre la carta ---------- */
  var PLAIN = (function () { var d = document.createElement('div'); try { d.contentEditable = 'plaintext-only'; } catch (e) { /* sin soporte */ } return d.contentEditable === 'plaintext-only'; })();
  var NARROW = window.matchMedia('(max-width: 860px)');
  var PHF = { rNombre: 'Remitente: nombre', rDom: 'Domicilio', rCP: 'CP', rLoc: 'Localidad', rProv: 'Provincia',
              dNombre: 'Destinatario: nombre', dDom: 'Domicilio', dCP: 'CP', dLoc: 'Localidad', dProv: 'Provincia',
              cuerpo: 'Escribí acá el texto de la carta…', dom: 'Domicilio constituido (opcional)', cierre: 'Cierre (opcional)', fNombre: 'Firma: nombre', fDni: 'DNI N° …', fCuit: 'CUIT N° …' };
  var BODY_BINDS = { cuerpo: 1, dom: 1, cierre: 1, fNombre: 1, fDni: 1, fCuit: 1 };
  // Corrector ortográfico del navegador solo en el texto libre: en nombres, números y domicilios marcaría todo.
  var SPELL_BINDS = { cuerpo: 1, cierre: 1 };

  function panelFocus(k) {
    var el = $(k); if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  }
  function focusNext(node) {
    var all = Array.prototype.filter.call(paperEl.querySelectorAll('[contenteditable]'), function (n) { return !n.hasAttribute('data-mirror'); });
    var nx = all[all.indexOf(node) + 1];
    if (!nx) { node.blur(); return; }
    nx.focus();
    var r = document.createRange(); r.selectNodeContents(nx); r.collapse(false);
    var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
  }
  function makeEditable(node, bind, single, mirror) {
    node.setAttribute('data-bind', bind);
    var ph = PHF[bind]; if (ph) node.setAttribute('data-ph', ph);
    if (mirror) node.setAttribute('data-mirror', '1');
    if (!PLAIN || NARROW.matches) {                       // celular o navegador sin soporte: se completa en el panel
      node.addEventListener('click', function () { panelFocus(bind); });
      return;
    }
    node.contentEditable = 'plaintext-only'; node.spellcheck = !!SPELL_BINDS[bind];
    node.setAttribute('role', 'textbox'); node.setAttribute('aria-label', ph || bind);
    node.addEventListener('input', function () {
      var v = node.innerText.replace(/\u00a0/g, ' ');
      v = single ? v.replace(/\s*\n+\s*/g, ' ') : v.replace(/\n$/, '');
      if (!v.trim()) { v = ''; if (node.firstChild) node.textContent = ''; }
      S.data[bind] = v;
      Array.prototype.forEach.call(paperEl.querySelectorAll('[data-bind="' + bind + '"]'), function (o) { if (o !== node && o.textContent !== v) o.textContent = v; });
      var pi = $(bind); if (pi && pi.value !== v) pi.value = v;
      save();
      if (BODY_BINDS[bind]) updateBodyLayout();
    });
    node.addEventListener('keydown', function (e) { if (single && e.key === 'Enter') { e.preventDefault(); focusNext(node); } });
    node.addEventListener('paste', function (e) {
      if (!single) return;                                   // en el cuerpo se respetan los saltos de línea
      e.preventDefault();
      document.execCommand('insertText', false, (e.clipboardData.getData('text/plain') || '').replace(/\s*\n+\s*/g, ' '));
    });
  }

  // Acomoda el cuerpo y la firma (y reduce la letra si no entran) sin reconstruir la carta: así no se pierde el cursor al escribir.
  function updateBodyLayout() {
    var bb = paperEl.querySelector('.bodybox:not(.sigbox)'), sg = paperEl.querySelector('.sigbox');
    if (!bb || !sg) return;
    bb.style.fontSize = S.body.size + 'pt'; bb.style.lineHeight = S.body.lh + 'pt';
    var nLines = bodyLineCount(bb), eff = { size: S.body.size, lh: S.body.lh, shrunk: false };
    if (!fitsBelow(nLines, eff.lh) && S.body.size > 6) {
      eff = { size: S.body.size - 1, lh: S.body.lh * (S.body.size - 1) / S.body.size, shrunk: true };
      bb.style.fontSize = eff.size + 'pt'; bb.style.lineHeight = eff.lh + 'pt';
      nLines = bodyLineCount(bb);
    }
    EFF = eff;
    sg.style.fontSize = EFF.size + 'pt'; sg.style.lineHeight = EFF.lh + 'pt';
    var sgp = sigPos(nLines); sg.style.left = mm(sgp.x); sg.style.top = mm(sgp.y); checkFit(sgp.y);
  }

  var AD_SVG = "<svg class=\"logo-diez\" width=\"34mm\" height=\"8.5mm\" viewBox=\"0 0 800 200\" role=\"img\" aria-label=\"Diez, Basanta, Sar Diez y Asoc. Estudio jurídico\"><g transform=\"translate(0 42)\"><rect x=\"6\" y=\"6\" width=\"108\" height=\"12\" fill=\"#123b36\"/><rect x=\"18\" y=\"26\" width=\"20\" height=\"66\" fill=\"#123b36\"/><rect x=\"50\" y=\"26\" width=\"20\" height=\"66\" fill=\"#b8893a\"/><rect x=\"82\" y=\"26\" width=\"20\" height=\"66\" fill=\"#123b36\"/><rect x=\"6\" y=\"100\" width=\"108\" height=\"7\" fill=\"#123b36\"/><rect x=\"0\" y=\"110\" width=\"120\" height=\"6\" fill=\"#123b36\"/></g><text x=\"150\" y=\"92\" font-family=\"Cormorant Garamond, Georgia, 'Times New Roman', serif\" font-weight=\"600\" font-size=\"34\" fill=\"#123b36\" textLength=\"600\" lengthAdjust=\"spacing\">DIEZ · BASANTA · SAR DIEZ</text><rect x=\"150\" y=\"106\" width=\"600\" height=\"2\" fill=\"#b8893a\"/><text x=\"150\" y=\"142\" font-family=\"Montserrat, Arial, Helvetica, sans-serif\" font-weight=\"600\" font-size=\"26\" fill=\"#123b36\" textLength=\"150\" lengthAdjust=\"spacing\">&amp; ASOC.</text></svg>";
  function adStrip() {
    var d = document.createElement('div'); d.className = 'adstrip';
    d.style.left = mm(posMm(BODY.x, BODY.y, 'body', 'body').x); d.style.top = (LIMIT_MM + 3) + 'mm'; d.style.width = mm(S.body.w);
    d.innerHTML = '<span class="adtag">Publicidad · no se imprime</span>' + AD_SVG +
      '<span><b>Derecho comercial, laboral y sucesiones</b> · Lavalle 1506, Piso 9° Of. “34”, C.A.B.A.<br>' +
      '<a href="tel:+541143711548">(011) 4371-1548</a> · <a href="https://wa.me/5491168703785?text=Hola%2C%20te%20escribo%20desde%20Carta%20Documento%20F%C3%A1cil." target="_blank" rel="noopener sponsored">WhatsApp</a></span>';
    return d;
  }
  if (NARROW.addEventListener) NARROW.addEventListener('change', function () { render(); });

  function render() {
    var dim = PAPERS[S.paper] || PAPERS.legal;
    paperEl.style.width = dim[0] + 'mm';
    paperEl.style.height = (dim[1] - 0.6) + 'mm';
    paperEl.style.fontFamily = curFont().css;
    $('pagecss').textContent = '@page { size: ' + dim[0] + 'mm ' + dim[1] + 'mm; margin: 0; }';
    var showG = !S.locked && (S.gShow || S.gPrint);
    paperEl.className = 'paper' + (showG ? ' guides' : '') + (!S.locked && S.gPrint ? ' pg' : '') + (!S.locked && S.gOnly ? ' only' : '') + (S.hot ? ' hot' : '');
    paperEl.innerHTML = '';
    if (S.bg) paperEl.insertAdjacentHTML('beforeend', formSvg(dim[0], dim[1] - 0.6));

    FIELDS.forEach(function (fl) {
      var el = document.createElement('div');
      el.className = 'fld' + (fl.sm ? ' sm' : '');
      el.style.fontSize = (fl.sm ? S.font.cSize : S.font.hSize) + 'pt';
      el.style.minWidth = fl.min + 'mm';
      el.style.minHeight = (fl.sm ? 3.4 : 4.2) + 'mm';
      var t = document.createElement('span'); t.className = 'ed'; t.textContent = S.data[fl.bind] || '';
      t.style.minHeight = el.style.minHeight;
      makeEditable(t, fl.bind, true, fl.grp === 'B');
      el.appendChild(t);
      addLabel(el, fl.label);
      pos(el, fl.x, fl.y, fl.grp, fl.id);
      paperEl.appendChild(el);
    });

    // Cuerpo
    var bb = document.createElement('div'); bb.className = 'bodybox';
    bb.style.width = mm(S.body.w);
    bb.style.fontSize = S.body.size + 'pt';
    bb.style.lineHeight = S.body.lh + 'pt';
    bb.style.minHeight = '10mm';
    [['cuerpo', S.data.cuerpo], ['dom', S.data.dom], ['cierre', S.data.cierre]].forEach(function (a) {
      var p = document.createElement('p'); p.textContent = a[1] || ''; makeEditable(p, a[0], false); bb.appendChild(p);
    });
    addLabel(bb, 'Cuerpo');
    pos(bb, BODY.x, BODY.y, 'body', 'body');
    paperEl.appendChild(bb);

    // Firma (centrada respecto del cuerpo, siempre al final del texto)
    var sg = document.createElement('div'); sg.className = 'bodybox sigbox';
    sg.style.width = mm(S.body.w);
    [['fNombre', S.data.fNombre], ['fDni', S.data.fDni], ['fCuit', S.data.fCuit]].forEach(function (a) {
      var p = document.createElement('p'); p.textContent = a[1] || ''; makeEditable(p, a[0], true); sg.appendChild(p);
    });
    addLabel(sg, 'Firma');
    paperEl.appendChild(sg);
    updateBodyLayout();
    if (dim[1] >= 345) paperEl.appendChild(adStrip());

    paperEl.appendChild(ruler('top', dim[0]));
    paperEl.appendChild(ruler('left', dim[1]));
    [[10, 10], [dim[0] - 10, 10], [10, dim[1] - 10], [dim[0] - 10, dim[1] - 10]].forEach(function (c) {
      var r = document.createElement('div'); r.className = 'reg';
      r.style.left = (c[0] - 3) + 'mm'; r.style.top = (c[1] - 3) + 'mm'; paperEl.appendChild(r);
    });

    $('cfg').value = JSON.stringify({ off: S.off, f: S.f, body: S.body, font: S.font, paper: S.paper }, null, 1);
    fit();
  }

  function fit() {
    var dim = PAPERS[S.paper] || PAPERS.legal;
    var px = dim[0] * 96 / 25.4;
    var avail = $('stage').clientWidth - 32;
    var z = Math.min(1, Math.max(0.3, avail / px));
    $('zoomer').style.setProperty('--z', z);
  }

  function syncInputs() {
    Object.keys(DEFAULT_DATA).forEach(function (k) { var el = $(k); if (el) el.value = S.data[k]; });
    $('paper').value = S.paper;
    $('bgShow').checked = !!S.bg; $('hotShow').checked = !!S.hot;
    $('gShow').checked = !!S.gShow; $('gPrint').checked = !!S.gPrint; $('gOnly').checked = !!S.gOnly;
    $('bSize').value = S.body.size; $('bLh').value = S.body.lh; $('bW').value = S.body.w;
    $('fFamily').value = S.font.family; $('fH').value = S.font.hSize; $('fC').value = S.font.cSize;
    buildTables();
    $('calibBox').hidden = !!S.locked; $('lockedBox').hidden = !S.locked;
    $('firstRun').hidden = !!S.calibrated;
  }

  function bindInputs() {
    Object.keys(DEFAULT_DATA).forEach(function (k) {
      var el = $(k); if (!el) return;
      el.addEventListener('input', function () { S.data[k] = el.value; save(); render(); });
    });
    $('paper').addEventListener('change', function () { S.paper = $('paper').value; save(); render(); });
    $('bgShow').addEventListener('change', function () { S.bg = $('bgShow').checked; save(); render(); });
    $('hotShow').addEventListener('change', function () { S.hot = $('hotShow').checked; save(); render(); });
    ['gShow', 'gPrint', 'gOnly'].forEach(function (k) {
      var el = $(k);
      el.addEventListener('change', function () { S[k] = el.checked; save(); render(); });
    });
    [['bSize', 'body', 'size'], ['bLh', 'body', 'lh'], ['bW', 'body', 'w'], ['fH', 'font', 'hSize'], ['fC', 'font', 'cSize']].forEach(function (a) {
      var el = $(a[0]);
      el.addEventListener('input', function () {
        var v = num(el.value); if (v > 0) { S[a[1]][a[2]] = v; save(); render(); }
      });
    });
    $('fFamily').addEventListener('change', function () { S.font.family = $('fFamily').value; save(); render(); });
    $('btnLock').addEventListener('click', function () { S.locked = true; S.calibrated = true; save(); syncInputs(); render(); });
    $('btnUnlock').addEventListener('click', function () { S.locked = false; save(); syncInputs(); render(); });
    $('btnApply').addEventListener('click', function () {
      try {
        var p = JSON.parse($('cfg').value), d = defaultState();
        S.off = Object.assign(d.off, p.off || {}); S.f = Object.assign(d.f, p.f || {});
        S.body = Object.assign(d.body, p.body || {}); S.font = Object.assign(d.font, p.font || {});
        if (p.paper && PAPERS[p.paper]) S.paper = p.paper;
        save(); syncInputs(); render();
        $('cfgNote').textContent = 'Calibración aplicada.';
      } catch (e) { $('cfgNote').textContent = 'El texto pegado no es una calibración válida.'; }
    });
  }

  function offsetRow(table, label, getObj) {
    var s = document.createElement('span'); s.textContent = label; table.appendChild(s);
    ['x', 'y'].forEach(function (ax) {
      var inp = document.createElement('input');
      inp.type = 'number'; inp.step = '0.1'; inp.value = getObj()[ax];
      inp.setAttribute('aria-label', label + ' ' + ax.toUpperCase() + ' en milímetros');
      inp.addEventListener('input', function () { getObj()[ax] = num(inp.value); save(); render(); });
      table.appendChild(inp);
    });
  }

  function tableHead(t, first) {
    t.innerHTML = '';
    [first, 'X mm', 'Y mm'].forEach(function (x) {
      var h = document.createElement('span'); h.className = 'hd'; h.textContent = x; t.appendChild(h);
    });
  }

  function buildTables() {
    var gt = $('grpTable'); tableHead(gt, 'Grupo');
    GROUPS.forEach(function (g) { offsetRow(gt, g.label, function () { return S.off[g.id]; }); });
    var ft = $('fldTable'); tableHead(ft, 'Campo');
    FIELDS.forEach(function (fl) { offsetRow(ft, fl.label, function () { return S.f[fl.id]; }); });
    offsetRow(ft, 'Cuerpo (ajuste propio)', function () { return S.f.body; });
    offsetRow(ft, 'Firma (ajuste propio)', function () { return S.f.sig; });
  }

  $('btnPrint').addEventListener('click', function () {
    var fired = false;
    function mark() { fired = true; }
    window.addEventListener('beforeprint', mark, { once: true });
    try { window.print(); } catch (e) { /* bloqueado por el visor */ }
    setTimeout(function () {
      window.removeEventListener('beforeprint', mark);
      if (!fired) $('printNote').textContent = 'Este navegador no deja imprimir directo. Tocá “Descargar PDF para imprimir”, abrí el archivo e imprimilo desde ahí (papel Legal, escala 100 %, sin márgenes).';
    }, 900);
  });
  $('btnReset').addEventListener('click', function () {
    var keepData = S.data;
    S = defaultState(); S.data = keepData; S.locked = false; save();
    syncInputs(); render();
  });

  /* ---------- Exportar a PDF y Word ---------- */
  var MM2PT = 72 / 25.4, TW = 1440 / 25.4;
  var _ctx = document.createElement('canvas').getContext('2d');

  function wpt(text, size) {
    _ctx.font = size + 'pt ' + curFont().css;
    return _ctx.measureText(text).width * 0.75;
  }
  function baseline(topPt, lhPt, size, F) { return topPt + (lhPt - (F.asc + F.desc) * size) / 2 + F.asc * size; }

  // Líneas tal como las acomoda el navegador en pantalla, para que el PDF corte igual.
  function paraLines(p) {
    p.normalize();
    var node = p.firstChild;
    if (!node || !node.nodeValue) return [];
    var s = node.nodeValue, re = /\S+/g, m, lines = [], tops = [], cur = null, curTop = 0, rg = document.createRange();
    var z = parseFloat($('zoomer').style.getPropertyValue('--z')) || 1;
    var pitch = (parseFloat(getComputedStyle(p).lineHeight) || (S.body.lh * 96 / 72)) * z, tol = Math.max(2, pitch * 0.4);
    while ((m = re.exec(s))) {
      rg.setStart(node, m.index); rg.setEnd(node, m.index + m[0].length);
      var r = rg.getClientRects(), top = r.length ? r[0].top : curTop;
      if (!cur || Math.abs(top - curTop) > tol) { cur = { a: m.index, b: m.index + m[0].length }; lines.push(cur); tops.push(top); curTop = top; }
      else cur.b = m.index + m[0].length;
    }
    if (!lines.length) return [];
    // Se conservan las líneas en blanco (saltos de párrafo): cada una cuenta como una línea.
    var out = [], lead = ((s.match(/^\s*/) || [''])[0].match(/\n/g) || []).length, i, k;
    for (k = 0; k < lead; k++) out.push('');
    for (i = 0; i < lines.length; i++) {
      if (i > 0) { var gap = Math.max(0, Math.round((tops[i] - tops[i - 1]) / pitch) - 1); for (k = 0; k < gap; k++) out.push(''); }
      out.push(s.slice(lines[i].a, lines[i].b));
    }
    return out;
  }

  function collectLayout() {
    render();
    var dim = PAPERS[S.paper] || PAPERS.legal;
    var L = { W: dim[0], H: dim[1], F: curFont(), singles: [], body: null, sig: null, guides: [], showGuides: !S.locked && !!S.gPrint, only: !S.locked && !!S.gOnly };
    FIELDS.forEach(function (fl) {
      var t = S.data[fl.bind] || '';
      var p = posMm(fl.x, fl.y, fl.grp, fl.id), size = fl.sm ? S.font.cSize : S.font.hSize;
      var kind = fl.id.charAt(2), who = fl.id.charAt(1);
      var w = kind === 'N' || kind === 'D' ? 75 : kind === 'C' ? 23 : kind === 'L' ? (who === 'r' ? 24 : 32) : (who === 'r' ? 25 : 36);
      L.guides.push({ x: p.x, y: p.y, w: fl.min, h: fl.sm ? 3.4 : 4.2, label: fl.label });
      if (!t) return;
      L.singles.push({ x: p.x, y: p.y, w: w, size: size, lh: size * 1.1, text: t });
    });
    var bp = posMm(BODY.x, BODY.y, 'body', 'body');
    var box = paperEl.querySelector('.bodybox:not(.sigbox)'), paras = [];
    if (box) Array.prototype.forEach.call(box.querySelectorAll('p'), function (p) {
      var ls = paraLines(p); if (ls.length) paras.push(ls);
    });
    L.body = { x: bp.x, y: bp.y, w: S.body.w, size: EFF.size, lh: EFF.lh, paras: paras,
               texts: (function () { var t = []; [S.data.cuerpo, S.data.dom, S.data.cierre].forEach(function (x) { if (x) x.replace(/\s+$/, '').split('\n').forEach(function (y) { t.push(y); }); }); return t; })() };
    var sp = sigPos(paras.reduce(function (a, q) { return a + q.length; }, 0));
    L.sig = { x: sp.x, y: sp.y, w: S.body.w, size: EFF.size, lh: EFF.lh,
              lines: [S.data.fNombre || '', S.data.fDni || '', S.data.fCuit || ''] };
    var nl = paras.reduce(function (a, q) { return a + q.length; }, 0);
    L.guides.push({ x: bp.x, y: bp.y, w: S.body.w, h: Math.max(10, nl * EFF.lh / MM2PT), label: 'Cuerpo' });
    L.guides.push({ x: sp.x, y: sp.y, w: S.body.w, h: 3 * EFF.lh / MM2PT, label: 'Firma' });
    return L;
  }

  var WIN = { '“': 0x93, '”': 0x94, '‘': 0x91, '’': 0x92, '–': 0x96, '—': 0x97, '•': 0x95, '…': 0x85, '€': 0x80 };
  function pdfStr(s) {
    var o = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i), c = s.charCodeAt(i);
      if (WIN[ch] !== undefined) c = WIN[ch];
      else if (c > 255 || (c >= 0x80 && c <= 0x9f)) c = 63;
      if (c === 40 || c === 41 || c === 92) o += '\\' + String.fromCharCode(c);
      else if (c < 32) o += ' ';
      else o += String.fromCharCode(c);
    }
    return o;
  }

  function buildPdf(L) {
    var W = L.W * MM2PT, H = L.H * MM2PT, c = [];
    function put(xPt, baseTopPt, text, size, tw) {
      if (L.only) return;
      c.push('BT /F1 ' + size + ' Tf ' + (tw ? tw.toFixed(4) : '0') + ' Tw ' + xPt.toFixed(2) + ' ' +
             (H - baseTopPt).toFixed(2) + ' Td (' + pdfStr(text) + ') Tj ET');
    }
    L.singles.forEach(function (s) {
      put(s.x * MM2PT, baseline(s.y * MM2PT, s.lh, s.size, L.F) - (L.F.key === 'times' ? (s.size < 10 ? 0.8 : 0.3) : 0), s.text, s.size, 0);
    });
    var b = L.body, n = 0, target = b.w * MM2PT;
    b.paras.forEach(function (lines) {
      lines.forEach(function (ln, i) {
        var top = b.y * MM2PT + n * b.lh, last = i === lines.length - 1 || lines[i + 1] === '', tw = 0;
        if (!last) {
          var sp = (ln.match(/ /g) || []).length;
          if (sp) tw = (target - wpt(ln, b.size)) / sp;
        }
        if (ln) put(b.x * MM2PT, baseline(top, b.lh, b.size, L.F), ln, b.size, tw);
        n++;
      });
    });
    var g = L.sig;
    g.lines.forEach(function (t, i) {
      if (!t) return;
      var w = wpt(t, g.size), x = g.x * MM2PT + (g.w * MM2PT - w) / 2;
      put(x, baseline(g.y * MM2PT + i * g.lh, g.lh, g.size, L.F), t, g.size, 0);
    });
    if (L.showGuides) {
      var Yp = function (v) { return (H - v).toFixed(2); };
      var RED = '0.77 0.09 0.11';
      c.push('q ' + RED + ' RG ' + RED + ' rg 0.4 w [2 2] 0 d');
      L.guides.forEach(function (g) {
        c.push((g.x * MM2PT).toFixed(2) + ' ' + Yp((g.y + g.h) * MM2PT) + ' ' + (g.w * MM2PT).toFixed(2) + ' ' + (g.h * MM2PT).toFixed(2) + ' re S');
      });
      c.push('[] 0 d 0.25 w');
      var mmv, big, v;
      for (mmv = 0; mmv <= L.W; mmv += 5) {
        big = mmv % 10 === 0; v = mmv * MM2PT;
        c.push(v.toFixed(2) + ' ' + Yp(0) + ' m ' + v.toFixed(2) + ' ' + Yp((big ? 3 : 1.6) * MM2PT) + ' l S');
      }
      for (mmv = 0; mmv <= L.H; mmv += 5) {
        big = mmv % 10 === 0; v = mmv * MM2PT;
        c.push('0 ' + Yp(v) + ' m ' + ((big ? 3 : 1.6) * MM2PT).toFixed(2) + ' ' + Yp(v) + ' l S');
      }
      c.push((L.calib ? '1.3' : '0.4') + ' w');
      (L.calib ? calMarks(L.W, L.H) : [[10, 10], [L.W - 10, 10], [10, L.H - 10], [L.W - 10, L.H - 10]]).forEach(function (q) {
        var cx = q[0] * MM2PT, cy = q[1] * MM2PT, r = (L.calib ? 6 : 3) * MM2PT;
        c.push((cx - r).toFixed(2) + ' ' + Yp(cy) + ' m ' + (cx + r).toFixed(2) + ' ' + Yp(cy) + ' l S ' + cx.toFixed(2) + ' ' + Yp(cy - r) + ' m ' + cx.toFixed(2) + ' ' + Yp(cy + r) + ' l S');
      });
      var gt = function (x, y, t, size) { c.push('BT /F2 ' + size + ' Tf ' + x.toFixed(2) + ' ' + y + ' Td (' + pdfStr(t) + ') Tj ET'); };
      L.guides.forEach(function (g) { gt(g.x * MM2PT, Yp(g.y * MM2PT - 1.4), g.label, 5); });
      for (mmv = 10; mmv < L.W; mmv += 10) gt(mmv * MM2PT + 1.4, Yp(4.4 * MM2PT), String(mmv / 10), 5);
      for (mmv = 10; mmv < L.H; mmv += 10) gt(3.4 * MM2PT, Yp(mmv * MM2PT - 1.3), String(mmv / 10), 5);
      c.push('Q');
    }
    if (L.calib) {
      var Yq = function (v) { return (H - v).toFixed(2); };
      var tt = function (x, y, t, size, red) { c.push('q ' + (red ? '0.77 0.09 0.11 rg' : '0 g') + ' BT /F2 ' + size + ' Tf ' + x.toFixed(2) + ' ' + Yq(y) + ' Td (' + pdfStr(t) + ') Tj ET Q'); };
      c.push('q 0.77 0.09 0.11 RG 0.35 w [] 0 d');
      L.singles.forEach(function (s) {
        var bx = s.x * MM2PT, by = baseline(s.y * MM2PT, s.lh, s.size, L.F) - (L.F.key === 'times' ? (s.size < 10 ? 0.8 : 0.3) : 0), r = 1.5 * MM2PT;
        c.push((bx - r).toFixed(2) + ' ' + Yq(by) + ' m ' + (bx + r).toFixed(2) + ' ' + Yq(by) + ' l S ' + bx.toFixed(2) + ' ' + Yq(by - r) + ' m ' + bx.toFixed(2) + ' ' + Yq(by + r) + ' l S');
      });
      var hb = L.scaleBars.h, vb = L.scaleBars.v, k;
      c.push((hb.x * MM2PT).toFixed(2) + ' ' + Yq(hb.y * MM2PT) + ' m ' + ((hb.x + 100) * MM2PT).toFixed(2) + ' ' + Yq(hb.y * MM2PT) + ' l S');
      for (k = 0; k <= 100; k += 10) c.push(((hb.x + k) * MM2PT).toFixed(2) + ' ' + Yq((hb.y - 2) * MM2PT) + ' m ' + ((hb.x + k) * MM2PT).toFixed(2) + ' ' + Yq((hb.y + 2) * MM2PT) + ' l S');
      c.push((vb.x * MM2PT).toFixed(2) + ' ' + Yq(vb.y * MM2PT) + ' m ' + (vb.x * MM2PT).toFixed(2) + ' ' + Yq((vb.y + 100) * MM2PT) + ' l S');
      for (k = 0; k <= 100; k += 10) c.push(((vb.x - 2) * MM2PT).toFixed(2) + ' ' + Yq((vb.y + k) * MM2PT) + ' m ' + ((vb.x + 2) * MM2PT).toFixed(2) + ' ' + Yq((vb.y + k) * MM2PT) + ' l S');
      c.push('Q');
      tt(hb.x * MM2PT, (hb.y + 6) * MM2PT, 'Esta barra debe medir 100 mm', 6.5, true);
      tt((vb.x - 16) * MM2PT, (vb.y + 104) * MM2PT, 'Debe medir 100 mm', 6.5, true);
      L.legend.forEach(function (g) { tt(g.x * MM2PT, g.y * MM2PT, g.t, g.size, false); });
    }
    var content = c.join('\n');
    var objs = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W.toFixed(2) + ' ' + H.toFixed(2) +
        '] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /' + L.F.pdf + ' /Encoding /WinAnsiEncoding >>',
      '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
    ];
    var out = '%PDF-1.4\n', offs = [];
    objs.forEach(function (o, i) { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    var xr = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offs.forEach(function (o) { out += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
    out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF\n';
    var u = new Uint8Array(out.length);
    for (var i = 0; i < out.length; i++) u[i] = out.charCodeAt(i) & 255;
    return u;
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function frameParas(o) {
    var frame = '<w:framePr w:w="' + Math.round(o.w * TW) + '" w:hSpace="0" w:wrap="around" w:vAnchor="page" w:hAnchor="page" w:x="' +
      Math.round(o.x * TW) + '" w:y="' + Math.round(o.y * TW) + '"/>';
    var sz = Math.round(o.size * 2), fn = curFont().docx;
    return o.texts.map(function (t) {
      return '<w:p><w:pPr>' + frame + '<w:spacing w:before="0" w:after="0" w:line="' + Math.round(o.lh * 20) +
        '" w:lineRule="exact"/><w:ind w:left="0" w:right="0"/>' + (o.jc ? '<w:jc w:val="' + o.jc + '"/>' : '') +
        '</w:pPr><w:r><w:rPr><w:rFonts w:ascii="' + fn + '" w:hAnsi="' + fn + '" w:cs="' + fn + '"/>' +
        '<w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/></w:rPr><w:t xml:space="preserve">' + esc(t) + '</w:t></w:r></w:p>';
    }).join('');
  }

  var CRC_T = (function () {
    var t = [], c, n, k;
    for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

  function zipStore(files) {
    var enc = new TextEncoder(), parts = [], central = [], off = 0, dosDate = ((2026 - 1980) << 9) | (11 << 5) | 1;
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true); lh.setUint16(10, 0, true); lh.setUint16(12, dosDate, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true); ch.setUint16(12, 0, true); ch.setUint16(14, dosDate, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
      central.push(new Uint8Array(ch.buffer), name);
      off += 30 + name.length + data.length;
    });
    var csize = central.reduce(function (a, p) { return a + p.length; }, 0);
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, csize, true); end.setUint32(16, off, true);
    return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), { type: 'application/zip' });
  }

  function buildDocx(L) {
    var fnt = curFont().docx;
    var NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
    var body = '';
    L.singles.forEach(function (s) {
      body += frameParas({ x: s.x, y: s.y, w: s.w, size: s.size, lh: s.lh, texts: [s.text] });
    });
    body += frameParas({ x: L.body.x, y: L.body.y, w: L.body.w, size: L.body.size, lh: L.body.lh, jc: 'both', texts: L.body.texts });
    body += frameParas({ x: L.sig.x, y: L.sig.y, w: L.sig.w, size: L.sig.size, lh: L.sig.lh, jc: 'center',
                         texts: L.sig.lines.filter(Boolean) });
    body += '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>';
    body += '<w:sectPr><w:pgSz w:w="' + Math.round(L.W * TW) + '" w:h="' + Math.round(L.H * TW) +
      '"/><w:pgMar w:top="567" w:right="567" w:bottom="567" w:left="567" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>';
    var head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    return zipStore([
      { name: '[Content_Types].xml', text: head + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>' },
      { name: '_rels/.rels', text: head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { name: 'word/_rels/document.xml.rels', text: head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: 'word/styles.xml', text: head + '<w:styles ' + NS + '><w:docDefaults><w:rPrDefault><w:rPr>' +
        '<w:rFonts w:ascii="' + fnt + '" w:hAnsi="' + fnt + '" w:cs="' + fnt + '"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="es-AR"/>' +
        '</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>' },
      { name: 'word/document.xml', text: head + '<w:document ' + NS + '><w:body>' + body + '</w:body></w:document>' }
    ]);
  }

  function setNote(t) { $('expNote').textContent = t; }

  function fileBase() {
    var n = (S.data.dNombre || 'destinatario').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
    return 'Carta_documento_' + (n || 'destinatario');
  }

  async function saveFile(filename, blob) {
    var dl = null;
    try { if (window.claude && window.claude.use) dl = await window.claude.use('downloads'); } catch (e) { dl = null; }
    if (dl) {
      try {
        await dl.save({ filename: filename, data: blob });
        setNote('Listo: ' + filename + ' guardado.');
      } catch (e) {
        if (e && e.code === 'declined') setNote('No se guardó el archivo.');
        else setNote('No se pudo guardar desde acá. Usá Imprimir y elegí “Guardar como PDF”.');
      }
      return;
    }
    // Fuera del visor (por ejemplo, el .html abierto desde tu computadora): descarga directa.
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    setNote('Listo: ' + filename + '.');
  }

  function wrapLines(text, wMm, size) {
    var words = text.split(/\s+/), lines = [], cur = '', maxPt = wMm * MM2PT;
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (cur && wpt(t, size) > maxPt) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  // Página de calibración: no usa tus datos, así sirve para cualquier persona y cualquier formulario.
  function collectCalibLayout() {
    var L = collectLayout();
    L.body.size = S.body.size; L.body.lh = S.body.lh; L.sig.size = S.body.size; L.sig.lh = S.body.lh;
    var SAMPLE = { N: 'Nombre y Apellido', D: 'Calle 1234, Piso 1°', C: '1000', L: 'Localidad', P: 'Provincia' };
    L.guides = [];
    L.singles = [];
    FIELDS.forEach(function (fl) {
      var p = posMm(fl.x, fl.y, fl.grp, fl.id), size = fl.sm ? S.font.cSize : S.font.hSize;
      L.singles.push({ x: p.x, y: p.y, w: 30, size: size, lh: size * 1.1, text: SAMPLE[fl.id.charAt(2)] });
    });
    var base = 'Texto de prueba del cuerpo de la carta: verificá que el margen izquierdo y el derecho queden dentro de la zona amarilla y que la primera línea no pise el borde superior. ';
    var lines = wrapLines(new Array(10).join(base), S.body.w, S.body.size).slice(0, 12);
    L.body.paras = [lines];
    L.sig.lines = ['Firma y aclaración', 'DNI N° 00.000.000', 'CUIT N° 00-00000000-0'];
    var sp2 = sigPos(lines.length, S.body.lh); L.sig.x = sp2.x; L.sig.y = sp2.y;
    var ly = sp2.y + 3 * S.body.lh / MM2PT + 8, lx = L.body.x;
    L.legend = [
      { x: lx, y: ly, size: 8.5, t: 'HOJA DE CALIBRACIÓN - Carta documento' },
      { x: lx, y: ly + 5, size: 7, t: 'Imprimir sobre el formulario real: tamaño de papel ' + (S.paper === 'a4' ? 'A4' : S.paper === 'oficio' ? 'Oficio 216 x 330 mm' : 'Legal 215,9 x 355,6 mm') + ', escala 100 %, sin márgenes ni encabezados.' },
      { x: lx, y: ly + 9, size: 7, t: '1) Las barras de 100 mm tienen que medir 100 mm. Si no, la impresora está escalando.' },
      { x: lx, y: ly + 13, size: 7, t: '2) Cada cruz chica marca dónde tiene que empezar cada texto (inicio y línea base).' },
      { x: lx, y: ly + 17, size: 7, t: '3) Sacá una foto plana con las 4 cruces de las esquinas visibles y subila en “Calibrar con una foto”.' }
    ];
    L.scaleBars = { h: { x: 30, y: Math.min(L.H - 25, 300) }, v: { x: 197, y: 185 } };
    L.showGuides = true; L.only = false; L.calib = true;
    return L;
  }

  $('btnCalib').addEventListener('click', function () {
    try {
      saveFile('Hoja_de_calibracion_carta_documento.pdf', new Blob([buildPdf(collectCalibLayout())], { type: 'application/pdf' }));
      setNote('Imprimí la página sobre el formulario real, a escala 100 %, y sacale una foto plana con las cuatro cruces de las esquinas visibles.');
    } catch (e) { setNote('No se pudo armar la página de calibración.'); }
  });

  /* ---------- Calibrar con una foto ---------- */
  // Posiciones (mm) de las líneas preimpresas del formulario, medidas sobre el formulario real.
  // [posición, desde, hasta]: la ventana donde se busca la línea, libre de texto impreso.
  var FORM_H = {
    A: [[44.2, 94, 106], [52.2, 94, 106], [60.2, 94, 106], [44.2, 179, 189], [52.2, 179, 189]],
    B: [[138.4, 94, 106], [146.1, 94, 106], [153.9, 94, 106], [138.4, 179, 189], [146.1, 179, 189]],
    body: [[153.9, 94, 106]]
  };
  var FORM_V = {
    A: [[108.2, 31, 35.5], [191.3, 31, 43]],
    B: [[108.1, 126, 130], [191.5, 126, 137]]
  };
  var photoResult = null;

  function median(a) {
    if (!a.length) return null;
    var b = a.slice().sort(function (x, y) { return x - y; }), m = Math.floor(b.length / 2);
    return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
  }
  function round1(v) { return Math.round(v * 10) / 10; }
  // Cruces de la hoja de calibración, en orden: arriba izq., arriba der., abajo der., abajo izq.
  function calMarks(W, H) { return [[15, 15], [W - 15, 15], [W - 15, H - 15], [30, H - 15]]; }
  // Descarta mediciones que se alejan más de 1 mm de la mediana (una etiqueta o una mancha leídas como línea).
  function robust(a) {
    var m = median(a); if (m === null) return a;
    return a.filter(function (v) { return Math.abs(v - m) <= 1.0; });
  }

  function loadPhoto(file, quarter) {
    return createImageBitmap(file, { imageOrientation: 'from-image' }).then(function (bmp) {
      var sc = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
      var w = Math.round(bmp.width * sc), h = Math.round(bmp.height * sc);
      var swap = quarter % 2 === 1, cw = swap ? h : w, ch = swap ? w : h;
      var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      var cx = cv.getContext('2d', { willReadFrequently: true });
      cx.translate(cw / 2, ch / 2); cx.rotate(quarter * Math.PI / 2); cx.drawImage(bmp, -w / 2, -h / 2, w, h);
      return cx.getImageData(0, 0, cw, ch);
    });
  }

  // Máscara de los píxeles con tinta roja (las guías y cruces que imprime la hoja de calibración).
  function redMask(img, grow) {
    var w = img.width, h = img.height, d = img.data, n = w * h, mask = new Uint8Array(n), i, yy, xx, g2;
    for (i = 0; i < n; i++) {
      var r = d[4 * i], g = d[4 * i + 1], b = d[4 * i + 2], mx = g > b ? g : b;
      if (r > 60 && r > 1.3 * mx && r - mx > 18 && Math.abs(g - b) < 0.3 * r) mask[i] = 1;
    }
    for (g2 = 0; g2 < grow; g2++) {
      var dil = new Uint8Array(n);
      for (yy = 1; yy < h - 1; yy++) for (xx = 1; xx < w - 1; xx++) {
        i = yy * w + xx;
        if (mask[i] || mask[i - 1] || mask[i + 1] || mask[i - w] || mask[i + w]) dil[i] = 1;
      }
      mask = dil;
    }
    return mask;
  }

  // Busca las cuatro cruces impresas en las esquinas por su forma de "+", en color o en blanco y negro.
  function findCrosses(img) {
    var w = img.width, h = img.height, d = img.data, n = w * h, i, x, y;
    var gray = new Float32Array(n);
    for (i = 0; i < n; i++) gray[i] = 0.3 * d[4 * i] + 0.59 * d[4 * i + 1] + 0.11 * d[4 * i + 2];
    // fondo local con imagen integral (ventana de ~2 % del lado mayor)
    var W1 = w + 1, I = new Float64Array(W1 * (h + 1));
    for (y = 0; y < h; y++) { var rs = 0; for (x = 0; x < w; x++) { rs += gray[y * w + x]; I[(y + 1) * W1 + x + 1] = I[y * W1 + x + 1] + rs; } }
    var rad = Math.max(8, Math.round(Math.max(w, h) * 0.02)), mask = new Uint8Array(n);
    for (y = 0; y < h; y++) {
      var y0 = Math.max(0, y - rad), y1 = Math.min(h, y + rad + 1);
      for (x = 0; x < w; x++) {
        var x0 = Math.max(0, x - rad), x1 = Math.min(w, x + rad + 1);
        var mean = (I[y1 * W1 + x1] - I[y0 * W1 + x1] - I[y1 * W1 + x0] + I[y0 * W1 + x0]) / ((y1 - y0) * (x1 - x0));
        if (gray[y * w + x] < mean * 0.82) mask[y * w + x] = 1;
      }
    }
    var seen = new Uint8Array(n), stack = new Int32Array(n), pts = [], blobs = [];
    var minS = Math.max(w, h) * 0.012, maxS = Math.max(w, h) * 0.11;
    for (i = 0; i < n; i++) {
      if (!mask[i] || seen[i]) continue;
      var sp = 0, bx0 = w, bx1 = 0, by0 = h, by1 = 0; pts.length = 0;
      stack[sp++] = i; seen[i] = 1;
      while (sp) {
        var q = stack[--sp], qx = q % w, qy = (q - qx) / w; pts.push(q);
        if (qx < bx0) bx0 = qx; if (qx > bx1) bx1 = qx; if (qy < by0) by0 = qy; if (qy > by1) by1 = qy;
        if (pts.length > 60000) break;
        var nb = [q - 1, q + 1, q - w, q + w, q - w - 1, q - w + 1, q + w - 1, q + w + 1];
        for (var t = 0; t < 8; t++) {
          var z = nb[t]; if (z < 0 || z >= n || seen[z] || !mask[z]) continue;
          if (Math.abs((z % w) - qx) > 1) continue;
          seen[z] = 1; stack[sp++] = z;
        }
      }
      var bw = bx1 - bx0 + 1, bh = by1 - by0 + 1;
      if (bw < minS || bh < minS || bw > maxS || bh > maxS || bw / bh < 0.6 || bw / bh > 1.67) continue;
      if (pts.length / (bw * bh) > 0.3 || pts.length < 40) continue;
      // forma de "+": los píxeles se concentran en una columna y una fila
      var colH = new Int32Array(bw), rowH = new Int32Array(bh), k;
      for (k = 0; k < pts.length; k++) { var px = pts[k] % w; colH[px - bx0]++; rowH[(pts[k] - px) / w - by0]++; }
      var cBest = 0, rBest = 0;
      for (k = 1; k < bw; k++) if (colH[k] > colH[cBest]) cBest = k;
      for (k = 1; k < bh; k++) if (rowH[k] > rowH[rBest]) rBest = k;
      var band = Math.max(3, Math.round(Math.min(bw, bh) * 0.13)), inBand = 0, sx = 0, sxn = 0, sy = 0, syn = 0;
      for (k = 0; k < pts.length; k++) {
        var ex = pts[k] % w, ey = (pts[k] - ex) / w, inC = Math.abs(ex - bx0 - cBest) <= band, inR = Math.abs(ey - by0 - rBest) <= band;
        if (inC || inR) inBand++;
        if (inC && !inR) { sx += ex; sxn++; }
        if (inR && !inC) { sy += ey; syn++; }
      }
      if (inBand / pts.length < 0.85 || colH[cBest] < bh * 0.25 || rowH[rBest] < bw * 0.25 || !sxn || !syn) continue;
      blobs.push({ x: sx / sxn + 0.5, y: sy / syn + 0.5 });
    }
    if (blobs.length < 4) return null;
    function pick(f) { return blobs.reduce(function (a, b) { return f(b) < f(a) ? b : a; }); }
    var tl = pick(function (b) { return b.x + b.y; }), br = pick(function (b) { return -(b.x + b.y); }),
        tr = pick(function (b) { return -(b.x - b.y); }), bl = pick(function (b) { return b.x - b.y; });
    var set = [tl, tr, br, bl];
    for (var a2 = 0; a2 < 4; a2++) for (var c2 = a2 + 1; c2 < 4; c2++) if (set[a2] === set[c2]) return null;
    if (Math.abs(tl.x - tr.x) < Math.min(w, h) * 0.3 || Math.abs(tl.y - bl.y) < Math.min(w, h) * 0.3) return null;
    return { tl: [tl.x, tl.y], tr: [tr.x, tr.y], br: [br.x, br.y], bl: [bl.x, bl.y] };
  }

  // Homografía mm -> píxeles de la foto, resuelta con las 4 cruces.
  function solveH(mm, px) {
    var A = [], i, j, k;
    for (i = 0; i < 4; i++) {
      var X = mm[i][0], Y = mm[i][1], u = px[i][0], v = px[i][1];
      A.push([X, Y, 1, 0, 0, 0, -u * X, -u * Y, u]);
      A.push([0, 0, 0, X, Y, 1, -v * X, -v * Y, v]);
    }
    for (i = 0; i < 8; i++) {
      var p = i;
      for (j = i + 1; j < 8; j++) if (Math.abs(A[j][i]) > Math.abs(A[p][i])) p = j;
      var tmp = A[i]; A[i] = A[p]; A[p] = tmp;
      for (j = i + 1; j < 8; j++) {
        var f = A[j][i] / A[i][i];
        for (k = i; k < 9; k++) A[j][k] -= f * A[i][k];
      }
    }
    var h = new Array(8);
    for (i = 7; i >= 0; i--) {
      var s2 = A[i][8];
      for (j = i + 1; j < 8; j++) s2 -= A[i][j] * h[j];
      h[i] = s2 / A[i][i];
    }
    return h;
  }

  // Foto enderezada a milímetros reales (canal rojo: la tinta roja desaparece, las líneas azules y el texto negro se ven oscuros).
  function rectify(img, H, ow, oh, ppm) {
    var w = img.width, h = img.height, d = img.data, R = new Float32Array(w * h), i;
    for (i = 0; i < w * h; i++) R[i] = d[4 * i];
    var mk = redMask(img, 2), outM = new Uint8Array(ow * oh);
    var out = new Float32Array(ow * oh), ox, oy;
    for (oy = 0; oy < oh; oy++) {
      var Y = (oy + 0.5) / ppm;
      for (ox = 0; ox < ow; ox++) {
        var X = (ox + 0.5) / ppm, den = H[6] * X + H[7] * Y + 1;
        var u = (H[0] * X + H[1] * Y + H[2]) / den, v = (H[3] * X + H[4] * Y + H[5]) / den;
        if (u < 0 || v < 0 || u >= w - 1 || v >= h - 1) { out[oy * ow + ox] = 200; continue; }
        var iu = u | 0, iv = v | 0, fu = u - iu, fv = v - iv, p0 = iv * w + iu;
        outM[oy * ow + ox] = mk[p0] | mk[p0 + 1] | mk[p0 + w] | mk[p0 + w + 1];
        out[oy * ow + ox] = R[p0] * (1 - fu) * (1 - fv) + R[p0 + 1] * fu * (1 - fv) + R[p0 + w] * (1 - fu) * fv + R[p0 + w + 1] * fu * fv;
      }
    }
    return { g: out, m: outM };
  }

  // Posición (mm) de una línea fina oscura cerca de la esperada, o null si no hay una clara.
  function lineAt(g, m, ow, oh, ppm, axis, e, a0, a1) {
    var lo = Math.max(0, e - 10), p0 = Math.round(lo * ppm), p1 = Math.round((e + 10) * ppm);
    var q0 = Math.round(a0 * ppm), q1 = Math.round(a1 * ppm), prof = [], i, j, s;
    var maxP = (axis === 'h' ? oh : ow); if (p1 > maxP) p1 = maxP;
    for (i = p0; i < p1; i++) {
      s = 0; var cn = 0;
      for (j = q0; j < q1; j++) {
        var ix = axis === 'h' ? i * ow + j : j * ow + i;
        if (!m[ix]) { s += g[ix]; cn++; }
      }
      prof.push(cn > (q1 - q0) * 0.3 ? s / cn : NaN);
    }
    var last = null;
    for (i = 0; i < prof.length; i++) { if (isNaN(prof[i])) { if (last !== null) prof[i] = last; } else last = prof[i]; }
    for (i = prof.length - 1; i >= 0; i--) { if (isNaN(prof[i])) prof[i] = last !== null ? last : 200; else last = prof[i]; }
    var win = Math.round(6 * ppm), res = [], k, acc, cnt;
    for (i = 0; i < prof.length; i++) {
      acc = 0; cnt = 0;
      for (k = Math.max(0, i - win); k <= Math.min(prof.length - 1, i + win); k++) { acc += prof[k]; cnt++; }
      res.push(prof[i] - acc / cnt);
    }
    var c = Math.round((e - lo) * ppm), sr = Math.round(3.5 * ppm), best = -1, bv = 0;
    for (i = Math.max(1, c - sr); i <= Math.min(res.length - 2, c + sr); i++) {
      if (res[i] < bv && res[i] <= res[i - 1] && res[i] <= res[i + 1]) { bv = res[i]; best = i; }
    }
    // ruido: zona central del perfil, sin contar el entorno de la línea candidata
    var cen = [], gap = Math.round(1.2 * ppm), half = Math.round(7 * ppm);
    for (i = Math.max(0, c - half); i <= Math.min(res.length - 1, c + half); i++) {
      if (best >= 0 && Math.abs(i - best) <= gap) continue;
      cen.push(Math.abs(res[i]));
    }
    cen.sort(function (a, b) { return a - b; });
    var sigma = cen.length ? 1.4826 * cen[Math.floor(cen.length / 2)] + 0.3 : 3;
    if (best < 0 || bv > -Math.max(3, 2.5 * sigma)) return null;
    var a = res[best - 1], b = res[best], d = res[best + 1], den = a - 2 * b + d;
    return (p0 + best + (den !== 0 ? 0.5 * (a - d) / den : 0) + 0.5) / ppm;
  }

  function analyzePhoto(img) {
    var cr = findCrosses(img); if (!cr) return { ok: false, why: 'No encontré las cuatro cruces de las esquinas.' };
    var dim = PAPERS[S.paper] || PAPERS.legal, W = dim[0], Hh = dim[1], ppm = 5;
    var Hm = solveH(calMarks(W, Hh), [cr.tl, cr.tr, cr.br, cr.bl]);
    var ow = Math.round(W * ppm), oh = Math.round(Hh * ppm), rc = rectify(img, Hm, ow, oh, ppm), g = rc.g, mk = rc.m;
    var res = { ok: true, g: g, ow: ow, oh: oh, total: 0 };
    ['A', 'B'].forEach(function (k) {
      var dy = [], dx = [];
      FORM_H[k].forEach(function (f) { var v = lineAt(g, mk, ow, oh, ppm, 'h', f[0], f[1], f[2]); if (v !== null) dy.push(v - f[0]); });
      FORM_V[k].forEach(function (f) { var v = lineAt(g, mk, ow, oh, ppm, 'v', f[0], f[1], f[2]); if (v !== null) dx.push(v - f[0]); });
      dx = robust(dx); dy = robust(dy);
      res[k] = { dx: median(dx), dy: median(dy), nx: dx.length, ny: dy.length };
      res.total += dx.length + dy.length;
    });
    var bd = [];
    FORM_H.body.forEach(function (f) { var v = lineAt(g, mk, ow, oh, ppm, 'h', f[0], f[1], f[2]); if (v !== null) bd.push(v - f[0]); });
    // La línea azul bajo el segundo bloque es el borde superior del cuerpo: si no se mide aparte, se usa la del bloque.
    res.body = { dy: bd.length ? median(bd) : res.B.dy, ny: bd.length || (res.B.dy !== null ? 1 : 0) }; res.total += bd.length;
    return res;
  }

  function showPhotoResult(r) {
    var cv = $('photoPrev'), sc = 360 / r.ow;
    cv.width = 360; cv.height = Math.round(r.oh * sc);
    var tmp = document.createElement('canvas'); tmp.width = r.ow; tmp.height = r.oh;
    var id = tmp.getContext('2d').createImageData(r.ow, r.oh), i;
    for (i = 0; i < r.ow * r.oh; i++) { var v = Math.max(0, Math.min(255, r.g[i])); id.data[4 * i] = id.data[4 * i + 1] = id.data[4 * i + 2] = v; id.data[4 * i + 3] = 255; }
    tmp.getContext('2d').putImageData(id, 0, 0);
    cv.getContext('2d').drawImage(tmp, 0, 0, cv.width, cv.height);
    cv.hidden = false;
    var t = $('photoTable'); tableHead(t, 'Zona');
    function row(label, o) {
      var a = document.createElement('span'); a.textContent = label; t.appendChild(a);
      var x = document.createElement('span'); x.textContent = o && o.dx !== null && o.dx !== undefined ? round1(o.dx) : '-'; t.appendChild(x);
      var y = document.createElement('span'); y.textContent = o && o.dy !== null && o.dy !== undefined ? round1(o.dy) : '-'; t.appendChild(y);
    }
    row('Copia 1 (' + r.A.nx + '+' + r.A.ny + ' líneas)', r.A);
    row('Copia 2 (' + r.B.nx + '+' + r.B.ny + ' líneas)', r.B);
    row('Cuerpo y firma', { dx: r.B.dx, dy: r.body.dy });
    $('photoRes').hidden = false;
  }

  async function handlePhoto(file) {
    if (!file) return;
    $('photoRes').hidden = true; $('photoPrev').hidden = true; photoResult = null;
    $('photoNote').textContent = 'Analizando la foto…';
    try {
      var best = null, q, order = [0, 2, 1, 3];
      for (var k = 0; k < order.length; k++) {
        q = order[k];
        var img = await loadPhoto(file, q), r = analyzePhoto(img);
        if (r.ok && (!best || r.total > best.total)) best = r;
        if (r.ok && r.A.ny >= 2 && r.B.ny >= 2 && r.A.nx >= 1 && r.B.nx >= 1 && r.body.ny >= 1) break;
      }
      if (!best) { $('photoNote').textContent = 'No encontré las cuatro cruces de las esquinas. Sacá la foto con la hoja entera, plana y bien iluminada. Si en la hoja impresa faltan las cruces de abajo, la impresora cortó la hoja: elegí papel Legal (8,5 × 14 pulgadas) al imprimir.'; return; }
      var good = best.A.ny >= 2 && best.B.ny >= 2 && best.A.nx >= 1 && best.B.nx >= 1 && best.body.ny >= 1;
      if (!good) {
        $('photoNote').textContent = 'Encontré las cruces, pero no pude medir bien las líneas del formulario (más luz, sin sombras y sin reflejos ayuda). Probá con otra foto.';
        showPhotoResult(best); $('btnApplyPhoto').disabled = true; return;
      }
      photoResult = best; $('btnApplyPhoto').disabled = false;
      $('photoNote').textContent = 'Listo. Estos son los desvíos del formulario respecto de la impresión, en milímetros. Revisalos y tocá “Aplicar y fijar calibración”.';
      showPhotoResult(best);
    } catch (e) { $('photoNote').textContent = 'No pude leer esa imagen. Probá con otra foto (JPG o PNG).'; }
  }

  $('btnShoot').addEventListener('click', function () { $('photoCam').click(); });
  $('btnUpload').addEventListener('click', function () { $('photoUp').click(); });
  $('photoCam').addEventListener('change', function (e) { handlePhoto(e.target.files[0]); e.target.value = ''; });
  $('photoUp').addEventListener('change', function (e) { handlePhoto(e.target.files[0]); e.target.value = ''; });
  $('btnDiscardPhoto').addEventListener('click', function () {
    photoResult = null; $('photoRes').hidden = true; $('photoPrev').hidden = true; $('photoNote').textContent = '';
  });
  $('btnApplyPhoto').addEventListener('click', function () {
    var r = photoResult; if (!r) return;
    S.off.g = { x: 0, y: 0 };
    S.off.A = { x: round1(r.A.dx), y: round1(r.A.dy) };
    S.off.B = { x: round1(r.B.dx), y: round1(r.B.dy) };
    S.off.body = { x: round1(r.B.dx), y: round1(r.body.dy) };
    S.off.sig = { x: round1(r.B.dx), y: round1(r.body.dy) };
    S.locked = true; S.calibrated = true; save(); syncInputs(); render();
    photoResult = null; $('photoRes').hidden = true; $('photoPrev').hidden = true;
    $('photoNote').textContent = 'Calibración aplicada y fijada. Imprimí un PDF de prueba con tus datos para verificar; si hace falta un retoque, tocá “Editar calibración”.';
  });

  $('btnPdf').addEventListener('click', function () {
    try {
      var bytes = buildPdf(collectLayout());
      saveFile(fileBase() + '.pdf', new Blob([bytes], { type: 'application/pdf' }));
    } catch (e) { setNote('No se pudo armar el PDF. Usá Imprimir y elegí “Guardar como PDF”.'); }
  });
  $('btnDocx').addEventListener('click', function () {
    try { saveFile(fileBase() + '.docx', buildDocx(collectLayout())); }
    catch (e) { setNote('No se pudo armar el Word.'); }
  });

  /* ---------- Mis cartas (borradores) ---------- */
  var DKEY = 'cd-borradores-v1';
  function getDrafts() { try { return JSON.parse(localStorage.getItem(DKEY) || '{}') || {}; } catch (e) { return {}; } }
  function putDrafts(o) { try { localStorage.setItem(DKEY, JSON.stringify(o)); return true; } catch (e) { return false; } }
  function draftMsg(t) { $('draftNote').textContent = t; }
  function refreshDrafts(sel) {
    var d = getDrafts(), names = Object.keys(d).sort(function (a, b) { return a.localeCompare(b, 'es'); }), el = $('draftSel');
    el.innerHTML = '';
    if (!names.length) { var o0 = document.createElement('option'); o0.value = ''; o0.textContent = '(ninguna todavía)'; el.appendChild(o0); return; }
    names.forEach(function (n) { var o = document.createElement('option'); o.value = n; o.textContent = n; el.appendChild(o); });
    if (sel && d[sel]) el.value = sel;
  }
  function loadData(data) {
    S.data = Object.assign({}, DEFAULT_DATA, data || {});
    save(); syncInputs(); render();
  }
  $('btnDraftSave').addEventListener('click', function () {
    var name = $('draftName').value.trim();
    if (!name) { draftMsg('Poné un nombre para guardarla.'); return; }
    var d = getDrafts(); d[name] = { data: S.data, savedAt: new Date().toISOString() };
    if (putDrafts(d)) { refreshDrafts(name); draftMsg('Guardada: “' + name + '”.'); } else draftMsg('No se pudo guardar en este navegador.');
  });
  $('btnDraftOpen').addEventListener('click', function () {
    var n = $('draftSel').value, d = getDrafts();
    if (!n || !d[n]) { draftMsg('No hay ninguna carta para abrir.'); return; }
    loadData(d[n].data); $('draftName').value = n; draftMsg('Abierta: “' + n + '”.');
  });
  $('btnDraftDel').addEventListener('click', function () {
    var n = $('draftSel').value, d = getDrafts();
    if (!n || !d[n]) return;
    delete d[n]; putDrafts(d); refreshDrafts(); draftMsg('Eliminada: “' + n + '”.');
  });
  $('btnDraftNew').addEventListener('click', function () { loadData({}); $('draftName').value = ''; draftMsg('Carta nueva en blanco. La anterior sigue guardada si la habías guardado.'); });
  $('btnExample').addEventListener('click', function () { loadData(EXAMPLE_DATA); draftMsg('Cargué un ejemplo para que veas cómo queda. Usá “Carta nueva” para empezar la tuya.'); });
  $('btnDraftExp').addEventListener('click', function () {
    var d = getDrafts();
    if (!Object.keys(d).length) { draftMsg('Todavía no guardaste ninguna carta.'); return; }
    saveFile('cartas-guardadas.json', new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' }));
    draftMsg('Exporté tus cartas guardadas a un archivo. Sirve de copia de seguridad.');
  });
  $('btnDraftImp').addEventListener('click', function () { $('draftFile').click(); });
  $('draftFile').addEventListener('change', function (e) {
    var f = e.target.files[0]; e.target.value = ''; if (!f) return;
    f.text().then(function (t) {
      var inc = JSON.parse(t), d = getDrafts(), n = 0;
      Object.keys(inc).forEach(function (k) { if (inc[k] && inc[k].data) { d[k] = inc[k]; n++; } });
      putDrafts(d); refreshDrafts(); draftMsg('Importé ' + n + ' carta' + (n === 1 ? '' : 's') + '.');
    }).catch(function () { draftMsg('Ese archivo no es una copia de seguridad válida.'); });
  });

  /* ---------- Ayuda de primer uso ---------- */
  $('btnFirstGo').addEventListener('click', function () {
    var cs = $('calibSection'); cs.open = true; $('photoBox').open = true;
    cs.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('btnFirstSkip').addEventListener('click', function () { S.calibrated = true; save(); $('firstRun').hidden = true; });

  var PH = { rNombre: 'Nombre y apellido', rDom: 'Calle y número, piso, depto.', rCP: 'CP', rLoc: 'Localidad', rProv: 'Provincia',
             dNombre: 'Nombre y apellido o razón social', dDom: 'Calle y número, piso, depto.', dCP: 'CP', dLoc: 'Localidad', dProv: 'Provincia',
             cuerpo: 'Escribí acá el texto de la carta…', dom: 'Constituyo domicilio legal en…', cierre: 'Queda Ud. debidamente notificado.',
             fNombre: 'Nombre y apellido', fDni: 'DNI N° …', fCuit: 'CUIT N° … (opcional)' };
  Object.keys(PH).forEach(function (k) { var el = $(k); if (el) el.setAttribute('placeholder', PH[k]); });
  refreshDrafts();

  // La aplicación es solo online: si quedó instalado el modo sin conexión de antes, se da de baja.
  if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); });

  window.addEventListener('resize', fit);

  // Modelo elegido en la guía de modelos: llega por sessionStorage, sin pasar por la dirección ni por la red.
  function applyModel() {
    var t = null;
    try { t = sessionStorage.getItem('cdf-modelo'); sessionStorage.removeItem('cdf-modelo'); } catch (e) { return; }
    if (!t) return;
    var had = (S.data.cuerpo || '').trim();
    if (had && had !== t && !window.confirm('Ya tenés texto en la carta. ¿Querés reemplazarlo por el modelo?')) return;
    S.data.cuerpo = t; save();
    draftMsg('Cargué el modelo en el cuerpo de la carta. Reemplazá lo que está entre [corchetes] con tus datos.');
  }

  load();
  applyModel();
  bindInputs();
  syncInputs();
  render();
})();

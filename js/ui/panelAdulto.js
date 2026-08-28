/* Panel de adulto. Se abre manteniendo pulsado el candado 2 segundos, para
   que no entre él por casualidad.

   Aquí sí se ven los números en crudo: calibración, evolución por sesiones y
   las sílabas concretas donde está atascado. */
(function (JL) {
  'use strict';

  function crear(tag, clase, texto) {
    var el = document.createElement(tag);
    if (clase) el.className = clase;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function seg(ms) { return (ms / 1000).toFixed(2).replace('.', ',') + ' s'; }

  /* Sparkline del tiempo medio por sesión: hacia abajo es mejorar. */
  function grafico(sesiones) {
    var datos = sesiones.slice(-20).filter(function (s) { return s.mediaMs; });
    if (datos.length < 2) return crear('p', 'nota', 'Con dos sesiones ya se ve la tendencia.');

    var w = 300, h = 90, pad = 8;
    var vals = datos.map(function (s) { return s.mediaMs; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var rango = Math.max(1, max - min);

    var pts = vals.map(function (v, i) {
      var x = pad + (i * (w - pad * 2)) / (vals.length - 1);
      var y = pad + (1 - (v - min) / rango) * (h - pad * 2);
      return x.toFixed(1) + ',' + y.toFixed(1);
    });

    var cont = crear('div', 'grafico');
    cont.innerHTML =
      '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h + '">' +
      '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#7c5cff" ' +
      'stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>' +
      pts.map(function (p) {
        var xy = p.split(',');
        return '<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="3.5" fill="#7c5cff"/>';
      }).join('') +
      '</svg>' +
      '<div class="grafico-pie"><span>' + seg(max) + '</span><span>' + seg(min) + '</span></div>';
    return cont;
  }

  /* Las 10 sílabas vistas con peor automaticidad: lo que la app va a insistir. */
  function atascadas(estado) {
    var out = [];
    Object.keys(estado.items).forEach(function (id) {
      if (!JL.datos.esTrabada(id)) return;
      var p = JL.modelo.puntuacionItem(estado, id);
      if (p === null) return;
      out.push({ id: id, p: p, vistas: estado.items[id].vistas });
    });
    out.sort(function (a, b) { return a.p - b.p; });
    return out.slice(0, 10);
  }

  function descargar(nombre, texto) {
    try {
      var blob = new Blob([texto], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return true;
    } catch (e) {
      return false;
    }
  }

  function pintar(estado) {
    var cont = document.getElementById('adulto-cuerpo');
    cont.innerHTML = '';

    // --- aviso si el navegador no deja guardar
    if (!JL.storage.persistente) {
      var av = crear('div', 'aviso');
      av.textContent = 'Este navegador no deja guardar el progreso al abrir el ' +
        'fichero directamente. La sesión funciona, pero exporta el progreso antes de cerrar.';
      cont.appendChild(av);
    }

    // --- calibración
    var u = JL.modelo.umbrales(estado);
    var cal = crear('section', 'bloque-adulto');
    cal.appendChild(crear('h3', null, 'Calibración'));
    var tabla = crear('div', 'datos');
    [
      ['Velocidad de base', estado.calibrada ? seg(u.base) : 'sin calibrar (usando ' + seg(u.base) + ')'],
      ['Umbral "fluida"', '≤ ' + seg(u.fluido)],
      ['Umbral "lenta"', '≥ ' + seg(u.lento)],
      ['Ráfaga actual', seg(estado.exposicionRafaga || 2000)],
      ['Sesiones', String((estado.sesiones || []).length)],
      ['Racha', (estado.racha.dias || 0) + (estado.racha.dias === 1 ? ' día' : ' días')]
    ].forEach(function (par) {
      var f = crear('div', 'dato');
      f.appendChild(crear('span', 'dato-k', par[0]));
      f.appendChild(crear('span', 'dato-v', par[1]));
      tabla.appendChild(f);
    });
    cal.appendChild(tabla);
    cal.appendChild(crear('p', 'nota',
      'Los umbrales son relativos a él: se calculan con su mediana en sílabas ' +
      'directas, así que suben solos conforme mejora.'));
    cont.appendChild(cal);

    // --- automaticidad por familia
    var af = crear('section', 'bloque-adulto');
    af.appendChild(crear('h3', null, 'Automaticidad por familia'));
    JL.modelo.resumenFamilias(estado).forEach(function (r) {
      var fam = JL.datos.familia(r.id);
      var fila = crear('div', 'fila-familia fila-familia--compacta');
      fila.appendChild(crear('strong', 'fila-id', r.id));
      var barra = crear('div', 'barra');
      var relleno = crear('div', 'barra-relleno');
      relleno.style.width = r.pct + '%';
      relleno.style.background = 'linear-gradient(90deg,' + fam.color2 + ',' + fam.color + ')';
      barra.appendChild(relleno);
      fila.appendChild(barra);
      fila.appendChild(crear('span', 'fila-pct', r.desbloqueada ? r.pct + '%' : '🔒'));
      af.appendChild(fila);
    });
    cont.appendChild(af);

    // --- tendencia
    var tend = crear('section', 'bloque-adulto');
    tend.appendChild(crear('h3', null, 'Tiempo medio por sesión'));
    tend.appendChild(grafico(estado.sesiones || []));
    cont.appendChild(tend);

    // --- atascadas
    var at = atascadas(estado);
    if (at.length) {
      var sa = crear('section', 'bloque-adulto');
      sa.appendChild(crear('h3', null, 'Donde está insistiendo la app'));
      var chips = crear('div', 'chips');
      at.forEach(function (x) {
        var it = JL.datos.item(x.id) || {};
        var c = crear('span', 'chip', x.id + ' · ' + x.p + '%');
        c.style.background = it.color2 || '#eee';
        c.style.borderColor = it.color || '#ccc';
        chips.appendChild(c);
      });
      sa.appendChild(chips);
      cont.appendChild(sa);
    }

    // --- ajustes
    var aj = crear('section', 'bloque-adulto');
    aj.appendChild(crear('h3', null, 'Ajustes'));

    /* El nombre es opcional y vive sólo en este navegador: no se envía a
       ninguna parte. Se saca aquí para que el juego no lleve el nombre de
       ningún niño escrito en el código. */
    var lNombre = crear('label', 'ajuste ajuste--texto');
    var txtNombre = crear('span', 'ajuste-texto');
    txtNombre.appendChild(crear('span', 'ajuste-titulo', 'Nombre de quien juega'));
    txtNombre.appendChild(crear('span', 'nota', 'Opcional. Sólo se guarda en este dispositivo.'));
    lNombre.appendChild(txtNombre);
    var inpNombre = document.createElement('input');
    inpNombre.type = 'text';
    inpNombre.className = 'campo';
    inpNombre.maxLength = 24;
    inpNombre.placeholder = 'sin nombre';
    inpNombre.value = (estado.perfil && estado.perfil.nombre) || '';
    inpNombre.addEventListener('change', function () {
      estado.perfil.nombre = inpNombre.value.trim().slice(0, 24);
      JL.storage.guardarYa();
    });
    lNombre.appendChild(inpNombre);
    aj.appendChild(lNombre);

    [
      ['mayusculas', 'Mostrar en MAYÚSCULAS', 'En el cole lee minúsculas; por eso es el defecto.'],
      ['pistaColor', 'Pista de color en las trabadas', 'El grupo (br) en un color y la vocal en otro.'],
      ['sonido', 'Sonido', ''],
      ['voz', 'Botón "¿cómo suena?"', 'Si lo usa, esa sílaba cuenta como no automática.']
    ].forEach(function (par) {
      var l = crear('label', 'ajuste');
      var chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = !!estado.ajustes[par[0]];
      chk.addEventListener('change', function () {
        estado.ajustes[par[0]] = chk.checked;
        if (par[0] === 'sonido') JL.audio.activar(chk.checked);
        JL.storage.guardarYa();
      });
      l.appendChild(chk);
      var txt = crear('span', 'ajuste-texto');
      txt.appendChild(crear('span', 'ajuste-titulo', par[1]));
      if (par[2]) txt.appendChild(crear('span', 'nota', par[2]));
      l.appendChild(txt);
      aj.appendChild(l);
    });
    cont.appendChild(aj);

    // --- datos
    var dz = crear('section', 'bloque-adulto');
    dz.appendChild(crear('h3', null, 'Progreso'));
    var acciones = crear('div', 'acciones-adulto');

    var bExp = crear('button', 'btn btn--sec', '⬇️ Exportar');
    bExp.type = 'button';
    bExp.addEventListener('click', function () {
      var fecha = new Date().toISOString().slice(0, 10);
      if (!descargar('trabamonsters-' + fecha + '.json', JL.storage.exportar())) {
        window.prompt('Copia este texto y guárdalo:', JL.storage.exportar());
      }
    });
    acciones.appendChild(bExp);

    var lImp = crear('label', 'btn btn--sec', '⬆️ Importar');
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.style.display = 'none';
    inp.addEventListener('change', function () {
      var file = inp.files && inp.files[0];
      if (!file) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          JL.storage.importar(String(fr.result));
          window.location.reload();
        } catch (err) {
          window.alert('No se ha podido importar: ' + err.message);
        }
      };
      fr.readAsText(file);
    });
    lImp.appendChild(inp);
    acciones.appendChild(lImp);

    var bRes = crear('button', 'btn btn--peligro', '🗑️ Empezar de cero');
    bRes.type = 'button';
    bRes.addEventListener('click', function () {
      if (window.confirm('Se borra todo el progreso. ¿Seguro?')) {
        JL.storage.reset();
        window.location.reload();
      }
    });
    acciones.appendChild(bRes);

    dz.appendChild(acciones);
    cont.appendChild(dz);
  }

  JL.ui = JL.ui || {};
  JL.ui.panelAdulto = { pintar: pintar };

})(window.JL = window.JL || {});

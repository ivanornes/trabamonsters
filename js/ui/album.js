/* Álbum de criaturas. Las que aún no han salido se ven en silueta: da algo
   que perseguir sin decir nunca "esto te falta". */
(function (JL) {
  'use strict';

  function crear(tag, clase, texto) {
    var el = document.createElement(tag);
    if (clase) el.className = clase;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function ficha(estado, famId) {
    var def = JL.datos.criatura(famId);
    var fam = JL.datos.familia(famId);
    var pct = JL.modelo.puntuacionFamilia(estado, famId);
    var fase = JL.datos.faseDe(pct);
    var f = estado.familias[famId] || {};
    var descubierta = !!f.descubierta;

    var card = crear('button', 'carta' + (descubierta ? '' : ' carta--oculta'));
    card.type = 'button';
    card.style.setProperty('--color-fam', fam.color);
    card.style.setProperty('--color-fam2', fam.color2);

    var arte = crear('div', 'carta-arte');
    arte.innerHTML = JL.ui.criatura.svg(def, descubierta ? fase : 0,
      { tamano: 120, silueta: !descubierta });
    card.appendChild(arte);

    card.appendChild(crear('div', 'carta-nombre', descubierta ? def.nombres[fase] : '???'));

    var pie = crear('div', 'carta-familia');
    pie.appendChild(crear('span', null, famId));
    if (descubierta) {
      pie.appendChild(crear('span', 'carta-nivel', 'Nv ' + JL.combate.nivelDe(estado, famId)));
    }
    card.appendChild(pie);

    var barra = crear('div', 'barra barra--mini');
    var relleno = crear('div', 'barra-relleno');
    relleno.style.width = (descubierta ? pct : 0) + '%';
    relleno.style.background = 'linear-gradient(90deg,' + fam.color2 + ',' + fam.color + ')';
    barra.appendChild(relleno);
    card.appendChild(barra);
    card.appendChild(crear('div', 'carta-pct', descubierta ? pct + '%' : ''));

    card.addEventListener('click', function () { detalle(estado, famId); });
    return card;
  }

  /* Detalle: sílaba a sílaba, para ver dónde está el atasco exacto. */
  function detalle(estado, famId) {
    var overlay = document.getElementById('overlay-ficha');
    var def = JL.datos.criatura(famId);
    var fam = JL.datos.familia(famId);
    var pct = JL.modelo.puntuacionFamilia(estado, famId);
    var fase = JL.datos.faseDe(pct);
    var f = estado.familias[famId] || {};

    overlay.innerHTML = '';
    var caja = crear('div', 'ficha');
    caja.style.setProperty('--color-fam', fam.color);

    var cerrar = crear('button', 'ficha-cerrar', '✕');
    cerrar.type = 'button';
    cerrar.addEventListener('click', function () {
      overlay.classList.remove('overlay--visible');
    });
    caja.appendChild(cerrar);

    var arte = crear('div', 'ficha-arte');
    arte.innerHTML = JL.ui.criatura.svg(def, f.descubierta ? fase : 0,
      { tamano: 180, silueta: !f.descubierta });
    caja.appendChild(arte);

    caja.appendChild(crear('h2', 'ficha-nombre', f.descubierta ? def.nombres[fase] : '???'));
    caja.appendChild(crear('p', 'ficha-lema', f.descubierta ? def.lema : 'Todavía no la has encontrado.'));

    if (f.descubierta) {
      // Dos progresiones distintas, y se dicen con todas las letras:
      // automaticidad = cómo lee; nivel = fuerza de combate.
      var st = JL.combate.estadisticas(estado, famId);
      var prog = JL.combate.progresoNivel(estado, famId);

      var stats = crear('div', 'stats');
      [['❤️', 'Vida', st.vidaMax], ['⚔️', 'Ataque', st.ataque], ['🛡️', 'Defensa', st.defensa]]
        .forEach(function (s) {
          var d = crear('div', 'stat');
          d.appendChild(crear('span', 'stat-icono', s[0]));
          d.appendChild(crear('span', 'stat-valor', String(s[2])));
          d.appendChild(crear('span', 'stat-nombre', s[1]));
          stats.appendChild(d);
        });
      caja.appendChild(stats);

      var fx = crear('div', 'fila-familia fila-familia--compacta');
      fx.appendChild(crear('strong', 'fila-id', 'Nv ' + prog.nivel));
      var bx = crear('div', 'barra');
      var rx = crear('div', 'barra-relleno');
      rx.style.width = prog.pct + '%';
      rx.style.background = 'linear-gradient(90deg,#ffe066,#ffa62b)';
      bx.appendChild(rx);
      fx.appendChild(bx);
      fx.appendChild(crear('span', 'fila-pct', prog.xp + '/' + prog.necesaria + ' XP'));
      caja.appendChild(fx);

      if (f.vencidos) {
        caja.appendChild(crear('p', 'nota', '⚔️ ' + f.vencidos + ' rivales vencidos'));
      }

      caja.appendChild(crear('h3', 'ficha-sub', 'Automaticidad'));
      caja.appendChild(crear('div', 'ficha-pct', pct + '%'));
      var lista = crear('div', 'ficha-silabas');
      JL.datos.silabasDe(famId).forEach(function (id) {
        var p = JL.modelo.puntuacionItem(estado, id);
        var fila = crear('div', 'ficha-fila');
        fila.appendChild(crear('span', 'ficha-silaba', id));
        var barra = crear('div', 'barra barra--mini');
        var relleno = crear('div', 'barra-relleno');
        relleno.style.width = (p === null ? 0 : p) + '%';
        relleno.style.background = 'linear-gradient(90deg,' + fam.color2 + ',' + fam.color + ')';
        barra.appendChild(relleno);
        fila.appendChild(barra);
        fila.appendChild(crear('span', 'ficha-valor', p === null ? '—' : p + '%'));
        lista.appendChild(fila);
      });
      caja.appendChild(lista);

      var pal = JL.datos.palabrasDeFamilia(famId).slice(0, 6);
      var chips = crear('div', 'chips');
      pal.forEach(function (w) {
        chips.appendChild(crear('span', 'chip', (w.e ? w.e + ' ' : '') + w.p));
      });
      caja.appendChild(chips);
    }

    overlay.appendChild(caja);
    overlay.classList.add('overlay--visible');
  }

  function pintar(estado) {
    var grid = document.getElementById('album-grid');
    grid.innerHTML = '';
    JL.datos.ORDEN_FAMILIAS.forEach(function (famId) {
      grid.appendChild(ficha(estado, famId));
    });

    var n = JL.datos.ORDEN_FAMILIAS.filter(function (id) {
      return estado.familias[id] && estado.familias[id].descubierta;
    }).length;
    document.getElementById('album-contador').textContent =
      n + ' de ' + JL.datos.ORDEN_FAMILIAS.length;
  }

  JL.ui = JL.ui || {};
  JL.ui.album = { pintar: pintar, detalle: detalle };

})(window.JL = window.JL || {});

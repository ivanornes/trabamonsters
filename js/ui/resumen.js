/* Resumen de la sesión y animación de evolución.

   Se muestra automaticidad y tiempo medio, nunca "sílabas por minuto":
   esa cifra invita a atropellarse, que es justo lo contrario de lo que
   queremos. Las sílabas que costaron se listan sin dramatismo, como lo que
   son: las que saldrán más veces mañana. */
(function (JL) {
  'use strict';

  function seg(ms) { return (ms / 1000).toFixed(1).replace('.', ',') + ' s'; }

  function crear(tag, clase, texto) {
    var el = document.createElement(tag);
    if (clase) el.className = clase;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function cifra(valor, etiqueta, clase) {
    var d = crear('div', 'cifra ' + (clase || ''));
    d.appendChild(crear('div', 'cifra-valor', valor));
    d.appendChild(crear('div', 'cifra-etiqueta', etiqueta));
    return d;
  }

  /* Barra de automaticidad de una familia, con su criatura al lado. */
  function barraFamilia(estado, famId) {
    var pct = JL.modelo.puntuacionFamilia(estado, famId);
    var fam = JL.datos.familia(famId);
    var def = JL.datos.criatura(famId);
    var fase = JL.datos.faseDe(pct);

    var fila = crear('div', 'fila-familia');
    var mini = crear('div', 'fila-criatura');
    mini.innerHTML = JL.ui.criatura.svg(def, fase, { tamano: 56 });
    fila.appendChild(mini);

    var cuerpo = crear('div', 'fila-cuerpo');
    var cab = crear('div', 'fila-cabecera');
    cab.appendChild(crear('strong', null, famId));
    cab.appendChild(crear('span', 'fila-nombre', def.nombres[fase]));
    cab.appendChild(crear('span', 'fila-pct', pct + '%'));
    cuerpo.appendChild(cab);

    var barra = crear('div', 'barra');
    var relleno = crear('div', 'barra-relleno');
    relleno.style.background = 'linear-gradient(90deg,' + fam.color2 + ',' + fam.color + ')';
    relleno.style.width = '0%';
    barra.appendChild(relleno);
    cuerpo.appendChild(barra);
    fila.appendChild(cuerpo);

    // La barra crece al entrar: se ve el progreso, no sólo el número.
    setTimeout(function () { relleno.style.width = pct + '%'; }, 60);
    return fila;
  }

  /* Secuencia de evolución: destello, cambio de criatura, confeti. */
  function animarEvolucion(cambio, alTerminar) {
    var overlay = document.getElementById('overlay-evolucion');
    var def = JL.datos.criatura(cambio.familia);

    overlay.innerHTML = '';
    overlay.classList.add('overlay--visible');

    var caja = crear('div', 'evo');
    caja.appendChild(crear('div', 'evo-titulo', '¡' + def.nombres[cambio.de] + ' está cambiando!'));

    var escena = crear('div', 'evo-escena');
    escena.innerHTML = JL.ui.criatura.svg(def, cambio.de, { tamano: 220 });
    caja.appendChild(escena);

    var pie = crear('div', 'evo-pie', '');
    caja.appendChild(pie);
    overlay.appendChild(caja);

    JL.audio.evolucion();
    escena.classList.add('evo-escena--carga');

    setTimeout(function () {
      JL.anim.destello(1100);
      setTimeout(function () {
        escena.innerHTML = JL.ui.criatura.svg(def, cambio.a, { tamano: 220 });
        escena.classList.remove('evo-escena--carga');
        escena.classList.add('evo-escena--nueva');
        caja.querySelector('.evo-titulo').textContent = '¡Ahora es ' + def.nombres[cambio.a] + '!';
        pie.textContent = def.lema;
        JL.anim.confeti(70);
      }, 220);
    }, 1100);

    setTimeout(function () {
      overlay.classList.remove('overlay--visible');
      if (alTerminar) alTerminar();
    }, 3600);
  }

  function encadenarEvoluciones(lista, alTerminar) {
    var i = 0;
    function paso() {
      if (i >= lista.length) return alTerminar && alTerminar();
      animarEvolucion(lista[i++], paso);
    }
    paso();
  }

  /* sesion: { resultados, palabras, rafaga, evoluciones, nuevaFamilia, racha } */
  function pintar(estado, sesion) {
    var cont = document.getElementById('resumen-cuerpo');
    cont.innerHTML = '';

    var res = sesion.resultados || [];
    var validos = res.filter(function (r) { return r.ok && r.clase !== 'distraccion'; });
    var fluidas = res.filter(function (r) { return r.clase === 'fluida'; });
    var lentas = res.filter(function (r) { return r.clase === 'lenta' || r.clase === 'fallo'; });
    var media = validos.length
      ? validos.reduce(function (a, r) { return a + r.ms; }, 0) / validos.length
      : 0;

    // --- cifras principales
    var cifras = crear('div', 'cifras');
    cifras.appendChild(cifra(String(res.length), 'sílabas'));
    cifras.appendChild(cifra(media ? seg(media) : '—', 'media', 'cifra--media'));
    cifras.appendChild(cifra(String(fluidas.length), 'fluidas ⚡', 'cifra--bien'));
    if (sesion.racha > 1) cifras.appendChild(cifra(sesion.racha + ' días', 'racha 🔥', 'cifra--racha'));
    cont.appendChild(cifras);

    // --- las que costaron, sin dramatismo
    var unicasLentas = [];
    lentas.forEach(function (r) {
      if (unicasLentas.indexOf(r.id) < 0) unicasLentas.push(r.id);
    });
    if (unicasLentas.length) {
      var caja = crear('div', 'bloque-resumen');
      caja.appendChild(crear('h3', null, '🐢 Estas costaron un poco'));
      caja.appendChild(crear('p', 'nota', 'Saldrán más veces la próxima vez. Nada más.'));
      var chips = crear('div', 'chips');
      unicasLentas.slice(0, 10).forEach(function (id) {
        var it = JL.datos.item(id) || {};
        var c = crear('span', 'chip', id);
        c.style.background = it.color2 || '#eee';
        c.style.borderColor = it.color || '#ccc';
        chips.appendChild(c);
      });
      caja.appendChild(chips);
      cont.appendChild(caja);
    }

    // --- combate
    if (sesion.combate) {
      var cb = sesion.combate;
      var def = JL.datos.criatura(cb.familia);
      var prog = JL.combate.progresoNivel(estado, cb.familia);
      var st = JL.combate.estadisticas(estado, cb.familia);

      var cc = crear('div', 'bloque-resumen' + (cb.subidos.length ? ' bloque-nivel' : ''));
      cc.appendChild(crear('h3', null, cb.perdida ? '🛡️ Combate' : '⚔️ Combate'));

      var linea = crear('div', 'combate-linea');
      linea.appendChild(crear('span', 'combate-dato',
        cb.vencidos + (cb.vencidos === 1 ? ' rival vencido' : ' rivales vencidos')));
      linea.appendChild(crear('span', 'combate-dato combate-dato--xp', '+' + cb.xp + ' XP'));
      cc.appendChild(linea);

      if (cb.derrotas) {
        var nombreHeroe = def.nombres[JL.datos.faseDe(JL.modelo.puntuacionFamilia(estado, cb.familia))];
        cc.appendChild(crear('p', 'nota',
          cb.derrotas === 1
            ? nombreHeroe + ' cayó una vez, se levantó y siguió. La experiencia se queda.'
            : nombreHeroe + ' cayó ' + cb.derrotas + ' veces y se levantó otras tantas.'));
      }

      if (cb.subidos.length) {
        var sn = crear('div', 'subida-nivel');
        sn.textContent = '⬆️ ¡Nivel ' + cb.nivel + '!';
        cc.appendChild(sn);
      }

      // Barra de XP hacia el siguiente nivel
      var fx = crear('div', 'fila-familia fila-familia--compacta');
      fx.appendChild(crear('strong', 'fila-id', 'Nv ' + prog.nivel));
      var bx = crear('div', 'barra');
      var rx = crear('div', 'barra-relleno');
      rx.style.width = '0%';
      rx.style.background = 'linear-gradient(90deg,#ffe066,#ffa62b)';
      bx.appendChild(rx);
      fx.appendChild(bx);
      fx.appendChild(crear('span', 'fila-pct', prog.xp + '/' + prog.necesaria));
      cc.appendChild(fx);
      setTimeout(function () { rx.style.width = prog.pct + '%'; }, 80);

      var stats = crear('div', 'stats');
      [['❤️', 'Vida', st.vidaMax], ['⚔️', 'Ataque', st.ataque], ['🛡️', 'Defensa', st.defensa]]
        .forEach(function (s) {
          var d = crear('div', 'stat');
          d.appendChild(crear('span', 'stat-icono', s[0]));
          d.appendChild(crear('span', 'stat-valor', String(s[2])));
          d.appendChild(crear('span', 'stat-nombre', s[1]));
          stats.appendChild(d);
        });
      cc.appendChild(stats);
      cont.appendChild(cc);
    }

    // --- ráfaga
    if (sesion.rafaga && sesion.rafaga.zona) {
      var z = sesion.rafaga.zona;
      var cr = crear('div', 'bloque-resumen');
      cr.appendChild(crear('h3', null, '⚡ Tu zona de ráfaga'));
      cr.appendChild(crear('p', 'zona-rafaga',
        seg(z.min) + ' – ' + seg(z.max)));
      cr.appendChild(crear('p', 'nota', 'Aquí es donde estás entrenando ahora mismo.'));
      cont.appendChild(cr);
    }

    // --- automaticidad por familia
    var fams = JL.modelo.familiasDesbloqueadas(estado);
    if (fams.length) {
      var cf = crear('div', 'bloque-resumen');
      cf.appendChild(crear('h3', null, 'Tus criaturas'));
      fams.forEach(function (f) { cf.appendChild(barraFamilia(estado, f)); });
      cont.appendChild(cf);
    }

    // --- familia nueva
    if (sesion.nuevaFamilia) {
      var def = JL.datos.criatura(sesion.nuevaFamilia);
      var cn = crear('div', 'bloque-resumen bloque-nuevo');
      cn.appendChild(crear('h3', null, '🥚 ¡Criatura nueva!'));
      var m = crear('div', 'nuevo-criatura');
      m.innerHTML = JL.ui.criatura.svg(def, 0, { tamano: 110 });
      cn.appendChild(m);
      cn.appendChild(crear('p', null, def.nombres[0] + ' quiere jugar con las sílabas ' +
        JL.datos.silabasDe(sesion.nuevaFamilia).join(', ')));
      cont.appendChild(cn);
    }

    var titulo = document.getElementById('resumen-titulo');
    titulo.textContent = fluidas.length >= res.length / 2
      ? '¡Buena sesión! 🎉'
      : '¡Sesión terminada! 👏';

    JL.audio.fanfarria();
    JL.anim.confeti(50);

    // Las evoluciones se guardan para el final: son el cierre, no un corte.
    if (sesion.evoluciones && sesion.evoluciones.length) {
      setTimeout(function () { encadenarEvoluciones(sesion.evoluciones); }, 700);
    }
  }

  JL.ui = JL.ui || {};
  JL.ui.resumen = { pintar: pintar, animarEvolucion: animarEvolucion };

})(window.JL = window.JL || {});

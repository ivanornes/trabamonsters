/* Arranque y bucle diario.

   Se pulsa JUGAR una vez y no vuelve a decidir nada: los cuatro bloques se
   encadenan solos y la sesión termina. No hay "una más": terminar a tiempo es
   parte del diseño. */
(function (JL) {
  'use strict';

  var MIN = 60000;
  // Sólo para pruebas: JL.app.factorTiempo(0.05) hace la sesión entera en 15 s.
  var FACTOR = 1;
  var estado = null;
  var sesion = null;
  var controlador = null;

  // ------------------------------------------------------------- bloques

  function bloquesDe(estado) {
    var m = MIN * FACTOR;
    // Primera vez: se dedica más rato a directas para fijar su línea base.
    if (!estado.calibrada) {
      return [
        { modo: 'silabas', etiqueta: 'Calentamiento', ms: 1.5 * m, pool: JL.datos.CALIBRACION },
        { modo: 'silabas', etiqueta: 'Sílabas nuevas', ms: 1.5 * m, pool: JL.modelo.poolTrabajo(estado) },
        { modo: 'palabras', etiqueta: 'Palabras', ms: 1 * m }
      ];
    }
    return [
      { modo: 'silabas', etiqueta: 'Calentamiento', ms: 1 * m, pool: JL.modelo.poolCalentamiento(estado) },
      // La zona de trabajo es el combate: es el bloque más largo y el que más
      // cuesta, así que es donde hace falta la motivación.
      { modo: 'combate', etiqueta: 'Combate', ms: 2 * m, pool: JL.modelo.poolTrabajo(estado) },
      { modo: 'palabras', etiqueta: 'Palabras', ms: 1 * m },
      { modo: 'rafaga', etiqueta: 'Reto ráfaga', ms: 1 * m }
    ];
  }

  // -------------------------------------------------------- barra de sesión

  function pintarBarra(bloques, indice, fraccion) {
    var barra = document.getElementById('barra-sesion');
    if (!barra.childNodes.length || barra.dataset.n !== String(bloques.length)) {
      barra.innerHTML = '';
      barra.dataset.n = String(bloques.length);
      bloques.forEach(function (b) {
        var seg = document.createElement('div');
        seg.className = 'seg';
        seg.style.flexGrow = String(b.ms / MIN);
        seg.innerHTML = '<div class="seg-relleno"></div>';
        barra.appendChild(seg);
      });
    }
    Array.prototype.forEach.call(barra.children, function (seg, i) {
      var r = seg.firstChild;
      r.style.width = i < indice ? '100%' : (i === indice ? (fraccion * 100) + '%' : '0%');
    });
  }

  // ---------------------------------------------------------- la sesión

  function empezarSesion() {
    JL.audio.despertar();
    var bloques = bloquesDe(estado);
    sesion = {
      inicio: Date.now(),
      bloques: bloques,
      indice: 0,
      resultados: [],
      rafaga: null,
      combate: null,
      mejorCombo: 0,
      racha: JL.storage.marcarDia(estado)
    };
    JL.storage.guardar(estado);
    JL.ui.router.ir('juego');
    siguienteBloque();
  }

  function siguienteBloque() {
    if (!sesion) return;
    if (sesion.indice >= sesion.bloques.length) return terminarSesion();

    var b = sesion.bloques[sesion.indice];
    pintarBarra(sesion.bloques, sesion.indice, 0);
    JL.audio.whoosh();

    var cfg = {
      estado: estado,
      duracionMs: b.ms,
      pool: b.pool,
      etiqueta: b.etiqueta,
      onProgreso: function (f) { pintarBarra(sesion.bloques, sesion.indice, f); },
      onFin: function (r) {
        sesion.resultados = sesion.resultados.concat(r.resultados || []);
        if (r.mejorCombo) sesion.mejorCombo = Math.max(sesion.mejorCombo, r.mejorCombo);
        if (b.modo === 'rafaga') sesion.rafaga = r;
        if (r.combate) sesion.combate = r.combate;
        sesion.indice++;
        setTimeout(siguienteBloque, 450);
      }
    };

    controlador = JL.modos[b.modo].iniciar(cfg);
  }

  function terminarSesion() {
    var res = sesion;
    controlador = null;

    // Los cambios de estado se hacen aquí, al cerrar: las evoluciones son el
    // cierre de la sesión, no una interrupción a media partida.
    var evoluciones = JL.modelo.revisarFases(estado);
    var nueva = JL.modelo.revisarDesbloqueos(estado);
    if (nueva) JL.modelo.estadoFamilia(estado, nueva).descubierta = true;

    var validos = res.resultados.filter(function (r) { return r.ok && r.clase !== 'distraccion'; });
    var media = validos.length
      ? validos.reduce(function (a, r) { return a + r.ms; }, 0) / validos.length
      : null;

    estado.sesiones.push({
      fecha: new Date().toISOString(),
      n: res.resultados.length,
      mediaMs: media,
      fluidas: res.resultados.filter(function (r) { return r.clase === 'fluida'; }).length,
      duracionMs: Date.now() - res.inicio
    });
    if (estado.sesiones.length > 200) estado.sesiones.shift();
    JL.storage.guardarYa();

    res.evoluciones = evoluciones;
    res.nuevaFamilia = nueva;
    sesion = null;

    JL.ui.router.ir('resumen', res);
  }

  function abortarSesion() {
    if (controlador) { controlador.abortar(); controlador = null; }
    sesion = null;
    JL.storage.guardarYa();
    JL.ui.router.ir('inicio');
  }

  // ---------------------------------------------------------- pantallas

  function pintarInicio() {
    var host = document.getElementById('inicio-criatura');
    if (!host.childNodes.length) {
      host.innerHTML = JL.ui.criatura.svg(JL.datos.GUIA, 1, { tamano: 220 });
      host.classList.add('criatura', 'criatura--viva');
    }

    var r = estado.racha || {};
    var racha = document.getElementById('inicio-racha');
    racha.textContent = r.dias > 1 ? '🔥 ' + r.dias + ' días seguidos' : '';

    var fams = JL.modelo.familiasDesbloqueadas(estado);
    var actual = fams[fams.length - 1];
    var pct = JL.modelo.puntuacionFamilia(estado, actual);
    var nombre = (estado.perfil && estado.perfil.nombre) || '';
    var sub = document.getElementById('inicio-sub');
    sub.textContent = estado.calibrada
      ? 'Hoy toca ' + JL.datos.silabasDe(actual).join(' · ') + '   (' + pct + '%)'
      : (nombre ? '¡Hola, ' + nombre + '! Vamos a ver a qué velocidad lees.'
        : '¡Vamos a ver a qué velocidad lees!');
  }

  // ------------------------------------------------------- candado adulto

  function montarCandado() {
    var btn = document.getElementById('btn-adulto');
    var timer = null;
    var progreso = btn.querySelector('.candado-progreso');

    function empezar(ev) {
      ev.preventDefault();
      btn.classList.add('candado--pulsado');
      if (progreso) progreso.style.transition = 'transform 2s linear';
      if (progreso) progreso.style.transform = 'scaleX(1)';
      timer = setTimeout(function () {
        soltar();
        JL.ui.router.ir('adulto');
      }, 2000);
    }
    function soltar() {
      btn.classList.remove('candado--pulsado');
      if (progreso) { progreso.style.transition = 'transform .2s'; progreso.style.transform = 'scaleX(0)'; }
      if (timer) { clearTimeout(timer); timer = null; }
    }

    btn.addEventListener('pointerdown', empezar);
    btn.addEventListener('pointerup', soltar);
    btn.addEventListener('pointerleave', soltar);
    btn.addEventListener('pointercancel', soltar);
  }

  // --------------------------------------------------------------- inicio

  function arrancar() {
    estado = JL.storage.cargar();
    JL.audio.activar(estado.ajustes.sonido);
    JL.modelo.familiasDesbloqueadas(estado);   // asegura que hay una desbloqueada

    JL.ui.router.al('inicio', pintarInicio);
    JL.ui.router.al('album', function () { JL.ui.album.pintar(estado); });
    JL.ui.router.al('adulto', function () { JL.ui.panelAdulto.pintar(estado); });
    JL.ui.router.al('resumen', function (datos) { JL.ui.resumen.pintar(estado, datos); });

    document.getElementById('btn-jugar').addEventListener('click', empezarSesion);
    document.getElementById('btn-album').addEventListener('click', function () {
      JL.ui.router.ir('album');
    });
    document.getElementById('btn-salir').addEventListener('click', abortarSesion);
    document.getElementById('btn-resumen-album').addEventListener('click', function () {
      JL.ui.router.ir('album');
    });
    document.getElementById('btn-resumen-inicio').addEventListener('click', function () {
      JL.ui.router.ir('inicio');
    });
    document.getElementById('btn-album-volver').addEventListener('click', function () {
      JL.ui.router.ir('inicio');
    });
    document.getElementById('btn-adulto-volver').addEventListener('click', function () {
      JL.ui.router.ir('inicio');
    });
    document.getElementById('overlay-ficha').addEventListener('click', function (ev) {
      if (ev.target.id === 'overlay-ficha') {
        ev.currentTarget.classList.remove('overlay--visible');
      }
    });

    montarCandado();
    JL.ui.router.ir('inicio');
  }

  JL.app = {
    arrancar: arrancar,
    estado: function () { return estado; },
    empezarSesion: empezarSesion,
    /* Acorta la sesión para poder probarla entera de una sentada. */
    factorTiempo: function (f) { FACTOR = f; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }

})(window.JL = window.JL || {});

/* Modo 3: de sílaba a palabra.

   Aparece `pla`, se encoge, y la palabra crece a su alrededor: `plato`, con la
   trabada resaltada. Es el paso donde el entrenamiento se transfiere a la
   lectura de verdad, así que aquí la sílaba entrenada es siempre visible
   dentro de la palabra. */
(function (JL) {
  'use strict';

  JL.modos = JL.modos || {};

  function barajar(xs) {
    var a = xs.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* cfg: { estado, duracionMs, onProgreso, onFin } */
  function iniciar(cfg) {
    var estado = cfg.estado;
    var util = JL.modos.util;
    var e = util.elementos();

    var cola = barajar(JL.modelo.poolPalabras(estado));
    var resultados = [];
    var actual = null, tarjetaEl = null;
    var t0 = 0, listo = false, terminado = false, usoPista = false;
    var fin = Date.now() + cfg.duracionMs;
    var desconectar = null, tickId = null, timers = [], cancelarTransicion = null;

    if (e.etiqueta) e.etiqueta.textContent = 'Palabras';

    function programar(fn, ms) {
      var id = setTimeout(fn, ms);
      timers.push(id);
      return id;
    }

    function siguiente() {
      if (terminado) return;
      if (Date.now() >= fin) return terminar();
      if (!cola.length) cola = barajar(JL.modelo.poolPalabras(estado));
      if (!cola.length) return terminar();

      actual = cola.shift();
      usoPista = false;
      listo = false;
      util.pintarMini(estado, actual.familia);

      // La sílaba primero, sola; luego se transforma en la palabra.
      if (cancelarTransicion) cancelarTransicion();
      cancelarTransicion = JL.ui.tarjeta.silabaAPalabra(e.host, actual, estado.ajustes, function (nodo) {
        if (terminado) return;
        tarjetaEl = nodo;
        t0 = performance.now();
        listo = true;
      });
    }

    function responder(ok) {
      if (!listo || terminado) return;
      listo = false;

      var ms = performance.now() - t0;
      if (usoPista) ms = Math.max(ms, JL.modelo.umbralPalabra(estado, actual).lento);

      var res = JL.modelo.registrarPalabra(estado, actual, ms, ok);
      resultados.push(res);
      util.feedback(res, tarjetaEl, 0);
      if (tarjetaEl) tarjetaEl.classList.add('tarjeta--sale');
      JL.storage.guardar(estado);

      programar(siguiente, res.clase === 'fluida' ? 260 : 380);
    }

    function pista() {
      if (!actual || terminado) return;
      usoPista = true;
      JL.audio.hablar(actual.p);
      if (tarjetaEl) tarjetaEl.classList.add('tarjeta--pista');
    }

    function terminar() {
      if (terminado) return;
      terminado = true;
      if (desconectar) desconectar();
      if (tickId) clearInterval(tickId);
      timers.forEach(clearTimeout);
      if (cancelarTransicion) cancelarTransicion();
      JL.ui.tarjeta.vaciar(e.host);
      JL.audio.campana();
      if (cfg.onFin) cfg.onFin({ resultados: resultados, palabras: true });
    }

    desconectar = util.conectar({
      avanzar: function () { responder(true); },
      fallo: function () { responder(false); },
      voz: pista
    });

    tickId = setInterval(function () {
      if (terminado) return;
      var restante = Math.max(0, fin - Date.now());
      if (cfg.onProgreso) cfg.onProgreso(1 - restante / cfg.duracionMs);
      if (restante <= 0) terminar();
    }, 200);

    siguiente();

    return { abortar: terminar };
  }

  JL.modos.palabras = { iniciar: iniciar };

})(window.JL = window.JL || {});

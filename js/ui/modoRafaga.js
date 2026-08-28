/* Modo 4: ráfaga. La sílaba se ve durante un tiempo limitado y desaparece.

   La clave está en la escalera del modelo: el tiempo baja sólo tras tres
   aciertos seguidos y sube en cuanto falla uno. La app busca sola su zona
   (1,2-1,3 s o donde esté) en vez de empujarle a ir más rápido. */
(function (JL) {
  'use strict';

  JL.modos = JL.modos || {};

  var GRACIA_MS = 900;   // margen tras desaparecer, por si la dice justo después

  /* cfg: { estado, duracionMs, onProgreso, onFin } */
  function iniciar(cfg) {
    var estado = cfg.estado;
    var util = JL.modos.util;
    var e = util.elementos();

    var escalera = JL.modelo.crearEscalera(estado);
    var selector = JL.modelo.crearSelector(estado, { pool: JL.modelo.poolTrabajo(estado) });
    var resultados = [];
    var actual = null, tarjetaEl = null;
    var t0 = 0, listo = false, terminado = false;
    var dentroDePlazo = false;
    var fin = Date.now() + cfg.duracionMs;
    var desconectar = null, tickId = null, timers = [];
    var timersCarta = [];
    var combo = 0, mejorCombo = 0;

    if (e.etiqueta) e.etiqueta.textContent = 'Reto ráfaga';
    e.zona.classList.add('zona--rafaga');

    function programar(fn, ms) {
      var id = setTimeout(fn, ms);
      timers.push(id);
      return id;
    }

    /* Los plazos son de UNA sílaba concreta. Si no se cancelan al responder,
       el "se acabó el tiempo" de la anterior le cae encima a la siguiente y la
       da por fallada sin que le haya dado tiempo ni a aparecer. */
    function programarCarta(fn, ms) {
      var id = setTimeout(fn, ms);
      timersCarta.push(id);
      return id;
    }

    function cancelarCarta() {
      timersCarta.forEach(clearTimeout);
      timersCarta = [];
    }

    function siguiente() {
      if (terminado) return;
      cancelarCarta();
      if (Date.now() >= fin) return terminar();

      actual = selector.siguiente();
      if (!actual) return terminar();

      var exp = escalera.exposicion();
      tarjetaEl = JL.ui.tarjeta.silaba(e.host, actual, estado.ajustes);
      tarjetaEl.classList.add('tarjeta--rafaga');

      // Aro que se vacía: se ve cuánto queda sin necesidad de leer un número.
      var aro = document.createElement('div');
      aro.className = 'aro-tiempo';
      aro.style.setProperty('--dur', exp + 'ms');
      tarjetaEl.appendChild(aro);

      var it = JL.datos.item(actual);
      util.pintarMini(estado, it ? it.familia : null);

      listo = false;
      dentroDePlazo = true;

      programarCarta(function () {
        if (terminado) return;
        t0 = performance.now();
        listo = true;
      }, 120);

      // Se acaba el plazo: la sílaba se va, pero se sigue aceptando la respuesta.
      programarCarta(function () {
        if (terminado || !listo) return;
        dentroDePlazo = false;
        if (tarjetaEl) tarjetaEl.classList.add('tarjeta--esfuma');
      }, 120 + exp);

      // Ni con el margen: se anota como lenta y la escalera afloja.
      programarCarta(function () {
        if (terminado || !listo) return;
        responder(true, true);
      }, 120 + exp + GRACIA_MS);
    }

    function responder(ok, seEscapo) {
      if (!listo || terminado) return;
      listo = false;
      cancelarCarta();

      var ms = performance.now() - t0;
      var aTiempo = ok && dentroDePlazo && !seEscapo;

      var res = JL.modelo.registrar(estado, actual, ms, ok);
      res.aTiempo = aTiempo;
      resultados.push(res);

      var expNueva = escalera.registrar(aTiempo);

      if (aTiempo) {
        combo++;
        mejorCombo = Math.max(mejorCombo, combo);
      } else {
        combo = 0;
      }
      util.pintarCombo(combo);

      if (seEscapo) {
        var c = JL.anim.centroDe(tarjetaEl || e.host);
        JL.anim.flotante('la siguiente 💪', c.x, c.y - 40, 'flotante--lento');
        JL.audio.suave();
      } else {
        util.feedback(res, tarjetaEl, combo);
      }

      pintarExposicion(expNueva);
      if (tarjetaEl) tarjetaEl.classList.add('tarjeta--sale');
      JL.storage.guardar(estado);

      programar(siguiente, 300);
    }

    function pintarExposicion(ms) {
      if (!e.etiqueta) return;
      e.etiqueta.textContent = 'Reto ráfaga · ' + (ms / 1000).toFixed(1).replace('.', ',') + ' s';
    }

    function terminar() {
      if (terminado) return;
      terminado = true;
      if (desconectar) desconectar();
      if (tickId) clearInterval(tickId);
      timers.forEach(clearTimeout);
      cancelarCarta();
      e.zona.classList.remove('zona--rafaga');
      util.pintarCombo(0);
      JL.ui.tarjeta.vaciar(e.host);
      JL.audio.campana();
      if (cfg.onFin) {
        cfg.onFin({
          resultados: resultados,
          mejorCombo: mejorCombo,
          zona: escalera.zona(),
          exposicion: escalera.exposicion()
        });
      }
    }

    desconectar = util.conectar({
      avanzar: function () { responder(true, false); },
      fallo: function () { responder(false, false); },
      voz: function () { if (actual) JL.audio.hablar(actual); }
    });

    tickId = setInterval(function () {
      if (terminado) return;
      var restante = Math.max(0, fin - Date.now());
      if (cfg.onProgreso) cfg.onProgreso(1 - restante / cfg.duracionMs);
      if (restante <= 0) terminar();
    }, 200);

    pintarExposicion(escalera.exposicion());
    siguiente();

    return { abortar: terminar };
  }

  JL.modos.rafaga = { iniciar: iniciar };

})(window.JL = window.JL || {});

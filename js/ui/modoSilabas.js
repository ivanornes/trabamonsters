/* Modo 1: sílabas rápidas. Es el corazón del juego.

   Aparece una sílaba, se lee en voz alta y se toca la pantalla. La app mide
   el tiempo entre el momento en que la sílaba termina de aparecer y el toque.
   Un adulto, si está delante, puede marcar "le costó" con el botón de abajo;
   si no hay nadie, el tiempo solo ya dice bastante.

   Aquí vive también `JL.modos.util`, que reutilizan los otros dos modos. */
(function (JL) {
  'use strict';

  JL.modos = JL.modos || {};

  // ------------------------------------------------------------------ util

  var MENSAJES = {
    fluida: ['⚡ ¡fluida!', '⚡ ¡ya sale sola!', '⚡ ¡clac!', '⚡ ¡sin pensar!'],
    media: ['👍', '👌', '✔️'],
    lenta: ['🐢 esa costó', '🐢 volverá', '🐢 poco a poco'],
    fallo: ['la repasamos', 'volverá pronto', 'sin problema'],
    distraccion: ['aquí estamos 👋']
  };

  function alAzar(lista) { return lista[Math.floor(Math.random() * lista.length)]; }

  var util = {
    elementos: function () {
      return {
        zona: document.getElementById('zona-juego'),
        host: document.getElementById('tarjeta-host'),
        btnFallo: document.getElementById('btn-fallo'),
        btnVoz: document.getElementById('btn-voz'),
        combo: document.getElementById('combo'),
        mini: document.getElementById('mini-criatura'),
        etiqueta: document.getElementById('etiqueta-bloque')
      };
    },

    /* Recompensa inmediata: partículas, texto y sonido. La respuesta lenta
       también recibe algo: informa, no castiga. */
    feedback: function (res, tarjetaEl, combo) {
      var e = util.elementos();
      var it = JL.datos.item(res.id) || {};
      var c = JL.anim.centroDe(tarjetaEl || e.host);

      if (res.clase === 'fluida') {
        JL.anim.particulas(c.x, c.y, [it.color, it.color2, '#ffd166', '#fff'], 22);
        JL.anim.onda(c.x, c.y, it.color);
        JL.anim.flotante(alAzar(MENSAJES.fluida), c.x, c.y - 40, 'flotante--bien');
        JL.audio.acierto(combo);
        if (e.mini) JL.anim.latir(e.mini);
      } else if (res.clase === 'media') {
        JL.anim.particulas(c.x, c.y, [it.color, it.color2], 10);
        JL.anim.flotante(alAzar(MENSAJES.media), c.x, c.y - 40, 'flotante--ok');
        JL.audio.pop();
      } else if (res.clase === 'lenta' || res.clase === 'distraccion') {
        JL.anim.flotante(alAzar(MENSAJES[res.clase]), c.x, c.y - 40, 'flotante--lento');
        JL.audio.suave();
      } else {
        JL.anim.flotante(alAzar(MENSAJES.fallo), c.x, c.y - 40, 'flotante--lento');
        JL.audio.marcaFallo();
      }
    },

    /* El contador de combo sólo aparece a partir de 3 seguidas fluidas. */
    pintarCombo: function (n) {
      var e = util.elementos();
      if (!e.combo) return;
      if (n < 3) {
        e.combo.classList.remove('combo--visible');
        e.combo.textContent = '';
        return;
      }
      e.combo.textContent = '🔥 ' + n;
      e.combo.classList.add('combo--visible');
      e.combo.style.setProperty('--escala', Math.min(1 + n * 0.05, 1.6));
      JL.anim.latir(e.combo);
    },

    /* Criatura pequeña de la esquina: la de la familia que se está entrenando. */
    pintarMini: function (estado, famId) {
      var e = util.elementos();
      if (!e.mini) return;
      var def = famId ? JL.datos.criatura(famId) : JL.datos.GUIA;
      if (!def) def = JL.datos.GUIA;
      var fase = famId ? JL.datos.faseDe(JL.modelo.puntuacionFamilia(estado, famId)) : 1;
      if (e.mini.dataset.clave === (famId || 'guia') + fase) return;
      e.mini.dataset.clave = (famId || 'guia') + fase;
      e.mini.innerHTML = JL.ui.criatura.svg(def, fase, { tamano: 96 });
    },

    /* Conecta toque, teclado y botones. Devuelve la función para desconectar. */
    conectar: function (handlers) {
      var e = util.elementos();

      function alTocar(ev) {
        if (ev.target.closest && ev.target.closest('button')) return;
        ev.preventDefault();
        JL.audio.despertar();
        handlers.avanzar();
      }
      function alTecla(ev) {
        if (ev.key === ' ' || ev.key === 'Enter') {
          ev.preventDefault();
          handlers.avanzar();
        } else if (ev.key === 'x' || ev.key === 'X' || ev.key === 'ArrowLeft') {
          ev.preventDefault();
          if (handlers.fallo) handlers.fallo();
        }
      }
      function alFallo(ev) { ev.preventDefault(); if (handlers.fallo) handlers.fallo(); }
      function alVoz(ev) { ev.preventDefault(); if (handlers.voz) handlers.voz(); }

      e.zona.addEventListener('pointerdown', alTocar);
      document.addEventListener('keydown', alTecla);
      if (e.btnFallo) e.btnFallo.addEventListener('click', alFallo);
      if (e.btnVoz) e.btnVoz.addEventListener('click', alVoz);

      return function desconectar() {
        e.zona.removeEventListener('pointerdown', alTocar);
        document.removeEventListener('keydown', alTecla);
        if (e.btnFallo) e.btnFallo.removeEventListener('click', alFallo);
        if (e.btnVoz) e.btnVoz.removeEventListener('click', alVoz);
      };
    }
  };

  JL.modos.util = util;

  // --------------------------------------------------------------- el modo

  /* cfg: { estado, duracionMs, pool, etiqueta, onProgreso, onFin } */
  function iniciar(cfg) {
    var estado = cfg.estado;
    var e = util.elementos();
    var selector = JL.modelo.crearSelector(estado, { pool: cfg.pool });
    var resultados = [];
    var combo = 0, mejorCombo = 0;
    var actual = null, tarjetaEl = null;
    var t0 = 0, listo = false, terminado = false, usoPista = false;
    var fin = Date.now() + cfg.duracionMs;
    var desconectar = null;
    var tickId = null;

    if (e.etiqueta) e.etiqueta.textContent = cfg.etiqueta || '';

    function siguiente() {
      if (terminado) return;
      if (Date.now() >= fin) return terminar();

      actual = selector.siguiente();
      if (!actual) return terminar();

      usoPista = false;
      tarjetaEl = JL.ui.tarjeta.silaba(e.host, actual, estado.ajustes);
      var it = JL.datos.item(actual);
      util.pintarMini(estado, it ? it.familia : null);

      listo = false;
      // El cronómetro no arranca hasta que la sílaba está del todo visible:
      // no se le cobra el tiempo de la animación.
      setTimeout(function () {
        if (terminado) return;
        t0 = performance.now();
        listo = true;
      }, 170);
    }

    function responder(ok) {
      if (!listo || terminado) return;
      listo = false;

      var ms = performance.now() - t0;
      // Si ha pedido oír la sílaba, no ha sido automática: se puntúa como lenta
      // aunque haya tocado rápido después de oírla.
      if (usoPista) ms = Math.max(ms, JL.modelo.umbrales(estado).lento);

      var res = JL.modelo.registrar(estado, actual, ms, ok);
      res.pista = usoPista;
      resultados.push(res);

      if (res.clase === 'fluida') {
        combo++;
        mejorCombo = Math.max(mejorCombo, combo);
      } else {
        combo = 0;
      }
      util.pintarCombo(combo);
      util.feedback(res, tarjetaEl, combo);

      if (tarjetaEl) tarjetaEl.classList.add('tarjeta--sale');
      JL.storage.guardar(estado);

      setTimeout(siguiente, res.clase === 'fluida' ? 200 : 340);
    }

    function pista() {
      if (!actual || terminado) return;
      usoPista = true;
      JL.audio.hablar(JL.ui.tarjeta.paraVoz(actual));
      if (tarjetaEl) tarjetaEl.classList.add('tarjeta--pista');
    }

    function terminar() {
      if (terminado) return;
      terminado = true;
      if (desconectar) desconectar();
      if (tickId) clearInterval(tickId);
      util.pintarCombo(0);
      JL.ui.tarjeta.vaciar(e.host);
      JL.audio.campana();
      if (cfg.onFin) cfg.onFin({ resultados: resultados, mejorCombo: mejorCombo });
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

  JL.modos.silabas = { iniciar: iniciar };

})(window.JL = window.JL || {});

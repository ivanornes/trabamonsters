/* Modo combate: la zona de trabajo, pero como una batalla.

   Cada sílaba leída es un ataque. Cuanto más fluida sale, más daño hace, y
   encadenar fluidas da golpes críticos.

   El rival ataca a su propio ritmo, con su reloj: no espera turnos. Se ve venir
   en una barra de carga bajo su vida, así que nunca es una sorpresa. Como eso
   mete presión de tiempo, la velocidad de lectura tiene también premio
   defensivo: cada sílaba fluida FRENA esa carga. Leer despacio no acelera nada,
   simplemente no frena.

   El reloj del rival se para durante las animaciones (golpes, KO, revancha):
   nadie recibe un ataque mientras la pantalla está ocupada con otra cosa.

   Si se queda sin vida pierde el combate: el monstruo se levanta, sale un rival
   nuevo y se sigue leyendo. La automaticidad no se toca nunca. */
(function (JL) {
  'use strict';

  JL.modos = JL.modos || {};

  var TIC_MS = 80;

  function crear(tag, clase, texto) {
    var el = document.createElement(tag);
    if (clase) el.className = clase;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function colorVida(pct) {
    if (pct > 55) return ['#7bed9f', '#29d398'];
    if (pct > 25) return ['#ffe066', '#ffa62b'];
    return ['#ffb3b3', '#ff5e5e'];
  }

  /* Panel de un luchador: nombre, nivel, barra de vida y su criatura. */
  function panel(clase) {
    var raiz = crear('div', 'luchador ' + clase);

    var datos = crear('div', 'luchador-datos');
    var cab = crear('div', 'luchador-cab');
    var nombre = crear('span', 'luchador-nombre');
    var nivel = crear('span', 'luchador-nivel');
    cab.appendChild(nombre);
    cab.appendChild(nivel);

    var barra = crear('div', 'barra barra--vida');
    var relleno = crear('div', 'barra-relleno');
    barra.appendChild(relleno);

    var vida = crear('span', 'luchador-vida');

    datos.appendChild(cab);
    datos.appendChild(barra);
    datos.appendChild(vida);

    var arte = crear('div', 'luchador-arte criatura criatura--viva');

    raiz.appendChild(datos);
    raiz.appendChild(arte);

    return {
      raiz: raiz, arte: arte, datos: datos, relleno: relleno,
      pintar: function (l) {
        nombre.textContent = l.nombre;
        nivel.textContent = 'Nv ' + l.nivel;
        vida.textContent = l.vida + ' / ' + l.vidaMax;
        var pct = (l.vida / l.vidaMax) * 100;
        var c = colorVida(pct);
        relleno.style.width = pct + '%';
        relleno.style.background = 'linear-gradient(90deg,' + c[0] + ',' + c[1] + ')';
      },
      dibujar: function (def, fase) {
        arte.innerHTML = JL.ui.criatura.svg(def, fase, { tamano: 150 });
      }
    };
  }

  /* cfg: { estado, duracionMs, pool, onProgreso, onFin } */
  function iniciar(cfg) {
    var estado = cfg.estado;
    var util = JL.modos.util;
    var e = util.elementos();

    var batalla = JL.combate.crearBatalla(estado);
    var selector = JL.modelo.crearSelector(estado, { pool: cfg.pool });
    var resultados = [];
    var combo = 0, mejorCombo = 0;
    var actual = null, tarjetaEl = null;
    var t0 = 0, listo = false, terminado = false, usoPista = false;
    var fin = Date.now() + cfg.duracionMs;
    var desconectar = null, tickId = null, relojId = null, timers = [];
    var pausas = 0, ultimoTic = 0;

    // ------------------------------------------------------------- montaje

    var hud = document.getElementById('combate-hud');
    hud.innerHTML = '';
    hud.classList.add('combate-hud--activo');

    var pRival = panel('luchador--rival');
    var pHeroe = panel('luchador--heroe');

    // Barra de carga del rival: la amenaza, visible y anticipable.
    var carga = crear('div', 'combate-carga');
    var cargaPista = crear('div', 'combate-carga-pista');
    var cargaRelleno = crear('div', 'combate-carga-relleno');
    cargaPista.appendChild(cargaRelleno);
    carga.appendChild(crear('span', 'combate-carga-icono', '⚔️'));
    carga.appendChild(cargaPista);
    pRival.datos.appendChild(carga);

    hud.appendChild(pRival.raiz);
    hud.appendChild(pHeroe.raiz);

    e.zona.classList.add('zona--combate');
    if (e.mini) e.mini.style.visibility = 'hidden';
    if (e.etiqueta) e.etiqueta.textContent = 'Combate';

    pHeroe.dibujar(batalla.heroe.def, batalla.heroe.fase);
    pHeroe.pintar(batalla.heroe);
    pintarRival(true);

    function pintarRival(sinAnimar) {
      var r = batalla.rival();
      pRival.dibujar(r.def, r.fase);
      pRival.pintar(r);
      if (!sinAnimar) {
        pRival.raiz.classList.remove('luchador--entra');
        void pRival.raiz.offsetWidth;   // reinicia la animación
        pRival.raiz.classList.add('luchador--entra');
      }
      pintarCarga();
    }

    function pintarCarga() {
      var c = batalla.carga();
      cargaRelleno.style.width = (c * 100).toFixed(1) + '%';
      carga.classList.toggle('combate-carga--inminente', c > 0.78);
    }

    /* El reloj del rival sólo corre cuando la pantalla está libre. */
    function pausar() { pausas++; }
    function reanudar() { pausas = Math.max(0, pausas - 1); }
    function corriendo() { return pausas === 0 && !terminado; }

    function programar(fn, ms) {
      var id = setTimeout(fn, ms);
      timers.push(id);
      return id;
    }

    // ---------------------------------------------------------- animaciones

    function golpear(quien, haciaArriba) {
      if (JL.anim.reducido()) return;
      quien.arte.animate([
        { transform: 'translate(0,0) scale(1)' },
        {
          transform: 'translate(' + (haciaArriba ? 30 : -30) + 'px,' +
            (haciaArriba ? -50 : 50) + 'px) scale(1.12)'
        },
        { transform: 'translate(0,0) scale(1)' }
      ], { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    }

    function recibir(quien) {
      quien.arte.classList.add('luchador-arte--golpe');
      programar(function () { quien.arte.classList.remove('luchador-arte--golpe'); }, 320);
      JL.anim.sacudir(quien.raiz, 8);
    }

    function numeroDano(quien, texto, clase) {
      var c = JL.anim.centroDe(quien.arte);
      JL.anim.flotante(texto, c.x, c.y, clase);
    }

    // ------------------------------------------------------------ el bucle

    function siguiente() {
      if (terminado) return;
      if (Date.now() >= fin) return terminar();

      actual = selector.siguiente();
      if (!actual) return terminar();

      usoPista = false;
      tarjetaEl = JL.ui.tarjeta.silaba(e.host, actual, estado.ajustes);
      listo = false;
      programar(function () {
        if (terminado) return;
        t0 = performance.now();
        listo = true;
      }, 170);
    }

    function responder(ok) {
      if (!listo || terminado) return;
      listo = false;

      var ms = performance.now() - t0;
      if (usoPista) ms = Math.max(ms, JL.modelo.umbrales(estado).lento);

      var res = JL.modelo.registrar(estado, actual, ms, ok);
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

      resolverTurno(res);
    }

    function resolverTurno(res) {
      var cargaAntes = batalla.carga();
      var golpe = batalla.atacar(res.clase, combo);
      golpear(pHeroe, true);
      pausar();

      programar(function () {
        if (terminado) return reanudar();
        pRival.pintar(batalla.rival());
        recibir(pRival);
        numeroDano(pRival, '-' + golpe.dano,
          golpe.critico ? 'flotante--critico' : 'flotante--dano');
        if (golpe.critico) {
          JL.audio.acierto(combo + 3);
          numeroDano(pRival, '¡CRÍTICO!', 'flotante--bien');
        }

        // El freno se enseña: si no, el premio defensivo de leer rápido
        // es invisible y no enseña nada.
        if (golpe.freno) {
          carga.classList.add('combate-carga--frenada');
          programar(function () { carga.classList.remove('combate-carga--frenada'); }, 420);
          // El rótulo sólo cuando frenar ha servido de algo: si sale en cada
          // sílaba fluida es ruido y deja de significar nada.
          if (cargaAntes > 0.45) {
            var cr = JL.anim.centroDe(carga);
            JL.anim.flotante('🛡️ ¡frenado!', cr.x, cr.y - 22, 'flotante--freno');
          }
        }
        pintarCarga();

        if (golpe.ko) return vencer(golpe);
        reanudar();
        programar(siguiente, 200);
      }, 170);
    }

    /* Ataque del rival: puede caer en cualquier momento, incluso con una
       sílaba en pantalla esperando respuesta. No la interrumpe. */
    function ataqueRival(t) {
      pausar();
      golpear(pRival, false);
      programar(function () {
        if (terminado) return reanudar();
        pHeroe.pintar(batalla.heroe);
        recibir(pHeroe);
        numeroDano(pHeroe, '-' + t.dano, 'flotante--dano');
        JL.audio.suave();
        pintarCarga();
        if (t.ko) return perder();
        reanudar();
      }, 180);
    }

    function vencer(golpe) {
      JL.audio.campana();
      pRival.raiz.classList.add('luchador--ko');
      numeroDano(pRival, '+' + golpe.xp + ' XP', 'flotante--xp');
      var c = JL.anim.centroDe(pRival.arte);
      JL.anim.particulas(c.x, c.y, ['#ffd166', '#fff', '#ff6b9d'], 26);

      programar(function () {
        if (terminado) return reanudar();
        pRival.raiz.classList.remove('luchador--ko');
        batalla.siguienteRival();
        pintarRival(false);
        JL.audio.whoosh();
        reanudar();
        programar(siguiente, 300);
      }, 900);
    }

    /* Derrota: se pierde la batalla, no el rato de leer. */
    function perder() {
      pHeroe.raiz.classList.add('luchador--ko');
      JL.audio.marcaFallo();
      var c = JL.anim.centroDe(pHeroe.arte);
      JL.anim.flotante('se retira a descansar 💤', c.x, c.y - 30, 'flotante--lento');

      programar(function () {
        if (terminado) return reanudar();
        batalla.revancha();
        pHeroe.raiz.classList.remove('luchador--ko');
        pHeroe.raiz.classList.add('luchador--entra');
        pHeroe.pintar(batalla.heroe);
        pintarRival(false);
        var c2 = JL.anim.centroDe(pHeroe.arte);
        JL.anim.flotante('¡otra vez! 💪', c2.x, c2.y - 30, 'flotante--bien');
        JL.audio.campana();
        programar(function () { pHeroe.raiz.classList.remove('luchador--entra'); }, 500);
        reanudar();
        // Si hay una sílaba en pantalla sin contestar, se respeta.
        if (!listo) programar(siguiente, 500);
      }, 1500);
    }

    function pista() {
      if (!actual || terminado) return;
      usoPista = true;
      JL.audio.hablar(actual);
      if (tarjetaEl) tarjetaEl.classList.add('tarjeta--pista');
    }

    function terminar() {
      if (terminado) return;
      terminado = true;
      if (desconectar) desconectar();
      if (tickId) clearInterval(tickId);
      if (relojId) clearInterval(relojId);
      timers.forEach(clearTimeout);

      var cierre = batalla.cerrar();
      JL.storage.guardarYa();

      hud.classList.remove('combate-hud--activo');
      hud.innerHTML = '';
      e.zona.classList.remove('zona--combate');
      if (e.mini) e.mini.style.visibility = '';
      util.pintarCombo(0);
      JL.ui.tarjeta.vaciar(e.host);

      if (cfg.onFin) {
        cfg.onFin({ resultados: resultados, mejorCombo: mejorCombo, combate: cierre });
      }
    }

    desconectar = util.conectar({
      avanzar: function () { responder(true); },
      fallo: function () { responder(false); },
      voz: pista
    });

    // Reloj del rival, independiente de lo que haga el jugador.
    ultimoTic = performance.now();
    relojId = setInterval(function () {
      var ahora = performance.now();
      var delta = ahora - ultimoTic;
      ultimoTic = ahora;
      if (!corriendo()) return;
      var t = batalla.tic(delta);
      pintarCarga();
      if (t.toca) ataqueRival(t);
    }, TIC_MS);

    tickId = setInterval(function () {
      if (terminado) return;
      var restante = Math.max(0, fin - Date.now());
      if (cfg.onProgreso) cfg.onProgreso(1 - restante / cfg.duracionMs);
      if (restante <= 0) terminar();
    }, 200);

    siguiente();

    return { abortar: terminar };
  }

  JL.modos.combate = { iniciar: iniciar };

})(window.JL = window.JL || {});

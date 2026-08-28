/* Pruebas del motor desde la consola del navegador.

   El modelo no toca el DOM, así que se puede verificar entero sin jugar:
     JL.debug.comprobaciones()   -> pasa toda la batería
     JL.debug.simular()          -> crea un jugador falso y enseña qué decide
     JL.debug.saltarA('GR')      -> desbloquea familias para probar pantallas
*/
(function (JL) {
  'use strict';

  function estadoDePrueba() {
    var e = JL.storage.crearEstado();
    JL.modelo.familiasDesbloqueadas(e);
    return e;
  }

  /* Mete `n` respuestas de `ms` milisegundos en una sílaba. */
  function alimentar(estado, id, ms, n, ok) {
    for (var i = 0; i < (n || 5); i++) {
      JL.modelo.registrar(estado, id, ms, ok === undefined ? true : ok);
    }
    return estado;
  }

  /* Jugador de laboratorio: base de 800 ms en directas, con las tres familias
     desbloqueadas en los tres estados posibles —BR ya automática, PL a medias,
     TR todavía costosa—. Es el caso que la app tiene que detectar sola. */
  function perfilTipo() {
    var e = estadoDePrueba();

    JL.datos.CALIBRACION.forEach(function (id) {
      alimentar(e, id, 780 + Math.random() * 80, 3);
    });

    JL.modelo.desbloquear(e, 'PL');
    JL.modelo.desbloquear(e, 'BR');
    JL.modelo.desbloquear(e, 'TR');

    JL.datos.silabasDe('BR').forEach(function (id) { alimentar(e, id, 850, 5); });
    JL.datos.silabasDe('PL').forEach(function (id) { alimentar(e, id, 1500, 5); });
    JL.datos.silabasDe('TR').forEach(function (id) { alimentar(e, id, 2600, 5); });

    return e;
  }

  var pasadas = 0, fallidas = 0;
  var observador = null;

  function comprobar(nombre, condicion, detalle) {
    if (condicion) {
      pasadas++;
      console.log('%c✓ ' + nombre, 'color:#0a7', detalle === undefined ? '' : detalle);
    } else {
      fallidas++;
      console.error('✗ ' + nombre, detalle === undefined ? '' : detalle);
    }
  }

  var debug = {
    estadoDePrueba: estadoDePrueba,
    alimentar: alimentar,
    perfilTipo: perfilTipo,

    /* Enseña qué está decidiendo el modelo con un perfil concreto. */
    simular: function (estado) {
      var e = estado || perfilTipo();
      var u = JL.modelo.umbrales(e);

      console.log('%cCalibración', 'font-weight:bold');
      console.table({
        base: Math.round(u.base) + ' ms',
        fluida: '≤ ' + u.fluido + ' ms',
        lenta: '≥ ' + u.lento + ' ms',
        calibrada: e.calibrada
      });

      console.log('%cAutomaticidad por familia', 'font-weight:bold');
      var filas = {};
      JL.modelo.familiasDesbloqueadas(e).forEach(function (f) {
        filas[f] = JL.modelo.puntuacionFamilia(e, f) + '%';
      });
      console.table(filas);

      var sel = JL.modelo.crearSelector(e, { pool: JL.modelo.poolTrabajo(e) });
      var cuenta = {}, secuencia = [];
      for (var i = 0; i < 200; i++) {
        var id = sel.siguiente();
        secuencia.push(id);
        var fam = (JL.datos.item(id) || {}).familia || 'directas';
        cuenta[fam] = (cuenta[fam] || 0) + 1;
      }
      console.log('%cReparto en 200 presentaciones', 'font-weight:bold');
      console.table(cuenta);
      console.log('Primeras 20:', secuencia.slice(0, 20).join(' · '));
      return { estado: e, cuenta: cuenta, secuencia: secuencia };
    },

    /* Calibración a partir de una lista de tiempos concretos. */
    tiempos: function (lista, estado) {
      var e = estado || estadoDePrueba();
      lista.forEach(function (ms, i) {
        JL.modelo.registrar(e, JL.datos.CALIBRACION[i % JL.datos.CALIBRACION.length], ms, true);
      });
      console.log('base =', e.baseMs, 'ms  ·  umbrales =', JL.modelo.umbrales(e));
      return e;
    },

    /* Juega solo: toca cada tarjeta `ms` milisegundos después de aparecer.
       Sirve para recorrer la sesión entera sin sentarse a jugarla.
         JL.app.factorTiempo(0.06); JL.debug.autoJugar(900); */
    autoJugar: function (ms, jitter) {
      ms = ms || 900;
      jitter = jitter === undefined ? 400 : jitter;
      var zona = document.getElementById('zona-juego');
      var pendiente = null;

      debug.pararAuto();
      observador = new MutationObserver(function () {
        var t = zona.querySelector('.tarjeta:not(.tarjeta--sale)');
        if (!t || t.dataset.auto) return;
        t.dataset.auto = '1';
        clearTimeout(pendiente);
        pendiente = setTimeout(function () {
          zona.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        }, 250 + ms + Math.random() * jitter);
      });
      observador.observe(zona, { childList: true, subtree: true });
      return 'auto-juego activado · JL.debug.pararAuto() para apagarlo';
    },

    pararAuto: function () {
      if (observador) { observador.disconnect(); observador = null; }
    },

    /* Balance del combate: simula bloques enteros con tres perfiles de lector
       y varios niveles, y dice cuántos rivales caen y cuántas veces se pierde.
       Es la herramienta para tocar los números de JL.combate.CONF con datos
       delante en vez de a ojo. */
    balance: function (duracionMs, repeticiones) {
      duracionMs = duracionMs || 120000;   // el bloque de combate son 2 minutos
      repeticiones = repeticiones || 60;

      /* Ahora el rival ataca por reloj, así que la simulación tiene que ser
         temporal: lo que decide cuántos golpes recibe no es cuántas sílabas
         lee sino cuánto tarda en cada una. Por eso cada perfil lleva su
         tiempo medio de lectura además de su reparto de aciertos. */
      function unBloque(perfil, nivel) {
        var e = estadoDePrueba();
        var f = JL.combate.familiaHeroe(e);
        JL.modelo.estadoFamilia(e, f).nivel = nivel;
        var b = JL.combate.crearBatalla(e, f);
        var combo = 0, t = 0, leidas = 0;

        function pasar(ms) {
          var resto = ms;
          while (resto > 0 && !b.perdida()) {
            var paso = Math.min(80, resto);
            b.tic(paso);
            resto -= paso;
          }
          t += ms;
        }

        while (t < duracionMs) {
          var r = Math.random();
          var clase = r < perfil.f ? 'fluida' : (r < perfil.f + perfil.m ? 'media' : 'lenta');
          var lectura = perfil.ms * (0.75 + Math.random() * 0.5);

          pasar(lectura);                       // el rival carga mientras lee
          if (b.perdida()) { pasar(1500); b.revancha(); continue; }

          combo = clase === 'fluida' ? combo + 1 : 0;
          b.atacar(clase, combo);
          leidas++;
          if (b.rival().vida === 0) { t += 1200; b.siguienteRival(); }
          t += 400;                             // animación del golpe, sin cargar
        }
        var c = b.cerrar();
        c.leidas = leidas;
        return c;
      }

      /* Los tiempos medios salen de lo que se ve jugando: un lector fluido va
         por debajo del segundo y medio, y a quien le cuesta se le va a tres. */
      var perfiles = [
        ['lee muy bien', { f: 0.70, m: 0.25, ms: 1300 }],
        ['normal', { f: 0.40, m: 0.40, ms: 2000 }],
        ['le cuesta', { f: 0.15, m: 0.35, ms: 3200 }]
      ];
      var tabla = {};
      perfiles.forEach(function (p) {
        [0, 30, 70].forEach(function (nv) {
          var rs = [];
          for (var k = 0; k < repeticiones; k++) rs.push(unBloque(p[1], nv));
          tabla[p[0] + ' · Nv' + nv] = {
            silabas: Math.round(rs.reduce(function (a, r) { return a + r.leidas; }, 0) / repeticiones),
            rivales: (rs.reduce(function (a, r) { return a + r.vencidos; }, 0) / repeticiones).toFixed(1),
            xp: Math.round(rs.reduce(function (a, r) { return a + r.xp; }, 0) / repeticiones),
            derrotas: (rs.reduce(function (a, r) { return a + r.derrotas; }, 0) / repeticiones).toFixed(1),
            alMenosUna: Math.round(rs.filter(function (r) { return r.derrotas > 0; }).length / repeticiones * 100) + '%'
          };
        });
      });
      console.table(tabla);
      return tabla;
    },

    /* Desbloquea familias hasta la indicada, para poder ver pantallas. */
    saltarA: function (famId) {
      var e = JL.app.estado();
      var orden = JL.datos.ORDEN_FAMILIAS;
      var hasta = orden.indexOf(famId);
      if (hasta < 0) return console.error('Familia desconocida:', famId);
      for (var i = 0; i <= hasta; i++) {
        JL.modelo.desbloquear(e, orden[i]);
        JL.datos.silabasDe(orden[i]).forEach(function (id) {
          alimentar(e, id, 900, 5);
        });
      }
      JL.storage.guardarYa();
      console.log('Desbloqueadas hasta', famId, '· recarga para verlo');
    },

    // ------------------------------------------------------------ batería

    comprobaciones: function () {
      pasadas = 0; fallidas = 0;

      // --- calibración
      var e1 = debug.tiempos([700, 800, 900, 750, 850, 800, 820, 780, 810, 790,
        760, 830, 800, 800, 800]);
      comprobar('la base sale de la mediana de las directas',
        e1.baseMs >= 750 && e1.baseMs <= 850, e1.baseMs + ' ms');
      comprobar('el umbral de lenta es relativo a la base',
        JL.modelo.umbrales(e1).lento === Math.round(e1.baseMs * 2.5));

      // --- puntuación
      var e2 = estadoDePrueba();
      alimentar(e2, 'ma', 400, 5);
      comprobar('respuesta muy rápida puntúa 100', JL.modelo.puntuacionItem(e2, 'ma') === 100);
      alimentar(e2, 'pa', 9000, 5);
      comprobar('respuesta muy lenta puntúa bajo', JL.modelo.puntuacionItem(e2, 'pa') <= 25,
        JL.modelo.puntuacionItem(e2, 'pa'));
      alimentar(e2, 'ta', 500, 5, false);
      comprobar('los fallos puntúan 0', JL.modelo.puntuacionItem(e2, 'ta') === 0);
      comprobar('sílaba no vista devuelve null', JL.modelo.puntuacionItem(e2, 'bra') === null);

      // --- la reciente pesa más que la antigua
      var e3 = estadoDePrueba();
      alimentar(e3, 'mi', 5000, 4);
      JL.modelo.registrar(e3, 'mi', 400, true);
      comprobar('la última respuesta pesa más que las viejas',
        JL.modelo.puntuacionItem(e3, 'mi') > 35, JL.modelo.puntuacionItem(e3, 'mi'));

      // --- familia: las no vistas cuentan como 0
      var e4 = estadoDePrueba();
      JL.modelo.desbloquear(e4, 'BR');
      alimentar(e4, 'bra', 400, 5);
      comprobar('una sola sílaba perfecta no llena la familia',
        JL.modelo.puntuacionFamilia(e4, 'BR') === 20,
        JL.modelo.puntuacionFamilia(e4, 'BR'));

      // --- el perfil tipo: BR arriba, TR abajo
      var e5 = perfilTipo();
      var pBR = JL.modelo.puntuacionFamilia(e5, 'BR');
      var pTR = JL.modelo.puntuacionFamilia(e5, 'TR');
      comprobar('BR (rápida) puntúa más que TR (lenta)', pBR > pTR + 30,
        'BR ' + pBR + '% · TR ' + pTR + '%');

      // --- el selector insiste en lo que cuesta
      var sel = JL.modelo.crearSelector(e5, { pool: JL.modelo.poolTrabajo(e5) });
      var sec = [], cuenta = { PL: 0, BR: 0, TR: 0 };
      for (var i = 0; i < 300; i++) {
        var id = sel.siguiente();
        sec.push(id);
        var fam = (JL.datos.item(id) || {}).familia;
        if (cuenta[fam] !== undefined) cuenta[fam]++;
      }
      var reparto = 'PL ' + cuenta.PL + ' · BR ' + cuenta.BR + ' · TR ' + cuenta.TR;
      comprobar('sale TR (cuesta) más veces que BR (dominada)',
        cuenta.TR > cuenta.BR, reparto);
      comprobar('la zona de trabajo (PL) es la que más sale',
        cuenta.PL > cuenta.TR && cuenta.PL > cuenta.BR, reparto);

      // --- que no se pueda recitar
      var vocales = ['a', 'e', 'i', 'o', 'u'];
      var seguidas = 0, repetidas = 0, cantinela = 0;
      for (i = 1; i < sec.length; i++) {
        var a = JL.datos.item(sec[i - 1]) || {}, b = JL.datos.item(sec[i]) || {};
        if (sec[i] === sec[i - 1]) repetidas++;
        if (a.familia && a.familia === b.familia) {
          seguidas++;
          if (Math.abs(vocales.indexOf(a.vocal) - vocales.indexOf(b.vocal)) === 1) cantinela++;
        }
      }
      comprobar('no sale la misma sílaba dos veces seguidas', repetidas === 0, repetidas);
      comprobar('nunca dos vocales contiguas de la misma familia (bra→bre)',
        cantinela === 0, cantinela);
      comprobar('se cambia de familia siempre que se puede',
        seguidas / sec.length < 0.4, (seguidas / sec.length * 100).toFixed(0) + '% seguidas');

      // --- escalera de ráfaga
      var e6 = perfilTipo();
      var esc = JL.modelo.crearEscalera(e6);
      var inicio = esc.exposicion();
      esc.registrar(true); esc.registrar(true);
      comprobar('dos aciertos todavía no aceleran', esc.exposicion() === inicio);
      esc.registrar(true);
      comprobar('el tercer acierto acelera 0,1 s', esc.exposicion() === inicio - 100,
        esc.exposicion());
      var antes = esc.exposicion();
      esc.registrar(false);
      comprobar('un fallo afloja 0,2 s (nunca acelera)', esc.exposicion() === antes + 200,
        esc.exposicion());
      esc.registrar(true); esc.registrar(true);
      esc.registrar(false);
      comprobar('el fallo reinicia la cuenta de aciertos',
        esc.exposicion() > antes, esc.exposicion());

      // --- convergencia: si acierta al 100 %, baja hasta el mínimo y se queda
      var e7 = perfilTipo();
      var esc2 = JL.modelo.crearEscalera(e7);
      for (i = 0; i < 200; i++) esc2.registrar(true);
      comprobar('la escalera no baja del mínimo',
        esc2.exposicion() === JL.modelo.CONF.RAFAGA.min, esc2.exposicion());

      // --- las palabras no hunden la puntuación de la sílaba
      var e8 = perfilTipo();
      var antesPal = JL.modelo.puntuacionItem(e8, 'bra');
      JL.modelo.registrarPalabra(e8, { p: 'brazo', h: 'bra', s: 'bra', i: 0 }, 3000, true);
      comprobar('una palabra no cambia la automaticidad de la sílaba',
        JL.modelo.puntuacionItem(e8, 'bra') === antesPal);

      // --- desbloqueo progresivo
      var e9 = estadoDePrueba();
      comprobar('al empezar sólo hay una familia desbloqueada',
        JL.modelo.familiasDesbloqueadas(e9).length === 1);
      comprobar('no entra familia nueva sin llegar al umbral',
        JL.modelo.revisarDesbloqueos(e9) === null);
      JL.datos.silabasDe(JL.datos.ORDEN_FAMILIAS[0]).forEach(function (id) {
        alimentar(e9, id, 500, 5);
      });
      comprobar('al llegar al 70 % entra la siguiente familia',
        JL.modelo.revisarDesbloqueos(e9) === JL.datos.ORDEN_FAMILIAS[1]);

      // --- evoluciones
      var e10 = estadoDePrueba();
      var f0 = JL.datos.ORDEN_FAMILIAS[0];
      JL.datos.silabasDe(f0).forEach(function (id) { alimentar(e10, id, 500, 5); });
      var evo = JL.modelo.revisarFases(e10);
      comprobar('la criatura evoluciona al subir de tramo', evo.length === 1 && evo[0].a === 2,
        JSON.stringify(evo));
      comprobar('no vuelve a evolucionar dos veces', JL.modelo.revisarFases(e10).length === 0);

      // --- los tiempos absurdos no contaminan
      var e11 = estadoDePrueba();
      alimentar(e11, 'mo', 60000, 1);
      comprobar('un tiempo absurdo se capa a 8 s',
        e11.items.mo.ultimos[0].ms === JL.modelo.CONF.CAP_MS);
      comprobar('y se marca como distracción', e11.items.mo.ultimos[0].distraccion === true);

      // ------------------------------------------------------------ combate

      var e12 = perfilTipo();
      var fam = JL.combate.familiaHeroe(e12);
      var st0 = JL.combate.estadisticas(e12, fam);
      comprobar('a nivel 0 el monstruo ya tiene estadísticas jugables',
        st0.nivel === 0 && st0.vidaMax === JL.combate.CONF.HEROE.vida &&
        st0.ataque === JL.combate.CONF.HEROE.ataque,
        'vida ' + st0.vidaMax + ' · ataque ' + st0.ataque);

      var b = JL.combate.crearBatalla(e12, fam);
      var golpeFluida = JL.combate.dañoHeroe(b.heroe, b.rival(), 'fluida', 0).dano;
      var golpeLenta = JL.combate.dañoHeroe(b.heroe, b.rival(), 'lenta', 0).dano;
      comprobar('leer rápido pega más fuerte que leer lento',
        golpeFluida > golpeLenta * 2, golpeFluida + ' vs ' + golpeLenta);

      var golpeFallo = JL.combate.dañoHeroe(b.heroe, b.rival(), 'fallo', 0).dano;
      comprobar('ni un fallo hace cero daño', golpeFallo >= JL.combate.CONF.DANO_MIN, golpeFallo);

      comprobar('encadenar fluidas pega más que una suelta',
        JL.combate.dañoHeroe(b.heroe, b.rival(), 'fluida', 5).dano > golpeFluida);
      comprobar('a partir de 3 fluidas seguidas hay crítico',
        JL.combate.dañoHeroe(b.heroe, b.rival(), 'fluida', 3).critico === true &&
        JL.combate.dañoHeroe(b.heroe, b.rival(), 'fluida', 1).critico === false);

      // El rival ataca con su propio reloj, no esperando turnos.
      var b2 = JL.combate.crearBatalla(e12, fam);
      var ritmo = b2.rival().ritmo;
      comprobar('el rival no ataca nada más aparecer', b2.tic(0).toca === false);
      comprobar('no ataca antes de cargarse del todo', b2.tic(ritmo - 50).toca === false);
      comprobar('ataca solo al llenarse la carga, sin que leamos nada',
        b2.tic(60).toca === true, ritmo + ' ms');

      // Leer rápido frena esa carga; leer despacio no la acelera.
      var b6 = JL.combate.crearBatalla(e12, fam);
      b6.tic(b6.rival().ritmo * 0.9);
      var antesFreno = b6.carga();
      b6.atacar('fluida', 0);
      comprobar('una sílaba fluida frena la carga del rival',
        b6.carga() < antesFreno, antesFreno.toFixed(2) + ' → ' + b6.carga().toFixed(2));

      var b7 = JL.combate.crearBatalla(e12, fam);
      b7.tic(b7.rival().ritmo * 0.5);
      var antesLenta = b7.carga();
      b7.atacar('lenta', 0);
      comprobar('leer despacio no acelera al rival, sólo no lo frena',
        b7.carga() === antesLenta);

      // Si nadie llama al reloj (animación en curso), el rival no carga.
      var b8 = JL.combate.crearBatalla(e12, fam);
      var cargaQuieta = b8.carga();
      comprobar('sin pasar el tiempo el rival no carga', b8.carga() === cargaQuieta);

      // Cada rival tiene su ritmo: unos son mucho más lentos que otros.
      var ritmos = JL.datos.RIVALES.map(function (rv) { return rv.ritmo; });
      comprobar('los rivales no atacan todos al mismo ritmo',
        Math.max.apply(null, ritmos) - Math.min.apply(null, ritmos) >= 1500,
        Math.min.apply(null, ritmos) + '–' + Math.max.apply(null, ritmos) + ' ms');

      // Vencer da XP; perder da la mitad pero nunca resta.
      var b3 = JL.combate.crearBatalla(e12, fam);
      var vueltas = 0;
      while (b3.rival().vida > 0 && vueltas++ < 200) b3.atacar('fluida', 5);
      comprobar('se puede vencer a un rival leyendo bien', b3.vencidos() === 1, vueltas + ' sílabas');
      comprobar('un rival cuesta un número razonable de sílabas',
        vueltas >= 4 && vueltas <= 15, vueltas + ' sílabas leyendo perfecto');

      /* El balance tiene que aguantar en todo el rango de niveles: si el ataque
         crece más rápido que la vida del rival, a nivel alto caen de un golpe. */
      [0, 25, 50, 75, 100].forEach(function (nv) {
        var eN = estadoDePrueba();
        var fN = JL.combate.familiaHeroe(eN);
        JL.combate.ganarXp(eN, fN, 0);
        JL.modelo.estadoFamilia(eN, fN).nivel = nv;
        var bN = JL.combate.crearBatalla(eN, fN);
        var n = 0;
        while (bN.rival().vida > 0 && n++ < 200) bN.atacar('fluida', 5);
        comprobar('a nivel ' + nv + ' el rival aguanta lo suyo', n >= 4 && n <= 15, n + ' sílabas');
      });
      var cierre = b3.cerrar();
      comprobar('vencer da experiencia', cierre.xp > 0, cierre.xp + ' XP');

      var b4 = JL.combate.crearBatalla(e12, fam);
      b4.heroe.vida = 1;
      b4.tic(b4.rival().ritmo + 10);
      comprobar('quedarse sin vida es perder el combate', b4.perdida() === true);

      // Tras perder se sigue leyendo: revancha con vida llena y rival nuevo.
      b4.revancha();
      comprobar('la revancha devuelve toda la vida',
        b4.heroe.vida === b4.heroe.vidaMax && b4.perdida() === false);
      comprobar('la derrota queda contada', b4.derrotas() === 1);
      comprobar('tras la revancha se puede seguir atacando',
        b4.atacar('fluida', 0).dano > 0);

      // Perder no resta nada de lo ya ganado.
      var e14 = perfilTipo();
      var f14 = JL.combate.familiaHeroe(e14);
      JL.combate.ganarXp(e14, f14, 200);
      var xpAntes = JL.combate.progresoNivel(e14, f14);
      var b5 = JL.combate.crearBatalla(e14, f14);
      b5.heroe.vida = 1;
      b5.tic(b5.rival().ritmo + 10);
      b5.cerrar();
      var xpDespues = JL.combate.progresoNivel(e14, f14);
      comprobar('perder no resta experiencia ni niveles',
        xpDespues.nivel > xpAntes.nivel ||
        (xpDespues.nivel === xpAntes.nivel && xpDespues.xp >= xpAntes.xp),
        'antes Nv' + xpAntes.nivel + '/' + xpAntes.xp + ' · después Nv' +
        xpDespues.nivel + '/' + xpDespues.xp);

      // Perder no toca nada de la lectura.
      var autoAntes = JL.modelo.puntuacionFamilia(e12, fam);
      comprobar('perder no baja la automaticidad',
        JL.modelo.puntuacionFamilia(e12, fam) === autoAntes);

      // Niveles
      var e13 = estadoDePrueba();
      var f13 = JL.combate.familiaHeroe(e13);
      var sub = JL.combate.ganarXp(e13, f13, JL.combate.xpParaNivel(0));
      comprobar('con la XP justa se sube un nivel',
        sub.nivel === 1 && sub.subidos.length === 1);
      var st1 = JL.combate.estadisticas(e13, f13);
      comprobar('subir de nivel sube vida, ataque y defensa',
        st1.vidaMax > st0.vidaMax && st1.ataque >= st0.ataque && st1.defensa >= st0.defensa);
      JL.combate.ganarXp(e13, f13, 999999);
      comprobar('el nivel se queda en 100',
        JL.combate.nivelDe(e13, f13) === JL.combate.CONF.NIVEL_MAX);

      /* Invariantes del balance. Van con pocas repeticiones para que la
         batería siga siendo rápida; para afinar números está JL.debug.balance().
         Lo que se protege aquí es la forma: leer bien nunca te hace perder, y
         leer con dificultad no te condena a perder siempre. */
      var bal = debug.balance(120000, 40);
      ['Nv0', 'Nv30', 'Nv70'].forEach(function (nv) {
        var bien = parseInt(bal['lee muy bien · ' + nv].alMenosUna, 10);
        var cuesta = parseInt(bal['le cuesta · ' + nv].alMenosUna, 10);
        comprobar('leyendo bien casi nunca se pierde (' + nv + ')', bien <= 10, bien + '%');
        // Banda ancha a propósito: con 40 repeticiones hay ruido. Lo que se
        // protege aquí es que perder sea posible y no sea la norma; los
        // números finos se miran con JL.debug.balance(120000, 200).
        comprobar('con dificultad se pierde a veces, no siempre (' + nv + ')',
          cuesta >= 5 && cuesta <= 70, cuesta + '%');
      });

      console.log('%c' + pasadas + ' bien · ' + fallidas + ' mal',
        'font-weight:bold;font-size:14px;color:' + (fallidas ? '#c00' : '#0a7'));
      return { pasadas: pasadas, fallidas: fallidas };
    }
  };

  JL.debug = debug;

})(window.JL = window.JL || {});

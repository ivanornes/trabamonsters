/* Modelo de combate. Sin DOM, como el resto del motor.

   Dos progresiones distintas y a propósito separadas:

     automaticidad (0-100)  cómo lee. Decide qué sílabas salen y cuándo
                            evoluciona la criatura. No se pierde nunca.
     nivel (0-100)          fuerza de combate. Se gana con XP venciendo
                            rivales. Sube vida, ataque y defensa.

   El daño que hace depende de lo rápido que lea, así que el nivel acaba
   reflejando la lectura igual: pero pasando por el juego, que es lo divertido.

   Regla que no se rompe: perder un combate nunca quita automaticidad ni XP ya
   ganada. Lo peor que pasa es que el monstruo se retira a descansar. */
(function (JL) {
  'use strict';

  var CONF = {
    NIVEL_MAX: 100,

    /* El rival ataca a su propio ritmo, con su reloj, no esperando turnos.
       Cada rival tiene el suyo (`ritmo` en data/rivales.js), lo que les da
       carácter: Bostezón es lentísimo y Chispón no para.

       Que tenga reloj propio mete presión de tiempo, así que la velocidad de
       lectura tiene también un premio defensivo: cada sílaba fluida FRENA la
       carga del rival. Leer bien no es sólo pegar más fuerte, es que te peguen
       menos. Ir despacio nunca resta nada: simplemente no frena. */
    RITMO_BASE_MS: 4200,      // si un rival no define el suyo
    RITMO_MIN_MS: 2000,       // ni el rival de nivel 100 baja de aquí
    RITMO_POR_NIVEL: 8,       // ms que se acelera por nivel del rival
    FRENO: { fluida: 900, media: 350, lenta: 0, fallo: 0, distraccion: 0 },

    // Multiplicador de daño según lo rápida que haya salido la sílaba.
    // Ni siquiera un fallo hace 0: siempre se avanza algo.
    MULT: { fluida: 2.2, media: 1.3, lenta: 0.7, fallo: 0.35, distraccion: 0.35 },
    BONO_COMBO: 0.08,         // +8 % por sílaba encadenada
    COMBO_MAX: 6,
    CRITICO_COMBO: 3,         // a partir de 3 fluidas seguidas, golpe crítico
    DANO_MIN: 3,

    XP_RIVAL: 20,             // base por vencer
    XP_POR_NIVEL_RIVAL: 0.5,
    XP_POR_FLUIDA: 2,
    XP_DERROTA: 0.5,          // al perder se queda la mitad de lo acumulado

    /* Estos dos números son los que deciden si se puede perder. Están medidos
       (JL.debug.balance()) para que salga: leyendo muy bien casi nunca pierde,
       leyendo regular pierde de vez en cuando, y con dificultad pierde como una
       de cada dos. Perder no cuesta nada, así que la derrota motiva sin doler. */
    CURA_AL_VENCER: 0.28,     // vida que recupera por cada rival vencido
    SUBIDA_RIVAL: 4,          // cada rival encadenado es un poco más fuerte
    MITIGACION: 0.35,         // cuánto de la defensa se descuenta del golpe

    /* Las estadísticas viven aquí y no dentro de las funciones para poder
       barrerlas desde la consola con JL.debug.balance() y elegirlas con datos
       delante. Con el rival atacando por reloj caben unos 30 golpes suyos en
       un bloque de 2 minutos, así que la vida del héroe es alta y cada golpe
       pequeño: la barra baja de forma continua en vez de a mordiscos. */
    /* `vidaNivel` está igualado a cómo crece el golpe del rival con el nivel.
       Si la vida sube más despacio, a nivel alto se muere en menos golpes que
       a nivel bajo, que es exactamente lo contrario de lo que espera quien ha
       subido a su monstruo. Medido con JL.debug.balance(). */
    HEROE: { vida: 210, vidaNivel: 3.0, ataque: 10, ataqueNivel: 0.30, defensa: 4, defensaNivel: 0.26 },
    RIVAL: { vida: 130, vidaNivel: 3.2, ataque: 8, ataqueNivel: 0.22, defensa: 3, defensaNivel: 0.20 }
  };

  function limitar(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // -------------------------------------------------------- niveles y XP

  /* La curva: subir cuesta cada vez más. De 0 a 100 son unos 17.000 puntos,
     que a un par de cientos por sesión son muchos meses de juego. */
  function xpParaNivel(n) { return 20 + n * 3; }

  function datosFamilia(estado, famId) {
    var f = JL.modelo.estadoFamilia(estado, famId);
    if (f.nivel === undefined) f.nivel = 0;
    if (f.xp === undefined) f.xp = 0;
    if (f.vencidos === undefined) f.vencidos = 0;
    return f;
  }

  function nivelDe(estado, famId) { return datosFamilia(estado, famId).nivel; }

  /* Cuánto le falta para el siguiente nivel, para pintar la barra. */
  function progresoNivel(estado, famId) {
    var f = datosFamilia(estado, famId);
    var necesaria = xpParaNivel(f.nivel);
    return {
      nivel: f.nivel,
      xp: f.xp,
      necesaria: necesaria,
      pct: f.nivel >= CONF.NIVEL_MAX ? 100 : Math.round((f.xp / necesaria) * 100)
    };
  }

  /* Suma XP y sube los niveles que toquen. Devuelve qué ha pasado para poder
     animarlo. La XP nunca baja. */
  function ganarXp(estado, famId, cantidad) {
    var f = datosFamilia(estado, famId);
    cantidad = Math.max(0, Math.round(cantidad));
    var subidos = [];

    f.xp += cantidad;
    while (f.nivel < CONF.NIVEL_MAX && f.xp >= xpParaNivel(f.nivel)) {
      f.xp -= xpParaNivel(f.nivel);
      f.nivel++;
      subidos.push(f.nivel);
    }
    if (f.nivel >= CONF.NIVEL_MAX) { f.nivel = CONF.NIVEL_MAX; f.xp = 0; }

    return { ganada: cantidad, nivel: f.nivel, subidos: subidos };
  }

  // ------------------------------------------------------------ estadísticas

  /* La vida crece despacio a propósito. Si subiera tan rápido como el ataque,
     a nivel alto el combate dejaría de tener riesgo y las barras de vida
     serían decorado. */
  function estadisticas(estado, famId) {
    var nivel = nivelDe(estado, famId);
    var H = CONF.HEROE;
    return {
      nivel: nivel,
      vidaMax: Math.round(H.vida + nivel * H.vidaNivel),
      ataque: Math.round(H.ataque + nivel * H.ataqueNivel),
      defensa: Math.round(H.defensa + nivel * H.defensaNivel)
    };
  }

  /* El rival escala contigo: siempre un poco por encima, para que el combate
     sea un reto de verdad sin volverse imposible al subir de nivel.

     La vida está calibrada para que un rival cueste unas 10 sílabas: menos y
     caen sin mérito, más y el combate se hace eterno. Como el ataque del héroe
     crece x4 de nivel 0 a 100, la vida del rival tiene que crecer parecido. */
  function estadisticasRival(nivelRival) {
    var R = CONF.RIVAL;
    return {
      nivel: nivelRival,
      vidaMax: Math.round(R.vida + nivelRival * R.vidaNivel),
      ataque: Math.round(R.ataque + nivelRival * R.ataqueNivel),
      defensa: Math.round(R.defensa + nivelRival * R.defensaNivel)
    };
  }

  /* Con qué criatura peleas: la de la familia que estás entrenando ahora.
     Así "leo mejor esta familia" y "mi monstruo es más fuerte" van juntos. */
  function familiaHeroe(estado) {
    var des = JL.modelo.familiasDesbloqueadas(estado);
    return des[des.length - 1];
  }

  // ---------------------------------------------------------------- daño

  function dañoHeroe(heroe, rival, clase, combo) {
    var mult = CONF.MULT[clase] !== undefined ? CONF.MULT[clase] : CONF.MULT.media;
    var bono = 1 + Math.min(combo, CONF.COMBO_MAX) * CONF.BONO_COMBO;
    var bruto = heroe.ataque * mult * bono;
    var dano = Math.round(bruto - rival.defensa * 0.35);
    return {
      dano: Math.max(CONF.DANO_MIN, dano),
      critico: clase === 'fluida' && combo >= CONF.CRITICO_COMBO
    };
  }

  function dañoRival(rival, heroe) {
    return Math.max(2, Math.round(rival.ataque - heroe.defensa * CONF.MITIGACION));
  }

  // -------------------------------------------------------------- batalla

  function crearBatalla(estado, famId) {
    famId = famId || familiaHeroe(estado);

    var st = estadisticas(estado, famId);
    var pct = JL.modelo.puntuacionFamilia(estado, famId);
    var defHeroe = JL.datos.criatura(famId);
    var faseHeroe = JL.datos.faseDe(pct);

    var heroe = {
      familia: famId,
      def: defHeroe,
      fase: faseHeroe,
      nombre: defHeroe.nombres[faseHeroe],
      nivel: st.nivel,
      vidaMax: st.vidaMax,
      vida: st.vidaMax,
      ataque: st.ataque,
      defensa: st.defensa
    };

    var indiceRival = Math.floor(Math.random() * JL.datos.RIVALES.length);
    var rival = null;
    var vencidos = 0;        // racha actual: escala la fuerza del siguiente rival
    var vencidosTotal = 0;   // los de todo el bloque, para el resumen
    var derrotas = 0;
    var fluidas = 0;
    var xpAcumulada = 0;   // de la batalla en curso
    var xpBanco = 0;       // ya asegurada de batallas anteriores
    var carga = 0;         // ms acumulados hacia el próximo ataque del rival
    var perdida = false;

    function nuevoRival() {
      var nivelRival = limitar(heroe.nivel + 5 + vencidos * CONF.SUBIDA_RIVAL, 1, CONF.NIVEL_MAX);
      var st2 = estadisticasRival(nivelRival);
      var def = JL.datos.rival(indiceRival++);
      rival = {
        def: def,
        nombre: def.nombre,
        fase: limitar(Math.floor(nivelRival / 34), 0, 2),
        nivel: st2.nivel,
        vidaMax: st2.vidaMax,
        vida: st2.vidaMax,
        ataque: st2.ataque,
        defensa: st2.defensa,
        ritmo: Math.max(CONF.RITMO_MIN_MS,
          (def.ritmo || CONF.RITMO_BASE_MS) - nivelRival * CONF.RITMO_POR_NIVEL)
      };
      // Cada rival entra con la carga a cero: nunca ataca nada más aparecer.
      carga = 0;
      return rival;
    }

    nuevoRival();

    return {
      familia: famId,
      heroe: heroe,
      rival: function () { return rival; },
      vencidos: function () { return vencidosTotal; },
      racha: function () { return vencidos; },
      xp: function () { return xpAcumulada; },
      perdida: function () { return perdida; },
      /* Cuánto lleva cargado el ataque del rival (0 a 1). Se pinta como barra
         para que la amenaza se vea venir y no sea una sorpresa. */
      carga: function () { return rival.ritmo ? Math.min(1, carga / rival.ritmo) : 0; },
      ritmo: function () { return rival.ritmo; },

      /* Pasa el tiempo. Lo llama la interfaz con su reloj; el modelo no tiene
         temporizadores propios para poder probarlo con tiempo falso.
         Si no se llama (durante una animación, por ejemplo), el rival no carga:
         así nadie recibe golpes mientras la pantalla está ocupada. */
      tic: function (ms) {
        if (perdida || rival.vida === 0) return { toca: false };
        carga += ms;
        if (carga < rival.ritmo) return { toca: false };

        carga -= rival.ritmo;
        var dano = dañoRival(rival, heroe);
        heroe.vida = Math.max(0, heroe.vida - dano);
        if (heroe.vida === 0) perdida = true;
        return { toca: true, dano: dano, vidaHeroe: heroe.vida, ko: perdida };
      },

      /* Turno del jugador: ha leído una sílaba. */
      atacar: function (clase, combo) {
        if (perdida) return null;
        var d = dañoHeroe(heroe, rival, clase, combo);
        rival.vida = Math.max(0, rival.vida - d.dano);
        if (clase === 'fluida') fluidas++;

        // Leer rápido frena la carga del rival. Leer despacio no la acelera.
        var freno = CONF.FRENO[clase] || 0;
        if (freno) carga = Math.max(0, carga - freno);

        var ko = rival.vida === 0;
        var xp = 0;
        if (ko) {
          vencidos++;
          vencidosTotal++;
          xp = Math.round(CONF.XP_RIVAL + rival.nivel * CONF.XP_POR_NIVEL_RIVAL +
            fluidas * CONF.XP_POR_FLUIDA);
          xpAcumulada += xp;
          fluidas = 0;
          heroe.vida = Math.min(heroe.vidaMax,
            heroe.vida + Math.round(heroe.vidaMax * CONF.CURA_AL_VENCER));
        }
        return {
          dano: d.dano, critico: d.critico, ko: ko, xp: xp, freno: freno,
          vidaRival: rival.vida, vidaHeroe: heroe.vida
        };
      },

      siguienteRival: nuevoRival,
      derrotas: function () { return derrotas; },

      /* Revancha tras una derrota.

         Perder termina ESA batalla, no el rato de leer: si el bloque se
         cortase aquí, un mal día costaría minuto y medio de práctica, que es
         justo lo contrario de lo que busca la app. El monstruo se levanta con
         toda la vida, aparece un rival nuevo (y la racha vuelve a empezar, así
         que otra vez son fáciles) y la derrota queda contada en el resumen.

         La experiencia de la batalla perdida se guarda a la mitad: nunca cero. */
      revancha: function () {
        xpBanco += Math.round(xpAcumulada * CONF.XP_DERROTA);
        xpAcumulada = 0;
        fluidas = 0;
        derrotas++;
        vencidos = 0;              // la racha de rivales se reinicia
        perdida = false;
        carga = 0;
        heroe.vida = heroe.vidaMax;
        return nuevoRival();
      },

      /* Cierra el bloque y entrega la XP acumulada. */
      cerrar: function () {
        var pendiente = perdida ? Math.round(xpAcumulada * CONF.XP_DERROTA) : xpAcumulada;
        var total = xpBanco + pendiente;
        var res = ganarXp(estado, famId, total);
        var f = datosFamilia(estado, famId);
        f.vencidos += vencidosTotal;
        f.derrotas = (f.derrotas || 0) + derrotas + (perdida ? 1 : 0);
        return {
          familia: famId,
          vencidos: vencidosTotal,
          derrotas: derrotas + (perdida ? 1 : 0),
          perdida: perdida,
          xp: total,
          nivel: res.nivel,
          subidos: res.subidos
        };
      }
    };
  }

  JL.combate = {
    CONF: CONF,
    xpParaNivel: xpParaNivel,
    nivelDe: nivelDe,
    progresoNivel: progresoNivel,
    ganarXp: ganarXp,
    estadisticas: estadisticas,
    estadisticasRival: estadisticasRival,
    familiaHeroe: familiaHeroe,
    dañoHeroe: dañoHeroe,
    dañoRival: dañoRival,
    crearBatalla: crearBatalla
  };

})(window.JL = window.JL || {});

/* Motor de automaticidad. Sin DOM a propósito: entra estado, sale decisión.
   Todo lo demás en la app es presentación de lo que decide este fichero.

   Ideas clave:
   - "Rápido" es relativo a quien juega, no a una constante. Se calibra con su
     mediana en sílabas directas.
   - Una sílaba lenta o fallada no castiga: sólo sube su probabilidad de salir.
   - Nunca dos sílabas de la misma familia seguidas, para que no pueda recitar
     bra-bre-bri-bro-bru de memoria sin reconocerlas. */
(function (JL) {
  'use strict';

  var CONF = {
    CAP_MS: 8000,              // por encima de esto es distracción, no lentitud
    N_HISTORIAL: 5,            // presentaciones que se recuerdan por sílaba
    PESO: 0.8,                 // decaimiento: la más reciente pesa más
    BASE_DEFECTO: 1400,
    BASE_MIN: 350,
    MUESTRAS_MIN_BASE: 12,     // por debajo, la calibración no es fiable
    FACTOR_FLUIDO: 1.1,
    FACTOR_LENTO: 2.5,
    UMBRAL_DESBLOQUEO: 70,     // % para que entre una familia nueva
    CORTE_FACIL: 80,
    CORTE_MEDIO: 40,
    /* Reparto de cada bloque de 10. La mayor parte va a la zona de trabajo,
       que es donde se aprende. Las difíciles llevan más peso que las fáciles:
       si no, la app acabaría insistiendo en lo que ya sabe. Las fáciles no
       desaparecen porque hacen falta victorias entre medias. */
    BLOQUE: { faciles: 2, medias: 5, dificiles: 3 },
    RECENCIA_MS: 10 * 60 * 1000,
    RAFAGA: { inicial: 2000, min: 600, max: 3000, baja: 100, sube: 200, aciertos: 3 }
  };

  // ---------------------------------------------------------------- utilidades

  function mediana(xs) {
    if (!xs.length) return null;
    var o = xs.slice().sort(function (a, b) { return a - b; });
    var m = Math.floor(o.length / 2);
    return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
  }

  function itemDe(estado, id) {
    if (!estado.items[id]) {
      estado.items[id] = { vistas: 0, ok: 0, fallos: 0, ultimos: [], ultimaVez: 0 };
    }
    return estado.items[id];
  }

  // ---------------------------------------------------------- calibración

  /* Muestras válidas para la línea base: aciertos en directas fáciles.
     Como cada sílaba sólo guarda sus últimas 5, la ventana se desliza sola. */
  function muestrasBase(estado) {
    var out = [];
    JL.datos.CALIBRACION.forEach(function (id) {
      var it = estado.items[id];
      if (!it) return;
      it.ultimos.forEach(function (r) {
        if (r.ok && !r.distraccion) out.push(r.ms);
      });
    });
    return out;
  }

  function recalcularBase(estado) {
    var m = muestrasBase(estado);
    if (m.length < CONF.MUESTRAS_MIN_BASE) return estado.baseMs;
    estado.baseMs = Math.max(CONF.BASE_MIN, Math.round(mediana(m)));
    estado.calibrada = true;
    return estado.baseMs;
  }

  function umbrales(estado) {
    var base = estado.baseMs || CONF.BASE_DEFECTO;
    return {
      base: base,
      fluido: Math.round(base * CONF.FACTOR_FLUIDO),
      lento: Math.round(base * CONF.FACTOR_LENTO)
    };
  }

  // ------------------------------------------------------------- puntuación

  function puntosDe(registro, u) {
    if (!registro.ok) return 0;
    if (registro.ms <= u.fluido) return 100;
    if (registro.ms >= u.lento) return 20;
    return 100 - 80 * (registro.ms - u.fluido) / (u.lento - u.fluido);
  }

  /* Automaticidad de una sílaba: 0-100, o null si nunca se ha visto. */
  function puntuacionItem(estado, id) {
    var it = estado.items[id];
    if (!it || !it.ultimos.length) return null;
    var u = umbrales(estado);
    var suma = 0, pesos = 0;
    it.ultimos.forEach(function (r, i) {
      var p = Math.pow(CONF.PESO, i);
      suma += puntosDe(r, u) * p;
      pesos += p;
    });
    return Math.round(suma / pesos);
  }

  /* Automaticidad de una familia. Las sílabas no vistas cuentan como 0:
     la barra sólo se llena si ha visto la familia entera. */
  function puntuacionFamilia(estado, famId) {
    var sils = JL.datos.silabasDe(famId);
    if (!sils.length) return 0;
    var suma = 0;
    sils.forEach(function (id) {
      var p = puntuacionItem(estado, id);
      suma += (p === null ? 0 : p);
    });
    return Math.round(suma / sils.length);
  }

  function clasificar(estado, ms, ok) {
    if (!ok) return 'fallo';
    var u = umbrales(estado);
    if (ms > CONF.CAP_MS) return 'distraccion';
    if (ms <= u.fluido) return 'fluida';
    if (ms >= u.lento) return 'lenta';
    return 'media';
  }

  // --------------------------------------------------------------- registro

  /* Anota una presentación. `ms` se mide desde que la sílaba termina de
     aparecer (no desde que se pide) hasta el toque. */
  function registrar(estado, id, ms, ok) {
    var it = itemDe(estado, id);
    var distraccion = ms > CONF.CAP_MS;
    var capado = Math.min(Math.max(ms, 0), CONF.CAP_MS);

    it.vistas++;
    if (ok) it.ok++; else it.fallos++;
    it.ultimaVez = Date.now();
    it.ultimos.unshift({ ms: capado, ok: !!ok, t: it.ultimaVez, distraccion: distraccion });
    if (it.ultimos.length > CONF.N_HISTORIAL) it.ultimos.length = CONF.N_HISTORIAL;

    if (JL.datos.CALIBRACION.indexOf(id) >= 0) recalcularBase(estado);

    return {
      id: id,
      ms: capado,
      ok: !!ok,
      clase: clasificar(estado, capado, ok),
      puntuacion: puntuacionItem(estado, id)
    };
  }

  // -------------------------------------------------------- familias y fases

  function estadoFamilia(estado, famId) {
    if (!estado.familias[famId]) {
      estado.familias[famId] = { desbloqueada: false, fase: 0, descubierta: false };
    }
    return estado.familias[famId];
  }

  function desbloquear(estado, famId) {
    var f = estadoFamilia(estado, famId);
    f.desbloqueada = true;
    f.descubierta = true;
    return famId;
  }

  function familiasDesbloqueadas(estado) {
    var orden = JL.datos.ORDEN_FAMILIAS;
    var out = orden.filter(function (id) {
      var f = estado.familias[id];
      return f && f.desbloqueada;
    });
    if (!out.length) {
      desbloquear(estado, orden[0]);
      out = [orden[0]];
    }
    return out;
  }

  /* Entra una familia nueva sólo cuando la última alcanza el umbral.
     Devuelve el id de la familia nueva, o null. */
  function revisarDesbloqueos(estado) {
    var orden = JL.datos.ORDEN_FAMILIAS;
    var des = familiasDesbloqueadas(estado);
    var ultima = des[des.length - 1];
    if (puntuacionFamilia(estado, ultima) < CONF.UMBRAL_DESBLOQUEO) return null;
    var i = orden.indexOf(ultima);
    if (i < 0 || i + 1 >= orden.length) return null;
    return desbloquear(estado, orden[i + 1]);
  }

  /* Evoluciones pendientes. Se llama al terminar la sesión para que la
     animación sea el cierre, no una interrupción. */
  function revisarFases(estado) {
    var cambios = [];
    familiasDesbloqueadas(estado).forEach(function (famId) {
      var f = estadoFamilia(estado, famId);
      var pct = puntuacionFamilia(estado, famId);
      var nueva = JL.datos.faseDe(pct);
      if (nueva > f.fase) {
        cambios.push({ familia: famId, de: f.fase, a: nueva, pct: pct });
        f.fase = nueva;
      }
    });
    return cambios;
  }

  function resumenFamilias(estado) {
    return JL.datos.ORDEN_FAMILIAS.map(function (id) {
      var f = estado.familias[id] || {};
      return {
        id: id,
        pct: puntuacionFamilia(estado, id),
        desbloqueada: !!f.desbloqueada,
        descubierta: !!f.descubierta,
        fase: f.fase || 0
      };
    });
  }

  // --------------------------------------------------------------- selector

  function recencia(estado, id) {
    var it = estado.items[id];
    if (!it || !it.ultimaVez) return 1;
    return Math.min(1, (Date.now() - it.ultimaVez) / CONF.RECENCIA_MS);
  }

  function elegirPonderado(candidatos, peso) {
    var total = 0, i;
    var pesos = candidatos.map(function (c) {
      var p = Math.max(0.01, peso(c));
      total += p;
      return p;
    });
    var r = Math.random() * total;
    for (i = 0; i < candidatos.length; i++) {
      r -= pesos[i];
      if (r <= 0) return candidatos[i];
    }
    return candidatos[candidatos.length - 1];
  }

  function familiaDe(id) {
    var it = JL.datos.item(id);
    return it ? (it.familia || it.grupo) : null;
  }

  /* Selector por bloques de 10: 3 fáciles para coger ritmo, 5 en la zona de
     trabajo (donde está el aprendizaje real) y 2 difíciles. Si un cajón está
     vacío se rellena del contiguo. */
  function crearSelector(estado, opts) {
    opts = opts || {};
    var pool = (opts.pool || []).slice();
    var mezclar = opts.mezclar !== false;
    var cola = [];
    var ultimoServido = null;

    function clasificarPool() {
      var faciles = [], medias = [], dificiles = [];
      pool.forEach(function (id) {
        var p = puntuacionItem(estado, id);
        if (p === null || p < CONF.CORTE_MEDIO) dificiles.push(id);
        else if (p < CONF.CORTE_FACIL) medias.push(id);
        else faciles.push(id);
      });
      return { faciles: faciles, medias: medias, dificiles: dificiles };
    }

    function peso(c, necesidadAlta) {
      var p = puntuacionItem(estado, c);
      var necesidad = (100 - (p === null ? 0 : p)) / 100;
      var base = necesidadAlta ? (0.3 + necesidad) : 0.5;
      return base + recencia(estado, c);
    }

    /* Saca `n` sílabas de una lista. Si se agotan las distintas, se permite
       repetir dentro del bloque: es justo lo que hace falta para insistir en
       una familia que cuesta cuando todavía hay pocas desbloqueadas. */
    function sacar(lista, n, necesidadAlta, yaElegidos) {
      var out = [];
      if (!lista.length) return out;
      var disp = lista.filter(function (id) { return yaElegidos.indexOf(id) < 0; });

      while (out.length < n) {
        if (!disp.length) {
          var cuenta = {};
          out.forEach(function (id) { cuenta[id] = (cuenta[id] || 0) + 1; });
          // Se reabre la lista, pero sin dejar que una sola sílaba cope el bloque.
          disp = lista.filter(function (id) { return (cuenta[id] || 0) < 2; });
          if (!disp.length) disp = lista.slice();
        }
        var id = elegirPonderado(disp, function (c) { return peso(c, necesidadAlta); });
        out.push(id);
        disp.splice(disp.indexOf(id), 1);
      }
      return out;
    }

    function construirBloque() {
      var c = clasificarPool();
      var elegidos = [];
      var B = CONF.BLOQUE;

      // Se sirven primero las que más falta hacen, y luego se rellena.
      elegidos = elegidos.concat(sacar(c.dificiles, B.dificiles, true, elegidos));
      elegidos = elegidos.concat(sacar(c.medias, B.medias, true, elegidos));
      elegidos = elegidos.concat(sacar(c.faciles, B.faciles, false, elegidos));

      var objetivo = B.faciles + B.medias + B.dificiles;
      var relleno = [c.medias, c.dificiles, c.faciles];
      for (var i = 0; i < relleno.length && elegidos.length < objetivo; i++) {
        elegidos = elegidos.concat(
          sacar(relleno[i], objetivo - elegidos.length, true, elegidos));
      }
      // Pool minúsculo (una sola familia recién desbloqueada): se repite.
      while (elegidos.length < Math.min(objetivo, pool.length * 2) && pool.length) {
        elegidos.push(pool[Math.floor(Math.random() * pool.length)]);
      }

      return ordenarSinRepetirFamilia(elegidos);
    }

    /* Ordenación del bloque.

       Con una sola familia desbloqueada es imposible no repetir familia: todas
       las sílabas son de ella. Así que la regla dura no es "familia distinta"
       sino "que no se pueda recitar":

         1. nunca la misma sílaba dos veces seguidas
         2. nunca dos vocales contiguas de la misma familia (bra→bre, tri→tro),
            que es exactamente la cantinela que se memoriza sin leer
         3. y, cuando hay de dónde elegir, se prefiere cambiar de familia

       Para el paso 3 se coge siempre de la familia con más pendientes: así no
       queda un montón de la misma al final del bloque. */
    function ordenarSinRepetirFamilia(lista) {
      if (!mezclar) return lista;
      var restantes = lista.slice();
      var salida = [];
      var previoId = ultimoServido;

      function recitable(a, b) {
        if (!a || !b) return false;
        var ia = JL.datos.item(a), ib = JL.datos.item(b);
        if (!ia || !ib || ia.familia !== ib.familia || !ia.familia) return false;
        var v = ['a', 'e', 'i', 'o', 'u'];
        return Math.abs(v.indexOf(ia.vocal) - v.indexOf(ib.vocal)) === 1;
      }

      function pendientesPorFamilia() {
        var c = {};
        restantes.forEach(function (id) {
          var f = familiaDe(id);
          c[f] = (c[f] || 0) + 1;
        });
        return c;
      }

      while (restantes.length) {
        var previa = previoId ? familiaDe(previoId) : null;

        // 1 y 2: reglas duras.
        var validos = restantes.filter(function (id) {
          return id !== previoId && !recitable(previoId, id);
        });
        if (!validos.length) validos = restantes.filter(function (id) { return id !== previoId; });
        if (!validos.length) validos = restantes;

        // 3: preferencia por cambiar de familia.
        var otraFamilia = validos.filter(function (id) { return familiaDe(id) !== previa; });
        var candidatos = otraFamilia.length ? otraFamilia : validos;

        // De los candidatos, la familia que más pendientes tiene.
        var cuenta = pendientesPorFamilia();
        var mejor = -1;
        candidatos.forEach(function (id) {
          var n = cuenta[familiaDe(id)] || 0;
          if (n > mejor) mejor = n;
        });
        var finalistas = candidatos.filter(function (id) {
          return (cuenta[familiaDe(id)] || 0) === mejor;
        });

        var id = finalistas[Math.floor(Math.random() * finalistas.length)];
        restantes.splice(restantes.indexOf(id), 1);
        salida.push(id);
        previoId = id;
      }
      return salida;
    }

    return {
      siguiente: function () {
        if (!cola.length) cola = construirBloque();
        if (!cola.length) return null;
        var id = cola.shift();
        ultimoServido = id;
        return id;
      },
      actualizarPool: function (nuevo) {
        pool = nuevo.slice();
        cola = [];
      },
      pool: function () { return pool.slice(); }
    };
  }

  // ------------------------------------------------- pools para cada bloque

  function poolCalentamiento(estado) {
    // Directas fáciles + las trabadas que ya domina: se empieza ganando.
    var dominadas = [];
    familiasDesbloqueadas(estado).forEach(function (fam) {
      JL.datos.silabasDe(fam).forEach(function (id) {
        var p = puntuacionItem(estado, id);
        if (p !== null && p >= CONF.CORTE_FACIL) dominadas.push(id);
      });
    });
    return JL.datos.CALIBRACION.concat(dominadas);
  }

  function poolTrabajo(estado) {
    var out = [];
    familiasDesbloqueadas(estado).forEach(function (fam) {
      out = out.concat(JL.datos.silabasDe(fam));
    });
    // Hasta que está calibrado, se sigue midiendo con directas de vez en cuando.
    if (!estado.calibrada) out = out.concat(JL.datos.CALIBRACION);
    return out;
  }

  // ---------------------------------------------------------- palabras

  /* Las palabras NO alimentan la automaticidad de la sílaba: son otra tarea y
     tardan más, así que hundirían la puntuación sin querer. Se guardan aparte
     y se clasifican con un umbral proporcional a la longitud de la palabra. */
  function umbralPalabra(estado, palabra) {
    var u = umbrales(estado);
    var factor = Math.max(1.2, palabra.p.length / 3);
    return { fluido: Math.round(u.fluido * factor), lento: Math.round(u.lento * factor) };
  }

  function registrarPalabra(estado, palabra, ms, ok) {
    if (!estado.palabras) estado.palabras = {};
    var p = estado.palabras[palabra.p] ||
      (estado.palabras[palabra.p] = { vistas: 0, ok: 0, mejorMs: null });
    var capado = Math.min(Math.max(ms, 0), CONF.CAP_MS);
    p.vistas++;
    if (ok) {
      p.ok++;
      if (p.mejorMs === null || capado < p.mejorMs) p.mejorMs = capado;
    }
    p.ultimaVez = Date.now();

    var u = umbralPalabra(estado, palabra);
    var clase = !ok ? 'fallo'
      : (ms > CONF.CAP_MS ? 'distraccion'
        : (capado <= u.fluido ? 'fluida' : (capado >= u.lento ? 'lenta' : 'media')));

    return { id: palabra.s, palabra: palabra.p, ms: capado, ok: !!ok, clase: clase };
  }

  /* Palabras adecuadas hoy: las de familias desbloqueadas cuya sílaba ya
     empieza a salir (>= 40). Si aún no hay ninguna, se cogen las de la
     familia actual igualmente: leerlas también enseña. */
  function poolPalabras(estado) {
    var listas = [], respaldo = [];
    familiasDesbloqueadas(estado).forEach(function (fam) {
      JL.datos.palabrasDeFamilia(fam).forEach(function (w) {
        respaldo.push(w);
        var p = puntuacionItem(estado, w.s);
        if (p !== null && p >= CONF.CORTE_MEDIO) listas.push(w);
      });
    });
    return listas.length >= 4 ? listas : respaldo;
  }

  // ---------------------------------------------------------- modo ráfaga

  /* Escalera 3-abajo / 1-arriba: acelera sólo con aciertos, nunca con errores. */
  function crearEscalera(estado) {
    var exp = estado.exposicionRafaga || CONF.RAFAGA.inicial;
    var seguidos = 0;
    var historial = [];

    return {
      exposicion: function () { return exp; },
      registrar: function (dentroDeTiempo) {
        var R = CONF.RAFAGA;
        if (dentroDeTiempo) {
          seguidos++;
          if (seguidos >= R.aciertos) {
            exp = Math.max(R.min, exp - R.baja);
            seguidos = 0;
          }
        } else {
          exp = Math.min(R.max, exp + R.sube);
          seguidos = 0;
        }
        historial.push(exp);
        estado.exposicionRafaga = exp;
        return exp;
      },
      /* Zona de trabajo real: dónde ha convergido durante esta ronda. */
      zona: function () {
        if (historial.length < 3) return null;
        var ult = historial.slice(-8);
        return { min: Math.min.apply(null, ult), max: Math.max.apply(null, ult) };
      }
    };
  }

  JL.modelo = {
    CONF: CONF,
    mediana: mediana,
    registrar: registrar,
    recalcularBase: recalcularBase,
    umbrales: umbrales,
    clasificar: clasificar,
    puntuacionItem: puntuacionItem,
    puntuacionFamilia: puntuacionFamilia,
    resumenFamilias: resumenFamilias,
    familiasDesbloqueadas: familiasDesbloqueadas,
    revisarDesbloqueos: revisarDesbloqueos,
    revisarFases: revisarFases,
    estadoFamilia: estadoFamilia,
    desbloquear: desbloquear,
    crearSelector: crearSelector,
    crearEscalera: crearEscalera,
    poolCalentamiento: poolCalentamiento,
    poolTrabajo: poolTrabajo,
    poolPalabras: poolPalabras,
    registrarPalabra: registrarPalabra,
    umbralPalabra: umbralPalabra
  };

})(window.JL = window.JL || {});

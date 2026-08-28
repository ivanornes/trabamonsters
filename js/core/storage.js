/* Persistencia. Todo va envuelto en try/catch porque algunos navegadores
   bloquean localStorage al abrir desde file://. Si pasa, la app sigue
   funcionando en memoria y el panel de adulto avisa de que hay que exportar. */
(function (JL) {
  'use strict';

  var CLAVE = 'juego_lectura_v1';
  var VERSION = 1;

  var persistente = true;
  var memoria = null;
  var pendiente = null;

  function ahora() { return Date.now(); }

  function estadoInicial() {
    return {
      version: VERSION,
      perfil: { nombre: '', creado: new Date().toISOString() },
      ajustes: {
        sonido: true,
        voz: true,
        mayusculas: false,   // en el cole lee minúsculas: ese es el defecto
        pistaColor: true     // grupo consonántico en otro color
      },
      items: {},             // id de sílaba -> historial
      familias: {},          // id de familia -> { desbloqueada, fase }
      sesiones: [],
      baseMs: null,          // velocidad de base personal (mediana en directas)
      exposicionRafaga: 2000,
      racha: { dias: 0, ultimaFecha: null },
      calibrada: false
    };
  }

  function migrar(estado) {
    var base = estadoInicial();
    // Merge superficial defensivo: si en el futuro añadimos campos, los
    // guardados antiguos siguen abriendo sin romperse.
    Object.keys(base).forEach(function (k) {
      if (estado[k] === undefined) estado[k] = base[k];
    });
    Object.keys(base.ajustes).forEach(function (k) {
      if (estado.ajustes[k] === undefined) estado.ajustes[k] = base.ajustes[k];
    });
    estado.version = VERSION;
    return estado;
  }

  function leerBruto() {
    try {
      return window.localStorage.getItem(CLAVE);
    } catch (e) {
      persistente = false;
      return null;
    }
  }

  function escribirBruto(txt) {
    try {
      window.localStorage.setItem(CLAVE, txt);
      persistente = true;
      return true;
    } catch (e) {
      persistente = false;
      return false;
    }
  }

  var storage = {
    get persistente() { return persistente; },

    /* Estado limpio, sin tocar lo guardado. Lo usan las pruebas de JL.debug. */
    crearEstado: estadoInicial,

    cargar: function () {
      var txt = leerBruto();
      if (!txt) {
        memoria = estadoInicial();
        return memoria;
      }
      try {
        memoria = migrar(JSON.parse(txt));
      } catch (e) {
        // Guardado corrupto: mejor empezar de cero que arrastrar basura.
        memoria = estadoInicial();
      }
      return memoria;
    },

    estado: function () {
      if (!memoria) storage.cargar();
      return memoria;
    },

    /* Guardado con debounce: durante una sesión se registran muchas sílabas
       seguidas y no hace falta serializar en cada toque. */
    guardar: function (estado) {
      if (estado) memoria = estado;
      if (pendiente) clearTimeout(pendiente);
      pendiente = setTimeout(storage.guardarYa, 400);
    },

    guardarYa: function () {
      if (pendiente) { clearTimeout(pendiente); pendiente = null; }
      if (!memoria) return false;
      return escribirBruto(JSON.stringify(memoria));
    },

    exportar: function () {
      return JSON.stringify(storage.estado(), null, 2);
    },

    importar: function (txt) {
      var datos = JSON.parse(txt);
      if (!datos || typeof datos !== 'object' || !datos.items) {
        throw new Error('El fichero no parece un progreso de este juego.');
      }
      memoria = migrar(datos);
      storage.guardarYa();
      return memoria;
    },

    reset: function () {
      memoria = estadoInicial();
      storage.guardarYa();
      return memoria;
    },

    /* Racha de días. Se llama al empezar una sesión. */
    marcarDia: function (estado) {
      var hoy = new Date();
      var clave = hoy.getFullYear() + '-' + (hoy.getMonth() + 1) + '-' + hoy.getDate();
      var r = estado.racha;
      if (r.ultimaFecha === clave) return r.dias;

      var ayer = new Date(ahora() - 86400000);
      var claveAyer = ayer.getFullYear() + '-' + (ayer.getMonth() + 1) + '-' + ayer.getDate();

      r.dias = (r.ultimaFecha === claveAyer) ? r.dias + 1 : 1;
      r.ultimaFecha = clave;
      return r.dias;
    }
  };

  // Antes de cerrar, volcar lo que estuviera pendiente del debounce.
  window.addEventListener('pagehide', storage.guardarYa);
  window.addEventListener('beforeunload', storage.guardarYa);

  JL.storage = storage;

})(window.JL = window.JL || {});

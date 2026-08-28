/* Sonido sintetizado con WebAudio: cero ficheros, cero descargas, funciona
   offline desde file://.

   Regla de diseño: no existe el sonido de error. Lo más "negativo" que suena
   es un blip grave y suave, del mismo color que el resto. Nada de buzzer. */
(function (JL) {
  'use strict';

  var ctx = null;
  var master = null;
  var activo = true;

  function asegurar() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    return ctx;
  }

  /* Una nota: oscilador + envolvente suave (sin clics al empezar/terminar). */
  function nota(freq, t0, dur, tipo, vol) {
    if (!ctx) return;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = tipo || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol === undefined ? 0.5 : vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function barrido(f1, f2, t0, dur, tipo, vol) {
    if (!ctx) return;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = tipo || 'sine';
    osc.frequency.setValueAtTime(f1, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol === undefined ? 0.35 : vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function puede() {
    if (!activo) return false;
    return !!asegurar();
  }

  var audio = {
    activar: function (v) { activo = !!v; if (activo) asegurar(); },
    estaActivo: function () { return activo; },
    /* Se llama en el primer toque real: los navegadores no dejan sonar antes. */
    despertar: function () { asegurar(); },

    /* Toque genérico al avanzar. */
    pop: function () {
      if (!puede()) return;
      var t = ctx.currentTime;
      nota(660, t, 0.09, 'triangle', 0.3);
    },

    /* Sílaba fluida. El tono sube con el combo, así el acierto encadenado
       se oye "en escalera" y engancha. */
    acierto: function (combo) {
      if (!puede()) return;
      var t = ctx.currentTime;
      var paso = Math.min(combo || 0, 7);
      var f = 523.25 * Math.pow(2, paso / 12);
      nota(f, t, 0.14, 'triangle', 0.4);
      nota(f * 1.5, t + 0.05, 0.16, 'sine', 0.22);
    },

    /* Sílaba que ha costado. Grave, corto y amable: informa, no regaña. */
    suave: function () {
      if (!puede()) return;
      var t = ctx.currentTime;
      nota(300, t, 0.14, 'sine', 0.22);
    },

    /* El adulto marca fallo. Igual de amable. */
    marcaFallo: function () {
      if (!puede()) return;
      var t = ctx.currentTime;
      barrido(420, 280, t, 0.16, 'sine', 0.2);
    },

    whoosh: function () {
      if (!puede()) return;
      var t = ctx.currentTime;
      barrido(180, 900, t, 0.28, 'sine', 0.16);
    },

    /* Fin de bloque. */
    campana: function () {
      if (!puede()) return;
      var t = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach(function (f, i) {
        nota(f, t + i * 0.07, 0.35, 'sine', 0.3);
      });
    },

    /* Fin de sesión. */
    fanfarria: function () {
      if (!puede()) return;
      var t = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        nota(f, t + i * 0.1, 0.4, 'triangle', 0.34);
        nota(f * 2, t + i * 0.1, 0.25, 'sine', 0.12);
      });
    },

    /* Evolución: el momento grande. Carga + estallido. */
    evolucion: function () {
      if (!puede()) return;
      var t = ctx.currentTime;
      barrido(200, 1400, t, 1.1, 'sawtooth', 0.12);
      [659.25, 783.99, 987.77, 1318.5].forEach(function (f, i) {
        nota(f, t + 1.1 + i * 0.09, 0.5, 'triangle', 0.36);
      });
    },

    /* Voz: sólo cuando él pulsa "¿cómo suena?". Nunca automática. */
    hablar: function (texto) {
      if (!activo) return false;
      if (!('speechSynthesis' in window)) return false;
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(texto);
        u.lang = 'es-ES';
        u.rate = 0.75;
        u.pitch = 1.15;
        window.speechSynthesis.speak(u);
        return true;
      } catch (e) {
        return false;
      }
    },

    hayVoz: function () { return 'speechSynthesis' in window; }
  };

  JL.audio = audio;

})(window.JL = window.JL || {});

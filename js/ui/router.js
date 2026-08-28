/* Cambio de pantalla. Cada pantalla es un <section class="pantalla"> y sólo
   una lleva la clase --activa. La transición es puro CSS. */
(function (JL) {
  'use strict';

  var actual = null;
  var alEntrar = {};

  function pantallas() {
    return Array.prototype.slice.call(document.querySelectorAll('.pantalla'));
  }

  var router = {
    /* Registra qué hacer cuando se entra en una pantalla. */
    al: function (nombre, fn) { alEntrar[nombre] = fn; },

    ir: function (nombre, datos) {
      var destino = document.getElementById('pantalla-' + nombre);
      if (!destino) return;

      pantallas().forEach(function (p) {
        p.classList.toggle('pantalla--activa', p === destino);
        p.setAttribute('aria-hidden', p === destino ? 'false' : 'true');
      });

      actual = nombre;
      // El scroll se reinicia: al volver del álbum no queremos quedarnos a medias.
      destino.scrollTop = 0;
      if (alEntrar[nombre]) alEntrar[nombre](datos || {});
    },

    actual: function () { return actual; }
  };

  JL.ui = JL.ui || {};
  JL.ui.router = router;

})(window.JL = window.JL || {});

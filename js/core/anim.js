/* Efectos: partículas, texto flotante, confeti y destello.
   Se usa la Web Animations API en vez de clases CSS porque cada partícula
   necesita su propia trayectoria, y así se limpian solas al terminar.

   Si el sistema pide menos movimiento (prefers-reduced-motion), todo esto
   se reduce a lo mínimo. */
(function (JL) {
  'use strict';

  var capa = null;
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function reducido() { return !!(mq && mq.matches); }

  function capaEfectos() {
    if (!capa) capa = document.getElementById('capa-efectos');
    return capa;
  }

  function nuevoNodo(clase) {
    var d = document.createElement('div');
    d.className = clase;
    capaEfectos().appendChild(d);
    return d;
  }

  function limpiarAl(anim, nodo) {
    anim.onfinish = function () { if (nodo.parentNode) nodo.parentNode.removeChild(nodo); };
    anim.oncancel = anim.onfinish;
  }

  /* Centro de un elemento, en coordenadas de ventana. */
  function centroDe(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  var anim = {
    reducido: reducido,
    centroDe: centroDe,

    /* Estallido de partículas en (x, y). Es la recompensa inmediata al tocar. */
    particulas: function (x, y, colores, cantidad) {
      if (reducido()) return;
      var n = cantidad || 18;
      colores = colores && colores.length ? colores : ['#ffd166', '#ff6b9d'];
      for (var i = 0; i < n; i++) {
        var p = nuevoNodo('particula');
        var tam = 6 + Math.random() * 12;
        var ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
        var dist = 60 + Math.random() * 120;
        var color = colores[i % colores.length];

        p.style.width = tam + 'px';
        p.style.height = tam + 'px';
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        p.style.background = color;
        if (Math.random() < 0.35) p.style.borderRadius = '20%';

        var a = p.animate([
          { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 },
          {
            transform: 'translate(' + (Math.cos(ang) * dist - tam / 2) + 'px, ' +
              (Math.sin(ang) * dist + 90 - tam / 2) + 'px) scale(0.2) rotate(' +
              (Math.random() * 540 - 270) + 'deg)',
            opacity: 0
          }
        ], {
          duration: 700 + Math.random() * 400,
          easing: 'cubic-bezier(.15,.7,.3,1)'
        });
        limpiarAl(a, p);
      }
    },

    /* Texto que sube y se desvanece: "⚡ fluida", "+3 combo"...
       Se mantiene dentro de la pantalla: en combate los luchadores están en
       las esquinas y los rótulos se salían por el borde. */
    flotante: function (texto, x, y, clase) {
      var d = nuevoNodo('flotante ' + (clase || ''));
      d.textContent = texto;
      var margen = Math.min(110, window.innerWidth * 0.22);
      d.style.left = Math.max(margen, Math.min(window.innerWidth - margen, x)) + 'px';
      d.style.top = Math.max(30, y) + 'px';
      var a = d.animate([
        { transform: 'translate(-50%, -50%) scale(.6)', opacity: 0 },
        { transform: 'translate(-50%, -140%) scale(1.15)', opacity: 1, offset: 0.25 },
        { transform: 'translate(-50%, -260%) scale(1)', opacity: 0 }
      ], { duration: reducido() ? 600 : 1100, easing: 'cubic-bezier(.2,.8,.3,1)' });
      limpiarAl(a, d);
    },

    /* Confeti de celebración desde arriba. */
    confeti: function (cantidad) {
      if (reducido()) return;
      var n = cantidad || 60;
      var colores = ['#ff6b9d', '#ffd166', '#4ecdc4', '#845ec2', '#00b894', '#3d84ff'];
      for (var i = 0; i < n; i++) {
        var p = nuevoNodo('particula confeti');
        var x = Math.random() * window.innerWidth;
        p.style.left = x + 'px';
        p.style.top = '-20px';
        p.style.width = (6 + Math.random() * 8) + 'px';
        p.style.height = (10 + Math.random() * 14) + 'px';
        p.style.background = colores[i % colores.length];
        p.style.borderRadius = '2px';

        var a = p.animate([
          { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
          {
            transform: 'translate(' + (Math.random() * 200 - 100) + 'px, ' +
              (window.innerHeight + 80) + 'px) rotate(' + (Math.random() * 900) + 'deg)',
            opacity: 0.9
          }
        ], {
          duration: 1800 + Math.random() * 1600,
          delay: Math.random() * 700,
          easing: 'cubic-bezier(.35,.15,.6,1)'
        });
        limpiarAl(a, p);
      }
    },

    /* Destello blanco a pantalla completa: la evolución. */
    destello: function (duracion) {
      var d = nuevoNodo('destello');
      var a = d.animate([
        { opacity: 0 },
        { opacity: 1, offset: 0.18 },
        { opacity: 0 }
      ], { duration: duracion || 900, easing: 'ease-out' });
      limpiarAl(a, d);
    },

    /* Aro que se expande: acompaña al acierto rápido sin tapar la sílaba. */
    onda: function (x, y, color) {
      if (reducido()) return;
      var d = nuevoNodo('onda');
      d.style.left = x + 'px';
      d.style.top = y + 'px';
      d.style.borderColor = color || '#fff';
      var a = d.animate([
        { transform: 'translate(-50%,-50%) scale(.2)', opacity: .9 },
        { transform: 'translate(-50%,-50%) scale(2.6)', opacity: 0 }
      ], { duration: 620, easing: 'cubic-bezier(.1,.7,.3,1)' });
      limpiarAl(a, d);
    },

    /* Sacudida breve. Se usa para celebrar, nunca para señalar un error. */
    sacudir: function (el, intensidad) {
      if (!el || reducido()) return;
      var i = intensidad || 6;
      el.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(' + -i + 'px)' },
        { transform: 'translateX(' + i + 'px)' },
        { transform: 'translateX(' + -i / 2 + 'px)' },
        { transform: 'translateX(0)' }
      ], { duration: 300, easing: 'ease-in-out' });
    },

    /* Latido: la criatura reacciona cuando acierta. */
    latir: function (el) {
      if (!el || reducido()) return;
      el.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(1.18)' },
        { transform: 'scale(.96)' },
        { transform: 'scale(1)' }
      ], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    }
  };

  JL.anim = anim;

})(window.JL = window.JL || {});

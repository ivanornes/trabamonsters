/* La tarjeta: lo que se mira. Compartida por los tres modos.

   Dos decisiones de legibilidad aquí:
   - "Pista de color": el grupo consonántico (br) en un color y la vocal en
     otro. Ayuda mucho al principio y se puede apagar cuando ya no la necesita.
   - Minúsculas por defecto, que es lo que ve en los libros del cole. */
(function (JL) {
  'use strict';

  function caso(txt, ajustes) {
    return ajustes && ajustes.mayusculas ? txt.toUpperCase() : txt;
  }

  function span(txt, color, clase) {
    var s = document.createElement('span');
    s.className = clase || '';
    if (color) s.style.color = color;
    s.textContent = txt;
    return s;
  }

  var tarjeta = {
    /* Pinta una sílaba dentro de `cont`. Devuelve el nodo de la tarjeta. */
    silaba: function (cont, id, ajustes) {
      var it = JL.datos.item(id);
      var partes = JL.datos.partes(id);
      var t = document.createElement('div');
      t.className = 'tarjeta tarjeta--silaba tarjeta--entra';
      t.style.setProperty('--color-fam', it ? it.color : '#5b8def');
      t.style.setProperty('--color-fam2', it ? it.color2 : '#a9c4ff');

      var texto = document.createElement('div');
      texto.className = 'tarjeta-texto';

      if (ajustes && ajustes.pistaColor && it && it.tipo === 'trabada') {
        // Sólo el grupo consonántico se colorea. La vocal se deja en tinta:
        // con el color claro de la familia perdía contraste sobre el blanco,
        // y lo que hay que destacar es la trabada, no la vocal.
        texto.appendChild(span(caso(partes[0], ajustes), it.color, 'grupo'));
        texto.appendChild(span(caso(partes[1], ajustes), null, 'vocal'));
      } else {
        texto.appendChild(span(caso(id, ajustes), it ? it.color : null));
      }

      t.appendChild(texto);
      cont.innerHTML = '';
      cont.appendChild(t);
      return t;
    },

    /* Pinta una palabra con su trabada resaltada dentro. */
    palabra: function (cont, w, ajustes) {
      var it = JL.datos.item(w.s);
      var color = it ? it.color : '#5b8def';
      var t = document.createElement('div');
      t.className = 'tarjeta tarjeta--palabra tarjeta--entra';
      t.style.setProperty('--color-fam', color);
      t.style.setProperty('--color-fam2', it ? it.color2 : '#a9c4ff');

      if (w.e) {
        var em = document.createElement('div');
        em.className = 'tarjeta-emoji';
        em.textContent = w.e;
        t.appendChild(em);
      }

      var texto = document.createElement('div');
      texto.className = 'tarjeta-texto tarjeta-texto--palabra';
      var i = w.i >= 0 ? w.i : 0;

      if (i > 0) texto.appendChild(span(caso(w.p.slice(0, i), ajustes)));
      texto.appendChild(span(caso(w.h, ajustes), color, 'resalte'));
      texto.appendChild(span(caso(w.p.slice(i + w.h.length), ajustes)));

      t.appendChild(texto);
      cont.innerHTML = '';
      cont.appendChild(t);
      return t;
    },

    /* Transición sílaba -> palabra: la sílaba se encoge y la palabra crece
       alrededor. Es el momento en que el entrenamiento "se transfiere".

       Devuelve una función para cancelarla: si el bloque termina a mitad,
       nadie debe pintar una palabra encima de lo que venga después. */
    silabaAPalabra: function (cont, w, ajustes, alTerminar) {
      tarjeta.silaba(cont, w.s, ajustes);
      var t = cont.firstChild;
      var t1, t2;

      t1 = setTimeout(function () {
        t.classList.add('tarjeta--transforma');
        t2 = setTimeout(function () {
          tarjeta.palabra(cont, w, ajustes);
          if (alTerminar) alTerminar(cont.firstChild);
        }, 260);
      }, 620);

      return function cancelar() { clearTimeout(t1); clearTimeout(t2); };
    },

    vaciar: function (cont) { cont.innerHTML = ''; },

    /* Texto para la voz: se separa un poco para que no lo lea como palabra. */
    paraVoz: function (id) { return id; }
  };

  JL.ui = JL.ui || {};
  JL.ui.tarjeta = tarjeta;

})(window.JL = window.JL || {});

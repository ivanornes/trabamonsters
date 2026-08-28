/* Generador de criaturas en SVG.

   No hay ficheros de imagen: cada criatura se describe con parámetros y esta
   función la dibuja. La gracia es que la silueta, la mirada y la boca cambian
   en cada fase, así que evolucionar no es "lo mismo pero más grande": es otro
   bicho reconocible como el mismo.

   Tres tonos, porque a los 7-10 años no todo tiene que ser tierno:
     tierno  paleta clara, ojos enormes, mofletes. Da ternura.
     guay    contraste medio, mirada decidida. Ni ñoño ni sombrío.
     oscuro  cuerpo apagado hacia el violeta profundo, ojos que brillan en la
             penumbra y chispas alrededor. Mola sin dar miedo: la boca sigue
             sonriendo y las proporciones siguen siendo de peluche. */
(function (JL) {
  'use strict';

  var ESCALA_FASE = [0.74, 0.88, 1.0];
  var contador = 0;

  // ------------------------------------------------------------- color

  function parse(c) {
    if (c.charAt(0) === '#') {
      var n = parseInt(c.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    var m = c.match(/\d+/g);
    return [+m[0], +m[1], +m[2]];
  }

  function str(v) {
    return 'rgb(' + Math.round(v[0]) + ',' + Math.round(v[1]) + ',' + Math.round(v[2]) + ')';
  }

  function mezclar(a, b, t) {
    var x = parse(a), y = parse(b);
    return str([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
  }

  function aclarar(c, t) { return mezclar(c, '#ffffff', t); }
  function oscurecer(c, t) { return mezclar(c, '#000000', t); }

  var NOCHE = '#241539';

  /* Toda la identidad visual de una criatura sale de aquí. */
  function paleta(def, tono, silueta) {
    if (silueta) {
      return {
        alto: '#2c2c3e', bajo: '#171725', borde: '#101019',
        acento: '#1d1d2b', detalle: '#242434', ojo: '#101019',
        brillo: '#2c2c3e', mofletes: null, resplandor: null
      };
    }
    var c = def.color, c2 = def.color2;
    if (tono === 'oscuro') {
      return {
        alto: mezclar(c, NOCHE, 0.42),
        bajo: mezclar(c, '#100a1e', 0.62),
        borde: '#0c0718',
        acento: mezclar(c2, NOCHE, 0.45),
        detalle: aclarar(c, 0.30),
        ojo: aclarar(c, 0.55),          // los ojos son la luz de la cara
        brillo: '#ffffff',
        mofletes: null,
        resplandor: aclarar(c, 0.45)
      };
    }
    if (tono === 'tierno') {
      return {
        alto: aclarar(c, 0.58),
        bajo: c,
        borde: oscurecer(c, 0.30),
        acento: c2,
        detalle: aclarar(c, 0.42),
        ojo: '#2b2140',
        ojoLuz: oscurecer(c, 0.42),     // mirada "encendida" sobre cuerpo claro
        brillo: '#ffffff',
        mofletes: 'rgba(255,120,150,.42)',
        resplandor: aclarar(c, 0.50)
      };
    }
    return {                            // guay
      alto: aclarar(c, 0.34),
      bajo: oscurecer(c, 0.10),
      borde: oscurecer(c, 0.42),
      acento: c2,
      detalle: aclarar(c, 0.30),
      ojo: '#241b36',
      ojoLuz: oscurecer(c, 0.45),
      brillo: '#ffffff',
      mofletes: null,
      resplandor: aclarar(c, 0.48)
    };
  }

  // --------------------------------------------------------- geometría

  function pt(x, y) { return x.toFixed(1) + ' ' + y.toFixed(1); }

  function elipse(cx, cy, rx, ry) {
    return 'M ' + pt(cx - rx, cy) +
      ' a ' + rx + ' ' + ry + ' 0 1 0 ' + (rx * 2) + ' 0' +
      ' a ' + rx + ' ' + ry + ' 0 1 0 ' + (-rx * 2) + ' 0 Z';
  }

  function rectRedondo(x, y, w, h, r) {
    return 'M ' + pt(x + r, y) +
      ' H ' + (x + w - r).toFixed(1) + ' A ' + r + ' ' + r + ' 0 0 1 ' + pt(x + w, y + r) +
      ' V ' + (y + h - r).toFixed(1) + ' A ' + r + ' ' + r + ' 0 0 1 ' + pt(x + w - r, y + h) +
      ' H ' + (x + r).toFixed(1) + ' A ' + r + ' ' + r + ' 0 0 1 ' + pt(x, y + h - r) +
      ' V ' + (y + r).toFixed(1) + ' A ' + r + ' ' + r + ' 0 0 1 ' + pt(x + r, y) + ' Z';
  }

  function poligono(puntos) {
    return 'M ' + puntos.map(function (p) { return pt(p[0], p[1]); }).join(' L ') + ' Z';
  }

  /* Cada silueta es un `d` de path, para que todas se pinten igual. */
  function cuerpoD(tipo, cx, cy, rx, ry) {
    switch (tipo) {

      case 'gota':
        return 'M ' + pt(cx, cy - ry * 1.18) +
          ' C ' + pt(cx + rx * 1.08, cy - ry * 0.08) + ', ' + pt(cx + rx, cy + ry * 0.82) +
          ', ' + pt(cx, cy + ry) +
          ' C ' + pt(cx - rx, cy + ry * 0.82) + ', ' + pt(cx - rx * 1.08, cy - ry * 0.08) +
          ', ' + pt(cx, cy - ry * 1.18) + ' Z';

      case 'huevo':
        return elipse(cx, cy, rx * 0.9, ry * 1.1);

      case 'cubo':
        return rectRedondo(cx - rx, cy - ry, rx * 2, ry * 2, rx * 0.36);

      case 'estrella': {
        var p = [];
        for (var i = 0; i < 10; i++) {
          var r = i % 2 ? rx * 0.5 : rx * 1.05;
          var a = -Math.PI / 2 + (Math.PI * i) / 5;
          p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * (ry / rx)]);
        }
        return poligono(p);
      }

      /* Llama: asimétrica a propósito, para que parezca que se mueve. */
      case 'llama':
        return 'M ' + pt(cx, cy + ry) +
          ' C ' + pt(cx - rx * 1.06, cy + ry * 0.45) + ', ' + pt(cx - rx * 0.92, cy - ry * 0.35) +
          ', ' + pt(cx - rx * 0.34, cy - ry * 0.72) +
          ' C ' + pt(cx - rx * 0.30, cy - ry * 1.12) + ', ' + pt(cx - rx * 0.10, cy - ry * 1.24) +
          ', ' + pt(cx, cy - ry * 1.48) +
          ' C ' + pt(cx + rx * 0.26, cy - ry * 1.10) + ', ' + pt(cx + rx * 0.20, cy - ry * 0.58) +
          ', ' + pt(cx + rx * 0.52, cy - ry * 0.78) +
          ' C ' + pt(cx + rx * 0.96, cy - ry * 0.40) + ', ' + pt(cx + rx * 1.06, cy + ry * 0.45) +
          ', ' + pt(cx, cy + ry) + ' Z';

      /* Fantasma: cúpula arriba y ondas abajo, sin patas. */
      case 'fantasma': {
        var yb = cy + ry * 0.55, w = (rx * 2) / 3;
        return 'M ' + pt(cx - rx, yb) +
          ' A ' + rx + ' ' + (ry * 1.3) + ' 0 0 1 ' + pt(cx + rx, yb) +
          ' L ' + pt(cx + rx, cy + ry * 0.95) +
          ' q ' + pt(-w / 2, -ry * 0.34) + ' ' + pt(-w, 0) +
          ' q ' + pt(-w / 2, ry * 0.34) + ' ' + pt(-w, 0) +
          ' q ' + pt(-w / 2, -ry * 0.34) + ' ' + pt(-w, 0) + ' Z';
      }

      /* Gema: facetada, con la punta arriba. */
      case 'cristal':
        return poligono([
          [cx, cy - ry * 1.22],
          [cx + rx * 0.98, cy - ry * 0.30],
          [cx + rx * 0.62, cy + ry * 0.98],
          [cx - rx * 0.62, cy + ry * 0.98],
          [cx - rx * 0.98, cy - ry * 0.30]
        ]);

      case 'seta':
        return 'M ' + pt(cx - rx, cy + ry * 0.02) +
          ' A ' + rx + ' ' + (ry * 1.15) + ' 0 0 1 ' + pt(cx + rx, cy + ry * 0.02) +
          ' L ' + pt(cx + rx * 0.36, cy + ry * 0.02) +
          ' L ' + pt(cx + rx * 0.36, cy + ry * 0.88) +
          ' q ' + pt(0, ry * 0.22) + ' ' + pt(-rx * 0.36, ry * 0.22) +
          ' q ' + pt(-rx * 0.36, 0) + ' ' + pt(-rx * 0.36, -ry * 0.22) +
          ' L ' + pt(cx - rx * 0.36, cy + ry * 0.02) + ' Z';

      case 'nube':
        return 'M ' + pt(cx - rx, cy + ry * 0.55) +
          ' a ' + (rx * 0.46) + ' ' + (rx * 0.46) + ' 0 0 1 ' + pt(rx * 0.30, -ry * 0.88) +
          ' a ' + (rx * 0.56) + ' ' + (rx * 0.56) + ' 0 0 1 ' + pt(rx * 1.40, -ry * 0.05) +
          ' a ' + (rx * 0.44) + ' ' + (rx * 0.44) + ' 0 0 1 ' + pt(rx * 0.30, ry * 0.93) + ' Z';

      /* Bestia: ancha y peluda. Los mechones del bajo van redondeados y poco
         profundos; en pico y a contraluz se leían como una dentadura. */
      case 'bestia': {
        var n = 6, paso = (rx * 2) / n;
        var d = 'M ' + pt(cx - rx, cy + ry * 0.52) +
          ' A ' + rx + ' ' + (ry * 1.10) + ' 0 0 1 ' + pt(cx + rx, cy + ry * 0.52);
        for (var k = 0; k < n; k++) {
          d += ' q ' + pt(-paso * 0.18, ry * 0.30) + ' ' + pt(-paso, ry * 0.04);
        }
        return d + ' Z';
      }

      case 'pua':
      case 'blob':
      default:
        return elipse(cx, cy, rx, ry);
    }
  }

  // ----------------------------------------------------------- adornos

  /* Las alas salen del costado, no de la cabeza, y bajan hacia atrás: si nacen
     arriba se leen como orejas, que fue el primer error de este generador.
     El borde inferior va festoneado para que se lean como plumas. */
  function alas(cx, cy, rx, ry, color, tipo, borde) {
    /* El contorno es lo que separa un ala de una oreja: sin él, un ala del
       mismo color que el cuerpo se lee como una oreja grande. */
    var trazo = ' stroke="' + borde + '" stroke-width="2.5" stroke-linejoin="round"';
    function ala(s) {
      var ax = cx + s * rx * 0.58, ay = cy - ry * 0.28;

      if (tipo === 'murcielago') {
        return '<path d="M ' + pt(ax, ay) +
          ' L ' + pt(ax + s * rx * 1.05, ay - ry * 0.52) +
          ' L ' + pt(ax + s * rx * 0.98, ay + ry * 0.28) +
          ' L ' + pt(ax + s * rx * 0.74, ay + ry * 0.14) +
          ' L ' + pt(ax + s * rx * 0.72, ay + ry * 0.74) +
          ' L ' + pt(ax + s * rx * 0.46, ay + ry * 0.44) +
          ' L ' + pt(ax + s * rx * 0.40, ay + ry * 0.92) +
          ' Z" fill="' + color + '"' + trazo + '/>';
      }

      return '<path d="M ' + pt(ax, ay) +
        ' Q ' + pt(ax + s * rx * 0.86, ay - ry * 0.60) + ' ' + pt(ax + s * rx * 1.06, ay + ry * 0.14) +
        ' q ' + pt(s * -rx * 0.08, ry * 0.34) + ' ' + pt(s * -rx * 0.32, ry * 0.28) +
        ' q ' + pt(s * -rx * 0.02, ry * 0.28) + ' ' + pt(s * -rx * 0.30, ry * 0.18) +
        ' q ' + pt(s * -rx * 0.02, ry * 0.24) + ' ' + pt(s * -rx * 0.28, ry * 0.08) +
        ' Z" fill="' + color + '"' + trazo + '/>';
    }
    return '<g class="cr-alas">' + ala(-1) + ala(1) + '</g>';
  }

  function cola(cx, cy, rx, ry, color, tipo) {
    if (tipo === 'fuego') {
      return '<g class="cr-cola"><path d="M ' + pt(cx + rx * 0.72, cy + ry * 0.40) +
        ' q ' + pt(rx * 0.90, 0) + ' ' + pt(rx * 0.72, -ry * 0.80) +
        ' q ' + pt(rx * 0.10, ry * 0.66) + ' ' + pt(-rx * 0.50, ry * 0.98) +
        ' Z" fill="' + color + '"/></g>';
    }
    return '<g class="cr-cola"><path d="M ' + pt(cx + rx * 0.74, cy + ry * 0.36) +
      ' q ' + pt(rx * 0.86, ry * 0.10) + ' ' + pt(rx * 0.70, -ry * 0.74) +
      ' q ' + pt(rx * 0.32, ry * 0.54) + ' ' + pt(-rx * 0.42, ry * 0.94) +
      ' Z" fill="' + color + '"/></g>';
  }

  function melena(cx, cy, rx, ry, color) {
    var d = '', n = 12;
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n;
      var x = cx + Math.cos(a) * rx * 0.92;
      var y = cy + Math.sin(a) * ry * 0.92;
      d += '<path d="M ' + pt(x, y) +
        ' L ' + pt(cx + Math.cos(a - 0.16) * rx * 1.42, cy + Math.sin(a - 0.16) * ry * 1.42) +
        ' L ' + pt(cx + Math.cos(a + 0.16) * rx * 1.30, cy + Math.sin(a + 0.16) * ry * 1.30) +
        ' Z" fill="' + color + '"/>';
    }
    return '<g class="cr-melena">' + d + '</g>';
  }

  /* Tentáculos: lóbulos redondeados que cuelgan por debajo del cuerpo. Cortos
     y en pico parecían una dentadura, así que van largos y romos. */
  function tentaculos(cx, cy, rx, ry, color, borde) {
    var d = '';
    for (var i = -2; i <= 2; i++) {
      var x = cx + i * rx * 0.34;
      var an = rx * 0.15;
      var largo = ry * (0.62 - Math.abs(i) * 0.10);
      d += '<path d="M ' + pt(x - an, cy + ry * 0.52) +
        ' L ' + pt(x - an, cy + ry * 0.52 + largo) +
        ' a ' + an.toFixed(1) + ' ' + an.toFixed(1) + ' 0 0 0 ' + pt(an * 2, 0) +
        ' L ' + pt(x + an, cy + ry * 0.52) +
        ' Z" fill="' + color + '" stroke="' + borde + '" stroke-width="2"/>';
    }
    return '<g class="cr-tentaculos">' + d + '</g>';
  }

  function pinchos(cx, cy, rx, ry, color) {
    var d = '';
    for (var i = -2; i <= 2; i++) {
      var x = cx + i * rx * 0.34;
      d += '<path d="M ' + pt(x - rx * 0.15, cy - ry * 0.52) +
        ' L ' + pt(x, cy - ry * (1.18 - Math.abs(i) * 0.10)) +
        ' L ' + pt(x + rx * 0.15, cy - ry * 0.52) + ' Z" fill="' + color + '"/>';
    }
    return d;
  }

  function cuernos(cx, cy, rx, ry, color, curvos) {
    function c(s) {
      var x = cx + s * rx * 0.52, y = cy - ry * 0.82;
      if (curvos) {
        return '<path d="M ' + pt(x, y) +
          ' q ' + pt(s * rx * 0.34, -ry * 0.52) + ' ' + pt(s * rx * 0.04, -ry * 0.66) +
          ' q ' + pt(s * -rx * 0.06, ry * 0.30) + ' ' + pt(s * -rx * 0.30, ry * 0.60) +
          ' Z" fill="' + color + '"/>';
      }
      return '<path d="M ' + pt(x, y) +
        ' L ' + pt(x + s * rx * 0.10, y - ry * 0.46) +
        ' L ' + pt(x + s * rx * 0.24, y + ry * 0.34) + ' Z" fill="' + color + '"/>';
    }
    return c(-1) + c(1);
  }

  /* Orejas al lado de la cabeza y con interior más claro. Puestas arriba y sin
     relleno interior se confundían con cuernos. */
  function orejas(cx, cy, rx, ry, color, gato, interior) {
    function o(s) {
      if (gato) {
        var bx = cx + s * rx * 0.52, by = cy - ry * 0.62;
        return '<path d="M ' + pt(bx - rx * 0.24, by + ry * 0.30) +
          ' L ' + pt(bx + s * rx * 0.10, by - ry * 0.52) +
          ' L ' + pt(bx + rx * 0.24, by + ry * 0.26) + ' Z" fill="' + color + '"/>' +
          '<path d="M ' + pt(bx - rx * 0.13, by + ry * 0.22) +
          ' L ' + pt(bx + s * rx * 0.07, by - ry * 0.24) +
          ' L ' + pt(bx + rx * 0.13, by + ry * 0.20) + ' Z" fill="' + interior + '"/>';
      }
      var x = cx + s * rx * 0.86, y = cy - ry * 0.38;
      var giro = 'rotate(' + (s * 26) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')';
      return '<g transform="' + giro + '">' +
        '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) +
        '" rx="' + (rx * 0.28).toFixed(1) + '" ry="' + (ry * 0.44).toFixed(1) +
        '" fill="' + color + '"/>' +
        '<ellipse cx="' + x.toFixed(1) + '" cy="' + (y + ry * 0.04).toFixed(1) +
        '" rx="' + (rx * 0.15).toFixed(1) + '" ry="' + (ry * 0.26).toFixed(1) +
        '" fill="' + interior + '"/></g>';
    }
    return o(-1) + o(1);
  }

  function antenas(cx, cy, rx, ry, color, acento) {
    function a(s) {
      var x0 = cx + s * rx * 0.28, y0 = cy - ry * 0.82;
      var x1 = cx + s * rx * 0.52, y1 = cy - ry * 1.42;
      return '<path d="M ' + pt(x0, y0) + ' Q ' + pt(x0 + s * rx * 0.04, y0 - ry * 0.42) +
        ' ' + pt(x1, y1) + '" stroke="' + color + '" stroke-width="' + (rx * 0.09).toFixed(1) +
        '" fill="none" stroke-linecap="round"/>' +
        '<circle class="cr-bola" cx="' + x1.toFixed(1) + '" cy="' + y1.toFixed(1) +
        '" r="' + (rx * 0.15).toFixed(1) + '" fill="' + acento + '"/>';
    }
    return '<g class="cr-antenas">' + a(-1) + a(1) + '</g>';
  }

  function cresta(cx, cy, rx, ry, color) {
    var p = [], n = 5;
    for (var i = 0; i <= n; i++) {
      p.push(pt(cx - rx * 0.55 + (rx * 1.1 * i) / n, cy - ry * (i % 2 ? 1.30 : 0.90)));
    }
    return '<polyline points="' + p.join(' ') + '" fill="none" stroke="' + color +
      '" stroke-width="' + (rx * 0.17).toFixed(1) +
      '" stroke-linejoin="round" stroke-linecap="round"/>';
  }

  /* Llamitas sobre la cabeza: dan el aire "encendido" sin quemar la silueta. */
  function llamitas(cx, cy, rx, ry, color, acento) {
    var d = '<g class="cr-llamitas">';
    [[-0.42, 0.86], [0, 1.06], [0.42, 0.82]].forEach(function (p, i) {
      var x = cx + rx * p[0], y = cy - ry * p[1];
      var h = ry * (0.30 + (i === 1 ? 0.16 : 0));
      d += '<path d="M ' + pt(x, y - h) +
        ' q ' + pt(rx * 0.20, h * 0.62) + ' ' + pt(0, h) +
        ' q ' + pt(-rx * 0.20, -h * 0.38) + ' ' + pt(0, -h) +
        ' Z" fill="' + (i === 1 ? acento : color) + '"/>';
    });
    return d + '</g>';
  }

  function corona(cx, cy, rx, ry) {
    var y = cy - ry * 0.92, w = rx * 0.86;
    return '<g class="cr-corona"><path d="M ' + pt(cx - w, y) +
      ' l ' + pt(w * 0.36, -ry * 0.44) + ' l ' + pt(w * 0.32, ry * 0.24) +
      ' l ' + pt(w * 0.32, -ry * 0.52) + ' l ' + pt(w * 0.32, ry * 0.24) +
      ' l ' + pt(w * 0.36, -ry * 0.44) + ' l ' + pt(0, ry * 0.64) +
      ' Z" fill="#ffd166" stroke="#d99a12" stroke-width="2" stroke-linejoin="round"/>' +
      '<circle cx="' + cx + '" cy="' + (y - ry * 0.16).toFixed(1) + '" r="' +
      (rx * 0.09).toFixed(1) + '" fill="#ff6b9d"/></g>';
  }

  function aureola(cx, cy, rx, ry, color) {
    return '<ellipse class="cr-aureola" cx="' + cx + '" cy="' + (cy - ry * 1.30).toFixed(1) +
      '" rx="' + (rx * 0.52).toFixed(1) + '" ry="' + (ry * 0.13).toFixed(1) +
      '" fill="none" stroke="' + color + '" stroke-width="' + (rx * 0.09).toFixed(1) + '"/>';
  }

  function gema(cx, cy, rx, ry, color, brillo) {
    var y = cy - ry * 0.46;
    return '<g class="cr-gema"><path d="' + poligono([
      [cx, y - ry * 0.22], [cx + rx * 0.15, y], [cx, y + ry * 0.24], [cx - rx * 0.15, y]
    ]) + '" fill="' + color + '" stroke="' + brillo + '" stroke-width="1.5"/></g>';
  }

  // -------------------------------------------------------------- cara

  function pupila(x, y, r, tipo, pal) {
    if (tipo === 'estrella') {
      var p = [];
      for (var i = 0; i < 10; i++) {
        var rr = i % 2 ? r * 0.42 : r;
        var a = -Math.PI / 2 + (Math.PI * i) / 5;
        p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
      }
      return '<path d="' + poligono(p) + '" fill="' + pal.ojo + '"/>';
    }
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) +
      '" fill="' + pal.ojo + '"/>';
  }

  /* La mirada es donde vive el carácter, así que hay bastantes variantes. */
  function ojos(tipo, n, cx, cy, rx, ry, fase, pal, tono) {
    var r = rx * (fase === 0 ? 0.27 : 0.22);
    var yy = cy - ry * 0.16;
    var pos = n === 3
      ? [[cx - rx * 0.44, yy], [cx, yy - ry * 0.20], [cx + rx * 0.44, yy]]
      : n === 1
        ? [[cx, yy]]
        : [[cx - rx * 0.31, yy], [cx + rx * 0.31, yy]];
    if (n === 1) r = rx * 0.40;

    var out = '<g class="cr-ojos">';

    pos.forEach(function (p) {
      var x = p[0], y = p[1];

      if (tipo === 'brillantes') {
        // Sin blanco: una lente encendida, con halo alrededor. En los cuerpos
        // oscuros parece que ven en la penumbra; en los claros, una joya.
        var lente = tono === 'oscuro' ? pal.ojo : (pal.ojoLuz || pal.ojo);
        out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' +
          (r * 1.75).toFixed(1) + '" fill="' + pal.resplandor + '" opacity=".30"/>' +
          '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="' + r.toFixed(1) +
          '" ry="' + (r * 1.12).toFixed(1) + '" fill="' + lente + '"/>' +
          '<ellipse cx="' + (x + r * 0.22).toFixed(1) + '" cy="' + (y - r * 0.18).toFixed(1) +
          '" rx="' + (r * 0.30).toFixed(1) + '" ry="' + (r * 0.52).toFixed(1) +
          '" fill="' + pal.brillo + '" opacity=".85"/>';
        return;
      }

      // Base blanca común al resto de miradas
      out += '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="' + r.toFixed(1) +
        '" ry="' + (r * 1.10).toFixed(1) + '" fill="#fff"/>';

      if (tipo === 'dormilon') {
        out += pupila(x, y + r * 0.22, r * 0.44, 'redonda', pal);
        out += '<path d="M ' + pt(x - r, y - r * 0.10) + ' a ' + r + ' ' + r +
          ' 0 0 1 ' + pt(r * 2, 0) + ' Z" fill="' + pal.borde + '"/>';
      } else {
        out += pupila(x + r * 0.14, y + r * 0.10, r * (tipo === 'estrella' ? 0.56 : 0.50),
          tipo === 'estrella' ? 'estrella' : 'redonda', pal);
        out += '<circle cx="' + (x + r * 0.44).toFixed(1) + '" cy="' + (y - r * 0.36).toFixed(1) +
          '" r="' + (r * 0.21).toFixed(1) + '" fill="#fff"/>';
      }

      if (tipo === 'fieros') {
        // Una ceja inclinada basta para pasar de tierno a decidido. Tiene que
        // rozar el ojo, no taparlo: si lo cubre, la cara se queda sin mirada.
        var s = x < cx ? 1 : -1;
        out += '<path d="M ' + pt(x - r * 1.20, y - r * 1.45) +
          ' L ' + pt(x + r * 1.20, y - r * (1.45 - s * 0.48)) +
          ' L ' + pt(x + r * 1.20, y - r * (0.95 - s * 0.48)) +
          ' L ' + pt(x - r * 1.20, y - r * 0.95) + ' Z" fill="' + pal.borde + '"/>';
      }
    });

    out += '</g>';

    // Párpados: bajan un instante cada pocos segundos (CSS).
    out += '<g class="cr-parpados" style="color:' + pal.borde + '">';
    pos.forEach(function (p) {
      out += '<ellipse cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) +
        '" rx="' + (r * 1.06).toFixed(1) + '" ry="' + (r * 1.18).toFixed(1) + '"/>';
    });
    out += '</g>';
    return out;
  }

  function boca(tipo, cx, cy, rx, ry, pal) {
    var y = cy + ry * 0.30, w = rx * 0.32;
    var trazo = (rx * 0.075).toFixed(1);

    if (tipo === 'ninguna') return '';

    if (tipo === 'gato') {
      return '<path d="M ' + pt(cx - w, y) + ' q ' + pt(w * 0.5, ry * 0.20) + ' ' + pt(w, 0) +
        ' q ' + pt(w * 0.5, -ry * 0.20) + ' ' + pt(w, 0) +
        '" stroke="' + pal.borde + '" stroke-width="' + trazo +
        '" fill="none" stroke-linecap="round"/>';
    }

    if (tipo === 'pico') {
      return '<path d="' + poligono([
        [cx - w * 0.62, y - ry * 0.04], [cx + w * 0.62, y - ry * 0.04], [cx, y + ry * 0.26]
      ]) + '" fill="#ffb037" stroke="' + pal.borde + '" stroke-width="1.5" stroke-linejoin="round"/>';
    }

    if (tipo === 'dientes') {
      // Sonrisa dentona: da aire de bicho travieso, no de monstruo.
      var d = '<path d="M ' + pt(cx - w * 1.25, y - ry * 0.06) +
        ' q ' + pt(w * 1.25, ry * 0.40) + ' ' + pt(w * 2.5, 0) + ' Z" fill="' + pal.borde + '"/>';
      for (var i = 0; i < 5; i++) {
        var x0 = cx - w * 1.15 + (w * 2.3 * i) / 5;
        d += '<path d="' + poligono([
          [x0, y - ry * 0.05], [x0 + w * 0.46, y - ry * 0.05], [x0 + w * 0.23, y + ry * 0.13]
        ]) + '" fill="#fff"/>';
      }
      return d;
    }

    var base = '<path d="M ' + pt(cx - w, y) + ' q ' + pt(w, ry * 0.30) + ' ' + pt(w * 2, 0) +
      '" stroke="' + pal.borde + '" stroke-width="' + trazo +
      '" fill="none" stroke-linecap="round"/>';

    if (tipo === 'colmillos') {
      base += '<path d="' + poligono([
        [cx - w * 0.58, y + ry * 0.04], [cx - w * 0.36, y + ry * 0.04], [cx - w * 0.47, y + ry * 0.22]
      ]) + '" fill="#fff"/>' +
        '<path d="' + poligono([
          [cx + w * 0.36, y + ry * 0.06], [cx + w * 0.58, y + ry * 0.06], [cx + w * 0.47, y + ry * 0.24]
        ]) + '" fill="#fff"/>';
    }
    return base;
  }

  function patron(tipo, cx, cy, rx, ry, color, sem) {
    var out = '', i;
    if (tipo === 'puntos') {
      for (i = 0; i < 4; i++) {
        var a = (sem % 7) * 0.3 + i * 1.7;
        out += '<circle cx="' + (cx + Math.cos(a) * rx * 0.52).toFixed(1) +
          '" cy="' + (cy + Math.sin(a) * ry * 0.45).toFixed(1) +
          '" r="' + (rx * (0.08 + (i % 2) * 0.04)).toFixed(1) +
          '" fill="' + color + '" opacity=".55"/>';
      }
    } else if (tipo === 'rayas') {
      for (i = 0; i < 3; i++) {
        var yy = cy - ry * 0.35 + i * ry * 0.42;
        out += '<path d="M ' + pt(cx - rx * 0.62, yy) + ' q ' + pt(rx * 0.62, ry * 0.22) +
          ' ' + pt(rx * 1.24, 0) + '" stroke="' + color + '" stroke-width="' +
          (ry * 0.10).toFixed(1) + '" fill="none" opacity=".45" stroke-linecap="round"/>';
      }
    } else if (tipo === 'brillos') {
      for (i = 0; i < 3; i++) {
        var bx = cx - rx * 0.45 + i * rx * 0.45, by = cy - ry * 0.30 + (i % 2) * ry * 0.50;
        var s = rx * 0.13;
        out += '<path d="M ' + pt(bx, by - s) + ' Q ' + pt(bx, by) + ' ' + pt(bx + s, by) +
          ' Q ' + pt(bx, by) + ' ' + pt(bx, by + s) + ' Q ' + pt(bx, by) + ' ' + pt(bx - s, by) +
          ' Q ' + pt(bx, by) + ' ' + pt(bx, by - s) + ' Z" fill="' + color + '" opacity=".7"/>';
      }
    } else if (tipo === 'facetas') {
      out += '<path d="M ' + pt(cx, cy - ry * 1.10) + ' L ' + pt(cx - rx * 0.45, cy + ry * 0.90) +
        ' M ' + pt(cx, cy - ry * 1.10) + ' L ' + pt(cx + rx * 0.45, cy + ry * 0.90) +
        '" stroke="' + color + '" stroke-width="' + (rx * 0.06).toFixed(1) +
        '" fill="none" opacity=".5"/>';
    } else if (tipo === 'parches') {
      out += '<circle cx="' + (cx - rx * 0.42).toFixed(1) + '" cy="' + (cy + ry * 0.10).toFixed(1) +
        '" r="' + (rx * 0.26).toFixed(1) + '" fill="' + color + '" opacity=".45"/>' +
        '<circle cx="' + (cx + rx * 0.40).toFixed(1) + '" cy="' + (cy + ry * 0.38).toFixed(1) +
        '" r="' + (rx * 0.18).toFixed(1) + '" fill="' + color + '" opacity=".45"/>';
    }
    return out;
  }

  // ------------------------------------------------------------ montaje

  function semilla(txt) {
    var h = 0;
    for (var i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) % 9973;
    return h;
  }

  /* Los parámetros de una fase: lo común de `base` más lo que cambia. */
  function rasgos(def, fase) {
    var r = {};
    var b = def.base || def;
    ['cuerpo', 'patron', 'ojos', 'ojosTipo', 'boca', 'tono'].forEach(function (k) {
      if (b[k] !== undefined) r[k] = b[k];
    });
    var f = (def.fases && def.fases[fase]) || {};
    Object.keys(f).forEach(function (k) { r[k] = f[k]; });
    if (!r.extra) r.extra = [];
    if (typeof r.extra === 'string') r.extra = r.extra.split('-');
    if (!r.ojos) r.ojos = 2;
    if (!r.ojosTipo) r.ojosTipo = 'grandes';
    if (!r.boca) r.boca = 'sonrisa';
    if (!r.cuerpo) r.cuerpo = 'blob';
    return r;
  }

  function svg(def, fase, opts) {
    opts = opts || {};
    fase = Math.max(0, Math.min(2, fase | 0));

    var tam = opts.tamano || 200;
    var sem = semilla(def.familia || def.nombres[0]);
    var s = ESCALA_FASE[fase];
    var r = rasgos(def, fase);
    var tono = r.tono || def.tono || 'guay';
    var pal = paleta(def, tono, opts.silueta);
    var tiene = function (x) { return r.extra.indexOf(x) >= 0; };

    var cx = 100;
    var cy = 118 + (1 - s) * 14;
    var rx = 52 * s;
    var ry = (r.cuerpo === 'huevo' || r.cuerpo === 'llama' ? 50 : 48) * s;
    if (r.cuerpo === 'bestia' || r.cuerpo === 'nube') rx = 58 * s;

    var gradId = 'g' + (++contador);
    var g = '';

    // --- resplandor de fondo (adultas y oscuras)
    if (!opts.silueta && (fase === 2 || tono === 'oscuro')) {
      // En las oscuras el aura va más ceñida: ancha se veía como un plato
      // pálido detrás de la criatura sobre los fondos claros del álbum.
      var rAura = tono === 'oscuro' ? rx * 1.26 : rx * 1.55;
      g += '<circle class="cr-aura" cx="' + cx + '" cy="' + cy + '" r="' + rAura.toFixed(1) +
        '" fill="' + (pal.resplandor || pal.alto) + '" opacity="' + (tono === 'oscuro' ? '.17' : '.3') + '"/>';
    }

    // --- capas de detrás
    if (tiene('melena')) g += melena(cx, cy, rx, ry, pal.acento);
    if (tiene('alas')) g += alas(cx, cy, rx, ry, pal.acento, 'pluma', pal.borde);
    if (tiene('alasmurcielago')) g += alas(cx, cy, rx, ry, pal.bajo, 'murcielago', pal.borde);
    if (tiene('cola')) g += cola(cx, cy, rx, ry, pal.borde, 'normal');
    if (tiene('colafuego')) g += cola(cx, cy, rx, ry, pal.acento, 'fuego');
    if (tiene('tentaculos')) g += tentaculos(cx, cy, rx, ry, pal.bajo, pal.borde);
    if (tiene('pinchos') || r.cuerpo === 'pua') g += pinchos(cx, cy, rx, ry, pal.borde);

    // --- pies (los que flotan no los llevan)
    var flota = r.cuerpo === 'fantasma' || r.cuerpo === 'nube' || tiene('tentaculos');
    if (!flota) {
      g += '<ellipse cx="' + (cx - rx * 0.42).toFixed(1) + '" cy="' + (cy + ry * 0.94).toFixed(1) +
        '" rx="' + (rx * 0.28).toFixed(1) + '" ry="' + (ry * 0.16).toFixed(1) + '" fill="' + pal.borde + '"/>' +
        '<ellipse cx="' + (cx + rx * 0.42).toFixed(1) + '" cy="' + (cy + ry * 0.94).toFixed(1) +
        '" rx="' + (rx * 0.28).toFixed(1) + '" ry="' + (ry * 0.16).toFixed(1) + '" fill="' + pal.borde + '"/>';
    }

    // --- cuerpo
    g += '<path d="' + cuerpoD(r.cuerpo, cx, cy, rx, ry) + '" fill="url(#' + gradId +
      ')" stroke="' + pal.borde + '" stroke-width="3" stroke-linejoin="round"/>';

    if (!opts.silueta) {
      // Volumen: una luz suave arriba a la izquierda.
      g += '<ellipse cx="' + (cx - rx * 0.34).toFixed(1) + '" cy="' + (cy - ry * 0.48).toFixed(1) +
        '" rx="' + (rx * 0.34).toFixed(1) + '" ry="' + (ry * 0.24).toFixed(1) +
        '" fill="#fff" opacity=".16" transform="rotate(-22 ' + cx + ' ' + cy + ')"/>';

      // Barriga y patrón
      // Las siluetas con forma propia (facetas, nube, sombrero) pierden su
      // dibujo si se les pone la barriga encima.
      if (['cristal', 'nube', 'seta', 'estrella'].indexOf(r.cuerpo) < 0) {
        g += '<ellipse cx="' + cx + '" cy="' + (cy + ry * 0.24).toFixed(1) +
          '" rx="' + (rx * 0.56).toFixed(1) + '" ry="' + (ry * 0.50).toFixed(1) +
          '" fill="' + pal.acento + '" opacity="' + (tono === 'oscuro' ? '.45' : '.8') + '"/>';
      }
      g += patron(r.patron, cx, cy, rx, ry, pal.detalle, sem);

      // --- adornos de delante
      if (tiene('cuernos')) g += cuernos(cx, cy, rx, ry, pal.borde, false);
      if (tiene('cuernoscurvos')) g += cuernos(cx, cy, rx, ry, pal.borde, true);
      if (tiene('orejas')) g += orejas(cx, cy, rx, ry, pal.bajo, false, pal.acento);
      if (tiene('orejasgato')) g += orejas(cx, cy, rx, ry, pal.bajo, true, pal.acento);
      if (tiene('cresta')) g += cresta(cx, cy, rx, ry, pal.borde);
      if (tiene('antenas')) g += antenas(cx, cy, rx, ry, pal.borde, pal.acento);
      if (tiene('llamitas')) g += llamitas(cx, cy, rx, ry, pal.acento, pal.detalle);
      if (tiene('aureola')) g += aureola(cx, cy, rx, ry, pal.detalle);
      if (tiene('gema')) g += gema(cx, cy, rx, ry, pal.acento, pal.brillo);
      if (tiene('corona')) g += corona(cx, cy, rx, ry);

      // --- cara
      if (pal.mofletes) {
        g += '<ellipse cx="' + (cx - rx * 0.60).toFixed(1) + '" cy="' + (cy + ry * 0.08).toFixed(1) +
          '" rx="' + (rx * 0.17).toFixed(1) + '" ry="' + (rx * 0.11).toFixed(1) +
          '" fill="' + pal.mofletes + '"/>' +
          '<ellipse cx="' + (cx + rx * 0.60).toFixed(1) + '" cy="' + (cy + ry * 0.08).toFixed(1) +
          '" rx="' + (rx * 0.17).toFixed(1) + '" ry="' + (rx * 0.11).toFixed(1) +
          '" fill="' + pal.mofletes + '"/>';
      }
      g += ojos(r.ojosTipo, r.ojos, cx, cy, rx, ry, fase, pal, tono);
      g += boca(r.boca, cx, cy, rx, ry, pal);

      // --- chispas de las adultas y de las oscuras
      if (fase === 2 || tono === 'oscuro') {
        var chispa = tono === 'oscuro' ? (pal.resplandor || '#fff') : '#fff';
        g += '<g class="cr-chispas">' +
          '<circle cx="' + (cx - rx * 1.24).toFixed(1) + '" cy="' + (cy - ry * 0.85).toFixed(1) + '" r="4" fill="' + chispa + '"/>' +
          '<circle cx="' + (cx + rx * 1.30).toFixed(1) + '" cy="' + (cy - ry * 0.32).toFixed(1) + '" r="5" fill="' + chispa + '"/>' +
          '<circle cx="' + (cx + rx * 0.95).toFixed(1) + '" cy="' + (cy - ry * 1.16).toFixed(1) + '" r="3" fill="' + chispa + '"/>' +
          '</g>';
      }
    }

    var defs = '<defs><linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + pal.alto + '"/>' +
      '<stop offset="1" stop-color="' + pal.bajo + '"/></linearGradient></defs>';

    return '<svg class="criatura-svg" viewBox="0 0 200 200" width="' + tam + '" height="' + tam +
      '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + defs + g + '</svg>';
  }

  function nodo(def, fase, opts) {
    var cont = document.createElement('div');
    cont.className = 'criatura' + (JL.anim && JL.anim.reducido() ? '' : ' criatura--viva');
    cont.innerHTML = svg(def, fase, opts);
    return cont;
  }

  JL.ui = JL.ui || {};
  JL.ui.criatura = { svg: svg, nodo: nodo, ESCALA_FASE: ESCALA_FASE, rasgos: rasgos };

})(window.JL = window.JL || {});

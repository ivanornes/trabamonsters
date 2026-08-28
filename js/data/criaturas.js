/* Una criatura por familia de trabadas. Criaturas originales: el nombre lleva
   dentro la sílaba que entrena, así el refuerzo visual y el fonético coinciden.

   Las 3 fases se corresponden con la automaticidad de su familia:
     fase 0: 0-39 %   (cría)
     fase 1: 40-74 %  (joven)
     fase 2: 75-100 % (adulta)

   Cada fase puede cambiar la silueta entera, no sólo el tamaño: una cría con
   forma de gota puede acabar siendo una llama con alas. Evolucionar tiene que
   notarse de un vistazo desde el otro lado de la habitación.

   El reparto de tonos es a propósito: cinco tiernas, cuatro con carácter y
   tres oscuras. A los 7-10 años no todo el mundo quiere un peluche, pero
   tampoco hace falta dar miedo: las oscuras siguen sonriendo. */
(function (JL) {
  'use strict';

  var CRIATURAS = {

    // ---------------------------------------------------------- tiernas

    PL: {
      familia: 'PL', tono: 'tierno',
      nombres: ['Plumita', 'Plumón', 'Plumarax'],
      base: { patron: 'puntos' },
      fases: [
        { cuerpo: 'huevo', ojos: 2, ojosTipo: 'grandes', boca: 'pico', extra: ['antenas'] },
        { cuerpo: 'gota', ojosTipo: 'grandes', boca: 'pico', extra: ['alas', 'cresta'] },
        { cuerpo: 'gota', ojosTipo: 'estrella', boca: 'pico', extra: ['alas', 'corona', 'cola'] }
      ],
      lema: 'Ligera como una pluma, terca como un plato vacío.'
    },

    FR: {
      familia: 'FR', tono: 'tierno',
      nombres: ['Fresita', 'Fresor', 'Fresaurio'],
      base: { patron: 'puntos' },
      fases: [
        { cuerpo: 'gota', ojosTipo: 'grandes', boca: 'gato', extra: [] },
        { cuerpo: 'gota', ojosTipo: 'grandes', boca: 'gato', extra: ['orejasgato', 'cola'] },
        { cuerpo: 'blob', ojosTipo: 'estrella', boca: 'colmillos', extra: ['orejasgato', 'alas', 'cola'] }
      ],
      lema: 'Huele a fresa fresca y muerde fruta, nada más.'
    },

    BL: {
      familia: 'BL', tono: 'tierno',
      nombres: ['Blandi', 'Blandín', 'Blandón'],
      base: { patron: 'parches' },
      fases: [
        { cuerpo: 'blob', ojosTipo: 'grandes', boca: 'sonrisa', extra: [] },
        { cuerpo: 'blob', ojosTipo: 'grandes', boca: 'sonrisa', extra: ['orejas', 'tentaculos'] },
        { cuerpo: 'blob', ojosTipo: 'estrella', boca: 'gato', extra: ['orejas', 'tentaculos', 'corona', 'gema'] }
      ],
      lema: 'Blandito, abrazable y sorprendentemente difícil de despeinar.'
    },

    GL: {
      familia: 'GL', tono: 'tierno',
      nombres: ['Globi', 'Globín', 'Globerto'],
      base: { patron: 'brillos' },
      fases: [
        { cuerpo: 'blob', ojosTipo: 'grandes', boca: 'sonrisa', extra: ['antenas'] },
        { cuerpo: 'nube', ojosTipo: 'grandes', boca: 'sonrisa', extra: ['antenas'] },
        { cuerpo: 'nube', ojosTipo: 'estrella', boca: 'sonrisa', extra: ['antenas', 'aureola', 'alas'] }
      ],
      lema: 'Flota como un globo. Nadie sabe cómo aterriza.'
    },

    PR: {
      familia: 'PR', tono: 'tierno',
      nombres: ['Prisma', 'Primón', 'Primordio'],
      base: { patron: 'rayas' },
      fases: [
        { cuerpo: 'huevo', ojosTipo: 'grandes', boca: 'sonrisa', extra: [] },
        { cuerpo: 'huevo', ojosTipo: 'grandes', boca: 'sonrisa', extra: ['orejas', 'gema'] },
        { cuerpo: 'blob', ojosTipo: 'estrella', boca: 'sonrisa', extra: ['corona', 'alas', 'gema'] }
      ],
      lema: 'Siempre se lleva el premio. Y lo comparte.'
    },

    // ------------------------------------------------------------- guays

    TR: {
      familia: 'TR', tono: 'guay',
      nombres: ['Trino', 'Tridón', 'Tridonte'],
      base: { patron: 'rayas' },
      fases: [
        { cuerpo: 'blob', ojos: 3, ojosTipo: 'grandes', boca: 'sonrisa', extra: [] },
        { cuerpo: 'pua', ojos: 3, ojosTipo: 'fieros', boca: 'colmillos', extra: ['cresta'] },
        { cuerpo: 'pua', ojos: 3, ojosTipo: 'fieros', boca: 'dientes', extra: ['cresta', 'alas', 'cola'] }
      ],
      lema: 'Tres ojos, cero despistes. Corre más que un tren.'
    },

    CR: {
      familia: 'CR', tono: 'guay',
      nombres: ['Cristi', 'Cristón', 'Cristalón'],
      base: { patron: 'facetas' },
      fases: [
        { cuerpo: 'cubo', ojosTipo: 'grandes', boca: 'sonrisa', extra: [] },
        { cuerpo: 'cristal', ojosTipo: 'fieros', boca: 'sonrisa', extra: ['cuernos'] },
        { cuerpo: 'cristal', ojosTipo: 'brillantes', boca: 'colmillos', extra: ['cuernos', 'gema', 'pinchos'] }
      ],
      lema: 'Duro como el cristal, y encima no se raya.'
    },

    CL: {
      familia: 'CL', tono: 'guay',
      nombres: ['Clic', 'Clavín', 'Clarión'],
      base: { patron: 'brillos' },
      fases: [
        { cuerpo: 'blob', ojosTipo: 'grandes', boca: 'sonrisa', extra: ['antenas'] },
        { cuerpo: 'estrella', ojosTipo: 'grandes', boca: 'sonrisa', extra: ['antenas'] },
        { cuerpo: 'estrella', ojosTipo: 'estrella', boca: 'sonrisa', extra: ['corona', 'aureola', 'antenas'] }
      ],
      lema: 'Tiene la clave de todo. No la suelta ni loco.'
    },

    FL: {
      familia: 'FL', tono: 'guay',
      nombres: ['Flami', 'Flamix', 'Flamarión'],
      base: { patron: 'brillos' },
      fases: [
        { cuerpo: 'gota', ojosTipo: 'grandes', boca: 'sonrisa', extra: ['llamitas'] },
        { cuerpo: 'llama', ojosTipo: 'fieros', boca: 'sonrisa', extra: ['llamitas', 'cresta'] },
        { cuerpo: 'llama', ojosTipo: 'brillantes', boca: 'colmillos', extra: ['llamitas', 'alas', 'colafuego'] }
      ],
      lema: 'Se enciende con una flor y no quema nada.'
    },

    // ----------------------------------------------------------- oscuras

    BR: {
      familia: 'BR', tono: 'oscuro',
      nombres: ['Brasita', 'Brasel', 'Brasaurio'],
      base: { patron: 'rayas' },
      fases: [
        { cuerpo: 'blob', ojosTipo: 'brillantes', boca: 'sonrisa', extra: [] },
        { cuerpo: 'bestia', ojosTipo: 'brillantes', boca: 'colmillos', extra: ['cuernos'] },
        { cuerpo: 'bestia', ojosTipo: 'brillantes', boca: 'dientes', extra: ['cuernoscurvos', 'melena', 'cola'] }
      ],
      lema: 'Una brasa que se hizo grande. Da calor, no sustos.'
    },

    GR: {
      familia: 'GR', tono: 'oscuro',
      nombres: ['Gruñi', 'Gruñón', 'Grumarok'],
      base: { patron: 'parches' },
      fases: [
        { cuerpo: 'blob', ojosTipo: 'grandes', boca: 'colmillos', extra: ['orejas'] },
        { cuerpo: 'bestia', ojosTipo: 'fieros', boca: 'colmillos', extra: ['orejas', 'melena'] },
        { cuerpo: 'bestia', ojosTipo: 'brillantes', boca: 'dientes', extra: ['cuernos', 'melena', 'pinchos'] }
      ],
      lema: 'Gruñe mucho, muerde nada. Un trozo de pan con melena.'
    },

    DR: {
      familia: 'DR', tono: 'oscuro',
      nombres: ['Draquito', 'Dracón', 'Dragonar'],
      base: { patron: 'rayas' },
      fases: [
        { cuerpo: 'huevo', ojosTipo: 'brillantes', boca: 'colmillos', extra: ['cuernos'] },
        { cuerpo: 'pua', ojosTipo: 'fieros', boca: 'colmillos', extra: ['cuernos', 'alasmurcielago', 'cola'] },
        { cuerpo: 'pua', ojosTipo: 'brillantes', boca: 'dientes', extra: ['cuernoscurvos', 'alasmurcielago', 'colafuego', 'pinchos'] }
      ],
      lema: 'Un dragón de verdad. Con muy buen fondo, eso sí.'
    }
  };

  // Los colores se toman de la familia, para que criatura, sílaba y barra
  // de progreso compartan identidad visual.
  Object.keys(CRIATURAS).forEach(function (id) {
    var fam = JL.datos.familia(id);
    CRIATURAS[id].color = fam.color;
    CRIATURAS[id].color2 = fam.color2;
  });

  /* Mascota que acompaña fuera de las familias (inicio, resumen). No pertenece
     a ninguna trabada: es el guía, y por eso es la más neutra de todas. */
  var GUIA = {
    familia: null, tono: 'tierno',
    nombres: ['Sil', 'Sil', 'Sil'],
    color: '#7c5cff', color2: '#c9b8ff',
    base: { cuerpo: 'blob', patron: 'puntos' },
    fases: [
      { ojosTipo: 'grandes', boca: 'sonrisa', extra: ['antenas'] },
      { ojosTipo: 'grandes', boca: 'sonrisa', extra: ['antenas'] },
      { ojosTipo: 'grandes', boca: 'sonrisa', extra: ['antenas'] }
    ],
    lema: 'Tu compi de lectura.'
  };

  var UMBRALES_FASE = [40, 75]; // % de automaticidad para pasar a fase 1 y 2

  JL.datos.CRIATURAS = CRIATURAS;
  JL.datos.GUIA = GUIA;
  JL.datos.UMBRALES_FASE = UMBRALES_FASE;

  JL.datos.criatura = function (famId) { return CRIATURAS[famId] || null; };

  /* Fase (0, 1 o 2) que corresponde a un porcentaje de automaticidad. */
  JL.datos.faseDe = function (pct) {
    if (pct >= UMBRALES_FASE[1]) return 2;
    if (pct >= UMBRALES_FASE[0]) return 1;
    return 0;
  };

  JL.datos.nombreCriatura = function (famId, fase) {
    var c = CRIATURAS[famId];
    return c ? c.nombres[fase] : '';
  };

})(window.JL = window.JL || {});

/* Rivales de combate. Criaturas originales, con el mismo generador que las
   tuyas: cambian el tono y la paleta, no el motor.

   La mayoría son oscuras —son los malos, tienen que imponer— pero un par son
   deliberadamente ridículas: si todos los rivales fueran sombríos, el combate
   se volvería solemne, y esto sigue siendo un juego. Ninguno da miedo de
   verdad: siguen teniendo ojos enormes y cara de dibujo animado.

   Los nombres son de bicho gracioso, nunca de reproche: el rival es un
   obstáculo simpático, no un juez de cómo lee. */
(function (JL) {
  'use strict';

  var RIVALES = [
    {
      id: 'sombrin', nombre: 'Sombrín', tono: 'oscuro',
      ritmo: 3200,   // sigilo: aparece y golpea seguido
      color: '#5b4a8f', color2: '#a89ad6',
      base: { cuerpo: 'fantasma', patron: 'brillos' },
      fases: [
        { ojosTipo: 'brillantes', boca: 'sonrisa', extra: [] },
        { ojosTipo: 'brillantes', boca: 'colmillos', extra: ['cuernos'] },
        { ojosTipo: 'brillantes', boca: 'dientes', extra: ['cuernos', 'alasmurcielago'] }
      ]
    },
    {
      id: 'nudon', nombre: 'Nudón', tono: 'oscuro',
      ritmo: 4400,   // pesado, tarda en moverse
      color: '#3f6f7a', color2: '#9dc3cc',
      base: { cuerpo: 'cubo', patron: 'facetas' },
      fases: [
        { ojosTipo: 'fieros', boca: 'colmillos', extra: [] },
        { ojosTipo: 'fieros', boca: 'dientes', extra: ['cuernos'] },
        { ojosTipo: 'brillantes', boca: 'dientes', extra: ['cuernoscurvos', 'pinchos'] }
      ]
    },
    {
      id: 'enredon', nombre: 'Enredón', tono: 'oscuro',
      ritmo: 3600,   // constante
      color: '#7a4b3c', color2: '#cfa48f',
      base: { cuerpo: 'bestia', patron: 'rayas' },
      fases: [
        { ojosTipo: 'fieros', boca: 'colmillos', extra: ['orejas'] },
        { ojosTipo: 'fieros', boca: 'dientes', extra: ['orejas', 'melena'] },
        { ojosTipo: 'brillantes', boca: 'dientes', extra: ['cuernos', 'melena', 'cola'] }
      ]
    },
    {
      id: 'garrapo', nombre: 'Garrapo', tono: 'oscuro',
      ritmo: 2900,   // nervioso
      color: '#4a5a34', color2: '#a7bd88',
      base: { cuerpo: 'pua', patron: 'parches' },
      fases: [
        { ojosTipo: 'fieros', boca: 'colmillos', extra: [] },
        { ojosTipo: 'brillantes', boca: 'dientes', extra: ['cresta'] },
        { ojosTipo: 'brillantes', boca: 'dientes', extra: ['cresta', 'cola', 'pinchos'] }
      ]
    },
    {
      id: 'chispon', nombre: 'Chispón', tono: 'guay',
      ritmo: 2300,   // no para quieto: el más rápido
      color: '#c58a1e', color2: '#f2d68a',
      base: { cuerpo: 'estrella', patron: 'brillos' },
      fases: [
        { ojosTipo: 'grandes', boca: 'sonrisa', extra: ['antenas'] },
        { ojosTipo: 'fieros', boca: 'colmillos', extra: ['antenas'] },
        { ojosTipo: 'brillantes', boca: 'dientes', extra: ['antenas', 'corona'] }
      ]
    },
    {
      id: 'rocalon', nombre: 'Rocalón', tono: 'guay',
      ritmo: 4800,   // una roca; casi no se mueve
      color: '#6d6350', color2: '#c8bda6',
      base: { cuerpo: 'cristal', patron: 'facetas' },
      fases: [
        { ojosTipo: 'fieros', boca: 'sonrisa', extra: [] },
        { ojosTipo: 'fieros', boca: 'colmillos', extra: ['cuernos'] },
        { ojosTipo: 'brillantes', boca: 'dientes', extra: ['cuernos', 'pinchos', 'gema'] }
      ]
    },

    // --- los dos ridículos, para que el combate no se ponga solemne
    {
      id: 'bostezon', nombre: 'Bostezón', tono: 'guay',
      ritmo: 5400,   // medio dormido, el más lento
      color: '#5c6b8a', color2: '#b6c2d9',
      base: { cuerpo: 'seta', patron: 'puntos' },
      fases: [
        { ojosTipo: 'dormilon', boca: 'sonrisa', extra: [] },
        { ojosTipo: 'dormilon', boca: 'sonrisa', extra: ['orejas'] },
        { ojosTipo: 'dormilon', boca: 'colmillos', extra: ['orejas', 'corona'] }
      ]
    },
    {
      id: 'moflete', nombre: 'Moflete', tono: 'tierno',
      ritmo: 3000,   // pequeño y muy movido
      color: '#c2607f', color2: '#f3b9cb',
      base: { cuerpo: 'blob', patron: 'parches' },
      fases: [
        { ojos: 1, ojosTipo: 'grandes', boca: 'gato', extra: ['orejasgato'] },
        { ojos: 1, ojosTipo: 'grandes', boca: 'colmillos', extra: ['orejasgato', 'cola'] },
        { ojos: 1, ojosTipo: 'fieros', boca: 'dientes', extra: ['orejasgato', 'cola', 'cuernos'] }
      ]
    }
  ];

  // Para que el generador los trate igual que a las criaturas.
  RIVALES.forEach(function (r) {
    r.familia = 'rival-' + r.id;
    r.nombres = [r.nombre, r.nombre, r.nombre];
    r.lema = '';
  });

  JL.datos = JL.datos || {};
  JL.datos.RIVALES = RIVALES;
  JL.datos.rival = function (i) { return RIVALES[i % RIVALES.length]; };

})(window.JL = window.JL || {});

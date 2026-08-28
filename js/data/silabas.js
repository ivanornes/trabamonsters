/* Catálogo de sílabas.
   Dos tipos:
   - directas (ma, to, si...): calentamiento y, sobre todo, línea base. El tiempo
     medio de cada jugador en estas define qué significa "rápido" para él.
   - trabadas (bra, tre, pli...): el núcleo del entrenamiento, agrupadas en familias. */
(function (JL) {
  'use strict';

  var DIRECTAS = [
    'ma', 'me', 'mi', 'mo', 'mu',
    'pa', 'pe', 'pi', 'po', 'pu',
    'sa', 'se', 'si', 'so', 'su',
    'ta', 'te', 'ti', 'to', 'tu',
    'la', 'le', 'li', 'lo', 'lu',
    'na', 'ne', 'ni', 'no', 'nu',
    'da', 'de', 'di', 'do', 'du',
    'ba', 'be', 'bi', 'bo', 'bu',
    'fa', 'fe', 'fi', 'fo', 'fu',
    'ca', 'co', 'cu',
    'ga', 'go', 'gu',
    'ra', 're', 'ri', 'ro', 'ru'
  ];

  /* Orden de desbloqueo: de la trabada más amable a la más rara.
     PL y BR primero porque aparecen mucho y son fáciles de articular;
     DR al final porque en español casi siempre va dentro de palabra (cocodrilo). */
  var FAMILIAS = [
    { id: 'PL', grupo: 'pl', color: '#ff6b9d', color2: '#ffd166' },
    { id: 'BR', grupo: 'br', color: '#4ecdc4', color2: '#a8e6cf' },
    { id: 'TR', grupo: 'tr', color: '#ffa62b', color2: '#ffe066' },
    { id: 'CR', grupo: 'cr', color: '#845ec2', color2: '#d5aaff' },
    { id: 'GR', grupo: 'gr', color: '#00b894', color2: '#7bed9f' },
    { id: 'PR', grupo: 'pr', color: '#ff5e78', color2: '#ffb3c1' },
    { id: 'FR', grupo: 'fr', color: '#3d84ff', color2: '#8ab6ff' },
    { id: 'BL', grupo: 'bl', color: '#f9c74f', color2: '#fff3b0' },
    { id: 'CL', grupo: 'cl', color: '#f15bb5', color2: '#ffc8dd' },
    { id: 'FL', grupo: 'fl', color: '#00c2d1', color2: '#9bf6ff' },
    { id: 'GL', grupo: 'gl', color: '#ff8fab', color2: '#ffd6e0' },
    { id: 'DR', grupo: 'dr', color: '#9d4edd', color2: '#c77dff' }
  ];

  var VOCALES = ['a', 'e', 'i', 'o', 'u'];

  // Se completan las sílabas de cada familia: pl -> pla, ple, pli, plo, plu
  FAMILIAS.forEach(function (f) {
    f.silabas = VOCALES.map(function (v) { return f.grupo + v; });
  });

  // Índice plano id -> metadatos, para no ir buscando por los arrays cada vez.
  var INDICE = {};

  DIRECTAS.forEach(function (id) {
    INDICE[id] = {
      id: id,
      tipo: 'directa',
      familia: null,
      grupo: id.charAt(0),
      vocal: id.slice(1),
      color: '#5b8def',
      color2: '#a9c4ff'
    };
  });

  FAMILIAS.forEach(function (f) {
    f.silabas.forEach(function (id) {
      INDICE[id] = {
        id: id,
        tipo: 'trabada',
        familia: f.id,
        grupo: f.grupo,
        vocal: id.slice(f.grupo.length),
        color: f.color,
        color2: f.color2
      };
    });
  });

  var FAMILIAS_POR_ID = {};
  FAMILIAS.forEach(function (f) { FAMILIAS_POR_ID[f.id] = f; });

  JL.datos = JL.datos || {};

  JL.datos.DIRECTAS = DIRECTAS;
  JL.datos.FAMILIAS = FAMILIAS;
  JL.datos.ORDEN_FAMILIAS = FAMILIAS.map(function (f) { return f.id; });

  /* Subconjunto de directas usado para calibrar. Son las más comunes y las que
     ya se dominan, así que el tiempo aquí es la velocidad de base real. */
  JL.datos.CALIBRACION = [
    'ma', 'me', 'mi', 'mo', 'mu',
    'pa', 'pe', 'pi', 'po', 'pu',
    'sa', 'se', 'si', 'so', 'su',
    'ta', 'te', 'ti', 'to', 'tu',
    'la', 'le', 'li', 'lo', 'lu'
  ];

  JL.datos.item = function (id) { return INDICE[id] || null; };
  JL.datos.familia = function (famId) { return FAMILIAS_POR_ID[famId] || null; };
  JL.datos.silabasDe = function (famId) {
    var f = FAMILIAS_POR_ID[famId];
    return f ? f.silabas.slice() : [];
  };
  JL.datos.todasLasTrabadas = function () {
    return FAMILIAS.reduce(function (acc, f) { return acc.concat(f.silabas); }, []);
  };
  JL.datos.esTrabada = function (id) {
    return !!(INDICE[id] && INDICE[id].tipo === 'trabada');
  };

  /* Separa una sílaba en [consonantes, vocal] para poder pintar el grupo
     consonántico de otro color. Es la "pista de color" y se puede apagar. */
  JL.datos.partes = function (id) {
    var it = INDICE[id];
    if (!it) return [id, ''];
    return [it.grupo, it.vocal];
  };

})(window.JL = window.JL || {});

/* Palabras por familia de trabadas.
   Cada entrada: p = palabra, h = trozo que se resalta dentro de la palabra,
   s = sílaba entrenada (clave del modelo; por defecto la misma que h),
   e = emoji opcional (da color y significado sin necesitar ningún dibujo).

   Se incluyen palabras donde la trabada va dentro (cocodrilo, regla, iglú)
   a propósito: reconocerla en medio de una palabra es más difícil y más útil
   que reconocerla siempre al principio. */
(function (JL) {
  'use strict';

  var PALABRAS = {
    PL: [
      { p: 'plato', h: 'pla', e: '🍽️' },
      { p: 'playa', h: 'pla', e: '🏖️' },
      { p: 'planta', h: 'pla', e: '🪴' },
      { p: 'plaza', h: 'pla' },
      { p: 'pleno', h: 'ple' },
      { p: 'plegar', h: 'ple' },
      { p: 'pliego', h: 'pli' },
      { p: 'plomo', h: 'plo' },
      { p: 'pluma', h: 'plu', e: '🪶' },
      { p: 'plutón', h: 'plu', e: '🪐' }
    ],
    BR: [
      { p: 'brazo', h: 'bra', e: '💪' },
      { p: 'brasa', h: 'bra', e: '🔥' },
      { p: 'brecha', h: 'bre' },
      { p: 'breve', h: 'bre' },
      { p: 'brillo', h: 'bri', e: '✨' },
      { p: 'brisa', h: 'bri' },
      { p: 'broche', h: 'bro' },
      { p: 'brote', h: 'bro', e: '🌱' },
      { p: 'bruja', h: 'bru', e: '🧙' },
      { p: 'brújula', h: 'brú', s: 'bru', e: '🧭' }
    ],
    TR: [
      { p: 'trapo', h: 'tra' },
      { p: 'trabajo', h: 'tra' },
      { p: 'tren', h: 'tre', e: '🚂' },
      { p: 'trece', h: 'tre' },
      { p: 'trigo', h: 'tri', e: '🌾' },
      { p: 'triste', h: 'tri', e: '😢' },
      { p: 'trozo', h: 'tro' },
      { p: 'trompeta', h: 'tro', e: '🎺' },
      { p: 'trueno', h: 'tru', e: '⛈️' },
      { p: 'truco', h: 'tru', e: '🎩' }
    ],
    CR: [
      { p: 'cráter', h: 'crá', s: 'cra', e: '🌋' },
      { p: 'cráneo', h: 'crá', s: 'cra', e: '💀' },
      { p: 'crema', h: 'cre', e: '🍦' },
      { p: 'crecer', h: 'cre' },
      { p: 'cristal', h: 'cri' },
      { p: 'crin', h: 'cri', e: '🐴' },
      { p: 'croqueta', h: 'cro', e: '🍤' },
      { p: 'cromo', h: 'cro' },
      { p: 'cruz', h: 'cru' },
      { p: 'crudo', h: 'cru' }
    ],
    GR: [
      { p: 'grande', h: 'gra' },
      { p: 'grano', h: 'gra', e: '🌾' },
      { p: 'greña', h: 'gre' },
      { p: 'gremio', h: 'gre' },
      { p: 'grillo', h: 'gri', e: '🦗' },
      { p: 'grifo', h: 'gri', e: '🚰' },
      { p: 'gris', h: 'gri' },
      { p: 'grosella', h: 'gro', e: '🫐' },
      { p: 'grupo', h: 'gru' },
      { p: 'grúa', h: 'grú', s: 'gru', e: '🏗️' }
    ],
    PR: [
      { p: 'prado', h: 'pra', e: '🌾' },
      { p: 'práctica', h: 'prá', s: 'pra' },
      { p: 'premio', h: 'pre', e: '🏆' },
      { p: 'presa', h: 'pre' },
      { p: 'primo', h: 'pri' },
      { p: 'princesa', h: 'pri', e: '👸' },
      { p: 'profe', h: 'pro', e: '🧑‍🏫' },
      { p: 'problema', h: 'pro' },
      { p: 'prueba', h: 'pru' },
      { p: 'prudente', h: 'pru' }
    ],
    FR: [
      { p: 'frasco', h: 'fra', e: '🫙' },
      { p: 'fragua', h: 'fra' },
      { p: 'fresa', h: 'fre', e: '🍓' },
      { p: 'frente', h: 'fre' },
      { p: 'frío', h: 'frí', s: 'fri', e: '🥶' },
      { p: 'frigorífico', h: 'fri', e: '🧊' },
      { p: 'frontera', h: 'fro' },
      { p: 'frotar', h: 'fro' },
      { p: 'fruta', h: 'fru', e: '🍎' },
      { p: 'fruncir', h: 'fru' }
    ],
    BL: [
      { p: 'blanco', h: 'bla', e: '🤍' },
      { p: 'blando', h: 'bla' },
      { p: 'hablé', h: 'blé', s: 'ble' },
      { p: 'roble', h: 'ble', e: '🌳' },
      { p: 'blindado', h: 'bli', e: '🛡️' },
      { p: 'público', h: 'bli' },
      { p: 'bloque', h: 'blo', e: '🧱' },
      { p: 'bloc', h: 'blo', e: '📓' },
      { p: 'blusa', h: 'blu', e: '👚' },
      { p: 'blusón', h: 'blu' }
    ],
    CL: [
      { p: 'clase', h: 'cla', e: '🏫' },
      { p: 'clavo', h: 'cla' },
      { p: 'clave', h: 'cla', e: '🔑' },
      { p: 'cliente', h: 'cli' },
      { p: 'clip', h: 'cli', e: '📎' },
      { p: 'clima', h: 'cli', e: '🌦️' },
      { p: 'cloro', h: 'clo' },
      { p: 'cloaca', h: 'clo' },
      { p: 'club', h: 'clu' },
      { p: 'incluir', h: 'clu' }
    ],
    FL: [
      { p: 'flan', h: 'fla', e: '🍮' },
      { p: 'flauta', h: 'fla', e: '🎶' },
      { p: 'flecha', h: 'fle', e: '🏹' },
      { p: 'flequillo', h: 'fle' },
      { p: 'flexible', h: 'fle' },
      { p: 'flor', h: 'flo', e: '🌸' },
      { p: 'flota', h: 'flo', e: '⛵' },
      { p: 'flojo', h: 'flo' },
      { p: 'fluido', h: 'flu', e: '💧' },
      { p: 'flúor', h: 'flú', s: 'flu' }
    ],
    GL: [
      { p: 'glaciar', h: 'gla', e: '🧊' },
      { p: 'regla', h: 'gla', e: '📏' },
      { p: 'iglesia', h: 'gle', e: '⛪' },
      { p: 'inglés', h: 'glé', s: 'gle' },
      { p: 'jeroglífico', h: 'gli' },
      { p: 'globo', h: 'glo', e: '🎈' },
      { p: 'gloria', h: 'glo' },
      { p: 'siglo', h: 'glo' },
      { p: 'glucosa', h: 'glu' },
      { p: 'iglú', h: 'glú', s: 'glu', e: '🛖' }
    ],
    DR: [
      { p: 'dragón', h: 'dra', e: '🐉' },
      { p: 'drama', h: 'dra', e: '🎭' },
      { p: 'padre', h: 'dre', e: '👨' },
      { p: 'madre', h: 'dre', e: '👩' },
      { p: 'cocodrilo', h: 'dri', e: '🐊' },
      { p: 'vidrio', h: 'dri' },
      { p: 'cuadro', h: 'dro', e: '🖼️' },
      { p: 'dromedario', h: 'dro', e: '🐪' },
      { p: 'druida', h: 'dru', e: '🧝' },
      { p: 'drupa', h: 'dru' }
    ]
  };

  // Se normaliza: s por defecto = h, y se guarda el índice del resalte.
  Object.keys(PALABRAS).forEach(function (fam) {
    PALABRAS[fam].forEach(function (w) {
      if (!w.s) w.s = w.h;
      w.familia = fam;
      w.i = w.p.indexOf(w.h);
    });
  });

  JL.datos = JL.datos || {};
  JL.datos.PALABRAS = PALABRAS;

  /* Palabras que entrenan una sílaba concreta (bra -> brazo, brasa...). */
  JL.datos.palabrasDe = function (silaba) {
    var it = JL.datos.item(silaba);
    if (!it || !it.familia) return [];
    return (PALABRAS[it.familia] || []).filter(function (w) { return w.s === silaba; });
  };

  JL.datos.palabrasDeFamilia = function (famId) {
    return (PALABRAS[famId] || []).slice();
  };

})(window.JL = window.JL || {});

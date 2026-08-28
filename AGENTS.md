# AGENTS.md

Instrucciones para agentes que trabajen en Trabamonsters. El [README](README.md)
cuenta **qué es** el juego; esto cuenta **cómo tocarlo sin romperlo**.

---

## Lo primero: cómo verificar

No hay tests en fichero: la batería vive en el propio juego y se lanza desde la
consola del navegador. **Ejecútala siempre antes de dar algo por terminado.**

```bash
python3 -m http.server 8765      # o preview_start con .claude/launch.json
```

```javascript
JL.debug.comprobaciones()   // 62 pruebas. Tienen que pasar todas.
```

Para capturar los fallos sin depender del buffer de la consola —que arrastra
mensajes de recargas anteriores y engaña— intercepta `console.error`:

```javascript
(()=>{const f=[];const o=console.error;console.error=(...a)=>f.push(a.join(' '));
const r=JL.debug.comprobaciones();console.error=o;return JSON.stringify({r,f})})()
```

### ⚠️ La caché te va a mentir

Esta es la trampa número uno de este repo. Hay **dos** capas de caché:

1. El navegador cachea los `.js` y `.css`.
2. Desde que es PWA, el **service worker sirve de caché** con prioridad absoluta.

Consecuencia: editas un fichero, recargas, y ves el código viejo. Vas a pensar
que tu cambio no funciona. Lo que hay que hacer:

```javascript
location.href = 'http://localhost:8765/index.html?v=' + Date.now();
```

Y si sigue sin aplicarse, comprueba que de verdad se cargó lo nuevo antes de
depurar nada:

```javascript
JL.modelo.crearSelector.toString().includes('algo-que-acabas-de-escribir')
```

**Al cambiar cualquier fichero hay que subir `VERSION` en [`sw.js`](sw.js).** Si
añades un fichero nuevo, mételo además en `RECURSOS` (hoy son 33 entradas) o no
existirá sin conexión.

### Otras herramientas

```javascript
JL.debug.balance(120000, 200)   // mide el balance del combate con datos
JL.debug.simular()              // qué está eligiendo el selector y por qué
JL.debug.saltarA('GR')          // desbloquea familias para ver pantallas
JL.app.factorTiempo(0.06)       // sesión entera en ~20 s
JL.debug.autoJugar(700, 200)    // juega solo; JL.debug.pararAuto() lo apaga
JL.storage.reset()              // requiere recargar después
```

Al terminar, **deja el estado limpio** (`JL.storage.reset()` + recarga): el
`localStorage` es de quien juega, no un banco de pruebas.

---

## Reglas de diseño que no se negocian

Estas no son preferencias de estilo. Si una tarea parece pedir romperlas,
dilo antes de hacerlo.

1. **Nunca meter prisa.** Prohibido «¡más rápido!», cuentas atrás visibles que
   presionen, o cualquier texto que empuje. El vocabulario es «fluida» / «esa
   costó un poco».
2. **El error no castiga.** No existe sonido de fallo. Lo más «negativo» que
   suena es un blip grave y suave. Fallar sólo hace que esa sílaba vuelva antes.
3. **La dificultad sube sola**, y sólo tras aciertos. La escalera de ráfaga
   acelera con 3 aciertos seguidos y afloja con 1 fallo: nunca al revés.
4. **Nada se puede recitar.** El selector jamás puede sacar dos vocales
   contiguas de la misma familia (`bra→bre`), que es la cantinela que se
   memoriza sin leer. Ojo: «nunca dos de la misma familia seguidas» es
   *imposible* con una sola familia desbloqueada; por eso la regla es ésta.
5. **Perder no cuesta nada**: ni automaticidad, ni XP ya ganada, ni el rato de
   lectura que quedaba (por eso la derrota da revancha en vez de cortar el
   bloque).
6. **La métrica es la automaticidad, nunca sílabas/minuto.** Esa cifra invita a
   atropellarse.

---

## Arquitectura

- **Sin build, sin dependencias, sin módulos ES.** `file://` los bloquea, y la
  app tiene que abrirse con doble clic. Son `<script>` clásicos en orden (21 en
  `index.html`), y todo cuelga de un único global `JL`.
- **Estilo ES5**: `var`, `function`, nada de arrow functions ni `const` en el
  código de la app. (En la consola, para depurar, da igual.)
- **`js/core/modelo.js` y `js/core/combate.js` NO tocan el DOM.** Entra estado,
  sale decisión. Es lo que permite probarlos enteros sin jugar. Si necesitas un
  temporizador, no lo pongas ahí: el modelo expone `tic(ms)` y es la interfaz
  quien tiene el reloj.
- **Español** en identificadores, comentarios y textos.
- Los comentarios explican **por qué**, no qué. Si un número está calibrado,
  el comentario dice con qué se midió.

### Dónde están los mandos

| | |
|---|---|
| `JL.modelo.CONF` | umbrales, ventana de historial, reparto del bloque, escalera de ráfaga |
| `JL.combate.CONF` | vida/ataque/defensa de héroe y rival, ritmos, freno, XP |
| `js/data/*.js` | sílabas, palabras, criaturas, rivales |

Nada de números mágicos sueltos por las funciones: si vas a calibrar algo,
súbelo a `CONF` primero para que `JL.debug.balance()` pueda barrerlo.

---

## Trampas conocidas

Todas éstas ya costaron una depuración. No las vuelvas a pagar.

**Temporizadores por tarjeta.** Cada sílaba programa plazos suyos (aparición,
fin de tiempo, margen). Si no se cancelan al responder, el «se acabó el tiempo»
de la sílaba anterior le cae encima a la siguiente y la da por fallada. Patrón
correcto: `programarCarta()` / `cancelarCarta()` en `modoRafaga.js`.

**El reloj del rival se para durante las animaciones.** `modoCombate.js` lleva
un contador `pausar()`/`reanudar()`. Si añades una animación larga, pausa: nadie
debe recibir un golpe mientras la pantalla está ocupada.

**`flex: 1` en una barra dentro de un contenedor en columna la colapsa** a
altura cero (`flex-basis: 0` aplica al eje vertical). `.barra` va con
`flex: 0 0 auto` y son los contextos en fila los que la estiran.

**Los ids de degradado SVG deben ser únicos por render.** Dos SVG con el mismo
`id` hacen que el segundo herede el degradado del primero, y una silueta acaba
saliendo en color. `ui/criatura.js` usa un contador.

**Al rasterizar una criatura a PNG hay que quitar `cr-parpados`.** Los párpados
se pintan con `fill: currentColor` desde CSS; en un SVG suelto salen negros y
tapan los ojos. Los iconos se generan así (ver historial de `icons/`).

**Las capturas justo después de un cambio por JS salen desactualizadas.** Haz la
captura en una llamada aparte, no en el mismo lote.

**El balance del combate se mide, no se estima.** Es muy sensible: cambiar el
daño del rival en 0,5 mueve la tasa de derrota decenas de puntos. Usa
`JL.debug.balance()` y comprueba que la forma se mantiene:

- quien lee muy bien: ~0 % de derrotas
- quien lee normal: ~0 %
- a quien le cuesta: ~20-25 %, **y parecido en Nv0, Nv30 y Nv70**

Que sea plano entre niveles importa: si la vida del héroe crece más despacio que
el golpe del rival, a nivel alto se muere en menos golpes que a nivel bajo, que
es lo contrario de lo que espera quien ha subido a su monstruo.

---

## Decisiones tomadas a propósito (no las «arregles»)

- **Las palabras no alimentan la automaticidad de la sílaba.** Es otra tarea y
  tarda más; hundiría la puntuación. Se guardan aparte, en `estado.palabras`.
- **Sin reconocimiento de voz.** Con voces infantiles falla mucho y exige
  conexión. El botón «¿cómo suena?» es síntesis, y usarlo cuenta la sílaba como
  no automática.
- **Umbrales relativos, no absolutos.** «Rápido» se calibra con la mediana del
  propio jugador en sílabas directas. Nunca metas constantes en milisegundos
  como criterio de fluidez.
- **Minúsculas por defecto**, que es lo que se ve en los libros del cole.
- **El combate no aparece hasta la segunda sesión**, porque `bloquesDe()` se
  evalúa una sola vez al empezar. Está identificado como mejora pendiente en el
  README; no es un bug que se arregle sin querer.
- **`.nojekyll` está vacío a propósito y no se borra.** GitHub Pages pasa el
  sitio por Jekyll, que descarta sin avisar los ficheros y carpetas que
  empiezan por `_`. Ese fichero desactiva el procesado; a Pages sólo le importa
  que exista, no lo que contenga.

---

## Antes de dar algo por terminado

1. `JL.debug.comprobaciones()` en verde (62/62).
2. Si tocaste el combate, `JL.debug.balance()` con la forma de arriba.
3. Si añadiste ficheros: `RECURSOS` en `sw.js` + subir `VERSION`.
4. Mirado en móvil vertical **y** en escritorio (la sílaba es el elemento más
   grande de la pantalla y se descuadra fácil).
5. Sin peticiones a dominios externos: `grep -rn "https\?://" --include='*.html'
   --include='*.css' --include='*.js' .` sólo debe devolver el namespace de SVG.
6. Sin nombres propios de niños en el código. El perfil nace vacío y el nombre
   se pone desde el panel de adulto.
7. `JL.storage.reset()` y recargar, para no dejar datos de pruebas.

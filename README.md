# Trabamonsters

Juego de lectura para entrenar **automaticidad silábica**: que al ver `bra`, `tre`
o `pli` no haya que reconstruir cada sonido. Sesiones de 5 minutos, medidas por
tiempo de respuesta, con combates y criaturas que evolucionan.

HTML, CSS y JavaScript sin dependencias. Se abre con doble clic.

---

## Cómo se juega

Aparece una sílaba enorme. Se lee **en voz alta** y se toca la pantalla. La app
mide el tiempo entre que la sílaba termina de aparecer y el toque. Si hay un
adulto delante puede marcar «le costó»; si no, el tiempo solo ya dice bastante.

Una sesión son cuatro bloques encadenados:

| Bloque | Tiempo | Qué pasa |
|---|---|---|
| Calentamiento | 1 min | directas y trabadas ya dominadas |
| Combate | 2 min | la zona de trabajo, con batalla |
| Palabras | 1 min | `pla` se transforma en `plato` |
| Reto ráfaga | 1 min | la sílaba desaparece sola |

La **primera** sesión es distinta: 4 minutos sin combate, porque hasta que no
hay una línea base medida no se puede saber qué es «rápido» para este niño.

---

## Principios que no se rompen

1. **Nunca meter prisa.** Prohibido «¡más rápido!». El lenguaje es «fluida» /
   «esa costó un poco».
2. **El error no castiga.** No hay sonido de fallo. Una sílaba lenta sólo hace
   que vuelva a salir más a menudo.
3. **La dificultad sube sola**, y sólo cuando hay pocos errores.
4. **Nada se puede recitar.** Nunca dos vocales contiguas de la misma familia
   (`bra→bre`), que es la cantinela que se memoriza sin leer.
5. **Perder un combate no cuesta nada**: ni automaticidad, ni experiencia ya
   ganada, ni el rato de lectura que quedaba.

---

## Cómo abrirlo

```bash
open index.html
```

Funciona desde `file://` sin servidor. Si el navegador bloquea `localStorage`
ahí, el panel de adulto avisa y quedan exportar/importar. Alternativa:

```bash
python3 -m http.server 8765
```

El **panel de adulto** se abre manteniendo pulsado el candado 2 segundos:
nombre de quien juega, calibración, automaticidad por familia, tendencia por
sesión, ajustes y exportar/importar el progreso.

### Instalarlo como app

Es una PWA. Servida por `https` (o `localhost`), se instala en la pantalla de
inicio y **funciona sin conexión**: el service worker precachea todo y no hay
nada que pedirle a ningún servidor. En iOS: Compartir → «Añadir a inicio».

No depende de ningún dominio externo — ni CDN, ni Google Fonts, ni analítica.
La tipografía se sirve desde `fonts/` justamente por eso.

> Al tocar cualquier fichero hay que subir `VERSION` en [`sw.js`](sw.js). Si no,
> los navegadores seguirán sirviendo la copia cacheada y parecerá que los
> cambios no se aplican.

---

## Organización

Si vas a tocar el código —o le pides a un agente que lo toque— empieza por
[AGENTS.md](AGENTS.md): recoge las reglas que no se pueden romper, dónde están
los mandos y las trampas que ya costaron una depuración.

```
index.html            todas las pantallas + orden de los <script>
AGENTS.md             cómo mantener esto sin romperlo
manifest.webmanifest  metadatos de la PWA
sw.js                 service worker: precache y funcionamiento offline
icons/                iconos, generados con el propio generador de criaturas
fonts/                Fredoka (OFL), autoalojada para poder ir sin conexión
css/
  base.css            variables, tipografía, layout responsive
  animations.css      @keyframes y clases de animación
  screens.css         estilos por pantalla
js/
  data/               catálogos: sílabas, palabras, criaturas, rivales
  core/
    modelo.js         automaticidad, calibración, selector adaptativo
    combate.js        vida, ataque, defensa, niveles, XP
    storage.js        localStorage con degradación a memoria
    audio.js          sonido sintetizado con WebAudio (cero ficheros)
    anim.js           partículas, confeti, texto flotante
    debug.js          pruebas y herramientas de balance
  ui/                 criaturas SVG, pantallas y los cuatro modos
  app.js              arranque y encadenado de la sesión
```

`core/modelo.js` y `core/combate.js` **no tocan el DOM**: entra estado, sale
decisión. Por eso se pueden probar enteros desde la consola.

Todo cuelga de un único global `JL`, con `<script>` clásicos, porque `file://`
bloquea los módulos ES.

---

## Las dos progresiones

Son distintas a propósito, y cada barra significa una cosa:

- **Automaticidad (0-100)** — cómo lee. Decide qué sílabas salen y cuándo
  evoluciona la criatura. No se pierde nunca.
- **Nivel (0-100)** — fuerza de combate. Se gana con XP venciendo rivales, y
  sube vida, ataque y defensa.

Como el daño depende de lo rápido que lea, el nivel acaba reflejando la lectura
igual, pero pasando por el juego.

---

## Verificar y ajustar

Desde la consola del navegador:

```javascript
JL.debug.comprobaciones()          // batería completa (62 pruebas)
JL.debug.balance(120000, 200)      // simula bloques de combate y mide derrotas
JL.debug.simular()                 // qué está decidiendo el selector
JL.debug.saltarA('GR')             // desbloquea familias para ver pantallas
JL.app.factorTiempo(0.06)          // sesión entera en ~20 s
JL.debug.autoJugar(700)            // juega solo, para recorrer los modos
```

`JL.debug.balance()` es la herramienta para tocar los números de combate con
datos delante en vez de a ojo. Simula bloques de 2 minutos con tres perfiles de
lector y devuelve cuántos rivales caen y con qué frecuencia se pierde. Objetivo
actual: quien lee bien no pierde nunca, quien tiene dificultad pierde ~1 de cada
4 o 5 bloques, y eso se mantiene igual en todos los niveles.

Los mandos están todos en `JL.combate.CONF` y `JL.modelo.CONF`.

---

## Licencia

El código está bajo [MIT](LICENSE): cógelo, cámbialo y publícalo como quieras.
Si te sirve para tu hijo o para tu clase, adelante.

Una excepción que conviene conocer: la tipografía de `fonts/` es **Fredoka**,
distribuida bajo la SIL Open Font License 1.1, que tiene sus propias
condiciones (atribución en [fonts/LEEME.txt](fonts/LEEME.txt)). La OFL sólo
afecta a los ficheros de la fuente, no al resto del proyecto ni a lo que hagas
con él. Si te estorba, quita el `@font-face` de `css/base.css` y la app cae al
stack tipográfico del sistema sin romperse.

---

## Privacidad

No hay servidor, ni cuentas, ni analítica, ni una sola petición a un dominio
externo. Todo lo que se registra —tiempos, automaticidad, niveles y el nombre,
que es opcional— vive en el `localStorage` del navegador de quien juega y no
sale de ahí. Exportar el progreso genera un JSON en local; ese fichero está en
el `.gitignore` a propósito.

---

## Ideas para seguir

- **Sincronizar entre dispositivos**: hoy cada aparato lleva su propio progreso
  y el puente es exportar/importar. Sincronizar de verdad pide un backend
  mínimo, y con él dejaría de ser un sitio estático.
- **Combate desde el día 1**: la lista de bloques se calcula una sola vez al
  empezar la sesión, así que aunque la calibración termine a los 30 segundos el
  combate no aparece hasta la segunda. Recalcularla entre bloques lo arreglaría.
- **Voz**: reconocimiento para validar la lectura sin que nadie marque nada.
  Ojo: con voces infantiles falla bastante, por eso no está.
- Más familias (inversas, grupos con `s` líquida) y más rivales.

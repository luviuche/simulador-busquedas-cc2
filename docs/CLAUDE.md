# CLAUDE.md — Simulador de Ciencias de la Computación II

Contexto de dominio del proyecto. Léelo completo antes de escribir código.

---

## 1. Qué se está construyendo

Un **simulador didáctico de algoritmos de búsqueda** para la asignatura Ciencias de la Computación II (Ingeniería de Sistemas, Universidad Distrital Francisco José de Caldas).

El estudiante crea una estructura de datos, inserta claves, y busca y elimina **observando la animación** del algoritmo recorriéndola paso a paso, mientras un panel contabiliza comparaciones y accesos. Buscar y eliminar son la misma lección: eliminar es localizar con el algoritmo del tema y sacar (§5.6).

**La animación no es un adorno: es el producto.** Sin ella no se puede observar el comportamiento de un algoritmo, que es lo único que esta aplicación existe para enseñar. Cualquier decisión técnica que degrade la animación está mal, por más limpia que sea.

**Plataforma:** aplicación web que arranca desde un `index.html`. Debe funcionar abierta con `file://`, sin servidor. Puede empaquetarse como ejecutable de escritorio más adelante; el código no debe asumir Node ni APIs de escritorio.

**Idioma:** toda la interfaz, los mensajes y los identificadores de dominio en español. El código en español para términos de dominio (`clave`, `casilla`, `estructura`) y en inglés para lo genérico.

---

## 2. Glosario de dominio

Estos términos son fijos. No usar sinónimos ni en el código ni en la interfaz.

| Término | Significado | En código |
|---|---|---|
| **Tamaño de la estructura (n)** | Cantidad de casillas | `n` |
| **Longitud de clave (l)** | Dígitos o letras por clave | `l` |
| **Rango válido** | Derivado de `l`. Con `l = 4` numérico: `1000–9999` | `rangoValido(l)` |
| **Clave** | Cada dato individual | `clave` |
| **Casilla** | Cada posición de la estructura | `casilla` |
| **Dirección** | Posición calculada por una función hash | `direccion` |
| **Elisión** | Compresión visual de casillas no relevantes | `elision` |
| **Bitácora** | Registro cronológico de la sesión | `bitacora` |
| **Traza** | Secuencia de pasos que produce un algoritmo | `traza` |
| **Tema** | Cada algoritmo del catálogo (búsqueda binaria, función módulo…) | `tema` |
| **Unidad** | Cada división del programa que agrupa temas | `unidad` |

Nunca decir *celda* por casilla, ni *dato* por clave, ni *índice* por dirección.

**Los temas no son "módulos" ni se numeran** (decisión del docente, 2026-08-18). Se identifican por su nombre: ni el catálogo ni el encabezado de la pantalla de trabajo llevan `01`, `02`, … ni la palabra *módulo*. La numeración sobrevive solo en las **unidades**, que sí son divisiones del programa del curso.

La palabra *módulo* se reserva para dos usos que no tienen que ver con el catálogo y que sí son correctos: los **módulos ES** de JavaScript (sección 4) y la **función hash módulo** (sección 5.3).

---

## 3. Reglas de dominio

### 3.1 Indexación

**Las casillas se numeran desde 1.** Internamente el arreglo puede ser base 0, pero **toda** salida visible —visualización, mensajes, bitácora, PDF— presenta índices desde 1. Centralizar la conversión en un solo punto; no esparcir `+1` por el código.

### 3.2 Invariantes de la estructura

Estas cuatro condiciones se cumplen siempre. Cualquier operación que las rompa está mal:

1. Las claves colocadas nunca exceden `n`.
2. **Sin duplicados.** Ninguna clave aparece dos veces.
3. **Siempre ordenada ascendente.** Aplica a secuencial y a binaria (decisión del docente), **no a la transformación de claves**: ver los dos modos, abajo.
4. Toda clave cumple exactamente la longitud `l`.

**Dos modos de estructura**, porque los temas colocan las claves de forma distinta:

| Modo | Temas | Cómo coloca | Invariante 3 |
|---|---|---|---|
| `ordenada` | secuencial, binaria | Arreglo denso: la clave entra en la posición que conserva el orden, y las ocupadas son siempre el prefijo `1..cantidad`. | Aplica |
| `dispersa` | transformación de claves | La clave aterriza en la dirección que le da la función hash, así que quedan huecos en el medio. | No aplica |

En ambos modos, `estructura.claves` es el arreglo que la vista lee por casilla —la casilla `i` es `claves[i-1]`— para que dibujar la estructura no dependa del modo. Lo que cambia es que en la dispersa el arreglo nace con las `n` posiciones y su longitud no crece: **contar claves es contar posiciones definidas, no leer `claves.length`** (`dominio.estructura.cantidadClaves`). Confundir las dos cosas hace que la estructura dispersa se declare llena desde el primer momento.

La restricción de unicidad no es cosmética: en binaria los duplicados hacen ambiguo el resultado y no comparable el conteo de comparaciones; en hash un duplicado se confunde visualmente con una colisión. Aplica también al llenado automático y a la carga desde archivo.

### 3.3 Claves numéricas

- Exactamente `l` dígitos.
- **Sin ceros a la izquierda.** Con `l = 4`, `0521` es inválido.
- Rango válido: `10^(l−1)` a `10^l − 1`. Con `l = 4`: `1000–9999`.
- Sin negativos ni decimales.

### 3.4 Claves alfabéticas

*Implementación diferida. Mantener el tipo en el modelo y en la interfaz, deshabilitado.*

- Exactamente `l` letras.
- Normalización a mayúsculas.
- Tildes a letra base: Á→A, É→E, Í→I, Ó→O, Ú→U, Ü→U.
- Alfabeto A–Z, 26 letras. **La Ñ se rechaza** con advertencia.
- **Mapeo posicional:** cada letra a su posición en dos dígitos (`A=01` … `Z=26`), concatenados.
  `CASA` → `03 01 19 01` → `3011901`
  Este mapeo permite que **todas las funciones hash operen sobre números** sin lógica especial para texto. El orden numérico resultante coincide con el lexicográfico, y todas las palabras de longitud `l` producen claves transformadas de igual cantidad de dígitos, lo cual es indispensable para truncamiento y plegamiento.
- La interfaz debe poder mostrar la clave transformada junto a la palabra original, con fines didácticos.

### 3.5 Límites de `n`

| Restricción | Valor | Naturaleza |
|---|---|---|
| Límite duro | 10 000 casillas | Guarda de seguridad |
| Umbral de advertencia | 500 casillas | Sobre esto la ejecución paso a paso deja de ser observable; se advierte sin bloquear |
| Límite derivado de `l` | Claves distintas posibles | Consecuencia de la unicidad |

**El límite derivado se valida al crear la estructura, no al insertar.** Como no hay duplicados, `n` no puede exceder la cantidad de claves distintas que existen para esa longitud: `9 × 10^(l−1)` para numéricas. Con `l = 2` solo existen 90 claves (10–99), así que `n = 150` es imposible de llenar por definición y debe rechazarse en el formulario.

No preguntar al usuario por la memoria de su equipo. El costo no está en almacenar el arreglo sino en dibujarlo, y la elisión ya acota el dibujado.

---

## 4. Arquitectura: la decisión que sostiene todo

**Los algoritmos no ejecutan ni animan. Producen una traza.**

Un algoritmo recibe la estructura y la clave buscada, y devuelve la lista completa de pasos que dio. La interfaz después reproduce esa traza a la velocidad que el usuario elija.

```js
function buscarBinaria(claves, objetivo) {
  const pasos = [];
  let inicio = 0, fin = claves.length - 1;
  let comparaciones = 0, accesos = 0;

  while (inicio <= fin) {
    const medio = Math.floor((inicio + fin) / 2);
    accesos++; comparaciones++;
    pasos.push({
      tipo: 'comparacion',
      inicio, medio, fin,
      descartadas: [...],
      comparaciones, accesos,
      mensaje: `Se compara la clave objetivo con la casilla ${medio + 1}.`
    });
    // ...
  }
  return pasos;
}
```

Esto no es preferencia de estilo. Es lo que hace posible, casi gratis:

- **Paso a paso, ejecución continua y control de velocidad** — es solo un índice sobre un arreglo.
- **Retroceder un paso**, que de otra forma exigiría reejecutar.
- **Interrumpibilidad**: si el usuario avanza rápido, se salta al paso destino sin encolar animaciones.
- **Pruebas del algoritmo sin tocar la interfaz.**
- **Exportar la traza al PDF** sin recalcular nada.

Mezclar el algoritmo con el dibujado hace todo esto difícil y produce exactamente el tipo de código que después no se puede animar bien. **No lo hagas.**

### Separación de capas

```
dominio/      claves, validación, mapeo alfabético, invariantes
algoritmos/   secuencial, binaria, funciones hash, colisiones → devuelven trazas
vista/        componentes, animación, reproducción de la traza
persistencia/ serialización .cc2, recientes
```

El dominio y los algoritmos no importan nada de la vista.

### Stack: sin framework

**HTML, CSS y JavaScript puros. Cero dependencias.**

La razón que decide: si el `index.html` debe abrirse con doble clic, el navegador bloquea los módulos ES bajo `file://`, y React o Vue exigirían un paso de compilación o cargarse desde CDN con Babel en el navegador — frágil justo el día de la sustentación.

Además, el proyecto ya está diseñado para no necesitar framework: con la traza, el estado se reduce a un arreglo de pasos y un índice. No hay estado distribuido ni sincronización entre componentes, que es lo que un framework viene a resolver. Y el acceso directo al DOM es lo que hace viable medir posiciones para animar el reordenamiento.

Reglas concretas:

- **CSS con variables nativas** para los tokens. Nada de Tailwind: con diez tokens semánticos, una paleta de framework solo abre la puerta a colores sin significado asignado.
- **Tipografías locales** vía `@font-face`, descargadas al repositorio. Nunca desde Google Fonts: la sala puede no tener internet.
- **PDF** con `window.print()` y hoja de estilos de impresión.
- **Animación** con la Web Animations API (`element.animate()`), que reemplaza animaciones en curso en lugar de encolarlas.
- **Persistencia** con las APIs del navegador. Sin librerías.
- Sin `npm install`, sin paso de compilación, sin servidor obligatorio.

**Confirmado (2026-08-06): el proyecto se abre con doble clic sobre `index.html` (`file://`).** Por lo tanto **no se usan módulos ES** (`import`/`export`): el navegador los bloquea bajo `file://`. En su lugar, cada archivo es un *script clásico* que se envuelve en un IIFE y cuelga sus símbolos de un único namespace global, `window.CC2`, organizado por capa:

```js
// js/dominio/clave.js
(function () {
  function validarClave(valor, l) { … }

  window.CC2 = window.CC2 || {};
  window.CC2.dominio = window.CC2.dominio || {};
  window.CC2.dominio.clave = { validarClave };
})();
```

`index.html` carga los scripts con `<script src="…">` normales, **en orden de dependencia** (dominio antes que algoritmos, algoritmos antes que vista, vista antes que `app.js`). No hay bundler ni resolución automática: si un archivo nuevo depende de otro, su `<script>` va después en el HTML.

### Convención de componentes

Sin framework hace falta disciplina para no repetir. Un componente es **una función que recibe datos y devuelve un elemento del DOM**, sin leer estado global:

```js
// js/vista/componentes/casilla.js
(function () {
  function crearCasilla({ clave, indice, estado }) { … }
  function crearFilaBitacora(entrada) { … }

  window.CC2 = window.CC2 || {};
  window.CC2.vista = window.CC2.vista || {};
  window.CC2.vista.componentes = window.CC2.vista.componentes || {};
  window.CC2.vista.componentes.casilla = { crearCasilla, crearFilaBitacora };
})();
```

Quien cambia el estado es la capa de vista, que vuelve a pedir el elemento o actualiza el existente. Los componentes no despachan acciones ni conocen el modelo.

### La pantalla de tema es una sola, parametrizada

`vista/pantallas/tema-busqueda.js` contiene **toda** la pantalla de trabajo —configurar, operar sobre una clave (insertar, buscar, eliminar), llenado automático, reproducir la traza, elidir, métricas, bitácora, alertas— y la comparten todos los temas de búsqueda interna. Un tema nuevo no escribe pantalla: escribe una entrada en `TEMAS` (en `app.js`) con lo único que le es propio:

```js
{
  titulo, descripcion, orientacion, modo,        // orientacion: horizontal | vertical | arbol
  buscar({ estructura, objetivo }) -> pasos,     // el algoritmo
  eliminar({ estructura, clave }) -> pasos,      // buscar y además sacar (§5.6)
  insertar({ estructura, clave }) -> pasos,      // opcional: inserción con traza
  tratamientos: [{ valor, etiqueta }],           // opcional: selector al crear
  calculo: bool,                                 // opcional: panel de cálculo
  apilada: {                                     // opcional: una fila por paso
    rangoDePaso(paso),
    aplicaA(paso)                                // opcional: pasos sin fila
  },
  claveEsLetra: bool,                            // opcional: la clave es una letra (§5.5)
  insertarPalabra({ estructura, letras }),       // opcional: una palabra, en una traza
  sinTamano: bool, tamano() -> { n, l },         // opcional: n y l los da el tema
  sinConfiguracion: bool,                        // opcional: sin panel; se crea al entrar
  nombreEstructura, mensajeReinicio,             // opcional: cómo se nombra al reiniciar
  casillasRelevantes(paso) -> [índices base 1],  // qué no puede elidirse
  describirCasilla({ paso, indice, ocupada })    // -> { estado, modificadores }
    -> cómo se pinta cada casilla en el paso actual,
  metricas: [{ id, etiqueta, valor({ estructura, paso }) }]
}
```

Es decir: **lo único que distingue un tema de otro es cómo se lee su traza.** Los campos opcionales son las tres formas en que un tema puede apartarse de la búsqueda por comparación: acumular una estructura por paso (binaria, §6.3), colocar por dirección en vez de por orden (`modo: 'dispersa'`, §3.2), y convertir la inserción en una operación reproducible con su cálculo a la vista (§6.5). Un tema que no declara ninguno se comporta como secuencial.

**Crear una estructura y reiniciarla son la misma operación** (`establecerEstructura`): la nueva nace vacía y la pantalla vuelve a su estado inicial. El formulario la llama con lo que el estudiante digitó; el botón **Reiniciar** del encabezado, con lo que la estructura ya tenía —mismo `n`, mismo `l`, mismo tratamiento— y además vacía la bitácora y el aviso (pedido del usuario, 2026-08-29: antes había que salir al menú y volver a entrar). Vive en el encabezado y no en un panel porque no es una operación sobre las claves sino sobre la pantalla entera, y ahí no depende de cuánto haya que desplazar el panel lateral. Sin estructura todavía, el botón no aparece: no hay nada que reiniciar.

**Un tema puede no tener nada que configurar.** El árbol digital no elige tamaño, ni longitud de clave, ni tratamiento: su panel de configuración se quedaría en un título y un botón que no decide nada, así que declara `sinConfiguracion` y **la estructura se crea al entrar al tema**. El panel lateral le queda en cuatro paneles en vez de cinco.

El estado (`estructura`, `reproductor`, `pasoActual`) vive en el closure de cada pantalla, no en variables del módulo `app.js`: dos temas abiertos en sucesión no comparten nada, y volver al menú no deja temporizadores corriendo.

**Estados y modificadores de casilla son cosas distintas.** El estado pinta (`ocupada`, `en-evaluacion`, `descartada`, `encontrada`…) y es uno solo. Los modificadores marcan pertenencias independientes del color: el corchete del rango activo en binaria (`en-rango`, `en-rango-inicio`, `en-rango-fin`) cubre también la casilla en evaluación, que ya tiene su propio color, y por eso no puede ser un estado más.

### Organización de archivos

```
/
├── index.html
├── CLAUDE.md
├── css/
│   ├── tokens.css          variables de color, tipografía, espaciado
│   ├── base.css            reset y elementos base
│   ├── componentes.css     casilla, panel, botón, alerta, bitácora
│   ├── pantallas.css       menú, tema, alertas
│   └── impresion.css       hoja de estilos del PDF
├── js/
│   ├── dominio/
│   │   ├── clave.js        validación, normalización, mapeo alfabético
│   │   ├── estructura.js   invariantes, insertar, eliminar, ordenar
│   │   └── limites.js      rango derivado de l, límites de n
│   ├── algoritmos/
│   │   ├── traza.js        contrato de paso y utilidades
│   │   ├── secuencial.js
│   │   ├── binaria.js
│   │   ├── eliminacion.js  eliminar en las ordenadas: buscar y sacar
│   │   ├── hash/
│   │   │   ├── comun.js       cifras necesarias, ajuste al rango
│   │   │   ├── modulo.js · cuadrado.js · truncamiento.js
│   │   │   ├── plegamiento.js · bases.js
│   │   │   └── operaciones.js traza de insertar, buscar y eliminar
│   │   └── colisiones/     reasignacion.js · anidados.js (falta encadenamiento)
│   ├── vista/
│   │   ├── componentes/    casilla, panel, alerta, métrica, bitácora, cálculo
│   │   ├── pantallas/
│   │   │   ├── menu.js           catálogo de temas y recientes
│   │   │   └── tema-busqueda.js  pantalla de trabajo, parametrizada
│   │   ├── elision.js      cálculo de casillas visibles
│   │   ├── reproductor.js  reproduce la traza: paso, continuo, velocidad
│   │   └── animacion.js    FLIP y utilidades de movimiento
│   ├── persistencia/
│   │   ├── archivo.js      serializar y leer .cc2
│   │   └── recientes.js    almacenamiento del navegador
│   └── app.js              catálogo, configuración de temas y enrutamiento
├── fuentes/
└── pruebas/
    ├── *.test.js           dominio y algoritmos, con `npm test`
    ├── humo.html           integración de la vista, en el navegador
    └── captura.html        deja la app en un estado concreto para fotografiarla
```

### Cómo se prueba

**El ritual entero vive en la skill de proyecto `.claude/skills/verificar/`** (2026-08-29), con los comandos ya escritos y las trampas del entorno resueltas:

```
npm test
node .claude/skills/verificar/scripts/humo.js                       # 700, 800 y 950 px de alto
node .claude/skills/verificar/scripts/captura.js "vista=anidados&paso=fin"
```

Lo que sigue explica qué cubre cada cosa; los detalles de operación están en la skill.

`npm test` (`node --test`, sin dependencias) cubre dominio, algoritmos y elisión: todo lo que es cálculo puro. `pruebas/apoyo.js` simula `window` para poder requerir esos archivos tal como los carga el navegador.

La vista no entra ahí —necesita DOM— y se cubre con `pruebas/humo.html`, que recorre la aplicación real por el DOM: entra al tema desde el menú, crea la estructura, inserta claves, avanza la traza y verifica estados, métricas y bitácora. Se abre con doble clic o sin ventana:

```
msedge --headless --disable-gpu --virtual-time-budget=8000 --dump-dom "file:///…/pruebas/humo.html"
```

Al tocar la pantalla de tema, correr las dos. La prueba de humo también verifica el layout —que la pantalla se ancle al viewport y que la estructura entre completa— porque es una regresión que no se ve en el DOM y sí arruina la proyección en clase.

Para revisar diseño hay `pruebas/captura.html`, que deja la aplicación en un estado concreto (`?vista=menu|secuencial|binaria`) y se fotografía sin abrir ventana:

```
msedge --headless --disable-gpu --hide-scrollbars --window-size=1500,950 \
       --screenshot=salida.png --virtual-time-budget=8000 \
       "file:///…/pruebas/captura.html?vista=binaria"
```

Vistas disponibles: `menu`, `secuencial`, `binaria`, `hash` (inserción que colisiona), `hash-libre` (inserción en casilla libre), `anidados`, `encadenamiento` y las tres de eliminación (`eliminar-secuencial`, `eliminar-binaria`, `eliminar-hash`); con `&paso=fin` se recorre la traza completa, con `&tratamiento=ninguno|reasignacion` se cambia el tratamiento, y con `&tema=`, `&base=` y `&posiciones=` se fotografía cualquiera de las cinco funciones hash con sus parámetros. La captura de `hash` es la que ya destapó un defecto real: la elisión escondía las claves ya colocadas, que en una tabla dispersa son el resultado mismo del algoritmo (§6.2).

`dominio/` y `algoritmos/` no importan nada de `vista/`. Esa regla es la que permite probar los algoritmos sin abrir el navegador.

---

## 5. Algoritmos — Fase 1

### 5.1 Búsqueda secuencial · `O(n)`

Recorrido lineal desde la casilla 1. Casilla relevante: la posición actual `i`.

### 5.2 Búsqueda binaria · `O(log n)`

Requiere estructura ordenada, que es invariante del sistema. Casillas relevantes: `inicio`, `medio`, `fin`.

Mostrar en métricas el máximo teórico: `⌈log₂ n⌉` pasos (`dominio/limites.js`, `maximoPasosBinaria`).

**Forma de la traza (implementada):** un paso por comparación, no dos. Cada paso lleva el rango vigente `inicio`, `medio`, `fin` —el que estaba activo *al comparar*, antes de descartar— y `descartadas`, el acumulado de casillas eliminadas por los pasos anteriores. Todo en base 1; la conversión ocurre solo al construir el paso.

Separar "comparar" y "descartar" en dos pasos se descartó: duplica la longitud de la traza y desalinea el conteo de comparaciones con el número de paso, que es justo la lectura que el estudiante debe poder hacer de un vistazo. El descarte se ve igual, porque el paso siguiente ya muestra el rango estrechado.

El paso final `no-encontrada` no lleva rango —ya no existe— y sí `descartadas` con la estructura completa.

### 5.3 Funciones hash

Todas devuelven una **dirección en base 1** dentro de `1..n`, y deben exponer los pasos intermedios del cálculo, que son el contenido didáctico central de estos temas.

Cada función devuelve `{ direccion, calculo }`, donde `calculo` es la lista de líneas `{ etiqueta, expresion, resultado }` del desarrollo, en orden. `expresion` es la cuenta tal como se escribe en el tablero; la vista revela una línea por paso del reproductor, así que cada línea tiene que poder mostrarse sola.

| Función | Cálculo | Parámetro del estudiante |
|---|---|---|
| **Módulo** | `(clave mod n) + 1` | — |
| **Cuadrado** | Elevar al cuadrado, tomar las cifras centrales que numeran el rango desde cero y sumar 1 | — |
| **Truncamiento** | Seleccionar posiciones fijas de los dígitos de la clave y sumar 1 | Las posiciones |
| **Plegamiento** | Partir la clave en grupos, sumarlos o multiplicarlos, tomar las últimas cifras del total y sumar 1 | La operación |
| **Conversión de bases** | Leer las cifras de la clave como cifras en base b, evaluar el polinomio y tomar las últimas cifras del total | La base |

Tres reglas comunes, en `algoritmos/hash/comun.js`:

1. **Cuántas cifras se toman.** Hay dos cuentas y no son la misma:
   - **Cuadrado, truncamiento y plegamiento toman las cifras de `n − 1`** (`cifrasDeRango`): dos con `n = 100`, porque el número extraído numera el rango de `00` a `99` y la cuenta cierra con el `+ 1`. Tomar tres metería en el número una cifra que ninguna dirección usa. En el plegamiento esa cuenta es además el tamaño del grupo: con `n = 100`, pares.
   - **La conversión de bases también toma las cifras de `n − 1`** (2026-08-29), y son cifras **decimales** del total del polinomio: dos con `n = 100`. Antes contaba cifras "en la base elegida", que era parte de la fórmula equivocada.
2. **Hay dos formas de cerrar el cálculo**, y cada función declara la suya en su última línea:
   - **Valores que ya cuentan desde 1** (`lineaDireccion`): se usan tal cual si caen en `1..n`.
   - **Valores que cuentan desde 0** (`lineaDireccionDesdeCero`): la dirección es `valor + 1`. Es el caso del cuadrado, el truncamiento y el plegamiento, y el mismo cierre que ya tenía la función módulo.

   En ambos casos, si el resultado se sale del rango se ajusta preservando las direcciones válidas: `((valor − 1) mod n) + 1`, de modo que 1 sigue siendo 1, `n` sigue siendo `n` y `n + 1` vuelve a 1. El doble módulo es por los valores menores que 1: en JavaScript el resto de un negativo es negativo, y sin corregirlo la casilla 0 sería posible.
3. **La última línea del desarrollo se rotula siempre `Dirección`** y su resultado es la dirección. No es cosmético: el reproductor lee el resultado de la última línea para saber a qué casilla apuntar.

**Corrección del docente (2026-08-23), función cuadrado.** Antes se tomaban las cifras de `n` y no había `+ 1`; con `n = 100` y la clave 3748 (`14047504`) eso daba `047` en vez de `47`. Como lo plantea el docente: se toman las **dos** cifras centrales, `47`, y la dirección es `48`. Cuando el cuadrado tiene una cantidad impar de cifras y hay que tomar una cantidad par, la selección **se corre hacia la izquierda**: en `3025² = 9150625` la cifra central es el `0` y la acompaña el `5` de su izquierda (`50` → dirección 51), no el `6` de su derecha, porque `150` se saldría del rango. **Corrección del docente (2026-08-23), función truncamiento.** La selección de posiciones ya era correcta; lo que faltaba era el `+ 1` final. Arrastra dos ajustes: las posiciones por defecto pasan a ser las de `n − 1` (dos con `n = 100`, que con el `+ 1` cubren exactamente `1..100`), y la advertencia de casillas inalcanzables se mide contra esa misma cuenta.

**Corrección del docente (2026-08-23), función plegamiento.** Tres cambios:

- **El grupo es del tamaño del rango**, no de `n`: con `n = 100` la clave 3025 se pliega en `30` y `25`, no en `302` y `5`.
- **Los grupos se suman o se multiplican**, y eso lo elige el estudiante al crear la estructura (`operacion`), igual que las posiciones del truncamiento y por la misma razón: cambiarlo con claves puestas dejaría direcciones que no corresponden a ninguna cuenta. Sin indicar nada, se suman. Es el único parámetro que se digita eligiendo de una lista, no escribiendo: `parametro.opciones` hace que el formulario dibuje un `<select>`.
- **Del total se toman las últimas cifras** —el acarreo que se sale por la izquierda se descarta, que es el plegado clásico— y después el `+ 1`. Con 3025 y `n = 100`: sumando, `55 → 56`; multiplicando, `750 → 50 → 51`.

**Corrección del docente (2026-08-29), conversión de bases.** La fórmula era otra. No se convierte la clave a la base: **se leen sus cifras decimales como si fueran cifras en base `b` y se evalúa el polinomio que forman**, y del total se toman las últimas cifras.

```
clave 1836, b = 6, n = 100

  1×6³ + 8×6² + 3×6¹ + 6×6⁰  =  216 + 288 + 18 + 6  =  528
  528 no cabe en 1..100  →  dos cifras (las del rango)  →  28  →  + 1  →  29
```

No es una conversión de base en sentido estricto, y ahí está lo que se venía haciendo mal: **las cifras de la clave pueden valer más que la base** —el `8` y el `6` del ejemplo no existen en base 6— porque la operación *mezcla* la clave, no la representa. Antes se convertía de verdad (`1836` en base 6 es `12300`), se truncaba esa representación y se leían las cifras en esa base, lo que daba la casilla 8 en vez de la 29.

Con eso queda resuelto lo que estaba pendiente sobre las cifras: **se truncan cifras decimales del total, y son las del rango** (`cifrasDeRango`), igual que en las otras tres. Ya no se cuentan cifras "en la base elegida", y `cifrasEnBase` desaparece.

**El `+ 1` también aplica aquí** (decisión del usuario, 2026-08-29). El enunciado del docente se detiene en el `28` —está explicando qué cifras se toman, no cerrando la dirección—, y la razón para sumar no es solo la consistencia con las otras cuatro: **el número truncado cuenta desde cero**. Con `n = 100` las dos últimas cifras van de `00` a `99`, que son exactamente cien valores, y sumar uno es la única forma de llevarlos a `1..100` sin caso especial. Sin el `+ 1`, el total terminado en `00` no tendría dirección propia y caía en la casilla `n` por el ajuste del módulo: una excepción que aparece en una clave de cada cien y es incómoda de explicar en el tablero. Cierra entonces con `lineaDireccionDesdeCero`, como cuadrado, truncamiento y plegamiento.

**Consecuencia a tener presente:** con el `+ 1`, el ejercicio del docente da la casilla **29** y no la 28. Es la única diferencia entre lo que él escribió en el tablero y lo que muestra la aplicación.

Detalles que no se deducen del enunciado y conviene no cambiar sin motivo: el cuadrado se calcula con `BigInt`, porque con claves largas supera el entero seguro y las cifras centrales saldrían falseadas; las posiciones del truncamiento se numeran desde 1 y de izquierda a derecha, como las casillas, y se toman **en el orden indicado**; el plegamiento parte de izquierda a derecha, así que el grupo corto queda al final; y "truncar" en conversión de bases es quedarse con las **últimas** cifras decimales del total.

**Los parámetros se eligen al crear la estructura**, junto a `n`, `l` y el tratamiento de colisiones, y por la misma razón (§5.4): cambiarlos con claves ya colocadas dejaría direcciones que no corresponden a ninguna cuenta. Se validan contra `n` y `l` en ese momento, no al insertar.

El documento original pedía soportarlas «en decimal y en binario». **Descartado (2026-08-29):** el usuario confirmó que lo binario no se vio en clase y no se va a implementar. Se daba por cubierto porque conversión de bases con base 2 mostraba la clave en binario y truncaba bits; con la fórmula del docente eso dejó de ocurrir —base 2 solo hace que las cifras de la clave pesen como bits— y al preguntarlo quedó claro que no hacía falta. **Las claves se digitan y se muestran siempre en decimal** (§3.3). No reabrir esto por "completar el enunciado": está decidido.

### 5.4 Tratamiento de colisiones internas

- **Reasignación** — prueba lineal desde la dirección ocupada.
- **Arreglos anidados** — estructura secundaria por dirección.
- **Encadenamiento secuencial** — lista enlazada por dirección.

La traza debe registrar **cada casilla recorrida** por el tratamiento, no solo el destino final.

**El tratamiento no es un tema aparte: es parte de cada función hash (pedido del docente, 2026-08-22).** No aparece en el catálogo como tema propio. Se elige **al crear la estructura**, junto a `n` y `l`, y vale para toda su vida.

Se elige al crear y no después porque el tratamiento cambia la **forma** de la estructura y no solo su comportamiento: arreglos anidados y encadenamiento necesitan estructuras secundarias por dirección, así que cambiarlo con claves ya colocadas obligaría a redispersar la tabla entera. Como efecto secundario, comparar dos tratamientos es crear dos estructuras con las mismas claves y ponerlas lado a lado, que es como se explica en clase.

`ninguno` es un tratamiento más, y el que deja ver la función hash pura: al chocar, la clave **no entra** y la casilla se marca como colisión. Es el estado inicial del selector.

#### Arreglos anidados (2026-08-29)

**La estructura es una matriz de `n × n`.** La primera columna es la tabla y las otras `n − 1` son el arreglo anidado de cada dirección, así que en una dirección caben `n` claves contando la suya. **El tamaño no se pide: sale de `n`.** Pedirlo como parámetro fue el primer intento y estaba mal — es forma de la estructura, no una elección del estudiante.

**La clave nunca se aleja de su dirección**, y eso es lo que lo separa de la reasignación: el límite es la capacidad del arreglo de esa dirección, no la de la tabla.

- **La clave que obtuvo la dirección se queda en la casilla de la tabla**; el anidado es para las siguientes. Una dirección sin colisiones no usa su arreglo.
- **Cuando el arreglo se llena, la clave no entra** y se dice por qué. Deja ver el límite del método, que es la razón de que después se enseñe encadenamiento. Dejarlo crecer sin tope lo convertiría en encadenamiento y los dos temas se verían igual.
- **Búsqueda:** primero la casilla de la dirección, después el arreglo posición por posición. Hasta `n` comparaciones, y eso es lo que la métrica debe dejar ver. Una posición vacía prueba la ausencia: el arreglo se llena en orden.
- **Eliminación:** la clave sale de donde esté y el arreglo cierra el hueco. Si la que salió era la de la tabla, **sube la primera del anidado a ocuparla** — sin eso quedaría una dirección vacía con claves colgando, que contradice lo que el dibujo dice y dejaría la primera comparación de la búsqueda contra una casilla que nadie ocupa.
- **El factor de carga se mide contra la capacidad, `n × n`.** Dividir por `n` daría más de 1 con la tabla a medio llenar.

**Cómo se dibuja** (maqueta acordada con el usuario, que la había trabajado igual): la fila de cada dirección se lee como una matriz, con un canal entre la tabla y su arreglo.

```
         tabla        arreglo anidado (n - 1 = 9)
  dir      ·        1      2      3     ...     9
    3   [ 7412 ]  [5312] [9912] [    ]  ...  [    ]
    4   [ 1023 ]  [    ] [    ] [    ]  ...  [    ]
```

**El arreglo elide con la misma regla que la tabla** (§6.2): la primera posición, la última, las ocupadas, y un tramo diciendo cuánto se resumió. Con `n = 10` sus nueve columnas caben y no se elide nada, que es el caso del salón; con `n = 100` serían 99 columnas por fila y sin elidir habría que desplazarse a lo ancho, encima del desplazamiento vertical que el lienzo ya tiene.

Las posiciones vacías que sí se dibujan son la única excepción a la regla de no dibujar casillas vacías: ahí no son direcciones intermedias sino la capacidad del arreglo, y ver cuánto queda antes de que el método se agote es lo que el tema enseña.

**Los segmentos del anidado se calculan una sola vez para todas las filas**, sobre las posiciones ocupadas de la estructura entera. Si cada fila elidiera por su cuenta tendrían distinta cantidad de columnas y la matriz dejaría de estar alineada, que es justo lo que la hace legible — el mismo cuidado que las columnas del apilado de binaria (§6.3).

El tema lo declara con `anidados: { tamano(estructura), columnas(estructura) }`, y `describirCasilla` recibe `posicion` para distinguir la casilla de la tabla —donde es `undefined`— de cada casilla del arreglo.

#### Encadenamiento secuencial (2026-08-29)

**Es el hermano de los arreglos anidados, y lo único que los separa es que la cadena no tiene tope.** Por eso se leen igual salvo en eso, y por eso comparten la estructura secundaria del dominio (`estructura.anidados`), sus aplicadores (`colocar-anidado`, `retirar-anidado`, `compactar-anidado`) y la rama de eliminación.

```
  anidados     3  [ 7412 ]  [ 5312 ][ 9912 ][      ]   ← tope de n − 1, hueco a la vista
  encadenado   3  [ 7412 ] → [ 5312 ] → [ 9912 ]       ← sin tope, crece
```

- **La casilla de la tabla guarda la primera clave**, igual que en anidados; la cadena es para las que chocaron. Una dirección sin colisiones no dibuja cadena. Se descartó el modelo clásico —la tabla como arreglo de punteros— porque dejaría la tabla sin claves y se leería distinto de los otros tres tratamientos.
- **El enlace se dibuja con flecha** (`→`) entre casillas, y la primera sale de la casilla de la tabla. Es lo que distingue a simple vista la cadena del arreglo anidado; sin flecha los dos tratamientos se verían casi igual y lo que los separa dejaría de verse en el dibujo. Se descartó dibujar la cadena hacia abajo: cada colisión sumaría filas al alto, que es el recurso escaso.
- **Nunca se satura.** No hay paso de saturación en la traza, y `capacidad()` deja de ser un número: `tamanoAnidado` vale `Infinity` y la capacidad con él. Es lo que define al tratamiento.
- **El factor de carga cambia de significado.** Con anidados se mide contra `n × n`; aquí contra `n` —lo que devuelve `dominio.estructura.baseDeCarga`— y **puede pasar de 1**, que es lo que el factor de carga significa en una tabla encadenada: claves por dirección en promedio. Dividir por una capacidad infinita daría siempre 0.
- **Búsqueda:** primero la casilla de la dirección, después la cadena posición por posición. No hay posición vacía que pruebe la ausencia —una cadena no tiene huecos, la clave nueva se engancha al final— así que **lo que la prueba es llegar al final de la cadena**. Es la única diferencia de fondo con el recorrido del arreglo anidado.
- **Eliminación:** igual que en anidados. La clave sale, la cadena cierra el hueco, y si la que salió era la de la tabla sube la primera de la cadena a ocuparla.

**Elisión:** la cadena elide como todo lo demás —cabeza, cola, la posición del paso y `⋯ N ⋯` en medio—, con dos diferencias respecto de la matriz:

1. **Aquí sí se pueden comprimir casillas ocupadas**, al revés que en la tabla dispersa (§6.2): en una cadena la posición es orden de llegada y no el resultado del algoritmo, así que comprimir el medio no esconde lo que el tema enseña.
2. **Cada fila elide por su cuenta**, al revés que en anidados (donde los segmentos se calculan una sola vez para todas las filas). Una lista no es una matriz: no hay columnas que alinear entre direcciones, y cada dirección crece lo que crezcan sus colisiones.

Por eso la cadena ocupa **una sola columna del grid de la fila** y se ordena por dentro (`.cadena`, un flex), en vez de una pista por posición.

### 5.5 Otras búsquedas internas

Por residuos, árboles de búsqueda digital, residuos múltiples, tablas de índices, método de la rejilla, árboles 2D. Mismo contrato: producen traza.

**Los tres primeros trabajan con letras, no con números** (pedido del usuario, 2026-08-29): el ejercicio de clase es la palabra `prueba`, cuyas letras se insertan en orden.

#### La letra y su código (2026-08-29)

**La letra viaja como su byte, pero se ramifica con las cinco últimas cifras de ese byte**, que son su posición en el alfabeto:

```
  p = 112 = 011 10000 → 10000 (16)      a =  97 = 011 00001 → 00001 (1)
  r = 114 = 011 10010 → 10010 (18)      b =  98 = 011 00010 → 00010 (2)
  u = 117 = 011 10101 → 10101 (21)      e = 101 = 011 00101 → 00101 (5)
```

Con el byte entero las tres primeras cifras (`011`) son iguales en todas las letras y nada se bifurca hasta el bit 4: las seis letras de `prueba` quedarían en una sola rama. Con cinco, el árbol se abre a lado y lado, que es como lo dibuja el docente. Mayúscula y minúscula dan las mismas cinco cifras, así que da igual cómo se digite; se guarda en minúscula.

Vive en `dominio/clave.js` (`BITS_LETRA`, `codigoDeLetra`, `validarLetra`, `validarPalabra`) y lo comparten los tres temas.

#### Árboles de búsqueda digital (2026-08-29)

**Un bit por nivel**: en el nivel `d` se mira el bit `d` del código, `0` baja a la izquierda y `1` a la derecha. La primera clave queda en la raíz. El árbol de `prueba`:

```
            p                p en la raíz
         0/   \1             e y r por el bit 1
        e       r            b y u por el bit 2
      0/      0/             a por el bit 3
      b       u
    0/
    a
```

- **Las claves viven en todos los nodos, no solo en las hojas.** Es lo que lo separa de los temas de residuos: en cada nodo se compara la clave entera antes de mirar el bit siguiente, así que una búsqueda puede terminar en cualquier nivel.
- **El árbol se guarda en el mismo `claves` de la estructura, indexado como árbol binario implícito** (`modo: 'arbol'`, raíz en la posición 1, hijos de `i` en `2i` y `2i + 1`). No es un atajo: en un árbol digital **la posición es el camino de bits que llevó hasta ella**, así que el índice ya dice lo que el tema enseña, y dibujar o contar sigue leyendo `claves` como en los demás temas. Las operaciones viven en `dominio/arbol.js`.
- **El tema no pide `n` ni `l`.** Cuántas posiciones caben sale de los bits del código —con cinco, 31—, y la clave es siempre una letra. `n` deja de ser una capacidad elegida y por eso el tema no lleva factor de carga: su métrica propia es la **altura**, que es lo que cuesta la peor búsqueda y tiene por tope el número de bits.
- **Una posición vacía prueba la ausencia**: si la clave existiera, sus bits la habrían puesto justo ahí.
- **Se puede insertar una palabra entera**, y sus letras viajan en **una sola traza**: se avanza y se retrocede letra por letra como en cualquier otra operación. No es un llenado —que prepara el escenario sin reproducir nada—: aquí el recorrido de cada letra *es* la lección.
- **Eliminación** (§5.6): si el nodo es una hoja, se va y ya. Si tiene descendientes, dejar el hueco partiría el árbol —lo que cuelga de él dejaría de ser alcanzable—, así que **sube una hoja de su propio subárbol** a ocupar el sitio. Sirve cualquiera: esa hoja llegó hasta ahí bajando por la posición que queda libre, de modo que sus primeros bits son justo los que esa posición exige y ninguna búsqueda cambia de camino. Se elige la más profunda porque es la que más baja la altura.

### 5.6 Eliminación

**La aplicación elimina claves, y cada tema elimina con su propio método** (pedido del usuario, 2026-08-29). No existe un algoritmo de borrado: eliminar es **localizar la clave con el algoritmo del tema y solo entonces sacarla**. Borrar en secuencial recorre desde la casilla 1; borrar en binaria divide; borrar en una tabla hash calcula la dirección. Por eso una traza de eliminación empieza siendo, literalmente, una traza de búsqueda: los pasos de borrado se le agregan detrás.

Consecuencia directa: **que la clave no esté no se comprueba por adelantado.** Descubrirlo es el trabajo de la búsqueda, y el estudiante tiene que verla recorrer hasta concluirlo. Es la diferencia con la inserción, donde el duplicado y la saturación sí son estados de la estructura y se avisan de una vez, sin reproducir nada (§3.2).

**En las estructuras ordenadas —secuencial y binaria— son dos pasos y no uno.** Primero se marca la casilla que sale, con su clave todavía dentro; después se cierra el hueco y las siguientes se desplazan. Con un solo paso la clave desaparece y las demás se corren a la vez, y no se alcanza a ver de cuál casilla salió, que es justo lo que la animación de eliminación existe para mostrar (§7).

**En una tabla dispersa con reasignación hay que redispersar el grupo.** Borrar en medio de un sondeo deja un hueco que corta la cadena: una clave que se corrió más allá deja de ser alcanzable, porque la búsqueda se detiene en la primera casilla vacía que encuentra. Así lo explica el docente y así se implementa: **las claves que siguen al hueco vuelven a pasar por la función hash**, se levantan una a una y se vuelven a dispersar, con su cálculo y su sondeo a la vista.

```
7412 → dirección 3          3 [7412]        3 [7412]        3 [7412]
5312 → dirección 3,         4 [5312]   →    4 [    ]   →    4 [9912]
       sondea la 4          5 [9912]        5 [9912]        5 [    ]
9912 → dirección 3,
       sondea 4 y 5        se borra 5312   9912 vuelve a pasar por el hash:
                                           dirección 3 ocupada, sondea la 4
```

El grupo se recorre **hasta la primera casilla vacía y no más allá**. Si hay una vacía, ninguna clave posterior pudo haberse corrido cruzándola, así que su cadena nunca pasó por aquí: "reorganizar las que colisionaron" y "reorganizar el grupo detrás del hueco" terminan siendo lo mismo. Una clave del grupo que sí estaba en su propia dirección se levanta igual —es parte del grupo— y el cálculo la devuelve a su sitio.

Sin tratamiento no hay nada que redispersar: la casilla se vacía y ya, porque ninguna clave llegó a estar fuera de su dirección.

**El paso declara su efecto, la vista lo aplica.** La traza sigue sin tocar la estructura (§4). Un paso puede llevar `efecto: { tipo: 'colocar' | 'retirar' | 'eliminar', casilla, clave }`, y la pantalla lo aplica al llegar y lo deshace al retroceder. Reconstruye desde el estado previo a la operación en vez de deshacer paso a paso: una eliminación con redispersión mueve varias claves, y las inversas encadenadas son justo donde se cuelan los errores. Antes de esto la pantalla adivinaba el efecto por el tipo del paso, lo que solo alcanzaba para una única colocación por operación.

**En binaria, los pasos que sacan la clave no van apilados.** Sacar no es descartar, así que no les corresponde una fila más; y las filas ya dibujadas se leen del mismo arreglo, de modo que el desplazamiento las cambiaría todas hacia atrás. El tema lo declara con `apilada.aplicaA(paso)` y esos pasos se dibujan sobre la estructura completa, que es donde el desplazamiento se ve moverse.

---

## 6. Visualización

### 6.1 Orientación

- Secuencial y binaria: estructura **horizontal**.
- Funciones hash: estructura **vertical**.

### 6.2 Regla de elisión

Solo se dibuja lo relevante del paso actual. Es lo que permite que `n` no tenga límite impuesto por la pantalla.

- Si `n ≤ 12` (horizontal) o `n ≤ 10` (vertical), se muestra completa.
- Por encima, permanecen **siempre visibles**: la casilla 1, la casilla n, y las casillas relevantes del paso. **Con una vecina a cada lado solo en las estructuras ordenadas** (secuencial, binaria), donde acompaña a una comparación: se ve contra qué se comparó y qué había al lado.
- Casillas relevantes: `i` en secuencial · `inicio, medio, fin` en binaria · `d` en hash · `d` más el recorrido del tratamiento cuando hay colisión.
- **En una estructura dispersa, toda casilla ocupada es relevante**, aunque el paso actual no la toque. Dónde quedó cada clave *es* el resultado de la función hash: comprimirla dentro de un tramo borra justamente lo que el tema enseña. En las ordenadas no hace falta, porque las claves ocupan siempre el mismo prefijo y su posición no dice nada por sí sola.
- **En una estructura dispersa no se dibujan vecinas** (pedido del docente, 2026-08-23). Una tabla grande se dibuja con sus extremos y las claves colocadas, y nada entre medias: `1 ⋯ 15 ⋯ 21 ⋯ 56 ⋯ 100`. Es como se dibuja en el tablero y es lo que el tema enseña — las direcciones vacías intermedias no dicen nada y son las que llenaban la pantalla. Con seis claves en `n = 100` la diferencia son 8 casillas dibujadas contra 20, y 15 filas contra 27. **No se pierde el sondeo de la reasignación**: `casillasRelevantes` ya trae las casillas sondeadas, así que el recorrido de la clave se dibuja entero sin necesidad de vecinas. Lo decide quien dibuja, con `vecinas: false` en `calcularSegmentos`.
- **Cada tramo comprimido muestra cuántas casillas oculta, y nada más.** Sin el conteo se pierde la noción del tamaño real. **Lo que sí se quitó es el rótulo del rango elidido** (`6–8` en la escala, pedido del usuario, 2026-08-29): se multiplicaba con la estructura, porque cada clave insertada parte un tramo en dos y la tabla acababa con más números de escala que claves. Lo que el tema enseña es dónde cayó cada clave, y el rango elidido no aporta a eso. Vale en los tres dibujos —secuencial, binaria apilada y hash—, para que la elisión se lea igual en toda la aplicación.
- **Un tramo de una sola casilla no se comprime: se dibuja.** El rótulo `⋯ 1 ⋯` ocupa más que la casilla que esconde. Aparece de forma natural en binaria, cuando `inicio`, `medio` y `fin` con sus vecinas dejan una casilla suelta entre dos visibles.
- La expansión y compresión de tramos se anima; no es un salto brusco.
- Control "Ver estructura completa" que desactiva la elisión.

La estructura se dibuja **centrada** en el lienzo, horizontal y verticalmente. Es el foco de atención durante toda la clase.

**Cuando aun así no cabe, la casilla del paso se lleva a la vista.** La elisión acota lo dibujado, pero no lo elimina: cada clave colocada suma unos 78 px, y el lienzo mide unos 640 px en una ventana de 950 y unos 390 en una de 700 — o sea unas seis claves y unas tres. Pasado ese punto el lienzo se desplaza, y el desplazamiento lo hace la vista sola, centrando la casilla que el paso está evaluando. Sin eso el desarrollo dice "dirección 56" y la tabla se queda mostrando las primeras casillas, que es exactamente el defecto que esto corrige. El salto es instantáneo y no suave: ocurre dentro del cambio que anima el FLIP, y un desplazamiento en curso dejaría las casillas animándose hacia coordenadas que ya se movieron.

Comprobarlo tiene truco y conviene no repetir el error: **medir la caja no sirve**. `.estructura-vertical` lleva `max-height: 100%`, así que su rectángulo siempre cae dentro del viewport aunque por dentro sobresalgan filas. Lo que hay que comparar es `scrollHeight` contra `clientHeight`, o dónde queda la casilla marcada respecto de la caja. La comprobación vieja medía la caja y por eso el defecto vivió sin que ninguna prueba lo viera.

**La pantalla de tema se ancla al alto del viewport y la página nunca scrollea.** El desplazamiento vive dentro del panel lateral. Si scrollea la página, el panel lateral —que acumula configuración, operaciones, reproducción, métricas y bitácora— estira el lienzo y empuja la estructura fuera de la pantalla: al proyectar en el salón se pierde justo lo que la aplicación existe para mostrar.

**Insertar, buscar y eliminar comparten un solo panel** (pedido del docente, 2026-08-29). Las tres operan sobre lo mismo —una clave—, así que el panel tiene un campo y tres botones, más el llenado automático. Antes eran tres paneles con un campo idéntico cada uno: repetían el mismo formulario tres veces y empujaban reproducción, métricas y bitácora hacia abajo, que es la misma presión que el ancla al viewport existe para contener. El panel lateral queda en cinco paneles y no siete. No es que ahora todo quepa sin desplazar —en una ventana de 700 px el lateral sigue midiendo bastante más de lo visible, y para eso scrollea—, pero en la ventana de proyección la reproducción vuelve a quedar a la vista sin buscarla.

Solo la inserción limpia el campo al terminar: es la que se repite clave tras clave al preparar el escenario. Buscar y eliminar dejan el valor, que suele ser el mismo con el que se quiere seguir operando. `Enter` inserta.

**El aviso va anclado arriba del panel lateral y no se desplaza con él** (pedido del usuario, 2026-08-29). Con la columna abajo —en operaciones o en la bitácora— un aviso en el borde superior quedaba fuera de la vista y había que subir a buscarlo, que es tanto como no darlo. Va ahí y no al pie de la ventana ni sobre el lienzo porque **el alto del lienzo es el recurso escaso**: una tabla dispersa ya no cabe en una ventana de 700 px (544 px de contenido en 390 px visibles), y una banda al pie se lo quitaría — y si apareciera y desapareciera según haya mensaje, el lienzo cambiaría de alto a cada paso y la estructura daría saltos. La lateral no le quita nada.

**Lo que pasa durante la traza se dice, no solo se ve.** La bitácora registra todos los pasos; el aviso destaca los que deciden el resultado, para no tener que leerla entera para saber qué pasó:

| Paso | Aviso |
|---|---|
| `colision` | advertencia |
| `rechazada` · `saturada` | error |
| `no-encontrada` | advertencia |
| `encontrada` · `insercion` · `eliminacion` | información |

Los pasos de recorrido —comparación, sondeo, cálculo, desplazamiento, extracción— **no avisan**: son el trámite, no la noticia, y avisar en cada uno haría parpadear el panel y dejaría de leerse. El aviso **se deduce del punto de la traza y no se acumula**: al retroceder vuelve a decir lo que correspondía ahí, buscando hacia atrás la última noticia, igual que la estructura se rehace desde su estado base (§5.6).

Detalle que hace falta y es fácil de omitir: las filas del grid van con `minmax(0, 1fr)`, no `1fr`. Sin el `minmax(0, …)` una fila de grid no puede encogerse por debajo de su contenido, y el panel lateral vuelve a estirar el lienzo aunque la pantalla tenga el alto fijado.

### 6.3 Estructuras apiladas (binaria)

**Pedido del docente (2026-08-18): binaria no muestra una estructura que cambia, sino una estructura por paso, apiladas.** Cada fila es la estructura *resultante* de ese paso: solo el tramo que sobrevivió al descarte. Al terminar la búsqueda, el apilado completo es el paso a paso del algoritmo, legible de un vistazo — que es como se explica en el tablero.

- Cada fila se acorta respecto de la anterior, y eso hace visible la reducción a la mitad.
- Las filas se alinean por columna: la casilla 7 cae bajo la casilla 7 de la fila de arriba. Sin esa alineación se pierde la noción de *dónde* está lo que sobrevivió.
- Las filas aparecen **una por paso** al avanzar, y retroceder las quita. El apilado sigue al reproductor, no lo reemplaza.
- La fila de una búsqueda fallida no tiene rango: anuncia *Rango vacío: no quedan casillas por examinar* en lugar de quedar en blanco.
- El corchete de rango activo no se dibuja aquí: la fila entera **es** el rango, y repetirlo sería ruido.

**Pendiente de consultar con el docente (2026-08-22): la primera fila muestra el rango de la búsqueda, no las `n` casillas.** Como `buscarBinaria` recorre solo el arreglo de claves, el rango del paso 1 va de 1 a la cantidad de claves; las casillas vacías del final (siempre al final, porque `dominio/estructura.js` inserta empaquetado) no aparecen en ninguna fila. Solo se nota cuando la estructura no está llena. La alternativa evaluada —dibujar la fila 1 completa, con las vacías, y recortar de la fila 2 en adelante— convence al usuario, pero **no se implementa hasta que el docente opine**: las vacías nunca fueron candidatas y mostrarlas puede leerse como que se descartaron en el paso 1. No "corregir" esto por iniciativa propia.

Dos decisiones de implementación que hay que respetar al tocar esto:

1. **Un solo grid para todo el apilado**, no un grid por fila. Con grids independientes las columnas de cada fila se dimensionan por separado y dejan de corresponderse, que es justo lo que la vista necesita.
2. **Las columnas se calculan una vez por búsqueda**, con las casillas relevantes de la traza completa. Si se recalcularan paso a paso, las columnas se moverían bajo las filas ya dibujadas.

El modo lo activa la configuración del tema (`apilada.rangoDePaso`); los temas que no lo declaran siguen con una estructura única, como secuencial.

### 6.4 Regla de índices

Bajo la estructura horizontal —y al costado de la vertical— corre una escala continua que numera las posiciones, con marcas mayores cada 5. Cuando hay elisión, la escala se comprime pero **mantiene visible la numeración real de lo dibujado**: cada casilla que sobrevive conserva su índice, así que la numeración nunca miente sobre dónde está una clave. Es el elemento distintivo del producto. **El tramo comprimido no se rotula** (ver 6.2): declara cuánto oculta desde su propia casilla (`⋯ 18 ⋯`) y deja el hueco de la escala vacío.

**Cada casilla y su marca se dibujan en la misma columna** (`.columna-casilla`), no en dos filas independientes. Con elisión los tramos tienen ancho propio, y dos contenedores paralelos desalinean la numeración de lo que rotula — que es precisamente el error que la escala existe para no cometer. En vertical el par es `.fila-casilla` y la marca va a la izquierda, pero la regla es la misma: van juntos.

Dos consecuencias de que el tramo ya no lleve marca, ambas de alineación: la estructura horizontal alinea sus grupos **por arriba** (`align-items: flex-start`) —al pie, el grupo del tramo, más bajo por no tener marca, se hundiría a la altura de la numeración— y en vertical el tramo se manda a mano a la segunda columna del grid, que si no el navegador lo metería en la de la escala.

### 6.5 El cálculo de la dirección (transformación de claves)

El desarrollo del hash se dibuja **junto a la estructura**, en el lienzo, y no en el panel lateral: lo que se enseña es la correspondencia entre la cuenta y la casilla que resulta de ella, y esa correspondencia se pierde si las dos cosas viven en extremos opuestos de la pantalla.

**Insertar deja de ser instantáneo y pasa a ser una operación reproducible** (decisión del usuario, 2026-08-22), porque en estos temas insertar *es* lo que hay que enseñar: buscar solo repite el mismo cálculo. Una línea del desarrollo por paso del reproductor, y la clave se coloca en el último paso, no antes.

Tres consecuencias que hay que respetar al tocar esto:

1. **El reproductor es de la operación en curso, sea buscar o insertar.** Por eso vive en su propio panel y no dentro del formulario de búsqueda.
2. **La traza no toca la estructura.** Igual que en las búsquedas, es la pantalla la que aplica el efecto al alcanzar el paso que coloca la clave, y lo **deshace** al retroceder. Sin eso, retroceder mostraría una estructura que no corresponde al paso en pantalla.
3. **Abandonar una inserción a medio reproducir la consuma.** Al empezar otra operación, o al volver al menú, la clave pendiente se coloca antes de olvidar la traza; de lo contrario quedaría en el limbo.

Cada paso carga las líneas reveladas hasta ese momento —no solo la última—, del mismo modo que los pasos de binaria cargan sus `descartadas`. Es lo que permite que el panel se dibuje sin recordar nada del paso anterior.

El **llenado automático** no reproduce nada: llena aplicando directamente el paso que coloca de cada traza. Llenar es preparar el escenario, no la lección; la lección es la clave que se inserta a mano.

### 6.6 Ancho de casilla (2026-08-29)

**Todas las casillas de una estructura miden lo mismo, tengan clave dentro o no.** El ancho sale de `l` —lo que ocupa una clave de `l` cifras con su marca— y se fija al crear la estructura, en la variable `--ancho-casilla` de la raíz de la pantalla; lo heredan por igual la tabla, sus arreglos anidados y el apilado.

Antes cada casilla se dimensionaba por su contenido y la estructura se deformaba a medida que se insertaban claves: con `n = 10` y `l = 4`, la casilla vacía medía 42 px, la que tenía clave 50 y la recién insertada 60, así que la fila con clave empezaba 11 px a la izquierda de la vacía y las columnas del arreglo anidado dejaban de corresponderse. En una matriz eso es fatal: lo que se enseña es cuánto espacio queda en cada dirección, y no se lee si las columnas no están alineadas.

Dos detalles que sostienen la regla:

- **El ancho se mide, no se calcula con `ch`.** El mismo valor lo usan las pistas del grid de las filas, y allí `ch` resolvería contra la fuente de la fila —proporcional— y no contra la monoespaciada de la casilla. Se mide una casilla de prueba en el DOM (`vista.componentes.casilla.anchoParaCifras`), con sus dos marcas más anchas (`◂` de insertada y `✕` de eliminada), y así el ancho reservado ya contiene el relleno, el borde y la fuente que de verdad esté cargada.
- **Las pistas del grid son fijas, salvo el tramo elidido.** Con `auto`, cada fila era un grid independiente que repartía el sobrante a su manera. El tramo sí se dimensiona por su contenido: lleva un conteo dentro, no una clave. La primera columna del arreglo anidado suma además el canal que la separa de la tabla (§5.4).

La prueba de humo lo vigila con `afirmarCasillasParejas` y `afirmarColumnasAlineadas`: es un defecto de layout, invisible para `node --test`.

### 6.7 El árbol (2026-08-29)

Tercera orientación de la pantalla, además de horizontal y vertical: ni fila ni tabla, sino **niveles**. Cada nodo se posiciona a mano dentro de un lienzo propio —columna por recorrido en orden, fila por nivel— porque el nivel *es* el número de bit que se miró para llegar hasta él, y eso no lo puede decidir el flujo del documento.

**Las aristas se rotulan con el bit** que lleva a cada hijo (`0` izquierda, `1` derecha), dibujadas en un SVG detrás de las casillas. Sin ese rótulo el dibujo no dice por qué la clave tomó ese camino, que es justo lo que el tema enseña. El desarrollo completo —código de la letra y bajada bit a bit— se lee en el panel del cálculo, al lado, igual que la dirección en las funciones hash (§6.5); el nodo solo muestra la letra (decisión del usuario sobre maqueta, 2026-08-29).

Dos consecuencias:

- **El árbol no elide** y su control desaparece del lienzo: su tamaño lo acota el alfabeto, no un `n` que el estudiante elige.
- **Se dibujan también las posiciones vacías que son ancestro de una ocupada.** Es lo que hace visible el hueco a medio eliminar —el paso que saca la clave antes de que suba la hoja— en vez de dejar descendientes flotando sin padre.

### 6.8 La reproducción arranca sola (2026-08-30)

**Toda operación con traza —buscar, insertar, eliminar, en cualquier tema— empieza a reproducirse sola.** Antes se quedaba en el primer paso esperando que alguien pidiera el siguiente, y eso estorba: lo normal es querer ver la operación entera, y pedir cada paso a mano convierte en trabajo lo que debería mirarse (pedido del usuario, 2026-08-30).

Los controles no se van: paso anterior, paso siguiente, reproducir y detener siguen ahí y siguen valiendo. **Cualquiera de ellos corta la reproducción en curso**, sin que haya que detenerla primero, porque los cuatro pasan por `irAPaso` y `irAPaso` cancela el temporizador antes de moverse (§4, interrumpibilidad). De ahí que la prueba de humo y las capturas, que hacen clic en «paso siguiente» de forma síncrona, sigan controlando la traza igual que antes: el primer clic apaga el automático.

**El paso dura 1,6 s por omisión y el deslizador va de 4 s a 0,2 s** (eran 800 ms y un tope de 2 s). Ahora que la traza corre sola en vez de esperar un clic, el ritmo por omisión es el que se ve casi siempre, y a 800 ms los pasos se atropellaban; el extremo lento tampoco daba para seguir una comparación en voz alta. El ritmo no toca las animaciones, que siguen fijas en 400 ms (§7): lo que se alarga es la pausa para leer el paso, no el movimiento.

**El deslizador crece hacia la derecha y lleva su lectura en segundos al lado** (pedido del usuario, 2026-08-30). Se llama «Velocidad», así que a la derecha tiene que ir más rápido; pero lo que el reproductor consume es el tiempo *entre* pasos, que crece al revés. La conversión es un espejo —`min + max − valor`, en `espejarVelocidad`— y por eso sirve para los dos sentidos con una sola función. Al tocar esto hay que acordarse de que **el valor del `<input type="range">` ya no es milisegundos**: quien lo lea directo pondrá la traza al revés sin que nada más falle. Lo vigila la comprobación `controlDeVelocidad` de la prueba de humo, que mide los dos extremos y el centro.

---

## 7. Animación

El profesor evalúa explícitamente que los bloques se muevan. Estas son las animaciones obligatorias:

1. **Inserción** — la clave entra y las claves mayores se desplazan para abrirle lugar. Es la más visible y la que hay que resolver primero.
2. **Eliminación** — la casilla se vacía y las siguientes se desplazan. Va en dos pasos, y por qué está en §5.6.
3. **Paso del algoritmo** — cambio de estado de las casillas involucradas.
4. **Elisión** — expansión y compresión de tramos.
5. **Llenado automático** — inserciones sucesivas, no un salto al estado final.

### Dos capas que no se mezclan

| Capa | Qué anima | Duración | Curva |
|---|---|---|---|
| Interfaz | Paneles, alertas, hover, cambios de pantalla | 140–220 ms fijos | `ease-out` |
| Algoritmo | Paso, elisión, reordenamiento | La que fije el usuario | Lineal o `ease-in-out` suave |

**La capa de algoritmo no lleva rebote, spring ni personalidad.** Si el paso dura exactamente lo configurado, el tiempo se vuelve comparable entre algoritmos — que es justamente lo que la asignatura pide evaluar. Un easing con carácter arruina la comparación.

### Reglas técnicas

- Animar **solo `transform` y `opacity`**, nunca propiedades de layout.
- Para el reordenamiento al insertar, usar la técnica **FLIP**: medir posición antes, aplicar el cambio, medir después, animar el delta con `transform`.
- **Las animaciones son interrumpibles.** Si el usuario avanza pasos en rápida sucesión, se reemplazan; no se encolan. Con la traza esto es trivial: se salta al paso destino.
- Respetar `prefers-reduced-motion`: sustituir la animación por cambio de estado directo.
- Cada casilla necesita una **identidad estable** —clave como llave, no índice— para que el reordenamiento anime el movimiento y no un redibujado.

---

## 8. Sistema visual

### 8.1 Principio

**El color es información, no decoración.** Cada tono está asignado a un estado del algoritmo y no se reutiliza con fines estéticos en ninguna otra parte. En particular, **las alertas no usan los colores de estado del algoritmo**: se diferencian por icono, barra lateral y texto sobre fondo blanco.

**El color nunca es el único canal.** Cada estado lleva refuerzo de forma para funcionar proyectado en videobeam y para usuarios con daltonismo.

### 8.2 Tokens de color

```css
--papel:              #EDF0F3;  /* fondo de la aplicación */
--superficie:         #FFFFFF;  /* paneles, tarjetas, casillas ocupadas */
--superficie-hundida: #E4E8EC;  /* lienzo de la estructura, campos */
--tinta:              #24303B;  /* texto principal, bordes de casilla */
--tinta-suave:        #5C6B78;  /* texto secundario, índices */
--borde:              #C6D0D8;  /* separadores */
--borde-fuerte:       #9AA8B4;  /* contorno de paneles */
```

**Estados del algoritmo** — cada uno con su refuerzo no cromático:

| Estado | Borde | Relleno | Refuerzo |
|---|---|---|---|
| Vacía | `#B7C2CB` | `--superficie-hundida` | Contorno punteado |
| Ocupada | `#24303B` | `#FFFFFF` | — |
| Rango activo | `#2F6E96` | `#DCE9F1` | Corchete sobre el tramo |
| En evaluación | `#C77C1E` | `#F7E2BD` | Borde de 2 px |
| Descartada | `#97A3AC` | `#E5E9EC` | Opacidad 0.5 |
| Encontrada | `#1B7A63` | `#CFE9E1` | Glifo de verificación |
| Colisión | `#A8324A` | `#F3D6DC` | Trama diagonal |

### 8.3 Escala tipográfica

**Regla: una etiqueta nunca es más pequeña que el contenido que etiqueta.** Se diferencian por peso y color, no por tamaño. Este error ya apareció en las maquetas y no debe repetirse.

| Nivel | Uso | Tamaño | Familia y peso |
|---|---|---|---|
| 1 | Título de pantalla o tema | 20 px | Plex Sans Condensed 600, versalitas, `tracking .08em` |
| 2 | Rótulo de panel | 13 px | Plex Sans Condensed 600, versalitas, `tracking .08em`, `--tinta-suave` |
| 3 | Etiqueta de campo o grupo | 13 px | Plex Sans 500, `--tinta` |
| 4 | Contenido, opciones, botones | 13 px | Plex Sans 400, `--tinta` |
| 5 | Texto auxiliar y ayuda | 12 px | Plex Sans 400, `--tinta-suave` |
| — | Claves, índices, métricas | según contexto | JetBrains Mono, **cifras tabulares obligatorias** |

Las cifras tabulares no son opcionales: los dígitos deben alinearse en columna al comparar claves.

### 8.4 Elevación, radios y espaciado

```css
--elev-0: solo borde 1px;                        /* embebido en un panel */
--elev-1: 0 1px 2px rgba(36,48,59,.08) + borde;  /* paneles y tarjetas */
--elev-2: 0 3px 10px rgba(36,48,59,.12) + borde; /* diálogos */
```

Radios: 3 px casillas · 6 px controles · 10 px paneles.
Espaciado: escala 4 · 8 · 12 · 16 · 24 · 32 · 40. No usar valores fuera de ella.

Sombras cortas y definidas, nunca difusas. Sin gradientes ni glassmorphism. Tema claro obligatorio: se proyecta en salón iluminado y debe coincidir con el PDF exportado.

---

## 9. Voz de la interfaz

- Los mensajes describen el estado del sistema; no se disculpan ni interpelan al usuario.
- Los botones nombran la acción: *Insertar*, no *Aceptar*. Nunca un verbo genérico.
- **El botón nombra el verbo; el objeto lo pone el campo si ya está a la vista.** En el panel de operaciones los tres botones dicen *Insertar*, *Buscar* y *Eliminar* a secas, porque el campo que tienen encima ya dice *Clave*: repetir la palabra tres veces en una fila no cabe y no agrega nada. Un botón suelto, sin campo que lo acompañe, sí nombra el objeto completo.
- Una acción conserva el mismo nombre en todo el flujo: si el botón dice *Insertar*, la bitácora registra *Clave insertada*.
- Vocabulario técnico riguroso, nunca coloquial.
- Sentencia capital, nunca Mayúscula En Cada Palabra.

### Catálogo de mensajes

| Situación | Mensaje |
|---|---|
| Estructura llena | *Estructura saturada: capacidad máxima de n casillas alcanzada.* |
| Clave repetida | *Clave duplicada: la clave ya reside en la posición i.* |
| Longitud incorrecta | *Longitud de clave inválida: se esperan l dígitos.* |
| Carácter no permitido | *Carácter no admitido en el alfabeto definido (A–Z).* |
| Búsqueda sin resultado | *Clave no localizada en la estructura tras k comparaciones.* |
| Clave eliminada (ordenada) | *Casilla i liberada: las k claves siguientes se desplazan una posición.* |
| Clave levantada para redispersar | *Se retira la clave c de la casilla i: colisionó en su momento y hay que volver a dispersarla.* |
| Colisión | *Colisión en la dirección d: se aplica tratamiento por [método].* |
| Colisión sin tratamiento | *Colisión en la dirección d: la casilla ya contiene la clave c.* — sin tratamiento no hay nada que aplicar, y decirlo dejaba la frase «se aplica tratamiento por ninguno» |
| Estructura vacía | *Estructura no inicializada: no existen claves para procesar.* |
| `n` imposible | *Tamaño inviable: para l = 2 solo existen 90 claves distintas.* |
| Archivo incompatible | *Archivo no compatible con el tema activo.* |

---

## 10. Persistencia

### Modelo del archivo `.cc2` (JSON)

```json
{
  "version": 1,
  "nombre": "Práctica de hash",
  "tema": "hash-modulo",
  "tipoClave": "numerica",
  "n": 30,
  "l": 4,
  "claves": [1024, 2048, 4096],
  "funcionHash": "modulo",
  "metodoColisiones": "reasignacion",
  "creadaEn": "2026-08-06T13:24:48Z"
}
```

### Guardar — dos niveles con degradación

1. **Siempre disponible:** generar el archivo y dispararlo como descarga.
2. **Donde el navegador lo soporte:** File System Access API para un diálogo real de "Guardar como", con elección de carpeta y regrabado sobre el mismo archivo.

Probar el nivel 2 temprano: abriendo con `file://` puede comportarse distinto. Si falla, el nivel 1 cubre el caso sin cambiar el diseño.

### Nombre de la estructura — retirado hasta que exista el guardado (2026-08-29)

El diseño original le daba a la estructura un **nombre propio dentro de la aplicación**, editable en el panel de configuración, que servía como nombre por defecto del archivo `.cc2`.

**El campo se retiró de la interfaz** (decisión del usuario): su única razón de ser es el guardado, que quedó para el final del proyecto, y mientras tanto obligaba a escribir un dato en cada estructura que se crea sin que ese dato sirviera para nada. **Vuelve cuando vuelva el guardado**, no antes.

Consecuencia: **una estructura reciente se identifica por su tema y por los datos con que se creó** —«Función módulo · n = 12 · l = 4»— que es lo que el estudiante recuerda de ella. Las entradas viejas que sí traían nombre se siguen leyendo: `persistencia/recientes.js` las normaliza al formato nuevo.

### Estructuras recientes

Hasta 5, en almacenamiento del navegador. **No son la copia real**: si el estudiante borra datos de navegación, desaparecen. La interfaz debe dejar claro que el archivo `.cc2` es la copia real.

### Al cargar

Validar integridad y correspondencia con el tema activo. Si no corresponde, informar sin cargar.

### Bitácora

**No se persiste.** Al recuperar una estructura, la bitácora inicia vacía y registra solo la sesión en curso.

---

## 11. Exportación a PDF

`window.print()` con hoja de estilos de impresión. Sin librerías.

El documento incluye: encabezado con datos de la asignatura, configuración de la estructura, estado final, bitácora cronológica y resumen de métricas.

**En el PDF la estructura se dibuja completa, sin elisión**, repartida en varias filas si hace falta. La elisión es un recurso de pantalla, no de documento.

---

## 12. Alcance

### Fase 1 — implementar

Búsqueda secuencial · binaria · funciones hash (módulo, cuadrado, truncamiento, plegamiento, conversión de bases) **solo en decimal**, ya que lo binario quedó descartado (§5.3) · tratamiento de colisiones (reasignación, arreglos anidados, encadenamiento secuencial) · otras búsquedas internas (residuos, árboles de búsqueda digital, residuos múltiples, tablas de índices, rejilla, árboles 2D).

**Orden de construcción confirmado: primero búsqueda secuencial, luego binaria.** Secuencial es el tema anterior a binaria en el orden de la asignatura, y sirve como la primera plantilla end-to-end (dominio → traza → elisión → animación → bitácora); binaria reutiliza ese mismo patrón, no al revés.

**Estado de construcción:** secuencial, binaria y **las cinco funciones hash** implementadas y disponibles en el menú. Todas entran por la misma pantalla parametrizada, `vista/pantallas/tema-busqueda.js`, y todas **insertan, buscan y eliminan** (§5.6), cada una con su algoritmo.

La función módulo dejó lista la maquinaria de transformación de claves —modo disperso (§3.2), cálculo reproducible (§6.5), tratamiento de colisiones al crear (§5.4)— y las otras cuatro entraron **declarando su `direccionDe` y una entrada en `TEMAS`**, sin tocar la pantalla. La única pieza que hubo que agregar fue `config.parametros`, para los dos temas que necesitan un dato del estudiante (las posiciones del truncamiento, la base de la conversión). Si en adelante una función obliga a cambiar la pantalla, es señal de que el contrato de `{ direccion, calculo }` se quedó corto.

**De «otras búsquedas internas» está construido el primero: árboles de búsqueda digital** (§5.5), que estrenó las claves alfabéticas, el modo `arbol` y el dibujo por niveles. Siguen **por residuos** y **residuos múltiples**, que comparten con él la letra y su código y se diferencian en dónde viven las claves.

**Los cuatro tratamientos de colisión están construidos: `ninguno`, `reasignación` (prueba lineal), `arreglos anidados` y `encadenamiento secuencial` (§5.4).** Los anidados trajeron el modelo de estructuras secundarias por dirección —`estructura.anidados`, con sus tres operaciones en el dominio— y el encadenamiento entró sobre él: comparte almacenamiento, aplicadores y rama de eliminación, y lo único propio suyo es que su estructura secundaria no tiene tope.

Pendientes conocidos, no bloqueantes: faltan los `.woff2` en `fuentes/` (cae al stack de respaldo), y ni `css/impresion.css` ni `persistencia/archivo.js` (.cc2) están construidos.

### Diferido dentro de Fase 1

- **El guardado en archivo `.cc2` va al final del proyecto** (decisión del usuario, 2026-08-29), y con él el **nombre de la estructura**, que solo existía para nombrar ese archivo (§10.3). Primero los temas, que son lo que se evalúa.
- Claves alfabéticas: **habilitadas en los temas de búsqueda por bits**, donde la clave *es* una letra (§5.5). En los demás temas siguen diferidas: se mantienen en el modelo y en la interfaz, deshabilitadas.
- Llenado automático con palabras: requiere diccionario en español. El llenado numérico sí se implementa.

### Fase 2 — solo visible en el menú, sin implementar

Búsquedas externas e índices para archivos · toda la unidad de grafos. Se muestran en el catálogo, atenuados y marcados "En desarrollo". Su presencia comunica el alcance del curso.

---

## 13. Accesibilidad

- Contraste AA en todo texto, incluido el atenuado.
- Foco de teclado visible en cada elemento navegable.
- El color nunca es el único canal.
- Respetar `prefers-reduced-motion`.

---

## 14. Errores a no cometer

- Ejecutar el algoritmo mientras se dibuja, en vez de producir una traza.
- Usar el índice del arreglo como identidad de la casilla: rompe la animación de reordenamiento.
- Animar propiedades de layout en vez de `transform` y `opacity`.
- Encolar animaciones en vez de reemplazarlas.
- Esparcir conversiones `+1` por el código en vez de centralizar la indexación base 1.
- Reutilizar colores de estado del algoritmo para alertas, botones o acentos decorativos.
- Poner una etiqueta más pequeña que el contenido que etiqueta.
- Dibujar las `n` casillas sin aplicar elisión.
- Permitir claves duplicadas en cualquier ruta de entrada, incluido el llenado automático y la carga de archivo.
- Contar las claves de una estructura dispersa con `claves.length`: siempre vale `n`, así que la estructura se declara llena desde el primer momento. Es `dominio.estructura.cantidadClaves` (§3.2).
- Mutar la estructura desde el algoritmo de inserción. La traza no toca nada; el efecto lo aplica la pantalla, y retroceder tiene que deshacerlo (§6.5).
- Elidir casillas ocupadas en una estructura dispersa: esconden el resultado de la función hash (§6.2).
- Contar en decimal las cifras a truncar en conversión de bases: con base 2 y `n = 12` se tomarían 2 bits, y ocho casillas quedarían inalcanzables (§5.3).
- Elevar la clave al cuadrado con aritmética normal: por encima del entero seguro las cifras centrales dejan de ser las del cuadrado (§5.3).
- Dejar que la casilla se dimensione por lo que lleva dentro —`min-width` con relleno, o pistas `auto` en el grid de la fila—: la estructura se deforma clave a clave y la matriz de arreglos anidados pierde la alineación de sus columnas (§6.6).

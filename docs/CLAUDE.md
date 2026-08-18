# CLAUDE.md — Simulador de Ciencias de la Computación II

Contexto de dominio del proyecto. Léelo completo antes de escribir código.

---

## 1. Qué se está construyendo

Un **simulador didáctico de algoritmos de búsqueda** para la asignatura Ciencias de la Computación II (Ingeniería de Sistemas, Universidad Distrital Francisco José de Caldas).

El estudiante crea una estructura de datos, inserta claves y **observa la animación** del algoritmo recorriéndola paso a paso, mientras un panel contabiliza comparaciones y accesos.

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

1. `claves.length ≤ n`
2. **Sin duplicados.** Ninguna clave aparece dos veces.
3. **Siempre ordenada ascendente.** Aplica tanto a secuencial como a binaria (decisión del docente).
4. Toda clave cumple exactamente la longitud `l`.

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

`vista/pantallas/tema-busqueda.js` contiene **toda** la pantalla de trabajo —configurar, insertar, llenado automático, reproducir la traza, elidir, métricas, bitácora, alertas— y la comparten todos los temas de búsqueda interna. Un tema nuevo no escribe pantalla: escribe una entrada en `TEMAS` (en `app.js`) con lo único que le es propio:

```js
{
  numero, titulo, descripcion,
  buscar(claves, objetivo) -> pasos,             // el algoritmo
  casillasRelevantes(paso) -> [índices base 1],  // qué no puede elidirse
  describirCasilla({ paso, indice, ocupada })    // -> { estado, modificadores }
    -> cómo se pinta cada casilla en el paso actual,
  metricas: [{ id, etiqueta, valor({ estructura, paso }) }]
}
```

Es decir: **lo único que distingue un tema de otro es cómo se lee su traza.** Secuencial y binaria ya se construyen así; hash y colisiones deben entrar por la misma puerta, cambiando `orientacion` a vertical.

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
│   │   ├── hash/           módulo, cuadrado, truncamiento, plegamiento, bases
│   │   └── colisiones/     reasignación, anidados, encadenamiento
│   ├── vista/
│   │   ├── componentes/    casilla, panel, alerta, métrica, bitácora
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

| Función | Cálculo |
|---|---|
| **Módulo** | `(clave mod n) + 1` |
| **Cuadrado** | Elevar al cuadrado y tomar las cifras centrales necesarias para direccionar `n` |
| **Truncamiento** | Seleccionar posiciones fijas de los dígitos de la clave |
| **Plegamiento** | Partir la clave en grupos, sumarlos y ajustar al rango |
| **Conversión de bases** | Convertir a otra base, truncar y ajustar al rango |

Deben soportarse en decimal y en binario.

### 5.4 Tratamiento de colisiones internas

- **Reasignación** — prueba lineal desde la dirección ocupada.
- **Arreglos anidados** — estructura secundaria por dirección.
- **Encadenamiento secuencial** — lista enlazada por dirección.

La traza debe registrar **cada casilla recorrida** por el tratamiento, no solo el destino final.

### 5.5 Otras búsquedas internas

Por residuos, árboles de búsqueda digital, residuos múltiples, tablas de índices, método de la rejilla, árboles 2D. Mismo contrato: producen traza.

---

## 6. Visualización

### 6.1 Orientación

- Secuencial y binaria: estructura **horizontal**.
- Funciones hash: estructura **vertical**.

### 6.2 Regla de elisión

Solo se dibuja lo relevante del paso actual. Es lo que permite que `n` no tenga límite impuesto por la pantalla.

- Si `n ≤ 12` (horizontal) o `n ≤ 10` (vertical), se muestra completa.
- Por encima, permanecen **siempre visibles**: la casilla 1, la casilla n, y las casillas relevantes del paso más una vecina a cada lado.
- Casillas relevantes: `i` en secuencial · `inicio, medio, fin` en binaria · `d` en hash · `d` más el recorrido del tratamiento cuando hay colisión.
- **Cada tramo comprimido muestra cuántas casillas oculta.** Sin eso se pierde la noción del tamaño real.
- **Un tramo de una sola casilla no se comprime: se dibuja.** El rótulo `⋯ 1 ⋯` ocupa más que la casilla que esconde. Aparece de forma natural en binaria, cuando `inicio`, `medio` y `fin` con sus vecinas dejan una casilla suelta entre dos visibles.
- La expansión y compresión de tramos se anima; no es un salto brusco.
- Control "Ver estructura completa" que desactiva la elisión.

La estructura se dibuja **centrada** en el lienzo, horizontal y verticalmente. Es el foco de atención durante toda la clase.

**La pantalla de tema se ancla al alto del viewport y la página nunca scrollea.** El desplazamiento vive dentro del panel lateral. Si scrollea la página, el panel lateral —que acumula configuración, inserción, búsqueda, métricas y bitácora— estira el lienzo y empuja la estructura fuera de la pantalla: al proyectar en el salón se pierde justo lo que la aplicación existe para mostrar.

Detalle que hace falta y es fácil de omitir: las filas del grid van con `minmax(0, 1fr)`, no `1fr`. Sin el `minmax(0, …)` una fila de grid no puede encogerse por debajo de su contenido, y el panel lateral vuelve a estirar el lienzo aunque la pantalla tenga el alto fijado.

### 6.3 Estructuras apiladas (binaria)

**Pedido del docente (2026-08-18): binaria no muestra una estructura que cambia, sino una estructura por paso, apiladas.** Cada fila es la estructura *resultante* de ese paso: solo el tramo que sobrevivió al descarte. Al terminar la búsqueda, el apilado completo es el paso a paso del algoritmo, legible de un vistazo — que es como se explica en el tablero.

- Cada fila se acorta respecto de la anterior, y eso hace visible la reducción a la mitad.
- Las filas se alinean por columna: la casilla 7 cae bajo la casilla 7 de la fila de arriba. Sin esa alineación se pierde la noción de *dónde* está lo que sobrevivió.
- Las filas aparecen **una por paso** al avanzar, y retroceder las quita. El apilado sigue al reproductor, no lo reemplaza.
- La fila de una búsqueda fallida no tiene rango: anuncia *Rango vacío: no quedan casillas por examinar* en lugar de quedar en blanco.
- El corchete de rango activo no se dibuja aquí: la fila entera **es** el rango, y repetirlo sería ruido.

Dos decisiones de implementación que hay que respetar al tocar esto:

1. **Un solo grid para todo el apilado**, no un grid por fila. Con grids independientes las columnas de cada fila se dimensionan por separado y dejan de corresponderse, que es justo lo que la vista necesita.
2. **Las columnas se calculan una vez por búsqueda**, con las casillas relevantes de la traza completa. Si se recalcularan paso a paso, las columnas se moverían bajo las filas ya dibujadas.

El modo lo activa la configuración del tema (`apilada.rangoDePaso`); los temas que no lo declaran siguen con una estructura única, como secuencial.

### 6.4 Regla de índices

Bajo la estructura horizontal —y al costado de la vertical— corre una escala continua que numera las posiciones, con marcas mayores cada 5. Cuando hay elisión, la escala se comprime pero **mantiene visible la numeración real**: un tramo comprimido se rotula con el rango que oculta (`22–39`). Es el elemento distintivo del producto.

**Cada casilla y su marca se dibujan en la misma columna** (`.columna-casilla`), no en dos filas independientes. Con elisión los tramos tienen ancho propio, y dos contenedores paralelos desalinean la numeración de lo que rotula — que es precisamente el error que la escala existe para no cometer.

---

## 7. Animación

El profesor evalúa explícitamente que los bloques se muevan. Estas son las animaciones obligatorias:

1. **Inserción** — la clave entra y las claves mayores se desplazan para abrirle lugar. Es la más visible y la que hay que resolver primero.
2. **Eliminación** — la casilla se vacía y las siguientes se desplazan.
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
- Los botones nombran la acción: *Insertar clave*, no *Aceptar*.
- Una acción conserva el mismo nombre en todo el flujo: si el botón dice *Insertar clave*, la bitácora registra *Clave insertada*.
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
| Colisión | *Colisión en la dirección d: se aplica tratamiento por [método].* |
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

### Nombre de la estructura

La estructura tiene un **nombre propio dentro de la aplicación**, editable en el panel de configuración, que sirve como nombre por defecto del archivo. La lista de recientes muestra ese nombre, no el del archivo.

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

Búsqueda secuencial · binaria · funciones hash (módulo, cuadrado, truncamiento, plegamiento, conversión de bases) en decimal y binario · tratamiento de colisiones (reasignación, arreglos anidados, encadenamiento secuencial) · otras búsquedas internas (residuos, árboles de búsqueda digital, residuos múltiples, tablas de índices, rejilla, árboles 2D).

**Orden de construcción confirmado: primero búsqueda secuencial, luego binaria.** Secuencial es el tema anterior a binaria en el orden de la asignatura, y sirve como la primera plantilla end-to-end (dominio → traza → elisión → animación → bitácora); binaria reutiliza ese mismo patrón, no al revés.

**Estado de construcción:** secuencial y binaria implementadas y disponibles en el menú. La plantilla que dejó secuencial ya está extraída en `vista/pantallas/tema-busqueda.js`; el siguiente tema —funciones hash— debe entrar por ahí, con `orientacion: 'vertical'`.

Pendientes conocidos, no bloqueantes: faltan los `.woff2` en `fuentes/` (cae al stack de respaldo), y ni `css/impresion.css` ni `persistencia/archivo.js` (.cc2) están construidos.

### Diferido dentro de Fase 1

- Claves alfabéticas: mantener en el modelo y en la interfaz, deshabilitadas.
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

const test = require('node:test');
const assert = require('node:assert/strict');
const CC2 = require('./apoyo.js');

const indices = CC2.dominio.indices;
const { derivar } = CC2.algoritmos.indices;

// El ejercicio de la hoja manuscrita del docente
// (docs/WhatsApp Image 2026-09-04 at 9.47.37 AM*.jpeg, tres páginas).
// Todo lo de este archivo está anclado a números que él escribió a mano.
const EJERCICIO = { r: 500000, R: 120, Ri: 15, B: 4096 };
const { PRIMARIO, SECUNDARIO } = indices.TIPOS;
const { UNO, MULTINIVEL } = indices.NIVELES;

const armar = (tipo, niveles) => indices.estructuraDeIndices({ ...EJERCICIO, tipo, niveles });
const columna = (estructura, id) => estructura.columnas.find((c) => c.id === id);
const resultados = (pasos) => pasos[pasos.length - 1].calculo.map((l) => l.resultado);

test('el factor de bloqueo trunca y el número de bloques va al techo', () => {
  const archivo = indices.formaDelArchivo(EJERCICIO);
  // 4096/120 = 34,13 -> 34 (trunca: un registro no se parte entre dos bloques)
  assert.equal(archivo.porBloque, 34);
  // 500000/34 = 14705,88 -> 14706 (techo: el último bloque va a medias pero existe)
  assert.equal(archivo.bloques, 14706);
  assert.equal(indices.factorDeBloqueo(4096, 15), 273);
});

// Lo que separa este tema de búsqueda secuencial externa, donde la capacidad
// del archivo es exactamente N (CLAUDE.md 5.8): aquí sobra, y el docente
// escribe las dos cifras.
test('la capacidad excede a la ocupación y se sabe cuánto sobra', () => {
  const archivo = indices.formaDelArchivo(EJERCICIO);
  assert.equal(archivo.capacidad, 500004);
  assert.equal(archivo.libres, 4);

  const primario = armar(PRIMARIO, UNO);
  assert.equal(columna(primario, 'nivel-1').capacidad, 14742);
  assert.equal(columna(primario, 'nivel-1').libres, 36);

  const secundario = armar(SECUNDARIO, UNO);
  assert.equal(columna(secundario, 'nivel-1').capacidad, 500136);
});

test('el primario es disperso —una entrada por bloque— y el secundario denso', () => {
  assert.equal(armar(PRIMARIO, UNO).entradas, 14706);
  assert.equal(armar(SECUNDARIO, UNO).entradas, 500000);
  assert.equal(columna(armar(PRIMARIO, UNO), 'nivel-1').bloques, 54);
  assert.equal(columna(armar(SECUNDARIO, UNO), 'nivel-1').bloques, 1832);
});

// El número que la solución del parcial que circula entre estudiantes se
// salta: solo calcula los accesos del secundario.
test('los accesos de un índice de un nivel son la binaria más el bloque de datos', () => {
  assert.equal(armar(PRIMARIO, UNO).accesos, 7);
  assert.equal(armar(SECUNDARIO, UNO).accesos, 12);
});

test('el multinivel apila niveles hasta que uno cabe en un bloque', () => {
  const conPrimarios = armar(PRIMARIO, MULTINIVEL);
  assert.deepEqual(conPrimarios.escalones.map((n) => n.bloques), [54, 1]);
  assert.equal(conPrimarios.accesos, 3);

  const conSecundarios = armar(SECUNDARIO, MULTINIVEL);
  assert.deepEqual(conSecundarios.escalones.map((n) => n.bloques), [1832, 7, 1]);
  assert.equal(conSecundarios.accesos, 4);
});

// La cascada manda sobre el logaritmo que el docente escribe: con una sola
// entrada, log_bfri(1) da 0 niveles y la estructura igual necesita un bloque.
test('un índice con una sola entrada tiene un nivel, no cero', () => {
  const niveles = indices.nivelesDelIndice({ entradas: 1, Ri: 15, B: 4096 });
  assert.equal(niveles.length, 1);
  assert.equal(niveles[0].bloques, 1);
});

test('las columnas van de la raíz al archivo, con el archivo siempre al final', () => {
  const estructura = armar(SECUNDARIO, MULTINIVEL);
  assert.deepEqual(estructura.columnas.map((c) => c.id), ['nivel-3', 'nivel-2', 'nivel-1', 'datos']);
  assert.equal(estructura.columnas[estructura.columnas.length - 1].clase, 'datos');
});

// La frontera es lo que hace entendible el tema: un bloque de índice de 273
// entradas abarca 273 bloques de la columna siguiente. La primera columna no
// tiene quién la señale.
test('cada columna sabe cuántos bloques abarca un bloque de la anterior', () => {
  const estructura = armar(PRIMARIO, UNO);
  assert.equal(columna(estructura, 'nivel-1').frontera, undefined);
  assert.equal(columna(estructura, 'datos').frontera, 273);
});

test('la escala de un bloque llega hasta la capacidad, no hasta la ocupación', () => {
  const estructura = armar(PRIMARIO, UNO);
  const indice = columna(estructura, 'nivel-1');
  assert.deepEqual(indices.rangoDelBloque(indice, 1), { primero: 1, ultimo: 273 });
  assert.deepEqual(indices.rangoDelBloque(indice, 2), { primero: 274, ultimo: 546 });
  // El docente cierra la columna del índice en 14.742 y no en 14.706.
  assert.deepEqual(indices.rangoDelBloque(indice, 54), { primero: 14470, ultimo: 14742 });

  const datos = columna(estructura, 'datos');
  assert.deepEqual(indices.rangoDelBloque(datos, 273), { primero: 9249, ultimo: 9282 });
  assert.deepEqual(indices.rangoDelBloque(datos, 14706), { primero: 499971, ultimo: 500004 });
});

// --- La derivación -------------------------------------------------------

test('la derivación revela una columna por paso, de derecha a izquierda', () => {
  const pasos = derivar({ ...EJERCICIO, tipo: SECUNDARIO, niveles: MULTINIVEL });
  const revelado = pasos.map((p) => p.columnaActiva).filter(Boolean);
  assert.deepEqual(revelado, ['datos', 'nivel-1', 'nivel-2', 'nivel-3']);
  // Todas definidas al terminar, y ninguna se pierde por el camino.
  assert.deepEqual(pasos[pasos.length - 1].definidas.sort(),
    ['datos', 'nivel-1', 'nivel-2', 'nivel-3']);
});

test('el cálculo se acumula: cada paso trae las líneas anteriores más la suya', () => {
  const pasos = derivar({ ...EJERCICIO, tipo: PRIMARIO, niveles: UNO });
  for (let i = 1; i < pasos.length; i++) {
    assert.ok(pasos[i].calculo.length > pasos[i - 1].calculo.length,
      `el paso ${i} no agregó ninguna línea`);
  }
  assert.equal(pasos[pasos.length - 1].tipo, 'construido');
});

test('la derivación del primario da los números de la hoja', () => {
  const pasos = derivar({ ...EJERCICIO, tipo: PRIMARIO, niveles: UNO });
  assert.deepEqual(resultados(pasos), [
    '34 registros por bloque',
    '14.706 bloques',
    '500.004 posiciones · 4 libres',
    '14.706 entradas',
    '273 entradas por bloque',
    '54 bloques',
    '7 accesos'
  ]);
});

test('la derivación del multinivel secundario da los números de la hoja', () => {
  const pasos = derivar({ ...EJERCICIO, tipo: SECUNDARIO, niveles: MULTINIVEL });
  const finales = resultados(pasos);
  assert.deepEqual(finales.slice(-5), [
    '1.832 bloques', '7 bloques', '1 bloque', '3 niveles', '4 accesos'
  ]);
  // Se escribe como él lo escribe: logaritmo en base bfri, no división en cascada.
  const nivelesLinea = pasos[pasos.length - 1].calculo.find((l) => l.etiqueta === 'Niveles');
  assert.match(nivelesLinea.expresion, /^log_273\(500\.000\) = 2,339$/);
});

// El separador de miles no puede depender del idioma del navegador ni del de
// Node: se agrupa a mano.
test('los números se agrupan con punto y los decimales con coma', () => {
  const pasos = derivar({ ...EJERCICIO, tipo: PRIMARIO, niveles: UNO });
  const bloques = pasos[pasos.length - 1].calculo[1];
  assert.match(bloques.expresion, /⌈500\.000 \/ 34⌉ = ⌈14\.705,88⌉/);
});

// --- Validación -----------------------------------------------------------

test('un registro más grande que el bloque se rechaza con su motivo', () => {
  const malo = indices.validarLongitud('5000', { etiqueta: 'Longitud del registro (R)', B: 4096 });
  assert.equal(malo.valido, false);
  assert.match(malo.mensaje, /no puede superar el tamaño del bloque/);
  assert.equal(indices.validarLongitud('120', { etiqueta: 'R', B: 4096 }).valor, 120);
});

test('los parámetros rechazan lo que no es un entero positivo', () => {
  assert.equal(indices.validarRegistros('').valido, false);
  assert.equal(indices.validarRegistros('12,5').valido, false);
  assert.equal(indices.validarRegistros('-3').valido, false);
  assert.equal(indices.validarRegistros('500000').valor, 500000);
  assert.equal(indices.validarBloque('4').valido, false, 'un bloque de 4 bytes no sostiene nada');
  assert.equal(indices.validarBloque('4096').valor, 4096);
});

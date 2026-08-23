const test = require('node:test');
const assert = require('node:assert/strict');
const CC2 = require('./apoyo.js');

const { direccionModulo } = CC2.algoritmos.hash.modulo;
const { TRATAMIENTOS, insertar, buscar } = CC2.algoritmos.hash.operaciones;
const { sondearLineal } = CC2.algoritmos.colisiones.reasignacion;
const { crearEstructura, colocarEn, cantidadClaves, estaLlena, MODOS } = CC2.dominio.estructura;

// Estructura dispersa de n casillas con las claves ya en su sitio, para no
// depender de la traza al preparar el escenario de cada prueba.
function tabla(n, colocaciones) {
  const claves = new Array(n);
  for (const [casilla, clave] of colocaciones) claves[casilla - 1] = clave;
  return claves;
}

const soloCalculo = (pasos) => pasos.filter((paso) => paso.tipo === 'calculo');
const ultimo = (pasos) => pasos[pasos.length - 1];

test('la función módulo direcciona en 1..n', () => {
  assert.equal(direccionModulo(7412, 10).direccion, 3);
  // Residuo 0 es la casilla 1, no la 0: las casillas se numeran desde 1.
  assert.equal(direccionModulo(7410, 10).direccion, 1);
  // El residuo máximo, n-1, cae en la última casilla y no fuera de ella.
  assert.equal(direccionModulo(7419, 10).direccion, 10);
});

test('el cálculo expone cada paso intermedio, no solo el resultado', () => {
  const { calculo } = direccionModulo(7412, 10);
  assert.deepEqual(calculo.map((linea) => linea.etiqueta), ['Clave', 'Residuo', 'Dirección']);
  assert.equal(calculo[1].expresion, '7412 mod 10');
  assert.equal(calculo[1].resultado, '2');
  assert.equal(calculo[2].expresion, '2 + 1');
});

test('cada paso del cálculo lleva las líneas reveladas hasta ese momento', () => {
  const pasos = insertar({ claves: tabla(10, []), n: 10, clave: 7412, direccionDe: direccionModulo });
  const calculo = soloCalculo(pasos);
  assert.deepEqual(calculo.map((paso) => paso.calculo.length), [1, 2, 3]);
  // La dirección no existe antes de terminar la cuenta: apuntar a una casilla
  // antes sería mostrar algo que el algoritmo todavía no sabe.
  assert.equal(calculo[0].direccion, undefined);
  assert.equal(calculo[1].direccion, undefined);
  assert.equal(calculo[2].direccion, 3);
});

test('inserta en la dirección calculada cuando la casilla está libre', () => {
  const pasos = insertar({ claves: tabla(10, []), n: 10, clave: 7412, direccionDe: direccionModulo });
  const final = ultimo(pasos);
  assert.equal(final.tipo, 'insercion');
  assert.equal(final.casilla, 3);
  assert.equal(final.clave, 7412);
});

test('sin tratamiento, la colisión termina la inserción y la clave no entra', () => {
  const claves = tabla(10, [[3, 5312]]);
  const pasos = insertar({
    claves, n: 10, clave: 7412, direccionDe: direccionModulo, tratamiento: TRATAMIENTOS.NINGUNO
  });
  assert.equal(pasos[3].tipo, 'colision');
  assert.equal(pasos[3].casilla, 3);
  assert.equal(ultimo(pasos).tipo, 'rechazada');
  assert.equal(pasos.some((paso) => paso.tipo === 'insercion'), false);
});

test('la reasignación registra cada casilla recorrida, no solo el destino', () => {
  const claves = tabla(10, [[3, 5312], [4, 6113], [5, 1114]]);
  const pasos = insertar({
    claves, n: 10, clave: 7412, direccionDe: direccionModulo, tratamiento: TRATAMIENTOS.REASIGNACION
  });
  assert.deepEqual(
    pasos.filter((paso) => paso.tipo === 'sondeo').map((paso) => paso.casilla),
    [4, 5]
  );
  const final = ultimo(pasos);
  assert.equal(final.tipo, 'insercion');
  assert.equal(final.casilla, 6);
  // La dirección original viaja en el paso: es lo que deja ver cuánto se alejó.
  assert.equal(final.direccion, 3);
  assert.equal(final.colision, 3);
});

test('la prueba lineal da la vuelta al final de la estructura', () => {
  const claves = tabla(5, [[5, 1004], [1, 1000]]);
  const pasos = insertar({
    claves, n: 5, clave: 1009, direccionDe: direccionModulo, tratamiento: TRATAMIENTOS.REASIGNACION
  });
  assert.equal(pasos.find((paso) => paso.tipo === 'colision').casilla, 5);
  // De la 5 pasa a la 1, no a la 6.
  assert.deepEqual(pasos.filter((paso) => paso.tipo === 'sondeo').map((paso) => paso.casilla), [1]);
  assert.equal(ultimo(pasos).casilla, 2);
});

test('con la estructura llena la reasignación se agota en vez de girar sin fin', () => {
  const claves = tabla(3, [[1, 100], [2, 101], [3, 102]]);
  const pasos = insertar({
    claves, n: 3, clave: 103, direccionDe: direccionModulo, tratamiento: TRATAMIENTOS.REASIGNACION
  });
  assert.equal(ultimo(pasos).tipo, 'saturada');
  assert.equal(pasos.some((paso) => paso.tipo === 'insercion'), false);
});

test('la búsqueda va directo a la dirección y no recorre la estructura', () => {
  const claves = tabla(10, [[3, 7412]]);
  const pasos = buscar({ claves, n: 10, objetivo: 7412, direccionDe: direccionModulo });
  const final = ultimo(pasos);
  assert.equal(final.tipo, 'encontrada');
  assert.equal(final.casilla, 3);
  // Una sola comparación, sea cual sea el tamaño: es lo que distingue al tema.
  assert.equal(final.comparaciones, 1);
  assert.equal(final.accesos, 1);
});

test('la casilla vacía prueba la ausencia sin gastar una comparación', () => {
  const pasos = buscar({ claves: tabla(10, []), n: 10, objetivo: 7412, direccionDe: direccionModulo });
  const final = ultimo(pasos);
  assert.equal(final.tipo, 'no-encontrada');
  assert.equal(final.accesos, 1);
  assert.equal(final.comparaciones, 0);
});

test('la búsqueda con reasignación repite el recorrido de la inserción', () => {
  const claves = tabla(10, [[3, 5312], [4, 6113], [5, 7412]]);
  const pasos = buscar({
    claves, n: 10, objetivo: 7412, direccionDe: direccionModulo, tratamiento: TRATAMIENTOS.REASIGNACION
  });
  const final = ultimo(pasos);
  assert.equal(final.tipo, 'encontrada');
  assert.equal(final.casilla, 5);
  assert.equal(final.comparaciones, 3);
});

test('la búsqueda con reasignación se detiene en el primer hueco', () => {
  const claves = tabla(10, [[3, 5312], [5, 9999]]);
  const pasos = buscar({
    claves, n: 10, objetivo: 7412, direccionDe: direccionModulo, tratamiento: TRATAMIENTOS.REASIGNACION
  });
  const final = ultimo(pasos);
  assert.equal(final.tipo, 'no-encontrada');
  // Para en la casilla 4, que está vacía: seguir hasta la 5 sería recorrer de más.
  assert.equal(final.casilla, 4);
});

test('el sondeo lineal recorre a lo sumo n-1 casillas', () => {
  const resultado = sondearLineal({
    claves: tabla(4, [[1, 10], [2, 11], [3, 12], [4, 13]]),
    n: 4,
    desde: 1,
    condicion: (ocupante) => ocupante === undefined
  });
  assert.equal(resultado.agotado, true);
  assert.equal(resultado.recorrido.length, 3);
});

test('la estructura dispersa nace con n casillas vacías y cuenta las ocupadas', () => {
  const { estructura } = crearEstructura({ n: 5, l: 4, tipoClave: 'numerica', modo: MODOS.DISPERSA });
  assert.equal(estructura.claves.length, 5);
  assert.equal(cantidadClaves(estructura), 0);

  colocarEn(estructura, 3, 7412);
  assert.equal(cantidadClaves(estructura), 1);
  // La longitud no crece con las inserciones: cambia qué posiciones existen.
  assert.equal(estructura.claves.length, 5);
  assert.equal(estaLlena(estructura), false);
});

test('la colocación directa no pisa una casilla ocupada ni sale del rango', () => {
  const { estructura } = crearEstructura({ n: 5, l: 4, tipoClave: 'numerica', modo: MODOS.DISPERSA });
  colocarEn(estructura, 3, 7412);
  assert.equal(colocarEn(estructura, 3, 1111).exito, false);
  assert.equal(colocarEn(estructura, 6, 1111).exito, false);
  assert.equal(colocarEn(estructura, 0, 1111).exito, false);
});

// ── Función cuadrado ──────────────────────────────────────────────────────

const { direccionCuadrado } = CC2.algoritmos.hash.cuadrado;
const { cifrasNecesarias, cifrasDeRango, enmarcar } = CC2.algoritmos.hash.comun;

test('las cifras a tomar son las que hacen falta para direccionar n', () => {
  assert.equal(cifrasNecesarias(9), 1);
  assert.equal(cifrasNecesarias(12), 2);
  assert.equal(cifrasNecesarias(100), 3);
  assert.equal(cifrasNecesarias(10000), 5);
});

test('el cuadrado cuenta las cifras del rango, que se numera desde cero', () => {
  // Con n = 100 las direcciones se leen de 00 a 99: dos cifras, no las tres de n.
  assert.equal(cifrasDeRango(100), 2);
  assert.equal(cifrasDeRango(1000), 3);
  assert.equal(cifrasDeRango(12), 2);
  assert.equal(cifrasDeRango(10), 1);
  assert.equal(cifrasDeRango(1), 1);
});

test('el cuadrado toma las cifras centrales del rango y suma uno', () => {
  // Ejemplo del docente: n = 100, l = 4, clave 3748.
  const { direccion, calculo } = direccionCuadrado(3748, 100);
  assert.equal(calculo[1].resultado, '14047504');
  assert.equal(calculo[2].resultado, '47');
  assert.equal(calculo[3].expresion, '47 + 1');
  assert.equal(direccion, 48);
});

test('con un cuadrado de cifras impares la selección se corre a la izquierda', () => {
  // El otro ejemplo del docente: 3025² = 9150625. La cifra central es el 0 y la
  // acompaña el 5 que tiene a la izquierda, no el 6 de la derecha: 50, no 06.
  const { direccion, calculo } = direccionCuadrado(3025, 100);
  assert.equal(calculo[1].resultado, '9150625');
  assert.equal(calculo[2].expresion, '91 [50] 625');
  assert.equal(direccion, 51);
});

test('cuando las cifras centrales se salen del rango, se ajustan', () => {
  // 7412² = 54937744, centrales 37: en una estructura de 12 casillas el 38 no
  // existe y se ajusta, pero la cuenta que se muestra sigue siendo 37 + 1.
  const { direccion, calculo } = direccionCuadrado(7412, 12);
  assert.equal(calculo[2].resultado, '37');
  assert.equal(calculo[3].expresion, '37 + 1 ajustado a 1..12');
  assert.equal(direccion, 2);
});

test('cuando las cifras centrales ya direccionan, se usan tal cual', () => {
  const { direccion, calculo } = direccionCuadrado(7412, 999);
  assert.equal(calculo[2].resultado, '937');
  assert.equal(calculo[3].expresion, '937 + 1');
  assert.equal(direccion, 938);
});

test('el cuadrado se calcula exacto aunque exceda el entero seguro', () => {
  // Con aritmética normal el cuadrado terminaría en 000 y las cifras
  // centrales saldrían de un número que no es el cuadrado de la clave.
  const { calculo } = direccionCuadrado(1234567890, 100);
  assert.equal(calculo[1].resultado, '1524157875019052100');
  assert.equal(Number.isSafeInteger(1234567890 ** 2), false);
});

test('las cifras centrales en cero dan la primera casilla, no la casilla 0', () => {
  // 1000² = 1000000: las tres cifras centrales son 000, y sin el + 1 la
  // dirección sería 0, que no es una casilla válida.
  const { direccion, calculo } = direccionCuadrado(1000, 1000);
  assert.equal(calculo[2].resultado, '000');
  assert.equal(direccion, 1);
});

test('el desarrollo enmarca el tramo extraído dentro del número completo', () => {
  assert.equal(enmarcar('54937744', 2, 3), '54 [937] 744');
  // Sin partes vacías a los lados cuando el tramo toca un extremo.
  assert.equal(enmarcar('1234', 0, 2), '[12] 34');
  assert.equal(enmarcar('1234', 2, 2), '12 [34]');
});

// Invariante que sostiene el reproductor: lee el resultado de la última línea
// para saber a qué casilla apuntar. Vale para toda función hash, presente o
// futura — cuando se agregue una nueva, se agrega aquí.
test('toda función hash termina en una línea Dirección que coincide con el resultado', () => {
  const funciones = [
    ['módulo', direccionModulo],
    ['cuadrado', CC2.algoritmos.hash.cuadrado.direccionCuadrado],
    ['truncamiento', CC2.algoritmos.hash.truncamiento.direccionTruncamiento],
    ['plegamiento', CC2.algoritmos.hash.plegamiento.direccionPlegamiento],
    ['bases', CC2.algoritmos.hash.bases.direccionBases]
  ];
  for (const [nombre, direccionDe] of funciones) {
    for (const n of [1, 7, 12, 100, 9999]) {
      for (const clave of [1000, 1234, 5555, 9999]) {
        const { direccion, calculo } = direccionDe(clave, n);
        const ultima = calculo[calculo.length - 1];
        assert.equal(ultima.etiqueta, 'Dirección', `${nombre} con n=${n}`);
        assert.equal(Number(ultima.resultado), direccion, `${nombre} con n=${n}, clave=${clave}`);
        assert.ok(direccion >= 1 && direccion <= n, `${nombre}: ${direccion} fuera de 1..${n}`);
      }
    }
  }
});

// ── Función truncamiento ──────────────────────────────────────────────────

const truncamiento = CC2.algoritmos.hash.truncamiento;
const { direccionTruncamiento, validarPosiciones, posicionesPorDefecto } = truncamiento;

test('el truncamiento toma las posiciones indicadas, de izquierda a derecha', () => {
  // Clave 7412, posiciones 1 y 3 → cifras 7 y 1 → 71.
  const { direccion, calculo } = direccionTruncamiento(7412, 100, { posiciones: [1, 3] });
  assert.equal(calculo[1].resultado, '71');
  assert.equal(calculo[2].expresion, '71 + 1');
  assert.equal(direccion, 72);
  // El desarrollo marca las cifras tomadas en su sitio dentro de la clave.
  assert.equal(calculo[1].expresion, '[7] 4 [1] 2');
});

test('el orden de las posiciones es el que se indica, no el ascendente', () => {
  assert.equal(direccionTruncamiento(7412, 100, { posiciones: [3, 1] }).direccion, 18);
});

test('sin posiciones indicadas se toman las primeras que direccionan n', () => {
  // Las del rango, no las de n: con n = 100 dos posiciones dan 00..99 y el
  // + 1 las lleva justo a 1..100.
  assert.deepEqual(posicionesPorDefecto(100), [1, 2]);
  assert.deepEqual(posicionesPorDefecto(12), [1, 2]);
  assert.equal(direccionTruncamiento(4711, 100).direccion, 48);
  // 7412 con n = 12: primeras dos cifras → 74 → 75 no cabe → ajuste.
  assert.equal(direccionTruncamiento(7412, 12).direccion, 3);
});

test('se rechaza una posición que la clave no tiene', () => {
  const resultado = validarPosiciones('1,5', { l: 4, n: 100 });
  assert.equal(resultado.valido, false);
  assert.match(resultado.mensaje, /la clave tiene 4 cifras/);
});

test('se rechaza repetir una posición y no indicar ninguna', () => {
  assert.equal(validarPosiciones('2,2', { l: 4, n: 100 }).valido, false);
  assert.equal(validarPosiciones('', { l: 4, n: 100 }).valido, false);
  assert.equal(validarPosiciones('abc', { l: 4, n: 100 }).valido, false);
});

test('acepta separadores escritos a mano', () => {
  for (const entrada of ['1,3', '1 3', '1;3', '1, 3']) {
    assert.deepEqual(validarPosiciones(entrada, { l: 4, n: 100 }).valor, [1, 3]);
  }
});

test('advierte, sin bloquear, cuando las posiciones no alcanzan todas las casillas', () => {
  // Con dos posiciones la dirección no pasa de 99, así que en una estructura
  // de 500 casillas hay 400 a las que nunca llega ninguna clave.
  const resultado = validarPosiciones('1,3', { l: 4, n: 500 });
  assert.equal(resultado.valido, true);
  assert.match(resultado.advertencia, /no supera 100/);
  assert.match(resultado.advertencia, /inalcanzable/);
  // Con las tres que hacen falta, no hay nada que advertir.
  assert.equal(validarPosiciones('1,2,3', { l: 4, n: 500 }).advertencia, null);
});

// ── Función plegamiento ───────────────────────────────────────────────────

const { direccionPlegamiento, partir, validarOperacion, OPERACIONES } = CC2.algoritmos.hash.plegamiento;

test('el plegamiento parte de izquierda a derecha y el grupo corto queda al final', () => {
  assert.deepEqual(partir('7412', 3), ['741', '2']);
  assert.deepEqual(partir('7412', 2), ['74', '12']);
  assert.deepEqual(partir('7412', 4), ['7412']);
});

test('el tamaño del grupo es el que numera el rango: con n = 100, pares', () => {
  // Ejemplo del docente: 3025 se pliega en 30 y 25, no en 302 y 5.
  const { direccion, calculo } = direccionPlegamiento(3025, 100);
  assert.equal(calculo[1].expresion, '[30] [25]');
  assert.equal(calculo[2].expresion, '30 + 25');
  assert.equal(calculo[2].resultado, '55');
  assert.equal(direccion, 56);
});

test('los grupos también se pueden multiplicar', () => {
  const { direccion, calculo } = direccionPlegamiento(3025, 100, { operacion: OPERACIONES.MULTIPLICAR });
  assert.equal(calculo[2].etiqueta, 'Producto');
  assert.equal(calculo[2].expresion, '30 × 25');
  assert.equal(calculo[2].resultado, '750');
  // Del total se toman las últimas cifras: 750 → 50 → 51.
  assert.equal(calculo[3].expresion, '7 [50]');
  assert.equal(direccion, 51);
});

test('del total se descarta lo que se sale por la izquierda, no por la derecha', () => {
  // 99 × 99 = 9801: las últimas dos cifras son 01, no las centrales 80.
  const { direccion, calculo } = direccionPlegamiento(9999, 100, { operacion: OPERACIONES.MULTIPLICAR });
  assert.equal(calculo[2].resultado, '9801');
  assert.equal(calculo[3].resultado, '01');
  assert.equal(direccion, 2);
});

test('el producto de los grupos no depende de la precisión de Number', () => {
  // La cuenta se hace sobre el texto de la clave y con BigInt, así que el
  // total es exacto por larga que sea. Con aritmética normal 99¹⁰ se redondea
  // a …450000 y las últimas cifras —las que deciden la dirección— se pierden.
  const { calculo, direccion } = direccionPlegamiento('99999999999999999999', 100, {
    operacion: OPERACIONES.MULTIPLICAR
  });
  assert.equal(calculo[2].resultado, '90438207500880449001');
  assert.equal(String(Math.pow(99, 10)), '90438207500880450000');
  assert.equal(direccion, 2);
});

test('sin operación indicada se suman los grupos', () => {
  assert.equal(direccionPlegamiento(3025, 100).direccion, 56);
  assert.equal(validarOperacion('').valor, OPERACIONES.SUMAR);
  assert.equal(validarOperacion('multiplicar').valor, OPERACIONES.MULTIPLICAR);
  assert.equal(validarOperacion('restar').valido, false);
});

test('con grupos de dos cifras el total se recorta y después se ajusta', () => {
  // n = 12 → grupos de 2 → 74 + 12 = 86 → 86 + 1 = 87 → no cabe → 3.
  const { direccion, calculo } = direccionPlegamiento(7412, 12);
  assert.equal(calculo[2].expresion, '74 + 12');
  assert.equal(calculo[4].expresion, '86 + 1 ajustado a 1..12');
  assert.equal(direccion, 3);
});

// ── Conversión de bases ───────────────────────────────────────────────────

const { direccionBases, validarBase, cifrasEnBase, BASE_POR_DEFECTO } = CC2.algoritmos.hash.bases;

test('la conversión de bases trunca las últimas cifras y las lee en esa base', () => {
  // 7412 en base 11 es 5629; las dos últimas cifras, 29, valen 2·11+9 = 31.
  const { direccion, calculo } = direccionBases(7412, 12, { base: 11 });
  assert.equal(calculo[1].resultado, '5629');
  assert.equal(calculo[2].resultado, '29');
  assert.equal(calculo[3].resultado, '31');
  assert.equal(direccion, 7);
});

test('las cifras mayores que nueve se muestran como letras', () => {
  // 10 en base 11 es A: es lo que hace visible que la representación cambió.
  assert.equal(direccionBases(10, 100, { base: 11 }).calculo[1].resultado, 'A');
  assert.equal(direccionBases(255, 100, { base: 16 }).calculo[1].resultado, 'FF');
});

test('con base 2 el tema cubre el caso binario', () => {
  // 7412 en binario es 1110011110100; con n = 12 hacen falta 4 bits, y los
  // últimos cuatro son 0100 = 4.
  const { direccion, calculo } = direccionBases(7412, 12, { base: 2 });
  assert.equal(calculo[1].resultado, '1110011110100');
  assert.equal(calculo[2].resultado, '0100');
  assert.equal(direccion, 4);
});

test('las cifras a truncar se cuentan en la base elegida, no en decimal', () => {
  // Con dos cifras decimales para n = 12 solo habría 4 direcciones binarias y
  // ocho casillas quedarían muertas: hacen falta 4 bits.
  assert.equal(cifrasEnBase(12, 2), 4);
  assert.equal(cifrasEnBase(12, 11), 2);
  assert.equal(cifrasEnBase(100, 16), 2);
  // En las potencias exactas no se pasa ni se queda corto.
  assert.equal(cifrasEnBase(8, 2), 3);
  assert.equal(cifrasEnBase(16, 2), 4);
  assert.equal(cifrasEnBase(17, 2), 5);
  assert.equal(cifrasEnBase(1, 2), 1);
});

test('en cualquier base admitida se alcanzan todas las casillas de n', () => {
  // La regla que hace útil el tema: con las cifras que se truncan tiene que
  // haber al menos tantas direcciones posibles como casillas.
  for (const base of [2, 3, 8, 11, 16, 36]) {
    for (const n of [1, 7, 12, 100, 999, 9999]) {
      assert.ok(
        Math.pow(base, cifrasEnBase(n, base)) >= n,
        `base ${base} con n = ${n} no alcanza todas las casillas`
      );
    }
  }
});

test('sin base indicada se usa la de clase', () => {
  assert.equal(BASE_POR_DEFECTO, 11);
  assert.deepEqual(direccionBases(7412, 12), direccionBases(7412, 12, { base: 11 }));
});

test('la base se valida al crear la estructura', () => {
  assert.equal(validarBase('1').valido, false);
  assert.equal(validarBase('37').valido, false);
  assert.equal(validarBase('11.5').valido, false);
  assert.equal(validarBase('x').valido, false);
  assert.equal(validarBase('16').valor, 16);
  // Base 10 funciona pero no transforma nada: se advierte sin bloquear.
  assert.equal(validarBase('10').valido, true);
  assert.match(validarBase('10').advertencia, /no transforma nada/);
});

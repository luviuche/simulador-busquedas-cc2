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

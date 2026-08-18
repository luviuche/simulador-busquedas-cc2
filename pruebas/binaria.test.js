const test = require('node:test');
const assert = require('node:assert/strict');
const CC2 = require('./apoyo.js');

const { buscarBinaria } = CC2.algoritmos.binaria;
const { maximoPasosBinaria } = CC2.dominio.limites;

const CLAVES = [10, 20, 30, 40, 50, 60, 70];

test('encuentra la clave y detiene la traza en ese paso', () => {
  const pasos = buscarBinaria(CLAVES, 40);
  assert.equal(pasos.length, 1);
  assert.equal(pasos[0].tipo, 'encontrada');
  assert.equal(pasos[0].casilla, 4);
  assert.equal(pasos[0].comparaciones, 1);
});

test('emite el rango vigente en base 1', () => {
  const pasos = buscarBinaria(CLAVES, 10);
  assert.deepEqual(
    { inicio: pasos[0].inicio, medio: pasos[0].medio, fin: pasos[0].fin },
    { inicio: 1, medio: 4, fin: 7 }
  );
});

test('acumula las casillas descartadas de los pasos previos', () => {
  const pasos = buscarBinaria(CLAVES, 10);
  // Primer paso: nada descartado todavía. Al ser 10 < 40, se descarta 4..7.
  assert.deepEqual(pasos[0].descartadas, []);
  assert.deepEqual(pasos[1].descartadas, [4, 5, 6, 7]);
  assert.equal(pasos[1].inicio, 1);
  assert.equal(pasos[1].fin, 3);
});

test('localiza el primer y el último extremo', () => {
  const primero = buscarBinaria(CLAVES, 10);
  const ultimo = buscarBinaria(CLAVES, 70);
  assert.equal(primero[primero.length - 1].casilla, 1);
  assert.equal(ultimo[ultimo.length - 1].casilla, 7);
  assert.equal(primero[primero.length - 1].tipo, 'encontrada');
  assert.equal(ultimo[ultimo.length - 1].tipo, 'encontrada');
});

test('agota la traza y reporta no encontrada', () => {
  const pasos = buscarBinaria(CLAVES, 45);
  const ultimo = pasos[pasos.length - 1];
  assert.equal(ultimo.tipo, 'no-encontrada');
  assert.equal(ultimo.comparaciones, 3);
  assert.equal(ultimo.accesos, 3);
});

test('sobre estructura vacía produce un único paso sin comparaciones', () => {
  const pasos = buscarBinaria([], 40);
  assert.equal(pasos.length, 1);
  assert.equal(pasos[0].tipo, 'no-encontrada');
  assert.equal(pasos[0].comparaciones, 0);
});

test('ninguna búsqueda excede el máximo teórico ⌈log₂ n⌉ + 1', () => {
  const n = CLAVES.length;
  const maximo = maximoPasosBinaria(n);
  for (const objetivo of [5, 10, 35, 40, 70, 99]) {
    const pasos = buscarBinaria(CLAVES, objetivo);
    const comparaciones = pasos[pasos.length - 1].comparaciones;
    // El fallo consume una comparación más que el peor acierto: al agotar el
    // rango se evalúa la última casilla candidata antes de vaciarlo.
    assert.ok(
      comparaciones <= maximo + 1,
      `objetivo ${objetivo}: ${comparaciones} comparaciones exceden ${maximo} + 1`
    );
  }
});

test('cada comparación describe la mitad que descarta', () => {
  const pasos = buscarBinaria(CLAVES, 10);
  assert.match(pasos[0].mensaje, /casilla 4/);
  assert.match(pasos[0].mensaje, /menor/);
  assert.match(pasos[0].mensaje, /mitad superior/);
});

test('el máximo teórico es cero para una estructura sin casillas', () => {
  assert.equal(maximoPasosBinaria(0), 0);
  assert.equal(maximoPasosBinaria(1), 0);
  assert.equal(maximoPasosBinaria(8), 3);
  assert.equal(maximoPasosBinaria(10), 4);
});

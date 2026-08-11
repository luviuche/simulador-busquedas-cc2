const test = require('node:test');
const assert = require('node:assert/strict');
const CC2 = require('./apoyo.js');

const { buscarSecuencial } = CC2.algoritmos.secuencial;

test('encuentra la clave y detiene la traza en ese paso', () => {
  const pasos = buscarSecuencial([10, 20, 30, 40], 30);
  const ultimo = pasos[pasos.length - 1];
  assert.equal(ultimo.tipo, 'encontrada');
  assert.equal(ultimo.casilla, 3);
  assert.equal(ultimo.comparaciones, 3);
  assert.equal(pasos.length, 3);
});

test('recorre desde la casilla 1 en base 1', () => {
  const pasos = buscarSecuencial([10, 20, 30], 10);
  assert.equal(pasos[0].casilla, 1);
});

test('agota la traza y reporta no encontrada', () => {
  const pasos = buscarSecuencial([10, 20, 30], 99);
  const ultimo = pasos[pasos.length - 1];
  assert.equal(ultimo.tipo, 'no-encontrada');
  assert.equal(ultimo.comparaciones, 3);
  assert.equal(ultimo.accesos, 3);
});

test('cada paso de comparación trae mensaje descriptivo', () => {
  const pasos = buscarSecuencial([10, 20, 30], 30);
  assert.match(pasos[0].mensaje, /casilla 1/);
});

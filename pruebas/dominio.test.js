const test = require('node:test');
const assert = require('node:assert/strict');
const CC2 = require('./apoyo.js');

const { limites, clave, estructura } = CC2.dominio;

test('rangoValido deriva el rango desde L', () => {
  assert.deepEqual(limites.rangoValido(4), { min: 1000, max: 9999 });
});

test('validarTamano rechaza n por encima del límite duro', () => {
  const resultado = limites.validarTamano(10001, 4);
  assert.equal(resultado.valido, false);
});

test('validarTamano rechaza n imposible para L = 2', () => {
  const resultado = limites.validarTamano(150, 2);
  assert.equal(resultado.valido, false);
  assert.match(resultado.mensaje, /90 claves distintas/);
});

test('validarTamano advierte por encima del umbral sin bloquear', () => {
  const resultado = limites.validarTamano(600, 4);
  assert.equal(resultado.valido, true);
  assert.ok(resultado.advertencia);
});

test('validarClaveNumerica rechaza ceros a la izquierda', () => {
  const resultado = clave.validarClaveNumerica('0521', 4);
  assert.equal(resultado.valido, false);
});

test('validarClaveNumerica acepta clave con L dígitos', () => {
  const resultado = clave.validarClaveNumerica('4096', 4);
  assert.equal(resultado.valido, true);
  assert.equal(resultado.valor, 4096);
});

test('validarClaveAlfabetica mapea CASA al ejemplo del spec', () => {
  const resultado = clave.validarClaveAlfabetica('CASA', 4);
  assert.equal(resultado.valido, true);
  assert.equal(resultado.claveTransformada, 3011901);
});

test('validarClaveAlfabetica rechaza la Ñ', () => {
  const resultado = clave.validarClaveAlfabetica('NIÑO', 4);
  assert.equal(resultado.valido, false);
});

test('estructura mantiene orden ascendente al insertar', () => {
  const { estructura: e } = estructura.crearEstructura({ n: 5, L: 4, tipoClave: 'numerica' });
  estructura.insertar(e, 5000);
  estructura.insertar(e, 1000);
  estructura.insertar(e, 3000);
  assert.deepEqual(e.claves, [1000, 3000, 5000]);
});

test('estructura rechaza duplicados', () => {
  const { estructura: e } = estructura.crearEstructura({ n: 5, L: 4, tipoClave: 'numerica' });
  estructura.insertar(e, 1000);
  const resultado = estructura.insertar(e, 1000);
  assert.equal(resultado.exito, false);
  assert.match(resultado.mensaje, /Clave duplicada/);
});

test('estructura rechaza inserción al llegar a n', () => {
  const { estructura: e } = estructura.crearEstructura({ n: 1, L: 4, tipoClave: 'numerica' });
  estructura.insertar(e, 1000);
  const resultado = estructura.insertar(e, 2000);
  assert.equal(resultado.exito, false);
  assert.match(resultado.mensaje, /saturada/);
});

test('insertar devuelve el índice en base 1', () => {
  const { estructura: e } = estructura.crearEstructura({ n: 5, L: 4, tipoClave: 'numerica' });
  const resultado = estructura.insertar(e, 1000);
  assert.equal(resultado.indice, 1);
});

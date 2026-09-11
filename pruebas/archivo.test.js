const test = require('node:test');
const assert = require('node:assert/strict');
const CC2 = require('./apoyo.js');

const archivo = CC2.persistencia.archivo;
const estructuras = CC2.dominio.estructura;
const hash = CC2.algoritmos.hash.operaciones;

function crearOrdenada({ n, l }) {
  const { estructura } = estructuras.crearEstructura({ n, l, tipoClave: 'numerica' });
  return estructura;
}

test('el archivo guarda las claves en su orden de llegada, no como quedaron en la tabla', () => {
  const estructura = crearOrdenada({ n: 10, l: 2 });
  for (const clave of [50, 10, 30]) estructuras.insertar(estructura, clave);

  // La tabla está ordenada; el orden de llegada no.
  assert.deepEqual(estructura.claves, [10, 30, 50]);
  const datos = archivo.serializar({ tema: 'secuencial', estructura });
  assert.deepEqual(datos.claves, [50, 10, 30]);
  assert.equal(datos.n, 10);
  assert.equal(datos.l, 2);
  assert.equal(datos.version, archivo.VERSION);
});

test('eliminar una clave la saca también del orden de llegada', () => {
  const estructura = crearOrdenada({ n: 10, l: 2 });
  for (const clave of [50, 10, 30]) estructuras.insertar(estructura, clave);
  estructuras.eliminar(estructura, 10);
  assert.deepEqual(archivo.serializar({ tema: 'secuencial', estructura }).claves, [50, 30]);
});

// Lo que hace que guardar el orden valga la pena: en una tabla con colisiones,
// reinsertar en otro orden da otra tabla. Si el archivo guardara las claves
// como quedaron colocadas, abrirlo no devolvería la misma estructura.
test('en una tabla con colisiones, el orden de llegada es lo que reproduce la tabla', () => {
  const claves = [1004, 1016, 1028];
  const construir = (orden) => {
    const { estructura } = estructuras.crearEstructura({
      n: 12, l: 4, tipoClave: 'numerica', modo: estructuras.MODOS.DISPERSA,
      tratamiento: hash.TRATAMIENTOS.REASIGNACION
    });
    for (const clave of orden) {
      const pasos = hash.insertar({
        claves: estructura.claves, n: estructura.n, clave,
        direccionDe: CC2.algoritmos.hash.modulo.direccionModulo,
        tratamiento: estructura.tratamiento,
        anidados: estructura.anidados, tamanoAnidado: estructura.tamanoAnidado
      });
      for (const paso of pasos) {
        if (paso.efecto && paso.efecto.tipo === 'colocar') {
          estructuras.colocarEn(estructura, paso.efecto.casilla, paso.efecto.clave);
        }
      }
    }
    return estructura.claves.map((c, i) => (c === undefined ? '' : `${i + 1}:${c}`)).filter(Boolean).join(' ');
  };

  const enOrden = construir(claves);
  const alReves = construir(claves.slice().reverse());
  assert.notEqual(enOrden, alReves, 'dos órdenes distintos tendrían que dar tablas distintas');

  // Y reinsertar en el orden guardado devuelve exactamente la misma tabla.
  assert.equal(construir(claves), enOrden);
});

test('el nombre sugerido dice de qué es el archivo sin abrirlo', () => {
  const estructura = crearOrdenada({ n: 24, l: 2 });
  assert.equal(
    archivo.nombreSugerido({ tema: 'secuencial', estructura }),
    'secuencial-n24-l2.cc2'
  );
});

test('validar acepta un archivo del mismo tema', () => {
  const estructura = crearOrdenada({ n: 10, l: 2 });
  estructuras.insertar(estructura, 42);
  const datos = archivo.serializar({ tema: 'binaria', estructura });
  assert.equal(archivo.validar(datos, 'binaria').valido, true);
});

test('validar rechaza el archivo de otro tema sin tocar nada', () => {
  const estructura = crearOrdenada({ n: 10, l: 2 });
  const datos = archivo.serializar({ tema: 'hash-modulo', estructura });
  const resultado = archivo.validar(datos, 'binaria');
  assert.equal(resultado.valido, false);
  assert.match(resultado.mensaje, /otro tema/);
});

test('validar rechaza versiones que no sabe leer', () => {
  const resultado = archivo.validar({ version: 99, tema: 'secuencial', n: 4, claves: [] }, 'secuencial');
  assert.equal(resultado.valido, false);
  assert.match(resultado.mensaje, /Versión no reconocida/);
});

test('validar rechaza un archivo con más claves de las que caben', () => {
  const resultado = archivo.validar(
    { version: 1, tema: 'secuencial', n: 2, claves: [1, 2, 3] }, 'secuencial'
  );
  assert.equal(resultado.valido, false);
  assert.match(resultado.mensaje, /3 claves para una estructura de 2/);
});

// Una estructura a medio llenar se guarda como está: el archivo devuelve lo
// que había, completo o no.
test('una estructura a medio llenar se guarda y se valida igual', () => {
  const estructura = crearOrdenada({ n: 24, l: 2 });
  for (const clave of [10, 20]) estructuras.insertar(estructura, clave);
  const datos = archivo.serializar({ tema: 'secuencial', estructura });
  assert.equal(datos.claves.length, 2);
  assert.equal(datos.n, 24);
  assert.equal(archivo.validar(datos, 'secuencial').valido, true);
});

test('lo que se escribe es JSON legible', () => {
  const estructura = crearOrdenada({ n: 4, l: 2 });
  estructuras.insertar(estructura, 11);
  const texto = archivo.comoTexto(archivo.serializar({ tema: 'secuencial', estructura }));
  assert.deepEqual(JSON.parse(texto).claves, [11]);
  assert.ok(texto.includes('\n'), 'se guarda con saltos de línea, para poder leerlo a ojo');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const CC2 = require('./apoyo.js');

const externa = CC2.dominio.externa;

// Los dos ejemplos vienen del docente, traídos por el usuario (2026-09-11), y
// son los que fijan que el redondeo de `r` es al más cercano y no al techo:
// con N = 23 el 4,79 sube a 5, pero con N = 10 el 3,16 se queda en 3. Un
// techo daría 4 registros por bloque en el segundo caso y la forma entera
// saldría distinta.
test('N = 23: 4 bloques de 5 no alcanzan, así que el archivo queda en 5 bloques', () => {
  const forma = externa.formaDelArchivo(23);
  assert.equal(forma.bloquesIniciales, 4);
  assert.equal(forma.registrosPorBloque, 5);
  assert.equal(forma.bloques, 5);
  assert.equal(forma.registrosUltimoBloque, 3);
  assert.equal(forma.alcanzabaSinAgregar, false);
});

test('N = 10: r se queda en 3 porque 3,16 no llega a la mitad', () => {
  const forma = externa.formaDelArchivo(10);
  assert.equal(forma.bloquesIniciales, 3);
  assert.equal(forma.registrosPorBloque, 3);
  assert.equal(forma.bloques, 4);
  assert.equal(forma.registrosUltimoBloque, 1);
});

test('N cuadrado perfecto: la raíz da la forma exacta y no se agrega bloque', () => {
  const forma = externa.formaDelArchivo(16);
  assert.equal(forma.bloques, 4);
  assert.equal(forma.registrosPorBloque, 4);
  assert.equal(forma.registrosUltimoBloque, 4);
  assert.equal(forma.alcanzabaSinAgregar, true);
});

// La consecuencia limpia de la regla, y la que conviene que una prueba vigile:
// el bloque de más aparece exactamente cuando N no es cuadrado perfecto.
test('el bloque extra aparece si y solo si N no es cuadrado perfecto', () => {
  for (let n = 1; n <= 400; n++) {
    const forma = externa.formaDelArchivo(n);
    const esCuadrado = Number.isInteger(Math.sqrt(n));
    assert.equal(
      forma.alcanzabaSinAgregar, esCuadrado,
      `N = ${n}: se esperaba ${esCuadrado ? 'no' : 'sí'} agregar un bloque`
    );
    assert.equal(forma.bloques, esCuadrado ? forma.bloquesIniciales : forma.bloquesIniciales + 1);
  }
});

// El último bloque no se llena a `r`: se queda con el sobrante y no acepta
// más, así que la suma de los bloques es exactamente N (pedido del usuario).
test('la capacidad del archivo es exactamente N', () => {
  for (let n = 1; n <= 400; n++) {
    const forma = externa.formaDelArchivo(n);
    let capacidad = 0;
    for (let bloque = 1; bloque <= forma.bloques; bloque++) {
      const registros = externa.registrosDelBloque(forma, bloque);
      assert.ok(registros >= 1 && registros <= forma.registrosPorBloque, `N = ${n}, bloque ${bloque}`);
      capacidad += registros;
    }
    assert.equal(capacidad, n, `N = ${n}`);
  }
});

test('cada registro cae en el bloque que lo contiene, y el rango del bloque lo confirma', () => {
  const forma = externa.formaDelArchivo(23);
  assert.deepEqual(externa.rangoDelBloque(forma, 1), { primero: 1, ultimo: 5 });
  assert.deepEqual(externa.rangoDelBloque(forma, 2), { primero: 6, ultimo: 10 });
  // El último va corto: empieza en 21 y termina en 23, no en 25.
  assert.deepEqual(externa.rangoDelBloque(forma, 5), { primero: 21, ultimo: 23 });

  for (let registro = 1; registro <= 23; registro++) {
    const bloque = externa.bloqueDe(forma, registro);
    const rango = externa.rangoDelBloque(forma, bloque);
    assert.ok(
      registro >= rango.primero && registro <= rango.ultimo,
      `el registro ${registro} dice estar en el bloque ${bloque}`
    );
  }
});

test('N = 1: un bloque de un registro', () => {
  const forma = externa.formaDelArchivo(1);
  assert.equal(forma.bloques, 1);
  assert.equal(forma.registrosPorBloque, 1);
  assert.equal(forma.registrosUltimoBloque, 1);
});

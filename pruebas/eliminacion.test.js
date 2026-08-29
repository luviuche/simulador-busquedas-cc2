const test = require('node:test');
const assert = require('node:assert/strict');
const CC2 = require('./apoyo.js');

const { eliminarPorBusqueda } = CC2.algoritmos.eliminacion;
const { buscarSecuencial } = CC2.algoritmos.secuencial;
const { buscarBinaria } = CC2.algoritmos.binaria;
const { direccionModulo } = CC2.algoritmos.hash.modulo;
const { TRATAMIENTOS, eliminar: eliminarHash, buscar: buscarHash } = CC2.algoritmos.hash.operaciones;
const estructuras = CC2.dominio.estructura;

// Los mismos aplicadores que usa la pantalla: la traza no toca nada, y quien
// la reproduce aplica el `efecto` de cada paso. Aquí se reproducen de una vez
// para comprobar en qué estado deja la estructura la operación completa.
const APLICADORES = {
  colocar: (estructura, efecto) => estructuras.colocarEn(estructura, efecto.casilla, efecto.clave),
  retirar: (estructura, efecto) => estructuras.retirarDe(estructura, efecto.casilla),
  eliminar: (estructura, efecto) => estructuras.eliminar(estructura, efecto.clave)
};

function aplicar(estructura, pasos) {
  for (const paso of pasos) {
    if (paso.efecto) APLICADORES[paso.efecto.tipo](estructura, paso.efecto);
  }
  return estructura;
}

function ordenada(claves) {
  const { estructura } = estructuras.crearEstructura({ n: 12, l: 2, tipoClave: 'numerica' });
  estructura.claves = claves.slice();
  return estructura;
}

function dispersa(n, colocaciones) {
  const { estructura } = estructuras.crearEstructura({
    n, l: 4, tipoClave: 'numerica', modo: estructuras.MODOS.DISPERSA
  });
  for (const [casilla, clave] of colocaciones) estructura.claves[casilla - 1] = clave;
  return estructura;
}

const tipos = (pasos) => pasos.map((paso) => paso.tipo);
const ultimo = (pasos) => pasos[pasos.length - 1];
const ocupadas = (estructura) => estructura.claves
  .map((clave, i) => (clave === undefined ? null : `${i + 1}:${clave}`))
  .filter(Boolean)
  .join(' ');

// ── Estructuras ordenadas ────────────────────────────────────────────────

test('eliminar en secuencial recorre desde la casilla 1 y luego saca la clave', () => {
  const claves = [10, 20, 30, 40];
  const pasos = eliminarPorBusqueda({ pasos: buscarSecuencial(claves, 30), claves, clave: 30 });

  // Las tres primeras comparaciones son la búsqueda secuencial tal cual: el
  // borrado no tiene camino propio, usa el del tema.
  assert.deepEqual(tipos(pasos), [
    'comparacion', 'comparacion', 'encontrada', 'eliminacion', 'desplazamiento'
  ]);
  assert.equal(pasos[3].casilla, 3);
});

test('eliminar en binaria divide en vez de recorrer', () => {
  const claves = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
  const gasto = (busqueda) => eliminarPorBusqueda({ pasos: busqueda(claves, 110), claves, clave: 110 })
    .find((paso) => paso.tipo === 'encontrada').comparaciones;

  // La misma clave por los dos caminos: es la prueba de que la eliminación
  // hereda el algoritmo del tema y no borra siempre igual.
  assert.equal(gasto(buscarSecuencial), 11);
  assert.equal(gasto(buscarBinaria), 3);
  assert.equal(
    ultimo(eliminarPorBusqueda({ pasos: buscarBinaria(claves, 110), claves, clave: 110 })).tipo,
    'desplazamiento'
  );
});

test('la clave sale y las siguientes cierran el hueco', () => {
  const claves = [10, 20, 30, 40];
  const estructura = ordenada(claves);
  const pasos = eliminarPorBusqueda({ pasos: buscarSecuencial(claves, 20), claves, clave: 20 });

  aplicar(estructura, pasos);
  assert.deepEqual(estructura.claves, [10, 30, 40]);
});

test('el desplazamiento es un paso aparte del que marca la casilla', () => {
  const claves = [10, 20, 30, 40];
  const estructura = ordenada(claves);
  const pasos = eliminarPorBusqueda({ pasos: buscarSecuencial(claves, 20), claves, clave: 20 });
  const marcado = pasos.findIndex((paso) => paso.tipo === 'eliminacion');

  // Al marcar la casilla la clave sigue dentro: es lo que deja ver de cuál
  // casilla salió antes de que las demás se muevan.
  aplicar(estructura, pasos.slice(0, marcado + 1));
  assert.deepEqual(estructura.claves, [10, 20, 30, 40]);
});

test('el último paso dice cuántas claves se desplazan, y dice cuando no hay ninguna', () => {
  const claves = [10, 20, 30, 40];
  const enMedio = eliminarPorBusqueda({ pasos: buscarSecuencial(claves, 20), claves, clave: 20 });
  const alFinal = eliminarPorBusqueda({ pasos: buscarSecuencial(claves, 40), claves, clave: 40 });

  assert.match(ultimo(enMedio).mensaje, /las 2 claves siguientes se desplazan/);
  assert.match(ultimo(alFinal).mensaje, /no hay nada que desplazar/);
});

test('una clave que no está deja la traza de búsqueda tal cual', () => {
  const claves = [10, 20, 30];
  const estructura = ordenada(claves);
  const pasos = eliminarPorBusqueda({ pasos: buscarSecuencial(claves, 99), claves, clave: 99 });

  assert.equal(ultimo(pasos).tipo, 'no-encontrada');
  assert.equal(pasos.filter((paso) => paso.efecto).length, 0);
  aplicar(estructura, pasos);
  assert.deepEqual(estructura.claves, [10, 20, 30]);
});

// ── Tabla dispersa ───────────────────────────────────────────────────────

const eliminarEn = (estructura, clave) => eliminarHash({
  claves: estructura.claves,
  n: estructura.n,
  clave,
  direccionDe: direccionModulo,
  tratamiento: estructura.tratamiento
});

test('sin tratamiento la casilla simplemente se vacía', () => {
  const estructura = dispersa(10, [[3, 7412]]);
  estructura.tratamiento = TRATAMIENTOS.NINGUNO;
  const pasos = eliminarEn(estructura, 7412);

  assert.equal(ultimo(pasos).tipo, 'eliminacion');
  aplicar(estructura, pasos);
  assert.equal(estructuras.cantidadClaves(estructura), 0);
});

test('con reasignación, las claves de atrás vuelven a pasar por la función hash', () => {
  // 7412, 5312 y 9912 tienen todas dirección 3: la segunda y la tercera
  // llegaron a las casillas 4 y 5 sondeando.
  const estructura = dispersa(10, [[3, 7412], [4, 5312], [5, 9912]]);
  estructura.tratamiento = TRATAMIENTOS.REASIGNACION;
  const pasos = eliminarEn(estructura, 5312);

  // 9912 se levanta, se recalcula su dirección y vuelve a sondear.
  assert.ok(tipos(pasos).includes('extraccion'), 'la clave de atrás se levanta');
  aplicar(estructura, pasos);
  assert.equal(ocupadas(estructura), '3:7412 4:9912');
});

test('tras redispersar, la búsqueda vuelve a encontrar la clave movida', () => {
  const estructura = dispersa(10, [[3, 7412], [4, 5312], [5, 9912]]);
  estructura.tratamiento = TRATAMIENTOS.REASIGNACION;
  aplicar(estructura, eliminarEn(estructura, 5312));

  // Es lo que la redispersión existe para sostener: sin ella, la búsqueda de
  // 9912 pararía en la casilla 4 vacía y la daría por ausente.
  const busqueda = buscarHash({
    claves: estructura.claves,
    n: estructura.n,
    objetivo: 9912,
    direccionDe: direccionModulo,
    tratamiento: TRATAMIENTOS.REASIGNACION
  });
  assert.equal(ultimo(busqueda).tipo, 'encontrada');
  assert.equal(ultimo(busqueda).casilla, 4);
});

test('la redispersión se detiene en la primera casilla vacía', () => {
  // 9914 tiene dirección 5 y llegó ahí sin colisionar: la casilla 4 vacía
  // corta la cadena, así que borrar en la 3 no puede afectarla.
  const estructura = dispersa(10, [[3, 7412], [5, 9914]]);
  estructura.tratamiento = TRATAMIENTOS.REASIGNACION;
  const pasos = eliminarEn(estructura, 7412);

  assert.equal(tipos(pasos).filter((tipo) => tipo === 'extraccion').length, 0);
  aplicar(estructura, pasos);
  assert.equal(ocupadas(estructura), '5:9914');
});

test('una clave que ya estaba en su dirección vuelve a la misma casilla', () => {
  // 9913 tiene dirección 4 y está en la 4: la redispersión la levanta igual
  // —es parte del grupo— y el cálculo la devuelve a su sitio.
  const estructura = dispersa(10, [[3, 7412], [4, 9913]]);
  estructura.tratamiento = TRATAMIENTOS.REASIGNACION;
  const pasos = eliminarEn(estructura, 7412);

  assert.ok(tipos(pasos).includes('extraccion'), 'la clave del grupo se levanta');
  assert.match(ultimo(pasos).mensaje, /vuelve a la casilla 4/);
  aplicar(estructura, pasos);
  assert.equal(ocupadas(estructura), '4:9913');
});

test('la traza no toca la estructura: el efecto lo aplica quien la reproduce', () => {
  const estructura = dispersa(10, [[3, 7412], [4, 5312], [5, 9912]]);
  estructura.tratamiento = TRATAMIENTOS.REASIGNACION;
  const antes = ocupadas(estructura);

  eliminarEn(estructura, 5312);
  assert.equal(ocupadas(estructura), antes);
});

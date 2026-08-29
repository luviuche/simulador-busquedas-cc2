const test = require('node:test');
const assert = require('node:assert/strict');
const CC2 = require('./apoyo.js');

const estructuras = CC2.dominio.estructura;
const { recorrerCadena } = CC2.algoritmos.colisiones.encadenamiento;
const { TRATAMIENTOS, insertar, buscar, eliminar } = CC2.algoritmos.hash.operaciones;
const { direccionModulo } = CC2.algoritmos.hash.modulo;

// Los mismos aplicadores que la pantalla: la traza no toca nada y quien la
// reproduce aplica el `efecto` de cada paso. La cadena reutiliza los de la
// estructura secundaria, que es lo que también es.
const APLICADORES = {
  colocar: (e, f) => estructuras.colocarEn(e, f.casilla, f.clave),
  retirar: (e, f) => estructuras.retirarDe(e, f.casilla),
  'colocar-anidado': (e, f) => estructuras.colocarEnAnidado(e, f.casilla, f.posicion, f.clave),
  'retirar-anidado': (e, f) => estructuras.retirarDeAnidado(e, f.casilla, f.posicion),
  'compactar-anidado': (e, f) => estructuras.compactarAnidado(e, f.casilla)
};

function tabla(n = 10) {
  const { estructura } = estructuras.crearEstructura({
    n, l: 4, tipoClave: 'numerica', modo: estructuras.MODOS.DISPERSA, tratamiento: TRATAMIENTOS.ENCADENAMIENTO
  });
  // La cadena no tiene tope: es lo unico que la separa del arreglo anidado.
  estructura.tamanoAnidado = Infinity;
  return estructura;
}

const operar = (estructura, operacion, clave) => operacion({
  claves: estructura.claves,
  n: estructura.n,
  clave,
  objetivo: clave,
  direccionDe: direccionModulo,
  tratamiento: TRATAMIENTOS.ENCADENAMIENTO,
  anidados: estructura.anidados,
  tamanoAnidado: estructura.tamanoAnidado
});

function aplicar(estructura, pasos) {
  for (const paso of pasos) {
    if (paso.efecto) APLICADORES[paso.efecto.tipo](estructura, paso.efecto);
  }
  return estructura;
}

const ultimo = (pasos) => pasos[pasos.length - 1];
const tipos = (pasos) => pasos.map((paso) => paso.tipo);

// Retrato "casilla:[clave] -> cadena" de las direcciones ocupadas.
const retratar = (estructura) => estructura.claves
  .map((clave, i) => {
    if (clave === undefined) return null;
    const cadena = estructuras.anidadoDe(estructura, i + 1);
    return `${i + 1}:[${clave}]` + (cadena.length ? ` -> ${cadena.join(',')}` : '');
  })
  .filter(Boolean)
  .join('  ');

// Las tres comparten dirección 3: 7412, 5312 y 9912 dan residuo 2 con n = 10.
function conTresEnLaMisma(n = 10) {
  const estructura = tabla(n);
  for (const clave of [7412, 5312, 9912]) aplicar(estructura, operar(estructura, insertar, clave));
  return estructura;
}

// ── Recorrido ────────────────────────────────────────────────────────────

test('el recorrido devuelve cada posición visitada, no solo el destino', () => {
  const recorrido = recorrerCadena({
    cadena: [5312, 9912],
    condicion: (clave) => clave === undefined
  });
  assert.deepEqual(recorrido.recorrido.map((v) => v.posicion), [1, 2]);
  assert.equal(recorrido.agotado, true);
  // Agotar la cadena no es un fracaso: es dónde se engancha la clave nueva.
  assert.equal(recorrido.posicion, 3);
});

test('el recorrido para en la clave buscada sin seguir hasta el final', () => {
  const recorrido = recorrerCadena({
    cadena: [5312, 9912, 1112],
    condicion: (clave) => clave === 9912
  });
  assert.equal(recorrido.posicion, 2);
  assert.equal(recorrido.agotado, false);
  assert.equal(recorrido.recorrido.length, 2);
});

// ── Inserción ────────────────────────────────────────────────────────────

test('la clave que obtiene la dirección se queda en la casilla de la tabla', () => {
  const estructura = tabla();
  aplicar(estructura, operar(estructura, insertar, 7412));
  assert.equal(estructura.claves[2], 7412);
  assert.deepEqual(estructuras.anidadoDe(estructura, 3), []);
});

test('las que chocan se enganchan al final de la cadena, en orden de llegada', () => {
  assert.equal(retratar(conTresEnLaMisma()), '3:[7412] -> 5312,9912');
});

test('la cadena se recorre entera y cada visita deja su paso', () => {
  const estructura = conTresEnLaMisma();
  const pasos = operar(estructura, insertar, 1112);
  const recorridas = pasos.filter((paso) => paso.tipo === 'sondeo').map((paso) => paso.posicion);
  assert.deepEqual(recorridas, [1, 2]);
  assert.equal(ultimo(pasos).posicion, 3);
  assert.match(ultimo(pasos).mensaje, /al final de la cadena de la dirección 3/);
});

test('la estructura no se satura nunca: es lo que define al tratamiento', () => {
  // Con n = 2 y arreglos anidados, esta dirección solo sostendría 2 claves.
  const estructura = tabla(2);
  for (const clave of [1001, 1003, 1005, 1007, 1009]) {
    const pasos = operar(estructura, insertar, clave);
    assert.equal(tipos(pasos).includes('saturada'), false);
    aplicar(estructura, pasos);
  }
  assert.equal(retratar(estructura), '2:[1001] -> 1003,1005,1007,1009');
  assert.equal(estructuras.capacidad(estructura), Infinity);
  assert.equal(estructuras.estaLlena(estructura), false);
});

test('el factor de carga se mide contra n y puede pasar de 1', () => {
  // Es lo que el factor de carga significa en una tabla encadenada: claves por
  // dirección en promedio. Medirlo contra una capacidad infinita daría 0.
  const estructura = tabla(2);
  for (const clave of [1001, 1003, 1005]) aplicar(estructura, operar(estructura, insertar, clave));
  assert.equal(estructuras.baseDeCarga(estructura), 2);
  assert.equal(estructuras.cantidadClaves(estructura) / estructuras.baseDeCarga(estructura), 1.5);
});

test('una clave de la cadena cuenta como duplicada', () => {
  const estructura = conTresEnLaMisma();
  assert.equal(estructuras.casillaDe(estructura, 9912), 3);
});

// ── Búsqueda ─────────────────────────────────────────────────────────────

test('la búsqueda baja a la cadena y cobra una comparación por posición', () => {
  const estructura = conTresEnLaMisma();
  const final = ultimo(operar(estructura, buscar, 9912));
  assert.equal(final.tipo, 'encontrada');
  assert.equal(final.casilla, 3);
  assert.equal(final.posicion, 2);
  // Una en la casilla de la tabla y dos en la cadena: es el costo del método.
  assert.equal(final.comparaciones, 3);
});

test('recorrer la cadena entera es lo que prueba la ausencia', () => {
  // No hay posición vacía que lo pruebe, como sí la hay en el arreglo anidado:
  // una cadena no tiene huecos, así que el final es la respuesta.
  const estructura = conTresEnLaMisma();
  const final = ultimo(operar(estructura, buscar, 4412));
  assert.equal(final.tipo, 'no-encontrada');
  assert.equal(final.posicion, undefined);
  assert.match(final.mensaje, /se recorrió entera/);
});

test('una dirección vacía se responde sin recorrer nada', () => {
  const estructura = conTresEnLaMisma();
  const final = ultimo(operar(estructura, buscar, 1005));
  assert.equal(final.tipo, 'no-encontrada');
  assert.match(final.mensaje, /está vacía/);
});

// ── Eliminación ──────────────────────────────────────────────────────────

test('al sacar de la cadena, las de atrás cierran el hueco', () => {
  const estructura = conTresEnLaMisma();
  aplicar(estructura, operar(estructura, eliminar, 5312));
  assert.equal(retratar(estructura), '3:[7412] -> 9912');
});

test('al sacar la de la tabla, la primera de la cadena sube a ocuparla', () => {
  const estructura = conTresEnLaMisma();
  const pasos = operar(estructura, eliminar, 7412);
  assert.match(ultimo(pasos).mensaje, /La primera clave de la cadena de la dirección 3 sube a la casilla/);
  aplicar(estructura, pasos);
  assert.equal(retratar(estructura), '3:[5312] -> 9912');
});

test('tras subir una clave a la tabla, la búsqueda la halla en su nuevo sitio', () => {
  const estructura = conTresEnLaMisma();
  aplicar(estructura, operar(estructura, eliminar, 7412));
  const final = ultimo(operar(estructura, buscar, 9912));
  assert.equal(final.tipo, 'encontrada');
  assert.equal(final.posicion, 1);
});

test('sacar la última de la cadena no agrega un paso que no mueve nada', () => {
  const estructura = conTresEnLaMisma();
  const pasos = operar(estructura, eliminar, 9912);
  assert.equal(tipos(pasos).includes('desplazamiento'), false);
  aplicar(estructura, pasos);
  assert.equal(retratar(estructura), '3:[7412] -> 5312');
});

test('la traza de eliminación no toca la estructura', () => {
  const estructura = conTresEnLaMisma();
  const antes = retratar(estructura);
  operar(estructura, eliminar, 5312);
  assert.equal(retratar(estructura), antes);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const CC2 = require('./apoyo.js');

const estructuras = CC2.dominio.estructura;
const { recorrerAnidado } = CC2.algoritmos.colisiones.anidados;
const { TRATAMIENTOS, insertar, buscar, eliminar } = CC2.algoritmos.hash.operaciones;
const { direccionModulo } = CC2.algoritmos.hash.modulo;

// Los mismos aplicadores que la pantalla: la traza no toca nada y quien la
// reproduce aplica el `efecto` de cada paso.
const APLICADORES = {
  colocar: (e, f) => estructuras.colocarEn(e, f.casilla, f.clave),
  retirar: (e, f) => estructuras.retirarDe(e, f.casilla),
  'colocar-anidado': (e, f) => estructuras.colocarEnAnidado(e, f.casilla, f.posicion, f.clave),
  'retirar-anidado': (e, f) => estructuras.retirarDeAnidado(e, f.casilla, f.posicion),
  'compactar-anidado': (e, f) => estructuras.compactarAnidado(e, f.casilla)
};

function tabla(n = 10) {
  const { estructura } = estructuras.crearEstructura({
    n, l: 4, tipoClave: 'numerica', modo: estructuras.MODOS.DISPERSA, tratamiento: TRATAMIENTOS.ANIDADOS
  });
  // Matriz n x n: la tabla mas n-1 columnas de arreglo (CLAUDE.md 5.4).
  estructura.tamanoAnidado = n - 1;
  return estructura;
}

const operar = (estructura, operacion, clave) => operacion({
  claves: estructura.claves,
  n: estructura.n,
  clave,
  objetivo: clave,
  direccionDe: direccionModulo,
  tratamiento: TRATAMIENTOS.ANIDADOS,
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

// Retrato "casilla:[clave] -> anidado" de las direcciones ocupadas.
const retratar = (estructura) => estructura.claves
  .map((clave, i) => {
    if (clave === undefined) return null;
    const anidado = estructuras.anidadoDe(estructura, i + 1);
    return `${i + 1}:[${clave}]` + (anidado.length ? ` -> ${anidado.join(',')}` : '');
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
  const recorrido = recorrerAnidado({
    anidado: [5312, 9912],
    tamano: 3,
    condicion: (clave) => clave === undefined
  });
  assert.deepEqual(recorrido.recorrido.map((v) => v.posicion), [1, 2, 3]);
  assert.equal(recorrido.posicion, 3);
  assert.equal(recorrido.agotado, false);
});

test('un arreglo lleno agota el recorrido en vez de salirse de su tamaño', () => {
  const recorrido = recorrerAnidado({
    anidado: [1, 2],
    tamano: 2,
    condicion: (clave) => clave === undefined
  });
  assert.equal(recorrido.agotado, true);
  assert.equal(recorrido.recorrido.length, 2);
});

// ── Inserción ────────────────────────────────────────────────────────────

test('la clave que obtiene la dirección se queda en la casilla de la tabla', () => {
  const estructura = tabla();
  aplicar(estructura, operar(estructura, insertar, 7412));
  assert.equal(estructura.claves[2], 7412);
  assert.deepEqual(estructuras.anidadoDe(estructura, 3), []);
});

test('las que chocan bajan al arreglo de esa dirección, en orden de llegada', () => {
  // Es lo que separa este tratamiento de la reasignación: la clave nunca se
  // aleja de su dirección.
  assert.equal(retratar(conTresEnLaMisma()), '3:[7412] -> 5312,9912');
});

test('el arreglo se recorre posición por posición y cada visita deja paso', () => {
  const estructura = tabla();
  for (const clave of [7412, 5312]) aplicar(estructura, operar(estructura, insertar, clave));

  const pasos = operar(estructura, insertar, 9912);
  const recorridas = pasos.filter((paso) => paso.tipo === 'sondeo').map((paso) => paso.posicion);
  assert.deepEqual(recorridas, [1]);
  assert.equal(ultimo(pasos).posicion, 2);
});

test('con el arreglo lleno la clave no entra', () => {
  // Con n = 3 una dirección sostiene 3 claves: la de la tabla y las n − 1 = 2
  // del arreglo. Las cuatro claves dan residuo 2, o sea dirección 3.
  const estructura = tabla(3);
  for (const clave of [1001, 1004, 1007]) aplicar(estructura, operar(estructura, insertar, clave));
  assert.equal(retratar(estructura), '3:[1001] -> 1004,1007');

  const pasos = operar(estructura, insertar, 1010);
  assert.equal(ultimo(pasos).tipo, 'saturada');
  assert.match(ultimo(pasos).mensaje, /Arreglo anidado de la dirección 3 saturado/);
  assert.equal(pasos.some((paso) => paso.efecto), false);
});

test('la matriz es de n × n, así que caben n claves por dirección', () => {
  // El tamaño del arreglo no se pide: sale de n. Medir la capacidad contra n
  // daría la estructura por llena teniendo sitio de sobra, y el factor de
  // carga mentiría por lo mismo.
  const estructura = conTresEnLaMisma();
  assert.equal(estructura.tamanoAnidado, 9);
  assert.equal(estructuras.capacidad(estructura), 100);
  assert.equal(estructuras.cantidadClaves(estructura), 3);
  assert.equal(estructuras.estaLlena(estructura), false);
});

test('una clave del arreglo anidado cuenta como duplicada', () => {
  // Si no, la misma clave podría entrar dos veces por caminos distintos.
  const estructura = conTresEnLaMisma();
  assert.equal(estructuras.casillaDe(estructura, 9912), 3);
});

// ── Búsqueda ─────────────────────────────────────────────────────────────

test('la búsqueda baja al arreglo y cobra una comparación por posición', () => {
  const estructura = conTresEnLaMisma();
  const pasos = operar(estructura, buscar, 9912);
  const final = ultimo(pasos);
  assert.equal(final.tipo, 'encontrada');
  assert.equal(final.casilla, 3);
  assert.equal(final.posicion, 2);
  // Una en la casilla de la tabla y dos en el arreglo: es el costo del método.
  assert.equal(final.comparaciones, 3);
});

test('una posición vacía prueba la ausencia sin recorrer el resto', () => {
  const estructura = conTresEnLaMisma();
  const pasos = operar(estructura, buscar, 4412);
  const final = ultimo(pasos);
  assert.equal(final.tipo, 'no-encontrada');
  assert.equal(final.posicion, 3);
});

// ── Eliminación ──────────────────────────────────────────────────────────

test('al sacar del arreglo, las de atrás cierran el hueco', () => {
  const estructura = conTresEnLaMisma();
  aplicar(estructura, operar(estructura, eliminar, 5312));
  assert.equal(retratar(estructura), '3:[7412] -> 9912');
});

test('al sacar la de la tabla, la primera del arreglo sube a ocuparla', () => {
  // Sin eso quedaría una dirección vacía con claves colgando de ella, que
  // contradice lo que el dibujo dice.
  const estructura = conTresEnLaMisma();
  aplicar(estructura, operar(estructura, eliminar, 7412));
  assert.equal(retratar(estructura), '3:[5312] -> 9912');
});

test('tras subir una clave a la tabla, la búsqueda la halla en su nuevo sitio', () => {
  const estructura = conTresEnLaMisma();
  aplicar(estructura, operar(estructura, eliminar, 7412));
  const final = ultimo(operar(estructura, buscar, 9912));
  assert.equal(final.tipo, 'encontrada');
  assert.equal(final.posicion, 1);
});

test('sacar la última del arreglo no agrega un paso que no mueve nada', () => {
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

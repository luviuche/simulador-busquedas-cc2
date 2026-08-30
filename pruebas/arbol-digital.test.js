const test = require('node:test');
const assert = require('node:assert/strict');
const CC2 = require('./apoyo.js');

const estructuras = CC2.dominio.estructura;
const arbol = CC2.dominio.arbol;
const { codigoDeLetra, BITS_LETRA } = CC2.dominio.clave;
const { insertar, buscar, eliminar, insertarPalabra } = CC2.algoritmos.arbolDigital;

// Los mismos aplicadores que la pantalla: la traza no toca nada y quien la
// reproduce aplica el `efecto` de cada paso.
const APLICADORES = {
  'colocar-nodo': (e, f) => arbol.colocarNodo(e, f.nodo, f.clave),
  'retirar-nodo': (e, f) => arbol.retirarNodo(e, f.nodo),
  'mover-nodo': (e, f) => arbol.moverNodo(e, f.desde, f.hasta)
};

function tabla() {
  const { estructura } = estructuras.crearEstructura({
    n: arbol.posiciones(BITS_LETRA), l: 1, tipoClave: 'alfabetica', modo: estructuras.MODOS.ARBOL
  });
  return estructura;
}

const operar = (estructura, operacion, datos) => operacion(Object.assign({
  claves: estructura.claves,
  n: estructura.n,
  bits: BITS_LETRA
}, datos));

function aplicar(estructura, pasos) {
  for (const paso of pasos) {
    if (paso.efecto) APLICADORES[paso.efecto.tipo](estructura, paso.efecto);
  }
  return estructura;
}

const ultimo = (pasos) => pasos[pasos.length - 1];
const tipos = (pasos) => pasos.map((paso) => paso.tipo);

// Retrato "posición:clave" del árbol, en orden de posición. La posición dice
// el camino de bits, así que el retrato es el árbol entero.
const retratar = (estructura) => arbol.nodos(estructura)
  .map((nodo) => `${nodo.indice}:${nodo.clave}`)
  .join('  ');

// El ejercicio de clase: las seis letras de «prueba», en ese orden.
function conPrueba() {
  const estructura = tabla();
  return aplicar(estructura, operar(estructura, insertarPalabra, { letras: [...'prueba'] }));
}

// ── Código de la letra ───────────────────────────────────────────────────

test('la letra se codifica con las cinco cifras que la distinguen', () => {
  // Son las últimas cinco del byte, que además son su posición en el alfabeto.
  assert.equal(codigoDeLetra('a'), '00001');
  assert.equal(codigoDeLetra('b'), '00010');
  assert.equal(codigoDeLetra('e'), '00101');
  assert.equal(codigoDeLetra('p'), '10000');
  assert.equal(codigoDeLetra('r'), '10010');
  assert.equal(codigoDeLetra('u'), '10101');
});

test('mayúscula y minúscula dan el mismo código', () => {
  assert.equal(codigoDeLetra('P'), codigoDeLetra('p'));
});

// ── Inserción ────────────────────────────────────────────────────────────

test('la primera clave queda en la raíz', () => {
  const estructura = tabla();
  aplicar(estructura, operar(estructura, insertar, { clave: 'p' }));
  assert.equal(retratar(estructura), '1:p');
});

test('«prueba» arma el árbol del ejercicio de clase', () => {
  // p en la raíz; e a la izquierda y r a la derecha (bit 1); b bajo e y u bajo
  // r (bit 2); a bajo b (bit 3). Las posiciones son el camino de bits.
  assert.equal(retratar(conPrueba()), '1:p  2:e  3:r  4:b  6:u  8:a');
});

test('en el nivel d se mira el bit d y 0 baja a la izquierda', () => {
  const estructura = conPrueba();
  const pasos = operar(estructura, buscar, { objetivo: 'a' });
  const bajadas = pasos.filter((paso) => paso.tipo === 'comparacion');
  assert.deepEqual(bajadas.map((paso) => paso.nivel), [1, 2, 3]);
  assert.match(bajadas[0].mensaje, /bit 1 de 00001 es 0, se baja a la izquierda/);
});

test('una letra repetida no entra y se dice dónde está la que ya estaba', () => {
  const estructura = conPrueba();
  const pasos = operar(estructura, insertar, { clave: 'r' });
  assert.equal(ultimo(pasos).tipo, 'rechazada');
  assert.match(ultimo(pasos).mensaje, /Clave duplicada: r ya reside en el hijo derecho de p/);
  assert.equal(pasos.some((paso) => paso.efecto), false);
});

test('insertar una palabra deja una sola traza, letra por letra', () => {
  // Es lo que permite avanzar y retroceder la palabra entera como cualquier
  // otra operación, en vez de seis operaciones sueltas.
  const estructura = tabla();
  const pasos = operar(estructura, insertarPalabra, { letras: [...'prueba'] });
  const inserciones = pasos.filter((paso) => paso.tipo === 'insercion');
  assert.equal(inserciones.length, 6);
  assert.deepEqual(inserciones.map((paso) => paso.clave), [...'prueba']);
});

test('la altura cuenta niveles y es lo que cuesta la peor búsqueda', () => {
  const estructura = conPrueba();
  assert.equal(arbol.altura(estructura), 4);
  const pasos = operar(estructura, buscar, { objetivo: 'a' });
  assert.equal(ultimo(pasos).comparaciones, 4);
});

// ── Búsqueda ─────────────────────────────────────────────────────────────

test('la búsqueda compara la clave entera en cada nodo, no solo al final', () => {
  // Es lo que separa este tema de los de residuos: las claves viven en todos
  // los nodos, así que una búsqueda puede terminar en cualquier nivel.
  const estructura = conPrueba();
  const final = ultimo(operar(estructura, buscar, { objetivo: 'u' }));
  assert.equal(final.tipo, 'encontrada');
  assert.equal(final.casilla, 6);
  assert.equal(final.comparaciones, 3);
});

test('una posición vacía prueba la ausencia: es donde la clave tendría que estar', () => {
  const estructura = conPrueba();
  const final = ultimo(operar(estructura, buscar, { objetivo: 'c' }));
  assert.equal(final.tipo, 'no-encontrada');
  // c = 00011: izquierda (e), izquierda (b), izquierda (a) y derecha, que es
  // la posición 17 y está vacía.
  assert.equal(final.casilla, 17);
  assert.match(final.mensaje, /el hijo derecho de a está vacío/);
});

// ── Eliminación ──────────────────────────────────────────────────────────

test('eliminar una hoja la saca y ya', () => {
  const estructura = conPrueba();
  const pasos = operar(estructura, eliminar, { clave: 'a' });
  assert.equal(tipos(pasos).includes('desplazamiento'), false);
  aplicar(estructura, pasos);
  assert.equal(retratar(estructura), '1:p  2:e  3:r  4:b  6:u');
});

test('al eliminar un nodo con descendientes sube una hoja de su subárbol', () => {
  // Dejar el hueco partiría el árbol: lo que cuelga del nodo dejaría de ser
  // alcanzable. La hoja que sube llegó hasta ahí bajando por esa misma
  // posición, así que sus primeros bits son los que el camino exige.
  const estructura = conPrueba();
  const pasos = operar(estructura, eliminar, { clave: 'e' });
  assert.deepEqual(tipos(pasos).slice(-2), ['eliminacion', 'desplazamiento']);
  aplicar(estructura, pasos);
  assert.equal(retratar(estructura), '1:p  2:a  3:r  4:b  6:u');
});

test('tras subir la hoja, la búsqueda sigue hallando lo que quedó', () => {
  const estructura = conPrueba();
  aplicar(estructura, operar(estructura, eliminar, { clave: 'e' }));
  for (const letra of ['a', 'b', 'u', 'r', 'p']) {
    const final = ultimo(operar(estructura, buscar, { objetivo: letra }));
    assert.equal(final.tipo, 'encontrada', `no encontró ${letra}`);
  }
});

test('eliminar la raíz deja el árbol recorrible', () => {
  const estructura = conPrueba();
  aplicar(estructura, operar(estructura, eliminar, { clave: 'p' }));
  assert.equal(arbol.claveEn(estructura, arbol.RAIZ), 'a');
  const final = ultimo(operar(estructura, buscar, { objetivo: 'u' }));
  assert.equal(final.tipo, 'encontrada');
});

test('eliminar una clave que no está termina en la conclusión de la búsqueda', () => {
  const estructura = conPrueba();
  const pasos = operar(estructura, eliminar, { clave: 'z' });
  assert.equal(ultimo(pasos).tipo, 'no-encontrada');
  assert.equal(pasos.some((paso) => paso.efecto), false);
});

test('la traza no toca la estructura', () => {
  const estructura = conPrueba();
  const antes = retratar(estructura);
  operar(estructura, eliminar, { clave: 'e' });
  operar(estructura, insertar, { clave: 'z' });
  assert.equal(retratar(estructura), antes);
});

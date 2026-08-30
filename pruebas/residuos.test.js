const test = require('node:test');
const assert = require('node:assert/strict');
const CC2 = require('./apoyo.js');

const estructuras = CC2.dominio.estructura;
const arbol = CC2.dominio.arbol;
const { BITS_LETRA } = CC2.dominio.clave;
const { insertar, buscar, eliminar, insertarPalabra, caminoDe } = CC2.algoritmos.residuos;

// Los mismos aplicadores que la pantalla: la traza no toca nada y quien la
// reproduce aplica el `efecto` de cada paso.
const APLICADORES = {
  'colocar-nodo': (e, f) => arbol.colocarNodo(e, f.nodo, f.clave),
  'retirar-nodo': (e, f) => arbol.retirarNodo(e, f.nodo),
  'mover-nodo': (e, f) => arbol.moverNodo(e, f.desde, f.hasta)
};

// Un nivel más que el árbol digital: las claves solo viven en las hojas, así
// que dos códigos que solo se separan en el último bit dejan sus hojas un
// nivel por debajo del último que se mira.
const NIVELES = BITS_LETRA + 1;

function arbolVacio() {
  const { estructura } = estructuras.crearEstructura({
    n: arbol.posiciones(NIVELES), l: 1, tipoClave: 'alfabetica', modo: estructuras.MODOS.ARBOL
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

// El árbol retratado por el camino de bits de cada clave, que es lo que el
// tema enseña: la posición *es* el camino. `p:1000` se lee «p vive bajando
// 1, 0, 0, 0 desde la raíz».
function retratar(estructura) {
  return arbol.nodos(estructura)
    .map((nodo) => `${nodo.clave}:${caminoDe(nodo.indice) || 'raíz'}`)
    .join(' ');
}

const conPalabra = (palabra) => {
  const estructura = arbolVacio();
  aplicar(estructura, operar(estructura, insertarPalabra, { letras: palabra.split('') }));
  return estructura;
};

const ultimo = (pasos) => pasos[pasos.length - 1];
const tipos = (pasos) => pasos.map((paso) => paso.tipo);

test('la primera clave se queda en la raíz', () => {
  const estructura = arbolVacio();
  aplicar(estructura, operar(estructura, insertar, { clave: 'p' }));
  assert.equal(retratar(estructura), 'p:raíz');
});

test('la segunda clave baja a las dos hasta el bit en que se diferencian', () => {
  // p = 10000 y r = 10010 coinciden en los bits 1, 2 y 3, y se separan en el
  // cuarto: las dos quedan como hojas en el nivel 5.
  const estructura = conPalabra('pr');
  assert.equal(retratar(estructura), 'p:1000 r:1001');
});

test('el árbol de «prueba» es el del tablero', () => {
  const estructura = conPalabra('prueba');
  assert.equal(
    retratar(estructura),
    'e:001 u:101 a:0000 b:0001 p:1000 r:1001'
  );
  assert.equal(arbol.altura(estructura), 5);
});

test('ninguna clave queda en un nodo con descendientes', () => {
  const estructura = conPalabra('prueba');
  for (const nodo of arbol.nodos(estructura)) {
    assert.equal(
      arbol.clavesDelSubarbol(estructura, nodo.indice).length, 1,
      `la clave ${nodo.clave} tiene claves colgando debajo`
    );
  }
});

test('el orden de inserción no cambia el árbol', () => {
  assert.equal(retratar(conPalabra('prueba')), retratar(conPalabra('aberup')));
});

test('buscar compara una sola vez, por hondo que baje', () => {
  const estructura = conPalabra('prueba');
  const pasos = operar(estructura, buscar, { objetivo: 'a' });
  const hallazgo = ultimo(pasos);

  assert.equal(hallazgo.tipo, 'encontrada');
  assert.equal(hallazgo.comparaciones, 1);
  // Cuatro bifurcaciones para llegar al nivel 5, y la hoja.
  assert.equal(hallazgo.accesos, 5);
  assert.equal(tipos(pasos).filter((tipo) => tipo === 'ramificacion').length, 4);
});

test('el camino cortado prueba que la clave no está', () => {
  // h = 01000: comparte el bit 1 con a, b y e, y en el segundo se va por la
  // derecha, donde el árbol no tiene nada.
  const estructura = conPalabra('prueba');
  const hallazgo = ultimo(operar(estructura, buscar, { objetivo: 'h' }));

  assert.equal(hallazgo.tipo, 'no-encontrada');
  assert.equal(hallazgo.comparaciones, 0);
  assert.match(hallazgo.mensaje, /no existe/);
});

test('llegar a una hoja ajena también prueba que la clave no está', () => {
  // v = 10110 baja por el mismo camino que u = 10101 hasta el nivel 4.
  const estructura = conPalabra('prueba');
  const hallazgo = ultimo(operar(estructura, buscar, { objetivo: 'v' }));

  assert.equal(hallazgo.tipo, 'no-encontrada');
  assert.equal(hallazgo.comparaciones, 1);
  assert.match(hallazgo.mensaje, /guarda u/);
});

test('la clave duplicada se rechaza sin tocar el árbol', () => {
  const estructura = conPalabra('prueba');
  const antes = retratar(estructura);
  const pasos = operar(estructura, insertar, { clave: 'e' });

  assert.equal(ultimo(pasos).tipo, 'rechazada');
  aplicar(estructura, pasos);
  assert.equal(retratar(estructura), antes);
});

test('el árbol vacío no encuentra nada', () => {
  const estructura = arbolVacio();
  const hallazgo = ultimo(operar(estructura, buscar, { objetivo: 'p' }));

  assert.equal(hallazgo.tipo, 'no-encontrada');
  assert.match(hallazgo.mensaje, /vacío/);
});

test('eliminar una hoja con hermana ocupada no recoge nada', () => {
  // Se va e (001) y su hermana es la rama de a y b, que tiene dos claves.
  const estructura = conPalabra('prueba');
  const pasos = operar(estructura, eliminar, { clave: 'e' });
  aplicar(estructura, pasos);

  assert.equal(retratar(estructura), 'u:101 a:0000 b:0001 p:1000 r:1001');
  assert.equal(tipos(pasos).filter((tipo) => tipo === 'desplazamiento').length, 0);
});

test('al quedar la rama con una sola clave, esa clave sube', () => {
  const estructura = conPalabra('prueba');
  const pasos = operar(estructura, eliminar, { clave: 'a' });
  aplicar(estructura, pasos);

  // b sube un nivel: el bit 4 ya no la distingue de nadie.
  assert.equal(retratar(estructura), 'b:000 e:001 u:101 p:1000 r:1001');
  assert.equal(tipos(pasos).filter((tipo) => tipo === 'desplazamiento').length, 1);
});

test('la clave sube tantos niveles como ramas queden colgando', () => {
  const estructura = conPalabra('prueba');
  aplicar(estructura, operar(estructura, eliminar, { clave: 'a' }));
  const pasos = operar(estructura, eliminar, { clave: 'b' });
  aplicar(estructura, pasos);

  // Sin a ni b, e es la única clave con bit 1 = 0: sube desde 001 hasta 0.
  assert.equal(retratar(estructura), 'e:0 u:101 p:1000 r:1001');
  assert.equal(tipos(pasos).filter((tipo) => tipo === 'desplazamiento').length, 2);
});

test('eliminar deja el mismo árbol que insertar las claves que quedan', () => {
  const eliminada = conPalabra('prueba');
  aplicar(eliminada, operar(eliminada, eliminar, { clave: 'a' }));
  assert.equal(retratar(eliminada), retratar(conPalabra('prueb')));
});

test('la última clave que queda vuelve a la raíz', () => {
  const estructura = conPalabra('pr');
  aplicar(estructura, operar(estructura, eliminar, { clave: 'r' }));
  assert.equal(retratar(estructura), 'p:raíz');
});

test('vaciar el árbol lo deja sin claves', () => {
  const estructura = conPalabra('prueba');
  for (const letra of 'prueba'.split('')) {
    aplicar(estructura, operar(estructura, eliminar, { clave: letra }));
  }
  assert.equal(retratar(estructura), '');
  assert.equal(arbol.altura(estructura), 0);
});

test('eliminar una clave ausente no cambia el árbol', () => {
  const estructura = conPalabra('prueba');
  const antes = retratar(estructura);
  const pasos = operar(estructura, eliminar, { clave: 'z' });

  assert.equal(ultimo(pasos).tipo, 'no-encontrada');
  aplicar(estructura, pasos);
  assert.equal(retratar(estructura), antes);
});

test('la traza de la palabra se puede reproducir paso a paso', () => {
  // Cada paso con efecto lleva la posición a la que toca, así que reproducir
  // la traza a medias tiene que dejar el árbol de las letras ya insertadas.
  const completo = conPalabra('prueba');
  const parcial = arbolVacio();
  const pasos = operar(parcial, insertarPalabra, { letras: 'prueba'.split('') });

  aplicar(parcial, pasos);
  assert.equal(retratar(parcial), retratar(completo));
});

test('ninguna posición se sale del árbol', () => {
  const estructura = conPalabra('prueba');
  for (const nodo of arbol.nodos(estructura)) {
    assert.ok(nodo.indice >= arbol.RAIZ && nodo.indice <= estructura.n, `posición ${nodo.indice} fuera de 1..${estructura.n}`);
  }
});

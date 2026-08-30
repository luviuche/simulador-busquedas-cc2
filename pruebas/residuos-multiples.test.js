const test = require('node:test');
const assert = require('node:assert/strict');
const CC2 = require('./apoyo.js');

const estructuras = CC2.dominio.estructura;
const arbol = CC2.dominio.arbolMultiple;
const { BITS_LETRA } = CC2.dominio.clave;
const { insertar, buscar, eliminar, insertarPalabra, bloqueEn } = CC2.algoritmos.residuosMultiples;

const APLICADORES = {
  'colocar-nodo': (e, f) => arbol.colocarNodo(e, f.nodo, f.clave),
  'retirar-nodo': (e, f) => arbol.retirarNodo(e, f.nodo),
  'mover-nodo': (e, f) => arbol.moverNodo(e, f.desde, f.hasta)
};

function arbolVacio() {
  const { estructura } = estructuras.crearEstructura({
    n: arbol.posiciones(), l: 1, tipoClave: 'alfabetica', modo: estructuras.MODOS.ARBOL
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

// El árbol retratado por el camino de bloques de cada clave: `p:10·00` se lee
// «p vive bajando por la rama 10 y después por la 00».
function retratar(estructura) {
  return arbol.nodos(estructura)
    .map((nodo) => `${nodo.clave}:${arbol.caminoDe(nodo.indice) || 'raíz'}`)
    .join(' ');
}

const conPalabra = (palabra) => {
  const estructura = arbolVacio();
  aplicar(estructura, operar(estructura, insertarPalabra, { letras: palabra.split('') }));
  return estructura;
};

const ultimo = (pasos) => pasos[pasos.length - 1];
const tipos = (pasos) => pasos.map((paso) => paso.tipo);

test('los cinco bits se parten en bloques de 2, 2 y 1', () => {
  // 5 no se divide entre 2, así que el último bloque va corto y el último
  // nivel ramifica en dos y no en cuatro.
  assert.deepEqual(arbol.BLOQUES, [2, 2, 1]);
  assert.equal(bloqueEn('10000', 1), '10');
  assert.equal(bloqueEn('10000', 2), '00');
  assert.equal(bloqueEn('10000', 3), '0');
  assert.equal(arbol.ramasDe(1), 4);
  assert.equal(arbol.ramasDe(2), 4);
  assert.equal(arbol.ramasDe(3), 2);
});

test('cada nodo abre sus ramas y ninguna se pisa con otra', () => {
  const vistas = new Set();
  const porNivel = { 1: 1, 2: 4, 3: 16 };
  for (const nivel of [1, 2, 3]) {
    let cuantos = 0;
    for (let i = 1; i <= arbol.posiciones(); i++) {
      if (arbol.nivelDe(i) !== nivel) continue;
      cuantos++;
      for (const hijo of arbol.hijos(i)) {
        assert.ok(!vistas.has(hijo), `la posición ${hijo} cuelga de dos padres`);
        vistas.add(hijo);
        assert.equal(arbol.padre(hijo), i, `el padre de ${hijo} no es ${i}`);
        assert.equal(arbol.nivelDe(hijo), nivel + 1);
      }
    }
    assert.equal(cuantos, porNivel[nivel], `el nivel ${nivel} tiene ${porNivel[nivel]} posiciones`);
  }
});

test('la primera clave también gasta su código entero', () => {
  // No se queda en la raíz aunque esté sola: el sitio lo dice el código, no
  // quién más haya en el árbol.
  const estructura = arbolVacio();
  aplicar(estructura, operar(estructura, insertar, { clave: 'p' }));
  assert.equal(retratar(estructura), 'p:10·00·0');
});

test('el camino de cada clave es su código leído por bloques', () => {
  // Las seis quedan en el último nivel, cada una al final de sus tres bloques:
  // p = 10 | 00 | 0, tres enlaces y la clave. Contra los cinco niveles de
  // residuos, aquí son cuatro y todas a la misma altura.
  const estructura = conPalabra('prueba');
  assert.equal(
    retratar(estructura),
    'a:00·00·1 b:00·01·0 e:00·10·1 p:10·00·0 r:10·01·0 u:10·10·1'
  );
  assert.equal(arbol.altura(estructura), 4);
});

test('no puede haber choques: ninguna letra le disputa el sitio a otra', () => {
  // Dos códigos distintos no coinciden en los tres bloques, así que insertar
  // el alfabeto entero no produce un solo paso de colisión ni de movimiento.
  const estructura = arbolVacio();
  const letras = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const pasos = operar(estructura, insertarPalabra, { letras });
  aplicar(estructura, pasos);

  assert.equal(tipos(pasos).filter((tipo) => tipo === 'colision').length, 0);
  assert.equal(tipos(pasos).filter((tipo) => tipo === 'desplazamiento').length, 0);
  assert.equal(arbol.nodos(estructura).length, 26);
  for (const nodo of arbol.nodos(estructura)) {
    assert.equal(arbol.nivelDe(nodo.indice), 4, `la clave ${nodo.clave} no quedó en el último nivel`);
  }
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

test('buscar compara una sola vez y lee menos bloques que bits', () => {
  const estructura = conPalabra('prueba');
  const pasos = operar(estructura, buscar, { objetivo: 'a' });
  const hallazgo = ultimo(pasos);

  assert.equal(hallazgo.tipo, 'encontrada');
  assert.equal(hallazgo.comparaciones, 1);
  // Tres bloques y la hoja: en residuos, la misma clave costaba cinco accesos.
  assert.equal(hallazgo.accesos, 4);
  assert.equal(tipos(pasos).filter((tipo) => tipo === 'ramificacion').length, 3);
});

test('la rama vacía prueba que la clave no está', () => {
  // h = 01000 se va por la rama 01 de la raíz, donde el árbol no tiene nada.
  const estructura = conPalabra('prueba');
  const hallazgo = ultimo(operar(estructura, buscar, { objetivo: 'h' }));

  assert.equal(hallazgo.tipo, 'no-encontrada');
  assert.equal(hallazgo.comparaciones, 0);
  assert.equal(hallazgo.accesos, 2);
});

test('nunca se llega a una hoja que guarde otra clave', () => {
  // t = 10100 comparte los dos primeros bloques con u = 10101 y solo se separa
  // en el último. Aun así la búsqueda no tropieza con u: cada letra tiene su
  // propia posición final, y la de t está vacía. Por eso no se compara nada.
  const estructura = conPalabra('prueba');
  const hallazgo = ultimo(operar(estructura, buscar, { objetivo: 't' }));

  assert.equal(hallazgo.tipo, 'no-encontrada');
  assert.equal(hallazgo.comparaciones, 0);
});

test('la clave duplicada se rechaza sin tocar el árbol', () => {
  const estructura = conPalabra('prueba');
  const antes = retratar(estructura);
  const pasos = operar(estructura, insertar, { clave: 'e' });

  assert.equal(ultimo(pasos).tipo, 'rechazada');
  aplicar(estructura, pasos);
  assert.equal(retratar(estructura), antes);
});

test('dos claves que comparten los dos primeros bloques quedan hermanas', () => {
  // b = 00010 y c = 00011 comparten 00 y 01 y se separan en el último bloque:
  // cuelgan del mismo nodo, una por el enlace 0 y otra por el 1.
  const estructura = conPalabra('bc');
  const nodos = arbol.nodos(estructura);
  assert.equal(retratar(estructura), 'b:00·01·0 c:00·01·1');
  assert.equal(arbol.padre(nodos[0].indice), arbol.padre(nodos[1].indice));
});

test('al eliminar no sube nada: la clave sale y ya', () => {
  // Una clave que subiera dejaría de estar donde su código dice, y la búsqueda
  // —que baja el código entero sin mirar— no la encontraría.
  const estructura = conPalabra('prueba');
  const pasos = operar(estructura, eliminar, { clave: 'a' });
  aplicar(estructura, pasos);

  assert.equal(retratar(estructura), 'b:00·01·0 e:00·10·1 p:10·00·0 r:10·01·0 u:10·10·1');
  assert.equal(tipos(pasos).filter((tipo) => tipo === 'desplazamiento').length, 0);
});

test('la clave que queda sola en su rama tampoco sube', () => {
  const estructura = conPalabra('prueba');
  aplicar(estructura, operar(estructura, eliminar, { clave: 'a' }));
  aplicar(estructura, operar(estructura, eliminar, { clave: 'b' }));

  // e sigue al final de su código aunque sea la única de la rama 00.
  assert.equal(retratar(estructura), 'e:00·10·1 p:10·00·0 r:10·01·0 u:10·10·1');
});

test('eliminar deja el mismo árbol que insertar las claves que quedan', () => {
  const eliminada = conPalabra('prueba');
  aplicar(eliminada, operar(eliminada, eliminar, { clave: 'a' }));
  aplicar(eliminada, operar(eliminada, eliminar, { clave: 'b' }));
  assert.equal(retratar(eliminada), retratar(conPalabra('prue')));
});

test('la última clave que queda no se mueve a la raíz', () => {
  const estructura = conPalabra('pr');
  aplicar(estructura, operar(estructura, eliminar, { clave: 'r' }));
  assert.equal(retratar(estructura), 'p:10·00·0');
});

test('vaciar el árbol lo deja sin claves', () => {
  const estructura = conPalabra('prueba');
  for (const letra of 'prueba'.split('')) {
    aplicar(estructura, operar(estructura, eliminar, { clave: letra }));
  }
  assert.equal(retratar(estructura), '');
  assert.equal(arbol.altura(estructura), 0);
});

test('el esqueleto va completo hasta el penúltimo nivel', () => {
  // Como el tablero: cada nodo abre sus ramas lleven a una clave o no, hasta
  // el nivel 3. Son 1 + 4 + 16 posiciones.
  const estructura = conPalabra('prueba');
  const dibujadas = arbol.posicionesDibujadas(estructura, null);
  for (const nivel of [1, 2, 3]) {
    const enNivel = [...dibujadas].filter((i) => arbol.nivelDe(i) === nivel).length;
    assert.equal(enNivel, Math.pow(4, nivel - 1), `el nivel ${nivel} se dibuja completo`);
  }
});

test('del último nivel se dibujan solo las posiciones con clave', () => {
  // Completo serían 32 puntos más para no decir nada. El docente pone los
  // enlaces del último bloque donde hay algo al final.
  const estructura = conPalabra('prueba');
  const dibujadas = arbol.posicionesDibujadas(estructura, null);
  const ultimas = [...dibujadas].filter((i) => arbol.nivelDe(i) === arbol.NIVELES);

  assert.equal(ultimas.length, 6);
  for (const indice of ultimas) {
    assert.ok(arbol.ocupada(estructura, indice), `la posición ${indice} se dibuja vacía`);
  }
  assert.equal(dibujadas.size, 27);
});

test('ninguna clave tiene ramas por debajo', () => {
  // Una clave está al final de su código: ya no queda bloque que leer.
  const estructura = conPalabra('bc');
  for (const nodo of arbol.nodos(estructura)) {
    assert.equal(arbol.hijos(nodo.indice).length, 0, `la clave ${nodo.clave} abre ramas`);
  }
});

test('el árbol vacío no dibuja nada', () => {
  // Como en los otros dos temas de árbol: un esqueleto sin claves que lo
  // justifiquen se lee como un dibujo suelto (pedido del usuario, 2026-08-30).
  const dibujadas = arbol.posicionesDibujadas(arbolVacio(), null);
  assert.equal(dibujadas.size, 0);
});

test('el esqueleto alcanza la posición que el paso señala', () => {
  // El paso que saca una clave apunta a una posición que en ese momento ya
  // quedó vacía, y aun así hay que dibujarla para que se vea el hueco.
  const estructura = conPalabra('bc');
  const pasos = operar(estructura, eliminar, { clave: 'c' });
  for (const paso of pasos) {
    if (!paso.casilla) continue;
    const dibujadas = arbol.posicionesDibujadas(estructura, paso);
    assert.ok(dibujadas.has(paso.casilla), `el paso señala la posición ${paso.casilla} y no se dibuja`);
    for (let i = paso.casilla; i > arbol.RAIZ; i = arbol.padre(i)) {
      assert.ok(dibujadas.has(arbol.padre(i)), `la posición ${i} se dibuja sin su padre`);
    }
  }
});

test('ninguna posición se sale del árbol', () => {
  const estructura = conPalabra('prueba');
  for (const nodo of arbol.nodos(estructura)) {
    assert.ok(
      nodo.indice >= arbol.RAIZ && nodo.indice <= estructura.n,
      `posición ${nodo.indice} fuera de 1..${estructura.n}`
    );
  }
});

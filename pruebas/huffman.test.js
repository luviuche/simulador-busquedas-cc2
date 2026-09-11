const test = require('node:test');
const assert = require('node:assert/strict');
const CC2 = require('./apoyo.js');

const huffman = CC2.dominio.huffman;

const letras = (palabra) => [...palabra.toLowerCase()];
const CIENCIAS = letras('ciencias');

// El ejemplo del docente, traído por el usuario (2026-09-11). Es el caso de
// referencia de todo el tema: si algo cambia aquí, cambió la regla.
test('CIENCIAS: las letras entran por frecuencia ascendente y, a igual frecuencia, por orden de lectura', () => {
  const inicial = huffman.ordenInicial(CIENCIAS);
  assert.deepEqual(
    inicial.map((n) => `${n.letra}=${n.peso}`),
    ['e=1', 'n=1', 'a=1', 's=1', 'c=2', 'i=2']
  );
});

test('CIENCIAS: las reducciones son las del tablero, y la última pesa el total', () => {
  const { reducciones, total } = huffman.construir(CIENCIAS);
  const parejas = reducciones.map((r) => [
    r.izquierda.letra || '·', r.derecha.letra || '·', r.nodo.peso
  ]);
  assert.deepEqual(parejas, [
    ['e', 'n', 2],
    ['a', 's', 2],
    // El paso que revela la regla fina: con cuatro nodos de peso 2 se unen las
    // dos letras, no los dos nodos recién creados, porque las letras llevaban
    // más tiempo en la lista.
    ['c', 'i', 4],
    ['·', '·', 4],
    ['·', '·', 8]
  ]);
  assert.equal(reducciones[reducciones.length - 1].nodo.peso, total);
});

test('CIENCIAS: los códigos son los del árbol esperado', () => {
  const arbol = huffman.construir(CIENCIAS);
  const codigos = huffman.codigosDe(arbol.raiz);
  assert.deepEqual(Object.fromEntries(codigos), {
    c: '00', i: '01', e: '100', n: '101', a: '110', s: '111'
  });
});

test('CIENCIAS: la tabla de codificación suma 20/8 = 2,5 bits por letra', () => {
  const arbol = huffman.construir(CIENCIAS);
  const tabla = huffman.tablaDeCodificacion(arbol);

  // El orden es el inverso al de entrada: como el docente escribe la lista de
  // frecuencias en el tablero.
  assert.deepEqual(
    tabla.filas.map((f) => [f.letra, f.codigo, f.longitud, f.veces, f.producto]),
    [
      ['i', '01', 2, 2, 4],
      ['c', '00', 2, 2, 4],
      ['s', '111', 3, 1, 3],
      ['a', '110', 3, 1, 3],
      ['n', '101', 3, 1, 3],
      ['e', '100', 3, 1, 3]
    ]
  );
  assert.equal(tabla.suma, 20);
  assert.equal(tabla.total, 8);
  assert.equal(tabla.suma / tabla.total, 2.5);
});

// Lo que el ejemplo del docente no alcanza a decidir, porque en CIENCIAS todos
// los empates salen a favor de las letras: un nodo nuevo **se mete en su sitio
// por peso**, y no al final de la lista. Con pesos 1,1,1,5 las dos formas dan
// árboles distintos, y solo una es Huffman.
test('el nodo nuevo vuelve a la lista por peso y no al final', () => {
  // aparecen: b(1), c(1), d(1), a(5) → 'abbbbbcd' no sirve porque a va primera;
  // se usa una palabra donde las tres de peso 1 se lean antes que la de peso 5.
  const palabra = letras('bcdaaaaa');
  const { reducciones } = huffman.construir(palabra);
  const parejas = reducciones.map((r) => [
    r.izquierda.letra || '·', r.derecha.letra || '·', r.nodo.peso
  ]);
  assert.deepEqual(parejas, [
    ['b', 'c', 2],
    // Si el nodo se hubiera ido al final, aquí se uniría d(1) con a(5).
    ['d', '·', 3],
    ['·', 'a', 8]
  ]);
});

test('las tildes cuentan como la letra base y la palabra se lee en minúsculas', () => {
  const conTilde = huffman.ordenInicial(letras('ÁrbolÁ'));
  const sinTilde = huffman.ordenInicial(letras('arbola'));
  assert.deepEqual(
    conTilde.map((n) => `${n.letra}=${n.peso}`),
    sinTilde.map((n) => `${n.letra}=${n.peso}`)
  );
});

test('toda hoja recibe un código, y ninguno es prefijo de otro', () => {
  for (const palabra of ['ciencias', 'computacion', 'murcielago', 'aabbbcccc']) {
    const arbol = huffman.construir(letras(palabra));
    const codigos = [...huffman.codigosDe(arbol.raiz).values()];
    const distintas = new Set(letras(palabra)).size;
    assert.equal(codigos.length, distintas, palabra);
    for (const a of codigos) {
      for (const b of codigos) {
        if (a !== b) assert.ok(!b.startsWith(a), `${palabra}: ${a} es prefijo de ${b}`);
      }
    }
  }
});

// La suma de Pi × Li es la longitud media del código, así que tiene que caer
// entre la del código más corto y la del más largo, y mejorar —o igualar— a un
// código de longitud fija para esas mismas letras.
test('la longitud media queda por debajo de la del código de longitud fija', () => {
  for (const palabra of ['ciencias', 'computacion', 'murcielago']) {
    const arbol = huffman.construir(letras(palabra));
    const tabla = huffman.tablaDeCodificacion(arbol);
    const media = tabla.suma / tabla.total;
    const distintas = new Set(letras(palabra)).size;
    const fija = Math.ceil(Math.log2(distintas));
    assert.ok(media <= fija, `${palabra}: media ${media} contra fija ${fija}`);
  }
});

test('una palabra de una sola letra distinta se rechaza en vez de inventar un código', () => {
  const validacion = huffman.validarPalabra('aaa');
  assert.equal(validacion.valido, false);
  assert.match(validacion.mensaje, /dos letras distintas/);
});

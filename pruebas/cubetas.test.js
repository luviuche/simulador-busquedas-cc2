const test = require('node:test');
const assert = require('node:assert/strict');
const CC2 = require('./apoyo.js');

const cubetasAlg = CC2.algoritmos.cubetas;
const cubetasDom = CC2.dominio.cubetas;
const estructuras = CC2.dominio.estructura;

// Los mismos aplicadores que usa la pantalla (tema-busqueda.js): la traza no
// toca nada, y quien la reproduce aplica el `efecto` de cada paso.
const APLICADORES = {
  'colocar-cubeta': (estructura, efecto) => {
    if (efecto.posicion === undefined) estructuras.colocarEn(estructura, efecto.casilla, efecto.clave);
    else estructuras.colocarEnAnidado(estructura, efecto.casilla, efecto.posicion, efecto.clave);
    estructura.ordenLlegada = estructura.ordenLlegada || [];
    estructura.ordenLlegada.push(efecto.clave);
  },
  'retirar-cubeta': (estructura, efecto) => {
    if (efecto.posicion === undefined) estructuras.retirarDe(estructura, efecto.casilla);
    else estructuras.retirarDeAnidado(estructura, efecto.casilla, efecto.posicion);
    const indice = (estructura.ordenLlegada || []).indexOf(efecto.clave);
    if (indice !== -1) estructura.ordenLlegada.splice(indice, 1);
  },
  'compactar-anidado': (estructura, efecto) => estructuras.compactarAnidado(estructura, efecto.casilla),
  redimensionar: (estructura, efecto) => {
    estructura.n = efecto.n;
    estructura.claves = new Array(efecto.n);
    estructura.anidados = new Array(efecto.n);
    estructura.ordenLlegada = [];
  }
};

function aplicar(estructura, pasos) {
  for (const paso of pasos) {
    if (paso.efecto) APLICADORES[paso.efecto.tipo](estructura, paso.efecto);
  }
  return estructura;
}

// Sin `l`: las claves de este tema no tienen una longitud fija (CLAUDE.md 5.7).
function crear({ n, r, modoExpansion, umbralExpandir = 0.82, umbralReducir = 1.25 }) {
  const { estructura } = estructuras.crearEstructura({
    n, l: undefined, tipoClave: 'numerica', modo: estructuras.MODOS.DISPERSA
  });
  estructura.parametros = { r, modoExpansion, umbralExpandir, umbralReducir, n0: n };
  return estructura;
}

function insertarTodas(estructura, claves) {
  for (const clave of claves) aplicar(estructura, cubetasAlg.insertar({ estructura, clave }));
}

function eliminarTodas(estructura, claves) {
  for (const clave of claves) aplicar(estructura, cubetasAlg.eliminar({ estructura, clave }));
}

// Retrata la tabla como "cubeta:renglones", para comparar contra el taller
// sin depender de cómo esté implementado el arreglo por dentro.
function retrato(estructura) {
  const filas = [];
  for (let i = 1; i <= estructura.n; i++) {
    const renglones = [estructura.claves[i - 1]]
      .concat(estructura.anidados[i - 1] || [])
      .filter((valor) => valor !== undefined);
    if (renglones.length > 0) filas.push(`${i}:${renglones.join(',')}`);
  }
  return filas.join(' ');
}

// El ejercicio del taller resuelto (docs/Taller Solucion 02-09-26.docx.pdf):
// n0 = 2, r = 3, expandir al 82 %, reducir al 125 %, H(k) = k mod n. La
// última clave de la lista original es 38, no un 28 repetido —se confirma
// contando las 17 direcciones que el propio taller calcula—.
const CLAVES = [115, 96, 48, 79, 35, 26, 57, 81, 70, 64, 107, 45, 62, 98, 33, 28, 38];
const CLAVES_A_ELIMINAR = [48, 35, 81, 70, 45, 33, 38, 115];
const RETRATO_FINAL_17 = '1:96,48,64 2:57,81,33 3:26,98 4:115,35,107 5:28 6:45 7:70,62,38 8:79';

test('expansión total duplica n en cada paso', () => {
  assert.equal(cubetasDom.siguienteN(2, 2, 'total'), 4);
  assert.equal(cubetasDom.siguienteN(4, 2, 'total'), 8);
});

test('expansión parcial intercala dos series que se doblan cada una por su cuenta', () => {
  const secuencia = [2];
  for (let i = 0; i < 4; i++) {
    secuencia.push(cubetasDom.siguienteN(secuencia[secuencia.length - 1], 2, 'parcial'));
  }
  assert.deepEqual(secuencia, [2, 3, 4, 6, 8]);
});

test('reducir retrocede exactamente lo que expandir avanzó, sin guardar historial', () => {
  assert.equal(cubetasDom.anteriorN(8, 2, 'total'), 4);
  assert.equal(cubetasDom.anteriorN(4, 2, 'total'), 2);
  assert.equal(cubetasDom.anteriorN(2, 2, 'total'), null);

  assert.equal(cubetasDom.anteriorN(8, 2, 'parcial'), 6);
  assert.equal(cubetasDom.anteriorN(6, 2, 'parcial'), 4);
  assert.equal(cubetasDom.anteriorN(4, 2, 'parcial'), 3);
  assert.equal(cubetasDom.anteriorN(3, 2, 'parcial'), 2);
  assert.equal(cubetasDom.anteriorN(2, 2, 'parcial'), null);
});

test('la traza no toca la estructura hasta que se aplica', () => {
  const estructura = crear({ n: 2, r: 3, modoExpansion: 'total' });
  cubetasAlg.insertar({ estructura, clave: 115 });
  assert.equal(estructuras.cantidadClaves(estructura), 0);
  assert.equal(estructura.ordenLlegada, undefined);
});

test('expansión total: n pasa por 2, 4 y 8 en los puntos exactos del taller', () => {
  const estructura = crear({ n: 2, r: 3, modoExpansion: 'total' });
  for (let i = 0; i < CLAVES.length; i++) {
    aplicar(estructura, cubetasAlg.insertar({ estructura, clave: CLAVES[i] }));
    if (i === 4) assert.equal(estructura.n, 4, 'tras la 5ª clave, densidad 5/6 ≥ 82 %');
    if (i === 9) assert.equal(estructura.n, 8, 'tras la 10ª clave, densidad 10/12 ≥ 82 %');
  }
  assert.equal(estructura.n, 8);
  assert.equal(estructuras.cantidadClaves(estructura), 17);
  assert.equal(retrato(estructura), RETRATO_FINAL_17);
});

test('expansión parcial: n recorre 2, 3, 4, 6 y 8 igual que en el taller', () => {
  const estructura = crear({ n: 2, r: 3, modoExpansion: 'parcial' });
  for (let i = 0; i < CLAVES.length; i++) {
    aplicar(estructura, cubetasAlg.insertar({ estructura, clave: CLAVES[i] }));
    if (i === 4) assert.equal(estructura.n, 3, 'tras la 5ª clave: 2 + 1');
    if (i === 7) assert.equal(estructura.n, 4, 'la 8ª clave (81) choca: la cubeta llena expande aunque la densidad ya avisaba');
    if (i === 9) assert.equal(estructura.n, 6, 'tras la 10ª clave: dobla la 2ª estructura (3 → 6)');
    if (i === 14) assert.equal(estructura.n, 8, 'la 15ª clave (33) choca: dobla la 3ª estructura (4 → 8)');
  }
  // Confirma exactamente lo que sorprende del taller: total y parcial llegan
  // al mismo n = 8 con las mismas 17 claves, aunque el camino fue distinto.
  assert.equal(estructura.n, 8);
  assert.equal(retrato(estructura), RETRATO_FINAL_17);
});

test('una cubeta llena dispara la expansión aunque la densidad no la pida', () => {
  const estructura = crear({ n: 2, r: 3, modoExpansion: 'parcial', umbralExpandir: 0.99 });
  for (const clave of CLAVES.slice(0, 8)) aplicar(estructura, cubetasAlg.insertar({ estructura, clave }));
  // Con un umbral casi imposible de alcanzar, lo único que puede haber
  // disparado la expansión hasta n = 4 es la colisión de la 8ª clave (81).
  assert.equal(estructura.n, 4);
});

test('reducción total: n vuelve a la mitad y compacta cada cubeta', () => {
  const estructura = crear({ n: 2, r: 3, modoExpansion: 'total' });
  insertarTodas(estructura, CLAVES);
  eliminarTodas(estructura, CLAVES_A_ELIMINAR);

  assert.equal(estructura.n, 4);
  assert.equal(estructuras.cantidadClaves(estructura), 9);
  assert.equal(retrato(estructura), '1:96,64,28 2:57 3:26,62,98 4:79,107');
});

test('reducción parcial: retrocede en la misma serie intercalada por la que expandió', () => {
  const estructura = crear({ n: 2, r: 3, modoExpansion: 'parcial' });
  insertarTodas(estructura, CLAVES);
  eliminarTodas(estructura, CLAVES_A_ELIMINAR);

  assert.equal(estructura.n, 6);
  assert.equal(estructuras.cantidadClaves(estructura), 9);
  assert.equal(retrato(estructura), '1:96 2:79 3:26,62,98 4:57 5:64,28 6:107');
});

test('buscar recorre la cubeta secuencialmente tras calcular la dirección', () => {
  const estructura = crear({ n: 8, r: 3, modoExpansion: 'total' });
  insertarTodas(estructura, CLAVES);

  const encontrada = cubetasAlg.buscar({ estructura, objetivo: 38 });
  assert.equal(encontrada[encontrada.length - 1].tipo, 'encontrada');

  const ausente = cubetasAlg.buscar({ estructura, objetivo: 999 });
  assert.equal(ausente[ausente.length - 1].tipo, 'no-encontrada');
});

// La clave que chocó espera en la fila «Col» y cuenta para la densidad: en ese
// instante el taller escribe D.O. = 8/9 = 88,89 %, no 7/9 (CLAUDE.md 5.7).
test('la clave rechazada viaja en el paso y cuenta para la densidad', () => {
  const estructura = crear({ n: 2, r: 3, modoExpansion: 'parcial' });
  insertarTodas(estructura, [115, 96, 48, 79, 35, 26, 57]);
  assert.equal(estructura.n, 3);
  assert.equal(cubetasDom.densidadExpandir(estructura).toFixed(4), (7 / 9).toFixed(4));

  const pasos = cubetasAlg.insertar({ estructura, clave: 81 });
  const choque = pasos.find((paso) => paso.tipo === 'colision');
  assert.deepEqual(choque.rechazada, { clave: 81, casilla: 1 });
  assert.equal(
    (cubetasDom.densidadExpandir(estructura, 1) * 100).toFixed(2),
    '88.89'
  );
});

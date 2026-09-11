(function () {
  // Árbol binario implícito (CLAUDE.md 5.5). El árbol no se guarda con nodos y
  // punteros sino en el mismo arreglo `claves` de la estructura, indexado por
  // posición: la raíz es la 1, y los hijos de `i` son `2i` (izquierda) y
  // `2i + 1` (derecha).
  //
  // No es un atajo de implementación: en un árbol digital **la posición es el
  // camino de bits que llevó hasta ella**, así que el índice ya dice lo que el
  // tema enseña. La posición 5 (101 en binario, sin el bit de la raíz) es
  // «izquierda, derecha» y solo puede alojar claves cuyo bit 1 sea 0 y cuyo
  // bit 2 sea 1. Además, la vista y las métricas siguen leyendo `claves` como
  // en los demás temas, sin un camino aparte.
  const RAIZ = 1;

  const izquierdo = (indice) => indice * 2;
  const derecho = (indice) => indice * 2 + 1;
  const padre = (indice) => Math.floor(indice / 2);

  // Nivel 1 es la raíz, que es donde se compara el bit 1: nivel y número de
  // bit coinciden, y por eso la traza puede nombrar uno u otro sin traducir.
  const nivelDe = (indice) => Math.floor(Math.log2(indice)) + 1;

  // Cuántas posiciones caben con `bits` bits de código. Es el `n` de la
  // estructura: la profundidad máxima del árbol es `bits` niveles, porque dos
  // claves distintas se separan a más tardar en el último bit, y dos claves
  // iguales no existen (invariante de unicidad, CLAUDE.md 3.2).
  const posiciones = (bits) => Math.pow(2, bits) - 1;

  const claveEn = (estructura, indice) => estructura.claves[indice - 1];
  const ocupada = (estructura, indice) => claveEn(estructura, indice) !== undefined;

  function colocarNodo(estructura, indice, clave) {
    if (indice < RAIZ || indice > estructura.n) {
      return { exito: false, mensaje: `Posición fuera del árbol: ${indice} no pertenece a 1..${estructura.n}.` };
    }
    if (ocupada(estructura, indice)) {
      return { exito: false, mensaje: `Posición ocupada: la posición ${indice} ya contiene la clave ${claveEn(estructura, indice)}.` };
    }
    estructura.claves[indice - 1] = clave;
    window.CC2.dominio.estructura.anotarLlegada(estructura, clave);
    return { exito: true, indice };
  }

  function retirarNodo(estructura, indice) {
    const clave = claveEn(estructura, indice);
    if (clave === undefined) {
      return { exito: false, mensaje: `Posición vacía: la posición ${indice} no contiene ninguna clave.` };
    }
    delete estructura.claves[indice - 1];
    window.CC2.dominio.estructura.olvidarLlegada(estructura, clave);
    return { exito: true, indice, clave };
  }

  function moverNodo(estructura, desde, hasta) {
    const clave = claveEn(estructura, desde);
    if (clave === undefined) {
      return { exito: false, mensaje: `Posición vacía: la posición ${desde} no contiene ninguna clave.` };
    }
    delete estructura.claves[desde - 1];
    estructura.claves[hasta - 1] = clave;
    return { exito: true, desde, hasta, clave };
  }

  // Las posiciones ocupadas, en orden de índice. La vista las necesita para
  // dibujar solo el árbol que existe y no las 31 posiciones posibles.
  function nodos(estructura) {
    const encontrados = [];
    for (let indice = RAIZ; indice <= estructura.n; indice++) {
      if (ocupada(estructura, indice)) encontrados.push({ indice, clave: claveEn(estructura, indice) });
    }
    return encontrados;
  }

  // Altura en niveles: 0 si está vacío, 1 si solo tiene raíz. Es la métrica del
  // tema —lo que cuesta la peor búsqueda— y se lee del índice más profundo.
  function altura(estructura) {
    return nodos(estructura).reduce((mayor, nodo) => Math.max(mayor, nivelDe(nodo.indice)), 0);
  }

  // Las posiciones del subárbol de `indice`, incluida la suya.
  function subarbol(estructura, indice) {
    if (indice > estructura.n || !ocupada(estructura, indice)) return [];
    return [indice]
      .concat(subarbol(estructura, izquierdo(indice)))
      .concat(subarbol(estructura, derecho(indice)));
  }

  // Las posiciones ocupadas que cuelgan de `indice`, la suya incluida. A
  // diferencia de `subarbol`, **atraviesa las posiciones vacías**: en un árbol
  // de residuos los nodos de en medio no guardan clave y son la mayoría del
  // árbol (CLAUDE.md 5.5), así que cortar en el primer hueco dejaría fuera
  // todo lo que cuelga de él.
  //
  // Sirve para dos preguntas que ese tema hace todo el tiempo: si una posición
  // vacía es una bifurcación —tiene claves debajo— o el final del camino, y si
  // una rama quedó colgando de una sola clave al eliminar.
  function clavesDelSubarbol(estructura, indice) {
    if (indice > estructura.n) return [];
    const propias = ocupada(estructura, indice) ? [indice] : [];
    return propias
      .concat(clavesDelSubarbol(estructura, izquierdo(indice)))
      .concat(clavesDelSubarbol(estructura, derecho(indice)));
  }

  // ── Forma del árbol ─────────────────────────────────────────────────────
  //
  // Lo que la vista necesita para dibujarlo, y lo único que cambia entre un
  // árbol binario y uno de residuos múltiples (`dominio/arbol-multiple.js`):
  // cuántas ramas abre un nodo, con qué se rotulan y qué posiciones se pintan.
  // La pantalla habla con esta interfaz y no con las funciones de aquí, así
  // que un árbol con otra forma no la obliga a cambiar.
  const hijos = (indice) => [izquierdo(indice), derecho(indice)];
  const rotuloDeArista = (indice) => (indice % 2 === 0 ? '0' : '1');

  // Qué posiciones se dibujan: las ocupadas, sus ancestros —para que un hueco
  // a medio eliminar se vea como lo que es, y no deje huérfanos flotando— y la
  // posición vacía que el paso esté señalando. Aquí no se dibuja el esqueleto
  // completo: en un árbol digital la posición 31 existe siempre y pintarla
  // vacía no diría nada.
  function posicionesDibujadas(estructura, paso) {
    const dibujadas = new Set(nodos(estructura).map((nodo) => nodo.indice));
    if (paso && paso.casilla) dibujadas.add(paso.casilla);
    for (const indice of [...dibujadas]) {
      let ancestro = padre(indice);
      while (ancestro >= RAIZ && !dibujadas.has(ancestro)) {
        dibujadas.add(ancestro);
        ancestro = padre(ancestro);
      }
    }
    return dibujadas;
  }

  const esHoja = (estructura, indice) => (
    !ocupada(estructura, izquierdo(indice)) && !ocupada(estructura, derecho(indice))
  );

  // La hoja más profunda del subárbol de `indice`; entre varias del mismo
  // nivel, la de más a la izquierda. Es la que sube a ocupar el sitio de una
  // clave eliminada (CLAUDE.md 5.5), y sirve **cualquier** hoja del subárbol:
  // como llegó hasta ahí bajando por la posición que se libera, sus primeros
  // bits son justo los que esa posición exige, y el árbol sigue siendo
  // recorrible. Se elige la más profunda porque es la que menos altura deja.
  function hojaMasProfunda(estructura, indice) {
    const hojas = subarbol(estructura, indice).filter((posicion) => esHoja(estructura, posicion));
    if (hojas.length === 0) return 0;
    return hojas.reduce((mejor, posicion) => {
      if (nivelDe(posicion) > nivelDe(mejor)) return posicion;
      // Mismo nivel: gana el índice menor, que es el de más a la izquierda.
      return nivelDe(posicion) === nivelDe(mejor) && posicion < mejor ? posicion : mejor;
    }, hojas[0]);
  }

  window.CC2 = window.CC2 || {};
  window.CC2.dominio = window.CC2.dominio || {};
  window.CC2.dominio.arbol = {
    RAIZ,
    izquierdo,
    derecho,
    hijos,
    rotuloDeArista,
    posicionesDibujadas,
    padre,
    nivelDe,
    posiciones,
    claveEn,
    ocupada,
    colocarNodo,
    retirarNodo,
    moverNodo,
    nodos,
    altura,
    subarbol,
    clavesDelSubarbol,
    esHoja,
    hojaMasProfunda
  };
})();

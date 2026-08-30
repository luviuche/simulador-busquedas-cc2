(function () {
  const arbol = window.CC2.dominio.arbol;

  // Árbol de residuos múltiples (CLAUDE.md 5.5). Se baja un **bloque de bits**
  // por nivel en vez de un bit, así que cada nodo abre `2^bits` ramas.
  //
  // El código de la letra tiene 5 bits y el docente los parte en 2, 2 y 1: el
  // último bloque va corto porque 5 no se divide entre 2. De ahí que los dos
  // primeros niveles ramifiquen en cuatro —00, 01, 10, 11— y el tercero solo
  // en dos —0, 1—, que es lo que se ve en el tablero.
  const BLOQUES = [2, 2, 1];

  // La indexación es de grado fijo —el mayor de los bloques— aunque el último
  // nivel use solo dos de sus cuatro huecos. Con un grado distinto por nivel el
  // índice dejaría de ser una cuenta y haría falta una tabla de desplazamientos
  // para ir de padre a hijo; sobran unos huecos que nadie dibuja a cambio de
  // que la posición se siga calculando.
  const GRADO = Math.pow(2, Math.max.apply(null, BLOQUES));
  const NIVELES = BLOQUES.length + 1;
  const RAIZ = arbol.RAIZ;

  const bitsDe = (nivel) => (nivel >= 1 && nivel <= BLOQUES.length ? BLOQUES[nivel - 1] : 0);
  const ramasDe = (nivel) => (bitsDe(nivel) === 0 ? 0 : Math.pow(2, bitsDe(nivel)));

  // El nivel se cuenta hacia abajo sumando el tamaño de cada uno: `log` daría
  // lo mismo, pero con potencias grandes empieza a redondear mal justo en los
  // bordes, que es donde importa.
  function nivelDe(indice) {
    let nivel = 1;
    let inicio = 1;
    let tamano = 1;
    while (indice >= inicio + tamano) {
      inicio += tamano;
      tamano *= GRADO;
      nivel++;
    }
    return nivel;
  }

  const padre = (indice) => Math.floor((indice - 2) / GRADO) + 1;
  const hijo = (indice, rama) => GRADO * (indice - 1) + 2 + rama;

  // Los huecos que abre un nodo: cuatro en los dos primeros niveles, dos en el
  // tercero y ninguno en el cuarto, que es donde el código se acaba.
  function hijos(indice) {
    const total = ramasDe(nivelDe(indice));
    const salida = [];
    for (let rama = 0; rama < total; rama++) salida.push(hijo(indice, rama));
    return salida;
  }

  const posiciones = () => (Math.pow(GRADO, NIVELES) - 1) / (GRADO - 1);

  // Con qué bloque se llegó hasta esta posición, escrito con los bits de ese
  // bloque: `01` en los dos primeros niveles, `0` o `1` en el último.
  function rotuloDeArista(indice) {
    const rama = (indice - 2) % GRADO;
    return rama.toString(2).padStart(bitsDe(nivelDe(indice) - 1), '0');
  }

  // El camino de bloques que lleva hasta una posición. Es como se la nombra:
  // el padre casi siempre es una bifurcación sin clave, así que el parentesco
  // no sirve para señalarla.
  function caminoDe(indice) {
    const bloques = [];
    for (let i = indice; i > RAIZ; i = padre(i)) bloques.unshift(rotuloDeArista(i));
    return bloques.join('·');
  }

  // Las claves que cuelgan de `indice`, la suya incluida, atravesando las
  // posiciones vacías: los nodos de en medio no guardan nada y cortar en el
  // primer hueco dejaría fuera el árbol entero.
  function clavesDelSubarbol(estructura, indice) {
    if (indice > estructura.n) return [];
    const propias = arbol.ocupada(estructura, indice) ? [indice] : [];
    return hijos(indice).reduce(
      (encontradas, h) => encontradas.concat(clavesDelSubarbol(estructura, h)),
      propias
    );
  }

  function altura(estructura) {
    return arbol.nodos(estructura).reduce((mayor, nodo) => Math.max(mayor, nivelDe(nodo.indice)), 0);
  }

  // **El esqueleto se dibuja completo hasta el penúltimo nivel**, como en el
  // tablero (decisión del usuario sobre maqueta, 2026-08-30): cada nodo abre
  // todas sus ramas, lleven a una clave o no. Se ve de un golpe cuánto espacio
  // de direcciones queda sin usar, que es parte de lo que el método cuesta.
  //
  // **Del último nivel se dibujan solo las posiciones con clave.** Es lo que
  // hace el docente: los enlaces del último bloque los pone donde hay algo al
  // final, no colgando de los dieciséis nodos del nivel de arriba. Y es lo que
  // hace que el dibujo quepa: completo serían 32 puntos más para no decir nada.
  function posicionesDibujadas(estructura, paso) {
    const claves = arbol.nodos(estructura);
    // Sin claves no se dibuja nada, como en los otros dos temas de árbol. Se
    // probó abrir el tema con la raíz y sus cuatro ramas ya pintadas, y al
    // usuario le pareció un dibujo suelto sin relación con nada (2026-08-30):
    // el esqueleto solo se entiende cuando hay claves que lo justifiquen.
    if (claves.length === 0) return new Set();

    const dibujadas = new Set();
    (function bajar(indice) {
      dibujadas.add(indice);
      if (nivelDe(indice) >= NIVELES - 1) return;
      for (const h of hijos(indice)) bajar(h);
    })(RAIZ);

    for (const nodo of claves) dibujadas.add(nodo.indice);

    // La posición que el paso señala puede no estar todavía en el esqueleto:
    // al eliminar, el paso que saca la clave apunta a una posición que en ese
    // momento ya quedó vacía.
    if (paso && paso.casilla) {
      for (let i = paso.casilla; i >= RAIZ && !dibujadas.has(i); i = padre(i)) dibujadas.add(i);
    }
    return dibujadas;
  }

  window.CC2 = window.CC2 || {};
  window.CC2.dominio = window.CC2.dominio || {};
  // Lo que no depende de la forma del árbol —guardar, sacar, mover y listar
  // claves sobre el mismo arreglo— se reutiliza tal cual de `arbol.js`; lo que
  // sí depende de ella se redefine aquí.
  window.CC2.dominio.arbolMultiple = {
    BLOQUES,
    GRADO,
    NIVELES,
    RAIZ,
    bitsDe,
    ramasDe,
    nivelDe,
    padre,
    hijo,
    hijos,
    posiciones,
    rotuloDeArista,
    caminoDe,
    clavesDelSubarbol,
    altura,
    posicionesDibujadas,
    claveEn: arbol.claveEn,
    ocupada: arbol.ocupada,
    colocarNodo: arbol.colocarNodo,
    retirarNodo: arbol.retirarNodo,
    moverNodo: arbol.moverNodo,
    nodos: arbol.nodos
  };
})();

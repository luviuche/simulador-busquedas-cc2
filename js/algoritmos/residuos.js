(function () {
  const { TIPOS_PASO, crearPaso } = window.CC2.algoritmos.traza;
  const arbol = window.CC2.dominio.arbol;
  const { codigoDeLetra, posicionEnAlfabeto } = window.CC2.dominio.clave;

  // Búsqueda por residuos (CLAUDE.md 5.5). Se baja por el árbol un bit por
  // nivel, igual que en el árbol digital: en el nivel d se mira el bit d del
  // código de la letra, 0 a la izquierda y 1 a la derecha.
  //
  // Lo que lo separa del árbol digital es **dónde viven las claves: solo en
  // las hojas**. Los nodos de en medio no guardan nada y nunca podrán: son
  // bifurcaciones, no casillas. De ahí sale todo lo demás:
  //
  //   - Buscar hace **una sola comparación de clave**, la de la hoja a la que
  //     se llega. Bajar cuesta accesos, no comparaciones, y esa es la lección.
  //   - Insertar sobre una hoja ocupada no es un error sino el caso normal:
  //     las dos claves bajan hasta el primer bit en que sus códigos difieren,
  //     y la hoja que había se vuelve bifurcación.
  //   - Al eliminar, si una rama queda colgando de una sola clave, esa clave
  //     sube (ver `eliminar`).
  //
  // Como en los demás temas, nada de esto toca la estructura: se produce la
  // traza y la pantalla la reproduce (CLAUDE.md 4).

  // La posición se nombra por el camino de bits que lleva hasta ella, y no por
  // su parentesco como en el árbol digital: aquí el padre casi siempre es una
  // bifurcación sin clave, y «hijo izquierdo de b» no tendría de qué colgar.
  // El camino sale del propio índice —su binario sin el bit de la raíz—, que
  // es justo la razón de guardar el árbol indexado así.
  const caminoDe = (indice) => indice.toString(2).slice(1);
  const posicionCon = (indice) => (
    indice === arbol.RAIZ ? 'la raíz' : `la posición ${caminoDe(indice)}`
  );
  const posicionDe = (indice) => (
    indice === arbol.RAIZ ? 'de la raíz' : `de la posición ${caminoDe(indice)}`
  );

  const bajarA = (indice, bit) => (bit === '0' ? arbol.izquierdo(indice) : arbol.derecho(indice));
  const ladoDe = (bit) => (bit === '0' ? 'izquierda' : 'derecha');

  function lineasIniciales(clave, bits) {
    return [
      { etiqueta: 'Clave', expresion: '', resultado: String(clave) },
      {
        etiqueta: 'Código',
        expresion: `posición ${posicionEnAlfabeto(clave)} del alfabeto`,
        resultado: codigoDeLetra(clave, bits)
      }
    ];
  }

  function pasoDelCodigo(clave, codigo, calculo, contadores) {
    return crearPaso(TIPOS_PASO.CALCULO, {
      calculo: calculo.slice(),
      codigo,
      comparaciones: contadores.comparaciones,
      accesos: contadores.accesos,
      mensaje: `Código de la clave ${clave}: ${codigo}.`
    });
  }

  // Recorrido común a insertar, buscar y eliminar: baja desde la raíz mirando
  // un bit por nivel y se detiene en la primera posición que **no** es una
  // bifurcación, o sea la que guarda una clave —siempre una hoja— o la que
  // está vacía y no tiene nada colgando. Esa segunda es la que prueba que la
  // clave no está: si existiera, sus bits la habrían dejado justo ahí.
  function descender({ estructura, bits, clave, contadores, calculo, pasos }) {
    const codigo = codigoDeLetra(clave, bits);
    let indice = arbol.RAIZ;

    for (let nivel = 1; nivel <= bits + 1; nivel++) {
      contadores.accesos++;
      const ocupante = arbol.claveEn(estructura, indice);
      if (ocupante !== undefined) return { indice, nivel, ocupante, codigo };
      if (arbol.clavesDelSubarbol(estructura, indice).length === 0) {
        return { indice, nivel, ocupante: undefined, codigo };
      }

      const bit = codigo[nivel - 1];
      calculo.push({
        etiqueta: `Nivel ${nivel}`,
        expresion: `bit ${nivel} = ${bit}`,
        resultado: ladoDe(bit)
      });
      pasos.push(crearPaso(TIPOS_PASO.RAMIFICACION, {
        calculo: calculo.slice(),
        casilla: indice,
        codigo,
        nivel,
        comparaciones: contadores.comparaciones,
        accesos: contadores.accesos,
        mensaje: `Nivel ${nivel}: ${posicionCon(indice)} solo bifurca, no guarda clave; el bit ${nivel} de ${codigo} es ${bit}, se baja a la ${ladoDe(bit)}.`
      }));
      indice = bajarA(indice, bit);
    }

    // Inalcanzable: para seguir bajando en el último nivel haría falta una
    // clave más honda, y con `bits` bits no la hay. Se deja explícito para que
    // un cambio de codificación falle aquí y no en silencio.
    return { indice, nivel: bits + 1, ocupante: arbol.claveEn(estructura, indice), codigo };
  }

  function buscar({ claves, n, bits, objetivo }) {
    const estructura = { claves, n };
    const contadores = { comparaciones: 0, accesos: 0 };
    const codigo = codigoDeLetra(objetivo, bits);
    const calculo = lineasIniciales(objetivo, bits);
    const pasos = [pasoDelCodigo(objetivo, codigo, calculo, contadores)];

    const final = descender({ estructura, bits, clave: objetivo, contadores, calculo, pasos });
    const comun = { codigo, casilla: final.indice, nivel: final.nivel, accesos: contadores.accesos };

    if (final.ocupante === undefined) {
      calculo.push({ etiqueta: 'Camino cortado', expresion: caminoDe(final.indice) || 'raíz', resultado: 'no está' });
      pasos.push(crearPaso(TIPOS_PASO.NO_ENCONTRADA, Object.assign({}, comun, {
        calculo: calculo.slice(),
        comparaciones: contadores.comparaciones,
        mensaje: final.indice === arbol.RAIZ
          ? 'Clave no localizada en la estructura: el árbol está vacío.'
          : `Clave no localizada en la estructura: ${posicionCon(final.indice)} no existe, y ahí es donde ${objetivo} tendría que estar.`
      })));
      return pasos;
    }

    // La única comparación de clave de toda la búsqueda. Por hondo que se haya
    // bajado, comparar se compara aquí y una sola vez: es lo que el tema
    // enseña, y lo que la métrica tiene que dejar ver.
    contadores.comparaciones++;

    if (final.ocupante === objetivo) {
      calculo.push({ etiqueta: 'Hoja', expresion: `${objetivo} = ${final.ocupante}`, resultado: 'encontrada' });
      pasos.push(crearPaso(TIPOS_PASO.ENCONTRADA, Object.assign({}, comun, {
        calculo: calculo.slice(),
        comparaciones: contadores.comparaciones,
        mensaje: `Clave localizada en ${posicionCon(final.indice)}, nivel ${final.nivel}, tras bajar ${final.nivel - 1} bit(s) y una sola comparación.`
      })));
      return pasos;
    }

    calculo.push({ etiqueta: 'Hoja', expresion: `${objetivo} ≠ ${final.ocupante}`, resultado: 'no está' });
    pasos.push(crearPaso(TIPOS_PASO.NO_ENCONTRADA, Object.assign({}, comun, {
      calculo: calculo.slice(),
      comparaciones: contadores.comparaciones,
      mensaje: `Clave no localizada en la estructura: ${posicionCon(final.indice)} guarda ${final.ocupante}, y si ${objetivo} estuviera en el árbol sería esta misma hoja.`
    })));
    return pasos;
  }

  function insertar({ claves, n, bits, clave }) {
    const estructura = { claves, n };
    const contadores = { comparaciones: 0, accesos: 0 };
    const codigo = codigoDeLetra(clave, bits);
    const calculo = lineasIniciales(clave, bits);
    const pasos = [pasoDelCodigo(clave, codigo, calculo, contadores)];

    const final = descender({ estructura, bits, clave, contadores, calculo, pasos });

    // Camino libre: la clave se queda donde el descenso se detuvo, y es hoja
    // desde el primer momento. Con el árbol vacío, esa posición es la raíz.
    if (final.ocupante === undefined) {
      calculo.push({ etiqueta: 'Inserción', expresion: caminoDe(final.indice) || 'raíz', resultado: `nivel ${final.nivel}` });
      pasos.push(crearPaso(TIPOS_PASO.INSERCION, {
        calculo: calculo.slice(),
        casilla: final.indice,
        codigo,
        nivel: final.nivel,
        clave,
        efecto: { tipo: 'colocar-nodo', nodo: final.indice, clave },
        comparaciones: contadores.comparaciones,
        accesos: contadores.accesos,
        mensaje: final.indice === arbol.RAIZ
          ? `Clave insertada: ${clave} en la raíz, única hoja del árbol.`
          : `Clave insertada: ${clave} como hoja en ${posicionCon(final.indice)}, nivel ${final.nivel}.`
      }));
      return pasos;
    }

    contadores.comparaciones++;
    if (final.ocupante === clave) {
      pasos.push(crearPaso(TIPOS_PASO.RECHAZADA, {
        calculo: calculo.concat({ etiqueta: 'Duplicada', expresion: `${clave} ya está en el árbol`, resultado: 'no se inserta' }),
        casilla: final.indice,
        codigo,
        nivel: final.nivel,
        comparaciones: contadores.comparaciones,
        accesos: contadores.accesos,
        mensaje: `Clave duplicada: ${clave} ya reside en ${posicionCon(final.indice)}.`
      }));
      return pasos;
    }

    // Choque de dos claves en la misma hoja. No es un error: en residuos
    // ninguna de las dos puede quedarse ahí, porque las claves solo viven en
    // las hojas y esta posición acaba de volverse bifurcación. Las dos bajan
    // juntas mientras sus códigos coincidan bit a bit, y se separan en el
    // primero en que difieren.
    const ocupante = final.ocupante;
    const codigoOcupante = codigoDeLetra(ocupante, bits);
    calculo.push({
      etiqueta: 'Choque',
      expresion: `${caminoDe(final.indice) || 'raíz'} ya la ocupa ${ocupante}`,
      resultado: 'las dos bajan'
    });
    pasos.push(crearPaso(TIPOS_PASO.COLISION, {
      calculo: calculo.slice(),
      casilla: final.indice,
      codigo,
      nivel: final.nivel,
      comparaciones: contadores.comparaciones,
      accesos: contadores.accesos,
      mensaje: `Choque en ${posicionCon(final.indice)}: ya la ocupa ${ocupante}. Las claves solo viven en las hojas, así que esta posición pasa a bifurcar y ${ocupante} y ${clave} bajan hasta el primer bit en que se diferencian.`
    }));

    let indice = final.indice;
    let nivel = final.nivel;
    while (nivel <= bits && codigo[nivel - 1] === codigoOcupante[nivel - 1]) {
      const bit = codigo[nivel - 1];
      contadores.accesos++;
      calculo.push({
        etiqueta: `Nivel ${nivel}`,
        expresion: `bit ${nivel}: ${ocupante} y ${clave} coinciden en ${bit}`,
        resultado: `las dos a la ${ladoDe(bit)}`
      });
      pasos.push(crearPaso(TIPOS_PASO.RAMIFICACION, {
        calculo: calculo.slice(),
        casilla: indice,
        codigo,
        nivel,
        comparaciones: contadores.comparaciones,
        accesos: contadores.accesos,
        mensaje: `Nivel ${nivel}: ${ocupante} y ${clave} tienen el mismo bit ${nivel} (${bit}), así que las dos siguen a la ${ladoDe(bit)} y hace falta otro nivel.`
      }));
      indice = bajarA(indice, bit);
      nivel++;
    }

    // Aquí los bits difieren: cada clave se va por su lado y las dos quedan
    // como hojas. Dos letras distintas siempre llegan a este punto, porque sus
    // códigos de `bits` bits no pueden ser iguales.
    const bitOcupante = codigoOcupante[nivel - 1];
    const bitNuevo = codigo[nivel - 1];
    const destinoOcupante = bajarA(indice, bitOcupante);
    const destinoNuevo = bajarA(indice, bitNuevo);

    calculo.push({
      etiqueta: `Nivel ${nivel}`,
      expresion: `bit ${nivel}: ${ocupante} = ${bitOcupante}, ${clave} = ${bitNuevo}`,
      resultado: 'se separan'
    });
    pasos.push(crearPaso(TIPOS_PASO.DESPLAZAMIENTO, {
      calculo: calculo.slice(),
      casilla: destinoOcupante,
      desde: final.indice,
      clave: ocupante,
      codigo,
      nivel: nivel + 1,
      efecto: { tipo: 'mover-nodo', desde: final.indice, hasta: destinoOcupante },
      comparaciones: contadores.comparaciones,
      accesos: contadores.accesos,
      mensaje: `${ocupante} baja a ${posicionCon(destinoOcupante)}: su bit ${nivel} es ${bitOcupante}.`
    }));

    calculo.push({ etiqueta: 'Inserción', expresion: caminoDe(destinoNuevo), resultado: `nivel ${nivel + 1}` });
    pasos.push(crearPaso(TIPOS_PASO.INSERCION, {
      calculo: calculo.slice(),
      casilla: destinoNuevo,
      codigo,
      nivel: nivel + 1,
      clave,
      efecto: { tipo: 'colocar-nodo', nodo: destinoNuevo, clave },
      comparaciones: contadores.comparaciones,
      accesos: contadores.accesos,
      mensaje: `Clave insertada: ${clave} como hoja en ${posicionCon(destinoNuevo)}, nivel ${nivel + 1}.`
    }));
    return pasos;
  }

  // Eliminar es localizar con el algoritmo del tema y sacar (CLAUDE.md 5.6).
  //
  // La clave siempre está en una hoja, así que sacarla no parte nada. Pero
  // puede dejar una rama larga colgando de una sola clave, y esa clave sube:
  // los bits que hacían falta para distinguirla de la que se fue ya no
  // distinguen nada. **La rama se recoge** (decisión del usuario sobre
  // maqueta, 2026-08-30) para que el dibujo dependa solo de qué claves hay y
  // no del orden en que se borraron: el árbol queda igual al que saldría de
  // insertar las claves que quedan desde cero.
  function eliminar({ claves, n, bits, clave }) {
    const pasos = buscar({ claves, n, bits, objetivo: clave });
    const hallazgo = pasos[pasos.length - 1];
    if (hallazgo.tipo !== TIPOS_PASO.ENCONTRADA) return pasos;

    // Copia propia: los pasos de recogida se calculan sobre el árbol ya sin la
    // clave, y la traza no puede tocar la estructura de verdad (CLAUDE.md 4).
    const estructura = { claves: claves.slice(), n };
    const nodo = hallazgo.casilla;
    const comun = {
      calculo: hallazgo.calculo,
      codigo: hallazgo.codigo,
      comparaciones: hallazgo.comparaciones,
      accesos: hallazgo.accesos
    };

    pasos.push(crearPaso(TIPOS_PASO.ELIMINACION, Object.assign({}, comun, {
      casilla: nodo,
      clave,
      efecto: { tipo: 'retirar-nodo', nodo },
      mensaje: `Clave ${clave} eliminada ${posicionDe(nodo)}.`
    })));
    arbol.retirarNodo(estructura, nodo);

    let ancestro = arbol.padre(nodo);
    while (ancestro >= arbol.RAIZ) {
      const restantes = arbol.clavesDelSubarbol(estructura, ancestro);
      // Se recoge mientras la rama cuelgue de una sola clave que no esté ya en
      // el ancestro. En cuanto quedan dos, la bifurcación vuelve a hacer falta.
      if (restantes.length !== 1 || restantes[0] === ancestro) break;

      const desde = restantes[0];
      const sube = arbol.claveEn(estructura, desde);
      pasos.push(crearPaso(TIPOS_PASO.DESPLAZAMIENTO, Object.assign({}, comun, {
        casilla: ancestro,
        desde,
        clave: sube,
        efecto: { tipo: 'mover-nodo', desde, hasta: ancestro },
        mensaje: `${sube} sube a ${posicionCon(ancestro)}: es la única clave que queda en esa rama, y los bits de más abajo ya no la distinguen de nadie.`
      })));
      arbol.moverNodo(estructura, desde, ancestro);
      ancestro = arbol.padre(ancestro);
    }
    return pasos;
  }

  // Los efectos que una inserción puede declarar: colocar la clave nueva y
  // bajar la que ya estaba. Insertar una palabra los aplica sobre una copia
  // para que cada letra vea el árbol que dejó la anterior.
  const APLICADORES = {
    'colocar-nodo': (estructura, efecto) => arbol.colocarNodo(estructura, efecto.nodo, efecto.clave),
    'mover-nodo': (estructura, efecto) => arbol.moverNodo(estructura, efecto.desde, efecto.hasta)
  };

  // Insertar una palabra es insertar sus letras en orden, y la traza es la de
  // todas seguidas: una sola operación reproducible, que se puede avanzar y
  // retroceder letra por letra. Es como se arma el ejercicio de clase
  // —«prueba» son p, r, u, e, b y a— sin perder el paso a paso.
  function insertarPalabra({ claves, n, bits, letras }) {
    const simulacion = claves.slice();
    const estructura = { claves: simulacion, n };
    const pasos = [];
    for (const letra of letras) {
      const parciales = insertar({ claves: simulacion, n, bits, clave: letra });
      for (const paso of parciales) {
        if (paso.efecto && APLICADORES[paso.efecto.tipo]) {
          APLICADORES[paso.efecto.tipo](estructura, paso.efecto);
        }
      }
      pasos.push(...parciales);
    }
    return pasos;
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.residuos = { insertar, buscar, eliminar, insertarPalabra, caminoDe };
})();

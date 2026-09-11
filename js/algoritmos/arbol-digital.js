(function () {
  const { TIPOS_PASO, crearPaso } = window.CC2.algoritmos.traza;
  const arbol = window.CC2.dominio.arbol;
  const { codigoDeLetra, posicionEnAlfabeto } = window.CC2.dominio.clave;

  // Árboles de búsqueda digital (CLAUDE.md 5.5). La clave es una letra, su
  // código son los bits que la distinguen, y el árbol se recorre **un bit por
  // nivel**: en el nivel d se mira el bit d, 0 baja a la izquierda y 1 a la
  // derecha. La primera clave queda en la raíz.
  //
  // Lo que separa este tema de los de residuos es que **las claves viven en
  // todos los nodos, no solo en las hojas**: en cada nodo se compara la clave
  // entera antes de mirar el bit siguiente, y por eso una búsqueda puede
  // terminar en cualquier nivel.
  //
  // Como en los demás temas, nada de esto toca la estructura: se produce la
  // traza y la pantalla la reproduce (CLAUDE.md 4).

  // El nodo se nombra por su parentesco y no por su índice: «hijo izquierdo de
  // b» es lo que el estudiante ve dibujado; la posición 16 no la ve nadie.
  function nombreDePosicion(claves, indice) {
    if (indice === arbol.RAIZ) return 'la raíz';
    const clavePadre = claves[arbol.padre(indice) - 1];
    const lado = indice % 2 === 0 ? 'izquierdo' : 'derecho';
    return `hijo ${lado} de ${clavePadre}`;
  }

  // Las dos formas con artículo, para que las frases se lean sin tropezar:
  // «la raíz» pide *de la*, y «hijo izquierdo de b» pide *del*.
  const posicionCon = (claves, indice) => (
    indice === arbol.RAIZ ? 'la raíz' : `el ${nombreDePosicion(claves, indice)}`
  );
  const posicionDe = (claves, indice) => (
    indice === arbol.RAIZ ? 'de la raíz' : `del ${nombreDePosicion(claves, indice)}`
  );

  function lineasIniciales(clave, bits) {
    const codigo = codigoDeLetra(clave, bits);
    return [
      { etiqueta: 'Clave', expresion: '', resultado: String(clave) },
      {
        etiqueta: 'Código',
        expresion: `posición ${posicionEnAlfabeto(clave)} del alfabeto`,
        resultado: codigo
      }
    ];
  }

  // Recorrido común a insertar, buscar y eliminar: baja desde la raíz mirando
  // un bit por nivel y va dejando un paso por nodo visitado. Se detiene en la
  // clave, o en la primera posición vacía —que es donde la clave tendría que
  // estar, y por eso prueba que no está—.
  //
  // `alVisitar` recibe cada nodo ocupado y decide si el recorrido para ahí.
  function recorrer({ claves, bits, clave, contadores, calculo, pasos, alVisitar }) {
    const codigo = codigoDeLetra(clave, bits);
    let indice = arbol.RAIZ;

    for (let nivel = 1; nivel <= bits + 1; nivel++) {
      contadores.accesos++;
      const ocupante = claves[indice - 1];
      if (ocupante === undefined) return { indice, nivel, ocupante: undefined };

      contadores.comparaciones++;
      if (alVisitar({ indice, nivel, ocupante })) return { indice, nivel, ocupante };

      // La clave no está en este nodo: el bit del nivel dice por dónde seguir.
      const bit = codigo[nivel - 1];
      const direccion = bit === '0' ? 'izquierda' : 'derecha';
      calculo.push({
        etiqueta: `Nodo ${ocupante}`,
        expresion: `${clave} ≠ ${ocupante} · bit ${nivel} = ${bit}`,
        resultado: direccion
      });
      pasos.push(crearPaso(TIPOS_PASO.COMPARACION, {
        calculo: calculo.slice(),
        casilla: indice,
        codigo,
        nivel,
        comparaciones: contadores.comparaciones,
        accesos: contadores.accesos,
        mensaje: `Nivel ${nivel}: ${clave} no coincide con ${ocupante}; el bit ${nivel} de ${codigo} es ${bit}, se baja a la ${direccion}.`
      }));
      indice = bit === '0' ? arbol.izquierdo(indice) : arbol.derecho(indice);
    }

    // Inalcanzable con claves distintas: dos códigos distintos se separan a
    // más tardar en el último bit. Se deja explícito para que, si algún día
    // cambia la codificación, falle aquí y no en silencio.
    return { indice, nivel: bits + 1, ocupante: claves[indice - 1] };
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

  function insertar({ claves, n, bits, clave }) {
    const contadores = { comparaciones: 0, accesos: 0 };
    const codigo = codigoDeLetra(clave, bits);
    const calculo = lineasIniciales(clave, bits);
    const pasos = [pasoDelCodigo(clave, codigo, calculo, contadores)];

    let duplicada = null;
    const final = recorrer({
      claves, bits, clave, contadores, calculo, pasos,
      alVisitar: ({ indice, ocupante }) => {
        if (ocupante !== clave) return false;
        duplicada = indice;
        return true;
      }
    });

    if (duplicada !== null) {
      pasos.push(crearPaso(TIPOS_PASO.RECHAZADA, {
        calculo: calculo.concat({ etiqueta: 'Duplicada', expresion: `${clave} ya está en el árbol`, resultado: 'no se inserta' }),
        casilla: duplicada,
        codigo,
        comparaciones: contadores.comparaciones,
        accesos: contadores.accesos,
        mensaje: `Clave duplicada: ${clave} ya reside en ${posicionCon(claves, duplicada)}.`
      }));
      return pasos;
    }

    const donde = nombreDePosicion(claves, final.indice);
    calculo.push({ etiqueta: 'Inserción', expresion: donde, resultado: `nivel ${final.nivel}` });
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
        ? `Clave insertada: ${clave} en la raíz del árbol.`
        : `Clave insertada: ${clave} como ${donde}, en el nivel ${final.nivel}.`
    }));
    return pasos;
  }

  function buscar({ claves, n, bits, objetivo }) {
    const contadores = { comparaciones: 0, accesos: 0 };
    const codigo = codigoDeLetra(objetivo, bits);
    const calculo = lineasIniciales(objetivo, bits);
    const pasos = [pasoDelCodigo(objetivo, codigo, calculo, contadores)];

    let hallada = null;
    const final = recorrer({
      claves, bits, clave: objetivo, contadores, calculo, pasos,
      alVisitar: ({ indice, ocupante }) => {
        if (ocupante !== objetivo) return false;
        hallada = indice;
        return true;
      }
    });

    if (hallada !== null) {
      calculo.push({ etiqueta: `Nodo ${objetivo}`, expresion: `${objetivo} = ${objetivo}`, resultado: 'encontrada' });
      pasos.push(crearPaso(TIPOS_PASO.ENCONTRADA, {
        calculo: calculo.slice(),
        casilla: hallada,
        codigo,
        nivel: final.nivel,
        comparaciones: contadores.comparaciones,
        accesos: contadores.accesos,
        mensaje: `Clave localizada en ${posicionCon(claves, hallada)}, nivel ${final.nivel}, tras ${contadores.comparaciones} comparaciones.`
      }));
      return pasos;
    }

    // La posición vacía es la respuesta, no un fracaso a medias: si la clave
    // existiera, sus bits la habrían puesto justo aquí.
    calculo.push({ etiqueta: 'Posición vacía', expresion: nombreDePosicion(claves, final.indice), resultado: 'no está' });
    pasos.push(crearPaso(TIPOS_PASO.NO_ENCONTRADA, {
      calculo: calculo.slice(),
      casilla: final.indice,
      codigo,
      nivel: final.nivel,
      comparaciones: contadores.comparaciones,
      accesos: contadores.accesos,
      mensaje: final.indice === arbol.RAIZ
        ? 'Clave no localizada en la estructura: el árbol está vacío.'
        : `Clave no localizada en la estructura: ${posicionCon(claves, final.indice)} está vacío, que es donde ${objetivo} tendría que estar.`
    }));
    return pasos;
  }

  // Eliminar es localizar con el algoritmo del tema y sacar (CLAUDE.md 5.6).
  //
  // Si el nodo es una hoja, se va y ya. Si tiene descendientes, dejar el hueco
  // partiría el árbol: todo lo que cuelga de él dejaría de ser alcanzable. Por
  // eso **sube una hoja de su propio subárbol a ocupar el sitio**, y sirve
  // cualquiera: como esa hoja llegó hasta ahí bajando por la posición que
  // queda libre, sus primeros bits son justo los que esa posición exige, y
  // ninguna búsqueda cambia de camino. Se elige la más profunda porque es la
  // que más baja la altura del árbol.
  function eliminar({ claves, n, bits, clave }) {
    const pasos = buscar({ claves, n, bits, objetivo: clave });
    const hallazgo = pasos[pasos.length - 1];
    if (hallazgo.tipo !== TIPOS_PASO.ENCONTRADA) return pasos;

    const estructura = { claves, n };
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
      mensaje: `Clave ${clave} eliminada ${posicionDe(claves, nodo)}.`
    })));

    if (arbol.esHoja(estructura, nodo)) return pasos;

    const hoja = arbol.hojaMasProfunda(estructura, nodo);
    // La hoja del subárbol no puede ser el propio nodo: acaba de comprobarse
    // que tiene descendientes.
    pasos.push(crearPaso(TIPOS_PASO.DESPLAZAMIENTO, Object.assign({}, comun, {
      casilla: nodo,
      desde: hoja,
      clave: claves[hoja - 1],
      efecto: { tipo: 'mover-nodo', desde: hoja, hasta: nodo },
      mensaje: `La hoja ${claves[hoja - 1]} sube a ocupar el sitio: bajó hasta allí por esta misma posición, así que sus primeros bits son los que el camino exige y ninguna búsqueda cambia.`
    })));
    return pasos;
  }

  // Insertar una palabra es insertar sus letras en orden, y la traza es la de
  // todas seguidas: una sola operación reproducible, que se puede avanzar y
  // retroceder letra por letra. Es como se arma el ejercicio de clase
  // —«prueba» son p, r, u, e, b y a— sin perder el paso a paso.
  function insertarPalabra({ claves, n, bits, letras }) {
    const simulacion = claves.slice();
    const pasos = [];
    for (const letra of letras) {
      const parciales = insertar({ claves: simulacion, n, bits, clave: letra });
      for (const paso of parciales) {
        if (paso.efecto && paso.efecto.tipo === 'colocar-nodo') {
          simulacion[paso.efecto.nodo - 1] = paso.efecto.clave;
        }
      }
      pasos.push(...parciales);
    }
    return pasos;
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.arbolDigital = { insertar, buscar, eliminar, insertarPalabra, nombreDePosicion };
})();

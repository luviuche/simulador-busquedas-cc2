(function () {
  // Dos modos de estructura, porque los temas colocan las claves de forma
  // distinta (CLAUDE.md 3.2):
  //
  //   'ordenada' — secuencial y binaria. Arreglo denso, siempre ascendente.
  //                La casilla i contiene claves[i-1] y no hay huecos.
  //   'dispersa' — transformación de claves. La clave aterriza en la dirección
  //                que le da la función hash, así que quedan huecos en el medio
  //                y el orden ascendente deja de aplicar.
  //
  // En ambos modos `claves` es el arreglo que la vista lee por casilla, para
  // que dibujar la estructura no dependa del modo.
  const MODOS = Object.freeze({ ORDENADA: 'ordenada', DISPERSA: 'dispersa' });

  function crearEstructura({ n, l, tipoClave, modo = MODOS.ORDENADA, tratamiento = null }) {
    const validacion = window.CC2.dominio.limites.validarTamano(n, l);
    if (!validacion.valido) {
      return { exito: false, mensaje: validacion.mensaje };
    }
    return {
      exito: true,
      advertencia: validacion.advertencia,
      estructura: {
        n,
        l,
        tipoClave,
        modo,
        tratamiento,
        // La dispersa nace con las n casillas vacías: su longitud no crece con
        // las inserciones, cambia solo qué posiciones están definidas.
        claves: modo === MODOS.DISPERSA ? new Array(n) : []
      }
    };
  }

  // Mantiene la invariante "siempre ordenada ascendente" (CLAUDE.md 3.2)
  // devolviendo el índice donde insertar sin romper el orden.
  function buscarPosicionInsercion(claves, valor) {
    let inicio = 0;
    let fin = claves.length;
    while (inicio < fin) {
      const medio = (inicio + fin) >> 1;
      if (claves[medio] < valor) inicio = medio + 1;
      else fin = medio;
    }
    return inicio;
  }

  // Único contador válido para los dos modos: en la dispersa `claves.length`
  // es siempre n, ocupada o no, así que hay que contar las definidas.
  function cantidadClaves(estructura) {
    if (estructura.modo !== MODOS.DISPERSA) return estructura.claves.length;
    let total = 0;
    for (let i = 0; i < estructura.claves.length; i++) {
      if (estructura.claves[i] !== undefined) total++;
    }
    return total;
  }

  function estaLlena(estructura) {
    return cantidadClaves(estructura) >= estructura.n;
  }

  function estaVacia(estructura) {
    return cantidadClaves(estructura) === 0;
  }

  // Índice base 1 de la casilla que contiene la clave, o 0 si no está
  // (CLAUDE.md 3.1). Sirve para la invariante de unicidad en los dos modos.
  function casillaDe(estructura, valor) {
    const posicion = estructura.claves.indexOf(valor);
    return posicion === -1 ? 0 : posicion + 1;
  }

  // El índice devuelto es siempre base 1 (CLAUDE.md 3.1): este es el único
  // punto donde se hace la conversión de índice de arreglo a casilla visible.
  function insertar(estructura, valor) {
    if (estaLlena(estructura)) {
      return { exito: false, mensaje: `Estructura saturada: capacidad máxima de ${estructura.n} casillas alcanzada.` };
    }
    const posicionExistente = estructura.claves.indexOf(valor);
    if (posicionExistente !== -1) {
      return { exito: false, mensaje: `Clave duplicada: la clave ya reside en la posición ${posicionExistente + 1}.` };
    }
    const posicion = buscarPosicionInsercion(estructura.claves, valor);
    estructura.claves.splice(posicion, 0, valor);
    return { exito: true, indice: posicion + 1 };
  }

  function eliminar(estructura, valor) {
    const posicion = estructura.claves.indexOf(valor);
    if (posicion === -1) {
      return { exito: false, mensaje: 'Clave no localizada en la estructura.' };
    }
    if (estructura.modo === MODOS.DISPERSA) {
      delete estructura.claves[posicion];
    } else {
      estructura.claves.splice(posicion, 1);
    }
    return { exito: true, indice: posicion + 1 };
  }

  // Colocación directa en una casilla concreta, que es como inserta la
  // transformación de claves: la dirección ya viene calculada por el algoritmo,
  // el dominio solo la aplica. No decide nada sobre colisiones —eso es del
  // tratamiento— pero sí se niega a pisar una casilla ocupada.
  function colocarEn(estructura, indice, valor) {
    if (estructura.modo !== MODOS.DISPERSA) {
      return { exito: false, mensaje: 'Colocación directa no aplicable a una estructura ordenada.' };
    }
    if (indice < 1 || indice > estructura.n) {
      return { exito: false, mensaje: `Dirección fuera de rango: ${indice} no pertenece a 1..${estructura.n}.` };
    }
    if (estructura.claves[indice - 1] !== undefined) {
      return { exito: false, mensaje: `Casilla ocupada: la casilla ${indice} ya contiene una clave.` };
    }
    estructura.claves[indice - 1] = valor;
    return { exito: true, indice };
  }

  function retirarDe(estructura, indice) {
    if (estructura.modo !== MODOS.DISPERSA) {
      return { exito: false, mensaje: 'Retiro directo no aplicable a una estructura ordenada.' };
    }
    const valor = estructura.claves[indice - 1];
    if (valor === undefined) {
      return { exito: false, mensaje: `Casilla vacía: la casilla ${indice} no contiene ninguna clave.` };
    }
    delete estructura.claves[indice - 1];
    return { exito: true, indice, valor };
  }

  window.CC2 = window.CC2 || {};
  window.CC2.dominio = window.CC2.dominio || {};
  window.CC2.dominio.estructura = {
    MODOS,
    crearEstructura,
    insertar,
    eliminar,
    colocarEn,
    retirarDe,
    cantidadClaves,
    casillaDe,
    estaLlena,
    estaVacia
  };
})();

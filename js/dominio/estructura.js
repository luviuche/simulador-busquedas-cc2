(function () {
  function crearEstructura({ n, l, tipoClave }) {
    const validacion = window.CC2.dominio.limites.validarTamano(n, l);
    if (!validacion.valido) {
      return { exito: false, mensaje: validacion.mensaje };
    }
    return {
      exito: true,
      advertencia: validacion.advertencia,
      estructura: { n, l, tipoClave, claves: [] }
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

  function estaLlena(estructura) {
    return estructura.claves.length >= estructura.n;
  }

  function estaVacia(estructura) {
    return estructura.claves.length === 0;
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
    estructura.claves.splice(posicion, 1);
    return { exito: true, indice: posicion + 1 };
  }

  window.CC2 = window.CC2 || {};
  window.CC2.dominio = window.CC2.dominio || {};
  window.CC2.dominio.estructura = {
    crearEstructura,
    insertar,
    eliminar,
    estaLlena,
    estaVacia
  };
})();

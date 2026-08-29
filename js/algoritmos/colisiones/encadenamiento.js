(function () {
  // Encadenamiento secuencial (CLAUDE.md 5.4): cada dirección sostiene una
  // cadena, y ahí van las claves que chocaron con ella.
  //
  // Es el hermano de los arreglos anidados —la clave que obtuvo la dirección
  // se queda en la casilla de la tabla y la cadena es para las siguientes— y
  // **lo único que los separa es que la cadena no tiene tope**. De ahí las dos
  // diferencias del recorrido:
  //
  //   1. No recibe `tamano`: recorre lo que haya y para al final. Una cadena
  //      no tiene posiciones vacías —la clave nueva se engancha al final— así
  //      que agotarla es haberla recorrido entera, no haberla llenado.
  //   2. Agotar el recorrido no es un fracaso. Al insertar significa "la
  //      clave va en la posición siguiente", y esta estructura nunca se
  //      satura; al buscar, que la clave no está.
  //
  // Devuelve **cada posición recorrida**, no solo el destino, por la misma
  // razón que `sondearLineal` y `recorrerAnidado`: es lo que deja ver el costo
  // real de la búsqueda cuando la dirección está disputada.
  function recorrerCadena({ cadena, condicion }) {
    const recorrido = [];
    for (let posicion = 1; posicion <= cadena.length; posicion++) {
      const clave = cadena[posicion - 1];
      const detener = condicion(clave, posicion);
      recorrido.push({ posicion, clave, detener });
      if (detener) return { recorrido, posicion, clave, agotado: false };
    }
    // Recorrida entera sin cumplir la condición. La posición que sigue —la del
    // final de la cadena— es donde se engancharía una clave nueva.
    return { recorrido, posicion: cadena.length + 1, clave: undefined, agotado: true };
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.colisiones = window.CC2.algoritmos.colisiones || {};
  window.CC2.algoritmos.colisiones.encadenamiento = { recorrerCadena };
})();

(function () {
  // Reasignación por prueba lineal (CLAUDE.md 5.4): desde la dirección ocupada
  // se avanza de a una casilla, dando la vuelta al final de la estructura,
  // hasta hallar lo que se busca.
  //
  // Devuelve **cada casilla recorrida**, no solo el destino: el documento lo
  // exige y es lo que deja ver por qué una clave terminó lejos de su dirección.
  //
  // `condicion(clave, casilla)` decide dónde para el sondeo: al insertar se
  // detiene en la primera casilla libre; al buscar, en la que tiene la clave
  // objetivo o en la primera vacía, que prueba que la clave no está.
  function sondearLineal({ claves, n, desde, condicion }) {
    const recorrido = [];
    for (let salto = 1; salto <= n - 1; salto++) {
      // El módulo sobre base 0 y el +1 de vuelta: la casilla n+1 es la 1.
      const casilla = ((desde - 1 + salto) % n) + 1;
      const clave = claves[casilla - 1];
      const detener = condicion(clave, casilla);
      recorrido.push({ casilla, clave, detener });
      if (detener) return { recorrido, casilla, clave, agotado: false };
    }
    // Dio la vuelta completa sin cumplir la condición: no queda dónde mirar.
    return { recorrido, casilla: 0, clave: undefined, agotado: true };
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.colisiones = window.CC2.algoritmos.colisiones || {};
  window.CC2.algoritmos.colisiones.reasignacion = { sondearLineal };
})();

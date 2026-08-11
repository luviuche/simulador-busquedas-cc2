(function () {
  const { TIPOS_PASO, crearPaso } = window.CC2.algoritmos.traza;

  // No ejecuta ni anima: produce la traza completa del recorrido lineal
  // desde la casilla 1 (CLAUDE.md 4 y 5.1). La vista la reproduce después.
  function buscarSecuencial(claves, objetivo) {
    const pasos = [];
    let comparaciones = 0;
    let accesos = 0;

    for (let indice = 0; indice < claves.length; indice++) {
      const casilla = indice + 1;
      accesos++;
      comparaciones++;

      if (claves[indice] === objetivo) {
        pasos.push(crearPaso(TIPOS_PASO.ENCONTRADA, {
          casilla,
          comparaciones,
          accesos,
          mensaje: `Clave localizada en la casilla ${casilla} tras ${comparaciones} comparaciones.`
        }));
        return pasos;
      }

      pasos.push(crearPaso(TIPOS_PASO.COMPARACION, {
        casilla,
        comparaciones,
        accesos,
        mensaje: `Se compara la clave objetivo con la casilla ${casilla}.`
      }));
    }

    pasos.push(crearPaso(TIPOS_PASO.NO_ENCONTRADA, {
      comparaciones,
      accesos,
      mensaje: `Clave no localizada en la estructura tras ${comparaciones} comparaciones.`
    }));
    return pasos;
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.secuencial = { buscarSecuencial };
})();

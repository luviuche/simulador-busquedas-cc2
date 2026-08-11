(function () {
  const UMBRAL_HORIZONTAL = 12;
  const UMBRAL_VERTICAL = 10;

  // Casillas siempre visibles (CLAUDE.md 6.2): 1, n, y las relevantes del
  // paso más una vecina a cada lado.
  function indicesSiempreVisibles(n, relevantes) {
    const conjunto = new Set([1, n]);
    for (const indice of relevantes) {
      conjunto.add(indice);
      if (indice - 1 >= 1) conjunto.add(indice - 1);
      if (indice + 1 <= n) conjunto.add(indice + 1);
    }
    return conjunto;
  }

  // Devuelve una lista de segmentos { tipo: 'casilla', indice } o
  // { tipo: 'tramo', desde, hasta, cantidad } que la vista dibuja en orden.
  function calcularSegmentos({ n, relevantes, orientacion = 'horizontal', mostrarCompleta = false }) {
    const umbral = orientacion === 'horizontal' ? UMBRAL_HORIZONTAL : UMBRAL_VERTICAL;
    if (mostrarCompleta || n <= umbral) {
      const todas = [];
      for (let i = 1; i <= n; i++) todas.push({ tipo: 'casilla', indice: i });
      return todas;
    }

    const visibles = indicesSiempreVisibles(n, relevantes);
    const segmentos = [];
    let inicioOculto = null;

    for (let i = 1; i <= n; i++) {
      if (visibles.has(i)) {
        if (inicioOculto !== null) {
          segmentos.push({ tipo: 'tramo', desde: inicioOculto, hasta: i - 1, cantidad: i - inicioOculto });
          inicioOculto = null;
        }
        segmentos.push({ tipo: 'casilla', indice: i });
      } else if (inicioOculto === null) {
        inicioOculto = i;
      }
    }
    if (inicioOculto !== null) {
      segmentos.push({ tipo: 'tramo', desde: inicioOculto, hasta: n, cantidad: n - inicioOculto + 1 });
    }
    return segmentos;
  }

  window.CC2 = window.CC2 || {};
  window.CC2.vista = window.CC2.vista || {};
  window.CC2.vista.elision = { UMBRAL_HORIZONTAL, UMBRAL_VERTICAL, calcularSegmentos };
})();

(function () {
  const { TIPOS_PASO, crearPaso } = window.CC2.algoritmos.traza;

  // No ejecuta ni anima: produce la traza completa de la división sobre el
  // arreglo ordenado (CLAUDE.md 4 y 5.2). Requiere la invariante "siempre
  // ordenada ascendente", que dominio/estructura.js sostiene al insertar.
  //
  // Cada paso lleva el rango vigente `inicio/medio/fin` y las casillas ya
  // `descartadas` por pasos anteriores, todo en base 1 (CLAUDE.md 3.1): la
  // conversión ocurre solo aquí, al construir el paso.
  function buscarBinaria(claves, objetivo) {
    const pasos = [];
    const descartadas = [];
    let inicio = 0;
    let fin = claves.length - 1;
    let comparaciones = 0;
    let accesos = 0;

    function descartar(desde, hasta) {
      for (let i = desde; i <= hasta; i++) descartadas.push(i + 1);
    }

    while (inicio <= fin) {
      const medio = Math.floor((inicio + fin) / 2);
      accesos++;
      comparaciones++;

      const rango = {
        inicio: inicio + 1,
        medio: medio + 1,
        fin: fin + 1,
        casilla: medio + 1,
        descartadas: descartadas.slice(),
        comparaciones,
        accesos
      };

      if (claves[medio] === objetivo) {
        pasos.push(crearPaso(TIPOS_PASO.ENCONTRADA, Object.assign(rango, {
          mensaje: `Clave localizada en la casilla ${medio + 1} tras ${comparaciones} comparaciones.`
        })));
        return pasos;
      }

      const objetivoEsMayor = objetivo > claves[medio];
      pasos.push(crearPaso(TIPOS_PASO.COMPARACION, Object.assign(rango, {
        mensaje: `Se compara la clave objetivo con la casilla ${medio + 1}: ${objetivo} es `
          + `${objetivoEsMayor ? 'mayor' : 'menor'} que ${claves[medio]}; se descarta la mitad `
          + `${objetivoEsMayor ? 'inferior' : 'superior'}.`
      })));

      if (objetivoEsMayor) {
        descartar(inicio, medio);
        inicio = medio + 1;
      } else {
        descartar(medio, fin);
        fin = medio - 1;
      }
    }

    pasos.push(crearPaso(TIPOS_PASO.NO_ENCONTRADA, {
      descartadas: descartadas.slice(),
      comparaciones,
      accesos,
      mensaje: `Clave no localizada en la estructura tras ${comparaciones} comparaciones.`
    }));
    return pasos;
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.binaria = { buscarBinaria };
})();

(function () {
  // Reproduce una traza ya calculada: es solo un índice sobre un arreglo
  // (CLAUDE.md 4), por eso paso a paso, continuo y retroceder son triviales.
  function crearReproductor({ pasos, alCambiarPaso, velocidadMs = 800 }) {
    let indiceActual = -1;
    let temporizador = null;

    function detener() {
      if (temporizador !== null) {
        clearTimeout(temporizador);
        temporizador = null;
      }
    }

    // Interrumpible: saltar de paso cancela cualquier reproducción continua
    // pendiente en vez de encolarla (CLAUDE.md 7).
    function irAPaso(indice) {
      detener();
      const destino = Math.max(-1, Math.min(indice, pasos.length - 1));
      // Insistir en el último paso no es un paso nuevo: notificarlo repetiría
      // el mensaje en la bitácora y volvería a animar un cambio inexistente.
      if (destino === indiceActual) return;
      indiceActual = destino;
      alCambiarPaso(indiceActual >= 0 ? pasos[indiceActual] : null, indiceActual);
    }

    function siguientePaso() {
      irAPaso(indiceActual + 1);
      return indiceActual < pasos.length - 1;
    }

    function pasoAnterior() {
      irAPaso(indiceActual - 1);
    }

    function reproducirContinuo() {
      detener();
      const avanzar = () => {
        const quedaPaso = siguientePaso();
        if (quedaPaso) {
          temporizador = setTimeout(avanzar, velocidadMs);
        }
      };
      avanzar();
    }

    function establecerVelocidad(ms) {
      velocidadMs = ms;
    }

    return {
      siguientePaso,
      pasoAnterior,
      irAPaso,
      reproducirContinuo,
      detener,
      establecerVelocidad,
      obtenerIndiceActual: () => indiceActual,
      obtenerTotalPasos: () => pasos.length
    };
  }

  window.CC2 = window.CC2 || {};
  window.CC2.vista = window.CC2.vista || {};
  window.CC2.vista.reproductor = { crearReproductor };
})();

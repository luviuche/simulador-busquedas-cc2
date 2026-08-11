(function () {
  const TIPOS_PASO = Object.freeze({
    COMPARACION: 'comparacion',
    ENCONTRADA: 'encontrada',
    NO_ENCONTRADA: 'no-encontrada'
  });

  function crearPaso(tipo, datos) {
    return Object.assign({ tipo }, datos);
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.traza = { TIPOS_PASO, crearPaso };
})();

(function () {
  const TIPOS_PASO = Object.freeze({
    // Búsquedas por comparación (secuencial, binaria).
    COMPARACION: 'comparacion',
    ENCONTRADA: 'encontrada',
    NO_ENCONTRADA: 'no-encontrada',
    // Transformación de claves: el cálculo de la dirección se revela línea por
    // línea, y la colocación puede chocar y tener que sondear (CLAUDE.md 5.3).
    CALCULO: 'calculo',
    INSERCION: 'insercion',
    COLISION: 'colision',
    SONDEO: 'sondeo',
    RECHAZADA: 'rechazada',
    SATURADA: 'saturada'
  });

  function crearPaso(tipo, datos) {
    return Object.assign({ tipo }, datos);
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.traza = { TIPOS_PASO, crearPaso };
})();

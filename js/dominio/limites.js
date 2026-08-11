(function () {
  const LIMITE_DURO_N = 10000;
  const UMBRAL_ADVERTENCIA_N = 500;

  function rangoValido(L) {
    return { min: Math.pow(10, L - 1), max: Math.pow(10, L) - 1 };
  }

  function clavesDistintasPosibles(L) {
    return 9 * Math.pow(10, L - 1);
  }

  // El límite derivado de L se valida al crear la estructura, no al insertar (CLAUDE.md 3.5).
  function validarTamano(n, L) {
    if (n > LIMITE_DURO_N) {
      return {
        valido: false,
        mensaje: `Tamaño inviable: el límite máximo de la estructura es ${LIMITE_DURO_N} casillas.`
      };
    }
    const maxDistintas = clavesDistintasPosibles(L);
    if (n > maxDistintas) {
      return {
        valido: false,
        mensaje: `Tamaño inviable: para L = ${L} solo existen ${maxDistintas} claves distintas.`
      };
    }
    return {
      valido: true,
      advertencia: n > UMBRAL_ADVERTENCIA_N
        ? `Con n = ${n} casillas, la ejecución paso a paso deja de ser observable.`
        : null
    };
  }

  window.CC2 = window.CC2 || {};
  window.CC2.dominio = window.CC2.dominio || {};
  window.CC2.dominio.limites = {
    LIMITE_DURO_N,
    UMBRAL_ADVERTENCIA_N,
    rangoValido,
    clavesDistintasPosibles,
    validarTamano
  };
})();

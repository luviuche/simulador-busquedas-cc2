(function () {
  // Identidad estable por clave, no por índice (CLAUDE.md 7): es lo que permite
  // que el reordenamiento anime un movimiento y no un redibujado completo.
  function crearCasilla({ clave, indice, estado }) {
    const el = document.createElement('div');
    el.dataset.clave = clave === null || clave === undefined ? `vacia-${indice}` : String(clave);
    el.dataset.indice = String(indice);
    el.textContent = clave === null || clave === undefined ? '' : String(clave);
    aplicarEstado(el, estado);
    return el;
  }

  function aplicarEstado(el, estado) {
    el.className = `casilla casilla--${estado}`;
  }

  window.CC2 = window.CC2 || {};
  window.CC2.vista = window.CC2.vista || {};
  window.CC2.vista.componentes = window.CC2.vista.componentes || {};
  window.CC2.vista.componentes.casilla = { crearCasilla, aplicarEstado };
})();

(function () {
  // Identidad estable por clave, no por índice (CLAUDE.md 7): es lo que permite
  // que el reordenamiento anime un movimiento y no un redibujado completo.
  function crearCasilla({ clave, indice, estado, modificadores }) {
    const el = document.createElement('div');
    el.dataset.clave = clave === null || clave === undefined ? `vacia-${indice}` : String(clave);
    el.dataset.indice = String(indice);
    el.textContent = clave === null || clave === undefined ? '' : String(clave);
    aplicarEstado(el, estado, modificadores);
    return el;
  }

  // El estado pinta la casilla; los modificadores marcan pertenencias que son
  // independientes del color —el corchete del rango activo en binaria— y que
  // por eso no pueden ser un estado más (CLAUDE.md 8.1).
  function aplicarEstado(el, estado, modificadores) {
    const clases = [`casilla`, `casilla--${estado}`];
    for (const modificador of modificadores || []) clases.push(`casilla--${modificador}`);
    el.className = clases.join(' ');
  }

  window.CC2 = window.CC2 || {};
  window.CC2.vista = window.CC2.vista || {};
  window.CC2.vista.componentes = window.CC2.vista.componentes || {};
  window.CC2.vista.componentes.casilla = { crearCasilla, aplicarEstado };
})();

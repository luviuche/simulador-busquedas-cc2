(function () {
  function prefiereMovimientoReducido() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Las animaciones se reemplazan, nunca se encolan (CLAUDE.md 7): cancelar
  // cualquier animación en curso sobre el mismo elemento antes de iniciar otra.
  function reemplazarAnimacion(el, keyframes, opciones) {
    if (el.__animacionActual) {
      el.__animacionActual.cancel();
    }
    const animacion = el.animate(keyframes, opciones);
    el.__animacionActual = animacion;
    animacion.onfinish = () => {
      if (el.__animacionActual === animacion) el.__animacionActual = null;
    };
    return animacion;
  }

  // Técnica FLIP: mide posición antes, deja que aplicarCambio() modifique el
  // DOM, mide después y anima solo el delta con transform (CLAUDE.md 7).
  function animarFlip(contenedor, aplicarCambio, { duracionMs = 400, easing = 'ease-in-out' } = {}) {
    const posicionesPrevias = new Map();
    for (const el of contenedor.querySelectorAll('[data-clave]')) {
      posicionesPrevias.set(el.dataset.clave, el.getBoundingClientRect());
    }

    aplicarCambio();

    if (prefiereMovimientoReducido()) return;

    for (const el of contenedor.querySelectorAll('[data-clave]')) {
      const previa = posicionesPrevias.get(el.dataset.clave);
      if (!previa) continue;
      const actual = el.getBoundingClientRect();
      const deltaX = previa.left - actual.left;
      const deltaY = previa.top - actual.top;
      if (deltaX === 0 && deltaY === 0) continue;
      reemplazarAnimacion(el, [
        { transform: `translate(${deltaX}px, ${deltaY}px)` },
        { transform: 'translate(0, 0)' }
      ], { duration: duracionMs, easing });
    }
  }

  function animarCambioEstado(el, { duracionMs = 400, easing = 'ease-in-out' } = {}) {
    if (prefiereMovimientoReducido()) return;
    reemplazarAnimacion(el, [{ opacity: .4 }, { opacity: 1 }], { duration: duracionMs, easing });
  }

  window.CC2 = window.CC2 || {};
  window.CC2.vista = window.CC2.vista || {};
  window.CC2.vista.animacion = { prefiereMovimientoReducido, reemplazarAnimacion, animarFlip, animarCambioEstado };
})();

(function () {
  const CLAVE_ALMACENAMIENTO = 'cc2:recientes';
  const MAXIMO = 5;

  // No es la copia real (CLAUDE.md 10.4): si el navegador borra datos de
  // navegación, esta lista desaparece; el archivo .cc2 es la copia real.
  function obtener() {
    try {
      const crudo = window.localStorage.getItem(CLAVE_ALMACENAMIENTO);
      return crudo ? JSON.parse(crudo) : [];
    } catch (error) {
      return [];
    }
  }

  function registrar(entrada) {
    const lista = obtener().filter((item) => item.nombre !== entrada.nombre);
    lista.unshift(Object.assign({ fecha: new Date().toISOString() }, entrada));
    const recortada = lista.slice(0, MAXIMO);
    try {
      window.localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(recortada));
    } catch (error) {
      // Almacenamiento no disponible: se degrada a sesión sin recientes.
    }
    return recortada;
  }

  window.CC2 = window.CC2 || {};
  window.CC2.persistencia = window.CC2.persistencia || {};
  window.CC2.persistencia.recientes = { obtener, registrar, MAXIMO };
})();

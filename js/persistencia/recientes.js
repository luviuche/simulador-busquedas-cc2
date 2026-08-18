(function () {
  const CLAVE_ALMACENAMIENTO = 'cc2:recientes';
  const MAXIMO = 5;

  // Entradas guardadas antes de que los temas dejaran de llamarse módulos y de
  // que L pasara a l. Se normalizan al leer para no mostrar "undefined" a quien
  // ya tenía recientes; guardar cualquiera de ellas la reescribe al formato nuevo.
  function normalizar(item) {
    return {
      nombre: item.nombre,
      fecha: item.fecha,
      temaTitulo: item.temaTitulo !== undefined ? item.temaTitulo : item.moduloTitulo,
      n: item.n,
      l: item.l !== undefined ? item.l : item.L
    };
  }

  // No es la copia real (CLAUDE.md 10.4): si el navegador borra datos de
  // navegación, esta lista desaparece; el archivo .cc2 es la copia real.
  function obtener() {
    try {
      const crudo = window.localStorage.getItem(CLAVE_ALMACENAMIENTO);
      return crudo ? JSON.parse(crudo).map(normalizar) : [];
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

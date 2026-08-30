(function () {
  function crearFilaBitacora(entrada) {
    const el = document.createElement('div');
    el.className = 'bitacora__fila';
    const hora = document.createElement('span');
    hora.className = 'bitacora__hora';
    hora.textContent = entrada.hora;
    const mensaje = document.createElement('span');
    mensaje.textContent = entrada.mensaje;
    el.append(hora, mensaje);
    return el;
  }

  function crearBitacora() {
    const el = document.createElement('div');
    el.className = 'bitacora';
    return el;
  }

  function agregarEntrada(bitacoraEl, entrada) {
    bitacoraEl.appendChild(crearFilaBitacora(entrada));
    bitacoraEl.scrollTop = bitacoraEl.scrollHeight;
  }

  // Reiniciar la estructura vacía también su historia: lo que la bitácora
  // cuenta es lo que se le hizo a la estructura que hay en pantalla.
  function vaciar(bitacoraEl) {
    bitacoraEl.innerHTML = '';
  }

  window.CC2 = window.CC2 || {};
  window.CC2.vista = window.CC2.vista || {};
  window.CC2.vista.componentes = window.CC2.vista.componentes || {};
  window.CC2.vista.componentes.bitacora = { crearBitacora, crearFilaBitacora, agregarEntrada, vaciar };
})();

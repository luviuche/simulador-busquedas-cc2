(function () {
  // **La hora se escribe solo cuando cambia.** Una traza entera cae dentro del
  // mismo segundo, así que repetirla deja quince renglones seguidos diciendo
  // lo mismo en la columna más cara de la pantalla. El hueco se conserva
  // —la columna no se encoge— para que los mensajes sigan alineados y la hora
  // se lea como lo que es: la marca de cuándo empezó lo que viene debajo.
  function crearFilaBitacora(entrada, horaAnterior) {
    const el = document.createElement('div');
    el.className = 'bitacora__fila';
    const hora = document.createElement('span');
    hora.className = 'bitacora__hora';
    const repetida = entrada.hora === horaAnterior;
    hora.textContent = repetida ? '' : entrada.hora;
    // El lector de pantalla sí la oye siempre: la repetición estorba a la
    // vista, que abarca varios renglones de un golpe, no al oído.
    if (repetida) hora.setAttribute('aria-label', entrada.hora);
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
    const ultima = bitacoraEl.lastElementChild;
    const horaAnterior = ultima ? (ultima.dataset.hora || '') : '';
    const fila = crearFilaBitacora(entrada, horaAnterior);
    fila.dataset.hora = entrada.hora;
    bitacoraEl.appendChild(fila);
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

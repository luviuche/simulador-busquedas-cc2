(function () {
  function crearPanel({ titulo, contenido }) {
    const el = document.createElement('section');
    el.className = 'panel';
    if (titulo) {
      const tituloEl = document.createElement('h2');
      tituloEl.className = 'panel__titulo texto-nivel-2';
      tituloEl.textContent = titulo;
      el.appendChild(tituloEl);
    }
    if (contenido) el.appendChild(contenido);
    return el;
  }

  function crearMetrica({ etiqueta, valor }) {
    const el = document.createElement('div');
    el.className = 'metrica';
    const valorEl = document.createElement('span');
    valorEl.className = 'metrica__valor texto-mono';
    valorEl.textContent = String(valor);
    const etiquetaEl = document.createElement('span');
    etiquetaEl.className = 'texto-nivel-2';
    etiquetaEl.textContent = etiqueta;
    el.append(valorEl, etiquetaEl);
    return el;
  }

  function crearAlerta({ tipo = 'info', icono, mensaje }) {
    const el = document.createElement('div');
    el.className = `alerta alerta--${tipo}`;
    const iconoEl = document.createElement('span');
    iconoEl.className = 'alerta__icono';
    iconoEl.setAttribute('aria-hidden', 'true');
    iconoEl.textContent = icono || '!';
    const mensajeEl = document.createElement('span');
    mensajeEl.className = 'texto-nivel-4';
    mensajeEl.textContent = mensaje;
    el.append(iconoEl, mensajeEl);
    return el;
  }

  window.CC2 = window.CC2 || {};
  window.CC2.vista = window.CC2.vista || {};
  window.CC2.vista.componentes = window.CC2.vista.componentes || {};
  window.CC2.vista.componentes.panel = { crearPanel, crearMetrica, crearAlerta };
})();

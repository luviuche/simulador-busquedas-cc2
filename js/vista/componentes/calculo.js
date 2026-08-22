(function () {
  // Panel del cálculo de la dirección: el contenido didáctico central de la
  // transformación de claves (CLAUDE.md 5.3). Vive junto a la estructura y no
  // en el panel lateral, porque lo que se enseña es la correspondencia entre
  // la cuenta y la casilla a la que apunta.
  //
  // No recuerda nada: recibe las líneas ya reveladas por el paso actual y
  // redibuja. Retroceder un paso es, por eso, gratis.
  function crearPanelCalculo() {
    const el = document.createElement('section');
    el.className = 'calculo';

    const titulo = document.createElement('h3');
    titulo.className = 'calculo__titulo texto-nivel-4';
    titulo.textContent = 'Cálculo de la dirección';

    const lista = document.createElement('ol');
    lista.className = 'calculo__lineas';

    el.append(titulo, lista);

    function actualizar(lineas) {
      lista.innerHTML = '';
      if (!lineas || lineas.length === 0) {
        const vacio = document.createElement('li');
        vacio.className = 'calculo__vacio texto-nivel-5';
        vacio.textContent = 'Sin operación en curso.';
        lista.appendChild(vacio);
        return;
      }

      lineas.forEach((linea, indice) => {
        const item = document.createElement('li');
        // La última revelada es la que el paso acaba de producir: marcarla es
        // lo que hace legible el avance cuando la reproducción va rápido.
        const activa = indice === lineas.length - 1;
        item.className = `calculo__linea${activa ? ' calculo__linea--activa' : ''}`;

        const etiqueta = document.createElement('span');
        etiqueta.className = 'calculo__etiqueta texto-nivel-5';
        etiqueta.textContent = linea.etiqueta;

        const expresion = document.createElement('span');
        expresion.className = 'calculo__expresion texto-mono';
        expresion.textContent = linea.expresion;

        const resultado = document.createElement('span');
        resultado.className = 'calculo__resultado texto-mono';
        resultado.textContent = linea.resultado;

        item.append(etiqueta, expresion, resultado);
        lista.appendChild(item);
      });
    }

    actualizar(null);
    return { el, actualizar };
  }

  window.CC2 = window.CC2 || {};
  window.CC2.vista = window.CC2.vista || {};
  window.CC2.vista.componentes = window.CC2.vista.componentes || {};
  window.CC2.vista.componentes.calculo = { crearPanelCalculo };
})();

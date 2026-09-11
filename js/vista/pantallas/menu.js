(function () {
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function formatearFecha(iso) {
    const fecha = new Date(iso);
    return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
  }

  // Los temas no construidos se marcan y siguen respondiendo al clic, para
  // avisar en vez de quedarse mudos (decisión del usuario, 2026-09-11). La
  // marca es siempre la misma —"En desarrollo"—: lo disponible no se
  // rotula, porque en un índice lo normal es que el tema exista.
  function crearEstado() {
    const el = document.createElement('span');
    el.className = 'indice__estado';
    el.textContent = 'En desarrollo';
    return el;
  }

  // El catálogo se lee como el índice de un libro: **todo a la vista**, sin
  // navegar por niveles ni tarjetas que abrir (pedido del usuario, 2026-09-11,
  // sobre maqueta). La jerarquía la dicen la sangría y la tipografía, sobre la
  // división que pide el docente —Búsquedas y Grafos—, y ningún nodo lleva
  // número, en ningún nivel (CLAUDE.md 2).
  //
  // Un renglón de tema es: título · guía de puntos · descripción. La guía es
  // la línea que en un libro lleva del título al número de página; aquí lleva
  // a lo que hay que saber del tema, y por eso ningún renglón la deja colgando
  // sin nada al otro lado.
  function crearRenglonTema(nodo, alSeleccionarTema) {
    const li = document.createElement('li');
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'indice__tema' + (nodo.disponible ? '' : ' indice__tema--pendiente');

    const titulo = document.createElement('span');
    titulo.className = 'indice__tema-titulo';
    titulo.textContent = nodo.titulo;

    const guia = document.createElement('span');
    guia.className = 'indice__guia';
    guia.setAttribute('aria-hidden', 'true');

    boton.append(titulo, guia);

    if (nodo.descripcion) {
      const descripcion = document.createElement('span');
      descripcion.className = 'indice__tema-descripcion texto-nivel-5';
      descripcion.textContent = nodo.descripcion;
      boton.appendChild(descripcion);
    }
    if (!nodo.disponible) boton.appendChild(crearEstado());

    boton.addEventListener('click', () => alSeleccionarTema(nodo));
    li.appendChild(boton);
    return li;
  }

  // Una sección del índice, en la profundidad que le toque. Los tres niveles
  // no son tres componentes: es el mismo, rotulado distinto —parte, grupo y
  // subgrupo sangrado—, porque el catálogo es un árbol y nada garantiza que
  // siempre tenga tres niveles.
  const CLASES_POR_PROFUNDIDAD = ['parte', 'grupo', 'subgrupo'];

  function crearSeccion(nodo, profundidad, alSeleccionarTema) {
    const nivel = CLASES_POR_PROFUNDIDAD[Math.min(profundidad, CLASES_POR_PROFUNDIDAD.length - 1)];
    const seccion = document.createElement('section');
    seccion.className = `indice__${nivel}`;

    const titulo = document.createElement(profundidad === 0 ? 'h2' : profundidad === 1 ? 'h3' : 'h4');
    titulo.className = `indice__${nivel}-titulo`;
    titulo.textContent = nodo.titulo;

    // La descripción de la parte va pegada a su título, en la misma línea: es
    // el subtítulo de la sección y no un párrafo aparte.
    if (profundidad === 0 && nodo.descripcion) {
      const descripcion = document.createElement('span');
      descripcion.className = 'indice__parte-descripcion';
      descripcion.textContent = nodo.descripcion;
      titulo.appendChild(descripcion);
    }
    seccion.appendChild(titulo);

    // Los temas seguidos se juntan en una sola lista y las categorías abren su
    // propia sección, **respetando el orden del catálogo**: en búsquedas
    // internas, secuencial y binaria van antes que transformación de claves.
    let lista = null;
    for (const hijo of nodo.hijos || []) {
      if (hijo.hijos) {
        lista = null;
        seccion.appendChild(crearSeccion(hijo, profundidad + 1, alSeleccionarTema));
        continue;
      }
      if (!lista) {
        lista = document.createElement('ul');
        lista.className = 'indice__lista';
        seccion.appendChild(lista);
      }
      lista.appendChild(crearRenglonTema(hijo, alSeleccionarTema));
    }
    return seccion;
  }

  function crearItemReciente(item) {
    const li = document.createElement('li');
    li.className = 'reciente-item';

    const fila = document.createElement('div');
    fila.className = 'reciente-item__fila';

    const nombre = document.createElement('span');
    nombre.className = 'reciente-item__nombre texto-nivel-3 texto-mono';
    nombre.textContent = item.temaTitulo;

    const fecha = document.createElement('span');
    fecha.className = 'reciente-item__fecha texto-nivel-5';
    fecha.textContent = formatearFecha(item.fecha);

    fila.append(nombre, fecha);

    const detalle = document.createElement('span');
    detalle.className = 'reciente-item__detalle texto-nivel-5';
    detalle.textContent = item.detalle;

    li.append(fila, detalle);
    return li;
  }

  // Las estructuras ya no llevan nombre propio: era el nombre por defecto del
  // archivo .cc2 y guardar quedó para el final del proyecto (CLAUDE.md 10.3),
  // así que una reciente se reconoce por su tema y por los datos con que se
  // creó, que es lo que el estudiante recuerda de ella.
  // **Solo existe si hay recientes** (2026-09-11). Vacío decía "para crear una
  // estructura, seleccione un tema del catálogo" —una obviedad, ahora que el
  // catálogo entero está a la vista— y se quedaba con una columna de 320 px
  // del mejor sitio de la pantalla. Sin recientes no hay columna, y el índice
  // se reparte el ancho.
  function crearPanelRecientes(recientes) {
    const aside = document.createElement('aside');
    aside.className = 'panel pantalla-menu__recientes';

    const titulo = document.createElement('h2');
    titulo.className = 'panel__titulo texto-nivel-2';
    titulo.textContent = 'Estructuras recientes';
    aside.appendChild(titulo);

    const lista = document.createElement('ul');
    lista.className = 'lista-recientes';
    for (const item of recientes) {
      lista.appendChild(crearItemReciente(item));
    }
    aside.appendChild(lista);
    return aside;
  }

  function crearPantallaMenu({ catalogo, recientes, alSeleccionarTema }) {
    const pantalla = document.createElement('div');
    pantalla.className = 'pantalla pantalla-menu-app';

    const barra = document.createElement('header');
    barra.className = 'pantalla-menu__barra';

    const marca = document.createElement('div');
    marca.className = 'pantalla-menu__marca';
    const sigla = document.createElement('span');
    sigla.className = 'texto-nivel-2';
    sigla.textContent = 'CC2';
    const descripcionMarca = document.createElement('span');
    descripcionMarca.className = 'texto-nivel-5';
    descripcionMarca.textContent = ' · Ciencias de la Computación II — Simulador de algoritmos de búsqueda';
    marca.append(sigla, descripcionMarca);

    // **Sin botón de alertas** (2026-09-11). Era un botón fijo para preguntar
    // si había alertas, y casi siempre contestaba que no. Los avisos que sí
    // importan —«tema en construcción»— no salían de ahí: salen solos al
    // pulsar un tema pendiente, y se muestran debajo de esta barra, que es
    // donde siguen saliendo.
    barra.appendChild(marca);

    const cuerpo = document.createElement('div');
    cuerpo.className = 'pantalla-menu__cuerpo';

    // Las dos partes van una al lado de la otra (`indice--columnas`): el
    // catálogo entero en una sola columna mide 1439 px y no cabe en la ventana
    // de proyección de 950, así que Grafos quedaba al fondo y había que
    // desplazar para verlo — justo lo que el índice viene a evitar. A dos
    // columnas mide 1045 y las dos mitades del programa quedan a la misma
    // altura (medido sobre la maqueta, 2026-09-11).
    const columnaCatalogo = document.createElement('div');
    columnaCatalogo.className = 'pantalla-menu__catalogo indice indice--columnas';
    for (const parte of catalogo) {
      columnaCatalogo.appendChild(crearSeccion(parte, 0, alSeleccionarTema));
    }

    cuerpo.appendChild(columnaCatalogo);
    if (recientes.length > 0) {
      cuerpo.appendChild(crearPanelRecientes(recientes));
    } else {
      cuerpo.classList.add('pantalla-menu__cuerpo--solo-catalogo');
    }
    pantalla.append(barra, cuerpo);
    return pantalla;
  }

  window.CC2 = window.CC2 || {};
  window.CC2.vista = window.CC2.vista || {};
  window.CC2.vista.pantallas = window.CC2.vista.pantallas || {};
  window.CC2.vista.pantallas.menu = { crearPantallaMenu };
})();

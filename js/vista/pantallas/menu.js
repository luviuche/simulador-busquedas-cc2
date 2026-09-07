(function () {
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function formatearFecha(iso) {
    const fecha = new Date(iso);
    return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
  }

  function crearInsignia(estado) {
    const el = document.createElement('span');
    const disponible = estado === 'disponible';
    el.className = `insignia insignia--${disponible ? 'disponible' : 'desarrollo'}`;
    el.textContent = disponible ? 'Disponible' : 'En desarrollo';
    return el;
  }

  // El catálogo es un árbol (CLAUDE.md 2 y 12): cada nodo es una categoría
  // navegable (`hijos`) o un tema final (`tema`, la clave que abre `TEMAS`).
  // `nodoEn` resuelve una ruta de ids hasta el nodo que le corresponde, con
  // la raíz virtual `{ hijos: catalogo }` para que una ruta vacía tenga
  // siempre un nodo del que leer `hijos`.
  function nodoEn(catalogo, ruta) {
    let nodo = { hijos: catalogo };
    for (const id of ruta) {
      nodo = (nodo.hijos || []).find((hijo) => hijo.id === id);
      if (!nodo) return null;
    }
    return nodo;
  }

  // Una sola tarjeta sirve para categoría y para tema final: lo único que
  // cambia es el pie. Una categoría dice cuántos subtemas trae y hacia dónde
  // lleva; un tema final solo avisa si aún no está construido. Ninguna lleva
  // número — el docente no quiere ver los temas numerados (CLAUDE.md 2).
  function crearTarjeta(nodo, alSeleccionar) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'tema-item';

    const titulo = document.createElement('span');
    titulo.className = 'tema-item__titulo texto-nivel-3';
    titulo.textContent = nodo.titulo;

    const descripcion = document.createElement('span');
    descripcion.className = 'tema-item__descripcion texto-nivel-5';
    descripcion.textContent = nodo.descripcion || '';

    boton.append(titulo, descripcion);

    const pie = document.createElement('span');
    pie.className = 'tema-item__pie texto-nivel-5';

    if (nodo.hijos) {
      const contador = document.createElement('span');
      contador.textContent = `${nodo.hijos.length} subtema${nodo.hijos.length === 1 ? '' : 's'}`;
      pie.appendChild(contador);
      if (nodo.estado === 'desarrollo') pie.appendChild(crearInsignia(nodo.estado));
      const flecha = document.createElement('span');
      flecha.className = 'tema-item__flecha';
      flecha.textContent = '→';
      pie.appendChild(flecha);
    } else if (!nodo.disponible) {
      pie.appendChild(crearInsignia('desarrollo'));
    }

    if (pie.childNodes.length > 0) boton.appendChild(pie);

    boton.addEventListener('click', () => alSeleccionar(nodo));
    return boton;
  }

  function crearSeparadorMigas() {
    const span = document.createElement('span');
    span.className = 'migas__separador';
    span.textContent = '›';
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  // Migas de pan: reemplazan los botones grandes de sección por sección que
  // no convencían al docente. Cada nivel intermedio es un botón que salta
  // directo a esa profundidad, sin repetir "atrás" una vez por nivel.
  function crearMigas(catalogo, ruta, alNavegar) {
    const nav = document.createElement('nav');
    nav.className = 'migas';

    const raiz = document.createElement('button');
    raiz.type = 'button';
    raiz.className = 'migas__item texto-nivel-4';
    raiz.textContent = 'Catálogo';
    raiz.addEventListener('click', () => alNavegar([]));
    nav.appendChild(raiz);

    let nodo = { hijos: catalogo };
    let acumulada = [];
    for (const id of ruta) {
      nodo = nodo.hijos.find((hijo) => hijo.id === id);
      acumulada = [...acumulada, id];
      nav.appendChild(crearSeparadorMigas());

      if (acumulada.length === ruta.length) {
        const actual = document.createElement('span');
        actual.className = 'migas__actual texto-nivel-4';
        actual.textContent = nodo.titulo;
        nav.appendChild(actual);
      } else {
        const rutaDestino = acumulada;
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'migas__item texto-nivel-4';
        boton.textContent = nodo.titulo;
        boton.addEventListener('click', () => alNavegar(rutaDestino));
        nav.appendChild(boton);
      }
    }
    return nav;
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
  function crearPanelRecientes(recientes) {
    const aside = document.createElement('aside');
    aside.className = 'panel pantalla-menu__recientes';

    const titulo = document.createElement('h2');
    titulo.className = 'panel__titulo texto-nivel-2';
    titulo.textContent = 'Estructuras recientes';
    aside.appendChild(titulo);

    if (recientes.length === 0) {
      const vacio = document.createElement('p');
      vacio.className = 'texto-nivel-5';
      vacio.textContent = 'Para crear una estructura, seleccione un tema del catálogo.';
      aside.appendChild(vacio);
      return aside;
    }

    const lista = document.createElement('ul');
    lista.className = 'lista-recientes';
    for (const item of recientes) {
      lista.appendChild(crearItemReciente(item));
    }
    aside.appendChild(lista);
    return aside;
  }

  function crearPantallaMenu({ catalogo, recientes, alSeleccionarTema, alVerAlertas }) {
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

    const botonAlertas = document.createElement('button');
    botonAlertas.type = 'button';
    botonAlertas.className = 'boton';
    botonAlertas.textContent = 'Alertas del sistema';
    botonAlertas.addEventListener('click', () => alVerAlertas && alVerAlertas());

    barra.append(marca, botonAlertas);

    const cuerpo = document.createElement('div');
    cuerpo.className = 'pantalla-menu__cuerpo';

    const columnaCatalogo = document.createElement('div');
    columnaCatalogo.className = 'pantalla-menu__catalogo';

    // La ruta vive en el closure de la pantalla, igual que el estado de un
    // tema (CLAUDE.md 12): navegar entre categorías repinta solo esta
    // columna, sin tocar la barra ni el panel de recientes.
    let ruta = [];

    function navegarA(nuevaRuta) {
      ruta = nuevaRuta;
      pintarNivel();
    }

    function pintarNivel() {
      const nodo = nodoEn(catalogo, ruta);
      columnaCatalogo.innerHTML = '';

      if (ruta.length > 0) {
        columnaCatalogo.appendChild(crearMigas(catalogo, ruta, navegarA));
      }

      const encabezado = document.createElement('div');
      encabezado.className = 'pantalla-menu__encabezado-nivel';

      const titulo = document.createElement('h2');
      titulo.className = 'texto-nivel-1';
      titulo.textContent = ruta.length === 0 ? 'Catálogo de temas' : nodo.titulo;
      encabezado.appendChild(titulo);

      if (ruta.length > 0 && nodo.descripcion) {
        const descripcion = document.createElement('p');
        descripcion.className = 'texto-nivel-5';
        descripcion.textContent = nodo.descripcion;
        encabezado.appendChild(descripcion);
      }
      columnaCatalogo.appendChild(encabezado);

      const grid = document.createElement('div');
      grid.className = 'grid-tarjetas';
      const hijos = ruta.length === 0 ? catalogo : nodo.hijos;
      for (const hijo of hijos) {
        grid.appendChild(crearTarjeta(hijo, (seleccionado) => {
          if (seleccionado.hijos) {
            navegarA([...ruta, seleccionado.id]);
          } else {
            alSeleccionarTema(seleccionado);
          }
        }));
      }
      columnaCatalogo.appendChild(grid);
    }

    pintarNivel();

    cuerpo.append(columnaCatalogo, crearPanelRecientes(recientes));
    pantalla.append(barra, cuerpo);
    return pantalla;
  }

  window.CC2 = window.CC2 || {};
  window.CC2.vista = window.CC2.vista || {};
  window.CC2.vista.pantallas = window.CC2.vista.pantallas || {};
  window.CC2.vista.pantallas.menu = { crearPantallaMenu };
})();

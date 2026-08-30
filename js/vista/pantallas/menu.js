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

  // Las temáticas no se numeran: el docente pidió que se identifiquen por su
  // nombre. La numeración sobrevive solo en las unidades, que sí son divisiones
  // del programa del curso.
  function crearItemTema(tema, interactivo, alSeleccionarTema) {
    const li = document.createElement('li');
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'tema-item';

    const titulo = document.createElement('span');
    titulo.className = 'tema-item__titulo texto-nivel-3';
    titulo.textContent = tema.titulo;

    const descripcion = document.createElement('span');
    descripcion.className = 'tema-item__descripcion texto-nivel-5';
    descripcion.textContent = tema.descripcion;

    boton.append(titulo, descripcion);
    // Unidad 02 está en desarrollo (CLAUDE.md 12): sus temas no responden al
    // clic. Dentro de la unidad disponible, los temas aún no construidos sí
    // responden, para poder avisar en vez de quedarse mudos.
    if (interactivo) {
      boton.addEventListener('click', () => alSeleccionarTema(tema));
    } else {
      boton.tabIndex = -1;
    }
    li.appendChild(boton);
    return li;
  }

  function crearGrupo(grupo, interactivo, alSeleccionarTema) {
    const contenedor = document.createElement('div');
    contenedor.className = 'grupo-temas';
    const titulo = document.createElement('h3');
    titulo.className = 'texto-nivel-2';
    titulo.textContent = grupo.titulo;
    const lista = document.createElement('ul');
    lista.className = 'lista-temas';
    for (const tema of grupo.temas) {
      lista.appendChild(crearItemTema(tema, interactivo, alSeleccionarTema));
    }
    contenedor.append(titulo, lista);
    return contenedor;
  }

  function crearUnidad(unidad, alSeleccionarTema) {
    const seccion = document.createElement('section');
    const enDesarrollo = unidad.estado === 'desarrollo';
    seccion.className = `unidad${enDesarrollo ? ' unidad--atenuada' : ''}`;

    const encabezado = document.createElement('div');
    encabezado.className = 'unidad__encabezado';

    const etiqueta = document.createElement('span');
    etiqueta.className = 'texto-nivel-5';
    etiqueta.textContent = `Unidad ${unidad.numero}`;

    const titulo = document.createElement('h2');
    titulo.className = 'texto-nivel-1';
    titulo.textContent = unidad.titulo;

    const totalTemas = unidad.grupos.reduce((total, grupo) => total + grupo.temas.length, 0);
    const metadatos = document.createElement('div');
    metadatos.className = 'unidad__metadatos';
    const contador = document.createElement('span');
    contador.className = 'texto-nivel-5';
    contador.textContent = `${totalTemas} temas`;
    metadatos.append(crearInsignia(unidad.estado), contador);

    encabezado.append(etiqueta, titulo, metadatos);
    seccion.appendChild(encabezado);

    for (const grupo of unidad.grupos) {
      seccion.appendChild(crearGrupo(grupo, !enDesarrollo, alSeleccionarTema));
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
    for (const unidad of catalogo) {
      columnaCatalogo.appendChild(crearUnidad(unidad, alSeleccionarTema));
    }

    cuerpo.append(columnaCatalogo, crearPanelRecientes(recientes));
    pantalla.append(barra, cuerpo);
    return pantalla;
  }

  window.CC2 = window.CC2 || {};
  window.CC2.vista = window.CC2.vista || {};
  window.CC2.vista.pantallas = window.CC2.vista.pantallas || {};
  window.CC2.vista.pantallas.menu = { crearPantallaMenu };
})();

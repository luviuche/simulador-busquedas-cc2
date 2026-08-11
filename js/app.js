(function () {
  const dominio = window.CC2.dominio;
  const algoritmos = window.CC2.algoritmos;
  const vista = window.CC2.vista;
  const persistencia = window.CC2.persistencia;

  // Catálogo de módulos (CLAUDE.md 5 y 12). `disponible` refleja el estado
  // real de esta compilación, no el alcance final de la asignatura.
  const CATALOGO = [
    {
      numero: '01',
      titulo: 'ALGORITMOS DE BÚSQUEDA',
      estado: 'disponible',
      grupos: [
        {
          titulo: 'Búsquedas internas',
          modulos: [
            { id: 'secuencial', numero: '01', titulo: 'Búsqueda secuencial', descripcion: 'Recorrido lineal, clave por clave', disponible: true },
            { id: 'binaria', numero: '02', titulo: 'Búsqueda binaria', descripcion: 'División sobre arreglo ordenado', disponible: false }
          ]
        },
        {
          titulo: 'Transformación de claves · funciones hash',
          modulos: [
            { id: 'hash-modulo', numero: '03', titulo: 'Función módulo', descripcion: 'Dirección por residuo de n', disponible: false },
            { id: 'hash-cuadrado', numero: '04', titulo: 'Función cuadrado', descripcion: 'Cifras centrales del cuadrado', disponible: false },
            { id: 'hash-truncamiento', numero: '05', titulo: 'Función truncamiento', descripcion: 'Selección de dígitos de la clave', disponible: false },
            { id: 'hash-plegamiento', numero: '06', titulo: 'Función plegamiento', descripcion: 'Suma de particiones de la clave', disponible: false },
            { id: 'hash-bases', numero: '07', titulo: 'Conversión de bases', descripcion: 'Cambio de base y truncamiento', disponible: false }
          ]
        },
        {
          titulo: 'Otras búsquedas internas',
          modulos: [
            { id: 'residuos', numero: '08', titulo: 'Búsqueda por residuos', descripcion: 'Ramificación por dígitos binarios', disponible: false },
            { id: 'arbol-digital', numero: '09', titulo: 'Árboles de búsqueda digital', descripcion: 'Inserción bit a bit', disponible: false },
            { id: 'residuos-multiples', numero: '10', titulo: 'Residuos múltiples', descripcion: 'Ramificación por bloques de bits', disponible: false },
            { id: 'tablas-indices', numero: '11', titulo: 'Tablas de índices', descripcion: 'Acceso mediante tabla auxiliar', disponible: false },
            { id: 'rejilla', numero: '12', titulo: 'Método de la rejilla', descripcion: 'Partición del espacio en celdas', disponible: false },
            { id: 'arbol-2d', numero: '13', titulo: 'Árboles 2D', descripcion: 'Búsqueda en dos dimensiones', disponible: false }
          ]
        }
      ]
    },
    {
      numero: '02',
      titulo: 'ESTRUCTURAS AVANZADAS',
      estado: 'desarrollo',
      grupos: [
        {
          titulo: 'Búsquedas externas',
          modulos: [
            { id: 'externa-sec-bin', numero: '14', titulo: 'Búsqueda secuencial y binaria externa', descripcion: '', disponible: false },
            { id: 'indices', numero: '15', titulo: 'Índices primarios, secundarios y multinivel', descripcion: '', disponible: false }
          ]
        },
        {
          titulo: 'Grafos',
          modulos: [
            { id: 'grafos-def', numero: '16', titulo: 'Definiciones, recorridos e isomorfismo', descripcion: '', disponible: false },
            { id: 'grafos-euler', numero: '17', titulo: 'Circuitos de Euler y Hamilton', descripcion: '', disponible: false },
            { id: 'grafos-operaciones', numero: '18', titulo: 'Operaciones entre grafos', descripcion: '', disponible: false },
            { id: 'grafos-expansion', numero: '19', titulo: 'Árboles de expansión — Prim y Kruskal', descripcion: '', disponible: false },
            { id: 'grafos-corte', numero: '20', titulo: 'Conjuntos de corte y conectividad', descripcion: '', disponible: false },
            { id: 'grafos-matricial', numero: '21', titulo: 'Representación matricial', descripcion: '', disponible: false },
            { id: 'grafos-coloreado', numero: '22', titulo: 'Coloreado y particionamiento', descripcion: '', disponible: false },
            { id: 'grafos-pareamientos', numero: '23', titulo: 'Pareamientos y envolventes', descripcion: '', disponible: false }
          ]
        }
      ]
    }
  ];

  const estado = {
    estructura: null,
    reproductor: null,
    pasoActual: null,
    mostrarCompleta: false
  };

  let elementosDom = {};

  function horaActual() {
    return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function registrarBitacora(mensaje) {
    vista.componentes.bitacora.agregarEntrada(elementosDom.bitacora, { hora: horaActual(), mensaje });
  }

  function mostrarAlerta(tipo, mensaje) {
    elementosDom.alertas.innerHTML = '';
    const icono = tipo === 'error' ? '✕' : tipo === 'advertencia' ? '!' : 'i';
    elementosDom.alertas.appendChild(vista.componentes.panel.crearAlerta({ tipo, mensaje, icono }));
  }

  function limpiarAlerta() {
    elementosDom.alertas.innerHTML = '';
  }

  function requiereEstructura() {
    if (!estado.estructura) {
      mostrarAlerta('error', 'Estructura no inicializada: no existen claves para procesar.');
      return false;
    }
    return true;
  }

  function invalidarReproduccion() {
    if (estado.reproductor) estado.reproductor.detener();
    estado.reproductor = null;
    estado.pasoActual = null;
    if (elementosDom.seccionReproduccion) elementosDom.seccionReproduccion.hidden = true;
  }

  function renderizarEstructura(paso) {
    const claves = estado.estructura.claves;
    const n = estado.estructura.n;
    const relevantes = paso && paso.casilla ? [paso.casilla] : [];
    const segmentos = vista.elision.calcularSegmentos({
      n,
      relevantes,
      orientacion: 'horizontal',
      mostrarCompleta: estado.mostrarCompleta
    });

    vista.animacion.animarFlip(elementosDom.estructuraEl, () => {
      elementosDom.estructuraEl.innerHTML = '';
      elementosDom.escalaEl.innerHTML = '';
      for (const segmento of segmentos) {
        if (segmento.tipo === 'tramo') {
          const tramoEl = document.createElement('div');
          tramoEl.className = 'tramo-elidido';
          tramoEl.textContent = `⋯ ${segmento.cantidad} ⋯`;
          elementosDom.estructuraEl.appendChild(tramoEl);
          continue;
        }

        const indice = segmento.indice;
        const clave = claves[indice - 1];
        let estadoCasilla = clave === undefined ? 'vacia' : 'ocupada';
        if (paso && paso.casilla === indice) {
          if (paso.tipo === 'encontrada') estadoCasilla = 'encontrada';
          else if (paso.tipo === 'comparacion') estadoCasilla = 'en-evaluacion';
        }

        const casillaEl = vista.componentes.casilla.crearCasilla({ clave, indice, estado: estadoCasilla });
        elementosDom.estructuraEl.appendChild(casillaEl);

        const marcaEl = document.createElement('span');
        marcaEl.className = (indice === 1 || indice === n || indice % 5 === 0) ? 'escala__marca--mayor' : '';
        marcaEl.textContent = String(indice);
        elementosDom.escalaEl.appendChild(marcaEl);
      }
    });
  }

  function actualizarMetricas(paso) {
    elementosDom.valorComparaciones.textContent = paso ? String(paso.comparaciones) : '0';
    elementosDom.valorAccesos.textContent = paso ? String(paso.accesos) : '0';
  }

  function insertarClave(texto) {
    const validacion = dominio.clave.validarClaveNumerica(texto, estado.estructura.L);
    if (!validacion.valido) {
      mostrarAlerta('error', validacion.mensaje);
      return;
    }
    const resultado = dominio.estructura.insertar(estado.estructura, validacion.valor);
    if (!resultado.exito) {
      mostrarAlerta('error', resultado.mensaje);
      return;
    }
    limpiarAlerta();
    invalidarReproduccion();
    registrarBitacora(`Clave insertada: ${validacion.valor} en la casilla ${resultado.indice}.`);
    renderizarEstructura(null);
    actualizarMetricas(null);
  }

  // Llenado numérico (CLAUDE.md 12: el alfabético queda diferido). Inserta de
  // a una para que la animación de inserción se vea, no un salto al estado final.
  function llenarAutomaticamente() {
    const { min, max } = dominio.limites.rangoValido(estado.estructura.L);
    const objetivo = estado.estructura.n - estado.estructura.claves.length;
    if (objetivo <= 0) {
      mostrarAlerta('error', `Estructura saturada: capacidad máxima de ${estado.estructura.n} casillas alcanzada.`);
      return;
    }
    limpiarAlerta();
    invalidarReproduccion();
    let insertadas = 0;
    let intentos = 0;

    function insertarSiguiente() {
      if (insertadas >= objetivo || intentos >= objetivo * 50) {
        registrarBitacora(`Llenado automático: ${insertadas} claves insertadas.`);
        return;
      }
      intentos++;
      const candidato = Math.floor(Math.random() * (max - min + 1)) + min;
      const resultado = dominio.estructura.insertar(estado.estructura, candidato);
      if (resultado.exito) {
        insertadas++;
        renderizarEstructura(null);
        actualizarMetricas(null);
        setTimeout(insertarSiguiente, 150);
        return;
      }
      setTimeout(insertarSiguiente, 0);
    }

    insertarSiguiente();
  }

  function iniciarBusqueda(texto) {
    const validacion = dominio.clave.validarClaveNumerica(texto, estado.estructura.L);
    if (!validacion.valido) {
      mostrarAlerta('error', validacion.mensaje);
      return;
    }
    limpiarAlerta();
    invalidarReproduccion();

    const pasos = algoritmos.secuencial.buscarSecuencial(estado.estructura.claves, validacion.valor);
    elementosDom.seccionReproduccion.hidden = false;
    registrarBitacora(`Búsqueda iniciada: clave objetivo ${validacion.valor}.`);

    estado.reproductor = vista.reproductor.crearReproductor({
      pasos,
      velocidadMs: Number(elementosDom.controlVelocidad.value),
      alCambiarPaso: (paso) => {
        estado.pasoActual = paso;
        renderizarEstructura(paso);
        actualizarMetricas(paso);
        if (paso) registrarBitacora(paso.mensaje);
      }
    });
    estado.reproductor.siguientePaso();
  }

  function crearFormularioConfiguracion() {
    const contenedor = document.createElement('form');
    contenedor.className = 'panel';
    contenedor.innerHTML = `
      <h2 class="panel__titulo texto-nivel-2">Configuración de la estructura</h2>
      <label class="texto-nivel-3">Nombre de la estructura
        <input type="text" name="nombre" required>
      </label>
      <label class="texto-nivel-3">Tamaño de la estructura (n)
        <input type="number" name="n" min="1" required>
      </label>
      <label class="texto-nivel-3">Longitud de clave (L)
        <input type="number" name="L" min="1" required>
      </label>
      <div class="pantalla-modulo__controles">
        <button type="submit" class="boton boton--primario">Crear estructura</button>
      </div>
    `;
    contenedor.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const datos = new FormData(contenedor);
      const nombre = String(datos.get('nombre')).trim();
      const n = Number(datos.get('n'));
      const L = Number(datos.get('L'));
      const resultado = dominio.estructura.crearEstructura({ n, L, tipoClave: 'numerica' });
      if (!resultado.exito) {
        mostrarAlerta('error', resultado.mensaje);
        return;
      }
      resultado.estructura.nombre = nombre;
      estado.estructura = resultado.estructura;
      invalidarReproduccion();
      limpiarAlerta();
      if (resultado.advertencia) mostrarAlerta('advertencia', resultado.advertencia);
      registrarBitacora(`Estructura creada: n = ${n}, L = ${L}.`);
      persistencia.recientes.registrar({ nombre, moduloTitulo: 'Búsqueda secuencial', n, L });
      renderizarEstructura(null);
      actualizarMetricas(null);
    });
    return contenedor;
  }

  function crearFormularioInsercion() {
    const contenedor = document.createElement('form');
    contenedor.className = 'panel';
    contenedor.innerHTML = `
      <h2 class="panel__titulo texto-nivel-2">Insertar clave</h2>
      <label class="texto-nivel-3">Clave
        <input type="text" name="clave" inputmode="numeric" required>
      </label>
      <div class="pantalla-modulo__controles">
        <button type="submit" class="boton boton--primario">Insertar clave</button>
        <button type="button" class="boton" data-accion="llenado-automatico">Llenado automático</button>
      </div>
    `;
    contenedor.addEventListener('submit', (evento) => {
      evento.preventDefault();
      if (!requiereEstructura()) return;
      const datos = new FormData(contenedor);
      insertarClave(String(datos.get('clave')));
      contenedor.reset();
    });
    contenedor.querySelector('[data-accion="llenado-automatico"]').addEventListener('click', () => {
      if (!requiereEstructura()) return;
      llenarAutomaticamente();
    });
    return contenedor;
  }

  function crearPanelBusqueda() {
    const contenedor = document.createElement('form');
    contenedor.className = 'panel';
    contenedor.innerHTML = `
      <h2 class="panel__titulo texto-nivel-2">Buscar clave</h2>
      <label class="texto-nivel-3">Clave objetivo
        <input type="text" name="objetivo" inputmode="numeric" required>
      </label>
      <div class="pantalla-modulo__controles">
        <button type="submit" class="boton boton--primario">Buscar clave</button>
      </div>
      <div class="pantalla-modulo__controles" data-seccion="reproduccion" hidden>
        <button type="button" class="boton" data-accion="anterior">◀ Paso anterior</button>
        <button type="button" class="boton" data-accion="siguiente">Paso siguiente ▶</button>
        <button type="button" class="boton" data-accion="reproducir">Reproducir</button>
        <button type="button" class="boton" data-accion="detener">Detener</button>
        <label class="texto-nivel-5">Velocidad
          <input type="range" min="200" max="2000" step="100" value="800" data-control="velocidad">
        </label>
      </div>
    `;

    contenedor.addEventListener('submit', (evento) => {
      evento.preventDefault();
      if (!requiereEstructura()) return;
      const datos = new FormData(contenedor);
      iniciarBusqueda(String(datos.get('objetivo')));
    });

    contenedor.querySelector('[data-accion="anterior"]').addEventListener('click', () => {
      if (estado.reproductor) estado.reproductor.pasoAnterior();
    });
    contenedor.querySelector('[data-accion="siguiente"]').addEventListener('click', () => {
      if (estado.reproductor) estado.reproductor.siguientePaso();
    });
    contenedor.querySelector('[data-accion="reproducir"]').addEventListener('click', () => {
      if (estado.reproductor) estado.reproductor.reproducirContinuo();
    });
    contenedor.querySelector('[data-accion="detener"]').addEventListener('click', () => {
      if (estado.reproductor) estado.reproductor.detener();
    });

    elementosDom.seccionReproduccion = contenedor.querySelector('[data-seccion="reproduccion"]');
    elementosDom.controlVelocidad = contenedor.querySelector('[data-control="velocidad"]');
    elementosDom.controlVelocidad.addEventListener('input', (evento) => {
      if (estado.reproductor) estado.reproductor.establecerVelocidad(Number(evento.target.value));
    });

    return contenedor;
  }

  function crearPanelMetricas() {
    const contenedorMetricas = document.createElement('div');
    contenedorMetricas.className = 'pantalla-modulo__metricas';
    const metricaComparaciones = vista.componentes.panel.crearMetrica({ etiqueta: 'Comparaciones', valor: 0 });
    const metricaAccesos = vista.componentes.panel.crearMetrica({ etiqueta: 'Accesos', valor: 0 });
    contenedorMetricas.append(metricaComparaciones, metricaAccesos);

    elementosDom.valorComparaciones = metricaComparaciones.querySelector('.metrica__valor');
    elementosDom.valorAccesos = metricaAccesos.querySelector('.metrica__valor');

    return vista.componentes.panel.crearPanel({ titulo: 'Métricas', contenido: contenedorMetricas });
  }

  function crearControlElision() {
    const etiqueta = document.createElement('label');
    etiqueta.className = 'texto-nivel-5';
    etiqueta.innerHTML = `<input type="checkbox" data-control="mostrar-completa"> Ver estructura completa`;
    etiqueta.querySelector('input').addEventListener('change', (evento) => {
      estado.mostrarCompleta = evento.target.checked;
      if (estado.estructura) renderizarEstructura(estado.pasoActual);
    });
    return etiqueta;
  }

  function construirEncabezadoModulo({ numero, titulo, descripcion, alVolver }) {
    const encabezado = document.createElement('header');
    encabezado.className = 'pantalla-modulo__encabezado';

    const botonVolver = document.createElement('button');
    botonVolver.type = 'button';
    botonVolver.className = 'pantalla-modulo__volver texto-nivel-4';
    botonVolver.textContent = '← Menú';
    botonVolver.addEventListener('click', alVolver);

    const rotulo = document.createElement('span');
    rotulo.className = 'pantalla-modulo__rotulo texto-nivel-2';
    rotulo.textContent = `Módulo ${numero}`;

    const tituloEl = document.createElement('h1');
    tituloEl.className = 'texto-nivel-1';
    tituloEl.textContent = titulo;

    const subtituloEl = document.createElement('span');
    subtituloEl.className = 'pantalla-modulo__subtitulo texto-nivel-5';
    subtituloEl.textContent = descripcion;

    encabezado.append(botonVolver, rotulo, tituloEl, subtituloEl);
    return encabezado;
  }

  function construirPantallaSecuencial(alVolver) {
    elementosDom = {};

    const pantalla = document.createElement('div');
    pantalla.className = 'pantalla pantalla-modulo';

    const encabezado = construirEncabezadoModulo({
      numero: '01',
      titulo: 'BÚSQUEDA SECUENCIAL',
      descripcion: 'Recorrido lineal, clave por clave',
      alVolver
    });

    const lienzo = document.createElement('div');
    lienzo.className = 'pantalla-modulo__lienzo';
    elementosDom.estructuraEl = document.createElement('div');
    elementosDom.estructuraEl.className = 'estructura-horizontal';
    elementosDom.escalaEl = document.createElement('div');
    elementosDom.escalaEl.className = 'escala';
    lienzo.append(crearControlElision(), elementosDom.estructuraEl, elementosDom.escalaEl);

    const panelLateral = document.createElement('div');
    panelLateral.className = 'pantalla-modulo__panel-lateral';

    elementosDom.alertas = document.createElement('div');

    const formConfig = crearFormularioConfiguracion();
    const formInsercion = crearFormularioInsercion();
    const panelBusqueda = crearPanelBusqueda();
    const panelMetricas = crearPanelMetricas();
    elementosDom.bitacora = vista.componentes.bitacora.crearBitacora();
    const panelBitacora = vista.componentes.panel.crearPanel({ titulo: 'Bitácora', contenido: elementosDom.bitacora });

    panelLateral.append(elementosDom.alertas, formConfig, formInsercion, panelBusqueda, panelMetricas, panelBitacora);
    pantalla.append(encabezado, lienzo, panelLateral);

    montarPantalla(pantalla);
  }

  function montarPantalla(pantalla) {
    const raiz = document.getElementById('app');
    raiz.innerHTML = '';
    raiz.appendChild(pantalla);
  }

  function mostrarModulo(modulo) {
    if (!modulo.disponible) {
      mostrarAlertaMenu('info', `Módulo en construcción: "${modulo.titulo}" aún no está implementado.`);
      return;
    }
    if (modulo.id === 'secuencial') {
      construirPantallaSecuencial(mostrarMenu);
    }
  }

  let elementosDomMenu = {};

  function mostrarAlertaMenu(tipo, mensaje) {
    if (!elementosDomMenu.alertas) return;
    elementosDomMenu.alertas.innerHTML = '';
    const icono = tipo === 'error' ? '✕' : tipo === 'advertencia' ? '!' : 'i';
    elementosDomMenu.alertas.appendChild(vista.componentes.panel.crearAlerta({ tipo, mensaje, icono }));
  }

  function mostrarMenu() {
    elementosDomMenu = { alertas: document.createElement('div') };

    const pantalla = vista.pantallas.menu.crearPantallaMenu({
      catalogo: CATALOGO,
      recientes: persistencia.recientes.obtener(),
      alSeleccionarModulo: mostrarModulo,
      alVerAlertas: () => mostrarAlertaMenu('info', 'Sin alertas activas en esta sesión.')
    });

    const barra = pantalla.querySelector('.pantalla-menu__barra');
    barra.after(elementosDomMenu.alertas);

    montarPantalla(pantalla);
  }

  document.addEventListener('DOMContentLoaded', mostrarMenu);
})();

(function () {
  const dominio = window.CC2.dominio;
  const vista = window.CC2.vista;
  const persistencia = window.CC2.persistencia;

  // Pantalla de trabajo común a los temas de búsqueda interna. Secuencial la
  // estrenó; binaria la reutiliza (CLAUDE.md 12). Lo único que cambia entre
  // temas entra por `config`; todo lo demás —configurar, insertar, llenar,
  // reproducir, elidir, bitácora— vive aquí una sola vez.
  //
  // config = {
  //   titulo, descripcion, orientacion,
  //   buscar(claves, objetivo) -> pasos,
  //   casillasRelevantes(paso) -> [indices base 1],
  //   describirCasilla({ paso, indice, ocupada }) -> { estado, modificadores },
  //   metricas: [{ id, etiqueta, valor({ estructura, paso }) -> string }]
  // }
  function crearPantallaTema(config, alVolver) {
    const estado = {
      estructura: null,
      reproductor: null,
      pasoActual: null,
      indicePaso: -1,
      // Traza en curso y columnas del apilado; ambas viven mientras dure la
      // búsqueda y se descartan al invalidarla.
      pasos: null,
      segmentosApilado: null,
      mostrarCompleta: false
    };
    const dom = { metricas: {} };

    function horaActual() {
      return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function registrarBitacora(mensaje) {
      vista.componentes.bitacora.agregarEntrada(dom.bitacora, { hora: horaActual(), mensaje });
    }

    function mostrarAlerta(tipo, mensaje) {
      dom.alertas.innerHTML = '';
      const icono = tipo === 'error' ? '✕' : tipo === 'advertencia' ? '!' : 'i';
      dom.alertas.appendChild(vista.componentes.panel.crearAlerta({ tipo, mensaje, icono }));
    }

    function limpiarAlerta() {
      dom.alertas.innerHTML = '';
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
      estado.indicePaso = -1;
      estado.pasos = null;
      estado.segmentosApilado = null;
      if (dom.seccionReproduccion) dom.seccionReproduccion.hidden = true;
    }

    function esMarcaMayor(indice, n) {
      return indice === 1 || indice === n || indice % 5 === 0;
    }

    function crearMarca(indice, n) {
      const el = document.createElement('span');
      el.className = 'escala__marca' + (esMarcaMayor(indice, n) ? ' escala__marca--mayor' : '');
      el.textContent = String(indice);
      return el;
    }

    function crearTramo(desde, hasta) {
      const el = document.createElement('div');
      el.className = 'tramo-elidido';
      el.textContent = `⋯ ${hasta - desde + 1} ⋯`;
      return el;
    }

    function segmentosDe(relevantes) {
      return vista.elision.calcularSegmentos({
        n: estado.estructura.n,
        relevantes,
        orientacion: config.orientacion || 'horizontal',
        mostrarCompleta: estado.mostrarCompleta
      });
    }

    // Vista de una sola estructura: la que usan los temas que no acumulan
    // (secuencial), y también binaria mientras no hay una búsqueda en curso.
    function renderizarFilaUnica(paso) {
      const claves = estado.estructura.claves;
      const n = estado.estructura.n;
      const segmentos = segmentosDe(paso ? config.casillasRelevantes(paso) : []);

      // Casilla y marca de la escala se dibujan en la misma columna: es lo que
      // mantiene la numeración alineada con lo que rotula cuando hay elisión
      // y los tramos comprimidos tienen ancho propio (CLAUDE.md 6.4).
      vista.animacion.animarFlip(dom.estructuraEl, () => {
        dom.estructuraEl.className = 'estructura-horizontal';
        dom.estructuraEl.removeAttribute('style');
        dom.estructuraEl.innerHTML = '';

        for (const segmento of segmentos) {
          const columna = document.createElement('div');
          columna.className = 'columna-casilla';

          if (segmento.tipo === 'tramo') {
            const marcaEl = document.createElement('span');
            marcaEl.className = 'escala__marca escala__marca--tramo';
            marcaEl.textContent = `${segmento.desde}–${segmento.hasta}`;
            columna.append(crearTramo(segmento.desde, segmento.hasta), marcaEl);
            dom.estructuraEl.appendChild(columna);
            continue;
          }

          const indice = segmento.indice;
          const clave = claves[indice - 1];
          const descripcion = config.describirCasilla({ paso, indice, ocupada: clave !== undefined });

          columna.append(
            vista.componentes.casilla.crearCasilla({
              clave,
              indice,
              estado: descripcion.estado,
              modificadores: descripcion.modificadores
            }),
            crearMarca(indice, n)
          );
          dom.estructuraEl.appendChild(columna);
        }
      });
    }

    // Vista apilada: una estructura por paso, cada una con solo el tramo que
    // sobrevivió al descarte (pedido del docente). Todas las filas comparten
    // un único grid —no un grid por fila— porque es lo que alinea cada casilla
    // con su posición real en la estructura original; con grids independientes
    // las columnas no se corresponden entre filas.
    //
    // Los segmentos se calculan una sola vez, sobre las casillas relevantes de
    // la traza completa, para que las columnas no se muevan mientras el
    // estudiante avanza los pasos.
    function renderizarApilado(indicePaso) {
      const claves = estado.estructura.claves;
      const n = estado.estructura.n;
      const segmentos = estado.segmentosApilado;

      dom.estructuraEl.className = 'estructura-apilada';
      dom.estructuraEl.style.gridTemplateColumns = `auto repeat(${segmentos.length}, minmax(40px, max-content))`;
      dom.estructuraEl.innerHTML = '';

      const elementosUltimaFila = [];
      const agregar = (orden, ...elementos) => {
        dom.estructuraEl.append(...elementos);
        if (orden === indicePaso) elementosUltimaFila.push(...elementos);
      };

      for (let orden = 0; orden <= indicePaso; orden++) {
        const paso = estado.pasos[orden];
        const rango = config.apilada.rangoDePaso(paso);
        const filaCasillas = orden * 2 + 1;

        const rotulo = document.createElement('span');
        rotulo.className = 'apilada__rotulo texto-nivel-5';
        rotulo.textContent = `Paso ${orden + 1}`;
        rotulo.style.gridColumn = '1';
        rotulo.style.gridRow = `${filaCasillas} / span 2`;
        agregar(orden, rotulo);

        // El paso final sin rango es el que agotó la búsqueda: no queda
        // estructura que dibujar, y decirlo es más claro que una fila vacía.
        if (!rango) {
          const cierre = document.createElement('span');
          cierre.className = 'apilada__cierre texto-nivel-5';
          cierre.textContent = 'Rango vacío: no quedan casillas por examinar.';
          cierre.style.gridColumn = `2 / span ${segmentos.length}`;
          cierre.style.gridRow = `${filaCasillas} / span 2`;
          agregar(orden, cierre);
          continue;
        }

        segmentos.forEach((segmento, posicion) => {
          const columna = String(posicion + 2);

          if (segmento.tipo === 'tramo') {
            const desde = Math.max(segmento.desde, rango.desde);
            const hasta = Math.min(segmento.hasta, rango.hasta);
            if (desde > hasta) return;

            const tramoEl = crearTramo(desde, hasta);
            tramoEl.style.gridColumn = columna;
            tramoEl.style.gridRow = String(filaCasillas);

            const marcaEl = document.createElement('span');
            marcaEl.className = 'escala__marca escala__marca--tramo';
            marcaEl.textContent = desde === hasta ? String(desde) : `${desde}–${hasta}`;
            marcaEl.style.gridColumn = columna;
            marcaEl.style.gridRow = String(filaCasillas + 1);

            agregar(orden, tramoEl, marcaEl);
            return;
          }

          const indice = segmento.indice;
          if (indice < rango.desde || indice > rango.hasta) return;

          const clave = claves[indice - 1];
          const descripcion = config.describirCasilla({ paso, indice, ocupada: clave !== undefined });
          // El corchete de rango sobra aquí: la fila entera ya es el rango.
          const casillaEl = vista.componentes.casilla.crearCasilla({
            clave,
            indice,
            estado: descripcion.estado
          });
          casillaEl.style.gridColumn = columna;
          casillaEl.style.gridRow = String(filaCasillas);

          const marcaEl = crearMarca(indice, n);
          marcaEl.style.gridColumn = columna;
          marcaEl.style.gridRow = String(filaCasillas + 1);

          agregar(orden, casillaEl, marcaEl);
        });
      }

      // Solo la fila recién agregada entra animada; las anteriores ya estaban.
      if (!vista.animacion.prefiereMovimientoReducido()) {
        for (const el of elementosUltimaFila) {
          vista.animacion.reemplazarAnimacion(el, [
            { opacity: 0, transform: 'translateY(-6px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ], { duration: 180, easing: 'ease-out' });
        }
      }

      dom.estructuraEl.scrollTop = dom.estructuraEl.scrollHeight;
    }

    function renderizarEstructura(paso, indicePaso) {
      if (config.apilada && estado.pasos && indicePaso >= 0) {
        renderizarApilado(indicePaso);
        return;
      }
      renderizarFilaUnica(paso);
    }

    // Las columnas del apilado se fijan una vez por búsqueda, con las casillas
    // relevantes de la traza entera: si se recalcularan paso a paso, las
    // columnas se moverían bajo las filas ya dibujadas.
    function calcularSegmentosApilado() {
      if (!config.apilada || !estado.pasos) return;
      const relevantes = [];
      for (const paso of estado.pasos) {
        relevantes.push(...config.casillasRelevantes(paso));
      }
      estado.segmentosApilado = segmentosDe(relevantes);
    }

    function actualizarMetricas(paso) {
      for (const metrica of config.metricas) {
        dom.metricas[metrica.id].textContent = metrica.valor({ estructura: estado.estructura, paso });
      }
    }

    function insertarClave(texto) {
      const validacion = dominio.clave.validarClaveNumerica(texto, estado.estructura.l);
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
      const { min, max } = dominio.limites.rangoValido(estado.estructura.l);
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
      const validacion = dominio.clave.validarClaveNumerica(texto, estado.estructura.l);
      if (!validacion.valido) {
        mostrarAlerta('error', validacion.mensaje);
        return;
      }
      if (dominio.estructura.estaVacia(estado.estructura)) {
        mostrarAlerta('error', 'Estructura no inicializada: no existen claves para procesar.');
        return;
      }
      limpiarAlerta();
      invalidarReproduccion();

      const pasos = config.buscar(estado.estructura.claves, validacion.valor);
      estado.pasos = pasos;
      calcularSegmentosApilado();
      dom.seccionReproduccion.hidden = false;
      registrarBitacora(`Búsqueda iniciada: clave objetivo ${validacion.valor}.`);

      estado.reproductor = vista.reproductor.crearReproductor({
        pasos,
        velocidadMs: Number(dom.controlVelocidad.value),
        alCambiarPaso: (paso, indice) => {
          estado.pasoActual = paso;
          estado.indicePaso = indice;
          renderizarEstructura(paso, indice);
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
        <label class="texto-nivel-3">Longitud de clave (l)
          <input type="number" name="l" min="1" required>
        </label>
        <div class="pantalla-tema__controles">
          <button type="submit" class="boton boton--primario">Crear estructura</button>
        </div>
      `;
      contenedor.addEventListener('submit', (evento) => {
        evento.preventDefault();
        const datos = new FormData(contenedor);
        const nombre = String(datos.get('nombre')).trim();
        const n = Number(datos.get('n'));
        const l = Number(datos.get('l'));
        const resultado = dominio.estructura.crearEstructura({ n, l, tipoClave: 'numerica' });
        if (!resultado.exito) {
          mostrarAlerta('error', resultado.mensaje);
          return;
        }
        resultado.estructura.nombre = nombre;
        estado.estructura = resultado.estructura;
        invalidarReproduccion();
        limpiarAlerta();
        if (resultado.advertencia) mostrarAlerta('advertencia', resultado.advertencia);
        registrarBitacora(`Estructura creada: n = ${n}, l = ${l}.`);
        persistencia.recientes.registrar({ nombre, temaTitulo: config.titulo, n, l });
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
        <div class="pantalla-tema__controles">
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
        <div class="pantalla-tema__controles">
          <button type="submit" class="boton boton--primario">Buscar clave</button>
        </div>
        <div class="pantalla-tema__controles" data-seccion="reproduccion" hidden>
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

      dom.seccionReproduccion = contenedor.querySelector('[data-seccion="reproduccion"]');
      dom.controlVelocidad = contenedor.querySelector('[data-control="velocidad"]');
      dom.controlVelocidad.addEventListener('input', (evento) => {
        if (estado.reproductor) estado.reproductor.establecerVelocidad(Number(evento.target.value));
      });

      return contenedor;
    }

    function crearPanelMetricas() {
      const contenedorMetricas = document.createElement('div');
      contenedorMetricas.className = 'pantalla-tema__metricas';

      for (const metrica of config.metricas) {
        const el = vista.componentes.panel.crearMetrica({
          etiqueta: metrica.etiqueta,
          valor: metrica.valor({ estructura: null, paso: null })
        });
        dom.metricas[metrica.id] = el.querySelector('.metrica__valor');
        contenedorMetricas.appendChild(el);
      }

      return vista.componentes.panel.crearPanel({ titulo: 'Métricas', contenido: contenedorMetricas });
    }

    function crearControlElision() {
      const etiqueta = document.createElement('label');
      etiqueta.className = 'lienzo__control texto-nivel-5';
      etiqueta.innerHTML = `<input type="checkbox" data-control="mostrar-completa"> Ver estructura completa`;
      etiqueta.querySelector('input').addEventListener('change', (evento) => {
        estado.mostrarCompleta = evento.target.checked;
        if (!estado.estructura) return;
        calcularSegmentosApilado();
        renderizarEstructura(estado.pasoActual, estado.indicePaso);
      });
      return etiqueta;
    }

    // Sin rótulo ni numeración: el tema se identifica por su nombre.
    function crearEncabezado() {
      const encabezado = document.createElement('header');
      encabezado.className = 'pantalla-tema__encabezado';

      const botonVolver = document.createElement('button');
      botonVolver.type = 'button';
      botonVolver.className = 'pantalla-tema__volver texto-nivel-4';
      botonVolver.textContent = '← Menú';
      botonVolver.addEventListener('click', () => {
        invalidarReproduccion();
        alVolver();
      });

      const tituloEl = document.createElement('h1');
      tituloEl.className = 'texto-nivel-1';
      tituloEl.textContent = config.titulo;

      const subtituloEl = document.createElement('span');
      subtituloEl.className = 'pantalla-tema__subtitulo texto-nivel-5';
      subtituloEl.textContent = config.descripcion;

      encabezado.append(botonVolver, tituloEl, subtituloEl);
      return encabezado;
    }

    const pantalla = document.createElement('div');
    pantalla.className = 'pantalla pantalla-tema';

    const lienzo = document.createElement('div');
    lienzo.className = 'pantalla-tema__lienzo';
    dom.estructuraEl = document.createElement('div');
    dom.estructuraEl.className = 'estructura-horizontal';
    lienzo.append(crearControlElision(), dom.estructuraEl);

    const panelLateral = document.createElement('div');
    panelLateral.className = 'pantalla-tema__panel-lateral';
    dom.alertas = document.createElement('div');
    dom.bitacora = vista.componentes.bitacora.crearBitacora();

    panelLateral.append(
      dom.alertas,
      crearFormularioConfiguracion(),
      crearFormularioInsercion(),
      crearPanelBusqueda(),
      crearPanelMetricas(),
      vista.componentes.panel.crearPanel({ titulo: 'Bitácora', contenido: dom.bitacora })
    );

    pantalla.append(crearEncabezado(), lienzo, panelLateral);
    return pantalla;
  }

  window.CC2 = window.CC2 || {};
  window.CC2.vista = window.CC2.vista || {};
  window.CC2.vista.pantallas = window.CC2.vista.pantallas || {};
  window.CC2.vista.pantallas.temaBusqueda = { crearPantallaTema };
})();

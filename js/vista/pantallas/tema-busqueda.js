(function () {
  const dominio = window.CC2.dominio;
  const vista = window.CC2.vista;
  const persistencia = window.CC2.persistencia;

  // Pantalla de trabajo común a los temas de búsqueda interna. Secuencial la
  // estrenó; binaria y la transformación de claves la reutilizan (CLAUDE.md 12).
  // Lo único que cambia entre temas entra por `config`; todo lo demás
  // —configurar, insertar, llenar, reproducir, elidir, bitácora— vive aquí una
  // sola vez.
  //
  // config = {
  //   titulo, descripcion, orientacion, modo,
  //   buscar({ estructura, objetivo }) -> pasos,
  //   insertar({ estructura, clave }) -> pasos,   // opcional: inserción con traza
  //   tratamientos: [{ valor, etiqueta }],        // opcional: selector al crear
  //   calculo: bool,                              // opcional: panel de cálculo
  //   casillasRelevantes(paso) -> [indices base 1],
  //   describirCasilla({ paso, indice, ocupada }) -> { estado, modificadores },
  //   apilada: { rangoDePaso(paso) },             // opcional: una fila por paso
  //   metricas: [{ id, etiqueta, valor({ estructura, paso }) -> string }]
  // }
  //
  // Los temas que declaran `insertar` convierten la inserción en una operación
  // reproducible: la traza no toca la estructura y es esta pantalla la que
  // aplica el efecto al llegar al paso que coloca la clave, y lo deshace al
  // retroceder (ver `sincronizarEfecto`).
  function crearPantallaTema(config, alVolver) {
    const estado = {
      estructura: null,
      reproductor: null,
      pasoActual: null,
      indicePaso: -1,
      // Traza en curso y columnas del apilado; ambas viven mientras dure la
      // operación y se descartan al invalidarla.
      pasos: null,
      segmentosApilado: null,
      // Colocación que la traza en curso promete y que aún no se ha aplicado
      // a la estructura: { indice, casilla, clave }.
      efectoPendiente: null,
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

    // La colocación se aplica al alcanzar su paso y se deshace al retroceder,
    // de modo que la estructura visible siempre corresponde al paso en pantalla.
    function sincronizarEfecto(indicePaso) {
      if (!estado.efectoPendiente) return;
      const { indice, casilla, clave } = estado.efectoPendiente;
      const puesta = estado.estructura.claves[casilla - 1] === clave;
      if (indicePaso >= indice && !puesta) {
        dominio.estructura.colocarEn(estado.estructura, casilla, clave);
      } else if (indicePaso < indice && puesta) {
        dominio.estructura.retirarDe(estado.estructura, casilla);
      }
    }

    // Abandonar una inserción a medio reproducir no puede dejar la clave en el
    // limbo: al invalidar, la operación se consuma antes de olvidarla.
    function invalidarReproduccion() {
      if (estado.reproductor) estado.reproductor.detener();
      if (estado.efectoPendiente) {
        sincronizarEfecto(Infinity);
        estado.efectoPendiente = null;
      }
      estado.reproductor = null;
      estado.pasoActual = null;
      estado.indicePaso = -1;
      estado.pasos = null;
      estado.segmentosApilado = null;
      if (dom.seccionReproduccion) dom.seccionReproduccion.hidden = true;
      if (dom.calculo) dom.calculo.actualizar(null);
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

    function esVertical() {
      return config.orientacion === 'vertical';
    }

    function segmentosDe(relevantes) {
      return vista.elision.calcularSegmentos({
        n: estado.estructura.n,
        relevantes,
        orientacion: config.orientacion || 'horizontal',
        mostrarCompleta: estado.mostrarCompleta,
        // En una tabla dispersa grande se dibujan la 1, la n y las claves, y
        // nada más: es como el docente la dibuja en el tablero. Las vecinas
        // vacías se quedan para las estructuras ordenadas, donde acompañan a
        // una comparación y no a cada clave colocada.
        vecinas: config.modo !== dominio.estructura.MODOS.DISPERSA
      });
    }

    // En una estructura dispersa, dónde quedó cada clave *es* el resultado del
    // algoritmo: comprimir una casilla ocupada dentro de un tramo borra lo que
    // el tema enseña. En las ordenadas no hace falta, porque las claves ocupan
    // siempre el mismo prefijo y su posición no dice nada por sí sola.
    //
    // Estas van sin vecinas (ver `segmentosDe`): el sondeo de la reasignación
    // se sigue viendo entero porque `casillasRelevantes` ya trae las casillas
    // sondeadas, así que la vecina solo agregaría una casilla vacía por clave.
    function relevantesDelPaso(paso) {
      const relevantes = paso ? config.casillasRelevantes(paso) : [];
      if (config.modo !== dominio.estructura.MODOS.DISPERSA) return relevantes;

      const ocupadas = [];
      const claves = estado.estructura.claves;
      for (let indice = 1; indice <= estado.estructura.n; indice++) {
        if (claves[indice - 1] !== undefined) ocupadas.push(indice);
      }
      return relevantes.concat(ocupadas);
    }

    // Aun con la elisión al mínimo, una tabla con muchas claves no cabe en el
    // lienzo: cada clave suma unos 78 px y en una ventana de 700 px el lienzo
    // da para tres. Cuando no cabe, la casilla del paso se lleva al centro de
    // lo visible — el estudiante mira el cálculo y la casilla que resulta, y no
    // tiene por qué buscarla desplazando.
    //
    // El salto es instantáneo y no suave a propósito: se dispara dentro del
    // cambio que anima el FLIP, y un desplazamiento en curso dejaría las
    // casillas animándose hacia coordenadas que ya se movieron.
    function llevarALaVista(grupo) {
      if (!grupo) return;
      const caja = dom.estructuraEl;
      const vertical = esVertical();
      const sobrante = vertical
        ? caja.scrollHeight - caja.clientHeight
        : caja.scrollWidth - caja.clientWidth;
      if (sobrante <= 0) return;

      // Con getBoundingClientRect y no offsetTop: el lienzo no está posicionado,
      // así que offsetTop se mediría contra un ancestro cualquiera.
      const cajaRect = caja.getBoundingClientRect();
      const grupoRect = grupo.getBoundingClientRect();
      const centrado = vertical
        ? grupoRect.top - cajaRect.top + caja.scrollTop - (caja.clientHeight - grupoRect.height) / 2
        : grupoRect.left - cajaRect.left + caja.scrollLeft - (caja.clientWidth - grupoRect.width) / 2;
      const destino = Math.max(0, Math.min(centrado, sobrante));

      if (vertical) caja.scrollTop = destino;
      else caja.scrollLeft = destino;
    }

    // Vista de una sola estructura: la que usan los temas que no acumulan
    // (secuencial, transformación de claves), y también binaria mientras no hay
    // una búsqueda en curso.
    function renderizarFilaUnica(paso) {
      const claves = estado.estructura.claves;
      const n = estado.estructura.n;
      const segmentos = segmentosDe(relevantesDelPaso(paso));
      const vertical = esVertical();
      // La primera relevante es la casilla que el paso está evaluando en los
      // temas que usan esta vista (`paso.casilla` en secuencial y en hash).
      // Binaria no entra aquí con un paso: cuando hay traza usa el apilado,
      // que se desplaza solo al final porque lo nuevo siempre va abajo.
      const relevantesDelPasoActual = paso ? config.casillasRelevantes(paso) : [];
      const indiceSeguido = relevantesDelPasoActual[0];
      let grupoSeguido = null;

      // Casilla y marca de la escala se dibujan en la misma línea: es lo que
      // mantiene la numeración alineada con lo que rotula cuando hay elisión
      // y los tramos comprimidos tienen ancho propio (CLAUDE.md 6.4). En
      // vertical la marca va antes, a la izquierda, que es como se rotula una
      // tabla de direcciones.
      vista.animacion.animarFlip(dom.estructuraEl, () => {
        dom.estructuraEl.className = vertical ? 'estructura-vertical' : 'estructura-horizontal';
        dom.estructuraEl.removeAttribute('style');
        dom.estructuraEl.innerHTML = '';

        for (const segmento of segmentos) {
          const grupo = document.createElement('div');
          grupo.className = vertical ? 'fila-casilla' : 'columna-casilla';

          if (segmento.tipo === 'tramo') {
            const marcaEl = document.createElement('span');
            marcaEl.className = 'escala__marca escala__marca--tramo';
            marcaEl.textContent = `${segmento.desde}–${segmento.hasta}`;
            const tramoEl = crearTramo(segmento.desde, segmento.hasta);
            grupo.append(...(vertical ? [marcaEl, tramoEl] : [tramoEl, marcaEl]));
            dom.estructuraEl.appendChild(grupo);
            continue;
          }

          const indice = segmento.indice;
          const clave = claves[indice - 1];
          const descripcion = config.describirCasilla({ paso, indice, ocupada: clave !== undefined });
          const casillaEl = vista.componentes.casilla.crearCasilla({
            clave,
            indice,
            estado: descripcion.estado,
            modificadores: descripcion.modificadores
          });
          const marcaEl = crearMarca(indice, n);

          grupo.append(...(vertical ? [marcaEl, casillaEl] : [casillaEl, marcaEl]));
          dom.estructuraEl.appendChild(grupo);
          if (indice === indiceSeguido) grupoSeguido = grupo;
        }

        // Dentro del cambio y no después: así el FLIP mide las posiciones
        // finales, ya desplazadas, y no anima contra coordenadas viejas.
        llevarALaVista(grupoSeguido);
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

    // Reproduce cualquier operación con traza —buscar o insertar—, que es lo
    // único que las diferencia desde aquí: el reproductor solo recorre pasos.
    function reproducirOperacion(pasos, mensajeInicial) {
      estado.pasos = pasos;
      calcularSegmentosApilado();
      dom.seccionReproduccion.hidden = false;
      registrarBitacora(mensajeInicial);

      estado.reproductor = vista.reproductor.crearReproductor({
        pasos,
        velocidadMs: Number(dom.controlVelocidad.value),
        alCambiarPaso: (paso, indice) => {
          estado.pasoActual = paso;
          estado.indicePaso = indice;
          sincronizarEfecto(indice);
          if (dom.calculo) dom.calculo.actualizar(paso ? paso.calculo : null);
          renderizarEstructura(paso, indice);
          actualizarMetricas(paso);
          if (paso) registrarBitacora(paso.mensaje);
        }
      });
      estado.reproductor.siguientePaso();
    }

    function insertarClave(texto) {
      const validacion = dominio.clave.validarClaveNumerica(texto, estado.estructura.l);
      if (!validacion.valido) {
        mostrarAlerta('error', validacion.mensaje);
        return;
      }

      // La unicidad y la saturación se comprueban antes de trazar: son estados
      // de la estructura, no pasos del algoritmo, y merecen alerta inmediata
      // en vez de una reproducción que no lleva a ninguna parte (CLAUDE.md 3.2).
      if (dominio.estructura.estaLlena(estado.estructura)) {
        mostrarAlerta('error', `Estructura saturada: capacidad máxima de ${estado.estructura.n} casillas alcanzada.`);
        return;
      }
      const casillaExistente = dominio.estructura.casillaDe(estado.estructura, validacion.valor);
      if (casillaExistente !== 0) {
        mostrarAlerta('error', `Clave duplicada: la clave ya reside en la posición ${casillaExistente}.`);
        return;
      }

      limpiarAlerta();
      invalidarReproduccion();

      // Temas sin inserción trazada: la clave entra de una vez, como siempre.
      if (!config.insertar) {
        const resultado = dominio.estructura.insertar(estado.estructura, validacion.valor);
        if (!resultado.exito) {
          mostrarAlerta('error', resultado.mensaje);
          return;
        }
        registrarBitacora(`Clave insertada: ${validacion.valor} en la casilla ${resultado.indice}.`);
        renderizarEstructura(null);
        actualizarMetricas(null);
        return;
      }

      const pasos = config.insertar({ estructura: estado.estructura, clave: validacion.valor });
      const indiceColocacion = pasos.findIndex((paso) => paso.tipo === 'insercion');
      estado.efectoPendiente = indiceColocacion === -1 ? null : {
        indice: indiceColocacion,
        casilla: pasos[indiceColocacion].casilla,
        clave: pasos[indiceColocacion].clave
      };
      reproducirOperacion(pasos, `Inserción iniciada: clave ${validacion.valor}.`);
    }

    // Llenado numérico (CLAUDE.md 12: el alfabético queda diferido). Inserta de
    // a una para que la animación de inserción se vea, no un salto al estado
    // final. No reproduce la traza de cada clave: llenar es preparar el
    // escenario, no la lección; la lección es la clave que se inserta a mano.
    function llenarAutomaticamente() {
      const { min, max } = dominio.limites.rangoValido(estado.estructura.l);
      const objetivo = estado.estructura.n - dominio.estructura.cantidadClaves(estado.estructura);
      if (objetivo <= 0) {
        mostrarAlerta('error', `Estructura saturada: capacidad máxima de ${estado.estructura.n} casillas alcanzada.`);
        return;
      }
      limpiarAlerta();
      invalidarReproduccion();
      let insertadas = 0;
      let intentos = 0;

      function colocar(candidato) {
        if (!config.insertar) return dominio.estructura.insertar(estado.estructura, candidato);
        // En una estructura dispersa la dirección la decide el algoritmo: se
        // consulta su traza y se aplica el paso que coloca, si es que lo hay.
        if (dominio.estructura.casillaDe(estado.estructura, candidato) !== 0) {
          return { exito: false };
        }
        const pasos = config.insertar({ estructura: estado.estructura, clave: candidato });
        const colocacion = pasos.find((paso) => paso.tipo === 'insercion');
        if (!colocacion) return { exito: false };
        return dominio.estructura.colocarEn(estado.estructura, colocacion.casilla, candidato);
      }

      function insertarSiguiente() {
        if (insertadas >= objetivo || intentos >= objetivo * 50) {
          registrarBitacora(`Llenado automático: ${insertadas} claves insertadas.`);
          return;
        }
        intentos++;
        const candidato = Math.floor(Math.random() * (max - min + 1)) + min;
        const resultado = colocar(candidato);
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
      reproducirOperacion(
        config.buscar({ estructura: estado.estructura, objetivo: validacion.valor }),
        `Búsqueda iniciada: clave objetivo ${validacion.valor}.`
      );
    }

    function crearFormularioConfiguracion() {
      const contenedor = document.createElement('form');
      contenedor.className = 'panel';
      // El tratamiento de colisiones se elige al crear y no después: no cambia
      // solo el comportamiento sino la forma de la estructura, así que
      // cambiarlo con claves ya colocadas obligaría a redispersarla entera.
      const selectorTratamiento = config.tratamientos ? `
        <label class="texto-nivel-3">Tratamiento de colisiones
          <select name="tratamiento">
            ${config.tratamientos.map((t) => `<option value="${t.valor}">${t.etiqueta}</option>`).join('')}
          </select>
        </label>
      ` : '';

      // Parámetros propios del tema —las posiciones del truncamiento, la base
      // de la conversión— junto a n y l, por la misma razón que el tratamiento:
      // definen cómo se dispersa la estructura y cambiarlos con claves ya
      // colocadas dejaría direcciones que no corresponden a ninguna cuenta.
      const camposParametros = (config.parametros || []).map((parametro) => {
        // Un parámetro con `opciones` se digita eligiendo, no escribiendo: la
        // operación del plegamiento es una de dos y no tiene por qué validarse
        // contra erratas del estudiante.
        const control = parametro.opciones
          ? `<select name="${parametro.nombre}">
               ${parametro.opciones.map((o) => `<option value="${o.valor}">${o.etiqueta}</option>`).join('')}
             </select>`
          : `<input type="${parametro.tipo === 'numero' ? 'number' : 'text'}"
                    name="${parametro.nombre}"
                    placeholder="${parametro.marcador || ''}">`;
        return `
        <label class="texto-nivel-3">${parametro.etiqueta}
          ${control}
          <span class="campo__ayuda texto-nivel-5">${parametro.ayuda || ''}</span>
        </label>
      `;
      }).join('');
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
        ${camposParametros}
        ${selectorTratamiento}
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
        const tratamiento = config.tratamientos ? String(datos.get('tratamiento')) : null;

        // Los parámetros se validan contra n y l, así que no pueden validarse
        // antes de tenerlos: por eso ocurre aquí y no en el campo.
        const parametros = {};
        const advertenciasParametros = [];
        for (const parametro of config.parametros || []) {
          const validacion = parametro.validar(String(datos.get(parametro.nombre) || ''), { n, l });
          if (!validacion.valido) {
            mostrarAlerta('error', validacion.mensaje);
            return;
          }
          parametros[parametro.nombre] = validacion.valor;
          if (validacion.advertencia) advertenciasParametros.push(validacion.advertencia);
        }

        const resultado = dominio.estructura.crearEstructura({
          n,
          l,
          tipoClave: 'numerica',
          modo: config.modo || dominio.estructura.MODOS.ORDENADA,
          tratamiento
        });
        if (!resultado.exito) {
          mostrarAlerta('error', resultado.mensaje);
          return;
        }
        // Invalidar antes de cambiar la estructura, no después: si quedaba una
        // inserción a medio reproducir, consumarla sobre la estructura nueva
        // colocaría en ella una clave que nunca se le insertó.
        invalidarReproduccion();
        resultado.estructura.nombre = nombre;
        resultado.estructura.parametros = parametros;
        estado.estructura = resultado.estructura;
        limpiarAlerta();
        // Las advertencias del tema pesan más que la del tamaño: hablan de una
        // decisión que el estudiante acaba de tomar y puede rehacer.
        const advertencia = advertenciasParametros[0] || resultado.advertencia;
        if (advertencia) mostrarAlerta('advertencia', advertencia);
        const detalleTratamiento = tratamiento
          ? `, tratamiento de colisiones por ${etiquetaTratamiento(tratamiento)}`
          : '';
        const detalleParametros = (config.parametros || [])
          .map((parametro) => `, ${parametro.etiqueta.toLowerCase()} ${parametros[parametro.nombre]}`)
          .join('');
        registrarBitacora(`Estructura creada: n = ${n}, l = ${l}${detalleParametros}${detalleTratamiento}.`);
        persistencia.recientes.registrar({ nombre, temaTitulo: config.titulo, n, l });
        renderizarEstructura(null);
        actualizarMetricas(null);
      });
      return contenedor;
    }

    function etiquetaTratamiento(valor) {
      const opcion = (config.tratamientos || []).find((t) => t.valor === valor);
      return opcion ? opcion.etiqueta.toLowerCase() : valor;
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
      `;
      contenedor.addEventListener('submit', (evento) => {
        evento.preventDefault();
        if (!requiereEstructura()) return;
        const datos = new FormData(contenedor);
        iniciarBusqueda(String(datos.get('objetivo')));
      });
      return contenedor;
    }

    // El reproductor es de la operación en curso, sea buscar o insertar: por
    // eso vive en su propio panel y no dentro del formulario de búsqueda.
    function crearPanelReproduccion() {
      const contenido = document.createElement('div');
      contenido.innerHTML = `
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

      contenido.querySelector('[data-accion="anterior"]').addEventListener('click', () => {
        if (estado.reproductor) estado.reproductor.pasoAnterior();
      });
      contenido.querySelector('[data-accion="siguiente"]').addEventListener('click', () => {
        if (estado.reproductor) estado.reproductor.siguientePaso();
      });
      contenido.querySelector('[data-accion="reproducir"]').addEventListener('click', () => {
        if (estado.reproductor) estado.reproductor.reproducirContinuo();
      });
      contenido.querySelector('[data-accion="detener"]').addEventListener('click', () => {
        if (estado.reproductor) estado.reproductor.detener();
      });

      dom.seccionReproduccion = contenido.querySelector('[data-seccion="reproduccion"]');
      dom.controlVelocidad = contenido.querySelector('[data-control="velocidad"]');
      dom.controlVelocidad.addEventListener('input', (evento) => {
        if (estado.reproductor) estado.reproductor.establecerVelocidad(Number(evento.target.value));
      });

      return vista.componentes.panel.crearPanel({ titulo: 'Reproducción', contenido });
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
    dom.estructuraEl.className = esVertical() ? 'estructura-vertical' : 'estructura-horizontal';

    // El cálculo se dibuja al lado de la estructura porque lo que se enseña es
    // la correspondencia entre la cuenta y la casilla que resulta de ella.
    const escenario = document.createElement('div');
    escenario.className = 'lienzo__escenario';
    escenario.appendChild(dom.estructuraEl);
    if (config.calculo) {
      dom.calculo = vista.componentes.calculo.crearPanelCalculo();
      escenario.appendChild(dom.calculo.el);
    }
    lienzo.append(crearControlElision(), escenario);

    const panelLateral = document.createElement('div');
    panelLateral.className = 'pantalla-tema__panel-lateral';
    dom.alertas = document.createElement('div');
    dom.bitacora = vista.componentes.bitacora.crearBitacora();

    panelLateral.append(
      dom.alertas,
      crearFormularioConfiguracion(),
      crearFormularioInsercion(),
      crearPanelBusqueda(),
      crearPanelReproduccion(),
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

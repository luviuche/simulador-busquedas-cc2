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
  //   eliminar({ estructura, clave }) -> pasos,   // buscar y además sacar
  //   insertar({ estructura, clave }) -> pasos,   // opcional: inserción con traza
  //   tratamientos: [{ valor, etiqueta }],        // opcional: selector al crear
  //   calculo: bool,                              // opcional: panel de cálculo
  //   casillasRelevantes(paso) -> [indices base 1],
  //   describirCasilla({ paso, indice, ocupada }) -> { estado, modificadores },
  //   apilada: {                                  // opcional: una fila por paso
  //     rangoDePaso(paso),
  //     aplicaA(paso)                             // opcional: pasos sin fila
  //   },
  //   metricas: [{ id, etiqueta, valor({ estructura, paso }) -> string }]
  // }
  //
  // Ninguna operación toca la estructura al trazar (CLAUDE.md 4). Un paso puede
  // declarar el `efecto` que produce —colocar, retirar o eliminar— y es esta
  // pantalla la que lo aplica al llegar y lo deshace al retroceder, rehaciendo
  // desde el estado previo a la operación (ver `sincronizarEfectos`).
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
      // Las claves tal como estaban antes de la operación en curso. Es lo que
      // permite reconstruir cualquier paso aplicando desde cero los efectos
      // que la traza declara hasta ahí (ver `sincronizarEfectos`).
      clavesBase: null,
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
      // Repintar el mismo aviso lo haría anunciarse otra vez al lector de
      // pantalla y parpadear en cada paso: si no cambió, se deja como está.
      const vigente = dom.alertas.firstChild;
      if (vigente && vigente.dataset.tipo === tipo && vigente.dataset.mensaje === mensaje) return;

      dom.alertas.innerHTML = '';
      const icono = tipo === 'error' ? '✕' : tipo === 'advertencia' ? '!' : 'i';
      const el = vista.componentes.panel.crearAlerta({ tipo, mensaje, icono });
      el.dataset.tipo = tipo;
      el.dataset.mensaje = mensaje;
      dom.alertas.appendChild(el);
    }

    function limpiarAlerta() {
      dom.alertas.innerHTML = '';
    }

    // Qué pasos de una traza merecen un aviso, y con qué gravedad. La bitácora
    // registra todos; el aviso destaca los que deciden el resultado, para no
    // tener que leer la bitácora entera para saber qué pasó. Los pasos de
    // recorrido —comparación, sondeo, cálculo, desplazamiento— no avisan: son
    // el trámite, no la noticia.
    const AVISO_POR_PASO = Object.freeze({
      colision: 'advertencia',
      rechazada: 'error',
      saturada: 'error',
      'no-encontrada': 'advertencia',
      encontrada: 'info',
      insercion: 'info',
      eliminacion: 'info'
    });

    // El aviso se deduce del punto de la traza y no se acumula: al retroceder
    // vuelve a decir lo que correspondía ahí, igual que la estructura (ver
    // `sincronizarEfectos`). Se busca hacia atrás porque el paso en pantalla
    // suele ser de trámite y la noticia vigente es la última que hubo.
    function sincronizarAviso(indicePaso) {
      if (!estado.pasos) return;
      for (let i = Math.min(indicePaso, estado.pasos.length - 1); i >= 0; i--) {
        const tipo = AVISO_POR_PASO[estado.pasos[i].tipo];
        if (tipo) {
          mostrarAlerta(tipo, estado.pasos[i].mensaje);
          return;
        }
      }
      limpiarAlerta();
    }

    function requiereEstructura() {
      if (!estado.estructura) {
        mostrarAlerta('error', 'Estructura no inicializada: no existen claves para procesar.');
        return false;
      }
      return true;
    }

    // Cómo se aplica cada efecto que un paso puede declarar (ver traza.js).
    const APLICADORES = {
      colocar: (efecto) => dominio.estructura.colocarEn(estado.estructura, efecto.casilla, efecto.clave),
      retirar: (efecto) => dominio.estructura.retirarDe(estado.estructura, efecto.casilla),
      // En una estructura ordenada sacar la clave cierra el hueco: el dominio
      // desplaza las siguientes, y el FLIP lo anima (CLAUDE.md 7).
      eliminar: (efecto) => dominio.estructura.eliminar(estado.estructura, efecto.clave),
      // Arreglos anidados (CLAUDE.md 5.4): la estructura secundaria de una
      // dirección se toca con las mismas tres operaciones que la tabla.
      'colocar-anidado': (efecto) => dominio.estructura.colocarEnAnidado(
        estado.estructura, efecto.casilla, efecto.posicion, efecto.clave
      ),
      'retirar-anidado': (efecto) => dominio.estructura.retirarDeAnidado(
        estado.estructura, efecto.casilla, efecto.posicion
      ),
      'compactar-anidado': (efecto) => dominio.estructura.compactarAnidado(estado.estructura, efecto.casilla)
    };

    // La estructura visible siempre corresponde al paso en pantalla: se parte
    // de cómo estaba antes de la operación y se aplican, en orden, los efectos
    // de los pasos ya recorridos.
    //
    // Reconstruir en vez de deshacer paso a paso: una operación puede mover
    // varias claves —la redispersión de un grupo retira y recoloca todo un
    // tramo— y las inversas encadenadas son justo donde se cuelan los errores.
    // Rehacer desde el estado base no puede desincronizarse.
    function sincronizarEfectos(indicePaso) {
      if (!estado.clavesBase || !estado.pasos) return;
      estado.estructura.claves = estado.clavesBase.claves.slice();
      // Cada anidado se copia aparte: sin eso, compactar uno mutaría el propio
      // estado base y el paso siguiente rehacería sobre algo ya movido.
      estado.estructura.anidados = estado.clavesBase.anidados.map(
        (anidado) => (anidado ? anidado.slice() : anidado)
      );
      const hasta = Math.min(indicePaso, estado.pasos.length - 1);
      for (let i = 0; i <= hasta; i++) {
        const efecto = estado.pasos[i].efecto;
        if (efecto) APLICADORES[efecto.tipo](efecto);
      }
    }

    // Abandonar una operación a medio reproducir no puede dejar la estructura
    // en el limbo: al invalidar, la operación se consuma antes de olvidarla.
    function invalidarReproduccion() {
      if (estado.reproductor) estado.reproductor.detener();
      sincronizarEfectos(Infinity);
      estado.clavesBase = null;
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

    // El tramo dice cuántas casillas resume y no entre qué direcciones va
    // (pedido del usuario, 2026-08-29). El rótulo `6–8` en la escala se
    // multiplicaba: cada clave insertada parte un tramo en dos, y la tabla
    // terminaba con más números de escala que claves. Lo que el tema enseña es
    // dónde cayó cada clave; el rango elidido no aporta a eso, y el conteo
    // basta para que la escala no parezca que pierde casillas.
    function crearTramo(desde, hasta) {
      const el = document.createElement('div');
      el.className = 'tramo-elidido';
      el.textContent = `⋯ ${hasta - desde + 1} ⋯`;
      return el;
    }

    function esVertical() {
      return config.orientacion === 'vertical';
    }

    // Cuántas columnas de arreglo anidado dibuja cada dirección (CLAUDE.md 5.4).
    // Cero cuando el tratamiento elegido no tiene estructuras secundarias, que
    // es el caso de los demás y de todos los temas que no son hash.
    function columnasAnidadas() {
      return (config.anidados && estado.estructura) ? config.anidados.columnas(estado.estructura) : 0;
    }

    // Las columnas del arreglo anidado, elididas con la misma regla que la
    // tabla (CLAUDE.md 6.2): la primera, la última, y las posiciones que hay
    // que ver, con un tramo diciendo cuánto se resumió.
    //
    // **Se calculan una sola vez para todas las filas**, sobre las posiciones
    // ocupadas de la estructura entera. Si cada fila elidiera por su cuenta,
    // tendrían distinta cantidad de columnas y la matriz dejaría de estar
    // alineada, que es justo lo que la hace legible.
    function segmentosAnidados(paso) {
      const columnas = columnasAnidadas();
      if (columnas === 0) return [];

      const relevantes = [];
      for (let indice = 1; indice <= estado.estructura.n; indice++) {
        const anidado = dominio.estructura.anidadoDe(estado.estructura, indice);
        for (let posicion = 1; posicion <= anidado.length; posicion++) {
          if (anidado[posicion - 1] !== undefined) relevantes.push(posicion);
        }
      }
      if (paso && paso.posicion) relevantes.push(paso.posicion);

      return vista.elision.calcularSegmentos({
        n: columnas,
        relevantes,
        // El arreglo se dibuja a lo ancho de la fila, así que su umbral es el
        // horizontal: con n = 10 sus nueve columnas caben y no se elide nada.
        orientacion: 'horizontal',
        mostrarCompleta: estado.mostrarCompleta,
        vecinas: false
      });
    }

    // La fila de una dirección con arreglo anidado se lee como una matriz: la
    // primera columna es la tabla —donde aterrizó la clave que obtuvo la
    // dirección— y las demás son su arreglo, en orden de llegada. Las vacías
    // se dibujan a propósito: ver cuánto espacio queda antes de que el método
    // se agote es lo que el tema enseña.
    function casillasAnidadas(paso, indice, segmentos) {
      const anidado = dominio.estructura.anidadoDe(estado.estructura, indice);
      return segmentos.map((segmento) => {
        // Un tramo solo esconde posiciones vacías: las ocupadas son relevantes
        // en todas las filas, así que ninguna cae dentro de un tramo.
        if (segmento.tipo === 'tramo') {
          const tramoEl = crearTramo(segmento.desde, segmento.hasta);
          tramoEl.classList.add('tramo-elidido--anidado');
          return tramoEl;
        }
        const posicion = segmento.indice;
        const clave = anidado[posicion - 1];
        const descripcion = config.describirCasilla({ paso, indice, posicion, ocupada: clave !== undefined });
        return vista.componentes.casilla.crearCasilla({
          clave,
          // Identidad propia por posición: dos casillas vacías con la misma
          // identidad dejarían al FLIP sin saber cuál se movió (CLAUDE.md 7).
          indice: `${indice}.${posicion}`,
          estado: descripcion.estado,
          modificadores: (descripcion.modificadores || []).concat('anidada')
        });
      });
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
      // Una sola vez para todas las filas: es lo que mantiene la matriz alineada.
      const columnasDelAnidado = vertical ? segmentosAnidados(paso) : [];

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
            const tramoEl = crearTramo(segmento.desde, segmento.hasta);
            // Sin rótulo, el grupo tiene un solo hijo: en vertical el grid lo
            // metería en la columna de la escala, así que se lo manda a la de
            // las casillas a mano. Con arreglos anidados cruza la matriz
            // entera, que es lo que dice que se saltaron filas completas.
            if (vertical) tramoEl.style.gridColumn = columnasAnidadas() > 0 ? '2 / -1' : '2';
            grupo.appendChild(tramoEl);
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
          const anidadas = vertical ? casillasAnidadas(paso, indice, columnasDelAnidado) : [];
          if (anidadas.length > 0) {
            grupo.style.gridTemplateColumns = `3ch auto repeat(${anidadas.length}, auto)`;
          }

          grupo.append(...(vertical ? [marcaEl, casillaEl, ...anidadas] : [casillaEl, marcaEl]));
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

            // La fila de la escala queda vacía en esta columna: su alto lo
            // sostienen las marcas de las casillas, que nunca faltan —una fila
            // del apilado siempre dibuja las relevantes de su paso.
            agregar(orden, tramoEl);
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

    // El apilado es el dispositivo de la búsqueda: una fila por descarte. Los
    // pasos que sacan una clave no descartan nada y además cambian la
    // estructura bajo las filas ya dibujadas —que se leen del mismo arreglo—,
    // así que el tema puede declarar que no le aplican y esos pasos se dibujan
    // sobre la estructura completa, que es donde se ve el desplazamiento.
    function renderizarEstructura(paso, indicePaso) {
      const aplicaApilado = !config.apilada || !config.apilada.aplicaA || !paso
        || config.apilada.aplicaA(paso);
      if (config.apilada && estado.pasos && indicePaso >= 0 && aplicaApilado) {
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
      estado.clavesBase = {
        claves: estado.estructura.claves.slice(),
        anidados: (estado.estructura.anidados || []).map((anidado) => (anidado ? anidado.slice() : anidado))
      };
      calcularSegmentosApilado();
      dom.seccionReproduccion.hidden = false;
      registrarBitacora(mensajeInicial);

      estado.reproductor = vista.reproductor.crearReproductor({
        pasos,
        velocidadMs: Number(dom.controlVelocidad.value),
        alCambiarPaso: (paso, indice) => {
          estado.pasoActual = paso;
          estado.indicePaso = indice;
          sincronizarEfectos(indice);
          if (dom.calculo) dom.calculo.actualizar(paso ? paso.calculo : null);
          renderizarEstructura(paso, indice);
          actualizarMetricas(paso);
          sincronizarAviso(indice);
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

      reproducirOperacion(
        config.insertar({ estructura: estado.estructura, clave: validacion.valor }),
        `Inserción iniciada: clave ${validacion.valor}.`
      );
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

    // Eliminar es buscar y además sacar (CLAUDE.md 5.6): la clave se localiza
    // con el algoritmo del tema, así que la traza empieza siendo la de una
    // búsqueda. Que la clave no esté **no** se comprueba antes: descubrirlo es
    // justamente el trabajo de la búsqueda, y el estudiante tiene que verla
    // recorrer hasta concluirlo. Es la diferencia con la inserción, donde el
    // duplicado sí es un estado de la estructura y se avisa de una vez.
    function eliminarClave(texto) {
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
        config.eliminar({ estructura: estado.estructura, clave: validacion.valor }),
        `Eliminación iniciada: clave ${validacion.valor}.`
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
        // Un parámetro puede ser del tratamiento y no del tema —el tamaño del
        // arreglo anidado lo es—: entonces solo se muestra cuando ese
        // tratamiento está elegido. Sigue existiendo en el formulario aunque
        // esté oculto, y su validación resuelve el vacío como el valor por
        // defecto, así que no hace falta un camino aparte para leerlo.
        const alcance = parametro.soloConTratamiento
          ? ` data-solo-con-tratamiento="${parametro.soloConTratamiento}"`
          : '';
        return `
        <label class="texto-nivel-3"${alcance}>${parametro.etiqueta}
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
      // Los campos que pertenecen a un tratamiento aparecen y desaparecen con
      // él, para que el formulario no pida un dato que no se va a usar.
      const camposDelTratamiento = [...contenedor.querySelectorAll('[data-solo-con-tratamiento]')];
      const selector = contenedor.querySelector('[name="tratamiento"]');
      function sincronizarCamposDelTratamiento() {
        const elegido = selector ? selector.value : null;
        for (const campo of camposDelTratamiento) {
          campo.hidden = campo.dataset.soloConTratamiento !== elegido;
        }
      }
      if (selector) selector.addEventListener('change', sincronizarCamposDelTratamiento);
      sincronizarCamposDelTratamiento();

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
        // El tamaño del anidado no se pide: es forma de la estructura y sale
        // de `n`. El dominio lo necesita para saber cuánto cabe, y la vista
        // para saber cuántas columnas tiene la matriz.
        resultado.estructura.tamanoAnidado = config.anidados
          ? config.anidados.columnas(resultado.estructura)
          : 0;
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
          // Un parámetro de otro tratamiento no se registra: la bitácora diría
          // que se creó con un dato que la estructura no usa.
          .filter((parametro) => !parametro.soloConTratamiento || parametro.soloConTratamiento === tratamiento)
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

    // Insertar, buscar y eliminar viven en un solo panel (pedido del docente,
    // 2026-08-29). Las tres operan sobre lo mismo —una clave— y tres paneles
    // con un campo idéntico cada uno repetían el mismo formulario tres veces y
    // empujaban métricas y bitácora fuera de la pantalla.
    //
    // Los botones nombran solo el verbo y no `Insertar clave`: el campo que
    // tienen encima ya dice sobre qué operan, y tres rótulos con la palabra
    // repetida no caben en una fila del panel (CLAUDE.md 9).
    function crearPanelOperaciones() {
      const contenedor = document.createElement('form');
      contenedor.className = 'panel';
      contenedor.innerHTML = `
        <h2 class="panel__titulo texto-nivel-2">Operaciones</h2>
        <label class="texto-nivel-3">Clave
          <input type="text" name="clave" inputmode="numeric" required>
        </label>
        <div class="pantalla-tema__controles">
          <button type="submit" class="boton boton--primario" data-accion="insertar">Insertar</button>
          <button type="button" class="boton" data-accion="buscar">Buscar</button>
          <button type="button" class="boton" data-accion="eliminar">Eliminar</button>
        </div>
        <div class="pantalla-tema__controles">
          <button type="button" class="boton" data-accion="llenado-automatico">Llenado automático</button>
        </div>
      `;

      // Solo la inserción limpia el campo: es la que se repite clave tras
      // clave al preparar el escenario. Buscar y eliminar dejan el valor, que
      // suele ser el mismo con el que se quiere seguir operando.
      const operar = (operacion, limpiar) => () => {
        if (!requiereEstructura()) return;
        operacion(String(new FormData(contenedor).get('clave')));
        if (limpiar) contenedor.reset();
      };

      // Enter inserta, que es la operación que se repite.
      contenedor.addEventListener('submit', (evento) => {
        evento.preventDefault();
        operar(insertarClave, true)();
      });
      contenedor.querySelector('[data-accion="buscar"]').addEventListener('click', operar(iniciarBusqueda, false));
      contenedor.querySelector('[data-accion="eliminar"]').addEventListener('click', operar(eliminarClave, false));
      contenedor.querySelector('[data-accion="llenado-automatico"]').addEventListener('click', () => {
        if (!requiereEstructura()) return;
        llenarAutomaticamente();
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
    dom.alertas.className = 'pantalla-tema__alertas';
    // Anunciada sin robar el foco: el aviso llega mientras el usuario sigue
    // operando, no interrumpe (CLAUDE.md 13).
    dom.alertas.setAttribute('role', 'status');
    dom.alertas.setAttribute('aria-live', 'polite');
    dom.bitacora = vista.componentes.bitacora.crearBitacora();

    panelLateral.append(
      dom.alertas,
      crearFormularioConfiguracion(),
      crearPanelOperaciones(),
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

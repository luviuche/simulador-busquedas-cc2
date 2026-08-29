(function () {
  const dominio = window.CC2.dominio;
  const algoritmos = window.CC2.algoritmos;
  const vista = window.CC2.vista;
  const persistencia = window.CC2.persistencia;
  const hashOperaciones = algoritmos.hash.operaciones;

  // Catálogo de temas (CLAUDE.md 5 y 12). `disponible` refleja el estado real
  // de esta compilación, no el alcance final de la asignatura.
  //
  // Los temas no se numeran: se identifican por su nombre. La numeración
  // sobrevive solo en las unidades, que sí son divisiones del programa.
  const CATALOGO = [
    {
      numero: '01',
      titulo: 'ALGORITMOS DE BÚSQUEDA',
      estado: 'disponible',
      grupos: [
        {
          titulo: 'Búsquedas internas',
          temas: [
            { id: 'secuencial', titulo: 'Búsqueda secuencial', descripcion: 'Recorrido lineal, clave por clave', disponible: true },
            { id: 'binaria', titulo: 'Búsqueda binaria', descripcion: 'División sobre arreglo ordenado', disponible: true }
          ]
        },
        {
          titulo: 'Transformación de claves · funciones hash',
          temas: [
            { id: 'hash-modulo', titulo: 'Función módulo', descripcion: 'Dirección por residuo de n', disponible: true },
            { id: 'hash-cuadrado', titulo: 'Función cuadrado', descripcion: 'Cifras centrales del cuadrado', disponible: true },
            { id: 'hash-truncamiento', titulo: 'Función truncamiento', descripcion: 'Selección de dígitos de la clave', disponible: true },
            { id: 'hash-plegamiento', titulo: 'Función plegamiento', descripcion: 'Suma o producto de las particiones', disponible: true },
            { id: 'hash-bases', titulo: 'Conversión de bases', descripcion: 'Las cifras de la clave leídas en otra base', disponible: true }
          ]
        },
        {
          titulo: 'Otras búsquedas internas',
          temas: [
            { id: 'residuos', titulo: 'Búsqueda por residuos', descripcion: 'Ramificación por dígitos binarios', disponible: false },
            { id: 'arbol-digital', titulo: 'Árboles de búsqueda digital', descripcion: 'Inserción bit a bit', disponible: false },
            { id: 'residuos-multiples', titulo: 'Residuos múltiples', descripcion: 'Ramificación por bloques de bits', disponible: false },
            { id: 'tablas-indices', titulo: 'Tablas de índices', descripcion: 'Acceso mediante tabla auxiliar', disponible: false },
            { id: 'rejilla', titulo: 'Método de la rejilla', descripcion: 'Partición del espacio en celdas', disponible: false },
            { id: 'arbol-2d', titulo: 'Árboles 2D', descripcion: 'Búsqueda en dos dimensiones', disponible: false }
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
          temas: [
            { id: 'externa-sec-bin', titulo: 'Búsqueda secuencial y binaria externa', descripcion: '', disponible: false },
            { id: 'indices', titulo: 'Índices primarios, secundarios y multinivel', descripcion: '', disponible: false }
          ]
        },
        {
          titulo: 'Grafos',
          temas: [
            { id: 'grafos-def', titulo: 'Definiciones, recorridos e isomorfismo', descripcion: '', disponible: false },
            { id: 'grafos-euler', titulo: 'Circuitos de Euler y Hamilton', descripcion: '', disponible: false },
            { id: 'grafos-operaciones', titulo: 'Operaciones entre grafos', descripcion: '', disponible: false },
            { id: 'grafos-expansion', titulo: 'Árboles de expansión — Prim y Kruskal', descripcion: '', disponible: false },
            { id: 'grafos-corte', titulo: 'Conjuntos de corte y conectividad', descripcion: '', disponible: false },
            { id: 'grafos-matricial', titulo: 'Representación matricial', descripcion: '', disponible: false },
            { id: 'grafos-coloreado', titulo: 'Coloreado y particionamiento', descripcion: '', disponible: false },
            { id: 'grafos-pareamientos', titulo: 'Pareamientos y envolventes', descripcion: '', disponible: false }
          ]
        }
      ]
    }
  ];

  // Métricas comunes: comparaciones y accesos los reporta todo paso de traza.
  const METRICA_COMPARACIONES = {
    id: 'comparaciones',
    etiqueta: 'Comparaciones',
    valor: ({ paso }) => (paso ? String(paso.comparaciones) : '0')
  };

  const METRICA_ACCESOS = {
    id: 'accesos',
    etiqueta: 'Accesos',
    valor: ({ paso }) => (paso ? String(paso.accesos) : '0')
  };

  // Factor de carga: cuánto de la estructura está ocupado. Es la métrica que
  // explica el comportamiento de una tabla hash —las colisiones se disparan
  // mucho antes de llenarla— y por eso acompaña a los temas de transformación.
  //
  // Se mide contra la **capacidad** y no contra n: con arreglos anidados caben
  // n × (1 + k) claves, y dividir por n daría más de 1 con la tabla a medio
  // llenar.
  const METRICA_FACTOR_CARGA = {
    id: 'factor-carga',
    etiqueta: 'Factor de carga',
    valor: ({ estructura }) => (
      estructura
        ? (dominio.estructura.cantidadClaves(estructura) / dominio.estructura.capacidad(estructura)).toFixed(2)
        : '0.00'
    )
  };

  // Todos los temas de transformación de claves se comportan igual: lo único
  // que los distingue es cómo calculan la dirección (CLAUDE.md 5.3 y 12). Por
  // eso comparten una sola configuración y cada función nueva aporta su
  // `direccionDe`, nada más.
  //
  // Tres cosas los separan de las búsquedas por comparación, y las tres entran
  // por `config`:
  //
  //   modo dispersa  — la clave aterriza en su dirección, no al final: la
  //                    estructura tiene huecos y no está ordenada.
  //   insertar       — insertar deja de ser instantáneo y pasa a ser lo que
  //                    se enseña, así que produce traza como una búsqueda.
  //   tratamientos   — las colisiones no son un tema aparte sino parte de
  //                    estos temas (pedido del docente); se eligen al crear.
  function temaHash({ titulo, descripcion, direccionDe, parametros }) {
    const operar = (operacion) => ({ estructura, clave, objetivo }) => operacion({
      claves: estructura.claves,
      n: estructura.n,
      clave,
      objetivo,
      direccionDe,
      parametros: estructura.parametros,
      tratamiento: estructura.tratamiento,
      anidados: estructura.anidados,
      tamanoAnidado: estructura.tamanoAnidado
    });

    return {
      titulo,
      descripcion,
      orientacion: 'vertical',
      modo: dominio.estructura.MODOS.DISPERSA,
      calculo: true,
      parametros,
      tratamientos: [
        { valor: hashOperaciones.TRATAMIENTOS.NINGUNO, etiqueta: 'Sin tratamiento' },
        { valor: hashOperaciones.TRATAMIENTOS.REASIGNACION, etiqueta: 'Reasignación (prueba lineal)' },
        { valor: hashOperaciones.TRATAMIENTOS.ANIDADOS, etiqueta: 'Arreglos anidados' }
      ],
      // Con arreglos anidados la estructura es una **matriz de n × n**: la
      // primera columna es la tabla y las otras `n − 1` el arreglo de cada
      // dirección, así que en una dirección caben `n` claves contando la suya
      // (CLAUDE.md 5.4). El tamaño no se pide: sale de `n`.
      anidados: {
        columnas: (estructura) => (
          estructura.tratamiento === hashOperaciones.TRATAMIENTOS.ANIDADOS
            ? estructura.n - 1
            : 0
        )
      },
      insertar: operar(hashOperaciones.insertar),
      buscar: operar(hashOperaciones.buscar),
      eliminar: operar(hashOperaciones.eliminar),
      casillasRelevantes: (paso) => [paso.casilla, paso.direccion]
        .concat(paso.sondeadas || [])
        .filter(Boolean),
      // `posicion` distingue la casilla de la tabla —donde es `undefined`— de
      // cada casilla del arreglo anidado de esa dirección. Un paso marca una
      // sola de las dos, así que las dos tienen que coincidir para pintar.
      describirCasilla: ({ paso, indice, posicion, ocupada }) => {
        const base = ocupada ? 'ocupada' : 'vacia';
        if (!paso) return { estado: base };

        const modificadores = [];
        // La dirección que dio el hash se sigue marcando aunque el sondeo ya
        // se haya ido de ella: es lo que deja ver cuánto se alejó la clave.
        if (paso.direccion === indice && paso.casilla !== indice && posicion === undefined) {
          modificadores.push('direccion');
        }

        // Posiciones del anidado ya recorridas por esta inserción: el rastro
        // que deja ver por qué la clave terminó donde terminó.
        if (posicion !== undefined && paso.casilla === indice) {
          if (paso.recorridas && paso.recorridas.includes(posicion)) modificadores.push('sondeada');
        }

        if (paso.casilla === indice && paso.posicion === posicion) {
          if (paso.tipo === 'encontrada') return { estado: 'encontrada', modificadores };
          if (paso.tipo === 'insercion') return { estado: 'insertada', modificadores };
          // La clave que sale y la que se levanta para volver a dispersarse
          // dejan la misma casilla vacía: lo que las distingue es la bitácora.
          if (paso.tipo === 'eliminacion' || paso.tipo === 'extraccion') {
            return { estado: 'eliminada', modificadores };
          }
          if (paso.tipo === 'colision' || paso.tipo === 'rechazada' || paso.tipo === 'saturada') {
            return { estado: 'colision', modificadores };
          }
          return { estado: 'en-evaluacion', modificadores };
        }
        // Estas dos hablan de casillas de la tabla, no del anidado: sin acotar
        // por `posicion`, una colisión pintaría de rojo la fila entera.
        if (posicion === undefined) {
          if (paso.colision === indice) return { estado: 'colision', modificadores };
          if (paso.sondeadas && paso.sondeadas.includes(indice)) {
            return { estado: base, modificadores: modificadores.concat('sondeada') };
          }
        }
        return { estado: base, modificadores };
      },
      metricas: [METRICA_COMPARACIONES, METRICA_ACCESOS, METRICA_FACTOR_CARGA]
    };
  }

  // Configuración de cada tema sobre la pantalla común de búsqueda. Lo único
  // propio de un algoritmo es cómo se lee su traza: qué casillas son relevantes
  // para la elisión y en qué estado queda cada una en el paso actual.
  const TEMAS = {
    secuencial: {
      titulo: 'BÚSQUEDA SECUENCIAL',
      descripcion: 'Recorrido lineal, clave por clave',
      buscar: ({ estructura, objetivo }) => algoritmos.secuencial.buscarSecuencial(estructura.claves, objetivo),
      // Borrar en secuencial recorre desde la casilla 1, como buscar: la
      // eliminación no tiene camino propio, usa el del tema (CLAUDE.md 5.6).
      eliminar: ({ estructura, clave }) => algoritmos.eliminacion.eliminarPorBusqueda({
        pasos: algoritmos.secuencial.buscarSecuencial(estructura.claves, clave),
        claves: estructura.claves,
        clave
      }),
      casillasRelevantes: (paso) => (paso.casilla ? [paso.casilla] : []),
      describirCasilla: ({ paso, indice, ocupada }) => {
        if (paso && paso.casilla === indice) {
          if (paso.tipo === 'encontrada') return { estado: 'encontrada' };
          if (paso.tipo === 'eliminacion') return { estado: 'eliminada' };
          if (paso.tipo === 'comparacion') return { estado: 'en-evaluacion' };
        }
        return { estado: ocupada ? 'ocupada' : 'vacia' };
      },
      metricas: [METRICA_COMPARACIONES, METRICA_ACCESOS]
    },

    binaria: {
      titulo: 'BÚSQUEDA BINARIA',
      descripcion: 'División sobre arreglo ordenado',
      buscar: ({ estructura, objetivo }) => algoritmos.binaria.buscarBinaria(estructura.claves, objetivo),
      // Borrar en binaria divide, como buscar: la clave se localiza con el
      // algoritmo del tema y solo entonces sale (CLAUDE.md 5.6).
      eliminar: ({ estructura, clave }) => algoritmos.eliminacion.eliminarPorBusqueda({
        pasos: algoritmos.binaria.buscarBinaria(estructura.claves, clave),
        claves: estructura.claves,
        clave
      }),
      // Cada paso deja su propia estructura a la vista, con solo el tramo que
      // sobrevivió al descarte (pedido del docente): el apilado completo es el
      // paso a paso del algoritmo, legible de un vistazo al terminar.
      apilada: {
        rangoDePaso: (paso) => (
          paso.inicio === undefined ? null : { desde: paso.inicio, hasta: paso.fin }
        ),
        // Sacar la clave no es un descarte: no le corresponde una fila más.
        // Esos pasos se dibujan sobre la estructura completa, que es donde el
        // desplazamiento se ve moverse.
        aplicaA: (paso) => paso.tipo !== 'eliminacion' && paso.tipo !== 'desplazamiento'
      },
      casillasRelevantes: (paso) => [paso.inicio, paso.medio, paso.fin, paso.casilla].filter(Boolean),
      describirCasilla: ({ paso, indice, ocupada }) => {
        if (!paso) return { estado: ocupada ? 'ocupada' : 'vacia' };

        if (paso.tipo === 'eliminacion' && paso.casilla === indice) {
          return { estado: 'eliminada' };
        }

        if (paso.descartadas && paso.descartadas.includes(indice)) {
          return { estado: 'descartada' };
        }

        // El corchete cubre el rango completo, incluida la casilla en
        // evaluación: por eso va como modificador y no como estado.
        const modificadores = [];
        const enRango = paso.inicio !== undefined && indice >= paso.inicio && indice <= paso.fin;
        if (enRango) {
          modificadores.push('en-rango');
          if (indice === paso.inicio) modificadores.push('en-rango-inicio');
          if (indice === paso.fin) modificadores.push('en-rango-fin');
        }

        if (paso.medio === indice) {
          return { estado: paso.tipo === 'encontrada' ? 'encontrada' : 'en-evaluacion', modificadores };
        }
        if (enRango) return { estado: 'rango-activo', modificadores };
        return { estado: ocupada ? 'ocupada' : 'vacia' };
      },
      metricas: [
        METRICA_COMPARACIONES,
        METRICA_ACCESOS,
        {
          id: 'maximo-teorico',
          etiqueta: 'Máximo ⌈log₂ n⌉',
          valor: ({ estructura }) => (
            estructura ? String(dominio.limites.maximoPasosBinaria(estructura.n)) : '0'
          )
        }
      ]
    },

    'hash-modulo': temaHash({
      titulo: 'FUNCIÓN MÓDULO',
      descripcion: 'Dirección por residuo de n',
      direccionDe: algoritmos.hash.modulo.direccionModulo
    }),

    'hash-cuadrado': temaHash({
      titulo: 'FUNCIÓN CUADRADO',
      descripcion: 'Cifras centrales del cuadrado',
      direccionDe: algoritmos.hash.cuadrado.direccionCuadrado
    }),

    // Las posiciones son del estudiante: "fijas" significa las mismas para
    // toda la estructura, no decididas por el simulador. Es lo que el docente
    // plantea en un ejercicio ("tome la primera y la tercera cifra").
    'hash-truncamiento': temaHash({
      titulo: 'FUNCIÓN TRUNCAMIENTO',
      descripcion: 'Selección de dígitos de la clave',
      direccionDe: algoritmos.hash.truncamiento.direccionTruncamiento,
      parametros: [
        {
          nombre: 'posiciones',
          etiqueta: 'Posiciones a tomar',
          tipo: 'texto',
          marcador: '1, 3',
          ayuda: 'Cifras de la clave, numeradas desde 1. Si se deja vacío, se toman las primeras que hagan falta para direccionar n.',
          validar: (entrada, { n, l }) => (
            entrada.trim() === ''
              ? { valido: true, valor: algoritmos.hash.truncamiento.posicionesPorDefecto(n) }
              : algoritmos.hash.truncamiento.validarPosiciones(entrada, { n, l })
          )
        }
      ]
    }),

    // La operación entre grupos la elige el estudiante, como las posiciones
    // del truncamiento: el docente plantea el ejercicio sumando los grupos o
    // multiplicándolos, y el resto del cálculo es el mismo.
    'hash-plegamiento': temaHash({
      titulo: 'FUNCIÓN PLEGAMIENTO',
      descripcion: 'Suma o producto de las particiones',
      direccionDe: algoritmos.hash.plegamiento.direccionPlegamiento,
      parametros: [
        {
          nombre: 'operacion',
          etiqueta: 'Operación entre grupos',
          opciones: [
            { valor: algoritmos.hash.plegamiento.OPERACIONES.SUMAR, etiqueta: 'Sumar' },
            { valor: algoritmos.hash.plegamiento.OPERACIONES.MULTIPLICAR, etiqueta: 'Multiplicar' }
          ],
          ayuda: 'Los grupos se combinan con esta operación; del total se toman las últimas cifras.',
          validar: (entrada) => algoritmos.hash.plegamiento.validarOperacion(entrada)
        }
      ]
    }),

    // No convierte la clave: lee sus cifras como cifras en base b y evalúa el
    // polinomio (CLAUDE.md 5.3). Con base 2 eso hace que las cifras pesen como
    // bits, pero no muestra la clave en binario: lo binario del documento
    // quedó otra vez sin resolver.
    'hash-bases': temaHash({
      titulo: 'CONVERSIÓN DE BASES',
      descripcion: 'Las cifras de la clave leídas en otra base',
      direccionDe: algoritmos.hash.bases.direccionBases,
      parametros: [
        {
          nombre: 'base',
          etiqueta: 'Base de conversión',
          tipo: 'numero',
          marcador: String(algoritmos.hash.bases.BASE_POR_DEFECTO),
          ayuda: `Entre ${algoritmos.hash.bases.BASE_MINIMA} y ${algoritmos.hash.bases.BASE_MAXIMA}. `
            + `Si se deja vacío se usa ${algoritmos.hash.bases.BASE_POR_DEFECTO}.`,
          validar: (entrada) => (
            entrada.trim() === ''
              ? { valido: true, valor: algoritmos.hash.bases.BASE_POR_DEFECTO }
              : algoritmos.hash.bases.validarBase(entrada)
          )
        }
      ]
    })
  };

  let elementosDomMenu = {};

  function montarPantalla(pantalla) {
    const raiz = document.getElementById('app');
    raiz.innerHTML = '';
    raiz.appendChild(pantalla);
  }

  function mostrarTema(tema) {
    const config = TEMAS[tema.id];
    if (!tema.disponible || !config) {
      mostrarAlertaMenu('info', `Tema en construcción: "${tema.titulo}" aún no está implementado.`);
      return;
    }
    montarPantalla(vista.pantallas.temaBusqueda.crearPantallaTema(config, mostrarMenu));
  }

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
      alSeleccionarTema: mostrarTema,
      alVerAlertas: () => mostrarAlertaMenu('info', 'Sin alertas activas en esta sesión.')
    });

    const barra = pantalla.querySelector('.pantalla-menu__barra');
    barra.after(elementosDomMenu.alertas);

    montarPantalla(pantalla);
  }

  document.addEventListener('DOMContentLoaded', mostrarMenu);
})();

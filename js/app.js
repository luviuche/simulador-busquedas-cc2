(function () {
  const dominio = window.CC2.dominio;
  const algoritmos = window.CC2.algoritmos;
  const vista = window.CC2.vista;
  const persistencia = window.CC2.persistencia;

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
            { id: 'hash-modulo', titulo: 'Función módulo', descripcion: 'Dirección por residuo de n', disponible: false },
            { id: 'hash-cuadrado', titulo: 'Función cuadrado', descripcion: 'Cifras centrales del cuadrado', disponible: false },
            { id: 'hash-truncamiento', titulo: 'Función truncamiento', descripcion: 'Selección de dígitos de la clave', disponible: false },
            { id: 'hash-plegamiento', titulo: 'Función plegamiento', descripcion: 'Suma de particiones de la clave', disponible: false },
            { id: 'hash-bases', titulo: 'Conversión de bases', descripcion: 'Cambio de base y truncamiento', disponible: false }
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

  // Configuración de cada tema sobre la pantalla común de búsqueda. Lo único
  // propio de un algoritmo es cómo se lee su traza: qué casillas son relevantes
  // para la elisión y en qué estado queda cada una en el paso actual.
  const TEMAS = {
    secuencial: {
      titulo: 'BÚSQUEDA SECUENCIAL',
      descripcion: 'Recorrido lineal, clave por clave',
      buscar: (claves, objetivo) => algoritmos.secuencial.buscarSecuencial(claves, objetivo),
      casillasRelevantes: (paso) => (paso.casilla ? [paso.casilla] : []),
      describirCasilla: ({ paso, indice, ocupada }) => {
        if (paso && paso.casilla === indice) {
          if (paso.tipo === 'encontrada') return { estado: 'encontrada' };
          if (paso.tipo === 'comparacion') return { estado: 'en-evaluacion' };
        }
        return { estado: ocupada ? 'ocupada' : 'vacia' };
      },
      metricas: [METRICA_COMPARACIONES, METRICA_ACCESOS]
    },

    binaria: {
      titulo: 'BÚSQUEDA BINARIA',
      descripcion: 'División sobre arreglo ordenado',
      buscar: (claves, objetivo) => algoritmos.binaria.buscarBinaria(claves, objetivo),
      casillasRelevantes: (paso) => [paso.inicio, paso.medio, paso.fin].filter(Boolean),
      describirCasilla: ({ paso, indice, ocupada }) => {
        if (!paso) return { estado: ocupada ? 'ocupada' : 'vacia' };

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
    }
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

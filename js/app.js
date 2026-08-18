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
            { id: 'binaria', numero: '02', titulo: 'Búsqueda binaria', descripcion: 'División sobre arreglo ordenado', disponible: true }
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

  // Configuración de cada módulo sobre la pantalla común de búsqueda. Lo único
  // propio de un algoritmo es cómo se lee su traza: qué casillas son relevantes
  // para la elisión y en qué estado queda cada una en el paso actual.
  const MODULOS = {
    secuencial: {
      numero: '01',
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
      numero: '02',
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

  function mostrarModulo(modulo) {
    const config = MODULOS[modulo.id];
    if (!modulo.disponible || !config) {
      mostrarAlertaMenu('info', `Módulo en construcción: "${modulo.titulo}" aún no está implementado.`);
      return;
    }
    montarPantalla(vista.pantallas.moduloBusqueda.crearPantallaModulo(config, mostrarMenu));
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
      alSeleccionarModulo: mostrarModulo,
      alVerAlertas: () => mostrarAlertaMenu('info', 'Sin alertas activas en esta sesión.')
    });

    const barra = pantalla.querySelector('.pantalla-menu__barra');
    barra.after(elementosDomMenu.alertas);

    montarPantalla(pantalla);
  }

  document.addEventListener('DOMContentLoaded', mostrarMenu);
})();

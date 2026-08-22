(function () {
  const { TIPOS_PASO, crearPaso } = window.CC2.algoritmos.traza;
  const { sondearLineal } = window.CC2.algoritmos.colisiones.reasignacion;

  // Tratamientos de colisión disponibles (CLAUDE.md 5.4). El docente pidió que
  // no fueran temas aparte sino parte de la transformación de claves: se eligen
  // al crear la estructura, porque cambian su forma y no solo su comportamiento.
  const TRATAMIENTOS = Object.freeze({
    NINGUNO: 'ninguno',
    REASIGNACION: 'reasignacion'
  });

  const NOMBRE_TRATAMIENTO = Object.freeze({
    ninguno: 'ninguno',
    reasignacion: 'reasignación'
  });

  // Ni insertar ni buscar tocan la estructura: producen la traza completa y la
  // vista la reproduce (CLAUDE.md 4). Es lo que permite retroceder un paso.
  //
  // Todo paso lleva `calculo` con las líneas reveladas hasta ese momento —no
  // solo la última— para que el panel se dibuje sin recordar nada del paso
  // anterior, igual que binaria carga sus `descartadas` en cada paso.
  function pasosDelCalculo(calculo, contadores) {
    const pasos = [];
    for (let i = 0; i < calculo.length; i++) {
      const linea = calculo[i];
      const esUltima = i === calculo.length - 1;
      pasos.push(crearPaso(TIPOS_PASO.CALCULO, {
        calculo: calculo.slice(0, i + 1),
        // La dirección solo existe cuando el cálculo terminó: antes, apuntar a
        // una casilla sería mentir sobre lo que el algoritmo sabe.
        direccion: esUltima ? Number(linea.resultado) : undefined,
        casilla: esUltima ? Number(linea.resultado) : undefined,
        comparaciones: contadores.comparaciones,
        accesos: contadores.accesos,
        mensaje: esUltima
          ? `Dirección obtenida: ${linea.expresion} = ${linea.resultado}.`
          : (linea.expresion
            ? `Cálculo de la dirección: ${linea.expresion} = ${linea.resultado}.`
            : `Cálculo de la dirección para la clave ${linea.resultado}.`)
      }));
    }
    return pasos;
  }

  function insertar({ claves, n, clave, direccionDe, tratamiento = TRATAMIENTOS.NINGUNO }) {
    const contadores = { comparaciones: 0, accesos: 0 };
    const { direccion, calculo } = direccionDe(clave, n);
    const pasos = pasosDelCalculo(calculo, contadores);

    const comun = () => ({
      calculo,
      direccion,
      comparaciones: contadores.comparaciones,
      accesos: contadores.accesos
    });

    contadores.accesos++;
    if (claves[direccion - 1] === undefined) {
      pasos.push(crearPaso(TIPOS_PASO.INSERCION, Object.assign(comun(), {
        casilla: direccion,
        clave,
        mensaje: `Clave insertada: ${clave} en la casilla ${direccion}.`
      })));
      return pasos;
    }

    pasos.push(crearPaso(TIPOS_PASO.COLISION, Object.assign(comun(), {
      casilla: direccion,
      colision: direccion,
      mensaje: `Colisión en la dirección ${direccion}: se aplica tratamiento por ${NOMBRE_TRATAMIENTO[tratamiento]}.`
    })));

    // Sin tratamiento la colisión es el final: la clave no entra. Es el
    // comportamiento que deja ver la función hash pura, sin nada que la tape.
    if (tratamiento === TRATAMIENTOS.NINGUNO) {
      pasos.push(crearPaso(TIPOS_PASO.RECHAZADA, Object.assign(comun(), {
        casilla: direccion,
        colision: direccion,
        mensaje: `Clave no insertada: la dirección ${direccion} está ocupada y no hay tratamiento de colisiones definido.`
      })));
      return pasos;
    }

    const sondeo = sondearLineal({
      claves,
      n,
      desde: direccion,
      condicion: (ocupante) => ocupante === undefined
    });

    const sondeadas = [];
    for (const visita of sondeo.recorrido) {
      contadores.accesos++;
      if (!visita.detener) {
        sondeadas.push(visita.casilla);
        pasos.push(crearPaso(TIPOS_PASO.SONDEO, Object.assign(comun(), {
          casilla: visita.casilla,
          colision: direccion,
          sondeadas: sondeadas.slice(),
          mensaje: `Prueba lineal: la casilla ${visita.casilla} contiene la clave ${visita.clave}; se avanza.`
        })));
        continue;
      }
      pasos.push(crearPaso(TIPOS_PASO.INSERCION, Object.assign(comun(), {
        casilla: visita.casilla,
        colision: direccion,
        sondeadas: sondeadas.slice(),
        clave,
        mensaje: `Clave insertada: ${clave} en la casilla ${visita.casilla} tras ${sondeadas.length + 1} sondeos.`
      })));
    }

    if (sondeo.agotado) {
      pasos.push(crearPaso(TIPOS_PASO.SATURADA, Object.assign(comun(), {
        colision: direccion,
        sondeadas: sondeadas.slice(),
        mensaje: `Estructura saturada: capacidad máxima de ${n} casillas alcanzada.`
      })));
    }
    return pasos;
  }

  function buscar({ claves, n, objetivo, direccionDe, tratamiento = TRATAMIENTOS.NINGUNO }) {
    const contadores = { comparaciones: 0, accesos: 0 };
    const { direccion, calculo } = direccionDe(objetivo, n);
    const pasos = pasosDelCalculo(calculo, contadores);

    const comun = () => ({
      calculo,
      direccion,
      comparaciones: contadores.comparaciones,
      accesos: contadores.accesos
    });

    // Leer una casilla siempre es un acceso; comparar solo cuenta cuando hay
    // clave con qué comparar: una casilla vacía no se compara con nada.
    function examinar(casilla) {
      contadores.accesos++;
      const ocupante = claves[casilla - 1];
      if (ocupante !== undefined) contadores.comparaciones++;
      return ocupante;
    }

    const ocupante = examinar(direccion);

    if (ocupante === objetivo) {
      pasos.push(crearPaso(TIPOS_PASO.ENCONTRADA, Object.assign(comun(), {
        casilla: direccion,
        mensaje: `Clave localizada en la casilla ${direccion} tras ${contadores.comparaciones} comparaciones.`
      })));
      return pasos;
    }

    // La casilla vacía es una respuesta, no un fracaso a medias: si la clave
    // existiera, su dirección la habría puesto justo aquí.
    if (ocupante === undefined) {
      pasos.push(crearPaso(TIPOS_PASO.NO_ENCONTRADA, Object.assign(comun(), {
        casilla: direccion,
        mensaje: `Clave no localizada en la estructura: la dirección ${direccion} está vacía.`
      })));
      return pasos;
    }

    pasos.push(crearPaso(TIPOS_PASO.COMPARACION, Object.assign(comun(), {
      casilla: direccion,
      mensaje: `Se compara la clave objetivo con la casilla ${direccion}: ${objetivo} no coincide con ${ocupante}.`
    })));

    if (tratamiento === TRATAMIENTOS.NINGUNO) {
      pasos.push(crearPaso(TIPOS_PASO.NO_ENCONTRADA, Object.assign(comun(), {
        casilla: direccion,
        mensaje: `Clave no localizada en la estructura tras ${contadores.comparaciones} comparaciones.`
      })));
      return pasos;
    }

    // Con reasignación la búsqueda repite el mismo recorrido que hizo la
    // inserción, y para por la misma razón: halla la clave o halla un hueco.
    const sondeo = sondearLineal({
      claves,
      n,
      desde: direccion,
      condicion: (sondeado) => sondeado === undefined || sondeado === objetivo
    });

    for (const visita of sondeo.recorrido) {
      const hallado = examinar(visita.casilla);
      if (!visita.detener) {
        pasos.push(crearPaso(TIPOS_PASO.COMPARACION, Object.assign(comun(), {
          casilla: visita.casilla,
          mensaje: `Prueba lineal: ${objetivo} no coincide con ${hallado} en la casilla ${visita.casilla}; se avanza.`
        })));
        continue;
      }
      if (hallado === objetivo) {
        pasos.push(crearPaso(TIPOS_PASO.ENCONTRADA, Object.assign(comun(), {
          casilla: visita.casilla,
          mensaje: `Clave localizada en la casilla ${visita.casilla} tras ${contadores.comparaciones} comparaciones.`
        })));
      } else {
        pasos.push(crearPaso(TIPOS_PASO.NO_ENCONTRADA, Object.assign(comun(), {
          casilla: visita.casilla,
          mensaje: `Clave no localizada en la estructura: la prueba lineal halló vacía la casilla ${visita.casilla} tras ${contadores.comparaciones} comparaciones.`
        })));
      }
    }

    if (sondeo.agotado) {
      pasos.push(crearPaso(TIPOS_PASO.NO_ENCONTRADA, Object.assign(comun(), {
        mensaje: `Clave no localizada en la estructura tras ${contadores.comparaciones} comparaciones.`
      })));
    }
    return pasos;
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.hash = window.CC2.algoritmos.hash || {};
  window.CC2.algoritmos.hash.operaciones = { TRATAMIENTOS, NOMBRE_TRATAMIENTO, insertar, buscar };
})();

(function () {
  const { TIPOS_PASO, crearPaso } = window.CC2.algoritmos.traza;
  const { sondearLineal } = window.CC2.algoritmos.colisiones.reasignacion;
  const { recorrerAnidado } = window.CC2.algoritmos.colisiones.anidados;

  // Tratamientos de colisión disponibles (CLAUDE.md 5.4). El docente pidió que
  // no fueran temas aparte sino parte de la transformación de claves: se eligen
  // al crear la estructura, porque cambian su forma y no solo su comportamiento.
  const TRATAMIENTOS = Object.freeze({
    NINGUNO: 'ninguno',
    REASIGNACION: 'reasignacion',
    ANIDADOS: 'anidados'
  });

  const NOMBRE_TRATAMIENTO = Object.freeze({
    ninguno: 'ninguno',
    reasignacion: 'reasignación',
    anidados: 'arreglos anidados'
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

  function insertar({ claves, n, clave, direccionDe, parametros, tratamiento = TRATAMIENTOS.NINGUNO, anidados = [], tamanoAnidado = 0 }) {
    const contadores = { comparaciones: 0, accesos: 0 };
    const { direccion, calculo } = direccionDe(clave, n, parametros);
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
        efecto: { tipo: 'colocar', casilla: direccion, clave },
        mensaje: `Clave insertada: ${clave} en la casilla ${direccion}.`
      })));
      return pasos;
    }

    pasos.push(crearPaso(TIPOS_PASO.COLISION, Object.assign(comun(), {
      casilla: direccion,
      colision: direccion,
      // Sin tratamiento no hay nada que "aplicar": decirlo así deja la frase
      // «se aplica tratamiento por ninguno», que además de mal escrita miente
      // sobre lo que va a pasar. Se dice qué se encontró y ya.
      mensaje: tratamiento === TRATAMIENTOS.NINGUNO
        ? `Colisión en la dirección ${direccion}: la casilla ya contiene la clave ${claves[direccion - 1]}.`
        : `Colisión en la dirección ${direccion}: se aplica tratamiento por ${NOMBRE_TRATAMIENTO[tratamiento]}.`
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

    // Arreglos anidados: la clave que chocó no busca otra dirección, se queda
    // en la que le tocó y baja al arreglo secundario de esa dirección. Es lo
    // que separa este tratamiento de la reasignación —la clave nunca se aleja
    // de su dirección— y por eso el límite es la capacidad del arreglo y no la
    // de la tabla.
    if (tratamiento === TRATAMIENTOS.ANIDADOS) {
      const recorrido = recorrerAnidado({
        anidado: anidados[direccion - 1] || [],
        tamano: tamanoAnidado,
        condicion: (ocupante) => ocupante === undefined
      });

      const recorridas = [];
      for (const visita of recorrido.recorrido) {
        contadores.accesos++;
        if (!visita.detener) {
          recorridas.push(visita.posicion);
          pasos.push(crearPaso(TIPOS_PASO.SONDEO, Object.assign(comun(), {
            casilla: direccion,
            posicion: visita.posicion,
            colision: direccion,
            recorridas: recorridas.slice(),
            mensaje: `Arreglo anidado de ${direccion}: la posición ${visita.posicion} contiene la clave ${visita.clave}; se avanza.`
          })));
          continue;
        }
        pasos.push(crearPaso(TIPOS_PASO.INSERCION, Object.assign(comun(), {
          casilla: direccion,
          posicion: visita.posicion,
          colision: direccion,
          recorridas: recorridas.slice(),
          clave,
          efecto: { tipo: 'colocar-anidado', casilla: direccion, posicion: visita.posicion, clave },
          mensaje: `Clave insertada: ${clave} en la posición ${visita.posicion} del arreglo anidado de ${direccion}.`
        })));
      }

      if (recorrido.agotado) {
        pasos.push(crearPaso(TIPOS_PASO.SATURADA, Object.assign(comun(), {
          casilla: direccion,
          colision: direccion,
          recorridas: recorridas.slice(),
          mensaje: `Arreglo anidado de la dirección ${direccion} saturado: `
            + (tamanoAnidado === 1 ? 'su única posición está ocupada' : `sus ${tamanoAnidado} posiciones están ocupadas`)
            + ` y la clave ${clave} no se inserta.`
        })));
      }
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
        efecto: { tipo: 'colocar', casilla: visita.casilla, clave },
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

  function buscar({ claves, n, objetivo, direccionDe, parametros, tratamiento = TRATAMIENTOS.NINGUNO, anidados = [], tamanoAnidado = 0 }) {
    const contadores = { comparaciones: 0, accesos: 0 };
    const { direccion, calculo } = direccionDe(objetivo, n, parametros);
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

    // Con arreglos anidados la búsqueda no se va a otra dirección: baja al
    // arreglo de esta. Para en la clave o en la primera posición vacía, que
    // prueba la ausencia porque el anidado se llena en orden.
    if (tratamiento === TRATAMIENTOS.ANIDADOS) {
      const anidado = anidados[direccion - 1] || [];
      const recorrido = recorrerAnidado({
        anidado,
        tamano: tamanoAnidado,
        condicion: (candidato) => candidato === undefined || candidato === objetivo
      });

      for (const visita of recorrido.recorrido) {
        contadores.accesos++;
        if (visita.clave !== undefined) contadores.comparaciones++;
        if (!visita.detener) {
          pasos.push(crearPaso(TIPOS_PASO.COMPARACION, Object.assign(comun(), {
            casilla: direccion,
            posicion: visita.posicion,
            mensaje: `Arreglo anidado de ${direccion}: ${objetivo} no coincide con ${visita.clave} en la posición ${visita.posicion}; se avanza.`
          })));
          continue;
        }
        if (visita.clave === objetivo) {
          pasos.push(crearPaso(TIPOS_PASO.ENCONTRADA, Object.assign(comun(), {
            casilla: direccion,
            posicion: visita.posicion,
            mensaje: `Clave localizada en la posición ${visita.posicion} del arreglo anidado de ${direccion} tras ${contadores.comparaciones} comparaciones.`
          })));
        } else {
          pasos.push(crearPaso(TIPOS_PASO.NO_ENCONTRADA, Object.assign(comun(), {
            casilla: direccion,
            posicion: visita.posicion,
            mensaje: `Clave no localizada en la estructura: la posición ${visita.posicion} del arreglo anidado de ${direccion} está vacía.`
          })));
        }
      }

      if (recorrido.agotado) {
        pasos.push(crearPaso(TIPOS_PASO.NO_ENCONTRADA, Object.assign(comun(), {
          casilla: direccion,
          mensaje: `Clave no localizada en la estructura tras ${contadores.comparaciones} comparaciones: el arreglo anidado de ${direccion} está lleno y ninguna coincide.`
        })));
      }
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

  // Eliminación en una tabla dispersa (CLAUDE.md 5.6). Localiza la clave con
  // la misma búsqueda del tema —el borrado no tiene camino propio— y la saca.
  //
  // Sin tratamiento ahí se acaba: la casilla se vacía y no hay cadena que
  // romper, porque ninguna clave llegó a estar fuera de su dirección.
  //
  // Con reasignación hace falta algo más. Borrar en medio de un sondeo deja un
  // hueco que corta la cadena: una clave que se corrió más allá deja de ser
  // alcanzable, porque la búsqueda se detiene en la primera casilla vacía que
  // encuentra. Por eso **las claves que siguen al hueco vuelven a pasar por la
  // función hash** (así lo explica el docente): se levantan una a una y se
  // vuelven a dispersar, con su cálculo y su sondeo a la vista.
  //
  // El grupo se recorre hasta la primera casilla vacía y no más allá: si hay
  // una vacía, ninguna clave posterior pudo haberse corrido cruzándola, así
  // que su cadena nunca pasó por aquí y nada de lo que sigue está en riesgo.
  function eliminar({ claves, n, clave, direccionDe, parametros, tratamiento = TRATAMIENTOS.NINGUNO, anidados = [], tamanoAnidado = 0 }) {
    const pasos = buscar({
      claves, n, objetivo: clave, direccionDe, parametros, tratamiento, anidados, tamanoAnidado
    });
    const hallazgo = pasos[pasos.length - 1];
    if (hallazgo.tipo !== TIPOS_PASO.ENCONTRADA) return pasos;

    const contadores = { comparaciones: hallazgo.comparaciones, accesos: hallazgo.accesos };
    const casilla = hallazgo.casilla;

    // Con arreglos anidados la clave sale de donde esté —la casilla de la
    // dirección o una posición de su arreglo— y después el arreglo se cierra:
    // las de atrás se corren, y si la casilla quedó vacía sube a ella la
    // primera del anidado. Sin eso quedaría una dirección vacía con claves
    // colgando, que contradice lo que el dibujo dice.
    if (tratamiento === TRATAMIENTOS.ANIDADOS) {
      const posicion = hallazgo.posicion;
      const anidado = anidados[casilla - 1] || [];
      // Solo hay algo que cerrar si queda una clave *detrás* de la que salió.
      // Sacar la última del arreglo no mueve nada, y un paso que no mueve nada
      // sobra en la traza.
      const hayQueCerrar = posicion === undefined
        ? anidado.some((entrada) => entrada !== undefined)
        : anidado.some((entrada, i) => entrada !== undefined && i + 1 > posicion);

      pasos.push(crearPaso(TIPOS_PASO.ELIMINACION, {
        calculo: hallazgo.calculo,
        direccion: hallazgo.direccion,
        casilla,
        posicion,
        clave,
        efecto: posicion === undefined
          ? { tipo: 'retirar', casilla }
          : { tipo: 'retirar-anidado', casilla, posicion },
        comparaciones: contadores.comparaciones,
        accesos: contadores.accesos,
        mensaje: posicion === undefined
          ? `Clave ${clave} eliminada de la casilla ${casilla}.`
          : `Clave ${clave} eliminada de la posición ${posicion} del arreglo anidado de ${casilla}.`
      }));

      // Nada que cerrar: el arreglo queda vacío y la casilla ya está en su
      // sitio. Un paso que no mueve nada sobra.
      if (hayQueCerrar) {
        pasos.push(crearPaso(TIPOS_PASO.DESPLAZAMIENTO, {
          calculo: hallazgo.calculo,
          direccion: hallazgo.direccion,
          casilla,
          clave,
          efecto: { tipo: 'compactar-anidado', casilla },
          comparaciones: contadores.comparaciones,
          accesos: contadores.accesos,
          mensaje: posicion === undefined
            ? `La primera clave del arreglo anidado de ${casilla} sube a la casilla, y las demás se desplazan.`
            : `El arreglo anidado de ${casilla} cierra el hueco: las claves de atrás se desplazan una posición.`
        }));
      }
      return pasos;
    }

    // Una sola tabla simulada para toda la operación: la traza no toca la
    // estructura real, pero sí necesita saber cómo va quedando para que cada
    // sondeo de la redispersión mire el estado que tendrá en ese momento.
    const simulacion = claves.slice();
    delete simulacion[casilla - 1];

    pasos.push(crearPaso(TIPOS_PASO.ELIMINACION, {
      calculo: hallazgo.calculo,
      direccion: hallazgo.direccion,
      casilla,
      clave,
      efecto: { tipo: 'retirar', casilla },
      comparaciones: contadores.comparaciones,
      accesos: contadores.accesos,
      mensaje: `Clave ${clave} eliminada de la casilla ${casilla}.`
    }));

    if (tratamiento !== TRATAMIENTOS.REASIGNACION) return pasos;

    for (let salto = 1; salto <= n - 1; salto++) {
      const origen = ((casilla - 1 + salto) % n) + 1;
      const reubicada = simulacion[origen - 1];
      if (reubicada === undefined) break;

      contadores.accesos++;
      delete simulacion[origen - 1];
      pasos.push(crearPaso(TIPOS_PASO.EXTRACCION, {
        casilla: origen,
        clave: reubicada,
        efecto: { tipo: 'retirar', casilla: origen },
        comparaciones: contadores.comparaciones,
        accesos: contadores.accesos,
        mensaje: `Se retira la clave ${reubicada} de la casilla ${origen}: colisionó en su momento y hay que volver a dispersarla.`
      }));

      const nueva = direccionDe(reubicada, n, parametros);
      pasos.push(...pasosDelCalculo(nueva.calculo, contadores));

      const comunReubicada = () => ({
        calculo: nueva.calculo,
        direccion: nueva.direccion,
        comparaciones: contadores.comparaciones,
        accesos: contadores.accesos
      });

      contadores.accesos++;
      if (simulacion[nueva.direccion - 1] === undefined) {
        simulacion[nueva.direccion - 1] = reubicada;
        pasos.push(crearPaso(TIPOS_PASO.INSERCION, Object.assign(comunReubicada(), {
          casilla: nueva.direccion,
          clave: reubicada,
          efecto: { tipo: 'colocar', casilla: nueva.direccion, clave: reubicada },
          mensaje: nueva.direccion === origen
            ? `La clave ${reubicada} vuelve a la casilla ${origen}: su dirección quedó libre.`
            : `La clave ${reubicada} se recoloca en la casilla ${nueva.direccion}, su dirección.`
        })));
        continue;
      }

      // Su dirección sigue ocupada: vuelve a sondear, igual que al insertarla
      // la primera vez. Siempre encuentra sitio —se acaba de liberar al menos
      // una casilla— así que el sondeo no puede agotarse.
      const sondeo = sondearLineal({
        claves: simulacion,
        n,
        desde: nueva.direccion,
        condicion: (ocupante) => ocupante === undefined
      });

      const sondeadas = [];
      for (const visita of sondeo.recorrido) {
        contadores.accesos++;
        if (!visita.detener) {
          sondeadas.push(visita.casilla);
          pasos.push(crearPaso(TIPOS_PASO.SONDEO, Object.assign(comunReubicada(), {
            casilla: visita.casilla,
            colision: nueva.direccion,
            sondeadas: sondeadas.slice(),
            mensaje: `Prueba lineal: la casilla ${visita.casilla} contiene la clave ${visita.clave}; se avanza.`
          })));
          continue;
        }
        simulacion[visita.casilla - 1] = reubicada;
        pasos.push(crearPaso(TIPOS_PASO.INSERCION, Object.assign(comunReubicada(), {
          casilla: visita.casilla,
          colision: nueva.direccion,
          sondeadas: sondeadas.slice(),
          clave: reubicada,
          efecto: { tipo: 'colocar', casilla: visita.casilla, clave: reubicada },
          mensaje: visita.casilla === origen
            ? `La clave ${reubicada} vuelve a la casilla ${origen} tras ${sondeadas.length + 1} sondeos.`
            : `La clave ${reubicada} se recoloca en la casilla ${visita.casilla} tras ${sondeadas.length + 1} sondeos.`
        })));
      }
    }

    return pasos;
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.hash = window.CC2.algoritmos.hash || {};
  window.CC2.algoritmos.hash.operaciones = { TRATAMIENTOS, NOMBRE_TRATAMIENTO, insertar, buscar, eliminar };
})();

(function () {
  const { TIPOS_PASO, crearPaso } = window.CC2.algoritmos.traza;
  const indices = window.CC2.dominio.indices;

  // Índices: la derivación como traza (CLAUDE.md 5.x).
  //
  // Los demás temas trazan el recorrido de una clave. Aquí no hay clave que
  // recorrer, pero sí **una cuenta con orden**: el factor de bloqueo antes que
  // los bloques, los bloques del archivo antes que las entradas del índice, y
  // los accesos al final, cuando ya hay de qué contarlos. Esa cuenta es la
  // lección, así que se avanza con el mismo reproductor que todo lo demás en
  // vez de aparecer entera de golpe.
  //
  // La derivación va **de derecha a izquierda**: primero el archivo de datos,
  // que está al final del dibujo, y después cada nivel de índice hacia la
  // raíz. Las columnas se dibujan todas desde el primer paso —en gris las que
  // todavía no están definidas— para que el lienzo no cambie de ancho a cada
  // paso: con cuatro columnas ya hay que desplazarse, y una estructura que se
  // mueve bajo el desplazamiento es imposible de seguir.

  const mil = indices.mil;

  // La parte entera se agrupa igual que un entero suelto: el docente escribe
  // 14.705,88 y no 14705,88, y son los números que el estudiante compara
  // contra su hoja.
  function dec(valor, cifras = 2) {
    const [entera, decimales] = valor.toFixed(cifras).split('.');
    return `${mil(entera)},${decimales}`;
  }

  // Una línea del panel de cálculo: qué se está sacando, con qué números, y
  // qué dio. El corchete dice en qué dirección redondea, que es justo lo que
  // la hoja del docente deja ambiguo (CLAUDE.md 5.x).
  const linea = (etiqueta, expresion, resultado) => ({ etiqueta, expresion, resultado });

  // «1 bloques» delata que el texto se armó con una plantilla. El último nivel
  // del multinivel es siempre uno, así que este caso sale en cada ejercicio.
  const plural = (cantidad, singular, muchos) => `${mil(cantidad)} ${cantidad === 1 ? singular : muchos}`;

  function derivar({ r, R, Ri, B, tipo, niveles }) {
    const estructura = indices.estructuraDeIndices({ r, R, Ri, B, tipo, niveles });
    const { archivo, escalones, columnas, accesos } = estructura;
    const esMultinivel = niveles === indices.NIVELES.MULTINIVEL;
    const pasos = [];
    const lineas = [];
    const definidas = [];

    // Cada paso lleva la lista de columnas ya definidas y la que acaba de
    // quedar lista. Las dos son copias: retroceder vuelve a dibujar desde el
    // paso, sin efectos que deshacer (CLAUDE.md 4).
    function anotar({ tipo: tipoPaso, columna, mensaje }) {
      if (columna && !definidas.includes(columna)) definidas.push(columna);
      pasos.push(crearPaso(tipoPaso, {
        calculo: lineas.map((l) => ({ ...l })),
        definidas: definidas.slice(),
        columnaActiva: columna || null,
        estructura,
        mensaje
      }));
    }

    // --- El archivo de datos -------------------------------------------------
    lineas.push(linea(
      'Factor de bloqueo del archivo',
      `bfr = ⌊${mil(B)} / ${mil(R)}⌋ = ⌊${dec(B / R)}⌋`,
      `${mil(archivo.porBloque)} registros por bloque`
    ));
    anotar({ tipo: TIPOS_PASO.CALCULO, mensaje: `Caben ${mil(archivo.porBloque)} registros en un bloque.` });

    lineas.push(linea(
      'Bloques del archivo',
      `b = ⌈${mil(r)} / ${mil(archivo.porBloque)}⌉ = ⌈${dec(r / archivo.porBloque)}⌉`,
      plural(archivo.bloques, 'bloque', 'bloques')
    ));
    lineas.push(linea(
      'Capacidad del archivo',
      `${mil(archivo.bloques)} × ${mil(archivo.porBloque)}`,
      `${mil(archivo.capacidad)} posiciones · ${mil(archivo.libres)} libres`
    ));
    anotar({
      tipo: TIPOS_PASO.CALCULO,
      columna: 'datos',
      mensaje: `El archivo ocupa ${mil(archivo.bloques)} bloques, con ${mil(archivo.libres)} posiciones libres en el último.`
    });

    // --- Las entradas del índice ---------------------------------------------
    const esPrimario = tipo === indices.TIPOS.PRIMARIO;
    lineas.push(linea(
      `Entradas del índice ${tipo}`,
      esPrimario ? 'una por bloque de datos' : 'una por registro',
      `${mil(estructura.entradas)} entradas`
    ));
    lineas.push(linea(
      'Factor de bloqueo del índice',
      `bfri = ⌊${mil(B)} / ${mil(Ri)}⌋ = ⌊${dec(B / Ri)}⌋`,
      `${mil(escalones[0].porBloque)} entradas por bloque`
    ));
    anotar({
      tipo: TIPOS_PASO.CALCULO,
      mensaje: esPrimario
        ? 'El índice primario es disperso: le basta una entrada por bloque, la del primer registro.'
        : 'El índice secundario es denso: el campo no ordena el archivo, así que necesita una entrada por registro.'
    });

    // --- Los bloques de cada nivel -------------------------------------------
    escalones.forEach((nivel, indice) => {
      const nombre = esMultinivel ? `Nivel ${indice + 1}` : `Bloques del índice ${tipo}`;
      lineas.push(linea(
        nombre,
        `bi = ⌈${mil(nivel.entradas)} / ${mil(nivel.porBloque)}⌉ = ⌈${dec(nivel.entradas / nivel.porBloque)}⌉`,
        plural(nivel.bloques, 'bloque', 'bloques')
      ));
      anotar({
        tipo: TIPOS_PASO.CALCULO,
        columna: `nivel-${indice + 1}`,
        mensaje: esMultinivel && nivel.bloques === 1
          ? `El nivel ${indice + 1} cabe en un solo bloque: ahí termina el índice.`
          : `El ${esMultinivel ? `nivel ${indice + 1}` : `índice ${tipo}`} ocupa ${plural(nivel.bloques, 'bloque', 'bloques')}.`
      });
    });

    // --- Los accesos ----------------------------------------------------------
    if (esMultinivel) {
      lineas.push(linea(
        'Niveles',
        `log_${mil(escalones[0].porBloque)}(${mil(estructura.entradas)}) = ${dec(Math.log(estructura.entradas) / Math.log(escalones[0].porBloque), 3)}`,
        plural(escalones.length, 'nivel', 'niveles')
      ));
      lineas.push(linea(
        'Accesos',
        `niveles + 1 = ${escalones.length} + 1`,
        plural(accesos, 'acceso', 'accesos')
      ));
    } else {
      const bloques = escalones[0].bloques;
      lineas.push(linea(
        'Accesos',
        `⌈log₂ ${mil(bloques)}⌉ + 1 = ⌈${dec(Math.log2(bloques), 3)}⌉ + 1 = ${Math.ceil(Math.log2(bloques))} + 1`,
        plural(accesos, 'acceso', 'accesos')
      ));
    }
    anotar({
      tipo: TIPOS_PASO.CONSTRUIDO,
      mensaje: esMultinivel
        ? `Estructura construida: ${escalones.length} niveles y ${accesos} accesos por búsqueda.`
        : `Estructura construida: ${accesos} accesos por búsqueda.`
    });

    return pasos;
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.indices = { derivar };
})();

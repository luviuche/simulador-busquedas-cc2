(function () {
  const { TIPOS_PASO, crearPaso } = window.CC2.algoritmos.traza;
  const arbol = window.CC2.dominio.arbolMultiple;
  const { codigoDeLetra, posicionEnAlfabeto } = window.CC2.dominio.clave;

  // Residuos múltiples (CLAUDE.md 5.5). Es la búsqueda por residuos mirando un
  // **bloque de bits** por nivel en vez de un bit: cada nodo abre `2^bits`
  // ramas, y el árbol baja tantos niveles como bloques tenga el código.
  //
  // **Toda clave gasta los bloques que tenga el código y queda en el último
  // nivel**, se hubiera podido distinguir antes o no (así lo dibuja el docente;
  // el usuario lo confirmó sobre su tablero, 2026-08-30). El camino de una
  // clave *es* su código leído por bloques: p = 10 | 00 | 0 baja tres enlaces
  // y se queda ahí.
  //
  // De la profundidad fija sale la diferencia de fondo con residuos: **no puede
  // haber choques**. Dos letras distintas tienen códigos distintos, así que sus
  // caminos completos no coinciden nunca y ninguna clave le disputa el sitio a
  // otra. Por lo mismo, al eliminar **no sube nada**: una clave que subiera
  // dejaría de estar donde su código dice. Las dos reglas que residuos sí
  // necesita —el choque y el recogido de rama— aquí no existen, y no es un
  // atajo: es lo que significa gastar el código entero.
  //
  // Lo que sigue igual: una sola comparación por búsqueda, la de la hoja a la
  // que se llega. El precio del método es menos niveles a cambio de más ramas
  // por nodo, que es lo que el dibujo del esqueleto deja ver.
  //
  // Los bloques del código de la letra son 2, 2 y 1 (`arbol-multiple.js`): 5
  // bits no se parten entre 2, así que el último va corto y el último nivel
  // ramifica en dos y no en cuatro.
  //
  // Como en los demás temas, nada de esto toca la estructura: se produce la
  // traza y la pantalla la reproduce (CLAUDE.md 4).

  const posicionCon = (indice) => (
    indice === arbol.RAIZ ? 'la raíz' : `la posición ${arbol.caminoDe(indice)}`
  );
  const posicionDe = (indice) => (
    indice === arbol.RAIZ ? 'de la raíz' : `de la posición ${arbol.caminoDe(indice)}`
  );

  // El trozo del código que se mira en un nivel, y a qué rama corresponde.
  // `bloqueEn` devuelve las cifras tal como se leen; la rama es su valor.
  function bloqueEn(codigo, nivel) {
    let desde = 0;
    for (let i = 1; i < nivel; i++) desde += arbol.bitsDe(i);
    return codigo.slice(desde, desde + arbol.bitsDe(nivel));
  }

  const ramaDe = (bloque) => parseInt(bloque, 2);

  function lineasIniciales(clave, bits) {
    const codigo = codigoDeLetra(clave, bits);
    return [
      { etiqueta: 'Clave', expresion: '', resultado: String(clave) },
      {
        etiqueta: 'Código',
        expresion: `posición ${posicionEnAlfabeto(clave)} del alfabeto`,
        resultado: codigo
      },
      // La partición en bloques es la única cuenta propia del tema: sin verla
      // no se entiende por qué el último nivel ramifica en dos.
      {
        etiqueta: 'Bloques',
        expresion: arbol.BLOQUES.map((b, i) => bloqueEn(codigo, i + 1)).join(' · '),
        resultado: `${arbol.BLOQUES.length} niveles`
      }
    ];
  }

  function pasoDelCodigo(clave, codigo, calculo, contadores) {
    return crearPaso(TIPOS_PASO.CALCULO, {
      calculo: calculo.slice(),
      codigo,
      comparaciones: contadores.comparaciones,
      accesos: contadores.accesos,
      mensaje: `Código de la clave ${clave}: ${codigo}, en bloques de ${arbol.BLOQUES.join(', ')} bits.`
    });
  }

  // Recorrido de buscar y eliminar. Baja leyendo un bloque por nivel hasta el
  // último, donde vive la clave si es que está.
  //
  // Puede terminar antes: si una posición está vacía y no tiene nada colgando,
  // el camino se cortó y eso ya prueba que la clave no está —por ahí no bajó
  // nunca nadie—. Es el atajo que hace que una búsqueda fallida sea barata.
  // Por encima del último nivel no hay claves que encontrar, así que `ocupante`
  // solo puede venir del final del camino.
  function descender({ estructura, bits, clave, contadores, calculo, pasos }) {
    const codigo = codigoDeLetra(clave, bits);
    let indice = arbol.RAIZ;

    for (let nivel = 1; nivel <= arbol.NIVELES; nivel++) {
      contadores.accesos++;
      const ocupante = arbol.claveEn(estructura, indice);
      if (ocupante !== undefined) return { indice, nivel, ocupante, codigo };
      if (arbol.clavesDelSubarbol(estructura, indice).length === 0) {
        return { indice, nivel, ocupante: undefined, codigo };
      }

      const bloque = bloqueEn(codigo, nivel);
      calculo.push({
        etiqueta: `Nivel ${nivel}`,
        expresion: `bloque ${nivel} = ${bloque}`,
        resultado: `rama ${bloque}`
      });
      pasos.push(crearPaso(TIPOS_PASO.RAMIFICACION, {
        calculo: calculo.slice(),
        casilla: indice,
        codigo,
        nivel,
        comparaciones: contadores.comparaciones,
        accesos: contadores.accesos,
        mensaje: `Nivel ${nivel}: ${posicionCon(indice)} solo bifurca; el bloque ${nivel} de ${codigo} es ${bloque}, se baja por esa rama.`
      }));
      indice = arbol.hijo(indice, ramaDe(bloque));
    }

    // Inalcanzable: agotados los bloques, dos códigos distintos ya se separaron.
    // Se deja explícito para que un cambio de partición falle aquí y no en
    // silencio.
    return { indice, nivel: arbol.NIVELES, ocupante: arbol.claveEn(estructura, indice), codigo };
  }

  function buscar({ claves, n, bits, objetivo }) {
    const estructura = { claves, n };
    const contadores = { comparaciones: 0, accesos: 0 };
    const codigo = codigoDeLetra(objetivo, bits);
    const calculo = lineasIniciales(objetivo, bits);
    const pasos = [pasoDelCodigo(objetivo, codigo, calculo, contadores)];

    const final = descender({ estructura, bits, clave: objetivo, contadores, calculo, pasos });
    const comun = { codigo, casilla: final.indice, nivel: final.nivel, accesos: contadores.accesos };

    if (final.ocupante === undefined) {
      calculo.push({ etiqueta: 'Rama vacía', expresion: arbol.caminoDe(final.indice) || 'raíz', resultado: 'no está' });
      pasos.push(crearPaso(TIPOS_PASO.NO_ENCONTRADA, Object.assign({}, comun, {
        calculo: calculo.slice(),
        comparaciones: contadores.comparaciones,
        mensaje: final.indice === arbol.RAIZ
          ? 'Clave no localizada en la estructura: el árbol está vacío.'
          : `Clave no localizada en la estructura: ${posicionCon(final.indice)} está vacía, y ahí es donde ${objetivo} tendría que estar.`
      })));
      return pasos;
    }

    // La única comparación de clave de toda la búsqueda. Y lo que hay solo
    // puede ser la clave buscada: el camino *es* el código, así que a esta
    // posición no llega ninguna otra letra. Por eso aquí no existe el caso de
    // «llegué a una hoja y guarda otra cosa» que sí tiene residuos.
    contadores.comparaciones++;
    calculo.push({ etiqueta: 'Hoja', expresion: `${objetivo} = ${final.ocupante}`, resultado: 'encontrada' });
    pasos.push(crearPaso(TIPOS_PASO.ENCONTRADA, Object.assign({}, comun, {
      calculo: calculo.slice(),
      comparaciones: contadores.comparaciones,
      mensaje: `Clave localizada en ${posicionCon(final.indice)}, nivel ${final.nivel}, tras leer los ${arbol.BLOQUES.length} bloques y una sola comparación.`
    })));
    return pasos;
  }

  // Insertar es bajar el código entero y dejar la clave al final. No hace
  // falta buscar sitio: el sitio lo dice el código, y no puede estar ocupado
  // por otra clave. Si está ocupado, es la misma y se rechaza por duplicada.
  function insertar({ claves, n, bits, clave }) {
    const estructura = { claves, n };
    const contadores = { comparaciones: 0, accesos: 0 };
    const codigo = codigoDeLetra(clave, bits);
    const calculo = lineasIniciales(clave, bits);
    const pasos = [pasoDelCodigo(clave, codigo, calculo, contadores)];

    // A diferencia de buscar, aquí no se corta el camino aunque la rama esté
    // vacía: bajar por una rama que nadie ha usado es precisamente lo que la
    // abre. La clave se queda en el último nivel, gaste lo que gaste.
    let indice = arbol.RAIZ;
    for (let nivel = 1; nivel <= arbol.BLOQUES.length; nivel++) {
      contadores.accesos++;
      const bloque = bloqueEn(codigo, nivel);
      calculo.push({
        etiqueta: `Nivel ${nivel}`,
        expresion: `bloque ${nivel} = ${bloque}`,
        resultado: `rama ${bloque}`
      });
      pasos.push(crearPaso(TIPOS_PASO.RAMIFICACION, {
        calculo: calculo.slice(),
        casilla: indice,
        codigo,
        nivel,
        comparaciones: contadores.comparaciones,
        accesos: contadores.accesos,
        mensaje: `Nivel ${nivel}: el bloque ${nivel} de ${codigo} es ${bloque}, se baja por esa rama.`
      }));
      indice = arbol.hijo(indice, ramaDe(bloque));
    }

    contadores.accesos++;
    const ocupante = arbol.claveEn(estructura, indice);
    if (ocupante !== undefined) {
      contadores.comparaciones++;
      pasos.push(crearPaso(TIPOS_PASO.RECHAZADA, {
        calculo: calculo.concat({ etiqueta: 'Duplicada', expresion: `${clave} ya está en el árbol`, resultado: 'no se inserta' }),
        casilla: indice,
        codigo,
        nivel: arbol.NIVELES,
        comparaciones: contadores.comparaciones,
        accesos: contadores.accesos,
        mensaje: `Clave duplicada: ${clave} ya reside en ${posicionCon(indice)}.`
      }));
      return pasos;
    }

    calculo.push({ etiqueta: 'Inserción', expresion: arbol.caminoDe(indice), resultado: `nivel ${arbol.NIVELES}` });
    pasos.push(crearPaso(TIPOS_PASO.INSERCION, {
      calculo: calculo.slice(),
      casilla: indice,
      codigo,
      nivel: arbol.NIVELES,
      clave,
      efecto: { tipo: 'colocar-nodo', nodo: indice, clave },
      comparaciones: contadores.comparaciones,
      accesos: contadores.accesos,
      mensaje: `Clave insertada: ${clave} en ${posicionCon(indice)}, el final de su código.`
    }));
    return pasos;
  }

  // Eliminar es localizar con el algoritmo del tema y sacar (CLAUDE.md 5.6).
  //
  // Y aquí se acaba: **no sube nada**. En residuos, la clave que quedaba sola
  // en una rama subía porque los bits de más abajo ya no la distinguían de
  // nadie; aquí una clave que subiera dejaría de estar donde su código dice, y
  // la búsqueda —que baja el código entero sin mirar— no la encontraría.
  function eliminar({ claves, n, bits, clave }) {
    const pasos = buscar({ claves, n, bits, objetivo: clave });
    const hallazgo = pasos[pasos.length - 1];
    if (hallazgo.tipo !== TIPOS_PASO.ENCONTRADA) return pasos;

    const nodo = hallazgo.casilla;
    pasos.push(crearPaso(TIPOS_PASO.ELIMINACION, {
      calculo: hallazgo.calculo,
      codigo: hallazgo.codigo,
      comparaciones: hallazgo.comparaciones,
      accesos: hallazgo.accesos,
      casilla: nodo,
      clave,
      efecto: { tipo: 'retirar-nodo', nodo },
      mensaje: `Clave ${clave} eliminada ${posicionDe(nodo)}.`
    }));
    return pasos;
  }

  // Ninguna operación mueve claves: la única que toca la estructura al
  // insertar es la que coloca.
  const APLICADORES = {
    'colocar-nodo': (estructura, efecto) => arbol.colocarNodo(estructura, efecto.nodo, efecto.clave)
  };

  function insertarPalabra({ claves, n, bits, letras }) {
    const simulacion = claves.slice();
    const estructura = { claves: simulacion, n };
    const pasos = [];
    for (const letra of letras) {
      const parciales = insertar({ claves: simulacion, n, bits, clave: letra });
      for (const paso of parciales) {
        if (paso.efecto && APLICADORES[paso.efecto.tipo]) {
          APLICADORES[paso.efecto.tipo](estructura, paso.efecto);
        }
      }
      pasos.push(...parciales);
    }
    return pasos;
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.residuosMultiples = { insertar, buscar, eliminar, insertarPalabra, bloqueEn };
})();

(function () {
  const { cifrasDeRango, lineaDireccionDesdeCero, enmarcar } = window.CC2.algoritmos.hash.comun;

  // Función plegamiento (CLAUDE.md 5.3): partir la clave en grupos, combinarlos
  // con una operación, quedarse con las últimas cifras del total y sumar 1.
  //
  // El tamaño del grupo no es un parámetro: son las cifras que numeran el rango
  // desde cero, igual que en cuadrado y truncamiento. Con n = 100 son pares,
  // que es como lo plantea el docente: 3025 se pliega en 30 y 25.
  //
  // Se parte de izquierda a derecha, así que el grupo corto —cuando la clave no
  // es múltiplo del tamaño— queda al final.
  const OPERACIONES = { SUMAR: 'sumar', MULTIPLICAR: 'multiplicar' };

  function partir(texto, tamano) {
    const grupos = [];
    for (let i = 0; i < texto.length; i += tamano) {
      grupos.push(texto.slice(i, i + tamano));
    }
    return grupos;
  }

  // La operación es del estudiante, como las posiciones del truncamiento: el
  // docente plantea el ejercicio sumando o multiplicando los grupos.
  function validarOperacion(entrada) {
    const valor = String(entrada || '').trim() || OPERACIONES.SUMAR;
    if (valor !== OPERACIONES.SUMAR && valor !== OPERACIONES.MULTIPLICAR) {
      return {
        valido: false,
        mensaje: `Operación desconocida: se espera «${OPERACIONES.SUMAR}» o «${OPERACIONES.MULTIPLICAR}».`
      };
    }
    return { valido: true, valor };
  }

  function direccionPlegamiento(clave, n, parametros) {
    const operacion = (parametros && parametros.operacion) || OPERACIONES.SUMAR;
    const multiplica = operacion === OPERACIONES.MULTIPLICAR;
    const tamano = cifrasDeRango(n);
    const grupos = partir(String(clave), tamano);

    // BigInt y no aritmética normal: la cuenta se hace sobre el texto de la
    // clave, y al multiplicar es en las últimas cifras del total —justo las que
    // deciden la dirección— donde se notaría cualquier redondeo.
    const total = String(grupos.reduce(
      (acumulado, grupo) => (multiplica ? acumulado * BigInt(grupo) : acumulado + BigInt(grupo)),
      multiplica ? BigInt(1) : BigInt(0)
    ));

    // Del total se toman las últimas cifras y no las centrales: es el plegado
    // clásico, donde el acarreo que se sale por la izquierda se descarta.
    const desde = Math.max(total.length - tamano, 0);
    const ultimas = total.slice(desde);
    const valor = Number(ultimas);

    return {
      direccion: Number(lineaDireccionDesdeCero(valor, n).resultado),
      calculo: [
        { etiqueta: 'Clave', expresion: '', resultado: String(clave) },
        {
          etiqueta: `Grupos de ${tamano}`,
          expresion: grupos.map((grupo) => `[${grupo}]`).join(' '),
          resultado: String(grupos.length)
        },
        {
          etiqueta: multiplica ? 'Producto' : 'Suma',
          expresion: grupos.join(multiplica ? ' × ' : ' + '),
          resultado: total
        },
        {
          etiqueta: `Últimas ${ultimas.length} cifras`,
          expresion: enmarcar(total, desde, ultimas.length),
          resultado: ultimas
        },
        lineaDireccionDesdeCero(valor, n)
      ]
    };
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.hash = window.CC2.algoritmos.hash || {};
  window.CC2.algoritmos.hash.plegamiento = {
    direccionPlegamiento,
    partir,
    validarOperacion,
    OPERACIONES
  };
})();

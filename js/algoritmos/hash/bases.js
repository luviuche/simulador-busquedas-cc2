(function () {
  const { lineaDireccion, enmarcar } = window.CC2.algoritmos.hash.comun;

  const BASE_POR_DEFECTO = 11;
  const BASE_MINIMA = 2;
  // 36 es el techo de toString: diez cifras y veintiséis letras.
  const BASE_MAXIMA = 36;

  // Conversión de bases (CLAUDE.md 5.3): convertir la clave a otra base,
  // truncar y ajustar al rango.
  //
  // La base es un parámetro del estudiante. Por defecto 11, que es la que se
  // usa en clase: es la primera que obliga a una cifra que no existe en
  // decimal —la A vale diez— y por eso deja ver que la representación cambió y
  // no solo los dígitos. Con base 2 este mismo tema cubre el caso binario.
  //
  // "Truncar" es quedarse con las últimas cifras de la representación, que en
  // cualquier base son las que más cambian entre claves vecinas. Esas cifras se
  // leen **en la base elegida**, no como si fueran decimales: leerlas como
  // decimales sería imposible en cuanto apareciera una letra.
  function validarBase(entrada) {
    const base = Number(entrada);
    if (!Number.isInteger(base) || base < BASE_MINIMA || base > BASE_MAXIMA) {
      return {
        valido: false,
        mensaje: `Base inválida: se espera un entero entre ${BASE_MINIMA} y ${BASE_MAXIMA}.`
      };
    }
    return {
      valido: true,
      valor: base,
      advertencia: base === 10
        ? 'En base 10 la representación coincide con la clave: el tema no transforma nada.'
        : null
    };
  }

  // Cuántas cifras hacen falta para direccionar n **en esta base**, que no es
  // lo mismo que en decimal: con n = 12 y base 2, dos cifras solo alcanzan
  // cuatro direcciones y ocho casillas quedarían muertas. Se cuenta con
  // multiplicaciones enteras y no con logaritmos, porque en las potencias
  // exactas el redondeo del logaritmo se equivoca por una cifra.
  function cifrasEnBase(n, base) {
    let cifras = 1;
    let capacidad = base;
    while (capacidad < n) {
      capacidad *= base;
      cifras++;
    }
    return cifras;
  }

  function direccionBases(clave, n, parametros) {
    const base = (parametros && parametros.base) || BASE_POR_DEFECTO;
    const cifras = cifrasEnBase(n, base);
    const representacion = clave.toString(base).toUpperCase();

    // Si la representación es más corta que las cifras pedidas se toma entera:
    // no hay nada que truncar.
    const desde = Math.max(0, representacion.length - cifras);
    const ultimas = representacion.slice(desde);
    const valor = parseInt(ultimas, base);

    return {
      direccion: Number(lineaDireccion(valor, n).resultado),
      calculo: [
        { etiqueta: 'Clave', expresion: '', resultado: String(clave) },
        {
          etiqueta: `En base ${base}`,
          expresion: `${clave} a base ${base}`,
          resultado: representacion
        },
        {
          etiqueta: `Últimas ${ultimas.length} cifras`,
          expresion: enmarcar(representacion, desde, ultimas.length),
          resultado: ultimas
        },
        {
          etiqueta: 'En decimal',
          expresion: `${ultimas} en base ${base}`,
          resultado: String(valor)
        },
        lineaDireccion(valor, n)
      ]
    };
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.hash = window.CC2.algoritmos.hash || {};
  window.CC2.algoritmos.hash.bases = {
    BASE_POR_DEFECTO,
    BASE_MINIMA,
    BASE_MAXIMA,
    direccionBases,
    cifrasEnBase,
    validarBase
  };
})();

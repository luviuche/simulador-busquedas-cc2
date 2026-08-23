(function () {
  const { cifrasDeRango, lineaDireccionDesdeCero } = window.CC2.algoritmos.hash.comun;

  // Función truncamiento (CLAUDE.md 5.3): seleccionar posiciones fijas de los
  // dígitos de la clave, concatenarlas y sumar 1.
  //
  // Las cifras concatenadas numeran el rango desde cero —dos posiciones dan de
  // 00 a 99— y el + 1 las lleva a 1..n, igual que en cuadrado.
  //
  // Las posiciones son un parámetro del estudiante y no una constante: "fijas"
  // significa que son las mismas para todas las claves de una estructura, no
  // que las decida el simulador. Es lo que el docente plantea en un ejercicio
  // ("tome la primera, la tercera y la quinta cifra").
  //
  // Se numeran desde 1 y de izquierda a derecha, como las casillas
  // (CLAUDE.md 3.1): la posición 1 es la cifra más significativa.

  function posicionesPorDefecto(n) {
    const posiciones = [];
    for (let i = 1; i <= cifrasDeRango(n); i++) posiciones.push(i);
    return posiciones;
  }

  // Acepta "1,3,5" y también "1 3 5" o "1;3;5": el estudiante escribe a mano.
  function interpretarPosiciones(entrada) {
    return String(entrada)
      .split(/[^0-9]+/)
      .filter((parte) => parte !== '')
      .map(Number);
  }

  function validarPosiciones(entrada, { l, n }) {
    const posiciones = interpretarPosiciones(entrada);
    if (posiciones.length === 0) {
      return { valido: false, mensaje: 'Posiciones no indicadas: se espera al menos una cifra de la clave.' };
    }
    for (const posicion of posiciones) {
      if (posicion < 1 || posicion > l) {
        return {
          valido: false,
          mensaje: `Posición fuera de rango: la clave tiene ${l} cifras, no existe la posición ${posicion}.`
        };
      }
    }
    if (new Set(posiciones).size !== posiciones.length) {
      return { valido: false, mensaje: 'Posición repetida: cada cifra de la clave se toma una sola vez.' };
    }
    // No bloquea: la estructura funciona, pero conviene que el estudiante sepa
    // por qué le quedan casillas a las que nunca llega ninguna clave.
    const necesarias = cifrasDeRango(n);
    // La dirección más alta que alcanzan p posiciones es 99…9 + 1, o sea 10^p.
    const maxima = Math.pow(10, posiciones.length);
    const advertencia = posiciones.length < necesarias
      ? `Con ${posiciones.length} posiciones la dirección no supera ${maxima}: `
        + `parte de las ${n} casillas queda inalcanzable. Para cubrirlas todas hacen falta ${necesarias}.`
      : null;
    return { valido: true, valor: posiciones, advertencia };
  }

  function direccionTruncamiento(clave, n, parametros) {
    const posiciones = (parametros && parametros.posiciones) || posicionesPorDefecto(n);
    const cifras = String(clave).split('');
    const tomadas = posiciones.map((posicion) => cifras[posicion - 1]);
    const valor = Number(tomadas.join(''));

    // Marca las cifras tomadas dentro de la clave, en su sitio, para que se vea
    // cuáles se seleccionaron y no solo cuál fue el resultado: 7 [4] 1 [2].
    const marcada = cifras
      .map((cifra, indice) => (posiciones.includes(indice + 1) ? `[${cifra}]` : cifra))
      .join(' ');

    return {
      direccion: Number(lineaDireccionDesdeCero(valor, n).resultado),
      calculo: [
        { etiqueta: 'Clave', expresion: '', resultado: String(clave) },
        {
          etiqueta: `Posiciones ${posiciones.join(', ')}`,
          expresion: marcada,
          resultado: tomadas.join('')
        },
        lineaDireccionDesdeCero(valor, n)
      ]
    };
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.hash = window.CC2.algoritmos.hash || {};
  window.CC2.algoritmos.hash.truncamiento = {
    direccionTruncamiento,
    posicionesPorDefecto,
    interpretarPosiciones,
    validarPosiciones
  };
})();

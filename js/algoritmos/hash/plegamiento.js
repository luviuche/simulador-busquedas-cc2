(function () {
  const { cifrasNecesarias, lineaDireccion } = window.CC2.algoritmos.hash.comun;

  // Función plegamiento (CLAUDE.md 5.3): partir la clave en grupos, sumarlos y
  // ajustar el resultado al rango.
  //
  // El tamaño del grupo no es un parámetro: son las cifras que hacen falta para
  // direccionar n, igual que en cuadrado. Con grupos más cortos la suma no
  // alcanzaría las casillas altas, y con grupos más largos el ajuste al rango
  // haría casi todo el trabajo y el plegamiento no se vería.
  //
  // Se parte de izquierda a derecha, así que el grupo corto —cuando la clave no
  // es múltiplo del tamaño— queda al final.
  function partir(texto, tamano) {
    const grupos = [];
    for (let i = 0; i < texto.length; i += tamano) {
      grupos.push(texto.slice(i, i + tamano));
    }
    return grupos;
  }

  function direccionPlegamiento(clave, n) {
    const tamano = cifrasNecesarias(n);
    const grupos = partir(String(clave), tamano);
    const suma = grupos.reduce((total, grupo) => total + Number(grupo), 0);

    return {
      direccion: Number(lineaDireccion(suma, n).resultado),
      calculo: [
        { etiqueta: 'Clave', expresion: '', resultado: String(clave) },
        {
          etiqueta: `Grupos de ${tamano}`,
          expresion: grupos.map((grupo) => `[${grupo}]`).join(' '),
          resultado: String(grupos.length)
        },
        {
          etiqueta: 'Suma',
          expresion: grupos.join(' + '),
          resultado: String(suma)
        },
        lineaDireccion(suma, n)
      ]
    };
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.hash = window.CC2.algoritmos.hash || {};
  window.CC2.algoritmos.hash.plegamiento = { direccionPlegamiento, partir };
})();

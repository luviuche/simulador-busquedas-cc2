(function () {
  const { cifrasDeRango, lineaDireccionDesdeCero, enmarcar } = window.CC2.algoritmos.hash.comun;

  // Función cuadrado (CLAUDE.md 5.3): elevar la clave al cuadrado, tomar las
  // cifras centrales que numeran el rango desde cero y sumar 1.
  //
  // Las cifras son las de n − 1, no las de n: con n = 100 se toman dos, porque
  // las centrales sirven de 00 a 99 y el + 1 final las lleva a 1..100. Es la
  // forma en que lo plantea el docente, y la que evita que sobre una cifra que
  // ninguna dirección usa.
  //
  // Se toman las centrales, y no las de un extremo, porque en el cuadrado son
  // las que dependen de todas las cifras de la clave: dos claves que difieren
  // solo en la primera cifra siguen difiriendo en el centro del cuadrado, pero
  // pueden coincidir en sus últimas cifras.
  function direccionCuadrado(clave, n) {
    const cifras = cifrasDeRango(n);
    // BigInt y no aritmética normal: con claves largas el cuadrado supera el
    // entero seguro de JavaScript y las cifras centrales saldrían falseadas.
    const texto = String(BigInt(clave) * BigInt(clave));

    // Se descarta la mitad del sobrante por cada lado. Cuando el sobrante es
    // impar la selección se corre hacia la izquierda: con un cuadrado de siete
    // cifras y dos a tomar, la central se acompaña de la que tiene a su
    // izquierda (9150625 → 50), que es como lo pide el docente.
    const sobrante = texto.length - cifras;
    const desde = sobrante > 0 ? Math.floor(sobrante / 2) : 0;
    const centrales = texto.slice(desde, desde + cifras);
    const valor = Number(centrales);

    return {
      direccion: Number(lineaDireccionDesdeCero(valor, n).resultado),
      calculo: [
        { etiqueta: 'Clave', expresion: '', resultado: String(clave) },
        { etiqueta: 'Cuadrado', expresion: `${clave}²`, resultado: texto },
        {
          etiqueta: `Cifras centrales (${cifras})`,
          expresion: enmarcar(texto, desde, cifras),
          resultado: centrales
        },
        lineaDireccionDesdeCero(valor, n)
      ]
    };
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.hash = window.CC2.algoritmos.hash || {};
  window.CC2.algoritmos.hash.cuadrado = { direccionCuadrado };
})();

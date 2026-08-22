(function () {
  const { cifrasNecesarias, lineaDireccion, enmarcar } = window.CC2.algoritmos.hash.comun;

  // Función cuadrado (CLAUDE.md 5.3): elevar la clave al cuadrado y tomar las
  // cifras centrales necesarias para direccionar n.
  //
  // Se toman las centrales, y no las de un extremo, porque en el cuadrado son
  // las que dependen de todas las cifras de la clave: dos claves que difieren
  // solo en la primera cifra siguen difiriendo en el centro del cuadrado, pero
  // pueden coincidir en sus últimas cifras.
  function direccionCuadrado(clave, n) {
    const cifras = cifrasNecesarias(n);
    // BigInt y no aritmética normal: con claves largas el cuadrado supera el
    // entero seguro de JavaScript y las cifras centrales saldrían falseadas.
    const texto = String(BigInt(clave) * BigInt(clave));

    // Se descarta la mitad del sobrante por cada lado. Cuando el sobrante es
    // impar queda una cifra de más a la derecha, que es donde menos pesa.
    const sobrante = texto.length - cifras;
    const desde = sobrante > 0 ? Math.floor(sobrante / 2) : 0;
    const centrales = texto.slice(desde, desde + cifras);
    const valor = Number(centrales);

    return {
      direccion: Number(lineaDireccion(valor, n).resultado),
      calculo: [
        { etiqueta: 'Clave', expresion: '', resultado: String(clave) },
        { etiqueta: 'Cuadrado', expresion: `${clave}²`, resultado: texto },
        {
          etiqueta: `Cifras centrales (${cifras})`,
          expresion: enmarcar(texto, desde, cifras),
          resultado: centrales
        },
        lineaDireccion(valor, n)
      ]
    };
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.hash = window.CC2.algoritmos.hash || {};
  window.CC2.algoritmos.hash.cuadrado = { direccionCuadrado };
})();

(function () {
  // Lo que comparten las funciones hash que no son la de módulo: todas extraen
  // un número de la clave —cifras centrales, posiciones fijas, suma de grupos,
  // otra base— y después tienen que hacerlo caber en 1..n (CLAUDE.md 5.3).

  // Cuántas cifras hacen falta para direccionar n. Con n = 100 son tres, y por
  // eso se toman tres cifras centrales del cuadrado, tres por grupo al plegar,
  // y así. Es el parámetro que el documento llama "necesarias para direccionar n".
  function cifrasNecesarias(n) {
    return String(n).length;
  }

  // Toda función termina con una línea rotulada "Dirección": el reproductor lee
  // el resultado de la última línea para saber a qué casilla apuntar, así que
  // la invariante "la última línea es la dirección" no es cosmética.
  //
  // Cuando el número extraído ya cae en 1..n se usa tal cual, y la línea lo
  // dice. Cuando se sale, se ajusta con un módulo que preserva las direcciones
  // válidas: 1 sigue siendo 1, n sigue siendo n, y n+1 vuelve a 1.
  function lineaDireccion(valor, n) {
    if (valor >= 1 && valor <= n) {
      return { etiqueta: 'Dirección', expresion: `${valor} cabe en 1..${n}`, resultado: String(valor) };
    }
    // El doble módulo es por los valores menores que 1: en JavaScript el resto
    // de un negativo es negativo, y sin corregirlo la casilla 0 sería posible.
    const direccion = ((valor - 1) % n + n) % n + 1;
    return {
      etiqueta: 'Dirección',
      expresion: `${valor} ajustado a 1..${n}`,
      resultado: String(direccion)
    };
  }

  // Enmarca el tramo que se extrajo dentro del número completo, para que se vea
  // de dónde salió y no solo cuál fue: `54 [937] 744`.
  function enmarcar(texto, desde, cantidad) {
    const izquierda = texto.slice(0, desde);
    const centro = texto.slice(desde, desde + cantidad);
    const derecha = texto.slice(desde + cantidad);
    return [izquierda, `[${centro}]`, derecha].filter(Boolean).join(' ');
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.hash = window.CC2.algoritmos.hash || {};
  window.CC2.algoritmos.hash.comun = { cifrasNecesarias, lineaDireccion, enmarcar };
})();

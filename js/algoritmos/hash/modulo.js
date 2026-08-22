(function () {
  // Función módulo (CLAUDE.md 5.3): dirección = (clave mod n) + 1.
  //
  // Devuelve el desarrollo además del resultado, porque el cálculo es el
  // contenido didáctico del tema: la vista lo revela línea por línea con el
  // reproductor, así que cada línea tiene que poder mostrarse sola.
  //
  // Una línea = { etiqueta, expresion, resultado }. `expresion` es la cuenta
  // tal como se escribe en el tablero; `resultado` es lo que produce.
  function direccionModulo(clave, n) {
    const residuo = clave % n;
    const direccion = residuo + 1;
    return {
      direccion,
      calculo: [
        { etiqueta: 'Clave', expresion: '', resultado: String(clave) },
        { etiqueta: 'Residuo', expresion: `${clave} mod ${n}`, resultado: String(residuo) },
        // El +1 no es adorno: el residuo vive en 0..n-1 y las casillas se
        // numeran desde 1 (CLAUDE.md 3.1).
        { etiqueta: 'Dirección', expresion: `${residuo} + 1`, resultado: String(direccion) }
      ]
    };
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.hash = window.CC2.algoritmos.hash || {};
  window.CC2.algoritmos.hash.modulo = { direccionModulo };
})();

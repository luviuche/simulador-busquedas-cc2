(function () {
  // Búsquedas externas: la forma del archivo (CLAUDE.md 5.x).
  //
  // El archivo son `N` registros repartidos en `B` bloques de `r` registros.
  // A diferencia de los temas internos, el estudiante no elige la forma: fija
  // `N` y la regla del docente deriva `B` y `r` (confirmado con el usuario,
  // 2026-09-11, contra dos ejemplos suyos: N = 23 y N = 10).
  //
  //   B = √N, truncado a entero.
  //   r = N / √N, redondeado al más cercano —no al techo: con N = 23 el 4,79
  //       sube a 5, pero con N = 10 el 3,16 se queda en 3—.
  //   Si B · r < N no alcanza, y se agrega un bloque más.
  //
  // Dos consecuencias de la regla, ambas fijadas por las pruebas:
  //
  //   · Ese bloque de más aparece **siempre que N no sea cuadrado perfecto**, y
  //     nunca cuando sí lo es. No es el caso raro de N = 23: es lo normal.
  //   · El redondeo nunca empata: √N no puede terminar en ,5 para ningún N
  //     entero, así que no hay que decidir qué hacer con el medio.
  //
  // El último bloque **no se llena a `r`**: se queda con lo que sobra y no
  // acepta más, así que la capacidad del archivo es exactamente `N` (pedido
  // del usuario, 2026-09-11). Por eso `registrosDelBloque` existe: preguntar
  // "¿cuántos registros tiene este bloque?" no es lo mismo que `r` en el
  // último.

  function formaDelArchivo(n) {
    const raiz = Math.sqrt(n);
    const bloquesIniciales = Math.floor(raiz);
    const registrosPorBloque = Math.max(1, Math.round(raiz));
    // Equivale a "si no alcanza, uno más", y cubre de una vez el caso en que
    // sí alcanzaba: ⌈N / r⌉ es `bloquesIniciales` cuando N es cuadrado
    // perfecto y `bloquesIniciales + 1` en todos los demás casos.
    const bloques = Math.ceil(n / registrosPorBloque);
    return {
      n,
      raiz,
      bloquesIniciales,
      registrosPorBloque,
      bloques,
      // Lo que le toca al último: lo que sobra después de llenar los anteriores.
      registrosUltimoBloque: n - (bloques - 1) * registrosPorBloque,
      alcanzabaSinAgregar: bloquesIniciales * registrosPorBloque >= n
    };
  }

  // Cuántos registros tiene de verdad el bloque `bloque` (base 1). Todos
  // llevan `r` menos el último, que lleva el sobrante.
  function registrosDelBloque(forma, bloque) {
    return bloque === forma.bloques ? forma.registrosUltimoBloque : forma.registrosPorBloque;
  }

  // El archivo es un solo arreglo ordenado y denso —el mismo `estructura.claves`
  // de secuencial y binaria (CLAUDE.md 3.2)—, y los bloques son una agrupación
  // de posiciones consecutivas encima de él. Estas dos funciones son el único
  // punto donde se convierte entre las dos formas de mirarlo, igual que
  // `mostrar` en cubetas es el único punto de conversión de base.
  function bloqueDe(forma, registro) {
    return Math.floor((registro - 1) / forma.registrosPorBloque) + 1;
  }

  function rangoDelBloque(forma, bloque) {
    const primero = (bloque - 1) * forma.registrosPorBloque + 1;
    return { primero, ultimo: primero + registrosDelBloque(forma, bloque) - 1 };
  }

  window.CC2 = window.CC2 || {};
  window.CC2.dominio = window.CC2.dominio || {};
  window.CC2.dominio.externa = {
    formaDelArchivo,
    registrosDelBloque,
    bloqueDe,
    rangoDelBloque
  };
})();

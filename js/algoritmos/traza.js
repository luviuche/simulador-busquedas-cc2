(function () {
  const TIPOS_PASO = Object.freeze({
    // Búsquedas por comparación (secuencial, binaria).
    COMPARACION: 'comparacion',
    ENCONTRADA: 'encontrada',
    NO_ENCONTRADA: 'no-encontrada',
    // Transformación de claves: el cálculo de la dirección se revela línea por
    // línea, y la colocación puede chocar y tener que sondear (CLAUDE.md 5.3).
    CALCULO: 'calculo',
    INSERCION: 'insercion',
    COLISION: 'colision',
    SONDEO: 'sondeo',
    // Búsqueda por residuos (CLAUDE.md 5.5): bajar por un nodo que solo
    // bifurca. No es una comparación —ahí no hay clave que comparar, solo un
    // bit que leer— y por eso no puede llamarse igual: la lección del tema es
    // justamente que se baja mucho y se compara una sola vez.
    RAMIFICACION: 'ramificacion',
    RECHAZADA: 'rechazada',
    SATURADA: 'saturada',
    // Eliminación (CLAUDE.md 5.6). No tiene algoritmo propio: localiza la
    // clave con el del tema y solo entonces la saca, así que estos pasos
    // siempre van detrás de una traza de búsqueda que terminó en `encontrada`.
    //
    //   eliminacion    — la clave sale de su casilla.
    //   desplazamiento — en las ordenadas, las de atrás cierran el hueco.
    //   extraccion     — en una tabla con reasignación, una clave del grupo
    //                    se levanta para volver a pasar por la función hash.
    ELIMINACION: 'eliminacion',
    DESPLAZAMIENTO: 'desplazamiento',
    EXTRACCION: 'extraccion',
    // Otras búsquedas dinámicas (CLAUDE.md 5.x): aquí `n` cambia con el
    // tiempo, algo que ningún otro tema hace. Cada uno anuncia el cambio de
    // tamaño antes de la secuencia de reubicación (pasos `calculo` +
    // `insercion`, iguales a los de cualquier inserción).
    EXPANSION: 'expansion',
    REDUCCION: 'reduccion'
  });

  // Un paso puede declarar el `efecto` que produce sobre la estructura:
  // { tipo: 'colocar' | 'retirar' | 'eliminar', casilla, clave }. La traza no
  // lo aplica —sigue sin tocar nada (CLAUDE.md 4)—; lo aplica la vista al
  // llegar al paso, y lo deshace al retroceder. Es lo que permite que una
  // operación mueva varias claves, como la redispersión de un grupo, sin que
  // la pantalla tenga que adivinar qué hizo cada paso por su tipo.
  function crearPaso(tipo, datos) {
    return Object.assign({ tipo }, datos);
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.traza = { TIPOS_PASO, crearPaso };
})();

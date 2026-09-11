(function () {
  const { TIPOS_PASO, crearPaso } = window.CC2.algoritmos.traza;
  const dominioHuffman = window.CC2.dominio.huffman;

  // Árbol de Huffman (CLAUDE.md 5.x): la traza de **la construcción**, que es
  // lo que este tema enseña. En los otros tres árboles por residuo el camino
  // de la letra está decidido antes de empezar y lo único que hay que ver es
  // la bajada; aquí el árbol no existe hasta que se construye, así que la
  // traza no recorre nada: va uniendo.
  //
  // Cada paso lleva **el bosque que hay que dibujar** —la lista de nodos tal
  // como está en ese momento— en vez de un efecto que aplicar. No hace falta
  // más: el bosque de cada paso se deduce entero de la construcción, así que
  // retroceder es volver a dibujar y no deshacer nada. La estructura no se
  // toca en ningún momento (CLAUDE.md 4).

  const fraccion = (numerador, total) => `${numerador}/${total}`;

  // Una reducción se anuncia **antes** de unir: el bosque que se dibuja es el
  // de ese momento, con los dos nodos que se van a juntar marcados. Así se ve
  // por qué se eligen esos dos —son los dos primeros de la lista— y no el
  // resultado ya hecho, que es lo que se verá en el paso siguiente.
  function nombreDeNodo(nodo, total) {
    return nodo.letra !== undefined ? nodo.letra : `(${fraccion(nodo.peso, total)})`;
  }

  function construirDesdePalabra({ letras }) {
    const arbol = dominioHuffman.construir(letras);
    const total = arbol.total;
    const pasos = [];

    // Las líneas del panel se acumulan, como en los temas hash: cada paso
    // carga las reveladas hasta ese momento, no solo la suya.
    const calculo = [
      { etiqueta: 'Palabra', expresion: letras.join(''), resultado: `${total} letras` }
    ];

    pasos.push(crearPaso(TIPOS_PASO.CALCULO, {
      total,
      bosque: arbol.inicial,
      calculo: calculo.slice(),
      mensaje: 'Frecuencias en orden de entrada: de menor a mayor, y a igual frecuencia por orden de lectura.'
    }));

    let bosque = arbol.inicial;
    arbol.reducciones.forEach((reduccion, indice) => {
      calculo.push({
        etiqueta: `Reducción ${indice + 1}`,
        expresion: `${nombreDeNodo(reduccion.izquierda, total)} + ${nombreDeNodo(reduccion.derecha, total)}`,
        resultado: fraccion(reduccion.nodo.peso, total)
      });
      pasos.push(crearPaso(TIPOS_PASO.UNION, {
        total,
        bosque,
        uniendo: [reduccion.izquierda, reduccion.derecha],
        calculo: calculo.slice(),
        mensaje: `Se unen ${nombreDeNodo(reduccion.izquierda, total)} y `
          + `${nombreDeNodo(reduccion.derecha, total)}: ${fraccion(reduccion.nodo.peso, total)}.`
      }));
      bosque = reduccion.lista;
    });

    // Al quedar un solo nodo, su peso es el total —la comprobación que el
    // docente hace en el tablero: la última reducción da 1— y ese nodo es el
    // árbol. Solo entonces aparece la tabla: antes ninguna letra tendría
    // código que poner en ella.
    const tabla = dominioHuffman.tablaDeCodificacion(arbol);
    pasos.push(crearPaso(TIPOS_PASO.CONSTRUIDO, {
      total,
      bosque: [arbol.raiz],
      tabla,
      arbol,
      calculo: calculo.slice(),
      mensaje: `Árbol construido: ${fraccion(tabla.suma, total)} = `
        + `${(tabla.suma / total).toString().replace('.', ',')} bits por letra.`
    }));

    return pasos;
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.huffman = { construirDesdePalabra };
})();

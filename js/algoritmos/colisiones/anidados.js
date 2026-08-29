(function () {
  // Arreglos anidados (CLAUDE.md 5.4): cada dirección sostiene un arreglo
  // secundario de tamaño fijo, y ahí van las claves que chocaron con ella.
  //
  // La clave que obtuvo la dirección se queda en la casilla de la tabla; el
  // anidado es para las siguientes. Por eso una dirección sin colisiones no
  // usa su arreglo, y verlo vacío es parte de lo que el tema enseña: cuánto
  // espacio queda antes de que el método se agote.
  //
  // Devuelve **cada posición recorrida**, no solo el destino, por la misma
  // razón que `sondearLineal`: el documento lo exige y es lo que deja ver el
  // costo real de la búsqueda cuando la dirección está disputada.
  //
  // `condicion(clave, posicion)` decide dónde para: al insertar, en la primera
  // posición libre; al buscar, en la que tiene la clave o en la primera vacía,
  // que prueba que no está —el anidado se llena en orden, así que un hueco
  // significa que no hay nada más atrás—.
  function recorrerAnidado({ anidado, tamano, condicion }) {
    const recorrido = [];
    for (let posicion = 1; posicion <= tamano; posicion++) {
      const clave = anidado[posicion - 1];
      const detener = condicion(clave, posicion);
      recorrido.push({ posicion, clave, detener });
      if (detener) return { recorrido, posicion, clave, agotado: false };
    }
    // Recorrió las k posiciones sin cumplir la condición: el arreglo de esta
    // dirección está lleno, y con arreglos anidados eso es el final del camino.
    return { recorrido, posicion: 0, clave: undefined, agotado: true };
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.colisiones = window.CC2.algoritmos.colisiones || {};
  window.CC2.algoritmos.colisiones.anidados = { recorrerAnidado };
})();

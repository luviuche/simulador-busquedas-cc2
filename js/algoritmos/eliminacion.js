(function () {
  const { TIPOS_PASO, crearPaso } = window.CC2.algoritmos.traza;

  // Eliminación en las estructuras ordenadas —secuencial y binaria— según
  // CLAUDE.md 5.6. No hay un algoritmo de borrado: la clave se localiza con el
  // del tema, y por eso esta función no busca nada, recibe la traza de
  // búsqueda ya hecha y le agrega el final. Borrar en secuencial recorre desde
  // la casilla 1; borrar en binaria divide. Es lo que pidió el usuario.
  //
  // Si la búsqueda no halló la clave, la traza se devuelve tal cual: su último
  // paso ya dice que no está, y agregarle algo sería inventar un final.
  //
  // **Dos pasos y no uno.** Primero se marca la casilla que sale, con su clave
  // todavía dentro; después se cierra el hueco. Con un solo paso la clave
  // desaparece y las siguientes se corren a la vez, y no se alcanza a ver de
  // cuál casilla salió — que es justo lo que la animación de eliminación
  // existe para mostrar (CLAUDE.md 7).
  function eliminarPorBusqueda({ pasos, claves, clave }) {
    const hallazgo = pasos[pasos.length - 1];
    if (!hallazgo || hallazgo.tipo !== TIPOS_PASO.ENCONTRADA) return pasos;

    const casilla = hallazgo.casilla;
    const siguientes = claves.length - casilla;
    const contadores = {
      comparaciones: hallazgo.comparaciones,
      accesos: hallazgo.accesos
    };

    return pasos.concat([
      crearPaso(TIPOS_PASO.ELIMINACION, Object.assign({
        casilla,
        clave,
        mensaje: `Clave ${clave} localizada en la casilla ${casilla}: se elimina.`
      }, contadores)),

      // El efecto va en el segundo paso: es el que mueve claves, y el dominio
      // cierra el hueco por su cuenta al sacar la clave del arreglo denso.
      crearPaso(TIPOS_PASO.DESPLAZAMIENTO, Object.assign({
        casilla,
        clave,
        efecto: { tipo: 'eliminar', clave },
        mensaje: siguientes > 0
          ? `Casilla ${casilla} liberada: las ${siguientes} claves siguientes se desplazan una posición.`
          : `Casilla ${casilla} liberada: era la última clave, no hay nada que desplazar.`
      }, contadores))
    ]);
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.eliminacion = { eliminarPorBusqueda };
})();

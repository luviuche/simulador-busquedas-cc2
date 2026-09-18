(function () {
  // Índices primarios, secundarios y multinivel (CLAUDE.md 5.x).
  //
  // **Aquí no hay claves.** Es el único tema del catálogo donde no se inserta
  // ni se busca nada: de cuatro parámetros —cuántos registros tiene el
  // archivo y cuánto mide un registro, un registro índice y un bloque— sale
  // una estructura, y construirla correctamente *es* el ejercicio. Por eso
  // este módulo no conoce `estructura.claves` ni la toca.
  //
  // Las reglas son las de la hoja manuscrita del docente
  // (`docs/WhatsApp Image 2026-09-04 at 9.47.37 AM*.jpeg`, traída por el
  // usuario el 2026-09-17), verificadas número a número contra sus tres
  // páginas. La solución del parcial que circula entre estudiantes
  // (`docs/Primer Parcial…pdf`) coincide en todo salvo en que **omite los
  // accesos del índice primario**, que él sí calcula.
  //
  // El redondeo va en dos direcciones y es la trampa del tema —él escribe el
  // mismo corchete para las dos—:
  //
  //   · El **factor de bloqueo** trunca: un registro no se parte entre dos
  //     bloques, así que en 4.096 bytes caben ⌊4096/120⌋ = 34 y no 34,13.
  //   · El **número de bloques** va al techo: el último bloque va a medias
  //     pero existe, ⌈500000/34⌉ = 14.706.
  //
  // De ahí sale algo que este tema tiene y búsqueda secuencial externa no
  // (CLAUDE.md 5.8): **la capacidad excede a la ocupación**, y el docente
  // escribe las dos. 14.706 × 34 = 500.004 posiciones para 500.000 registros;
  // sobran 4 en el último bloque. Allá la capacidad era exactamente `N`.

  const TIPOS = Object.freeze({ PRIMARIO: 'primario', SECUNDARIO: 'secundario' });
  const NIVELES = Object.freeze({ UNO: 'un-nivel', MULTINIVEL: 'multinivel' });

  // Topes de los parámetros. El bloque no baja de 8 bytes ni sube de 64 KiB, y
  // un registro nunca puede ser mayor que el bloque que lo tiene que contener:
  // con `R > B` el factor de bloqueo daría cero y no habría estructura que
  // construir. Esa comparación es entre dos campos del formulario, y por eso
  // `validarLongitud` recibe el bloque ya leído.
  const BLOQUE_MINIMO = 8;
  const BLOQUE_MAXIMO = 65536;
  const REGISTROS_MAXIMO = 100000000;

  // El separador de miles es el punto y el decimal la coma, como el docente
  // los escribe a mano. `toLocaleString` dependería del idioma del navegador
  // —y en las pruebas, del de Node—, así que se agrupa a mano. Vive aquí
  // porque lo necesitan los dos lados: la derivación al redactar sus líneas y
  // la vista al rotular la escala de cada columna.
  function mil(valor) {
    return String(valor).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function factorDeBloqueo(bloque, longitudRegistro) {
    return Math.floor(bloque / longitudRegistro);
  }

  // Al techo, y nunca cero: aunque quepa todo de sobra, una entrada sigue
  // necesitando un bloque donde vivir.
  function bloquesPara(entradas, porBloque) {
    return Math.max(1, Math.ceil(entradas / porBloque));
  }

  function forma({ entradas, longitudRegistro, B }) {
    const porBloque = factorDeBloqueo(B, longitudRegistro);
    const bloques = bloquesPara(entradas, porBloque);
    const capacidad = bloques * porBloque;
    return { entradas, longitudRegistro, porBloque, bloques, capacidad, libres: capacidad - entradas };
  }

  const formaDelArchivo = ({ r, R, B }) => forma({ entradas: r, longitudRegistro: R, B });

  // De qué se hace una entrada de índice, que es lo único que separa al
  // primario del secundario:
  //
  //   · **Primario — disperso.** El archivo está ordenado por ese campo, que
  //     además es clave única, así que basta guardar el primer registro de
  //     cada bloque —el ancla—: una entrada por **bloque**.
  //   · **Secundario — denso.** El campo no ordena el archivo, así que no hay
  //     anclas y no se puede descartar nada sin mirar: una entrada por
  //     **registro**.
  function entradasDelIndice({ tipo, archivo }) {
    return tipo === TIPOS.PRIMARIO ? archivo.bloques : archivo.entradas;
  }

  // Los niveles, del más bajo (el que indexa el archivo) al más alto. Cada uno
  // indexa los **bloques** del anterior, y se para cuando un nivel cabe en un
  // solo bloque: ese es la raíz y no hay nada más que indexar.
  //
  // El docente lo escribe como `niveles = log_bfri(entradas)` y da lo mismo
  // para los dos ejercicios de su hoja, pero la cascada es la que manda: con
  // una sola entrada el logaritmo da 0 niveles y la estructura igual necesita
  // un bloque. La fórmula se muestra; esto es lo que se cuenta.
  function nivelesDelIndice({ entradas, Ri, B }) {
    const niveles = [];
    let pendientes = entradas;
    do {
      const nivel = forma({ entradas: pendientes, longitudRegistro: Ri, B });
      niveles.push(nivel);
      pendientes = nivel.bloques;
    } while (pendientes > 1);
    return niveles;
  }

  // Un índice de un solo nivel se recorre con búsqueda binaria sobre sus
  // bloques, y al final hay que leer el bloque de datos: de ahí el `+ 1`.
  const accesosUnNivel = (bloques) => Math.ceil(Math.log2(bloques)) + 1;

  // El multinivel no busca: baja. Un bloque por nivel, y otra vez el `+ 1` del
  // bloque de datos.
  const accesosMultinivel = (niveles) => niveles + 1;

  // La estructura entera, como columnas de izquierda a derecha —que es como la
  // dibuja el docente— y con el archivo de datos siempre al final.
  //
  // `frontera` es cuántos bloques de la columna siguiente abarca **un** bloque
  // de esta: 273 entradas por bloque de índice son 273 bloques de datos. Es el
  // número que hace entendible por qué 54 bloques bastan para indexar 14.706,
  // y por eso quien dibuja lo marca como bloque relevante (CLAUDE.md 6.2).
  function estructuraDeIndices({ r, R, Ri, B, tipo, niveles }) {
    const archivo = formaDelArchivo({ r, R, B });
    const entradas = entradasDelIndice({ tipo, archivo });
    const escalones = niveles === NIVELES.MULTINIVEL
      ? nivelesDelIndice({ entradas, Ri, B })
      : [forma({ entradas, longitudRegistro: Ri, B })];

    // Del más alto al más bajo: la raíz queda a la izquierda, que es por donde
    // entra la búsqueda.
    const columnas = escalones.slice().reverse().map((nivel, indice) => ({
      id: `nivel-${escalones.length - indice}`,
      clase: 'indice',
      titulo: escalones.length === 1
        ? `Índice ${tipo}`
        : `Nivel ${escalones.length - indice}${indice === escalones.length - 1 ? ` · ${tipo}` : ''}`,
      unidad: 'entr.',
      ...nivel
    }));
    columnas.push({
      id: 'datos',
      clase: 'datos',
      titulo: 'Registros de datos',
      unidad: 'reg.',
      ...archivo
    });

    // Cada columna hereda la frontera de la que tiene a su izquierda: la
    // primera no tiene quién la señale.
    for (let i = 1; i < columnas.length; i++) {
      columnas[i].frontera = columnas[i - 1].porBloque;
    }

    const accesos = niveles === NIVELES.MULTINIVEL
      ? accesosMultinivel(escalones.length)
      : accesosUnNivel(escalones[0].bloques);

    return { archivo, tipo, niveles, entradas, escalones, columnas, accesos };
  }

  // El rango de entradas que abre y cierra un bloque, que es la escala que el
  // docente escribe a la izquierda de cada columna: 1/273, 274/546, … El
  // último bloque llega hasta la **capacidad** y no hasta la ocupación, porque
  // esas posiciones existen aunque estén libres — por eso su columna termina
  // en 14.742 y no en 14.706.
  function rangoDelBloque(columna, bloque) {
    const primero = (bloque - 1) * columna.porBloque + 1;
    return { primero, ultimo: primero + columna.porBloque - 1 };
  }

  // --- Validación de los cuatro parámetros ---------------------------------

  function entero(entrada, { etiqueta, minimo, maximo }) {
    const texto = String(entrada).trim();
    if (texto === '') return { valido: false, mensaje: `Falta ${etiqueta}.` };
    if (!/^\d+$/.test(texto)) {
      return { valido: false, mensaje: `${etiqueta}: debe ser un número entero positivo.` };
    }
    const valor = Number(texto);
    if (valor < minimo || valor > maximo) {
      return { valido: false, mensaje: `${etiqueta}: debe estar entre ${minimo} y ${maximo}.` };
    }
    return { valido: true, valor };
  }

  const validarRegistros = (entrada) => entero(entrada, {
    etiqueta: 'Registros del archivo (r)', minimo: 1, maximo: REGISTROS_MAXIMO
  });

  const validarBloque = (entrada) => entero(entrada, {
    etiqueta: 'Tamaño del bloque (B)', minimo: BLOQUE_MINIMO, maximo: BLOQUE_MAXIMO
  });

  // Un registro que no cabe en un bloque no da estructura: el factor de
  // bloqueo sería cero y no habría dónde poner nada.
  function validarLongitud(entrada, { etiqueta, B }) {
    const lectura = entero(entrada, { etiqueta, minimo: 1, maximo: BLOQUE_MAXIMO });
    if (!lectura.valido) return lectura;
    if (B !== undefined && lectura.valor > B) {
      return {
        valido: false,
        mensaje: `${etiqueta}: no puede superar el tamaño del bloque (${B} bytes), o no cabría ni un registro.`
      };
    }
    return lectura;
  }

  // Los dos selectores del formulario. Se validan igual que los demás campos
  // —el estudiante no los escribe, pero un archivo abierto sí puede traer
  // cualquier cosa— y el vacío cae en la opción de partida.
  function unaDe(entrada, valores, porOmision, etiqueta) {
    const texto = String(entrada).trim();
    if (texto === '') return { valido: true, valor: porOmision };
    if (!valores.includes(texto)) {
      return { valido: false, mensaje: `${etiqueta}: «${texto}» no es una opción.` };
    }
    return { valido: true, valor: texto };
  }

  const validarTipo = (entrada) => unaDe(
    entrada, [TIPOS.PRIMARIO, TIPOS.SECUNDARIO], TIPOS.PRIMARIO, 'Tipo de índice'
  );

  const validarNiveles = (entrada) => unaDe(
    entrada, [NIVELES.UNO, NIVELES.MULTINIVEL], NIVELES.UNO, 'Niveles'
  );

  window.CC2 = window.CC2 || {};
  window.CC2.dominio = window.CC2.dominio || {};
  window.CC2.dominio.indices = {
    TIPOS,
    NIVELES,
    BLOQUE_MINIMO,
    BLOQUE_MAXIMO,
    REGISTROS_MAXIMO,
    mil,
    factorDeBloqueo,
    bloquesPara,
    formaDelArchivo,
    entradasDelIndice,
    nivelesDelIndice,
    accesosUnNivel,
    accesosMultinivel,
    estructuraDeIndices,
    rangoDelBloque,
    validarRegistros,
    validarBloque,
    validarLongitud,
    validarTipo,
    validarNiveles
  };
})();

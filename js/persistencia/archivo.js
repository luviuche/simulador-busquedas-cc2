(function () {
  // Guardar y abrir estructuras en archivos `.cc2` (CLAUDE.md 10).
  //
  // **Lo que se guarda son las claves en su orden de llegada, no la tabla.**
  // En los temas de transformación de claves ese orden es lo que decide dónde
  // cae cada una —dos órdenes del mismo conjunto dan tablas distintas en
  // cuanto hay colisiones—, así que la tabla se rehace al abrir, reinsertando
  // en ese orden. Guardar la colocación sería guardar dos veces lo mismo, y
  // mal: solo significa algo dentro de las reglas del tema que la produjo.
  //
  // Lo que el archivo devuelve es la estructura con sus claves, lista para
  // operar —`n`, `l` y las claves, esté completa o no—, y nada de sesión: ni
  // bitácora, ni paso en curso.

  const VERSION = 1;
  const EXTENSION = '.cc2';

  function serializar({ tema, estructura, titulo }) {
    return {
      version: VERSION,
      tema,
      titulo,
      tipoClave: estructura.tipoClave,
      n: estructura.n,
      l: estructura.l,
      tratamiento: estructura.tratamiento || null,
      parametros: estructura.parametros || {},
      // El orden de llegada y no el contenido de la tabla: ver arriba.
      claves: (estructura.ordenLlegada || []).slice(),
      creadaEn: new Date().toISOString()
    };
  }

  // Un nombre que diga de qué es el archivo sin abrirlo, porque en la carpeta
  // de descargas va a estar junto a otros quince: tema y los datos con que se
  // creó, que es lo mismo con lo que se reconoce una estructura reciente
  // (CLAUDE.md 10.3).
  function nombreSugerido({ tema, estructura }) {
    const partes = [tema, `n${estructura.n}`];
    if (estructura.l !== undefined) partes.push(`l${estructura.l}`);
    return partes.join('-') + EXTENSION;
  }

  // Qué tiene que traer un archivo para que se pueda abrir **en este tema**.
  // Se valida antes de tocar nada: si algo no cuadra, la estructura que está
  // en pantalla se queda como está (CLAUDE.md 10.5).
  function validar(datos, tema) {
    if (!datos || typeof datos !== 'object') {
      return { valido: false, mensaje: 'Archivo ilegible: no contiene una estructura.' };
    }
    if (datos.version !== VERSION) {
      return {
        valido: false,
        mensaje: `Versión no reconocida: el archivo dice ${datos.version} y esta versión lee ${VERSION}.`
      };
    }
    if (datos.tema !== tema) {
      return {
        valido: false,
        mensaje: `El archivo es de otro tema ("${datos.tema}"): ábralo desde ese tema.`
      };
    }
    if (!Number.isInteger(datos.n) || datos.n < 1) {
      return { valido: false, mensaje: 'Archivo incompleto: no trae un tamaño válido.' };
    }
    if (!Array.isArray(datos.claves)) {
      return { valido: false, mensaje: 'Archivo incompleto: no trae la lista de claves.' };
    }
    // El archivo puede venir a medio llenar —se guarda como esté— pero no con
    // más claves de las que caben.
    if (datos.claves.length > datos.n) {
      return {
        valido: false,
        mensaje: `Archivo inconsistente: trae ${datos.claves.length} claves para una estructura de ${datos.n}.`
      };
    }
    return { valido: true, datos };
  }

  function comoTexto(datos) {
    return JSON.stringify(datos, null, 2);
  }

  // Guardar tiene dos niveles y se elige en tiempo de ejecución, no de
  // antemano (CLAUDE.md 10.2):
  //
  //   2. `showSaveFilePicker` — diálogo real de "Guardar como", con elección
  //      de carpeta y regrabado sobre el mismo archivo. **No existe cuando la
  //      aplicación se abre con `file://`**, que es como se abre casi siempre:
  //      Chromium no expone esos selectores a una página abierta como archivo.
  //   1. Descarga — siempre disponible. Deja el archivo en la carpeta de
  //      descargas con el nombre sugerido; para elegir carpeta y nombre, el
  //      ajuste "preguntar dónde guardar cada archivo" del navegador abre el
  //      explorador en cada descarga.
  function hayDialogoDeGuardado() {
    return typeof window.showSaveFilePicker === 'function';
  }

  async function guardar({ datos, nombre }) {
    const texto = comoTexto(datos);

    if (hayDialogoDeGuardado()) {
      try {
        const manejador = await window.showSaveFilePicker({
          suggestedName: nombre,
          types: [{
            description: 'Estructura del simulador',
            accept: { 'application/json': [EXTENSION] }
          }]
        });
        const escritura = await manejador.createWritable();
        await escritura.write(texto);
        await escritura.close();
        return { exito: true, via: 'dialogo', nombre: manejador.name };
      } catch (error) {
        // Cancelar el diálogo no es un fallo: es decir que no.
        if (error && error.name === 'AbortError') return { exito: false, cancelado: true };
        // Cualquier otro tropiezo cae a la descarga, que siempre funciona.
      }
    }

    const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    // Se libera después, no en el acto: revocar antes de que el navegador
    // haya empezado la descarga la cancela.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { exito: true, via: 'descarga', nombre };
  }

  // Abrir sí es nativo desde `file://`: `<input type="file">` abre el
  // explorador del sistema y `FileReader` lee el archivo.
  function leer(archivo) {
    return new Promise((resolver) => {
      const lector = new FileReader();
      lector.onerror = () => resolver({ exito: false, mensaje: 'No se pudo leer el archivo.' });
      lector.onload = () => {
        try {
          resolver({ exito: true, datos: JSON.parse(String(lector.result)) });
        } catch (error) {
          resolver({ exito: false, mensaje: 'Archivo ilegible: no es un JSON válido.' });
        }
      };
      lector.readAsText(archivo);
    });
  }

  window.CC2 = window.CC2 || {};
  window.CC2.persistencia = window.CC2.persistencia || {};
  window.CC2.persistencia.archivo = {
    VERSION,
    EXTENSION,
    serializar,
    nombreSugerido,
    validar,
    comoTexto,
    hayDialogoDeGuardado,
    guardar,
    leer
  };
})();

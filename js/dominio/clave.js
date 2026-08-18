(function () {
  const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const TILDES = { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ü': 'U' };

  function validarClaveNumerica(entrada, l) {
    const texto = String(entrada).trim();
    if (!/^[0-9]+$/.test(texto)) {
      return { valido: false, mensaje: 'Carácter no admitido: solo se aceptan dígitos.' };
    }
    if (texto.length !== l) {
      return { valido: false, mensaje: `Longitud de clave inválida: se esperan ${l} dígitos.` };
    }
    // Sin ceros a la izquierda (CLAUDE.md 3.3): rechazarlo aquí evita distinguir
    // "0521" de "521" más adelante, donde ya son el mismo número.
    if (texto[0] === '0') {
      return { valido: false, mensaje: 'Carácter no admitido: no se aceptan ceros a la izquierda.' };
    }
    return { valido: true, valor: Number(texto) };
  }

  function normalizarLetra(letra) {
    const mayus = letra.toUpperCase();
    return TILDES[mayus] || mayus;
  }

  function mapearLetraADigitos(letra) {
    const posicion = ALFABETO.indexOf(letra) + 1;
    return String(posicion).padStart(2, '0');
  }

  // Implementación diferida (CLAUDE.md 3.4): el tipo se mantiene en el modelo,
  // deshabilitado en la interfaz, hasta que se habiliten las claves alfabéticas.
  function validarClaveAlfabetica(entrada, l) {
    const texto = String(entrada).trim();
    if (texto.length !== l) {
      return { valido: false, mensaje: `Longitud de clave inválida: se esperan ${l} letras.` };
    }
    const letras = [];
    for (const caracter of texto) {
      const normal = normalizarLetra(caracter);
      if (!ALFABETO.includes(normal)) {
        return { valido: false, mensaje: 'Carácter no admitido en el alfabeto definido (A–Z).' };
      }
      letras.push(normal);
    }
    const palabra = letras.join('');
    const claveTransformada = Number(letras.map(mapearLetraADigitos).join(''));
    return { valido: true, palabra, claveTransformada };
  }

  window.CC2 = window.CC2 || {};
  window.CC2.dominio = window.CC2.dominio || {};
  window.CC2.dominio.clave = {
    ALFABETO,
    validarClaveNumerica,
    validarClaveAlfabetica,
    normalizarLetra,
    mapearLetraADigitos
  };
})();

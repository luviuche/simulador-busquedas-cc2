(function () {
  // Reasignación (CLAUDE.md 5.4): la clave que choca busca otra casilla dentro
  // de la misma tabla. Las tres pruebas se distinguen solo en **a qué casilla
  // saltan**; parar, contar y dibujar es igual en las tres.
  //
  // Devuelven **cada casilla recorrida**, no solo el destino: el documento lo
  // exige y es lo que deja ver por qué una clave terminó lejos de su dirección.
  // Cada visita lleva además la cuenta que la llevó ahí: `detalle` para la
  // bitácora, y `etiqueta` + `expresion` para el renglón del salto en el panel
  // del cálculo.
  //
  // `condicion(clave, casilla)` decide dónde para el sondeo: al insertar se
  // detiene en la primera casilla libre; al buscar, en la que tiene la clave
  // objetivo o en la primera vacía, que prueba que la clave no está.

  // Lo que se pasa de n da la vuelta y sigue contando: se escribe la suma y
  // se le restan las vueltas completas, `9 + 2² = 13 − 12`.
  function conVueltas(expresion, total, n) {
    const vueltas = Math.floor((total - 1) / n);
    return vueltas === 0 ? expresion : `${expresion} = ${total} − ${vueltas * n}`;
  }

  // D', D'', D''' y de ahí en adelante D⁽⁴⁾, D⁽⁵⁾…: más primas no se leen.
  const SUPERINDICES = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  function prima(k) {
    if (k <= 3) return `D${"'".repeat(k)}`;
    return `D⁽${String(k).split('').map((c) => SUPERINDICES[Number(c)]).join('')}⁾`;
  }

  // Prueba lineal: desde la dirección ocupada se avanza de a una casilla,
  // dando la vuelta al final de la estructura.
  function sondearLineal({ claves, n, desde, condicion }) {
    const recorrido = [];
    for (let salto = 1; salto <= n - 1; salto++) {
      // El módulo sobre base 0 y el +1 de vuelta: la casilla n+1 es la 1.
      const casilla = ((desde - 1 + salto) % n) + 1;
      const clave = claves[casilla - 1];
      const detener = condicion(clave, casilla);
      recorrido.push({
        casilla, clave, detener,
        detalle: `${desde} + ${salto}`,
        etiqueta: `i = ${salto}`,
        expresion: conVueltas(`${desde} + ${salto}`, desde + salto, n)
      });
      if (detener) return { recorrido, casilla, clave, agotado: false };
    }
    // Dio la vuelta completa sin cumplir la condición: no queda dónde mirar.
    return { recorrido, casilla: 0, clave: undefined, agotado: true };
  }

  // Prueba cuadrática: el intento i va a D + i², y lo que se pase de n da la
  // vuelta con módulo y sigue contando (confirmado por el docente, 2026-09-23:
  // no se reinicia desde la casilla 1).
  //
  // A diferencia de la lineal **no recorre toda la tabla**: i² mod n repite
  // valores, así que puede agotarse con casillas libres que nunca alcanza.
  // Pasados n − 1 intentos los cuadrados se repiten enteros —(i + n)² ≡ i²—,
  // así que ahí se corta: seguir sería el ciclo sin fin del algoritmo. Las
  // casillas que ya visitó no se vuelven a recorrer: no cambian de respuesta.
  function sondearCuadratico({ claves, n, desde, condicion }) {
    const recorrido = [];
    const vistas = new Set([desde]);
    for (let i = 1; i <= n - 1; i++) {
      const casilla = ((desde - 1 + i * i) % n) + 1;
      if (vistas.has(casilla)) continue;
      vistas.add(casilla);
      const clave = claves[casilla - 1];
      const detener = condicion(clave, casilla);
      recorrido.push({
        casilla, clave, detener,
        detalle: `${desde} + ${i}²`,
        etiqueta: `i = ${i}`,
        expresion: conVueltas(`${desde} + ${i}²`, desde + i * i, n)
      });
      if (detener) return { recorrido, casilla, clave, agotado: false };
    }
    return { recorrido, casilla: 0, clave: undefined, agotado: true };
  }

  // Doble función hash, como la plantea el docente (2026-09-23): la segunda
  // función no se aplica a la clave sino **a la dirección anterior**,
  // H'(D) = ((D + 1) mod n) + 1, y así sucesivamente: D' = H'(D),
  // D'' = H'(D')… Con direcciones en 1..n eso avanza de a dos casillas.
  //
  // Como la siguiente casilla depende solo de la actual, volver a una ya
  // visitada es entrar en ciclo: ahí se corta. Con n par recorre solo las
  // casillas de la misma paridad que la dirección.
  function sondearDobleHash({ claves, n, desde, condicion }) {
    const recorrido = [];
    const vistas = new Set([desde]);
    let actual = desde;
    for (;;) {
      const casilla = ((actual + 1) % n) + 1;
      if (vistas.has(casilla)) break;
      vistas.add(casilla);
      const clave = claves[casilla - 1];
      const detener = condicion(clave, casilla);
      recorrido.push({
        casilla, clave, detener,
        detalle: `H'(${actual}) = (${actual} + 1) mod ${n} + 1`,
        etiqueta: `${prima(recorrido.length + 1)} = H'(${actual})`,
        expresion: `(${actual} + 1) mod ${n} + 1`
      });
      if (detener) return { recorrido, casilla, clave, agotado: false };
      actual = casilla;
    }
    return { recorrido, casilla: 0, clave: undefined, agotado: true };
  }

  window.CC2 = window.CC2 || {};
  window.CC2.algoritmos = window.CC2.algoritmos || {};
  window.CC2.algoritmos.colisiones = window.CC2.algoritmos.colisiones || {};
  window.CC2.algoritmos.colisiones.reasignacion = { sondearLineal, sondearCuadratico, sondearDobleHash };
})();

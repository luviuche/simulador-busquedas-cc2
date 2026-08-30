// Corre pruebas/humo.html en Edge headless y reporta el informe.
//
// A varios altos de ventana, porque así se detectaron las regresiones de
// layout: la pantalla se ancla al viewport y lo que cabe a 950 px puede no
// caber a 700. Sale con código 1 si alguna comprobación falla, para poder
// encadenarlo con otras órdenes.
//
//   node .claude/skills/verificar/scripts/humo.js            → 700, 800 y 950
//   node .claude/skills/verificar/scripts/humo.js 700        → solo ese alto
//   node .claude/skills/verificar/scripts/humo.js --informe  → el informe entero
const { volcar, salidaDe } = require('./navegador.js');

const ALTOS_POR_DEFECTO = [700, 800, 950];

function corridaEn(alto) {
  const volcado = volcar({ ruta: 'pruebas/humo.html', alto });
  const salida = salidaDe(volcado);
  if (salida === null) {
    return { alto, fallas: 1, lineas: ['sin informe: el volcado no trae #salida (¿subir el presupuesto de tiempo virtual?)'] };
  }

  const lineas = salida.split('\n');
  // La primera línea es el resultado; las que empiezan por ✕ son las
  // comprobaciones que fallaron, y EXCEPCIÓN/ERROR lo que ni llegó a correr.
  const malas = lineas.filter((linea) => /^(✕|EXCEPCIÓN|ERROR)/.test(linea.trim()));
  return { alto, resumen: lineas[0], fallas: malas.length, lineas: malas, salida };
}

const argumentos = process.argv.slice(2);
const informeEntero = argumentos.includes('--informe');
const altos = argumentos.map(Number).filter((n) => Number.isFinite(n) && n > 0);

// El informe entero es de un solo alto: leerlo tres veces no dice nada nuevo,
// y lo que se busca ahí es el registro paso a paso de las pruebas.
if (informeEntero) {
  const corrida = corridaEn(altos[0] || 950);
  console.log(corrida.salida || corrida.lineas.join('\n'));
  process.exit(corrida.fallas > 0 ? 1 : 0);
}

let fallas = 0;

for (const alto of (altos.length ? altos : ALTOS_POR_DEFECTO)) {
  const corrida = corridaEn(alto);
  fallas += corrida.fallas;
  console.log(`\n── humo a ${alto} px de alto ──`);
  console.log(corrida.resumen || '');
  for (const linea of corrida.lineas) console.log('  ' + linea.trim());
}

if (fallas > 0) {
  console.log(`\n${fallas} comprobación(es) fallaron.`);
  console.log('Para leer el informe entero: node .claude/skills/verificar/scripts/humo.js --informe');
}
process.exit(fallas > 0 ? 1 : 0);

// Los archivos de dominio/algoritmos usan el patrón window.CC2.<capa>.<modulo>
// pensado para <script> clásicos en el navegador. Node no tiene `window`;
// este shim lo simula para poder requerirlos tal cual desde las pruebas.
global.window = global;

require('../js/dominio/limites.js');
require('../js/dominio/clave.js');
require('../js/dominio/estructura.js');
require('../js/algoritmos/traza.js');
require('../js/algoritmos/secuencial.js');
require('../js/algoritmos/binaria.js');
// elision.js vive en vista/ pero es cálculo puro: no toca el DOM.
require('../js/vista/elision.js');

module.exports = window.CC2;

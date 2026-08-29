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
require('../js/algoritmos/eliminacion.js');
require('../js/algoritmos/colisiones/reasignacion.js');
require('../js/algoritmos/colisiones/anidados.js');
require('../js/algoritmos/colisiones/encadenamiento.js');
require('../js/algoritmos/hash/comun.js');
require('../js/algoritmos/hash/modulo.js');
require('../js/algoritmos/hash/cuadrado.js');
require('../js/algoritmos/hash/truncamiento.js');
require('../js/algoritmos/hash/plegamiento.js');
require('../js/algoritmos/hash/bases.js');
require('../js/algoritmos/hash/operaciones.js');
// elision.js vive en vista/ pero es cálculo puro: no toca el DOM.
require('../js/vista/elision.js');

module.exports = window.CC2;

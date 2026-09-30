// Selecciona la capa de datos: demostración (navegador) o Firebase
import { MODO_DEMO } from './config.js';

export async function crearAPI() {
  const mod = MODO_DEMO ? await import('./data-demo.js') : await import('./data-firebase.js');
  return mod.crearAPI();
}

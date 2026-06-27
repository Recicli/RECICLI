// ============================================================
//  CAPA 2: BACKEND — Rutas
//  Conecta cada URL con la función correspondiente del controlador.
//  Todas cuelgan del prefijo /api/solicitudes (definido en server.js).
// ============================================================
import { Router } from 'express';
import {
  obtenerEnRuta,
  congelarViaje,
  cancelarSolicitud,
  finalizarViaje,
} from '../controllers/solicitudesController.js';

const router = Router();

router.get('/en-ruta', obtenerEnRuta);          // GET  /api/solicitudes/en-ruta
router.put('/congelar', congelarViaje);          // PUT  /api/solicitudes/congelar
router.put('/cancelar/:id', cancelarSolicitud);  // PUT  /api/solicitudes/cancelar/5
router.put('/finalizar', finalizarViaje);        // PUT  /api/solicitudes/finalizar

export default router;

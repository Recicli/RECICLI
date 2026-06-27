// ============================================================
//  CAPA 2: BACKEND — Controlador de solicitudes
//  Aquí vive TODA la lógica de negocio del ciclo del viaje.
// ============================================================
import { pool } from '../config/database.js';

// ------------------------------------------------------------
//  GET /api/solicitudes/en-ruta
//  Devuelve los puntos que el chofer está visitando AHORA mismo
//  (los que están congelados en estado EN_RUTA), ya ordenados.
//  Este es el endpoint que el frontend consulta cada pocos segundos.
// ------------------------------------------------------------
export async function obtenerEnRuta(req, res) {
  try {
    const [filas] = await pool.query(
      `SELECT s.id,
              s.usuario_id,
              s.latitud,
              s.longitud,
              s.referencia,
              s.estado,
              s.orden_visita,
              u.nombre AS cliente
         FROM solicitudes_recojo s
         JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.estado = 'EN_RUTA'
        ORDER BY s.orden_visita ASC, s.id ASC`
    );
    res.json(filas);
  } catch (error) {
    console.error('Error en obtenerEnRuta:', error);
    res.status(500).json({ mensaje: 'Error al obtener las solicitudes en ruta' });
  }
}

// ------------------------------------------------------------
//  PUT /api/solicitudes/congelar
//  "Inicia el viaje": todo lo que esté en PENDIENTE pasa a EN_RUTA.
//  A partir de aquí el viaje queda congelado: las solicitudes
//  nuevas entran como PENDIENTE y NO se mezclan con este recorrido.
// ------------------------------------------------------------
export async function congelarViaje(req, res) {
  try {
    const [resultado] = await pool.query(
      `UPDATE solicitudes_recojo
          SET estado = 'EN_RUTA'
        WHERE estado = 'PENDIENTE'`
    );
    res.json({
      mensaje: `Viaje iniciado. Se congelaron ${resultado.affectedRows} solicitud(es).`,
      afectadas: resultado.affectedRows,
    });
  } catch (error) {
    console.error('Error en congelarViaje:', error);
    res.status(500).json({ mensaje: 'Error al iniciar (congelar) el viaje' });
  }
}

// ------------------------------------------------------------
//  PUT /api/solicitudes/cancelar/:id
//  El usuario cancela una solicitud que estaba EN_RUTA.
//  Se hace dentro de una TRANSACCIÓN para que las 3 cosas
//  ocurran juntas (o ninguna):
//    1. La solicitud pasa a CANCELADO.
//    2. El usuario suma +1 a su contador de cancelaciones.
//    3. Si el contador llega a 3, el usuario pasa a BLOQUEADO.
// ------------------------------------------------------------
export async function cancelarSolicitud(req, res) {
  const { id } = req.params;
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    // 1) Buscamos la solicitud y bloqueamos su fila (FOR UPDATE)
    //    para que nadie más la toque mientras la procesamos.
    const [solicitudes] = await conexion.query(
      `SELECT id, usuario_id, estado
         FROM solicitudes_recojo
        WHERE id = ?
          FOR UPDATE`,
      [id]
    );

    if (solicitudes.length === 0) {
      await conexion.rollback();
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }
    const solicitud = solicitudes[0];

    // 2) La solicitud pasa a CANCELADO.
    await conexion.query(
      `UPDATE solicitudes_recojo SET estado = 'CANCELADO' WHERE id = ?`,
      [id]
    );

    // 3) Sumamos +1 al contador de cancelaciones del usuario.
    await conexion.query(
      `UPDATE usuarios SET cancelaciones = cancelaciones + 1 WHERE id = ?`,
      [solicitud.usuario_id]
    );

    // 4) Releemos el contador para decidir si se bloquea.
    const [usuarios] = await conexion.query(
      `SELECT cancelaciones FROM usuarios WHERE id = ?`,
      [solicitud.usuario_id]
    );
    const totalCancelaciones = usuarios[0].cancelaciones;

    let usuarioBloqueado = false;
    if (totalCancelaciones >= 3) {
      await conexion.query(
        `UPDATE usuarios SET estado = 'BLOQUEADO' WHERE id = ?`,
        [solicitud.usuario_id]
      );
      usuarioBloqueado = true;
    }

    await conexion.commit();

    res.json({
      mensaje: 'Solicitud cancelada correctamente',
      solicitud_id: Number(id),
      usuario_id: solicitud.usuario_id,
      cancelaciones: totalCancelaciones,
      usuario_bloqueado: usuarioBloqueado,
    });
  } catch (error) {
    await conexion.rollback();
    console.error('Error en cancelarSolicitud:', error);
    res.status(500).json({ mensaje: 'Error al cancelar la solicitud' });
  } finally {
    conexion.release(); // siempre devolvemos la conexión al pool
  }
}

// ------------------------------------------------------------
//  PUT /api/solicitudes/finalizar
//  Cierra el ciclo: todo lo que quedó EN_RUTA pasa a COMPLETADO.
//  El mapa queda limpio y listo para un nuevo viaje.
// ------------------------------------------------------------
export async function finalizarViaje(req, res) {
  try {
    const [resultado] = await pool.query(
      `UPDATE solicitudes_recojo
          SET estado = 'COMPLETADO'
        WHERE estado = 'EN_RUTA'`
    );
    res.json({
      mensaje: `Viaje finalizado. Se completaron ${resultado.affectedRows} punto(s).`,
      afectadas: resultado.affectedRows,
    });
  } catch (error) {
    console.error('Error en finalizarViaje:', error);
    res.status(500).json({ mensaje: 'Error al finalizar el viaje' });
  }
}

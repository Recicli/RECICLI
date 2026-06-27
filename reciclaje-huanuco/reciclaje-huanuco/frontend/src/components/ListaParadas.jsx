// ============================================================
//  CAPA 3: FRONTEND — Componente ListaParadas
//  Panel lateral con el resumen del recorrido (distancia y tiempo)
//  y la lista ordenada de clientes a visitar. Cada parada tiene un
//  boton para "cancelar" que simula la accion del ciudadano desde
//  su propia app (en produccion ese cambio llega por otro lado y el
//  mapa lo detecta solo por el sondeo del hook).
// ============================================================

export default function ListaParadas({ paradas, info, cargando, error, onCancelar }) {
  const km = (info.distancia / 1000).toFixed(2);
  const minutos = Math.round(info.duracion / 60);

  return (
    <aside className="panel">
      <div className="panel-cabecera">
        <h2>Paradas del recorrido</h2>
        <span className="contador">{paradas.length}</span>
      </div>

      {/* Resumen de la ruta calculada por OSRM */}
      <div className="resumen">
        <div className="resumen-item">
          <span className="resumen-valor">{km}</span>
          <span className="resumen-etq">km de recorrido</span>
        </div>
        <div className="resumen-item">
          <span className="resumen-valor">{minutos}</span>
          <span className="resumen-etq">min estimados</span>
        </div>
      </div>

      {/* Estados */}
      {cargando && <p className="estado estado-cargando">Recalculando ruta…</p>}
      {error && <p className="estado estado-error">⚠ {error}</p>}

      {paradas.length === 0 && !cargando && (
        <p className="estado estado-vacio">
          No hay paradas en ruta. Pulsa <strong>Iniciar viaje</strong> para
          congelar las solicitudes pendientes y armar el recorrido.
        </p>
      )}

      {/* Lista ordenada de clientes */}
      <ol className="lista">
        {paradas.map((parada, indice) => (
          <li key={parada.id} className="parada">
            <span className="parada-numero">{indice + 1}</span>
            <div className="parada-info">
              <strong className="parada-cliente">{parada.cliente}</strong>
              <span className="parada-ref">{parada.referencia}</span>
            </div>
            <button
              className="btn-cancelar"
              onClick={() => onCancelar(parada.id)}
              title="Cancelar esta solicitud (simula al ciudadano)"
            >
              Cancelar
            </button>
          </li>
        ))}
      </ol>

      {paradas.length > 0 && (
        <p className="nota">
          Al cancelar, el punto desaparece del mapa y la ruta se vuelve a
          dibujar por las calles con las paradas que quedan.
        </p>
      )}
    </aside>
  );
}

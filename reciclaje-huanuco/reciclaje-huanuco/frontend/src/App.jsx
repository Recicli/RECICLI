// ============================================================
//  CAPA 3: FRONTEND — App principal
//  Une todas las piezas:
//    - useRutaChofer  -> los datos vivos (paradas + ruta).
//    - MapaChofer     -> el mapa con la ruta real.
//    - ListaParadas   -> el panel lateral.
//    - Barra superior -> botones Iniciar / Finalizar viaje.
// ============================================================
import { useState } from 'react';
import MapaChofer from './components/MapaChofer.jsx';
import ListaParadas from './components/ListaParadas.jsx';
import { useRutaChofer } from './hooks/useRutaChofer.js';

const API_BASE = 'http://localhost:4000/api';

export default function App() {
  const { paradas, lineaRuta, info, cargando, error, deposito, refrescar } =
    useRutaChofer();
  const [aviso, setAviso] = useState('');

  // Llama a un endpoint PUT del backend y refresca la vista.
  async function accionViaje(ruta) {
    try {
      const respuesta = await fetch(`${API_BASE}/${ruta}`, { method: 'PUT' });
      const datos = await respuesta.json();
      setAviso(datos.mensaje || 'Operacion realizada');
      await refrescar(); // forzamos la actualizacion al instante
    } catch {
      setAviso('No se pudo conectar con el backend. ¿Esta encendido?');
    }
  }

  // Cancela una parada (simula al ciudadano cancelando desde su app).
  async function cancelarParada(id) {
    try {
      const respuesta = await fetch(
        `${API_BASE}/solicitudes/cancelar/${id}`,
        { method: 'PUT' }
      );
      const datos = await respuesta.json();
      setAviso(
        datos.usuario_bloqueado
          ? `Solicitud cancelada. Usuario BLOQUEADO (${datos.cancelaciones} cancelaciones).`
          : `Solicitud cancelada (${datos.cancelaciones} cancelacion[es] del usuario).`
      );
      await refrescar(); // el mapa reacciona de inmediato
    } catch {
      setAviso('No se pudo cancelar la solicitud.');
    }
  }

  return (
    <div className="app">
      <header className="barra-superior">
  <div className="marca">
          {/* COPIA SOLO DESDE AQUÍ */}
          <button 
            onClick={() => window.close()} 
            style={{
              backgroundColor: '#111111', 
              color: '#ffffff',           
              padding: '10px 16px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginRight: '25px',        
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            ⬅ Volver a EcoRed
          </button>
          {/* HASTA AQUÍ */}

          <span className="marca-icono">♻</span>
          <div className="marca-texto">
            <h1>Rutas de Reciclaje · Huánuco</h1>
            <p>Depósito Central: Plaza de Armas</p>
          </div>
        </div>

        <div className="acciones">
          <button
            className="btn btn-iniciar"
            onClick={() => accionViaje('solicitudes/congelar')}
          >
            Iniciar viaje
          </button>
          <button
            className="btn btn-finalizar"
            onClick={() => accionViaje('solicitudes/finalizar')}
          >
            Finalizar viaje
          </button>
        </div>
      </header>

      {aviso && (
        <div className="aviso" onClick={() => setAviso('')}>
          {aviso}
        </div>
      )}

      <main className="contenido">
        <MapaChofer
          deposito={deposito}
          paradas={paradas}
          lineaRuta={lineaRuta}
        />
        <ListaParadas
          paradas={paradas}
          info={info}
          cargando={cargando}
          error={error}
          onCancelar={cancelarParada}
        />
      </main>
    </div>
  );
}

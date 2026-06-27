// ============================================================
//  CAPA 3: FRONTEND — Componente MapaChofer
//  Dibuja con React-Leaflet (OpenStreetMap) tres cosas:
//    - El marcador del Deposito Central (Plaza de Armas).
//    - Un marcador numerado por cada parada EN_RUTA.
//    - La <Polyline> con la ruta real por las calles (de OSRM).
// ============================================================
import { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Iconos personalizados (divIcon = HTML, evita el bug de los
//     iconos por defecto de Leaflet con Vite/empaquetadores) ---

// Deposito: el camion en la Plaza de Armas.
const iconoDeposito = L.divIcon({
  className: '',
  html: '<div class="marcador marcador-deposito">🚛</div>',
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -22],
});

// Parada: circulo verde con el numero de orden de visita.
function iconoParada(numero) {
  return L.divIcon({
    className: '',
    html: `<div class="marcador marcador-parada">${numero}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}

// --- Componente auxiliar: encuadra el mapa para que se vean todos
//     los puntos la PRIMERA vez que aparecen. Luego deja la vista
//     quieta para no marear al chofer en cada recalculo. ---
function AjustarVista({ deposito, paradas }) {
  const map = useMap();
  const yaAjustado = useRef(false);

  useEffect(() => {
    if (paradas.length > 0 && !yaAjustado.current) {
      const limites = [
        [deposito.lat, deposito.lng],
        ...paradas.map((p) => [Number(p.latitud), Number(p.longitud)]),
      ];
      map.fitBounds(limites, { padding: [60, 60] });
      yaAjustado.current = true;
    }
    // Si se vacian las paradas, permitimos reencuadrar en el proximo viaje.
    if (paradas.length === 0) {
      yaAjustado.current = false;
    }
  }, [paradas, deposito, map]);

  return null;
}

export default function MapaChofer({ deposito, paradas, lineaRuta }) {
  return (
    <div className="mapa-contenedor">
      <MapContainer
        center={[deposito.lat, deposito.lng]}
        zoom={15}
        scrollWheelZoom={true}
        className="mapa"
      >
        {/* Capa base gratuita de OpenStreetMap */}
        <TileLayer
          attribution='&copy; colaboradores de OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Ruta real por las calles (la calcula OSRM). Solo se
            dibuja si hay geometria. Al cambiar "lineaRuta", React
            redibuja la Polyline automaticamente. */}
        {lineaRuta.length > 0 && (
          <Polyline
            positions={lineaRuta}
            pathOptions={{ color: '#15803d', weight: 5, opacity: 0.9 }}
          />
        )}

        {/* Marcador del Deposito Central */}
        <Marker position={[deposito.lat, deposito.lng]} icon={iconoDeposito}>
          <Popup>
            <strong>Deposito Central</strong>
            <br />
            Plaza de Armas de Huanuco
            <br />
            Inicio y fin de la ruta
          </Popup>
        </Marker>

        {/* Un marcador por cada parada EN_RUTA */}
        {paradas.map((p, indice) => (
          <Marker
            key={p.id}
            position={[Number(p.latitud), Number(p.longitud)]}
            icon={iconoParada(indice + 1)}
          >
            <Popup>
              <strong>Parada {indice + 1}</strong>
              <br />
              {p.cliente}
              <br />
              {p.referencia}
            </Popup>
          </Marker>
        ))}

        <AjustarVista deposito={deposito} paradas={paradas} />
      </MapContainer>
    </div>
  );
}

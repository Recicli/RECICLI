// ============================================================
//  CAPA 3: FRONTEND — Custom Hook useRutaChofer
//  Es el "cerebro" del lado del chofer. Se encarga de:
//    1. Preguntar al backend, cada pocos segundos, que puntos
//       estan EN_RUTA  (GET /api/solicitudes/en-ruta).
//    2. Comparar la lista nueva con la anterior. Si el conjunto
//       de puntos cambio (p. ej. uno menos = una cancelacion),
//       le pide a OSRM que vuelva a dibujar la ruta por las calles.
//    3. Exponer todo lo que la pantalla necesita: paradas, la
//       linea de la ruta, distancia/tiempo, estado de carga, etc.
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { calcularRutaCalles } from '../services/osrmService.js';

// URL base del backend.
const API_BASE = 'http://localhost:4000/api';

// Deposito Central = Plaza de Armas de Huanuco. Es el inicio y el
// fin de cada recorrido del camion.
export const DEPOSITO = {
  lat: -9.9306,
  lng: -76.2422,
  nombre: 'Deposito Central (Plaza de Armas)',
};

// Cada cuanto preguntamos al backend. 4 s es comodo para la demo;
// puedes bajarlo para que reaccione mas rapido.
const INTERVALO_MS = 4000;

export function useRutaChofer() {
  const [paradas, setParadas] = useState([]);          // puntos EN_RUTA
  const [lineaRuta, setLineaRuta] = useState([]);       // [[lat,lng],...]
  const [info, setInfo] = useState({ distancia: 0, duracion: 0 });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Guardamos la "firma" del conjunto anterior de IDs para detectar
  // cambios sin redibujar de mas en cada sondeo.
  const firmaPreviaRef = useRef('');

  // --- Pide la ruta a OSRM: deposito -> paradas -> deposito ---
  const recalcularRuta = useCallback(async (listaParadas) => {
    const puntos = [
      DEPOSITO,
      ...listaParadas.map((p) => ({
        lat: Number(p.latitud),
        lng: Number(p.longitud),
      })),
      DEPOSITO,
    ];

    setCargando(true);
    try {
      const resultado = await calcularRutaCalles(puntos);
      setLineaRuta(resultado.coordenadas);
      setInfo({ distancia: resultado.distancia, duracion: resultado.duracion });
      setError(null);
    } catch (err) {
      setError(`OSRM: ${err.message}`);
    } finally {
      setCargando(false);
    }
  }, []);

  // --- Consulta los puntos EN_RUTA y decide si recalcular ---
  const consultarBackend = useCallback(async () => {
    try {
      const respuesta = await fetch(`${API_BASE}/solicitudes/en-ruta`);
      if (!respuesta.ok) throw new Error('No se pudo consultar el backend');
      const datos = await respuesta.json();

      // Firma = los IDs en orden. Si cambia, algo paso (cancelacion,
      // viaje recien congelado, viaje finalizado...).
      const firmaActual = datos.map((p) => p.id).join(',');

      if (firmaActual !== firmaPreviaRef.current) {
        firmaPreviaRef.current = firmaActual;
        setParadas(datos);

        if (datos.length > 0) {
          await recalcularRuta(datos); // <-- aqui se redibuja la ruta
        } else {
          // Ya no hay paradas: limpiamos el mapa.
          setLineaRuta([]);
          setInfo({ distancia: 0, duracion: 0 });
        }
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [recalcularRuta]);

  // --- Arranca el sondeo periodico al montar el componente ---
  useEffect(() => {
    consultarBackend(); // primera consulta inmediata
    const intervalo = setInterval(consultarBackend, INTERVALO_MS);
    return () => clearInterval(intervalo); // limpieza al desmontar
  }, [consultarBackend]);

  // "refrescar" permite forzar una consulta al instante (lo usamos
  // tras cancelar para que la reaccion se vea sin esperar al intervalo).
  return {
    paradas,
    lineaRuta,
    info,
    cargando,
    error,
    deposito: DEPOSITO,
    refrescar: consultarBackend,
  };
}

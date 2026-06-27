// ============================================================
//  CAPA 3: FRONTEND — Servicio de OSRM
//  Open Source Routing Machine es una API de rutas 100% gratuita
//  construida sobre OpenStreetMap. Su perfil "driving" respeta el
//  SENTIDO de las calles (one-way) de Huanuco segun los datos de OSM.
//
//  OJO con el orden de coordenadas (es el error mas comun):
//    - OSRM trabaja con  [longitud, latitud]
//    - Leaflet dibuja con [latitud, longitud]
//  Por eso enviamos "lng,lat" y al recibir invertimos a [lat, lng].
// ============================================================

// Servidor publico de demostracion de OSRM (gratuito, sin API key).
// Para un proyecto en produccion conviene levantar tu propio OSRM
// con el mapa de Peru, porque este servidor tiene limite de uso.
const OSRM_BASE_URL = 'https://router.project-osrm.org';

/**
 * Pide a OSRM la ruta que pasa por una lista de puntos, en orden.
 *
 * @param {Array<{lat:number, lng:number}>} puntos  Deposito + paradas + deposito
 * @returns {Promise<{coordenadas:Array<[number,number]>, distancia:number, duracion:number}>}
 *          coordenadas -> lista de [lat, lng] lista para <Polyline> de Leaflet
 *          distancia   -> metros
 *          duracion    -> segundos
 */
export async function calcularRutaCalles(puntos) {
  // Sin al menos 2 puntos no hay ruta que dibujar.
  if (!puntos || puntos.length < 2) {
    return { coordenadas: [], distancia: 0, duracion: 0 };
  }

  // Construimos la cadena "lng,lat;lng,lat;..." que espera OSRM.
  const cadenaCoords = puntos.map((p) => `${p.lng},${p.lat}`).join(';');

  // overview=full + geometries=geojson => geometria detallada que
  // sigue calle por calle (no una linea recta entre puntos).
  const url =
    `${OSRM_BASE_URL}/route/v1/driving/${cadenaCoords}` +
    `?overview=full&geometries=geojson`;

  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    throw new Error(`OSRM respondio con estado HTTP ${respuesta.status}`);
  }

  const datos = await respuesta.json();
  if (datos.code !== 'Ok' || !datos.routes || datos.routes.length === 0) {
    throw new Error(`OSRM no pudo calcular la ruta (code: ${datos.code})`);
  }

  const ruta = datos.routes[0];

  // GeoJSON entrega [lng, lat] -> lo damos vuelta a [lat, lng] para Leaflet.
  const coordenadas = ruta.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

  return {
    coordenadas,
    distancia: ruta.distance, // metros
    duracion: ruta.duration,  // segundos
  };
}

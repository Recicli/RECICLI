import { money } from "./script.js";
import { fetchImpactMetrics } from "./supabaseData.js";

export async function renderDatos() {
  const metrics = document.querySelector("#metricCards");
  const city = document.querySelector("#cityRanking");
  const material = document.querySelector("#materialCharts");

  if (metrics) metrics.innerHTML = `<article class="card">Cargando metricas desde Supabase...</article>`;

  try {
    const data = await fetchImpactMetrics();
    if (metrics) {
      const items = [
        ["kg reciclados publicados", data.kgReciclados.toLocaleString("es-PE")],
        ["productos activos", data.productosActivos],
        ["campanas activas", data.campanasActivas],
        ["usuarios registrados", data.usuariosRegistrados.toLocaleString("es-PE")],
        ["empresas verificadas", data.empresasVerificadas],
        ["eventos activos", data.eventosActivos],
        ["CO2 estimado evitado", `${data.co2Evitado.toLocaleString("es-PE")} kg`],
        ["reportes pendientes", data.reportesPendientes]
      ];
      metrics.innerHTML = items.map(([label, value]) => `<article class="card metric"><strong>${value}</strong><span>${label}</span></article>`).join("");
    }
    if (city) renderRanking(city, data.rankingCiudades, "Ranking por ciudad");
    if (material) renderMaterial(material, data.reciclajeMaterial);
  } catch (error) {
    if (metrics) metrics.innerHTML = `<article class="card"><h3>No se pudieron cargar metricas</h3><p>${error.message}</p></article>`;
    if (city) city.innerHTML = "";
    if (material) material.innerHTML = "";
  }
}

function renderRanking(container, rows, label) {
  if (!rows.length) {
    container.innerHTML = `<div class="row"><strong>Sin registros</strong><span>No hay datos suficientes</span></div>`;
    return;
  }
  const max = Math.max(...rows.map((row) => row.value), 1);
  container.innerHTML = rows.map((r) => `<div class="row"><strong>${r.label}</strong><span>${r.value} kg</span><div class="progress" style="--value:${Math.round((r.value / max) * 100)}%"><span></span></div><span>${label}</span></div>`).join("");
}

function renderMaterial(container, rows) {
  if (!rows.length) {
    container.innerHTML = `<article class="card"><h3>Sin registros</h3><p>No hay reciclaje publicado todavia.</p></article>`;
    return;
  }
  const max = Math.max(...rows.map((row) => row.value), 1);
  container.innerHTML = rows.map((m) => `<article class="card"><h3>${m.label}</h3><div class="progress" style="--value:${Math.round((m.value / max) * 100)}%"><span></span></div><p>${m.value} kg registrados</p></article>`).join("");
}

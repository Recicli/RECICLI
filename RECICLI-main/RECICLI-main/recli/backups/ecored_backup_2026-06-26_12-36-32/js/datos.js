import { metricas } from "../data/metricas.js";
import { money } from "./script.js";

export function renderDatos() {
  const metrics = document.querySelector("#metricCards");
  const city = document.querySelector("#cityRanking");
  const material = document.querySelector("#materialCharts");
  if (metrics) {
    const items = [
      ["kg reciclados", metricas.kgReciclados.toLocaleString("es-PE")],
      ["productos reutilizados", metricas.productosReutilizados],
      ["campanas activas", metricas.campanasActivas],
      ["usuarios registrados", metricas.usuariosRegistrados.toLocaleString("es-PE")],
      ["recicladores afiliados", metricas.recicladoresAfiliados],
      ["empresas verificadas", metricas.empresasVerificadas],
      ["CO2 estimado evitado", `${metricas.co2Evitado.toLocaleString("es-PE")} kg`],
      ["pagos estimados", money(metricas.pagosEstimados)]
    ];
    metrics.innerHTML = items.map(([label, value]) => `<article class="card metric"><strong>${value}</strong><span>${label}</span></article>`).join("");
  }
  if (city) {
    city.innerHTML = metricas.rankingCiudades.map((r) => `<div class="row"><strong>${r.ciudad}</strong><span>${r.puntos} pts</span><div class="progress" style="--value:${Math.round(r.puntos / 100)}%"><span></span></div><span>Ranking circular</span></div>`).join("");
  }
  if (material) {
    const max = Math.max(...metricas.reciclajeMaterial.map((m) => m.kg));
    material.innerHTML = metricas.reciclajeMaterial.map((m) => `<article class="card"><h3>${m.material}</h3><div class="progress" style="--value:${Math.round((m.kg / max) * 100)}%"><span></span></div><p>${m.kg} kg recuperados</p></article>`).join("");
  }
}

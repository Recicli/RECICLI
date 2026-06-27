import { money } from "./script.js";

export function initDashboard() {
  const recycleRoutes = document.querySelector("#rutasRecicla");
  const liquidation = document.querySelector("#liquidacionEmpresa");
  if (recycleRoutes) {
    recycleRoutes.innerHTML = [
      ["Ruta Amarilis Norte", 8, 120, "Carlos", "Programada"],
      ["Ruta Pillco Centro", 11, 180, "Rosa", "En progreso"],
      ["Ruta Huanuco Centro", 6, 90, "Miguel", "Pendiente"]
    ].map(([ruta, usuarios, kg, reciclador, estado]) => `<article class="card route-card">
      <h3>${ruta}</h3><p>Usuarios: ${usuarios}</p><p>Kg estimados: ${kg} kg</p><p>Reciclador asignado: ${reciclador}</p><p>Estado: ${estado}</p>
      <button class="btn secondary">Ver ruta</button>
    </article>`).join("");
  }
  if (liquidation) {
    liquidation.innerHTML = `<article class="card promoted">
      <h3>Liquidacion: 30 computadoras de oficina</h3>
      <p>Precio por unidad: ${money(650)}</p>
      <p>Estado: Activa · Visibilidad: Destacada</p>
      <button class="btn yellow">Ver rendimiento</button>
    </article>`;
  }
}

import { fetchCampanas, fetchEmpresas, fetchImpactMetrics, fetchProductos } from "./supabaseData.js";

export async function initDashboard() {
  const stats = document.querySelector("#dashboardStats");
  const recycleRoutes = document.querySelector("#rutasRecicla");
  const liquidation = document.querySelector("#liquidacionEmpresa");

  if (stats) {
    stats.innerHTML = `<article class="stat-card">Cargando datos...</article>`;
    try {
      const metrics = await fetchImpactMetrics();
      stats.innerHTML = [
        ["Kg recolectados", `${metrics.kgReciclados} kg`],
        ["Usuarios afiliados", metrics.usuariosRegistrados],
        ["Recicladores afiliados", Math.max(0, Math.round(metrics.usuariosRegistrados * 0.12))],
        ["Campanas activas", metrics.campanasActivas],
        ["Pagos estimados", `S/ ${Math.round(metrics.kgReciclados * 0.45)}`],
        ["Material vendido", `${Math.round(metrics.kgReciclados * 0.72)} kg`]
      ].map(([label, value]) => `<article class="stat-card"><strong>${value}</strong>${label}</article>`).join("");
    } catch (error) {
      stats.innerHTML = `<article class="stat-card">No se pudieron cargar datos: ${error.message}</article>`;
    }
  }

  if (recycleRoutes) {
    try {
      const campanas = await fetchCampanas();
      recycleRoutes.innerHTML = campanas.length ? campanas.map((c) => `<article class="card route-card">
        <h3>${c.titulo}</h3>
        <p>${c.empresa} · ${c.ciudad || "Ciudad por definir"}</p>
        <div class="route-meta">
          <span><strong>${c.material || "Mixto"}</strong><br>Material</span>
          <span><strong>${c.metaKg} kg</strong><br>Meta</span>
          <span><strong>S/ ${c.pagoKg}</strong><br>Pago por kg</span>
          <span><strong>${c.estado}</strong><br>Estado</span>
        </div>
        <div class="tag-row">
          <button class="btn small">Ver avance</button>
          <button class="btn ghost small">Asignar reciclador</button>
        </div>
      </article>`).join("") : `<article class="card"><h3>Sin campanas</h3><p>No hay campanas registradas.</p></article>`;
    } catch (error) {
      recycleRoutes.innerHTML = `<article class="card"><h3>Error</h3><p>${error.message}</p></article>`;
    }
  }

  if (liquidation) {
    try {
      const destacados = await fetchProductos({ destacado: true });
      liquidation.innerHTML = destacados.length ? destacados.map((p) => `<article class="card promoted">
        <img class="card-media" src="${p.imagen}" alt="${p.titulo}">
        <h3>${p.titulo}</h3>
        <p>Precio: S/ ${p.precio}</p>
        <p>Categoria: ${p.categoria}</p>
      </article>`).join("") : `<article class="card"><h3>Sin destacados</h3><p>No hay productos destacados registrados.</p></article>`;
    } catch (error) {
      liquidation.innerHTML = `<article class="card"><h3>Error</h3><p>${error.message}</p></article>`;
    }
  }
}

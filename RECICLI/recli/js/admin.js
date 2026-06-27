import { fetchContactMessages, fetchEmpresas, fetchImpactMetrics, fetchReportes, updateEmpresaVerification, updateProfileState } from "./supabaseData.js";

export async function initAdmin() {
  const queue = document.querySelector("#adminQueue");
  const stats = document.querySelector("#adminStats");
  const filter = document.querySelector("#adminFilter");

  if (stats) {
    try {
      const metrics = await fetchImpactMetrics();
      stats.innerHTML = [
        ["Empresas verificadas", metrics.empresasVerificadas],
        ["Reportes pendientes", metrics.reportesPendientes],
        ["Usuarios registrados", metrics.usuariosRegistrados],
        ["Productos activos", metrics.productosActivos]
      ].map(([label, value]) => `<article class="stat-card"><strong>${value}</strong>${label}</article>`).join("");
    } catch (error) {
      stats.innerHTML = `<article class="stat-card">No se pudieron cargar metricas: ${error.message}</article>`;
    }
  }

  async function renderQueue(mode = "todo") {
    if (!queue) return;
    queue.innerHTML = `<article class="card">Cargando datos desde Supabase...</article>`;
    try {
      const [reportes, empresas, mensajes] = await Promise.all([fetchReportes(), fetchEmpresas(), fetchContactMessages()]);
      const empresaCards = empresas
        .filter((e) => mode === "todo" || mode === "empresas")
        .filter((e) => !e.verificada || e.estado_verificacion === "pendiente")
        .map(renderEmpresaCard);
      const reporteCards = reportes
        .filter((r) => mode === "todo" || mode === "reportes" || mode === "spam")
        .map(renderReporteCard);
      const mensajeCards = mensajes
        .filter((m) => mode === "todo" || mode === "mensajes")
        .map(renderMessageCard);
      queue.innerHTML = [...empresaCards, ...reporteCards, ...mensajeCards].join("") || `<article class="card"><h3>Sin pendientes</h3><p>No hay elementos para revisar.</p></article>`;
    } catch (error) {
      queue.innerHTML = `<article class="card"><h3>Error</h3><p>${error.message}</p></article>`;
    }
  }

  filter?.addEventListener("change", () => renderQueue(filter.value));
  queue?.addEventListener("click", async (event) => {
    const approve = event.target.closest("[data-approve-company]");
    const reject = event.target.closest("[data-reject-company]");
    const block = event.target.closest("[data-block-user]");
    try {
      if (approve) {
        await updateEmpresaVerification(approve.dataset.approveCompany, "aprobada");
        await renderQueue(filter?.value || "todo");
      }
      if (reject) {
        const reason = prompt("Motivo del rechazo") || "No cumple requisitos de verificacion";
        await updateEmpresaVerification(reject.dataset.rejectCompany, "rechazada", reason);
        await renderQueue(filter?.value || "todo");
      }
      if (block) {
        await updateProfileState(block.dataset.blockUser, "suspendido");
        await renderQueue(filter?.value || "todo");
      }
    } catch (error) {
      alert(`No se pudo completar la accion: ${error.message}`);
    }
  });

  await renderQueue();
}

function renderEmpresaCard(e) {
  return `<article class="card admin-review-card">
    <span class="tag">${e.estado_verificacion || "pendiente"}</span>
    <h3>${e.nombre_empresa}</h3>
    <p><strong>RUC:</strong> ${e.ruc || "No indicado"}</p>
    <p><strong>Modulo:</strong> ${e.modulo || "No indicado"} - <strong>Tipo:</strong> ${e.tipo || "No indicado"}</p>
    <p>${e.descripcion || "Sin descripcion enviada."}</p>
    <div class="tag-row">
      <button class="btn" data-approve-company="${e.id}">Aprobar</button>
      <button class="btn ghost" data-reject-company="${e.id}">Rechazar</button>
    </div>
  </article>`;
}

function renderReporteCard(r) {
  return `<article class="card admin-alert">
    <span class="tag">${r.estado}</span>
    <h3>${r.tipo || "Reporte"}</h3>
    <p>${r.motivo || "Sin motivo indicado"}</p>
    <p><strong>Usuario:</strong> ${r.profiles?.email || "No disponible"}</p>
    ${r.usuario_id ? `<button class="btn ghost" data-block-user="${r.usuario_id}">Bloquear usuario</button>` : ""}
  </article>`;
}

function renderMessageCard(message) {
  return `<article class="card">
    <span class="tag">${message.estado || "pendiente"}</span>
    <h3>${message.tipo_consulta || "Consulta"}</h3>
    <p>${message.mensaje || "Sin mensaje"}</p>
    <p><strong>${message.nombre || "Contacto"}</strong> · ${message.correo || "Sin correo"} · ${message.celular || "Sin celular"}</p>
  </article>`;
}

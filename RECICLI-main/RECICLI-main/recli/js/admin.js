import {
  fetchCampanas,
  fetchContactMessages,
  fetchEmpresas,
  fetchImpactMetrics,
  fetchProductos,
  fetchProfiles,
  fetchReciclajePublicaciones,
  fetchReportes,
  updateContactMessage,
  updateEmpresaVerification,
  updateProducto,
  updateProfileState
} from "./supabaseData.js";

const state = {
  empresas: [],
  perfiles: [],
  mensajes: [],
  reportes: [],
  productos: [],
  reciclaje: [],
  campanas: [],
  metrics: null
};

export async function initAdmin() {
  initSectionSwitcher();
  bindAdminEvents();
  await loadAdminData();
}

async function loadAdminData() {
  renderLoading();
  try {
    const [empresas, perfiles, mensajes, reportes, productos, reciclaje, campanas, metrics] = await Promise.all([
      fetchEmpresas(),
      fetchProfiles(),
      fetchContactMessages(),
      fetchReportes(),
      fetchProductos({ includeInactive: true }),
      fetchReciclajePublicaciones(),
      fetchCampanas(),
      fetchImpactMetrics()
    ]);

    Object.assign(state, { empresas, perfiles, mensajes, reportes, productos, reciclaje, campanas, metrics });
    renderAdmin();
    toast("Panel actualizado con datos de Supabase.");
  } catch (error) {
    renderError(error);
  }
}

function initSectionSwitcher() {
  const title = document.querySelector("#adminSectionTitle");
  document.querySelectorAll("[data-section-target]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-section-target]").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll("[data-section]").forEach((section) => section.classList.remove("active"));
      button.classList.add("active");
      document.querySelector(`[data-section="${button.dataset.sectionTarget}"]`)?.classList.add("active");
      if (title) title.textContent = button.textContent.trim();
    });
  });
}

function bindAdminEvents() {
  document.querySelector("[data-refresh-admin]")?.addEventListener("click", loadAdminData);
  document.querySelector("#verificationFilter")?.addEventListener("change", renderVerifications);
  document.querySelector("#messageFilter")?.addEventListener("change", renderMessages);
  document.querySelector("#userFilter")?.addEventListener("change", renderUsers);
  document.addEventListener("click", handleAdminAction);
}

async function handleAdminAction(event) {
  const target = event.target.closest("[data-admin-action]");
  if (!target) return;
  const action = target.dataset.adminAction;
  const id = target.dataset.id;

  try {
    if (action === "detail-company") openCompanyModal(findEmpresa(id));
    if (action === "approve-company") await changeCompanyStatus(id, "aprobada");
    if (action === "reject-company") await changeCompanyStatus(id, "rechazada");
    if (action === "correction-company") visualOnly("Solicitud de correccion preparada para integracion con notificaciones.");
    if (action === "read-message") await changeMessageStatus(id, "revisado");
    if (action === "answered-message") await changeMessageStatus(id, "resuelto");
    if (action === "archive-message") visualOnly("Mensaje archivado visualmente. Guardado preparado para una columna archived.");
    if (action === "block-user") await changeUserState(id, "suspendido");
    if (action === "unblock-user") await changeUserState(id, "activo");
    if (action === "warn-user") visualOnly("Advertencia registrada visualmente. Auditoria preparada para integracion.");
    if (action === "reduce-reputation") visualOnly("Reputacion reducida visualmente. Ajuste real preparado con auditoria.");
    if (action === "hide-product") await changeProduct(id, { estado: "vendido" }, "Publicacion ocultada de listados activos.");
    if (action === "approve-product") await changeProduct(id, { estado: "activo" }, "Publicacion aprobada.");
    if (action === "delete-product") visualOnly("Eliminacion preparada. Por seguridad no se borra sin tabla de auditoria.");
    if (action === "view-profile") window.location.href = `perfil.html?usuario=${id}`;
    if (action === "close-modal") closeModal();
  } catch (error) {
    toast(`No se pudo completar: ${error.message}`);
  }
}

function renderAdmin() {
  renderStats();
  renderVerifications();
  renderCompanies();
  renderInstitutions();
  renderMessages();
  renderReports();
  renderSpam();
  renderSuspiciousPosts();
  renderUsers();
  renderMetrics();
}

function renderLoading() {
  const loading = `<article class="loading-state">Cargando datos desde Supabase...</article>`;
  ["adminStats", "verificationList", "companiesTable", "institutionsTable", "messagesTable", "reportsTable", "spamTable", "suspiciousPosts", "usersTable", "adminMetrics"]
    .forEach((id) => setHtml(id, loading));
}

function renderError(error) {
  const html = `<article class="error-state">Error al cargar datos: ${escapeHtml(error.message)}</article>`;
  ["adminStats", "verificationList", "companiesTable", "institutionsTable", "messagesTable", "reportsTable", "spamTable", "suspiciousPosts", "usersTable", "adminMetrics"]
    .forEach((id) => setHtml(id, html));
}

function renderStats() {
  const empresasPendientes = state.empresas.filter((e) => (e.estado_verificacion || "pendiente") === "pendiente").length;
  const institucionesPendientes = state.perfiles.filter((p) => ["ong", "municipalidad", "universidad"].includes(p.rol) && p.estado === "activo").length;
  const bloqueados = state.perfiles.filter((p) => p.estado === "suspendido").length;
  const mensajesPendientes = state.mensajes.filter((m) => (m.estado || "pendiente") === "pendiente").length;
  const reportesActivos = state.reportes.filter((r) => (r.estado || "pendiente") === "pendiente").length;
  const sospechosas = state.productos.filter((p) => p.estado === "reportado").length + state.reportes.length;

  setHtml("adminStats", metricCards([
    ["Empresas pendientes", empresasPendientes],
    ["Instituciones pendientes", institucionesPendientes],
    ["Reportes activos", reportesActivos],
    ["Usuarios bloqueados", bloqueados],
    ["Publicaciones sospechosas", sospechosas],
    ["Mensajes sin responder", mensajesPendientes],
    ["Campanas activas", state.metrics?.campanasActivas || 0],
    ["Liquidaciones activas", state.productos.filter((p) => p.destacado).length]
  ]));
}

function renderVerifications() {
  const filter = document.querySelector("#verificationFilter")?.value || "todo";
  const items = state.empresas.filter((empresa) => filter === "todo" || (empresa.estado_verificacion || "pendiente") === filter);

  setHtml("verificationList", items.length ? items.map((e) => `<article class="dashboard-card">
    ${badge(e.estado_verificacion || "pendiente")}
    <h3>${escapeHtml(e.nombre_empresa)}</h3>
    <p><strong>Tipo:</strong> ${companyType(e)}</p>
    <p><strong>RUC/documento:</strong> ${escapeHtml(e.ruc || "No registrado")}</p>
    <p><strong>Representante:</strong> ${escapeHtml(profileName(e.profiles))}</p>
    <p><strong>Ciudad:</strong> ${escapeHtml(e.profiles?.ciudad || "No indicada")}</p>
    <p><strong>Modulo solicitado:</strong> ${escapeHtml(e.modulo || "No indicado")}</p>
    <p>${escapeHtml(e.descripcion || "Sin descripcion de actividad.")}</p>
    <div class="action-row">
      <button class="action-btn secondary" data-admin-action="detail-company" data-id="${e.id}">Ver detalle</button>
      <button class="action-btn" data-admin-action="approve-company" data-id="${e.id}">Aprobar</button>
      <button class="action-btn danger" data-admin-action="reject-company" data-id="${e.id}">Rechazar</button>
      <button class="action-btn ghost" data-admin-action="correction-company" data-id="${e.id}">Solicitar correccion</button>
    </div>
  </article>`).join("") : empty("No hay solicitudes con ese filtro."));
}

function renderCompanies() {
  setHtml("companiesTable", table(["Empresa", "RUC", "Modulo", "Estado", "Fecha", "Acciones"], state.empresas.map((e) => [
    escapeHtml(e.nombre_empresa),
    escapeHtml(e.ruc || "-"),
    escapeHtml(e.modulo || "-"),
    badge(e.estado_verificacion || "pendiente"),
    formatDate(e.created_at),
    actions([["Ver", "detail-company", e.id], ["Aprobar", "approve-company", e.id], ["Rechazar", "reject-company", e.id]])
  ])));
}

function renderInstitutions() {
  const institutions = state.perfiles.filter((p) => ["ong", "municipalidad", "universidad"].includes(p.rol));
  setHtml("institutionsTable", institutions.length ? table(["Institucion", "Rol", "Correo", "Ciudad", "Estado", "Acciones"], institutions.map((p) => [
    escapeHtml(`${p.nombre || ""} ${p.apellido || ""}`.trim()),
    escapeHtml(p.rol),
    escapeHtml(p.email || "-"),
    escapeHtml(p.ciudad || "-"),
    badge(p.estado || "activo"),
    actions([["Ver perfil", "view-profile", p.id], [p.estado === "suspendido" ? "Desbloquear" : "Bloquear", p.estado === "suspendido" ? "unblock-user" : "block-user", p.id]])
  ])) : empty("No hay instituciones registradas."));
}

function renderMessages() {
  const filter = document.querySelector("#messageFilter")?.value || "todo";
  const messages = state.mensajes.filter((m) => filter === "todo" || String(m.tipo_consulta || "").toLowerCase().includes(filter.toLowerCase()));
  setHtml("messagesTable", messages.length ? table(["Nombre", "Correo", "Tipo", "Mensaje", "Estado", "Fecha", "Acciones"], messages.map((m) => [
    escapeHtml(m.nombre || "-"),
    escapeHtml(m.correo || "-"),
    escapeHtml(m.tipo_consulta || "-"),
    escapeHtml(short(m.mensaje, 72)),
    badge(m.estado || "pendiente"),
    formatDate(m.created_at),
    actions([["Leido", "read-message", m.id], ["Respondido", "answered-message", m.id], ["Archivar", "archive-message", m.id]])
  ])) : empty("No hay mensajes con ese filtro."));
}

function renderReports() {
  setHtml("reportsTable", state.reportes.length ? table(["Tipo", "Motivo", "Usuario", "Estado", "Fecha", "Acciones"], state.reportes.map((r) => [
    escapeHtml(r.tipo || "Reporte"),
    escapeHtml(short(r.motivo || "-", 88)),
    escapeHtml(r.profiles?.email || "-"),
    badge(r.estado || "pendiente"),
    formatDate(r.created_at),
    r.usuario_id ? actions([["Bloquear", "block-user", r.usuario_id], ["Advertir", "warn-user", r.usuario_id], ["Reducir reputacion", "reduce-reputation", r.usuario_id]]) : "-"
  ])) : empty("No hay reportes activos."));
}

function renderSpam() {
  const reportCount = new Map();
  state.reportes.forEach((r) => {
    if (r.usuario_id) reportCount.set(r.usuario_id, (reportCount.get(r.usuario_id) || 0) + 1);
  });
  const suspicious = state.perfiles.filter((p) => p.estado === "suspendido" || reportCount.has(p.id));
  setHtml("spamTable", suspicious.length ? table(["Usuario", "Correo", "Ciudad", "Reportes", "Estado", "Hojas", "Acciones"], suspicious.map((p) => [
    escapeHtml(`${p.nombre || ""} ${p.apellido || ""}`.trim()),
    escapeHtml(p.email || "-"),
    escapeHtml(p.ciudad || "-"),
    reportCount.get(p.id) || 0,
    badge(p.estado || "activo"),
    leafs(p.hojas || 0),
    actions([["Advertir", "warn-user", p.id], [p.estado === "suspendido" ? "Desbloquear" : "Bloquear", p.estado === "suspendido" ? "unblock-user" : "block-user", p.id], ["Reducir reputacion", "reduce-reputation", p.id], ["Ver actividad", "view-profile", p.id]])
  ])) : empty("No hay usuarios sospechosos por ahora."));
}

function renderSuspiciousPosts() {
  const reportedProducts = state.productos.filter((p) => p.estado === "reportado");
  const reportedRecycle = state.reciclaje.filter((p) => p.estado === "reportado");
  const cards = [
    ...reportedProducts.map((p) => suspiciousCard("Reutiliza", p.titulo, p.descripcion, p.id)),
    ...reportedRecycle.map((p) => suspiciousCard("Recicla", p.material, p.descripcion, p.id))
  ];
  setHtml("suspiciousPosts", cards.length ? cards.join("") : empty("No hay publicaciones marcadas como sospechosas. Los reportes se muestran en la seccion Reportes."));
}

function renderUsers() {
  const filter = document.querySelector("#userFilter")?.value || "todo";
  const users = state.perfiles.filter((p) => filter === "todo" || p.rol === filter || p.estado === filter);
  setHtml("usersTable", users.length ? table(["Nombre", "Correo", "Rol", "Ciudad", "Estado", "EcoScore", "Acciones"], users.map((p) => [
    escapeHtml(`${p.nombre || ""} ${p.apellido || ""}`.trim()),
    escapeHtml(p.email || "-"),
    escapeHtml(p.rol || "-"),
    escapeHtml(p.ciudad || "-"),
    badge(p.estado || "activo"),
    p.eco_score || 0,
    actions([["Ver perfil", "view-profile", p.id], [p.estado === "suspendido" ? "Desbloquear" : "Bloquear", p.estado === "suspendido" ? "unblock-user" : "block-user", p.id], ["Reducir reputacion", "reduce-reputation", p.id]])
  ])) : empty("No hay usuarios con ese filtro."));
}

function renderMetrics() {
  const m = state.metrics || {};
  setHtml("adminMetrics", metricCards([
    ["Kg reciclados", m.kgReciclados || 0],
    ["CO2 evitado", `${m.co2Evitado || 0} kg`],
    ["Productos activos", m.productosActivos || 0],
    ["Usuarios registrados", m.usuariosRegistrados || 0],
    ["Eventos activos", m.eventosActivos || 0],
    ["Empresas verificadas", m.empresasVerificadas || 0]
  ]));
}

async function changeCompanyStatus(id, status) {
  const reason = status === "rechazada" ? window.prompt("Motivo del rechazo") || "No cumple requisitos de verificacion." : "";
  const updated = await updateEmpresaVerification(id, status, reason);
  state.empresas = state.empresas.map((item) => item.id === id ? { ...item, ...updated } : item);
  renderAdmin();
  toast(`Verificacion ${status}.`);
}

async function changeMessageStatus(id, status) {
  const updated = await updateContactMessage(id, { estado: status });
  state.mensajes = state.mensajes.map((item) => item.id === id ? { ...item, ...updated } : item);
  renderMessages();
  renderStats();
  toast("Mensaje actualizado.");
}

async function changeUserState(id, status) {
  const updated = await updateProfileState(id, status);
  state.perfiles = state.perfiles.map((item) => item.id === id ? { ...item, ...updated } : item);
  renderUsers();
  renderSpam();
  renderStats();
  toast(status === "suspendido" ? "Usuario bloqueado." : "Usuario desbloqueado.");
}

async function changeProduct(id, patch, message) {
  const updated = await updateProducto(id, patch);
  state.productos = state.productos.map((item) => item.id === id ? { ...item, ...updated } : item);
  renderSuspiciousPosts();
  toast(message);
}

function openCompanyModal(company) {
  if (!company) return;
  openModal(`<div class="modal-panel large">
    <div class="modal-header">
      <div><span class="status-badge pending">Detalle</span><h2>${escapeHtml(company.nombre_empresa)}</h2></div>
      <button class="modal-close" data-admin-action="close-modal">x</button>
    </div>
    <div class="panel-grid">
      <article class="dashboard-card"><h3>Datos generales</h3><p>Tipo: ${companyType(company)}</p><p>Modulo: ${escapeHtml(company.modulo || "-")}</p><p>RUC/documento: ${escapeHtml(company.ruc || "-")}</p><p>Estado: ${company.estado_verificacion || "pendiente"}</p></article>
      <article class="dashboard-card"><h3>Representante</h3><p>${escapeHtml(profileName(company.profiles))}</p><p>Correo: ${escapeHtml(company.profiles?.email || "-")}</p><p>Celular: ${escapeHtml(company.profiles?.telefono || "-")}</p><p>Ciudad: ${escapeHtml(company.profiles?.ciudad || "-")}</p></article>
      <article class="dashboard-card"><h3>Actividad</h3><p>${escapeHtml(company.descripcion || "Sin descripcion completa.")}</p></article>
      <article class="dashboard-card"><h3>Historial</h3><p>Solicitud creada: ${formatDate(company.created_at)}</p><p>Motivo rechazo: ${escapeHtml(company.motivo_rechazo || "Sin observaciones.")}</p><p>Documentos: preparado para conectar storage empresarial.</p></article>
    </div>
    <div class="action-row" style="margin-top:16px">
      <button class="action-btn" data-admin-action="approve-company" data-id="${company.id}">Aprobar verificacion</button>
      <button class="action-btn danger" data-admin-action="reject-company" data-id="${company.id}">Rechazar verificacion</button>
      <button class="action-btn ghost" data-admin-action="close-modal">Cerrar</button>
    </div>
  </div>`);
}

function suspiciousCard(type, title, description, id) {
  return `<article class="dashboard-card admin-alert">
    <span class="status-badge danger">${type}</span>
    <h3>${escapeHtml(title || "Publicacion")}</h3>
    <p>${escapeHtml(short(description || "Sin descripcion.", 96))}</p>
    <div class="action-row">
      <button class="action-btn" data-admin-action="approve-product" data-id="${id}">Aprobar</button>
      <button class="action-btn secondary" data-admin-action="hide-product" data-id="${id}">Ocultar</button>
      <button class="action-btn danger" data-admin-action="delete-product" data-id="${id}">Eliminar</button>
    </div>
  </article>`;
}

function openModal(html) {
  const modal = document.querySelector("#adminModal");
  modal.innerHTML = html;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  const modal = document.querySelector("#adminModal");
  modal?.classList.remove("open");
  modal?.setAttribute("aria-hidden", "true");
}

function visualOnly(message) {
  toast(message);
}

function setHtml(id, html) {
  const node = document.querySelector(`#${id}`);
  if (node) node.innerHTML = html;
}

function metricCards(items) {
  return items.map(([label, value]) => `<article class="metric-card"><strong>${value}</strong><span>${label}</span></article>`).join("");
}

function table(headers, rows) {
  if (!rows.length) return empty("Sin datos para mostrar.");
  return `<table class="data-table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function actions(items) {
  return `<div class="action-row">${items.map(([label, action, id]) => `<button class="action-btn ghost" data-admin-action="${action}" data-id="${id}">${label}</button>`).join("")}</div>`;
}

function badge(status) {
  const s = String(status || "pendiente").toLowerCase();
  const cls = ["aprobada", "activo", "resuelto", "revisado"].includes(s) ? "success" : ["rechazada", "suspendido", "reportado"].includes(s) ? "danger" : s === "pendiente" ? "pending" : "neutral";
  return `<span class="status-badge ${cls}">${escapeHtml(status || "pendiente")}</span>`;
}

function empty(text) {
  return `<article class="empty-state">${text}</article>`;
}

function toast(text) {
  const toastNode = document.querySelector("#adminToast");
  if (!toastNode) return;
  toastNode.textContent = text;
  toastNode.classList.add("show");
  window.setTimeout(() => toastNode.classList.remove("show"), 2800);
}

function findEmpresa(id) {
  return state.empresas.find((e) => e.id === id);
}

function companyType(e) {
  if (e.tipo === "recicladora") return "Empresa Recicla";
  if (e.tipo === "comercial") return "Empresa Reutiliza";
  return e.modulo || "Empresa";
}

function profileName(profile) {
  return profile ? `${profile.nombre || ""} ${profile.apellido || ""}`.trim() || "Representante" : "Representante no conectado";
}

function leafs(count) {
  return `<span class="leaf-rating">${"🍃".repeat(Math.max(0, Math.min(5, Number(count) || 0))) || "Sin hojas"}</span>`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-PE", { year: "numeric", month: "short", day: "2-digit" });
}

function short(text, length) {
  const value = String(text || "");
  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}
